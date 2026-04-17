'use client';

import { useEffect } from 'react';
import { getAISource } from '@/lib/content/ai-referrers';

/**
 * AIReferrerTracker — fires a GA4 `ai_referral` event on the first page
 * load when a user arrives from a known AI platform (ChatGPT, Perplexity,
 * Gemini, Claude, Bing AI, etc.), and persists the source to sessionStorage
 * so every downstream affiliate_click event in the same session carries
 * the AI attribution in its payload.
 *
 * Namespace is `lf_*` (L&F) to avoid clashing with SHE when both sites are
 * opened in the same browser session.
 */
export default function AIReferrerTracker() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // ── MCP attribution: detect ?ref=mcp in URL ──
    const params = new URLSearchParams(window.location.search);
    const mcpRef = params.get('ref') === 'mcp';

    if (mcpRef) {
      try {
        sessionStorage.setItem('lf_mcp_referred', 'true');
      } catch {
        // sessionStorage might be blocked
      }

      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'mcp_attribution',
        mcp_referred: true,
        page_path: window.location.pathname,
      });

      if (typeof window.gtag === 'function') {
        window.gtag('event', 'mcp_attribution', {
          mcp_referred: true,
          page_path: window.location.pathname,
        });
      }
    }

    // ── AI referrer detection ──
    if (!document.referrer) return;

    const aiSource = getAISource(document.referrer);
    if (!aiSource) return;

    // Persist AI source so affiliate click enrichment can read it later in the session
    try {
      sessionStorage.setItem('lf_ai_source', aiSource);
      sessionStorage.setItem('lf_ai_referred', 'true');
    } catch {
      // sessionStorage might be blocked (private browsing, etc.)
    }

    // Push to dataLayer (consumed by GTM and/or GA4 directly)
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'ai_referral',
      ai_source: aiSource,
      ai_referred: true,
      referrer_url: document.referrer,
      mcp_referred: mcpRef,
    });

    // Also fire via gtag directly in case GA4 is loaded without GTM
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'ai_referral', {
        ai_source: aiSource,
        ai_referred: true,
        referrer_url: document.referrer,
        mcp_referred: mcpRef,
      });
    }
  }, []); // Run once on mount — referrer is stable per page load

  return null;
}
