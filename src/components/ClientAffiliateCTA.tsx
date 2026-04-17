"use client";

import { trackAffiliateClick, injectAscSubtag } from "@/lib/dataLayer";

interface ClientAffiliateCTAProps {
  href: string;
  productName: string;
  /** GA4 position label, e.g. "guide_content", "featured_strip", "sticky_bar" */
  linkPosition: string;
  /** CTA category for grouping, e.g. "primary", "secondary", "tier_card" */
  ctaType: string;
  /** Index within a card grid — useful for attribution on multi-card sections */
  cardIndex?: number;
  /** Section heading closest to the click, for slice-and-dice analysis */
  contentSection?: string;
  /** Amazon ASIN if known — enables GA4 ecommerce items[] correlation */
  asin?: string;
  /** Product category slug — populates product_category in the event */
  productCategory?: string;
  className?: string;
  style?: React.CSSProperties;
  "aria-label"?: string;
  children: React.ReactNode;
}

/**
 * React wrapper for affiliate CTAs. Drops a tracked <a> tag that:
 *  1. Fires one GA4 + GTM affiliate_link_click event on click
 *  2. Injects a dynamic ascsubtag (lf_{slug}_{position}_{MMYY}) into the
 *     Amazon URL at click-time so Amazon Associates reports show revenue
 *     by page + position.
 *
 * Use this for all button/link Amazon CTAs. For inline prose HTML, use
 * AffiliateTrackingWrapper (event-delegation version) instead.
 */
export function ClientAffiliateCTA({
  href,
  productName,
  linkPosition,
  ctaType,
  cardIndex,
  contentSection,
  asin,
  productCategory,
  className,
  style,
  "aria-label": ariaLabel,
  children,
}: ClientAffiliateCTAProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow sponsored"
      className={className}
      style={style}
      aria-label={ariaLabel}
      onClick={(e) => {
        const { ascsubtag } = trackAffiliateClick({
          product_name: productName,
          link_position: linkPosition,
          cta_type: ctaType,
          link_url: href,
          ...(cardIndex !== undefined && { card_index: cardIndex }),
          ...(contentSection && { content_section: contentSection }),
          ...(asin && { asin }),
          ...(productCategory && { product_category: productCategory }),
        });
        // Inject the generated ascsubtag into the outbound URL so the
        // Amazon Associates report matches the GA4 event 1:1.
        e.currentTarget.href = injectAscSubtag(href, ascsubtag);
      }}
    >
      {children}
    </a>
  );
}
