'use client';

import { useEffect, useState } from 'react';
import { trackAffiliateClick, injectAscSubtag } from '@/lib/dataLayer';
import { getAffiliateClickEnrichment } from '@/lib/engagement';

interface StickyProduct {
  name: string;
  price?: string;
  amazonUrl: string;
  /** DOM id of the section this product lives in (used to set the active card on scroll) */
  sectionId: string;
  /** Optional ASIN for GA4 ecommerce correlation */
  asin?: string;
}

interface StickyAmazonBarProps {
  products: StickyProduct[];
  /** Element id whose visibility determines whether the bar shows.
   * Bar appears when the sentinel scrolls OUT of view. Defaults to "sticky-bar-sentinel". */
  sentinelId?: string;
  /** Element id where the bar should hide again (typically a footer / "back to guides" link) */
  endSentinelId?: string;
}

/**
 * StickyAmazonBar — persistent bottom-of-viewport Amazon CTA that follows the
 * user through the guide. Active product cycles between the tier cards based
 * on which one is currently in the viewport, so the CTA stays contextually
 * relevant to where the reader is reading.
 *
 * GA4 position: sticky_bar. On SHE this is the #2 earning position (after
 * featured_strip) and captures a lot of exit-intent / read-to-the-end
 * conversions that would otherwise bounce.
 *
 * Respects sessionStorage dismissal (key: lf_sticky_bar_dismissed) — once a
 * user X's it out, it stays dismissed for the whole session.
 */
export function StickyAmazonBar({
  products,
  sentinelId = 'sticky-bar-sentinel',
  endSentinelId = 'sticky-bar-end-sentinel',
}: StickyAmazonBarProps) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pastEnd, setPastEnd] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      if (sessionStorage.getItem('lf_sticky_bar_dismissed')) {
        setDismissed(true);
        return;
      }
    } catch {
      // sessionStorage blocked — continue without persistence
    }

    // Show/hide bar based on sentinel scroll position
    const sentinel = document.getElementById(sentinelId);
    if (!sentinel) {
      // No sentinel — fall back to a simple scroll threshold
      const onScroll = () => setVisible(window.scrollY > 600);
      window.addEventListener('scroll', onScroll, { passive: true });
      return () => window.removeEventListener('scroll', onScroll);
    }

    const visibilityObserver = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 }
    );
    visibilityObserver.observe(sentinel);

    // End sentinel — hide bar when user scrolls into the footer/related guides area
    let endObserver: IntersectionObserver | null = null;
    if (endSentinelId) {
      const endEl = document.getElementById(endSentinelId);
      if (endEl) {
        endObserver = new IntersectionObserver(
          ([entry]) => setPastEnd(entry.isIntersecting),
          { threshold: 0 }
        );
        endObserver.observe(endEl);
      }
    }

    // Section-tracking observer: update active product when its section enters viewport
    const sectionObservers: IntersectionObserver[] = [];
    const visibleSections = new Set<string>();

    products.forEach(({ sectionId }) => {
      const el = document.getElementById(sectionId);
      if (!el) return;

      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            visibleSections.add(sectionId);
          } else {
            visibleSections.delete(sectionId);
          }
          const firstIdx = products.findIndex((p) => visibleSections.has(p.sectionId));
          if (firstIdx !== -1) setActiveIndex(firstIdx);
        },
        { rootMargin: '-80px 0px -50% 0px', threshold: 0 }
      );
      obs.observe(el);
      sectionObservers.push(obs);
    });

    return () => {
      visibilityObserver.disconnect();
      endObserver?.disconnect();
      sectionObservers.forEach((o) => o.disconnect());
    };
  }, [sentinelId, endSentinelId, products]);

  if (dismissed || !visible || pastEnd || products.length === 0) return null;

  const active = products[activeIndex] ?? products[0];

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem('lf_sticky_bar_dismissed', '1');
    } catch {
      // sessionStorage blocked — still dismiss for this page
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const enrichment = getAffiliateClickEnrichment();
    const { ascsubtag } = trackAffiliateClick({
      product_name: active.name,
      link_position: 'sticky_bar',
      link_url: active.amazonUrl,
      cta_type: 'primary',
      card_index: activeIndex,
      content_section: active.sectionId,
      asin: active.asin,
      ...enrichment,
    });
    e.currentTarget.href = injectAscSubtag(active.amazonUrl, ascsubtag);
  };

  return (
    <div
      role="complementary"
      aria-label="Quick purchase shortcut"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 40,
        background: 'var(--cream)',
        borderTop: '1px solid var(--oat)',
        boxShadow: '0 -8px 24px -16px rgba(42, 37, 32, 0.18)',
        fontFamily: 'var(--font-body)',
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: '0 auto',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {/* Product label */}
        <div style={{ flex: 1, minWidth: 0, fontSize: 14, lineHeight: 1.3 }}>
          {active.price && (
            <span
              style={{
                color: 'var(--tomato)',
                fontWeight: 700,
                marginRight: 8,
              }}
            >
              {active.price}
            </span>
          )}
          <span
            style={{
              color: 'var(--espresso)',
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'inline-block',
              maxWidth: '100%',
              verticalAlign: 'middle',
            }}
          >
            {active.name}
          </span>
        </div>

        {/* CTA */}
        <a
          href={active.amazonUrl}
          target="_blank"
          rel="noopener noreferrer nofollow sponsored"
          onClick={handleClick}
          aria-label={`See ${active.name} price on Amazon`}
          style={{
            padding: '9px 16px',
            background: 'var(--tomato)',
            color: 'var(--cream)',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          See on Amazon
        </a>

        {/* Dismiss */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss"
          style={{
            background: 'transparent',
            border: 'none',
            padding: 6,
            cursor: 'pointer',
            color: 'var(--driftwood)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="3" y1="3" x2="13" y2="13" />
            <line x1="13" y1="3" x2="3" y2="13" />
          </svg>
        </button>
      </div>
    </div>
  );
}
