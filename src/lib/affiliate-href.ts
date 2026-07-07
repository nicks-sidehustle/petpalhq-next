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

/**
 * CLL /go/ position instrumentation (E-000, program 2026-07-portfolio-parity).
 *
 * Appends first-party position tags `?s={slug}&p={position}` to an internal
 * `/go/{id}` href so the /go route can fire a GA4 `go_click` event carrying the
 * originating guide slug + placement (pick rank / inline / faq). These params
 * are consumed SERVER-SIDE in /go/[id]/route.ts and are NEVER forwarded to
 * amazon.com — the affiliate `tag` stays the only Amazon-side param, preserving
 * the DG-2 click-integrity guarantee (verified by scripts/test/go-redirect.test.ts).
 *
 * Purely additive: an empty slug/position simply omits that param, so an
 * untagged `/go/{id}` is unchanged. No visual effect (query string only).
 */
export function appendGoParams(
  goHref: string,
  slug?: string,
  position?: string | number,
): string {
  if (!goHref.startsWith("/go/")) return goHref;
  const [path, existing] = goHref.split("?");
  const params = new URLSearchParams(existing);
  if (slug) params.set("s", slug);
  if (position !== undefined && position !== null && String(position) !== "") {
    params.set("p", String(position));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

/** Builds a position-tagged internal affiliate href for a bare ASIN/search id. */
export function buildGoHref(
  id: string,
  slug?: string,
  position?: string | number,
): string {
  return appendGoParams(`/go/${id}`, slug, position);
}
