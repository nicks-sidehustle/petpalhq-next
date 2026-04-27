/**
 * FeaturedProductCards — top-of-guide product strip.
 *
 * Renders 3 image-backed cards (Best Budget / Best Overall / Best Premium)
 * above the body copy on every guide. Modeled on SHE's FeaturedProductCards
 * pattern; adapted to PPH's tier/data shape.
 *
 * Pick resolution:
 *   1. If the guide has a `tiers` block, use budget/sweetSpot/splurge.
 *   2. Otherwise use the first 3 entries from the `products` array, looking
 *      up each by name in consensusReviews for ASIN + score.
 *   3. If a pick is missing required data (no ASIN), that card is skipped.
 *
 * Affiliate URL: built via @omc/affiliate-layer using petpalhq's tag.
 * Score: pulled from consensusReviews.petpalScore; rendered as X.X / 10.
 * Image: /images/products/{asin}.jpg — renders the img tag regardless of
 *   whether the file is locally cached; missing images produce a broken img
 *   rather than a broken layout.
 */

import Link from "next/link";
import Image from "next/image";
import { loadSiteConfig } from "@omc/config";
import { buildAmazonUrl } from "@omc/affiliate-layer";
import { consensusReviews } from "@/lib/content/consensus-data";

const AFFILIATE_TAG = loadSiteConfig("petpalhq").affiliateTag;

interface TierBlock {
  name: string;
  price: string;
  asin: string;
  subtitle?: string;
}

interface FeaturedProductCardsProps {
  /** Guide slug — used for ascsubtag attribution prefix. */
  slug: string;
  /** Structured tiers from frontmatter, if present. */
  tiers?: {
    budget: TierBlock;
    sweetSpot: TierBlock;
    splurge: TierBlock;
  };
  /** Flat product name list from frontmatter. Used when tiers absent. */
  products?: string[];
}

interface ResolvedCard {
  label: "Best Budget" | "Best Overall" | "Best Premium" | "Top Pick" | "Runner-Up";
  name: string;
  asin: string;
  price?: string;
  score?: number;
  affiliateUrl: string;
  imageSrc: string;
}

function buildCard(
  label: ResolvedCard["label"],
  name: string,
  asin: string,
  price?: string,
  score?: number
): ResolvedCard {
  const affiliateUrl = buildAmazonUrl({ asin, tag: AFFILIATE_TAG });
  return {
    label,
    name,
    asin,
    price,
    score,
    affiliateUrl,
    imageSrc: `/images/products/${asin}.jpg`,
  };
}

function resolveCards(props: FeaturedProductCardsProps): ResolvedCard[] {
  // Path 1: tiers block
  if (props.tiers?.budget && props.tiers?.sweetSpot && props.tiers?.splurge) {
    const { budget, sweetSpot, splurge } = props.tiers;

    const scoreFor = (asin: string) =>
      consensusReviews.find((r) => r.asin === asin)?.petpalScore;

    const cards: (ResolvedCard | null)[] = [
      budget.asin
        ? buildCard("Best Budget", budget.name, budget.asin, budget.price, scoreFor(budget.asin))
        : null,
      sweetSpot.asin
        ? buildCard("Best Overall", sweetSpot.name, sweetSpot.asin, sweetSpot.price, scoreFor(sweetSpot.asin))
        : null,
      splurge.asin
        ? buildCard("Best Premium", splurge.name, splurge.asin, splurge.price, scoreFor(splurge.asin))
        : null,
    ];

    return cards.filter((c): c is ResolvedCard => c !== null);
  }

  // Path 2: flat products array — lookup by name in consensusReviews
  if (props.products && props.products.length > 0) {
    const labels: ResolvedCard["label"][] = ["Top Pick", "Runner-Up", "Runner-Up"];
    const cards: (ResolvedCard | null)[] = props.products.slice(0, 3).map((name, i) => {
      const review = consensusReviews.find(
        (r) => r.productName.toLowerCase() === name.toLowerCase()
      );
      if (!review?.asin) return null;
      return buildCard(
        labels[i] ?? "Top Pick",
        review.productName,
        review.asin,
        review.priceRange,
        review.petpalScore
      );
    });
    return cards.filter((c): c is ResolvedCard => c !== null);
  }

  return [];
}

export function FeaturedProductCards(props: FeaturedProductCardsProps) {
  const cards = resolveCards(props);
  if (cards.length === 0) return null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cards.length}, 1fr)`,
        gap: 16,
        marginBottom: 40,
      }}
    >
      {cards.map((card) => (
        <Link
          key={card.asin}
          href={card.affiliateUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          style={{ textDecoration: "none" }}
        >
          <div
            style={{
              border: "1px solid var(--oat, #E8E0D5)",
              borderRadius: 12,
              overflow: "hidden",
              background: "#FFFFFF",
              transition: "box-shadow 0.15s ease",
            }}
          >
            {/* Product image */}
            <div
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "1 / 1",
                background: "var(--ivory, #F7F3EC)",
              }}
            >
              <Image
                src={card.imageSrc}
                alt={card.name}
                fill
                sizes="(max-width: 640px) 90vw, 240px"
                style={{ objectFit: "contain", padding: 12 }}
                unoptimized
              />
            </div>

            {/* Card body */}
            <div style={{ padding: "12px 14px 14px" }}>
              {/* Best-for label */}
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--tomato, #B5472E)",
                  fontFamily: "var(--font-body)",
                  marginBottom: 6,
                }}
              >
                {card.label}
              </div>

              {/* Product name */}
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--espresso, #2A2520)",
                  fontFamily: "var(--font-body)",
                  lineHeight: 1.35,
                  marginBottom: card.score !== undefined || card.price ? 8 : 0,
                }}
              >
                {card.name}
              </div>

              {/* Score + price row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                {card.score !== undefined && (
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--leaf, #5B7C4A)",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    {card.score.toFixed(1)}&thinsp;/&thinsp;10
                  </span>
                )}
                {card.price && (
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--shale, #6B6560)",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    {card.price}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default FeaturedProductCards;
