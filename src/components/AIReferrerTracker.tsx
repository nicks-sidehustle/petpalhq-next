"use client";

import { useEffect } from "react";

/**
 * Tracks visits originating from AI-powered search/chat surfaces.
 *
 * Why this exists: today's AEO investments (llms-full.txt, ownerVoice
 * verbatim quotes, Product+Review schema with @id+mainEntityOfPage) only
 * matter if they actually drive citation traffic. Without measurement we're
 * blind. This tracker tags any visit referred from ChatGPT, Claude,
 * Perplexity, Bing Chat, Brave Search, DuckDuckGo, Mistral, Phind, Kagi,
 * or You.com so GA4 reports the AI-source breakdown explicitly.
 *
 * Detection strategies (any one match attributes the visit):
 *  1. document.referrer host matches a known AI surface
 *  2. utm_source URL parameter matches a known AI value
 *
 * Attribution persists for the session so subsequent pageviews on the same
 * visit keep the AI-source label, not just the entry pageview.
 */

// `gtag` is already declared globally in GoogleAnalytics.tsx; re-declaring
// would cause TS "All declarations of 'gtag' must have identical modifiers"
// because the other declaration omits `?`. Reuse it as-is.

interface AIReferrer {
  source: string; // canonical name; stable across patterns
  matchedDomain: string;
  matchedVia: "referrer" | "utm";
}

interface AIPattern {
  source: string;
  hosts: string[];
  utmValues?: string[];
}

// Patterns ordered by specificity — copilot.microsoft.com matches before
// bing.com to ensure the chat surface gets credit instead of generic Bing.
const AI_PATTERNS: AIPattern[] = [
  {
    source: "chatgpt",
    hosts: ["chat.openai.com", "chatgpt.com"],
    utmValues: ["chatgpt.com", "chatgpt", "openai.com"],
  },
  {
    source: "claude",
    hosts: ["claude.ai"],
    utmValues: ["claude.ai", "claude", "anthropic"],
  },
  {
    source: "perplexity",
    hosts: ["perplexity.ai", "www.perplexity.ai"],
    utmValues: ["perplexity", "perplexity.ai"],
  },
  {
    source: "copilot",
    hosts: ["copilot.microsoft.com"],
    utmValues: ["copilot", "microsoft-copilot"],
  },
  {
    source: "bing-chat",
    hosts: ["bing.com/chat", "www.bing.com/chat"],
    utmValues: ["bingai", "bing-chat"],
  },
  {
    source: "you-com",
    hosts: ["you.com", "www.you.com"],
    utmValues: ["you.com", "you"],
  },
  {
    source: "brave-search",
    hosts: ["search.brave.com"],
    utmValues: ["brave", "brave-search"],
  },
  {
    source: "duckduckgo",
    hosts: ["duckduckgo.com"],
    utmValues: ["duckduckgo", "ddg"],
  },
  {
    source: "mistral",
    hosts: ["chat.mistral.ai"],
    utmValues: ["mistral", "le-chat"],
  },
  {
    source: "phind",
    hosts: ["phind.com", "www.phind.com"],
    utmValues: ["phind"],
  },
  {
    source: "kagi",
    hosts: ["kagi.com"],
    utmValues: ["kagi"],
  },
];

function detectAIReferrer(): AIReferrer | null {
  if (typeof window === "undefined") return null;

  // Strategy 1 — referrer hostname / path match
  const referrer = document.referrer;
  if (referrer) {
    try {
      const refUrl = new URL(referrer);
      const refHostPath = (refUrl.hostname + refUrl.pathname).toLowerCase();
      for (const pattern of AI_PATTERNS) {
        if (pattern.hosts.some((h) => refHostPath.includes(h))) {
          return {
            source: pattern.source,
            matchedDomain: refUrl.hostname,
            matchedVia: "referrer",
          };
        }
      }
    } catch {
      // referrer not a valid URL — ignore
    }
  }

  // Strategy 2 — utm_source param match
  const params = new URLSearchParams(window.location.search);
  const utmSource = (params.get("utm_source") || "").toLowerCase();
  if (utmSource) {
    for (const pattern of AI_PATTERNS) {
      if (pattern.utmValues?.some((v) => utmSource.includes(v))) {
        return {
          source: pattern.source,
          matchedDomain: utmSource,
          matchedVia: "utm",
        };
      }
    }
  }

  return null;
}

const SESSION_KEY = "petpal_ai_referrer";

export default function AIReferrerTracker() {
  useEffect(() => {
    let firstHit = false;
    let attribution: AIReferrer | null = null;

    // Try to detect a fresh AI referrer on this pageview
    const detected = detectAIReferrer();
    if (detected) {
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(detected));
        firstHit = true;
        attribution = detected;
      } catch {
        // sessionStorage may be blocked (private browsing, iframe sandbox)
        attribution = detected;
        firstHit = true;
      }
    } else {
      // No new referrer — check session storage for persisted attribution
      try {
        const persisted = sessionStorage.getItem(SESSION_KEY);
        if (persisted) {
          attribution = JSON.parse(persisted) as AIReferrer;
        }
      } catch {
        // ignore parse / storage errors
      }
    }

    if (!attribution) return;

    // Fire GA4 event. Two flavors:
    //  - ai_referral: the entry-pageview event (firstHit=true)
    //  - ai_session_pageview: subsequent pageviews on the same AI session
    const eventName = firstHit ? "ai_referral" : "ai_session_pageview";

    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, {
        ai_source: attribution.source,
        ai_matched_domain: attribution.matchedDomain,
        ai_matched_via: attribution.matchedVia,
        page_path: window.location.pathname,
      });
    }
  }, []);

  return null;
}
