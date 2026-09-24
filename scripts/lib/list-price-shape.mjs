/**
 * `listPrice` FRONTMATTER — RETIRED FIELD. One definition, used by the content
 * validator and by the dark-card render tests.
 *
 * Split out of scripts/validate-content.mjs so the rule can be asserted
 * directly: importing that file would run the whole validator and exit the
 * process, which is exactly the shape of gate a test cannot check.
 */
/*
 * OWNER RULING 2026-09-24 — Amazon Associates Participation Requirements §2(b)
 * permit only Amazon-served / API price figures. A maker/brand-sourced price is
 * never displayed, so the pick-level `listPrice` block (the maker list price
 * the 2026-09-07 ruling introduced for dark cards) is withdrawn. The render
 * side was removed in #188; this rule makes sure
 * the block cannot come back into the corpus at all — ANY `listPrice` key on a
 * guide pick, complete or partial, valid-looking or not, is an ERROR.
 */
export function listPriceErrors(slug, picks) {
  const out = [];
  picks.forEach((pick, idx) => {
    if (!pick || typeof pick !== 'object' || pick.listPrice === undefined) return;
    const where = `src/content/guides/${slug}.md pick #${pick.rank ?? idx + 1} (${pick.name ?? 'unnamed'})`;
    out.push(
      `${where}: listPrice is a retired field — a maker/brand-sourced price is never displayed ` +
        `(owner ruling 2026-09-24, Amazon Associates §2(b)); delete the block`,
    );
  });
  return out;
}
