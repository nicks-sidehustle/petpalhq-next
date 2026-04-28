/**
 * PawScoreCard — proprietary Paw Score display.
 *
 * Server Component (no "use client"). SSR-rendered so AI crawlers
 * (GPTBot / PerplexityBot / Googlebot) can extract the score and sub-scores
 * as structured data. Uses `data-paw-score` and `aria-label` attributes
 * specifically so extractors can see the number cleanly.
 *
 * Two variants:
 *   - `variant="compact"` (default): small horizontal strip showing overall
 *     score + label + source count. Fits inside ValueTierCard header rows.
 *   - `variant="full"`: full breakdown card with 5 sub-score bars + summary +
 *     methodology link. For product detail pages or hero placements.
 */

import Link from "next/link";
import type { PawScoreResult } from "@/lib/paw-score";
import { PAW_SCORE_DIMENSIONS } from "@/lib/paw-score";

interface PawScoreCardProps {
  productName: string;
  result: PawScoreResult;
  sourcesCount: number;
  variant?: "compact" | "full";
  /** Numeric price in USD — used to gate the "Premium Certified" badge. */
  priceUSD?: number;
}

/** L&F tier palette for the score bar fill — warm, not stoplight. */
function barColor(score: number): string {
  if (score >= 8.5) return "var(--leaf)"; // deep green
  if (score >= 7.5) return "var(--sage)";
  if (score >= 6.5) return "var(--honey)";
  return "var(--tomato)";
}

function labelTone(label: string): { bg: string; fg: string } {
  switch (label) {
    case "Exceptional":
    case "Outstanding":
      return { bg: "var(--leaf)", fg: "var(--cream)" };
    case "Excellent":
    case "Very Good":
      return { bg: "var(--sage)", fg: "var(--cream)" };
    case "Good":
    case "Solid":
      return { bg: "var(--honey)", fg: "var(--espresso)" };
    default:
      return { bg: "var(--tomato)", fg: "var(--cream)" };
  }
}

export function PawScoreCard({
  productName,
  result,
  sourcesCount,
  variant = "compact",
  priceUSD,
}: PawScoreCardProps) {
  const { score, breakdown, label, summary } = result;
  const tone = labelTone(label);
  const isPremiumCertified = score >= 8.5 && priceUSD !== undefined && priceUSD >= 150;

  if (variant === "compact") {
    // Slim horizontal strip for inside ValueTierCard. Shows the overall
    // number, the label badge, and a single methodology link.
    return (
      <div
        data-paw-score={score}
        data-product={productName}
        aria-label={`Paw Score for ${productName}: ${score} out of 10, ${label}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 12,
          padding: "8px 12px",
          background: "var(--ivory)",
          border: "1px solid var(--oat)",
          borderRadius: 10,
          fontFamily: "var(--font-body)",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "baseline",
            gap: 4,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--tomato)",
              fontFamily: "var(--font-body)",
            }}
          >
            Paw Score
          </span>
          <span
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: "var(--espresso)",
              fontFamily: "var(--font-display)",
              letterSpacing: "-0.01em",
              marginLeft: 6,
            }}
          >
            {score.toFixed(1)}
          </span>
          <span
            style={{
              fontSize: 12,
              color: "var(--driftwood)",
            }}
          >
            /10
          </span>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "2px 8px",
            background: tone.bg,
            color: tone.fg,
            borderRadius: 6,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: 11,
            color: "var(--driftwood)",
          }}
        >
          {sourcesCount} expert sources
        </span>
        {isPremiumCertified && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "2px 8px",
              background: "var(--leaf)",
              color: "var(--cream)",
              borderRadius: 6,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Premium Certified
          </span>
        )}
      </div>
    );
  }

  // Full variant — breakdown card.
  return (
    <section
      data-paw-score={score}
      data-product={productName}
      aria-label={`Paw Score for ${productName}: ${score} out of 10`}
      style={{
        background: "#FFFFFF",
        border: "1px solid var(--oat)",
        borderRadius: 14,
        padding: "24px 26px",
        fontFamily: "var(--font-body)",
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 4,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--tomato)",
              }}
            >
              Paw Score
            </span>
            <span
              style={{
                padding: "2px 10px",
                background: tone.bg,
                color: tone.fg,
                borderRadius: 6,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {label}
            </span>
            {isPremiumCertified && (
              <span
                style={{
                  padding: "2px 10px",
                  background: "var(--leaf)",
                  color: "var(--cream)",
                  borderRadius: 6,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Premium Certified
              </span>
            )}
          </div>
          <p
            style={{
              fontSize: 13,
              color: "var(--driftwood)",
              margin: 0,
            }}
          >
            Loyal &amp; Found proprietary rating
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            aria-label={`Paw Score: ${score} out of 10`}
            style={{
              fontSize: 40,
              fontWeight: 600,
              color: "var(--espresso)",
              fontFamily: "var(--font-display)",
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            {score.toFixed(1)}
            <span
              style={{
                fontSize: 16,
                fontWeight: 500,
                color: "var(--driftwood)",
                fontFamily: "var(--font-body)",
              }}
            >
              /10
            </span>
          </div>
          <p
            style={{
              fontSize: 12,
              color: "var(--driftwood)",
              margin: "4px 0 0",
            }}
          >
            {sourcesCount} expert sources
          </p>
        </div>
      </div>

      {/* Sub-score bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
        {PAW_SCORE_DIMENSIONS.map(({ key, name }) => {
          const value = breakdown[key];
          const pct = Math.round(value * 10);
          return (
            <div
              key={key}
              aria-label={`${name}: ${value} out of 10`}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                  marginBottom: 4,
                }}
              >
                <span style={{ color: "var(--walnut)", fontWeight: 500 }}>
                  {name}
                </span>
                <span
                  style={{
                    color: "var(--espresso)",
                    fontWeight: 600,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {value.toFixed(1)}/10
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  background: "var(--oat)",
                  borderRadius: 999,
                  overflow: "hidden",
                }}
                role="meter"
                aria-valuenow={value}
                aria-valuemin={0}
                aria-valuemax={10}
                aria-label={`${name} score`}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    background: barColor(value),
                    borderRadius: 999,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary — explicitly marked up for AI extraction */}
      <p
        data-geo="paw-score-summary"
        style={{
          fontSize: 14,
          color: "var(--walnut)",
          lineHeight: 1.6,
          margin: "0 0 12px",
        }}
      >
        {summary}
      </p>

      <Link
        href="/methodology#paw-score"
        style={{
          fontSize: 12,
          color: "var(--tomato)",
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        How we calculate the Paw Score →
      </Link>
    </section>
  );
}
