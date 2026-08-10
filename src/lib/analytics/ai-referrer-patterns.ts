/**
 * Canonical AI-surface referrer patterns — the single source of truth for the
 * `ai_source` GA4 dimension.
 *
 * Extracted from src/components/AIReferrerTracker.tsx so the click-time
 * classifier in affiliate-telemetry.ts and the pageview-time tracker resolve
 * the SAME label from the same signals. Two copies of this table would let
 * `ai_referral` say "copilot" while `affiliate_link_click` said "bing-chat" for
 * one visit, silently splitting the dimension that AEO work is measured on.
 *
 * Order is significant: patterns are matched first-wins against
 * `hostname + pathname`, so more specific surfaces must precede the generic
 * engine they live on (copilot.microsoft.com and bing.com/chat before any
 * plain bing.com match).
 */

export interface AiPattern {
  /** Canonical, stable label emitted as `ai_source`. */
  source: string;
  /** Matched as substrings of `hostname + pathname`. */
  hosts: string[];
  /** Matched as substrings of a lowercased `utm_source` value. */
  utmValues?: string[];
}

export const AI_PATTERNS: AiPattern[] = [
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
