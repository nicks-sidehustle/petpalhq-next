/**
 * Interaction-gated affiliate href conversion (DG-2, ports deskgear PR #10).
 *
 * Shared, dependency-free helper (safe to import into client OR server
 * components — no `fs`). Converts a bare Amazon affiliate URL into the internal
 * `/go/{id}` redirect path. Robots.txt Disallows `/go/` and the anchors carry
 * rel="nofollow sponsored", so crawlers that follow `<a href>` without running
 * JS never reach amazon.com with the affiliate tag — the mechanism behind the
 * phantom-click inflation (DG0-DIAGNOSIS H5).
 *
 * Returns null for non-Amazon URLs (real outlet citations, internal links,
 * amazon help/customer-service pages that carry no tag) so callers can pass
 * those through untouched.
 */
export function amazonToGoHref(href: string): string | null {
  if (!/amazon\./i.test(href)) return null;
  const dp = href.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
  if (dp) return `/go/${dp[1]}`;
  try {
    const k = new URL(href).searchParams.get("k");
    if (k) return `/go/${encodeURIComponent(k)}`;
  } catch {
    /* malformed URL — fall through, leave unchanged */
  }
  return null;
}
