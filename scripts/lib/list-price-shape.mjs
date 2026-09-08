/**
 * `listPrice` FRONTMATTER SHAPE — one definition, used by the content validator
 * and by the dark-card render tests.
 *
 * Split out of scripts/validate-content.mjs so the rule can be asserted
 * directly: importing that file would run the whole validator and exit the
 * process, which is exactly the shape of gate a test cannot check.
 */
/*
 * SHAPE RULES — owner emergency ruling 2026-09-07, rules 2 and 4.
 *
 * A dark card prints the maker's list price, and rule 4 says every figure has a
 * source: the maker's page, fetch-verified, with a URL and a date. So the field
 * is all-or-nothing. A partial block is worse than no block — it renders a
 * figure with no provenance, or drops silently and leaves the card dark for a
 * reason no one can see. An amazon.com sourceUrl is a category error: that is a
 * Buy-Box price wearing a list-price label, and the snapshot already owns that
 * figure. Non-positive amounts are not prices.
 *
 * Mirrors isValidListPrice() in src/lib/dark-card.ts — the renderer drops an
 * invalid block, and this is what makes that drop impossible to ship unnoticed.
 */
export const LIST_PRICE_KEYS = ['amount', 'currency', 'sourceUrl', 'sourceLabel', 'verifiedAt'];

export function listPriceErrors(slug, picks) {
  const out = [];
  picks.forEach((pick, idx) => {
    if (!pick || typeof pick !== 'object' || pick.listPrice === undefined) return;
    const where = `src/content/guides/${slug}.md pick #${pick.rank ?? idx + 1} (${pick.name ?? 'unnamed'})`;
    const lp = pick.listPrice;
    if (!lp || typeof lp !== 'object' || Array.isArray(lp)) {
      out.push(`${where}: listPrice must be a mapping with ${LIST_PRICE_KEYS.join(', ')}`);
      return;
    }
    const missing = LIST_PRICE_KEYS.filter(
      (k) => lp[k] === undefined || lp[k] === null || String(lp[k]).trim() === '',
    );
    if (missing.length) {
      out.push(`${where}: listPrice is missing required key(s): ${missing.join(', ')}`);
    }
    if (lp.amount !== undefined && (typeof lp.amount !== 'number' || !(lp.amount > 0))) {
      out.push(`${where}: listPrice.amount must be a positive number (got ${JSON.stringify(lp.amount)})`);
    }
    if (typeof lp.sourceUrl === 'string' && /(^|\/\/|\.)amazon\.[a-z.]+/i.test(lp.sourceUrl)) {
      out.push(
        `${where}: listPrice.sourceUrl is an amazon.com URL — a LIST price comes from the maker, ` +
          `never from the listing whose price we are standing in for (ruling rule 4)`,
      );
    }
    if (lp.verifiedAt !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(String(lp.verifiedAt))) {
      out.push(`${where}: listPrice.verifiedAt must be YYYY-MM-DD (got ${JSON.stringify(lp.verifiedAt)})`);
    }
  });
  return out;
}
