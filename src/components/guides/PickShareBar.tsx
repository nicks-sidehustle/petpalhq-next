"use client";

import { useState } from "react";

interface PickShareBarProps {
  guideSlug: string;
  pickAnchor: string;
  productName: string;
}

/**
 * Small inline row of share / copy-link icons rendered next to each pick's
 * heading. Builds anchor URLs server-renderably (no window dependency) so
 * the markup is hydration-safe and SSR-correct.
 *
 * Why this exists: each pick already has a unique anchor URL, but visitors
 * had no UI to copy or share that URL — the only way to deep-link to a pick
 * was to manually construct it. This bar makes the per-pick URL visible and
 * shareable, which improves how external sites (and LLMs that surface
 * those external citations) link back to specific products.
 */
export default function PickShareBar({
  guideSlug,
  pickAnchor,
  productName,
}: PickShareBarProps) {
  const [copied, setCopied] = useState(false);
  const url = `https://petpalhq.com/guides/${guideSlug}#${pickAnchor}`;
  const text = `${productName} — PetPalHQ`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access may fail in some browsers / iframes — fall back to
      // the share-on-X path which is the most-clicked alternative.
    }
  };

  const xShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  const redditShareUrl = `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`;
  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;

  const iconBase =
    "inline-flex items-center justify-center w-7 h-7 rounded-full text-xs transition-colors text-gray-400 hover:bg-gray-100 hover:text-gray-700";

  return (
    <div
      className="flex items-center gap-1 text-xs"
      aria-label={`Share or copy link to ${productName}`}
    >
      <button
        type="button"
        onClick={handleCopy}
        className={iconBase}
        aria-label={copied ? "Link copied" : "Copy link to this pick"}
        title={copied ? "Copied!" : "Copy link"}
      >
        {copied ? "✓" : "🔗"}
      </button>
      <a
        href={xShareUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={iconBase}
        aria-label={`Share ${productName} on X`}
        title="Share on X"
      >
        𝕏
      </a>
      <a
        href={redditShareUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={iconBase}
        aria-label={`Share ${productName} on Reddit`}
        title="Share on Reddit"
      >
        ↑
      </a>
      <a
        href={facebookShareUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={iconBase}
        aria-label={`Share ${productName} on Facebook`}
        title="Share on Facebook"
      >
        f
      </a>
    </div>
  );
}
