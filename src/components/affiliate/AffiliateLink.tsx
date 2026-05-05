"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { trackEvent } from "@/components/GoogleAnalytics";

interface AffiliateLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "target" | "rel" | "onClick"> {
  href: string;
  productSlug?: string;
  productName?: string;
  retailer?: string;
  placement: string;
  children: ReactNode;
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
  return (
    <a
      {...anchorProps}
      href={href}
      target="_blank"
      rel="sponsored noopener noreferrer"
      onClick={() => {
        trackEvent("affiliate_click", {
          product_slug: productSlug,
          product_name: productName,
          retailer,
          placement,
        });
      }}
    >
      {children}
    </a>
  );
}
