"use client";

/**
 * RailTOC — the "on this page" module inside GuideSideRail.
 *
 * Ported from SmartHomeExplorer/DormGearHQ's grid side-rail pilot ("Rail
 * v2"). Compact numbered-dot scrollspy with 2-3-word truncated labels and the
 * current section highlighted; the full section titles still live in the
 * existing in-flow GuideOnPageTOC (hidden at xl+ once this rail module takes
 * over — see page.tsx) so mobile readers keep exactly the surface they
 * already had.
 *
 * Scrollspy (added 2026-08-10): the original port shipped WITHOUT active-
 * section tracking because it copied the siblings' markup but not their
 * useActiveTOCHeading hook — that hook lives in their GuideTOC.tsx, and
 * PetPalHQ has no GuideTOC.tsx to import it from (the in-flow
 * GuideOnPageTOC is a plain server-rendered anchor list). The
 * IntersectionObserver logic below is a faithful port of
 * smarthome-explorer-blog/dormgearhq-next src/components/GuideTOC.tsx
 * `useActiveTOCHeading` — same threshold 0, same "-80px 0px -70% 0px"
 * rootMargin, same first-visible-in-document-order winner — kept local to
 * this file because this rail is PetPalHQ's only scrollspy surface.
 *
 * Rows stay native `#id` anchors rather than the siblings' buttons: their
 * buttons exist to fire a trackTOCClick engagement event before
 * scrollIntoView, and PetPalHQ has no such analytics hook. Anchors keep
 * click-to-jump working with or without JS.
 *
 * MUST stay wrapped in <aside aria-label="Table of contents"> — this is the
 * one visible "Table of contents" landmark at xl+ once the in-flow TOC hides.
 */

import { useEffect, useState } from "react";

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

/** Active-section tracking. One observer per heading element; the active row
 * is the first currently-visible heading in document order. */
function useActiveTOCHeading(items: RailTOCItem[]): string {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const visibleIds = new Set<string>();

    items.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            visibleIds.add(id);
          } else {
            visibleIds.delete(id);
          }
          // Set active to the first visible heading in document order
          const first = items.find((h) => visibleIds.has(h.id));
          if (first) setActiveId(first.id);
        },
        { rootMargin: "-80px 0px -70% 0px", threshold: 0 }
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [items]);

  return activeId;
}

export function RailTOC({ items }: { items: RailTOCItem[] }) {
  const activeId = useActiveTOCHeading(items);

  if (items.length === 0) return null;

  return (
    <aside
      aria-label="Table of contents"
      className="w-full rounded-lg border px-3 py-2.5 shadow-sm"
      style={{ borderColor: "var(--color-cream-deep)", backgroundColor: "var(--color-cream)" }}
    >
      <ol className="max-h-[16vh] space-y-0.5 overflow-y-auto">
        {items.map((item, i) => {
          const isActive = activeId === item.id;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                title={item.label}
                aria-current={isActive ? "true" : undefined}
                className={`flex w-full items-center gap-2 rounded py-1 text-left transition-colors ${
                  isActive ? "font-semibold" : ""
                }`}
                style={{ color: isActive ? "var(--color-text)" : "var(--color-text-muted)" }}
              >
                <span
                  aria-hidden="true"
                  className="flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-full text-[8px] font-bold leading-none"
                  style={
                    isActive
                      ? { backgroundColor: "var(--color-navy)", color: "white" }
                      : { backgroundColor: "var(--color-cream-deep)", color: "var(--color-text-muted)" }
                  }
                >
                  {i + 1}
                </span>
                <span className="truncate text-xs">{truncateLabel(item.label)}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
