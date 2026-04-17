/**
 * Engagement tracking module for Loyal & Found (petpalhq.com).
 * Tracks user behavior events and classifies traffic as human vs AI.
 *
 * Events fired:
 *  - user_type_detected     (on load)
 *  - scroll_depth            (at 25%, 50%, 75%, 100%)
 *  - content_engagement      (at 30s, 60s, 120s, 300s)
 *  - guide_complete          (Bottom Line / FAQ reached)
 *  - toc_click               (Table of Contents navigation)
 *  - comparison_chart_view   (comparison section scrolled into view)
 *  - product_card_view       (product card scrolled into view)
 *
 * Enriches existing affiliate_click with:
 *  - time_on_page_before_click
 *  - scroll_depth_at_click
 *  - click_index
 *  - user_type
 *  - ai_source / ai_referred (when session originated from an AI platform)
 *
 * Ported from SmartHomeExplorer with the sessionStorage namespace
 * switched from `she_*` → `lf_*` so the two sites don't clash on shared
 * browsers or localhost dev.
 */

// ─── Bot / AI Crawler Detection ─────────────────────────────────────────────

const AI_CRAWLER_SIGNATURES = [
  'GPTBot', 'ChatGPT-User', 'OAI-SearchBot',
  'ClaudeBot', 'Claude-Web', 'anthropic-ai',
  'PerplexityBot', 'YouBot', 'Applebot-Extended',
  'cohere-ai', 'CCBot',
  'Google-Extended',    // Gemini training
  'Bytespider',         // TikTok / Doubao
  'PetalBot',           // Huawei
];

const SEARCH_BOT_SIGNATURES = [
  'Googlebot', 'Bingbot', 'bingbot', 'Slurp',        // Yahoo
  'DuckDuckBot', 'Baiduspider', 'YandexBot',
  'Applebot', 'AdsBot-Google', 'Mediapartners-Google',
  'facebookexternalhit', 'Twitterbot', 'LinkedInBot',
  'Discordbot', 'WhatsApp', 'TelegramBot',
];

export type UserType = 'human' | 'ai_crawler' | 'search_bot' | 'unknown';

export function detectUserType(ua?: string): UserType {
  const userAgent = ua ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');
  if (!userAgent) return 'unknown';

  // Check AI crawlers first (more specific)
  for (const sig of AI_CRAWLER_SIGNATURES) {
    if (userAgent.includes(sig)) return 'ai_crawler';
  }

  // Search engine bots
  for (const sig of SEARCH_BOT_SIGNATURES) {
    if (userAgent.includes(sig)) return 'search_bot';
  }

  // Headless browser detection
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof navigator !== 'undefined' && (navigator as any).webdriver === true) {
    return 'unknown'; // could be testing or scraping
  }

  return 'human';
}

// ─── AI Referrer Detection ──────────────────────────────────────────────────

const AI_REFERRERS: Record<string, string> = {
  'chat.openai.com':       'chatgpt',
  'chatgpt.com':           'chatgpt',
  'perplexity.ai':         'perplexity',
  'you.com':               'you_search',
  'copilot.microsoft.com': 'copilot',
  'gemini.google.com':     'gemini',
  'claude.ai':             'claude',
  'poe.com':               'poe',
  'phind.com':             'phind',
  'kagi.com':              'kagi',
};

export function detectAIReferrer(): string | null {
  if (typeof document === 'undefined') return null;
  const referrer = document.referrer;
  if (!referrer) return null;
  try {
    const hostname = new URL(referrer).hostname.replace('www.', '');
    return AI_REFERRERS[hostname] ?? null;
  } catch {
    return null;
  }
}

// ─── DataLayer Push (safe wrapper) ──────────────────────────────────────────

function pushEvent(eventName: string, data: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  const enrichedData = {
    ...data,
    page_path: window.location.pathname,
    timestamp: new Date().toISOString(),
  };

  // Fire directly to GA4 via gtag (no GTM dependency)
  if (window.gtag) {
    window.gtag('event', eventName, enrichedData);
  }

  // Also push to dataLayer for GTM (when available)
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: eventName,
    ...enrichedData,
  });
}

// ─── Engagement State (module-scoped) ────────────────────────────────────────

let pageLoadTime = 0;
let currentScrollPct = 0;
let affiliateClickCount = 0;
let scrollMilestonesFired = new Set<number>();
let timeMilestonesFired = new Set<number>();
let hasMouseMoved = false;

export function resetEngagementState() {
  pageLoadTime = Date.now();
  currentScrollPct = 0;
  affiliateClickCount = 0;
  scrollMilestonesFired = new Set();
  timeMilestonesFired = new Set();
  hasMouseMoved = false;
}

// ─── Get current state (for affiliate enrichment) ────────────────────────────

export function getEngagementState() {
  return {
    timeOnPage: Math.round((Date.now() - pageLoadTime) / 1000),
    scrollDepth: currentScrollPct,
    clickIndex: affiliateClickCount,
    hasMouseMoved,
  };
}

export function incrementAffiliateClick() {
  affiliateClickCount++;
  return affiliateClickCount;
}

// ─── User Type Detection + Referrer (fire once on load) ─────────────────────

export function initUserTypeTracking() {
  const userType = detectUserType();
  const aiReferrer = detectAIReferrer();

  // Persist AI referrer to sessionStorage as a backup path in case
  // AIReferrerTracker hasn't mounted yet.
  if (aiReferrer && typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.setItem('lf_ai_source', aiReferrer);
      sessionStorage.setItem('lf_ai_referred', 'true');
    } catch {
      // sessionStorage blocked
    }
  }

  pushEvent('user_type_detected', {
    user_type: userType,
    ai_referrer: aiReferrer,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    has_webdriver: typeof navigator !== 'undefined' ? !!(navigator as any).webdriver : null,
  });

  // Set GA4 user property via gtag
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('set', 'user_properties', {
      user_type: userType,
      ...(aiReferrer ? { ai_referrer: aiReferrer } : {}),
    });
  }

  return { userType, aiReferrer };
}

// ─── Scroll Depth Tracking ──────────────────────────────────────────────────

const SCROLL_MILESTONES = [25, 50, 75, 100];

export function initScrollTracking() {
  if (typeof window === 'undefined') return () => {};

  const handler = () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    if (docHeight <= 0) return;

    currentScrollPct = Math.min(100, Math.round((scrollTop / docHeight) * 100));

    for (const milestone of SCROLL_MILESTONES) {
      if (currentScrollPct >= milestone && !scrollMilestonesFired.has(milestone)) {
        scrollMilestonesFired.add(milestone);
        pushEvent('scroll_depth', {
          depth_percent: milestone,
          depth_pixels: Math.round(scrollTop),
          time_to_reach: Math.round((Date.now() - pageLoadTime) / 1000),
          user_type: detectUserType(),
        });
      }
    }
  };

  window.addEventListener('scroll', handler, { passive: true });
  return () => window.removeEventListener('scroll', handler);
}

// ─── Time-on-Page Engagement ────────────────────────────────────────────────

const TIME_MILESTONES = [30, 60, 120, 300]; // seconds

export function initTimeTracking() {
  if (typeof window === 'undefined') return () => {};

  const timers: ReturnType<typeof setTimeout>[] = [];

  for (const seconds of TIME_MILESTONES) {
    const timer = setTimeout(() => {
      if (!timeMilestonesFired.has(seconds)) {
        timeMilestonesFired.add(seconds);
        pushEvent('content_engagement', {
          engagement_seconds: seconds,
          scroll_depth_at_time: currentScrollPct,
          has_mouse_moved: hasMouseMoved,
          user_type: detectUserType(),
        });
      }
    }, seconds * 1000);
    timers.push(timer);
  }

  return () => timers.forEach((t) => clearTimeout(t));
}

// ─── Mouse Movement Detection ───────────────────────────────────────────────

export function initMouseTracking() {
  if (typeof window === 'undefined') return () => {};

  const handler = () => {
    if (!hasMouseMoved) {
      hasMouseMoved = true;
      // One-shot: remove listener after first detection
      window.removeEventListener('mousemove', handler);
    }
  };

  window.addEventListener('mousemove', handler, { passive: true });
  return () => window.removeEventListener('mousemove', handler);
}

// ─── Guide Completion Detection ─────────────────────────────────────────────

export function initGuideCompletionTracking() {
  if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return () => {};

  let fired = false;

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting && !fired) {
        fired = true;
        pushEvent('guide_complete', {
          time_to_complete: Math.round((Date.now() - pageLoadTime) / 1000),
          scroll_depth: currentScrollPct,
          section_reached: (entry.target as HTMLElement).textContent?.trim().substring(0, 80),
        });
        observer.disconnect();
      }
    }
  }, { threshold: 0.5 });

  // Look for Bottom Line or FAQ sections
  requestAnimationFrame(() => {
    const selectors = [
      'h2[id*="bottom-line"]', 'h2[id*="bottomline"]',
      'h2[id*="faq"]', 'h2[id*="frequently"]',
      'h2[id*="final-verdict"]', 'h2[id*="conclusion"]',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        observer.observe(el);
        return;
      }
    }
    // Fallback: last h2 on the page
    const allH2 = document.querySelectorAll('h2');
    if (allH2.length > 0) {
      observer.observe(allH2[allH2.length - 1]);
    }
  });

  return () => observer.disconnect();
}

// ─── Product Card View Tracking (Intersection Observer) ─────────────────────

export function initProductCardViewTracking() {
  if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return () => {};

  const viewedProducts = new Set<string>();

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const el = entry.target as HTMLElement;
      const productName = el.getAttribute('data-product-name') ||
                          el.querySelector('h3, h4')?.textContent?.trim() ||
                          el.querySelector('img')?.alt ||
                          'unknown';
      if (viewedProducts.has(productName)) continue;
      viewedProducts.add(productName);
      pushEvent('product_card_view', {
        product_name: productName,
        time_to_view: Math.round((Date.now() - pageLoadTime) / 1000),
        scroll_depth: currentScrollPct,
      });
      // GA4 ecommerce: view_item fires when a product becomes visible
      if (window.gtag) {
        const categorySlug = window.location.pathname.split('/').pop()?.replace(/-\d{4}$/, '') || '';
        window.gtag('event', 'view_item', {
          currency: 'USD',
          value: 0,
          items: [{
            item_id: el.getAttribute('data-asin') || productName.toLowerCase().replace(/\s+/g, '-'),
            item_name: productName,
            item_category: categorySlug,
            item_brand: productName.split(' ')[0] || '',
            index: viewedProducts.size,
            quantity: 1,
          }],
        });
      }
    }
  }, { threshold: 0.5 });

  // Observe product cards and product image containers
  requestAnimationFrame(() => {
    const cards = document.querySelectorAll('[data-product-card], .product-card, article[class*="product"]');
    cards.forEach((c) => observer.observe(c));

    // Also observe product images within guide content
    const guideImages = document.querySelectorAll('.guide-content img[alt], .prose img[alt]');
    guideImages.forEach((img) => observer.observe(img));
  });

  return () => observer.disconnect();
}

// ─── Comparison Chart View Tracking ─────────────────────────────────────────

export function initComparisonViewTracking() {
  if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return () => {};

  let fired = false;

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting && !fired) {
        fired = true;
        pushEvent('comparison_chart_view', {
          time_to_view: Math.round((Date.now() - pageLoadTime) / 1000),
          scroll_depth: currentScrollPct,
        });
        observer.disconnect();
      }
    }
  }, { threshold: 0.3 });

  requestAnimationFrame(() => {
    // Match the rendered comparison charts
    const charts = document.querySelectorAll(
      '[class*="comparison"], [data-comparison], h2[id*="comparison"]'
    );
    charts.forEach((c) => observer.observe(c));
  });

  return () => observer.disconnect();
}

// ─── TOC Click Tracking ─────────────────────────────────────────────────────

export function trackTOCClick(sectionId: string, sectionTitle: string) {
  pushEvent('toc_click', {
    section_id: sectionId,
    section_title: sectionTitle,
    time_on_page: Math.round((Date.now() - pageLoadTime) / 1000),
    scroll_depth_before: currentScrollPct,
  });
}

// ─── Affiliate Click Enrichment ─────────────────────────────────────────────

export function getAffiliateClickEnrichment() {
  const clickIndex = incrementAffiliateClick();

  // Read AI referrer state from sessionStorage (set by AIReferrerTracker or initUserTypeTracking)
  let aiSource: string | null = null;
  let aiReferred = false;
  if (typeof sessionStorage !== 'undefined') {
    try {
      aiSource = sessionStorage.getItem('lf_ai_source');
      aiReferred = sessionStorage.getItem('lf_ai_referred') === 'true';
    } catch {
      // sessionStorage blocked
    }
  }

  return {
    time_on_page_before_click: Math.round((Date.now() - pageLoadTime) / 1000),
    scroll_depth_at_click: currentScrollPct,
    click_index: clickIndex,
    has_mouse_moved: hasMouseMoved,
    user_type: detectUserType(),
    // AI attribution fields — only included when session originated from an AI platform
    ...(aiReferred ? {
      ai_source: aiSource,
      ai_referred: true,
    } : {}),
  };
}
