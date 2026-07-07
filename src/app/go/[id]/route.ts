import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { siteConfig } from "@/config/site";
import { buildAmazonDest } from "@/lib/go-destination";

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
 *
 * CLL position layer (E-000): the anchor may also carry first-party position
 * tags `?s={slug}&p={position}` (guide slug + placement: pick rank / inline /
 * faq). These are read here to fire a GA4 Measurement Protocol `go_click`
 * event server-side, then discarded — buildAmazonDest only ever emits `tag`
 * (+ optional `ascsubtag`), so `s`/`p` are NEVER forwarded to amazon.com. The
 * event fires via `after()` (post-response) so it adds no redirect latency.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(request.url);
  const subtag =
    url.searchParams.get("ascsubtag") || url.searchParams.get("st") || undefined;
  const tag = siteConfig.amazonTag;

  // CLL first-party position tags — consumed here, never sent onward to Amazon.
  const slug = url.searchParams.get("s") || undefined;
  const position = url.searchParams.get("p") || undefined;

  const dest = buildAmazonDest(id, subtag, tag);

  // Fire the go_click event after the response is sent (zero added latency).
  // Best-effort only: any failure must never affect the redirect.
  const cookieHeader = request.headers.get("cookie") || "";
  after(() => sendGoClickEvent({ id, slug, position, cookieHeader }));

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

/**
 * Server-side GA4 Measurement Protocol `go_click` event. No-ops silently unless
 * both NEXT_PUBLIC_GA_MEASUREMENT_ID and GA4_MP_API_SECRET are configured, so a
 * missing secret never breaks the redirect. Carries no PII: only the guide slug,
 * placement position, and ASIN/search id.
 */
async function sendGoClickEvent({
  id,
  slug,
  position,
  cookieHeader,
}: {
  id: string;
  slug?: string;
  position?: string;
  cookieHeader: string;
}): Promise<void> {
  try {
    const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    const apiSecret = process.env.GA4_MP_API_SECRET;
    if (!measurementId || !apiSecret) return;

    const isAsin = /^[A-Z0-9]{10}$/.test(id);
    const eventParams: Record<string, string | number> = {
      slug: slug || "",
      position: position || "",
      engagement_time_msec: 1,
    };
    if (isAsin) eventParams.asin = id;
    else eventParams.search_term = id;

    const body = JSON.stringify({
      client_id: clientIdFromCookie(cookieHeader),
      events: [{ name: "go_click", params: eventParams }],
    });

    await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(
        measurementId,
      )}&api_secret=${encodeURIComponent(apiSecret)}`,
      { method: "POST", body, headers: { "Content-Type": "application/json" } },
    );
  } catch {
    /* best-effort telemetry — swallow all errors, redirect already returned */
  }
}

/**
 * Derives a stable GA4 client_id from the `_ga` cookie (`GA1.1.X.Y` → `X.Y`)
 * so the event ties to the visitor's existing session when available; falls
 * back to a random id (the click is still counted, just unattributed).
 */
function clientIdFromCookie(cookieHeader: string): string {
  const m = cookieHeader.match(/(?:^|;\s*)_ga=GA\d+\.\d+\.(\d+\.\d+)/);
  if (m) return m[1];
  return `${Math.floor(Math.random() * 1e10)}.${Math.floor(Date.now() / 1000)}`;
}
