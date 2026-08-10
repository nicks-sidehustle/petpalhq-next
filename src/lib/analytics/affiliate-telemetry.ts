/**
 * `affiliate_link_click` GA4 telemetry — the portfolio-canonical money-link event.
 *
 * WHY THIS EXISTS — EVENT-NAME DRIFT, NOT MISSING TELEMETRY
 * PetPal was already tracking money-link clicks, under the WRONG EVENT NAME.
 * `AffiliateLink` fired `affiliate_click` (~200 events/30d, 44/7d — real
 * traffic), with 4 params: product_slug, product_name, retailer, placement.
 * The portfolio-canonical name is `affiliate_link_click` (SmartHomeExplorer),
 * so PetPal's clicks were invisible to every cross-site comparison. The same
 * drift affected comparesubs and oneclickai.
 *
 * This module is the RENAME plus the missing params — not a parallel tracker.
 * `affiliate_click` is fully superseded and no longer emitted anywhere; there
 * is exactly one event per click. Param names that already matched SHE
 * (product_name, product_slug, retailer) are unchanged; `placement` became
 * `link_position` to match SHE, and guide_slug, amazon_asin, link_type,
 * ascsubtag, ai_source, user_type, scroll_depth_at_click,
 * time_on_page_before_click and click_index are new.
 *
 * HISTORICAL DATA NOTE: ~200 clicks exist under the old name in the 30 days
 * before this shipped. Any trend analysis must union `affiliate_click` and
 * `affiliate_link_click` across the cutover — reading the new event alone as
 * "clicks from zero" would invent a phantom launch spike.
 *
 * The other pre-existing signal is untouched: `go_click`, fired SERVER-side
 * from /go/[id]/route.ts via the Measurement Protocol, and only when
 * GA4_MP_API_SECRET is configured. It carries no position or product name.
 *
 * What the old tracker never covered, and this module now does: the markdown
 * guide bodies, where most money links actually live (see
 * AffiliateClickListener).
 *
 * OBSERVE-ONLY CONTRACT (load-bearing — do not relax)
 * Telemetry here NEVER mutates the click path. It does not rewrite hrefs, does
 * not touch the affiliate `tag`, does not alter the DG-2 interaction gate, and
 * never calls preventDefault() or delays navigation. SHE's dataLayer decorates
 * hrefs at click time (decorateAffiliateHref); that half is deliberately NOT
 * ported. PetPal resolves its tag and ascsubtag server-side in
 * /go/[id]/route.ts, so a client-side rewrite here would be both redundant and
 * a risk to a revenue-critical path.
 *
 * DELIVERY
 * Fires through the existing gtag install (src/components/GoogleAnalytics.tsx)
 * — no second GA4 install — plus a `dataLayer` push for GTM parity and a
 * `navigator.sendBeacon` fallback. The beacon matters: a money-link click
 * navigates immediately, and a plain gtag event can be dropped when the page
 * unloads mid-flight.
 *
 * Param values are PetPal's own: `link_position` is this site's real placement
 * identifier (normalized to snake_case), never a placement invented to match
 * another site's vocabulary.
 */

import { AI_PATTERNS } from './ai-referrer-patterns';

// `window.gtag` / `window.dataLayer` are declared globally in
// src/components/GoogleAnalytics.tsx — reused here, never re-declared.

export type UserType = 'human' | 'ai_crawler' | 'search_bot' | 'unknown';

/**
 * Which kind of Amazon destination the link resolves to. Mirrors
 * buildAmazonDest() in src/lib/go-destination.ts: a bare 10-char ASIN becomes
 * a /dp/ product link, anything else becomes an /s?k= search fallback. Search
 * fallbacks convert worse, so the split has to be visible in reporting.
 */
export type LinkType = 'product' | 'search';

// ─── Bot / AI-crawler detection ─────────────────────────────────────────────

const AI_CRAWLER_SIGNATURES = [
  'GPTBot', 'ChatGPT-User', 'OAI-SearchBot',
  'ClaudeBot', 'Claude-Web', 'anthropic-ai',
  'PerplexityBot', 'YouBot', 'Applebot-Extended',
  'cohere-ai', 'CCBot',
  'Google-Extended',
  'Bytespider',
  'PetalBot',
];

const SEARCH_BOT_SIGNATURES = [
  'Googlebot', 'Bingbot', 'bingbot', 'Slurp',
  'DuckDuckBot', 'Baiduspider', 'YandexBot',
  'Applebot', 'AdsBot-Google', 'Mediapartners-Google',
  'facebookexternalhit', 'Twitterbot', 'LinkedInBot',
  'Discordbot', 'WhatsApp', 'TelegramBot',
];

/**
 * Coarse human-vs-bot heuristic for the `user_type` dimension. AI crawlers are
 * checked before search bots because several AI signatures (Applebot-Extended,
 * Google-Extended) are prefixed by a search-bot signature and would otherwise
 * be misfiled as ordinary search crawlers.
 */
export function detectUserType(ua?: string): UserType {
  const userAgent = ua ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');
  if (!userAgent) return 'unknown';

  for (const sig of AI_CRAWLER_SIGNATURES) {
    if (userAgent.includes(sig)) return 'ai_crawler';
  }
  for (const sig of SEARCH_BOT_SIGNATURES) {
    if (userAgent.includes(sig)) return 'search_bot';
  }
  // Headless/automated: real but not a buying human — don't claim 'human'.
  if (typeof navigator !== 'undefined' && (navigator as { webdriver?: boolean }).webdriver === true) {
    return 'unknown';
  }
  return 'human';
}

// ─── AI referrer classification ─────────────────────────────────────────────

/**
 * Classify a visit's origin as an AI surface, from a referrer URL and/or a
 * utm_source value. Pure so it is unit-testable without a DOM.
 *
 * Matching is host+path based (`bing.com/chat` must beat generic `bing.com`),
 * which is why AI_PATTERNS is specificity-ordered and shared with
 * AIReferrerTracker rather than re-declared — two divergent AI-source tables
 * in one repo would silently split the ai_source dimension.
 */
export function classifyAiSource(referrer?: string, utmSource?: string): string | null {
  if (referrer) {
    try {
      const refUrl = new URL(referrer);
      const refHostPath = (refUrl.hostname + refUrl.pathname).toLowerCase();
      for (const pattern of AI_PATTERNS) {
        if (pattern.hosts.some((h) => refHostPath.includes(h))) return pattern.source;
      }
    } catch {
      // Not a parseable URL — fall through to the utm_source signal.
    }
  }

  if (utmSource) {
    const value = utmSource.toLowerCase();
    for (const pattern of AI_PATTERNS) {
      if (pattern.utmValues?.some((v) => value.includes(v))) return pattern.source;
    }
  }

  return null;
}

/** sessionStorage key written by AIReferrerTracker — read, never rewritten. */
const AI_SESSION_KEY = 'petpal_ai_referrer';

/**
 * Resolve ai_source at click time. Prefers the session attribution
 * AIReferrerTracker already persisted (so a click on page 3 of an AI-referred
 * session still credits the AI surface, long after document.referrer is gone),
 * and falls back to live signals when storage is blocked or the tracker had
 * not mounted yet at first paint.
 */
function resolveAiSource(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const persisted = sessionStorage.getItem(AI_SESSION_KEY);
    if (persisted) {
      const parsed = JSON.parse(persisted) as { source?: string };
      if (parsed?.source) return parsed.source;
    }
  } catch {
    // sessionStorage blocked or malformed JSON — use live signals below.
  }

  const utmSource = new URLSearchParams(window.location.search).get('utm_source') || undefined;
  return classifyAiSource(document.referrer || undefined, utmSource);
}

// ─── /go/ href parsing ──────────────────────────────────────────────────────

export interface ParsedGoHref {
  /** 10-char ASIN when the id is a product; undefined for search fallbacks. */
  asin?: string;
  /** Decoded search keyword when the id is not an ASIN. */
  searchTerm?: string;
  linkType: LinkType;
  /** Guide slug from the CLL `s=` param (appendGoParams). */
  guideSlug?: string;
  /** Placement from the CLL `p=` param. */
  position?: string;
  /** Static per-placement subtag from `st=` (or a click-time `ascsubtag=`). */
  ascsubtag?: string;
}

const ASIN_RE = /^[A-Z0-9]{10}$/;

/**
 * Extract everything the telemetry needs straight out of a `/go/…` href.
 *
 * This is what makes instrumenting markdown guide bodies possible with zero
 * content edits: the global `marked` link renderer in src/lib/guides.ts already
 * emits `/go/{id}?s={slug}&p={position}`, so the anchor itself carries the
 * guide slug, the placement, and the ASIN. Nothing needs to be injected into
 * the authored markdown.
 *
 * Returns null for non-/go/ hrefs so callers can skip non-money links.
 */
export function parseGoHref(href: string): ParsedGoHref | null {
  if (!href) return null;

  // Accept absolute same-origin hrefs too — anchor.href reads back absolute.
  let path = href;
  let query = '';
  try {
    const url = new URL(href, 'https://petpalhq.com');
    path = url.pathname;
    query = url.search;
  } catch {
    const [p, q] = href.split('?');
    path = p;
    query = q ? `?${q}` : '';
  }

  if (!path.startsWith('/go/')) return null;

  const rawId = path.slice('/go/'.length).replace(/\/$/, '');
  if (!rawId) return null;

  let id: string;
  try {
    id = decodeURIComponent(rawId);
  } catch {
    id = rawId;
  }

  const params = new URLSearchParams(query);
  const isAsin = ASIN_RE.test(id);

  const parsed: ParsedGoHref = {
    linkType: isAsin ? 'product' : 'search',
  };
  if (isAsin) parsed.asin = id;
  else parsed.searchTerm = id;

  const slug = params.get('s');
  if (slug) parsed.guideSlug = slug;
  const position = params.get('p');
  if (position) parsed.position = position;
  const subtag = params.get('ascsubtag') || params.get('st');
  if (subtag) parsed.ascsubtag = subtag;

  return parsed;
}

// ─── Position normalization ─────────────────────────────────────────────────

/**
 * Normalize a placement identifier into a stable GA4 dimension value.
 *
 * PetPal's own placement vocabulary is preserved verbatim apart from casing and
 * separators — `guide-featured-picks` becomes `guide_featured_picks`, not some
 * other site's label for a similar-looking strip. Renaming placements to match
 * SmartHomeExplorer would misreport which surface actually earned the click.
 */
export function normalizeLinkPosition(placement?: string | null): string {
  if (!placement) return 'unknown';
  const normalized = placement
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  return normalized || 'unknown';
}

// ─── Engagement state (module-scoped, per pageview) ─────────────────────────

let pageLoadTime = typeof window !== 'undefined' ? Date.now() : 0;
let currentScrollPct = 0;
let affiliateClickCount = 0;

/** Called on mount / route change so the metrics describe THIS pageview. */
export function resetEngagementState(): void {
  pageLoadTime = Date.now();
  currentScrollPct = 0;
  affiliateClickCount = 0;
}

/** Passive scroll listener feeding `scroll_depth_at_click`. Returns a cleanup. */
export function initScrollDepthTracking(): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight =
      document.documentElement.scrollHeight - document.documentElement.clientHeight;
    if (docHeight <= 0) return;
    currentScrollPct = Math.min(100, Math.max(0, Math.round((scrollTop / docHeight) * 100)));
  };

  handler();
  window.addEventListener('scroll', handler, { passive: true });
  return () => window.removeEventListener('scroll', handler);
}

export interface EngagementSnapshot {
  time_on_page_before_click: number;
  scroll_depth_at_click: number;
  click_index: number;
}

/**
 * Snapshot engagement for one click. Increments the per-pageview click counter,
 * so `click_index` distinguishes a first click from a fourth (comparison
 * shopping) — call exactly once per tracked click.
 */
export function takeEngagementSnapshot(): EngagementSnapshot {
  affiliateClickCount += 1;
  return {
    time_on_page_before_click: Math.max(0, Math.round((Date.now() - pageLoadTime) / 1000)),
    scroll_depth_at_click: currentScrollPct,
    click_index: affiliateClickCount,
  };
}

// ─── Param builder ──────────────────────────────────────────────────────────

export interface AffiliateClickInput {
  /** The anchor's href, exactly as rendered. Read-only — never rewritten. */
  href: string;
  productName?: string;
  productSlug?: string;
  /** Explicit placement; falls back to the href's `p=` param. */
  linkPosition?: string;
  /** Explicit guide slug; falls back to the href's `s=` param, then pathname. */
  guideSlug?: string;
  retailer?: string;
  /** Page path override — defaults to window.location.pathname. */
  pagePath?: string;
}

export interface AffiliateClickContext {
  engagement: EngagementSnapshot;
  userType: UserType;
  aiSource: string | null;
  pagePath: string;
}

/**
 * Build the GA4 event payload. PURE — all ambient state arrives via `ctx`,
 * which is what makes the param contract unit-testable.
 *
 * Empty-valued params are OMITTED rather than sent as "": GA4 collapses empty
 * custom-dimension values into an "(other)" bucket, which is exactly the noise
 * this event exists to avoid.
 */
export function buildAffiliateClickParams(
  input: AffiliateClickInput,
  ctx: AffiliateClickContext,
): Record<string, unknown> {
  const parsed = parseGoHref(input.href);

  const guideSlug =
    input.guideSlug ||
    parsed?.guideSlug ||
    guideSlugFromPath(ctx.pagePath);

  const position = input.linkPosition || parsed?.position;

  const params: Record<string, unknown> = {
    link_position: normalizeLinkPosition(position),
    link_url: input.href,
    link_type: parsed?.linkType ?? 'product',
    retailer: input.retailer || 'amazon',
    page_path: ctx.pagePath,
    user_type: ctx.userType,
    ...ctx.engagement,
  };

  if (guideSlug) params.guide_slug = guideSlug;
  if (input.productName) params.product_name = input.productName;
  if (input.productSlug) params.product_slug = input.productSlug;
  if (parsed?.asin) params.amazon_asin = parsed.asin;
  if (parsed?.searchTerm) params.search_term = parsed.searchTerm;
  if (parsed?.ascsubtag) params.ascsubtag = parsed.ascsubtag;
  if (ctx.aiSource) {
    params.ai_source = ctx.aiSource;
    params.ai_referred = true;
  }

  return params;
}

/** `/guides/best-x-2026` → `best-x-2026`; non-guide paths yield undefined. */
function guideSlugFromPath(pagePath: string): string | undefined {
  const m = pagePath.match(/^\/guides\/([^/]+)/);
  return m ? m[1] : undefined;
}

// ─── Dispatch ───────────────────────────────────────────────────────────────

export const AFFILIATE_CLICK_EVENT = 'affiliate_link_click';

/**
 * Fire `affiliate_link_click`. Safe to call from any click handler: it never
 * throws, never blocks, and never touches the event or the anchor, so
 * navigation proceeds exactly as it would without telemetry.
 */
export function trackAffiliateLinkClick(input: AffiliateClickInput): void {
  if (typeof window === 'undefined') return;

  try {
    const pagePath = input.pagePath || window.location.pathname;
    const params = buildAffiliateClickParams(input, {
      engagement: takeEngagementSnapshot(),
      userType: detectUserType(),
      aiSource: resolveAiSource(),
      pagePath,
    });

    // GTM parity — harmless when no GTM container is installed.
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: AFFILIATE_CLICK_EVENT, ...params });

    if (typeof window.gtag === 'function') {
      window.gtag('event', AFFILIATE_CLICK_EVENT, params);
    }

    sendClickBeacon(params);
  } catch {
    // Telemetry must never break a money link. Swallow everything.
  }
}

/**
 * sendBeacon fallback. A money-link click navigates away immediately, and the
 * gtag XHR can be cancelled mid-flight by the unload; a beacon is queued by the
 * browser and delivered regardless. Duplicate-safe: GA4 dedupes on the
 * session/event pair, and the `beacon=true` param makes the path auditable.
 */
function sendClickBeacon(params: Record<string, unknown>): void {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (!measurementId || typeof navigator === 'undefined' || !navigator.sendBeacon) return;

  try {
    const qs = new URLSearchParams({
      v: '2',
      tid: measurementId,
      en: AFFILIATE_CLICK_EVENT,
      _p: String(Date.now()),
      'ep.beacon': 'true',
    });
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue;
      if (typeof value === 'number') qs.set(`epn.${key}`, String(value));
      else qs.set(`ep.${key}`, String(value));
    }
    navigator.sendBeacon(`https://www.google-analytics.com/g/collect?${qs.toString()}`);
  } catch {
    // gtag call above is the primary path — beacon is best-effort only.
  }
}
