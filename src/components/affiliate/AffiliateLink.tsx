"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { trackAffiliateLinkClick } from "@/lib/analytics/affiliate-telemetry";

interface AffiliateLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "target" | "rel" | "onClick"> {
  href: string;
  productSlug?: string;
  productName?: string;
  retailer?: string;
  placement: string;
  children: ReactNode;
}

// Route an Amazon destination through the interaction-gated /go redirect
// (DG-2, ports deskgear PR #10). Rendering a bare amazon.com href lets crawlers
// generate phantom affiliate clicks by following the link without JS
// (DG0-DIAGNOSIS H5); an internal /go/{id} href is Disallowed in robots.txt so
// they can't. The `placement` is forwarded as `st` for per-SubID attribution,
// preserved when /go/[id]/route.ts 302s to Amazon. Non-Amazon hrefs — including
// hrefs already authored as internal /go/… (e.g. buildAmazonUrl output) — pass
// through unchanged.
function toAffiliateHref(href: string, placement: string): string {
  if (!href.includes("amazon.com")) return href;
  const st = placement ? `?st=${encodeURIComponent(placement)}` : "";
  const dp = href.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/);
  if (dp) return `/go/${dp[1]}${st}`;
  try {
    const k = new URL(href).searchParams.get("k");
    if (k) return `/go/${encodeURIComponent(k)}${st}`;
  } catch {
    /* malformed URL — fall through */
  }
  return href;
}

export function AffiliateLink({
  href,
  productSlug,
  productName,
  retailer = "amazon",
  placement,
  children,
  ...anchorProps
}: AffiliateLinkProps) {
  const finalHref = retailer === "amazon" ? toAffiliateHref(href, placement) : href;

  return (
    <a
      {...anchorProps}
      href={finalHref}
      target="_blank"
      rel="nofollow sponsored noopener noreferrer"
      // Marks this anchor as already instrumented by React. AffiliateClickListener
      // skips it, so the delegated listener that covers markdown-prose money
      // links can't double-count the component surfaces.
      data-affiliate-tracked="1"
      onClick={() => {
        // Fires `affiliate_link_click` — the RENAMED successor to this
        // component's former `affiliate_click` event, now carrying the full
        // SHE-pattern param set. Exactly one event per click: the old name is
        // fully superseded, never emitted alongside. `placement` became
        // `link_position` (SHE's name); product_name / product_slug / retailer
        // keep the names they already had.
        trackAffiliateLinkClick({
          href: finalHref,
          productName,
          productSlug,
          linkPosition: placement,
          retailer,
        });
      }}
    >
      {children}
    </a>
  );
}
