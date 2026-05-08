import type { PromoOffer } from "@/lib/guides";
import { isPromoActive } from "@/lib/guides";

interface PromoBadgeProps {
  promo: PromoOffer | undefined;
  className?: string;
}

/**
 * Amber badge showing an active deal + optional promo code.
 * Renders nothing when the promo is absent or has expired.
 *
 * Expiry is checked at render time — stale promos never display.
 * This is the trust line: an expired deal shown to users erodes confidence.
 */
export default function PromoBadge({ promo, className = "" }: PromoBadgeProps) {
  if (!isPromoActive(promo)) return null;

  return (
    <div
      className={`inline-flex flex-col gap-0.5 px-3 py-2 rounded text-sm ${className}`}
      style={{
        backgroundColor: "var(--color-amber, #f59e0b1a)",
        border: "1px solid var(--color-amber, #f59e0b)",
        color: "var(--color-amber-text, #92400e)",
      }}
    >
      <span className="font-semibold">
        Active Deal: {promo.discount}
      </span>
      {promo.code && (
        <span
          className="font-mono text-xs tracking-wider"
          style={{ color: "var(--color-amber-text, #92400e)" }}
        >
          Code: {promo.code}
        </span>
      )}
      <span
        className="text-xs opacity-70"
      >
        verified {promo.verifiedDate}
      </span>
    </div>
  );
}
