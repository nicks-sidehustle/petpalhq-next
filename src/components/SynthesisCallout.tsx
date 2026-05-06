import type { ReactNode } from "react";

interface SynthesisCalloutProps {
  /**
   * Callout body. Pass JSX so the host page can vary voice
   * (third-person editorial vs. first-person on the author page).
   */
  children: ReactNode;
  /** Optional override for the eyebrow label. */
  label?: string;
  /** Optional override for the headline. */
  heading?: string;
}

/**
 * No-testing-lab callout. Reused across /about, /methodology, and
 * /author/nick-miles so the framing is a one-place edit point.
 *
 * Visual: cream-deep background, teal left border (matches BottomLine.tsx
 * accent treatment but with a filled background to read as a distinct
 * methodology block, not a pull-quote).
 */
export default function SynthesisCallout({
  children,
  label = "Editorial Approach",
  heading = "We don't run a testing lab.",
}: SynthesisCalloutProps) {
  return (
    <aside
      className="my-10 rounded-md border-l-4 px-6 py-6"
      style={{
        backgroundColor: "var(--color-cream-deep)",
        borderLeftColor: "var(--color-teal)",
      }}
    >
      <p
        className="text-xs font-semibold uppercase tracking-widest mb-2"
        style={{ color: "var(--color-teal-deep)" }}
      >
        {label}
      </p>
      <p
        className="font-serif text-xl md:text-2xl font-bold mb-3 leading-snug"
        style={{ color: "var(--color-navy)" }}
      >
        {heading}
      </p>
      <div className="text-base leading-relaxed" style={{ color: "var(--color-text)" }}>
        {children}
      </div>
    </aside>
  );
}
