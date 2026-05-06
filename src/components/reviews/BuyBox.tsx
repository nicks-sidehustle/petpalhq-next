import { AffiliateLink } from "@/components/affiliate/AffiliateLink";

interface BuyBoxProps {
  productName: string;
  productSlug: string;
  priceRange: string;
  amazonUrl: string;
  verdict: string;
  score: number;
}

export default function BuyBox({
  productName,
  productSlug,
  priceRange,
  amazonUrl,
  verdict,
  score,
}: BuyBoxProps) {
  return (
    <div
      className="rounded-lg border bg-white p-5"
      style={{ borderColor: "var(--color-cream-deep)" }}
    >
      <p
        className="text-xs font-semibold uppercase tracking-widest mb-1"
        style={{ color: "var(--color-text-muted)" }}
      >
        PetPal Gear Score
      </p>
      <p className="font-serif text-3xl font-bold mb-1" style={{ color: "var(--color-navy)" }}>
        {score.toFixed(1)}
        <span className="text-base font-normal" style={{ color: "var(--color-text-muted)" }}>
          {" "}/ 10
        </span>
      </p>
      <p className="text-sm mb-4" style={{ color: "var(--color-coral)" }}>
        {verdict}
      </p>
      <p className="text-sm mb-1" style={{ color: "var(--color-text-muted)" }}>
        Price
      </p>
      <p className="font-semibold mb-4" style={{ color: "var(--color-text)" }}>
        {priceRange}
      </p>
      <AffiliateLink
        href={amazonUrl}
        productSlug={productSlug}
        productName={productName}
        placement="review-buybox"
        className="block w-full text-center font-medium py-3 rounded transition-opacity hover:opacity-90"
        style={{ backgroundColor: "var(--color-coral)", color: "white" }}
      >
        Check price on Amazon
      </AffiliateLink>
      <p className="text-xs mt-3 text-center" style={{ color: "var(--color-text-muted)" }}>
        Affiliate link — we may earn a commission.
      </p>
    </div>
  );
}
