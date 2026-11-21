/**
 * seasonal-rail-eligibility.ts — ONE definition of "this pick may appear on the
 * seasonal rail card", shared by the generator
 * (scripts/generate-seasonal-rail.ts), the render-time resolver
 * (src/lib/content/rail-promo.ts) and the postbuild gate
 * (scripts/test/seasonal-rail-card.test.ts), so the three cannot disagree.
 *
 * Owner ruling 2026-11-19 (Black Friday week card): NO price figures and no
 * "deal" / "% off" / "save" / "cheapest" claims at all. CLAUDE.md §3 (no
 * availability language), §4 (no figure without a live read; dark picks carry
 * no price positioning; no refurbished) and §5 (writers never originate facts)
 * bind every card. So:
 *   - The card's ASIN is a CURRENT pick of the source guide that no gate calls
 *     dark: no live dark read / dead-asins / snapshot suppression
 *     (`suppressionReason`), no dead-asins entry of any status
 *     (`guardStatus`), no backorder note (`backorderDisclosure` renders
 *     availability language — CLAUDE.md Known gaps), not frontmatter
 *     `available: false`, not Renewed/refurbished, and not one of the
 *     replacement-pending picks listed in CLAUDE.md "Known gaps".
 *   - The card's note is the FIRST SENTENCE of that pick's own frontmatter
 *     verdict, verbatim — no new words, no new facts. A verdict whose first
 *     sentence carries markdown, a template token, a price figure, a price-
 *     positioning word or availability language is skipped (the generator
 *     tries the next pick), never edited.
 */

import type { GuidePick } from "@/lib/guides";

/**
 * CLAUDE.md "Known gaps" (2026-09-27): picks whose /dp/ page redirects to
 * another ASIN, plus the Lucky Dog kennel — all pending replacement research.
 */
export const REPLACEMENT_PENDING_ASINS: ReadonlySet<string> = new Set([
  "B0738L5GNR",
  "B09MSL1H21",
  "B0CVN7V7GG",
  "B0DJFXCBTK",
  "B0GVG9W85Y",
  "B0BMQWP1YP",
]);

/** Any price figure: a currency symbol, or digits next to a currency word. */
export const PRICE_FIGURE =
  /[$€£¥]|\b\d[\d,.]*\s*(usd|dollars?|bucks|cents?)\b|\b(usd|us\$)\b|%/i;

/**
 * Price positioning (owner 2026-11-19 word list ∪ CLAUDE.md §4 dark-card list ∪
 * cost/price/afford/money/spend). Over-matching only costs coverage.
 */
export const PRICE_POSITIONING =
  /\b(cheap|cheaper|cheapest|cheaply|budget|value|values|deal|deals|save|saves|saved|saving|savings|percent off|lowest|bargain|bargains|steal|doorbuster|doorbusters|discount|discounts|discounted|sale|sales|clearance|coupon|coupons|promo|markdown|inexpensive|affordable|affordably|afford|expensive|priciest|pricey|pricier|premium|splurge|price|prices|priced|pricing|cost|costs|costly|money|spend|spending|dollar|dollars|fraction|half the price|for the money|per dollar|free shipping|pay|pays|paying|paid|worth|invest|investment|investing|overpay|overpaying|fee|fees|subscription|subscriptions|no-subscription|monthly bill)\b/i;

/** Availability language (CLAUDE.md §3), broadened: any "availab…" word. */
export const AVAILABILITY_LANGUAGE =
  /\b(availab\w*|unavailable|in[- ]stock|out of stock|low stock|limited stock|sold out|back ?order(ed)?|restock\w*|ships?|shipping|while supplies last|discontinued)\b/i;

/** Refurbished listings are never picks or alternatives (CLAUDE.md §4). */
const REFURBISHED = /\b(renewed|refurbished|refurb|pre-?owned|used)\b/i;

/** Markdown / HTML / template residue that must never reach the card verbatim. */
const MARKUP = /[*_`[\]<>{}#|\\]/;

/** True when `text` carries no price figure, positioning or availability word. */
export function isCleanCardText(text: string): boolean {
  return !PRICE_FIGURE.test(text) && !PRICE_POSITIONING.test(text) && !AVAILABILITY_LANGUAGE.test(text);
}

/** Every reason `text` is not clean — for gate failure messages. */
export function cardTextViolations(text: string): string[] {
  const out: string[] = [];
  const f = text.match(PRICE_FIGURE);
  if (f) out.push(`price figure "${f[0]}"`);
  const p = text.match(PRICE_POSITIONING);
  if (p) out.push(`price positioning "${p[0]}"`);
  const a = text.match(AVAILABILITY_LANGUAGE);
  if (a) out.push(`availability language "${a[0]}"`);
  return out;
}

/**
 * True when `pick` may be the seasonal card's product. Pure — reads only the
 * parsed pick, whose gate fields guides.ts already resolved from
 * data/live-read-overrides.json, data/dead-asins.json and the price snapshot.
 */
export function isEligibleSeasonalPick(pick: GuidePick | undefined | null): pick is GuidePick {
  if (!pick || !pick.asin || !/^[A-Z0-9]{10}$/.test(pick.asin)) return false;
  if (pick.suppressionReason || pick.guardStatus || pick.backorderDisclosure) return false;
  if (pick.available === false) return false;
  if (REPLACEMENT_PENDING_ASINS.has(pick.asin)) return false;
  if (!pick.name || REFURBISHED.test(pick.name) || MARKUP.test(pick.name)) return false;
  if (!isCleanCardText(pick.name)) return false;
  return true;
}

/**
 * The card note: the verdict's first sentence, verbatim, or null when that
 * sentence is unusable (the caller then moves on; it never edits the text).
 */
export function seasonalNoteFromVerdict(verdict: string | undefined | null): string | null {
  const text = (verdict ?? "").trim();
  if (!text) return null;
  // First sentence = up to the first . ! or ? that is followed by whitespace
  // and a capital letter (or ends the text). "29.5in" has no space after the
  // dot, so it is not a boundary.
  const m = text.match(/^[\s\S]*?[.!?](?=\s+[A-Z"“(]|\s*$)/);
  const sentence = (m ? m[0] : "").trim();
  if (sentence.length < 60 || sentence.length > 240) return null;
  if (MARKUP.test(sentence) || sentence.includes("{{")) return null;
  if (!isCleanCardText(sentence)) return null;
  return sentence;
}
