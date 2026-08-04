/**
 * RailTOC — the "on this page" module inside GuideSideRail.
 *
 * Ported from SmartHomeExplorer/DormGearHQ's grid side-rail pilot ("Rail
 * v2"). Compact numbered-dot list with 2-3-word truncated labels; the full
 * section titles still live in the existing in-flow GuideOnPageTOC
 * (hidden at xl+ once this rail module takes over — see page.tsx) so mobile
 * readers keep exactly the surface they already had.
 *
 * ADAPTATION vs SHE/dormgear: those ports reuse a scrollspy hook
 * (useActiveTOCHeading / IntersectionObserver-driven active-section
 * highlighting) that already existed in their GuideTOC.tsx. PetPalHQ's
 * GuideTOC.tsx has no such hook — it's a plain anchor list — so this stays a
 * plain anchor list too rather than fabricating scroll-tracking that doesn't
 * exist elsewhere on the site. No active-heading highlight; click-to-jump via
 * native #id anchors only.
 *
 * MUST stay wrapped in <aside aria-label="Table of contents"> — this is the
 * one visible "Table of contents" landmark at xl+ once the in-flow TOC hides.
 */

export interface RailTOCItem {
  id: string;
  label: string;
}

/** First 2-3 words of a heading, for the compact list's label. Full text is
 * still exposed via `title` so nothing is lost for a11y/hover. */
function truncateLabel(text: string): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= 3) return text.trim();
  return `${words.slice(0, 3).join(" ")}…`;
}

export function RailTOC({ items }: { items: RailTOCItem[] }) {
  if (items.length === 0) return null;

  return (
    <aside
      aria-label="Table of contents"
      className="w-full rounded-lg border px-3 py-2.5 shadow-sm"
      style={{ borderColor: "var(--color-cream-deep)", backgroundColor: "var(--color-cream)" }}
    >
      <ol className="max-h-[16vh] space-y-0.5 overflow-y-auto">
        {items.map((item, i) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              title={item.label}
              className="flex w-full items-center gap-2 rounded py-1 text-left transition-colors"
              style={{ color: "var(--color-text-muted)" }}
            >
              <span
                aria-hidden="true"
                className="flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-full text-[8px] font-bold leading-none"
                style={{ backgroundColor: "var(--color-cream-deep)", color: "var(--color-text-muted)" }}
              >
                {i + 1}
              </span>
              <span className="truncate text-xs">{truncateLabel(item.label)}</span>
            </a>
          </li>
        ))}
      </ol>
    </aside>
  );
}
