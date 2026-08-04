interface GuideBodyProps {
  html: string;
}

/**
 * Mounts the guide's marked-rendered body prose (guide.htmlContent) — the H2
 * sections authored directly in the guide's markdown (category context, the
 * PetPal Score narrative, buying-decision prose, specs commentary).
 * Affiliate/guide/authority links are already injected server-side in
 * src/lib/guides.ts before this HTML is produced.
 *
 * The FAQ section is stripped out of htmlContent upstream (guides.ts
 * stripFAQSection) — GuideFAQ mounts it separately from guide.faqItems, so
 * it must never appear in this blob.
 */
export default function GuideBody({ html }: GuideBodyProps) {
  if (!html) return null;

  // html is rendered from first-party markdown in src/content/guides via marked() — trusted source.
  return (
    <div
      className="prose mb-16"
      style={{ color: "var(--color-text)" }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
