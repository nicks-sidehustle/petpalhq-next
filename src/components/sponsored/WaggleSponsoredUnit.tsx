import { AffiliateLink } from "@/components/affiliate/AffiliateLink";
import { appendGoParams } from "@/lib/affiliate-href";
import {
  WAGGLE_PLACEMENT,
  WAGGLE_PLACEMENT_SLUG,
} from "@/config/waggle-placement";

/**
 * WaggleSponsoredUnit — the negotiated Waggle listing unit (MOCKUP).
 *
 * Renders ONLY on WAGGLE_PLACEMENT_SLUG and returns null on every other guide,
 * so exactly one instance exists site-wide. Nothing about the host guide's
 * editorial roster, comparison table, scores, or verdicts is read or altered —
 * this is an additive block that sits alongside the editorial, never inside it.
 *
 * Lane laws honored:
 *  - CTAs are internal /go/{ASIN} hrefs through AffiliateLink, so the
 *    interaction-gated redirect (DG-2 click integrity) and
 *    rel="nofollow sponsored noopener noreferrer" both stay intact.
 *  - Each click carries st=sponsored_waggle_{key} (ascsubtag on the Amazon
 *    side) plus CLL position tags s={slug}&p=sponsored_waggle, so sponsor
 *    performance is separable from every editorial placement on the page.
 *  - No price is asserted anywhere: the CTA is the price surface, which keeps
 *    the unit outside the snapshot-freshness gate entirely.
 *  - No product images — placeholder frames only, so pick-image parity and the
 *    asin-image gate are untouched.
 *  - Light card on cream, AA text, CTA ≥44px tall. No dark verdict-box.
 */
export default function WaggleSponsoredUnit({ slug }: { slug: string }) {
  if (slug !== WAGGLE_PLACEMENT_SLUG) return null;

  const { sponsor, eyebrow, heading, intro, products } = WAGGLE_PLACEMENT;

  return (
    <aside
      aria-label={`${eyebrow}: ${sponsor}`}
      data-sponsored-unit="waggle"
      className="mb-16 rounded-lg border overflow-hidden"
      style={{
        backgroundColor: "var(--color-cream)",
        borderColor: "var(--color-cream-deep)",
      }}
    >
      {/* Disclosure band — always precedes the first affiliate element. */}
      <div
        className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3 md:px-8"
        style={{ backgroundColor: "var(--color-cream-deep)" }}
      >
        <span
          className="rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest"
          style={{ backgroundColor: "var(--color-navy)", color: "#ffffff" }}
        >
          {eyebrow}
        </span>
        <span
          className="text-sm font-semibold"
          style={{ color: "var(--color-navy)" }}
        >
          Paid placement by {sponsor}
        </span>
        <span
          className="w-full text-xs leading-relaxed md:w-auto md:flex-1 md:text-right"
          style={{ color: "var(--color-text-muted)" }}
        >
          Not ranked, scored, or considered in our editorial picks.
        </span>
      </div>

      <div className="px-5 py-6 md:px-8 md:py-8">
        <p
          className="font-serif text-xl md:text-2xl font-bold mb-3"
          style={{ color: "var(--color-navy)" }}
        >
          {heading}
        </p>
        <p
          className="text-sm md:text-base mb-6 max-w-prose"
          style={{ color: "var(--color-text)" }}
        >
          {intro}
        </p>

        <div className="grid gap-5 md:grid-cols-2">
          {products.map((product) => {
            const subtag = `sponsored_waggle_${product.subtagKey}`;
            return (
              <div
                key={product.asin}
                className="flex flex-col rounded-md border p-4 md:p-5"
                style={{
                  backgroundColor: "#ffffff",
                  borderColor: "var(--color-cream-deep)",
                }}
              >
                {/* Neutral placeholder frame — Waggle supplies final creative. */}
                <div
                  className="mb-4 flex aspect-[4/3] items-center justify-center rounded border border-dashed"
                  style={{
                    borderColor: "var(--color-text-muted)",
                    backgroundColor: "var(--color-cream)",
                  }}
                >
                  <span
                    className="text-xs font-semibold uppercase tracking-widest"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {sponsor} creative
                  </span>
                </div>

                <p
                  className="font-semibold text-base mb-1"
                  style={{ color: "var(--color-text)" }}
                >
                  {product.name}
                </p>
                {/* navy, not teal-deep: #1e8a96 on white measures 4.09:1,
                    below AA for 14px semibold. navy measures 11.1:1. */}
                <p
                  className="text-sm font-semibold mb-2"
                  style={{ color: "var(--color-navy)" }}
                >
                  {product.headline}
                </p>
                <p
                  className="flex-1 text-sm leading-relaxed mb-3"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {product.body}
                </p>
                <p
                  className="text-xs mb-4"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {product.note}
                </p>

                <AffiliateLink
                  href={appendGoParams(
                    `/go/${product.asin}?st=${subtag}`,
                    WAGGLE_PLACEMENT_SLUG,
                    "sponsored_waggle",
                  )}
                  productName={product.name}
                  placement={subtag}
                  className="inline-flex min-h-[44px] items-center justify-center rounded px-5 text-sm font-semibold uppercase tracking-widest"
                  style={{ backgroundColor: "var(--color-navy)", color: "#ffffff" }}
                >
                  Check price at Amazon
                </AffiliateLink>
              </div>
            );
          })}
        </div>

        <p
          className="mt-5 text-xs leading-relaxed"
          style={{ color: "var(--color-text-muted)" }}
        >
          {sponsor} paid for this placement. The copy above is {sponsor}&rsquo;s,
          limited to claims stated on each product&rsquo;s own Amazon listing, and
          PetPalHQ has not tested either device. Sponsorship buys this unit and
          nothing else — it does not affect which products we rank or what we say
          about them anywhere on this site. The links are affiliate links; as an
          Amazon Associate, PetPalHQ earns from qualifying purchases at no extra
          cost to you.
        </p>
      </div>
    </aside>
  );
}
