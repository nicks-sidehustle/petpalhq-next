/**
 * Push structured events to GTM dataLayer + GA4.
 * Safe to call server-side (no-ops when window is undefined).
 *
 * Ported from SmartHomeExplorer. Differences from the SHE version:
 *  - ascsubtag prefix: `lf_` (was `she_`) so Amazon Associates reports
 *    show per-page, per-position revenue attribution distinctly from SHE.
 *  - sendBeacon measurement ID is read from NEXT_PUBLIC_GA_MEASUREMENT_ID
 *    instead of being hardcoded.
 */

import { loadSiteConfig } from '@omc/config';
import { buildAmazonUrl } from '@omc/affiliate-layer';
import { getAffiliateClickEnrichment } from './engagement';

// Bind tag once at module scope so AJV validation runs exactly once, not per call.
const SITE_TAG = loadSiteConfig('petpalhq').affiliateTag;

interface AffiliateClickData {
  product_name: string;
  product_category?: string;
  product_price?: string;
  asin?: string;
  guide_slug?: string;
  link_position: string;
  link_url?: string;
  [key: string]: unknown;
}

interface PageViewEvent {
  page_type: string;
  page_category?: string;
  product_count?: number;
}

/**
 * Generate a dynamic ascsubtag for Amazon attribution.
 * Format: lf_{guideSlug}_{linkPosition}_{MMYY}
 * Example: lf_best-dog-harnesses-2026_guide_content_0426
 *
 * This is appended to Amazon URLs at click time so Amazon Associates
 * reports show per-page, per-position revenue attribution.
 */
function generateAscSubtag(guideSlug: string, linkPosition: string): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  // Sanitize: only allow alphanumeric, hyphens, underscores. Max 50 chars for Amazon.
  const slug = guideSlug.replace(/[^a-z0-9-]/gi, '').slice(0, 30);
  const pos = linkPosition.replace(/[^a-z0-9_]/gi, '').slice(0, 15);
  return `lf_${slug}_${pos}_${mm}${yy}`;
}

/**
 * Inject or replace ascsubtag in an Amazon URL.
 * If the URL already has an ascsubtag param, replace it with the dynamic one.
 */
export function injectAscSubtag(amazonUrl: string, ascsubtag: string): string {
  if (!amazonUrl || !ascsubtag) return amazonUrl;
  return buildAmazonUrl({ existingUrl: amazonUrl, tag: SITE_TAG, ascsubtag });
}

/**
 * Unified affiliate click tracker. Fires exactly ONE GTM dataLayer push
 * and ONE GA4 gtag event. All components should use this instead of
 * calling trackEvent + pushAffiliateClick separately.
 *
 * Returns the generated ascsubtag so callers can inject it into the Amazon URL.
 */
export function trackAffiliateClick(data: AffiliateClickData): { ascsubtag: string } {
  if (typeof window === 'undefined') return { ascsubtag: '' };

  const pagePath = window.location.pathname;
  const guideSlug = data.guide_slug || pagePath.split('/').pop() || '';
  const ascsubtag = generateAscSubtag(guideSlug, data.link_position);

  // Merge enrichment (scroll depth, time on page, click index, AI source)
  // into every affiliate click.
  const enrichment = typeof window !== 'undefined' ? getAffiliateClickEnrichment() : {};

  const payload = {
    ...enrichment,
    ...data,
    page_path: pagePath,
    guide_slug: guideSlug,
    ascsubtag,  // include in GA4 event for correlation with Amazon reports
  };

  // GTM dataLayer (single push)
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'affiliate_link_click',
    ...payload,
  });

  // GA4 gtag (single event)
  if (window.gtag) {
    window.gtag('event', 'affiliate_link_click', payload);
  }

  // sendBeacon fallback — fires reliably even when the page is unloading
  // (standard gtag events can be lost when the browser navigates away immediately)
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (measurementId && navigator.sendBeacon) {
    try {
      navigator.sendBeacon(
        `https://www.google-analytics.com/g/collect?v=2&tid=${encodeURIComponent(measurementId)}&en=affiliate_link_click&_p=${Date.now()}` +
        `&ep.product_name=${encodeURIComponent(data.product_name)}` +
        `&ep.link_position=${encodeURIComponent(data.link_position)}` +
        `&ep.ascsubtag=${encodeURIComponent(ascsubtag)}` +
        `&ep.page_path=${encodeURIComponent(pagePath)}` +
        `&ep.guide_slug=${encodeURIComponent(guideSlug)}` +
        `&ep.beacon=true`
      );
    } catch {
      // sendBeacon failed — original gtag call is the primary tracker
    }
  }

  return { ascsubtag };
}

/** @deprecated Use trackAffiliateClick instead */
export function pushAffiliateClick(data: AffiliateClickData): { ascsubtag: string } {
  return trackAffiliateClick(data);
}

export function pushPageView(data: PageViewEvent) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'virtual_pageview',
    ...data,
    page_path: window.location.pathname,
  });
}

export function pushCustomEvent(eventName: string, data: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: eventName,
    ...data,
  });
}
