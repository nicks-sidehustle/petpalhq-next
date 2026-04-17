'use client';

import { useCallback, useEffect, useRef } from 'react';
import { trackAffiliateClick, injectAscSubtag } from '@/lib/dataLayer';
import { getAffiliateClickEnrichment } from '@/lib/engagement';

function findNearestH2(element: HTMLElement): string {
  let el: Element | null = element;
  // Walk up and backwards through siblings/parents to find the nearest h2
  while (el) {
    // Check previous siblings
    let prev: Element | null = el.previousElementSibling;
    while (prev) {
      if (prev.tagName === 'H2') {
        return prev.textContent?.trim().slice(0, 80) || '';
      }
      prev = prev.previousElementSibling;
    }
    // Move to parent and try again
    el = el.parentElement;
  }
  return '';
}

interface AffiliateTrackingWrapperProps {
  html: string;
  className?: string;
  /** Used to generate aria-label for agentic checkout protocol */
  productName?: string;
  /** UCP partner tag — activated when Google UCP SDK is provisioned */
  ucpTag?: string;
}

/**
 * Drop this around prose HTML (e.g. dangerouslySetInnerHTML payloads) to
 * hijack any `a[href*="amazon.com"]` clicks inside and fire a tracked
 * affiliate_link_click event before navigation.
 *
 * Use ClientAffiliateCTA instead for React-rendered buttons/links.
 */
export function AffiliateTrackingWrapper({ html, className, productName, ucpTag }: AffiliateTrackingWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Link Triad: make product images clickable to the nearest Amazon link
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const images = container.querySelectorAll('img');
    images.forEach((img) => {
      // Skip if image is already wrapped in a link
      if (img.closest('a')) return;

      // Find the nearest Amazon link — look in the next few sibling elements
      const wrapper = img.closest('div');
      if (!wrapper) return;

      let amazonLink: HTMLAnchorElement | null = null;
      let el: Element | null = wrapper;
      // Search forward through up to 5 sibling elements for an Amazon link
      for (let i = 0; i < 5 && el; i++) {
        el = el.nextElementSibling;
        if (!el) break;
        amazonLink = el.querySelector('a[href*="amazon.com"]') || el.querySelector('a[href*="amzn.to"]');
        if (amazonLink) break;
      }

      if (amazonLink) {
        const href = amazonLink.getAttribute('href') || '';
        img.style.cursor = 'pointer';
        img.title = 'Click to view on Amazon';
        // Agentic checkout ARIA protocol
        const imgProduct = img.alt || productName || '';
        if (imgProduct) {
          img.setAttribute('aria-label', `Execute tracked Amazon purchase for ${imgProduct}`);
        }
        // UCP telemetry stub (activated when Google UCP SDK is provisioned)
        if (ucpTag) img.setAttribute('data-ucp-tag', ucpTag);
        img.addEventListener('click', () => {
          const imgProductName = img.alt || '';
          const enrichment = getAffiliateClickEnrichment();
          const contentSection = findNearestH2(img);
          const { ascsubtag } = trackAffiliateClick({
            product_name: imgProductName,
            link_position: 'product_image',
            link_url: href,
            content_section: contentSection,
            cta_type: 'product_image',
            ...enrichment,
          });
          window.open(injectAscSubtag(href, ascsubtag), '_blank', 'noopener,noreferrer');
        });
      }
    });
  }, [html, productName, ucpTag]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest('a');
    if (!anchor) return;

    const href = anchor.getAttribute('href') || '';
    if (href.includes('amazon.com') || href.includes('amzn.to')) {
      const clickProductName = anchor.textContent?.trim() || productName || '';
      const asinMatch = href.match(/\/dp\/([A-Z0-9]{10})/);
      const enrichment = getAffiliateClickEnrichment();

      // Agentic checkout ARIA protocol — label the clicked anchor for AI agent attribution
      if (clickProductName && !anchor.getAttribute('aria-label')) {
        anchor.setAttribute('aria-label', `Execute tracked Amazon purchase for ${clickProductName}`);
      }
      // UCP telemetry stub
      if (ucpTag) anchor.setAttribute('data-ucp-tag', ucpTag);

      const categorySlug = window.location.pathname.split('/').pop()?.replace(/-\d{4}$/, '') || '';
      const contentSection = findNearestH2(target);

      const { ascsubtag } = trackAffiliateClick({
        product_name: clickProductName,
        asin: asinMatch?.[1] || '',
        link_position: 'guide_content',
        product_category: categorySlug,
        link_url: href,
        content_section: contentSection,
        cta_type: 'secondary',
        ...enrichment,
      });

      // Inject dynamic ascsubtag into the actual navigation URL
      anchor.href = injectAscSubtag(href, ascsubtag);
    }
  }, [productName, ucpTag]);

  return (
    <div
      ref={containerRef}
      className={className}
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
