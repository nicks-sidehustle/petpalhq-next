/**
 * Pure (Next-free) resolver for the interaction-gated /go/ affiliate redirect.
 *
 * Extracted from src/app/go/[id]/route.ts so the click-integrity invariant is
 * unit-testable without a Next runtime: given an id (+ optional per-placement
 * subtag), it returns the FINAL amazon.com destination. The ONLY Amazon-side
 * params it ever emits are `tag` and (when present) `ascsubtag` — the CLL
 * position params (`s`, `p`) never reach this function's output, which is what
 * scripts/test/go-redirect.test.ts asserts.
 */
export function buildAmazonDest(
  id: string,
  subtag: string | undefined,
  tag: string,
): string {
  const sub = subtag ? `&ascsubtag=${encodeURIComponent(subtag)}` : "";
  if (/^[A-Z0-9]{10}$/.test(id)) {
    return `https://www.amazon.com/dp/${id}?tag=${tag}${sub}`;
  }
  return `https://www.amazon.com/s?k=${encodeURIComponent(id)}&tag=${tag}${sub}`;
}
