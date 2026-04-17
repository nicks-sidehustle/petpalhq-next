// AI Referrer Detection for GEO/AEO tracking
// Detects when users arrive from AI platforms (ChatGPT, Perplexity, Gemini, etc.)
// Ported from SmartHomeExplorer — part of the L&F tracking infra port.

export const AI_REFERRER_DOMAINS = [
  'chatgpt.com',
  'chat.openai.com',
  'perplexity.ai',
  'gemini.google.com',
  'bard.google.com',
  'claude.ai',
  'copilot.microsoft.com',
  'bing.com', // includes AI mode
  'you.com',
  'phind.com',
  'poe.com',
  'character.ai',
] as const;

export type AISource =
  | 'chatgpt'
  | 'perplexity'
  | 'gemini'
  | 'claude'
  | 'copilot'
  | 'bing-ai'
  | 'other-ai'
  | null;

export function isAIReferrer(referrerUrl: string): boolean {
  if (!referrerUrl) return false;
  try {
    const hostname = new URL(referrerUrl).hostname.toLowerCase();
    return AI_REFERRER_DOMAINS.some((domain) => hostname.includes(domain));
  } catch {
    return false;
  }
}

export function getAISource(referrerUrl: string): AISource {
  if (!referrerUrl) return null;
  try {
    const hostname = new URL(referrerUrl).hostname.toLowerCase();
    if (hostname.includes('chatgpt') || hostname.includes('openai')) return 'chatgpt';
    if (hostname.includes('perplexity')) return 'perplexity';
    if (hostname.includes('gemini') || hostname.includes('bard')) return 'gemini';
    if (hostname.includes('claude')) return 'claude';
    if (hostname.includes('copilot') || hostname.includes('bing')) return 'bing-ai';
    if (AI_REFERRER_DOMAINS.some((d) => hostname.includes(d))) return 'other-ai';
    return null;
  } catch {
    return null;
  }
}
