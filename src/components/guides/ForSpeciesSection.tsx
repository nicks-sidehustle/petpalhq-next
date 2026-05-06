interface ForSpeciesSectionProps {
  /** Stable HTML id for deep-linking from JSON-LD WebPageElement entries. */
  anchorId: string;
  /** Display heading. */
  heading: string;
  /** Pre-rendered HTML with affiliate links already injected on pick mentions. */
  html?: string;
}

/**
 * Renders a per-species editorial section (For dogs / For cats) with stable
 * anchor IDs that match `sectionAnchors.forDogs` / `forCats` in the guide
 * frontmatter. The HTML has been through the auto-affiliate-link injector
 * at parse time, so pick mentions are already Amazon links via buildAmazonUrl.
 */
export default function ForSpeciesSection({
  anchorId,
  heading,
  html,
}: ForSpeciesSectionProps) {
  if (!html) return null;
  return (
    <section id={anchorId} className="mb-16 max-w-3xl mx-auto scroll-mt-24">
      <h2
        className="font-serif text-2xl md:text-3xl font-bold mb-6"
        style={{ color: "var(--color-navy)" }}
      >
        {heading}
      </h2>
      <div
        className="affiliate-prose prose"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  );
}
