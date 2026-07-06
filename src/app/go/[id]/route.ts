import { NextRequest, NextResponse } from "next/server";
import { siteConfig } from "@/config/site";

/**
 * Interaction-gated affiliate redirect (DG-2 structural fix, ports deskgear PR #10).
 *
 * Affiliate links across the site render as internal `/go/{id}` hrefs instead
 * of bare amazon.com URLs. This handler resolves `id` back to the real Amazon
 * destination and 302s to it server-side. Combined with `Disallow: /go/` in
 * robots.txt and rel="nofollow sponsored" on the anchors, crawlers that follow
 * `<a href>` values without running JS never reach amazon.com carrying the
 * affiliate tag — which is what inflates the Associates click count with
 * non-human, non-converting clicks (see DG0-DIAGNOSIS, hypothesis H5).
 *
 * PetPal is guide-picks / markdown based — there is no consensus product
 * registry keyed by id, so resolution is simpler than deskgear's:
 *   1. Bare 10-char ASIN  → direct /dp/{ASIN} link
 *   2. Anything else      → Amazon search for the (decoded) term
 *
 * Attribution: per-placement subtag arrives as `?ascsubtag=` (click-time) or
 * `?st=` (static, from the anchor). The click-time value wins when both exist.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(request.url);
  const subtag =
    url.searchParams.get("ascsubtag") || url.searchParams.get("st") || undefined;
  const sub = subtag ? `&ascsubtag=${encodeURIComponent(subtag)}` : "";
  const tag = siteConfig.amazonTag;

  let dest: string;
  if (/^[A-Z0-9]{10}$/.test(id)) {
    dest = `https://www.amazon.com/dp/${id}?tag=${tag}${sub}`;
  } else {
    dest = `https://www.amazon.com/s?k=${encodeURIComponent(id)}&tag=${tag}${sub}`;
  }

  return NextResponse.redirect(dest, {
    status: 302,
    headers: {
      "X-Affiliate-Redirect": id,
      // Belt-and-suspenders: even if a crawler ignores robots.txt and hits this
      // route, tell it not to index the redirect and not to follow onward.
      "X-Robots-Tag": "noindex, nofollow",
      // Affiliate URLs / subtags change per click — never cache the redirect.
      "Cache-Control": "no-store",
    },
  });
}
