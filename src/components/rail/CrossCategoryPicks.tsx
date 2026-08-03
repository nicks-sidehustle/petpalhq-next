/**
 * CrossCategoryPicks — SERVER component.
 *
 * Ported from SmartHomeExplorer/DormGearHQ's grid side-rail pilot (rail v2).
 * "Readers also shopping" module inside GuideSideRail: cross-CATEGORY guide
 * thumbnail chips (a different pool than the current page — see
 * src/lib/content/cross-category.ts). ADDITIVE to the in-article
 * RelatedGuides/SpokesList blocks, which stay same-topic and in-flow; this
 * module exists specifically to surface guides the reader wouldn't otherwise
 * see from this page.
 *
 * Renders null when no cross-category pick resolves (no empty-shell card in
 * the rail).
 */

import Link from "next/link";
import Image from "next/image";
import { Compass } from "lucide-react";
import { getCrossCategoryPicks } from "@/lib/content/cross-category";

/** First 2-3 words of a title, for the chip's compact label. Full title is
 * still exposed via `title` for a11y/hover. */
function truncateLabel(text: string): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= 3) return text.trim();
  return `${words.slice(0, 3).join(" ")}…`;
}

export function CrossCategoryPicks({
  slug,
  category,
}: {
  slug: string;
  category?: string | null;
}) {
  const picks = getCrossCategoryPicks({ slug, category });
  if (picks.length === 0) return null;

  return (
    <aside
      aria-label="Readers also shopping"
      className="w-full rounded-lg border p-3 shadow-sm"
      style={{ borderColor: "var(--color-cream-deep)", backgroundColor: "var(--color-cream)" }}
    >
      <div className="flex items-center gap-1.5 mb-2.5">
        <Compass className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--color-text-muted)" }} aria-hidden="true" />
        <p
          className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--color-text-muted)" }}
        >
          Readers Also Shopping
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {picks.map((pick) => (
          <Link
            key={pick.slug}
            href={`/guides/${pick.slug}`}
            title={pick.title}
            className="group flex flex-col items-center gap-1 rounded-md border border-transparent p-1 text-center transition-colors"
          >
            <div
              className="relative h-11 w-full overflow-hidden rounded"
              style={{ backgroundColor: "var(--color-cream-deep)" }}
            >
              <Image
                src={pick.image}
                alt=""
                fill
                sizes="92px"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <span
              className="text-[10px] font-medium leading-tight line-clamp-2"
              style={{ color: "var(--color-text)" }}
            >
              {truncateLabel(pick.title)}
            </span>
          </Link>
        ))}
      </div>
    </aside>
  );
}
