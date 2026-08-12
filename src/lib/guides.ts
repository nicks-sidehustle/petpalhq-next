import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked, Renderer, type Tokens } from 'marked';
import type { FAQItem } from './schema';
import { categoryAliases } from '@/config/site';
import { buildAuthorityLinkMap } from './authority-links';
import { getSiteWideProductEntries, buildGuideLinkMap } from './guide-links';
import {
  getCachedPrice,
  isUnbuyableAvailability,
  snapshotUnavailableLabel,
} from './price-cache';
import { amazonToGoHref, appendGoParams } from './affiliate-href';
import {
  getDeadAsinEntry,
  getPickGuardEntry,
  guardUnavailableLabel,
  guardDisclosureLabel,
  isHardGateStatus,
  type DeadAsinStatus,
} from './dead-asin-guard';

const AUTHORITY_LINK_MAP = buildAuthorityLinkMap();

const guidesDirectory = path.join(process.cwd(), 'src/content/guides');

/**
 * CLL /go/ position instrumentation (E-000). The global `marked` link renderer
 * (below) can't know which guide/placement it is rendering, so parseGuide sets
 * this synchronous ambient context around each marked() call for a body/prose
 * field. When set, every `/go/…` href the renderer emits is position-tagged
 * `?s={slug}&p={position}`. `marked` is fully synchronous for string input on a
 * single-threaded build, so this ambient value is never observed across an
 * interleaved render. Cleared to null between fields → untagged /go otherwise.
 */
let _goLinkContext: { slug: string; position: string } | null = null;

function withGoContext<T>(slug: string, position: string, fn: () => T): T {
  const prev = _goLinkContext;
  _goLinkContext = { slug, position };
  try {
    return fn();
  } finally {
    _goLinkContext = prev;
  }
}

/**
 * Interaction-gated affiliate rewrite for markdown-authored links (DG-2, ports
 * deskgear PR #10). Guide bodies contain hand-authored Amazon links (search +
 * /dp) carrying the affiliate tag, and injectAffiliateLinks wraps pick names in
 * `/go/{ASIN}` links (buildAmazonUrl). A crawler that follows a bare tagged
 * amazon.com href without running JS registers a phantom Associates click
 * (DG0-DIAGNOSIS H5). This global `marked` link renderer rewrites every
 * Amazon affiliate href to the internal `/go/…` redirect (Disallowed in
 * robots.txt) and marks it rel="nofollow sponsored". Non-affiliate links
 * (internal /guides, /reviews, and non-tagged amazon help pages) pass through
 * unchanged, so we never touch e.g. the customer-service links in the footer.
 */
marked.use({
  renderer: {
    link(this: Renderer, token: Tokens.Link) {
      const { href, title, tokens } = token;
      const text = this.parser.parseInline(tokens);
      const titleAttr = title ? ` title="${title.replace(/"/g, '&quot;')}"` : '';
      const go = amazonToGoHref(href);
      const finalHref = go ?? href;
      // Affiliate = a link we rewrote to /go, or one already authored as /go
      // (buildAmazonUrl output injected by injectAffiliateLinks).
      const isAffiliate = go !== null || finalHref.startsWith('/go/');
      if (isAffiliate) {
        // CLL: position-tag the /go href with the ambient guide slug + placement
        // when parseGuide has set the context (inline body prose, faq, …). The
        // s/p params are consumed server-side by /go and never reach Amazon.
        const taggedHref =
          _goLinkContext && finalHref.startsWith('/go/')
            ? appendGoParams(finalHref, _goLinkContext.slug, _goLinkContext.position)
            : finalHref;
        return `<a href="${taggedHref}"${titleAttr} target="_blank" rel="nofollow sponsored noopener noreferrer">${text}</a>`;
      }
      return `<a href="${finalHref}"${titleAttr}>${text}</a>`;
    },
  },
});

// New richly-typed frontmatter sections

export interface GuideTopPick {
  name: string;
  keyFeature: string;
  sources: string[];
  verifiedDate?: string;
}

export interface OwnerVoiceQuote {
  quote: string;       // verbatim from forum
  sourceLabel: string; // "r/dogs", "r/aquariums"
  sourceUrl: string;   // permalink
  author: string;      // "u/username" or "community member"
  date: string;        // ISO yyyy-mm-dd
}

export interface PromoOffer {
  code: string;           // "FURBO15", or "" for clip-coupons that don't need codes
  discount: string;       // "15% off", "$20 off", "Free shipping"
  source: 'amazon-clip' | 'manufacturer' | 'limited-time-deal' | 'subscribe-save';
  expiry: string;         // ISO yyyy-mm-dd
  verifiedDate: string;   // when last confirmed working
  notes?: string;         // optional
}

/**
 * Structured authority-source evidence attached to a product/pick, stored next
 * to price + ASIN. Canonical shape shared network-wide (PetPalHQ + GardenGearHQ).
 *
 * Editorial rule: short stats/figures may be stored verbatim in `stat`; do NOT
 * store long verbatim quotes (copyright) — keep a paraphrased `claim` + the URL.
 * Validation gating is WARN this sprint (a missing URL never hard-fails a ship).
 */
export type AuthoritySupports =
  | 'recommendation'
  | 'spec'
  | 'comparison'
  | 'durability'
  | 'safety'
  | 'value'
  | 'test-result'
  | 'general';

export interface AuthoritySource {
  outlet: string;            // "Wirecutter", "Cornell Lab of Ornithology", "Bob Vila"
  url?: string;              // source URL; "" allowed for manufacturer/listing-only
  stat: string;              // verbatim figure/finding ("18-hr battery"; "400+ breeds vs ~230k markers")
  claim?: string;            // paraphrased claim it supports
  supports: AuthoritySupports;
  accessed?: string;         // YYYY-MM-DD verification date
}

export interface GuidePick {
  rank: number;
  label: string;
  name: string;
  brand: string;
  score: number;
  price: string;
  image: string;
  asin?: string;
  reviewSlug?: string;
  aliases?: string[];
  keyFeatures: string[];
  body: string;
  bodyHtml: string;
  pros: string[];
  cons: string[];
  verdict: string;
  verdictHtml?: string;
  ownerVoice?: OwnerVoiceQuote[];
  promo?: PromoOffer;
  authoritySources?: AuthoritySource[];
  /**
   * Live purchasability flag. Defaults to true (omitted in frontmatter) so
   * existing guides are unaffected. Set to false in frontmatter when a
   * verified live check finds the ASIN dead ("Currently unavailable" or
   * delisted/404) — gates the buy CTA in FeaturedPicksGrid, PickDeepDive, and
   * GuideComparisonTable, and downgrades the JSON-LD Offer availability off
   * InStock (buildPickProductReviewGraph). As of the 2026-07-29 dead-ASIN
   * guard (§8m), this is also forced to false automatically — regardless of
   * frontmatter — whenever `asin` matches a DEAD or NO-OFFER entry in
   * data/dead-asins.json; see guardStatus below. USED-BUYBOX entries are
   * deliberately excluded from THAT gate — those 7 ASINs were live/purchasable
   * per the 07-29 sweep, so the dead-ASIN guard leaves `available` alone and
   * gives them a guardDisclosure caption instead (a non-blocking honest note,
   * not a gate).
   *
   * As of the 2026-08-10 price-desync triage there is a SECOND automatic gate:
   * this is also forced false whenever the live price snapshot
   * (data/amazon-prices.json) reports a non-buyable `availability` for the
   * ASIN — see isUnbuyableAvailability() in price-cache.ts, which documents
   * why IN_STOCK_SCARCE and LEADTIME are deliberately excluded.
   *
   * The two gates are independent, and the snapshot gate DOES apply to
   * used_buybox ASINs: being a truthful-but-undisclosed used Buy Box says
   * nothing about whether an offer exists today. Where the snapshot (fresher
   * than the guard's lastVerified) reports no buyable offer, the pick is gated
   * and renders the honest-state label — its guardDisclosure caption is moot
   * because the CTA it was meant to annotate is gone. As of 2026-08-10 this
   * affects 3 rows (B0055L8RRC, B006NONHNE ×2 guides).
   */
  available?: boolean;
  /**
   * Set automatically (never from frontmatter) when `asin` matches ANY entry
   * in data/dead-asins.json, including used_buybox — so callers can detect
   * "this pick is guard-matched" regardless of which treatment applies.
   * Undefined for ungated picks and for guides where `available: false` was
   * set by hand (e.g. #61's treadmill remediation).
   */
  guardStatus?: DeadAsinStatus;
  /**
   * Honest-state CTA-replacement label. Set when guardStatus is "dead" or
   * "no_offer", OR when the price snapshot gate fires (available is forced
   * false either way) — components swap the buy CTA for this text. Never set
   * for "used_buybox" (that pick stays buyable). dead-asins.json wins when
   * both gates fire: only it may claim "delisted".
   */
  guardLabel?: string;
  /**
   * Non-blocking disclosure line. Only set when guardStatus is
   * "used_buybox" — the pick remains live/buyable (CTA, InStock, citations
   * all preserved), but components render this caption alongside the CTA so
   * the condition mismatch (new-titled pick, used Buy Box winner) is
   * disclosed rather than gated — the §8l mirror-defect treatment.
   */
  guardDisclosure?: string;
  /**
   * Diagnostic only: set when the PRICE SNAPSHOT gate specifically fired.
   * Reporting and the regression tests use it to tell the two gates apart.
   * The flag parseGuide splits the roster on is `suppressed`.
   */
  snapshotSuppressed?: boolean;
  /**
   * Set automatically (never from frontmatter) when ANY automatic unbuyable
   * gate fires — the price snapshot gate, or the dead-asins.json hard gate
   * (dead / no_offer / no_listing). parseGuide() moves these picks out of
   * `Guide.picks` and into `Guide.suppressedPicks`, so they render nowhere —
   * no card, no comparison column, no deep dive, no topPicks entry, no
   * JSON-LD node, no CTA, no badge (owner rulings 2026-08-10 and 2026-08-12).
   *
   * Suppression is render-time and data-driven ONLY. Frontmatter is never
   * edited, so the pick reappears by itself once a sync reports a buyable
   * offer again, or once its guard entry is removed.
   *
   * Hand-set `available: false` is deliberately NOT suppression: that is a
   * per-guide editorial call about a product that may still be purchasable,
   * not an automatic liveness fact, and it keeps the #61 honest-state label.
   */
  suppressed?: boolean;
  /** Which gate suppressed this pick. Diagnostics/reporting only. */
  suppressionReason?: 'snapshot' | 'dead-asins' | 'no-listing';
}

export interface GuideComparisonRow {
  label: string;
  values: string[];
}

export interface GuideComparison {
  rows: GuideComparisonRow[];
}

export interface GuideMethodologyFactor {
  name: string;
  weight: number;
  definition: string;
}

export interface GuideMethodology {
  formula?: string;
  factors?: GuideMethodologyFactor[];
}

export interface GuideEcosystemTable {
  columns: string[];
  rows: { product: string; values: string[] }[];
}

export interface GuideEcosystemSection {
  narrative: string;
  narrativeHtml: string;
  table?: GuideEcosystemTable;
}

export interface GuideSources {
  expert?: string[];
  community?: string[];
  verifiedDate?: string;
  authorBio?: string;
}

export interface Guide {
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  category: string;
  pillar: string;
  publishDate: string;
  updatedDate: string;
  readTime: string;
  featured: boolean;
  image: string;
  content: string;
  htmlContent: string;
  faqItems: FAQItem[];
  headings: GuideHeading[];
  products: string[];
  keywords?: string[];
  reviewMethod?: string;
  lastProductCheck?: string;
  expertSourceCount?: number;

  heroImage?: string;
  shortAnswer?: string;
  topPicks?: GuideTopPick[];
  /**
   * Number of picks that actually RENDER, derived after suppression. Prose
   * interpolates this via the `{{pickCount}}` / `{{pickCountWord}}` /
   * `{{PickCountWord}}` tokens instead of hard-coding a number that rots in
   * both directions (stale-high when a pick is suppressed, stale-low when it
   * restocks). Fixes BARE counts only — claims ABOUT THE SET, and prose that
   * enumerates or names products, still need editorial rewrites.
   */
  pickCount: number;
  /**
   * Of the picks that render, how many are buyable today (i.e. not dead-asins
   * hard-gated). Interpolated via `{{buyablePickCount}}` /
   * `{{buyablePickCountWord}}` so dated availability notes never carry a
   * hand-maintained number.
   */
  buyablePickCount: number;
  picks?: GuidePick[];
  /**
   * Picks the price snapshot says have no buyable offer today, removed from
   * `picks` so they render nowhere (owner ruling 2026-08-10). Retained here so
   * build-time reporting can see what vanished and — critically — so the
   * price-refresh cron keeps re-checking their ASINs. If the cron only walked
   * `picks`, a suppressed ASIN would never be re-priced and suppression would
   * become permanent instead of self-healing.
   */
  suppressedPicks?: GuidePick[];
  comparison?: GuideComparison;
  methodology?: GuideMethodology;
  ecosystemSection?: GuideEcosystemSection;
  whenNotToBuy?: string;
  whenNotToBuyHtml?: string;
  bottomLine?: string[];
  bottomLineHtml?: string[];
  sources?: GuideSources;
  related?: string[];

  // Hub-and-spoke architecture
  hub?: string;
  guideType?: 'hub' | 'spoke';
  spokes?: string[];

  // Species sub-axis for Cats & Dogs guides only.
  // Aquarium / Reptile / Bird guides leave this undefined.
  species?: ('dog' | 'cat')[];
  speciesPrimary?: 'dog' | 'cat';
  sectionAnchors?: { forDogs?: string; forCats?: string };

  // Per-species editorial guidance for dual-species spokes. Markdown source
  // lives in frontmatter so the page template can render it (body markdown is
  // not rendered). Auto-affiliate-link injector runs over both fields at
  // parse time so pick mentions become Amazon links.
  forDogs?: string;
  forDogsHtml?: string;
  forCats?: string;
  forCatsHtml?: string;
}

export type GuideSummary = Omit<
  Guide,
  | 'content'
  | 'htmlContent'
  | 'faqItems'
  | 'headings'
  | 'topPicks'
  | 'picks'
  | 'pickCount'
  | 'buyablePickCount'
  | 'suppressedPicks'
  | 'comparison'
  | 'methodology'
  | 'ecosystemSection'
  | 'whenNotToBuy'
  | 'whenNotToBuyHtml'
  | 'bottomLine'
  | 'sources'
  | 'related'
>;

export interface GuideHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

/**
 * Strips markdown inline formatting from FAQ answer text so it renders as
 * plain text both in GuideFAQ's <dd> and in the FAQPage JSON-LD
 * acceptedAnswer.text (extractFAQFromMarkdown is the only producer of
 * FAQItem for both consumers — fix here, not in the renderers).
 * Order matters: links first (so a link label wrapped in bold/italic isn't
 * mangled by the emphasis passes), then bold/italic/code markers.
 */
function stripFAQMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [label](url) -> label
    .replace(/\*\*([^*]+)\*\*/g, '$1') // **bold** -> bold
    .replace(/__([^_]+)__/g, '$1') // __bold__ -> bold
    .replace(/`([^`]+)`/g, '$1') // `code` -> code
    .replace(/\*([^*]+)\*/g, '$1') // *italic* -> italic
    .replace(/_([^_]+)_/g, '$1'); // _italic_ -> italic
}

export function extractFAQFromMarkdown(markdown: string): FAQItem[] {
  const faqHeadingMatch = markdown.match(
    /##\s+Frequently Asked Questions\s*\n([\s\S]*?)(?:\n##\s|\s*$)/i
  );
  if (!faqHeadingMatch) return [];

  const faqSection = faqHeadingMatch[1];
  const items: FAQItem[] = [];

  // Matches two FAQ authoring formats:
  //   1. Newer pipeline:  **Q: question?**\nA: answer
  //   2. Legacy guides:   **Question?**\n\nanswer   (bold question, blank line, no A: prefix)
  // Q:/A: prefixes are optional; the answer terminates at a blank line, the next
  // bold question (\n**), or end of section. The \n** terminator means an answer
  // that begins a line with bold text (without a preceding blank line) would stop
  // early — verified to not occur in any current guide.
  const pairRegex = /\*\*(?:Q:\s*)?([\s\S]+?)\*\*\s*\n+(?:A:\s*)?([\s\S]+?)(?=\n\n|\n\*\*|$)/g;
  let match: RegExpExecArray | null;
  while ((match = pairRegex.exec(faqSection)) !== null) {
    items.push({
      question: match[1].trim(),
      answer: stripFAQMarkdown(match[2].trim()),
    });
  }

  return items;
}

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[`*_~[\]()]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function extractHeadingsFromMarkdown(markdown: string): GuideHeading[] {
  return [...markdown.matchAll(/^(#{2,3})\s+(.+)$/gm)].map((match) => ({
    level: match[1].length as 2 | 3,
    text: match[2].trim(),
    id: slugifyHeading(match[2].trim()),
  }));
}

function resolvePillar(explicitPillar: string | undefined, category: string): string {
  if (explicitPillar) return explicitPillar;
  const key = category.toLowerCase() as keyof typeof categoryAliases;
  return (categoryAliases as Record<string, string>)[key] || 'uncategorized';
}

function parseDate(dateStr: string): Date {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

function frontmatterString(value: unknown, fallback = ''): string {
  if (value instanceof Date) return value.toISOString().split('T')[0];
  if (value === undefined || value === null) return fallback;
  return String(value);
}

/**
 * Placeholder-price guard (card-blanks fix, 2026-08). Some `picks:`
 * frontmatter entries were authored with a human-readable placeholder
 * string in `price` (e.g. "Check price") instead of a real formatted price
 * OR an empty string. Because the placeholder is truthy, it slipped past
 * FeaturedPicksGrid's `{pick.price && (...)}` guard and rendered literally
 * as the visible price. This is the single enforcement point — parsePicks
 * routes every pick's price through it, so any future reintroduction of a
 * known placeholder string renders as an absent price (mirrors a
 * genuinely blank `price` field) instead of shipping the placeholder text.
 * Case-insensitive, trims surrounding whitespace.
 */
const PLACEHOLDER_PRICES = new Set(['check price', 'check amazon', 'verify at retailer']);

export function isPlaceholderPrice(price: string | undefined | null): boolean {
  if (!price) return false;
  return PLACEHOLDER_PRICES.has(price.trim().toLowerCase());
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => frontmatterString(v)).filter(Boolean);
}

/**
 * Returns true if a promo offer exists and has not yet expired.
 *
 * Expiry is tested at 23:59:59 UTC on the expiry day so the deal is
 * still shown on the day it expires (generous, predictable, timezone-safe).
 * Off-by-one on the expiry day is a trust-line bug — better to over-show
 * by a few hours than to hide a valid deal from users in different timezones.
 */
export function isPromoActive(promo: PromoOffer | undefined): promo is PromoOffer {
  if (!promo) return false;
  // Append end-of-day UTC to treat the expiry date as inclusive
  const expiryEod = new Date(`${promo.expiry}T23:59:59Z`);
  return expiryEod >= new Date();
}

function parseOwnerVoice(value: unknown): OwnerVoiceQuote[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: OwnerVoiceQuote[] = value
    .map((entry: Record<string, unknown>) => ({
      quote: frontmatterString(entry?.quote),
      sourceLabel: frontmatterString(entry?.sourceLabel),
      sourceUrl: frontmatterString(entry?.sourceUrl),
      author: frontmatterString(entry?.author),
      date: frontmatterString(entry?.date),
    }))
    // Require all 5 fields — skip malformed entries silently
    .filter((q) => q.quote && q.sourceLabel && q.sourceUrl && q.author && q.date);
  return out.length ? out : undefined;
}

const VALID_PROMO_SOURCES = new Set<PromoOffer['source']>([
  'amazon-clip',
  'manufacturer',
  'limited-time-deal',
  'subscribe-save',
]);

function parsePromo(value: unknown): PromoOffer | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const v = value as Record<string, unknown>;
  const code = frontmatterString(v.code);
  const discount = frontmatterString(v.discount);
  const source = frontmatterString(v.source) as PromoOffer['source'];
  const expiry = frontmatterString(v.expiry);
  const verifiedDate = frontmatterString(v.verifiedDate);
  // Require core fields; skip malformed entries silently
  if (!discount || !VALID_PROMO_SOURCES.has(source) || !expiry || !verifiedDate) return undefined;
  return {
    code,
    discount,
    source,
    expiry,
    verifiedDate,
    notes: frontmatterString(v.notes) || undefined,
  };
}

const VALID_AUTHORITY_SUPPORTS = new Set<AuthoritySupports>([
  'recommendation',
  'spec',
  'comparison',
  'durability',
  'safety',
  'value',
  'test-result',
  'general',
]);

function parseAuthoritySources(value: unknown): AuthoritySource[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: AuthoritySource[] = value
    .map((entry: Record<string, unknown>) => {
      const rawSupports = frontmatterString(entry?.supports) as AuthoritySupports;
      const supports: AuthoritySupports = VALID_AUTHORITY_SUPPORTS.has(rawSupports)
        ? rawSupports
        : 'general';
      const url = frontmatterString(entry?.url);
      const claim = frontmatterString(entry?.claim);
      const accessed = frontmatterString(entry?.accessed);
      return {
        outlet: frontmatterString(entry?.outlet),
        // url/claim/accessed are optional — omit empty strings except url where
        // "" is a meaningful "no URL available" marker for manufacturer/listing-only.
        ...(url ? { url } : {}),
        stat: frontmatterString(entry?.stat),
        ...(claim ? { claim } : {}),
        supports,
        ...(accessed ? { accessed } : {}),
      };
    })
    // Require outlet + stat — skip malformed entries silently.
    .filter((s) => s.outlet && s.stat);
  return out.length ? out : undefined;
}

function parseTopPicks(value: unknown): GuideTopPick[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: GuideTopPick[] = value
    .map((entry: Record<string, unknown>) => ({
      name: frontmatterString(entry?.name),
      keyFeature: frontmatterString(entry?.keyFeature),
      sources: asStringArray(entry?.sources),
      verifiedDate: frontmatterString(entry?.verifiedDate) || undefined,
    }))
    .filter((p) => p.name);
  return out.length ? out : undefined;
}

function parsePicks(value: unknown, slug: string): GuidePick[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: GuidePick[] = value
    .map((entry: Record<string, unknown>) => {
      const rank = typeof entry?.rank === 'number' ? entry.rank : 0;
      const body = frontmatterString(entry?.body);
      const asin = frontmatterString(entry?.asin) || undefined;
      const frontmatterPrice = frontmatterString(entry?.price);
      // Override price with live cache value when available; fall back to frontmatter.
      const cachedPrice = getCachedPrice(asin);
      const rawPrice = cachedPrice?.price || frontmatterPrice;
      // Placeholder strings (e.g. "Check price") are truthy but not a real
      // price — treat them as absent so they don't render literally.
      const price = isPlaceholderPrice(rawPrice) ? '' : rawPrice;
      // §8m dead-ASIN guard: any DEAD/NO-OFFER ASIN in data/dead-asins.json
      // is forced unavailable here, regardless of what frontmatter says. This
      // is the single central enforcement point — every guide's picks flow
      // through parsePicks, so no per-guide frontmatter edit is needed for
      // the 2026-07-29 sweep's guarded ASINs to render honestly everywhere.
      // USED-BUYBOX is NOT a gate: those 7 ASINs are live/purchasable per the
      // sweep (the API's condition field is truthful, the guide copy just
      // doesn't disclose it) — forcing available:false there would fabricate
      // an OutOfStock/CTA-removed claim on a real conversion path. They get a
      // non-blocking guardDisclosure caption instead; available passes
      // through frontmatter untouched, same as an ungated pick.
      //
      // Lookup is by ASIN first and by PICK REFERENCE second. The pick
      // reference exists because a pick whose `asin` holds a search phrase (or
      // nothing at all) has no key either §8m gate can read — those picks were
      // structurally invisible to both gates and kept rendering while their own
      // copy announced they could not be bought. See DeadAsinStatus.no_listing.
      const guardEntry = getPickGuardEntry(asin, slug, rank);
      const isHardGate = !!guardEntry && isHardGateStatus(guardEntry.status);
      // §8m snapshot availability gate (2026-08-10 price-desync triage): the
      // dead-asins.json guard above only knows hand-recorded statuses, so an
      // ASIN whose LIVE price snapshot says it has no buyable offer today
      // (AVAILABLE_DATE / OUT_OF_STOCK / UNAVAILABLE) slipped through and kept
      // a live Buy CTA. Second, independent gate on the same honest-state
      // path. See isUnbuyableAvailability() for why IN_STOCK_SCARCE and
      // LEADTIME are deliberately NOT gated.
      const isSnapshotGate = !!cachedPrice && isUnbuyableAvailability(cachedPrice.availability);
      const frontmatterAvailable =
        typeof entry?.available === 'boolean' ? entry.available : true;
      return {
        rank,
        label: frontmatterString(entry?.label),
        name: frontmatterString(entry?.name),
        brand: frontmatterString(entry?.brand),
        score: typeof entry?.score === 'number' ? entry.score : 0,
        price,
        image: frontmatterString(entry?.image),
        asin,
        reviewSlug: frontmatterString(entry?.reviewSlug) || undefined,
        aliases: asStringArray(entry?.aliases),
        keyFeatures: asStringArray(entry?.keyFeatures),
        body,
        bodyHtml: body ? (marked(body) as string) : '',
        pros: asStringArray(entry?.pros),
        cons: asStringArray(entry?.cons),
        verdict: frontmatterString(entry?.verdict),
        ownerVoice: parseOwnerVoice(entry?.ownerVoice),
        promo: parsePromo(entry?.promo),
        authoritySources: parseAuthoritySources(entry?.authoritySources),
        available: isHardGate || isSnapshotGate ? false : frontmatterAvailable,
        // Owner ruling 2026-08-10: a pick with no buyable offer today is not
        // presented as a pick at all — an honest "unavailable" label where a
        // top pick should be is worth nothing to a buyer. parseGuide() splits
        // these out of the rendered roster. Purely render-time and
        // data-driven: nothing is deleted from frontmatter, so the pick
        // returns automatically on the next sync that shows Amazon restocked
        // it (or on the next guard edit that clears its entry).
        //
        // `snapshotSuppressed` records WHICH gate fired and is kept for
        // diagnostics/reporting only. `suppressed` is the flag parseGuide
        // splits on.
        snapshotSuppressed: isSnapshotGate || undefined,
        // Owner ruling 2026-08-12 — the hard gate suppresses too.
        //
        // Until this ruling the dead-asins.json hard gate stopped at
        // `available: false`, which rendered the pick's card with the CTA
        // swapped for "Currently unavailable on Amazon". That is precisely the
        // labelling the 08-10 suppression law forbids, and it was worse than
        // the snapshot case: 68 picks corpus-wide, including BEST OVERALL and
        // BEST VALUE slots and one badge reading "CURRENTLY UNAVAILABLE".
        // Routing both gates through one flag means membership of
        // data/dead-asins.json now removes a pick from every surface at once,
        // the same way the snapshot gate does — and drops it out again the
        // moment its entry is cleared.
        suppressed: isSnapshotGate || isHardGate || undefined,
        suppressionReason: isHardGate
          ? guardEntry?.status === 'no_listing'
            ? ('no-listing' as const)
            : ('dead-asins' as const)
          : isSnapshotGate
            ? ('snapshot' as const)
            : undefined,
        guardStatus: guardEntry?.status,
        // dead-asins.json wins the label when both gates fire — it carries the
        // stronger, live-checked claim (including "delisted"). The snapshot
        // gate only ever claims "not buyable today", never delisted.
        guardLabel:
          guardEntry && isHardGate
            ? guardUnavailableLabel(guardEntry)
            : isSnapshotGate && cachedPrice
              ? snapshotUnavailableLabel(cachedPrice)
              : undefined,
        guardDisclosure:
          guardEntry && guardEntry.status === 'used_buybox'
            ? guardDisclosureLabel(guardEntry)
            : undefined,
      };
    })
    .filter((p) => p.name);
  return out.length ? out : undefined;
}

function parseComparison(value: unknown): GuideComparison | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const v = value as { rows?: unknown };
  if (!Array.isArray(v.rows)) return undefined;
  const rows: GuideComparisonRow[] = v.rows
    .map((row: Record<string, unknown>) => ({
      label: frontmatterString(row?.label),
      values: asStringArray(row?.values),
    }))
    .filter((r) => r.label);
  return rows.length ? { rows } : undefined;
}

function parseMethodology(value: unknown): GuideMethodology | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const v = value as { formula?: unknown; factors?: unknown };
  const factors: GuideMethodologyFactor[] | undefined = Array.isArray(v.factors)
    ? v.factors
        .map((f: Record<string, unknown>) => ({
          name: frontmatterString(f?.name),
          weight: typeof f?.weight === 'number' ? f.weight : 0,
          definition: frontmatterString(f?.definition),
        }))
        .filter((f) => f.name)
    : undefined;
  return {
    formula: frontmatterString(v.formula) || undefined,
    factors: factors && factors.length ? factors : undefined,
  };
}

function parseEcosystem(value: unknown): GuideEcosystemSection | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const v = value as { narrative?: unknown; table?: unknown };
  const narrative = frontmatterString(v.narrative);
  if (!narrative) return undefined;
  let table: GuideEcosystemTable | undefined;
  if (v.table && typeof v.table === 'object') {
    const t = v.table as { columns?: unknown; rows?: unknown };
    const columns = asStringArray(t.columns);
    const rows = Array.isArray(t.rows)
      ? t.rows
          .map((r: Record<string, unknown>) => ({
            product: frontmatterString(r?.product),
            values: asStringArray(r?.values),
          }))
          .filter((r) => r.product)
      : [];
    if (columns.length && rows.length) table = { columns, rows };
  }
  return {
    narrative,
    narrativeHtml: marked(narrative) as string,
    table,
  };
}

function parseSources(value: unknown): GuideSources | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const v = value as Record<string, unknown>;
  const out: GuideSources = {
    expert: asStringArray(v.expert),
    community: asStringArray(v.community),
    verifiedDate: frontmatterString(v.verifiedDate) || undefined,
    authorBio: frontmatterString(v.authorBio) || undefined,
  };
  if (
    !out.expert?.length &&
    !out.community?.length &&
    !out.verifiedDate &&
    !out.authorBio
  ) {
    return undefined;
  }
  return out;
}

function buildPickLinkMap(picks: GuidePick[] | undefined): Map<string, string> {
  const map = new Map<string, string>();
  if (!picks) return map;
  for (const p of picks) {
    if (!p.asin) continue;
    // Dead picks (available === false) must never get an auto-linked
    // mention anywhere in prose — skip them so their name/aliases fall
    // through to plain unlinked text via injectAffiliateLinks.
    if (p.available === false) continue;
    const url = buildAmazonUrl(p.asin);
    if (p.name) map.set(p.name, url);
    if (p.aliases) {
      for (const alias of p.aliases) {
        if (alias && !map.has(alias)) map.set(alias, url);
      }
    }
  }
  return map;
}

/**
 * Wraps each occurrence of a pick name in markdown link syntax pointing to its
 * Amazon affiliate URL. Sorts by length desc so longer names match before substrings.
 * Case-insensitive match, original case preserved in output.
 */
function injectAffiliateLinks(text: string, links: Map<string, string>): string {
  if (!text || links.size === 0) return text;
  const entries = [...links.entries()].sort((a, b) => b[0].length - a[0].length);
  const escapedNames = entries.map(([name]) =>
    name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  );
  const pattern = new RegExp(`\\b(?:${escapedNames.join('|')})\\b`, 'gi');
  return text.replace(pattern, (match) => {
    const entry = entries.find(([n]) => n.toLowerCase() === match.toLowerCase());
    return entry ? `[${match}](${entry[1]})` : match;
  });
}

/**
 * Wraps the FIRST occurrence of each authority-source name in markdown link
 * syntax pointing to the source's canonical URL. First-occurrence-only avoids
 * link spam — the AEO audit found 1,974 unlinked source mentions across the
 * site, so even one link per body field per source is a step-change improvement.
 *
 * Skips text already inside a markdown link `[...](...)` to avoid nested
 * links by using a negative lookbehind/lookahead on the bracket characters.
 */
function injectAuthorityLinks(text: string, authorityMap: Map<string, string>): string {
  if (!text || authorityMap.size === 0) return text;
  const entries = [...authorityMap.entries()].sort((a, b) => b[0].length - a[0].length);
  let result = text;

  for (const [name, url] of entries) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match the first standalone occurrence (not preceded by '[' or followed by ']')
    const pattern = new RegExp(`(?<!\\[)\\b(${escaped})\\b(?!\\])`, 'i');
    const m = result.match(pattern);
    if (m && m.index !== undefined) {
      // Avoid wrapping if we're already inside an existing markdown link text
      const before = result.slice(0, m.index);
      const lastOpenBracket = before.lastIndexOf('[');
      const lastCloseBracket = before.lastIndexOf(']');
      const lastCloseParen = before.lastIndexOf(')');
      if (lastOpenBracket > lastCloseBracket && lastOpenBracket > lastCloseParen) continue;
      result =
        result.slice(0, m.index) +
        `[${m[0]}](${url})` +
        result.slice(m.index + m[0].length);
    }
  }
  return result;
}

/**
 * Wraps the FIRST occurrence of each guide title in markdown link syntax pointing
 * to the guide's internal URL. Mirrors injectAuthorityLinks exactly — same
 * first-occurrence-only + bracket-aware skip logic.
 */
function injectGuideLinks(text: string, guideMap: Map<string, string>): string {
  if (!text || guideMap.size === 0) return text;
  const entries = [...guideMap.entries()].sort((a, b) => b[0].length - a[0].length);
  let result = text;

  for (const [title, url] of entries) {
    const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match the first standalone occurrence (not preceded by '[' or followed by ']')
    const pattern = new RegExp(`(?<!\\[)\\b(${escaped})\\b(?!\\])`, 'i');
    const m = result.match(pattern);
    if (m && m.index !== undefined) {
      // Avoid wrapping if we're already inside an existing markdown link text
      const before = result.slice(0, m.index);
      const lastOpenBracket = before.lastIndexOf('[');
      const lastCloseBracket = before.lastIndexOf(']');
      const lastCloseParen = before.lastIndexOf(')');
      if (lastOpenBracket > lastCloseBracket && lastOpenBracket > lastCloseParen) continue;
      result =
        result.slice(0, m.index) +
        `[${m[0]}](${url})` +
        result.slice(m.index + m[0].length);
    }
  }
  return result;
}

/** A text segment with an eligibility flag for injection. */
interface BodySegment {
  text: string;
  eligible: boolean;
}

/**
 * Splits body markdown into eligible/ineligible segments for link injection.
 *
 * Exclusion rules (applied to body markdown only — not frontmatter prose fields):
 * 1. Everything from `## Frequently Asked Questions` onward is ineligible (FAQ section).
 * 2. The intro paragraph (first paragraph before the first H2) is ineligible (H1 capsule).
 * 3. For each H2 section: the H2 header line + the first paragraph after it is ineligible (capsule).
 *
 * The segments concatenated in order exactly reconstruct the original string.
 */
function splitBodyForInjection(markdown: string): BodySegment[] {
  if (!markdown) return [{ text: '', eligible: false }];

  const segments: BodySegment[] = [];

  // 1. Split off FAQ section (everything from ## Frequently Asked Questions onward)
  const faqMatch = markdown.match(/^(##\s+Frequently Asked Questions\s*(?:\r?\n|$)[\s\S]*)$/im);
  let preFaq: string;
  let faqTail: string;
  if (faqMatch && faqMatch.index !== undefined) {
    preFaq = markdown.slice(0, faqMatch.index);
    faqTail = markdown.slice(faqMatch.index);
  } else {
    preFaq = markdown;
    faqTail = '';
  }

  // 2. Split preFaq by H2 boundaries (## headings, not ###)
  // Each match captures: the delimiter (## heading line + newline) + everything until next ## or end
  const h2Pattern = /^(?=##\s)/m;
  const h2Parts = preFaq.split(h2Pattern);

  // First part is the intro (before any H2)
  const intro = h2Parts[0];
  const h2Sections = h2Parts.slice(1);

  // 3. Process intro: first paragraph is ineligible capsule; rest is eligible
  if (intro) {
    // Split on first blank line (paragraph separator)
    const blankLineIdx = intro.search(/\n\s*\n/);
    if (blankLineIdx !== -1) {
      // First paragraph (capsule) + the blank line(s) separator — both ineligible
      const capsuleEnd = intro.indexOf('\n', blankLineIdx) + 1;
      const introCapsule = intro.slice(0, capsuleEnd);
      const introRest = intro.slice(capsuleEnd);
      segments.push({ text: introCapsule, eligible: false });
      if (introRest) segments.push({ text: introRest, eligible: true });
    } else {
      // Entire intro is one paragraph — all ineligible (capsule)
      segments.push({ text: intro, eligible: false });
    }
  }

  // 4. Process each H2 section: H2 header + first paragraph = ineligible capsule; rest eligible
  for (const section of h2Sections) {
    // section starts with "## ..."
    // Find end of H2 header line
    const headerEnd = section.indexOf('\n') + 1;
    const headerLine = section.slice(0, headerEnd);
    const afterHeader = section.slice(headerEnd);

    // Find end of first paragraph after the header
    const blankLineIdx = afterHeader.search(/\n\s*\n/);
    if (blankLineIdx !== -1) {
      // Capsule = header + first paragraph
      const capsuleEnd = afterHeader.indexOf('\n', blankLineIdx) + 1;
      const capsuleBody = afterHeader.slice(0, capsuleEnd);
      const sectionRest = afterHeader.slice(capsuleEnd);
      segments.push({ text: headerLine + capsuleBody, eligible: false });
      if (sectionRest) segments.push({ text: sectionRest, eligible: true });
    } else {
      // Entire section is one paragraph after header — all ineligible
      segments.push({ text: headerLine + afterHeader, eligible: false });
    }
  }

  // 5. FAQ tail is entirely ineligible
  if (faqTail) segments.push({ text: faqTail, eligible: false });

  return segments;
}

/**
 * Removes the `## Frequently Asked Questions` section (and everything after
 * it) from body markdown, using the same boundary as splitBodyForInjection's
 * FAQ split. Used to keep the rendered body prose (GuideBody) from duplicating
 * the FAQ section that GuideFAQ mounts separately from faqItems.
 */
function stripFAQSection(markdown: string): string {
  return markdown
    .replace(/^##\s+Frequently Asked Questions\s*(?:\r?\n|$)[\s\S]*$/im, '')
    .trimEnd();
}

/**
 * Applies one or more injectors to only the eligible segments of body markdown.
 * The ineligible segments (capsules + FAQ) are passed through unchanged.
 * Reassembles segments in original order — output is identical to input length when
 * no injectors match.
 */
function injectIntoBody(
  markdown: string,
  ...injectors: Array<(text: string) => string>
): string {
  if (!markdown) return markdown;
  const segments = splitBodyForInjection(markdown);
  return segments
    .map((seg) => {
      if (!seg.eligible) return seg.text;
      let text = seg.text;
      for (const injector of injectors) {
        text = injector(text);
      }
      return text;
    })
    .join('');
}

function parseGuide(slug: string, fileContents: string): Guide {
  const { data, content } = matter(fileContents);
  const category = frontmatterString(data.category, 'Uncategorized');
  const whenNotToBuy = frontmatterString(data.whenNotToBuy) || undefined;

  // Build affiliate link maps. Per-guide picks take precedence on key collision
  // (their ASINs are identical anyway); site-wide map adds cross-guide product coverage.
  const rawPicks = parsePicks(data.picks, slug);

  // DERIVED pick count (W4 third pass, 2026-08-10). A count written by hand into
  // prose is a copy of something the build already knows, and this branch proved
  // it rots in BOTH directions at once: suppression left 9 pages claiming more
  // picks than they render, and every page whose number we corrected by hand
  // goes stale the other way the moment Amazon restocks the pick and it returns.
  //
  // Prose interpolates a token instead, resolved here AFTER suppression, so the
  // number is right on every build forever and the "is this page safe to
  // hand-edit?" judgment disappears.
  //
  // Deliberately limited, do not oversell: this fixes BARE counts only. A claim
  // ABOUT THE SET ("all four picks are $50 or higher") can be false at any
  // number, and prose that ENUMERATES or NAMES products stays broken when one
  // is removed. Those need editorial rewrites — never paper over them with a
  // token.
  const pickCount = (rawPicks ?? []).filter((p) => !p.suppressed).length;
  // Of the picks that RENDER, how many are actually buyable today. Differs from
  // pickCount on guides carrying dead-asins hard-gated picks: those stay on the
  // roster with an honest-state label instead of a CTA, so "N picks" and "N you
  // can buy" are genuinely different numbers. Dated availability notes need the
  // second one — writing it by hand would recreate exactly the stale-count
  // defect this branch exists to close.
  const buyablePickCount = (rawPicks ?? []).filter(
    (p) => !p.suppressed && p.available !== false,
  ).length;
  const NUMBER_WORDS = [
    'zero', 'one', 'two', 'three', 'four', 'five', 'six',
    'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  ];
  const word = (n: number) => NUMBER_WORDS[n] ?? String(n);
  const countWord = word(pickCount);
  const buyableWord = word(buyablePickCount);
  const withCount = (text: string): string =>
    text
      .replace(/\{\{PickCountWord\}\}/g, countWord.charAt(0).toUpperCase() + countWord.slice(1))
      .replace(/\{\{pickCountWord\}\}/g, countWord)
      .replace(/\{\{pickCount\}\}/g, String(pickCount))
      .replace(
        /\{\{BuyablePickCountWord\}\}/g,
        buyableWord.charAt(0).toUpperCase() + buyableWord.slice(1),
      )
      .replace(/\{\{buyablePickCountWord\}\}/g, buyableWord)
      .replace(/\{\{buyablePickCount\}\}/g, String(buyablePickCount));

  const contentWithCount = withCount(content);
  const whenNotToBuyResolved = whenNotToBuy ? withCount(whenNotToBuy) : undefined;

  const linkMap = buildPickLinkMap(rawPicks);

  // ALIAS SCOPING (2026-08-12). The site-wide product map keys every pick by
  // BOTH its full product name and its per-guide `aliases:` shorthand. Full
  // names ("Whisker Litter-Robot 4") mean the same product in any guide, so
  // they stay site-wide — that is the intended cross-guide product-linking
  // feature. Aliases do not: "the VEVOR", "the Tractive", "the Bergan" are
  // shorthand that only resolves inside the guide that authored them, and the
  // injector's corpus-wide regex was matching them in EVERY guide's prose.
  //
  // Proven defect: best-dog-bike-trailers-2026 declares alias "the VEVOR" on a
  // bike trailer; best-dog-bathing-tubs-wash-stations-2026 talks about its own
  // VEVOR wash station as "the VEVOR" — so every one of those mentions became a
  // live /go/ CTA to a bike trailer. Wrong-product links do not just read badly,
  // they burn the click.
  //
  // The scope is the reading guide's own roster, NOT the declaring guide: a
  // guide that stocks the product but never wrote that particular alias into
  // its own frontmatter still gets the link (495 correct same-guide anchors
  // depend on this — e.g. "Tractive" in at-home-pet-health-monitoring-tools,
  // whose alias is declared over in best-dog-gps-trackers-2026). Scoping to the
  // declaring guide instead would delete all of them.
  //
  // This is a pure FILTER over the site-wide map, in the map's own order, so it
  // can only ever remove keys — it cannot mint a link that did not exist.
  const rosterAsins = new Set(
    (rawPicks ?? []).map((p) => p.asin).filter((a): a is string => !!a),
  );
  const siteWideProducts = new Map<string, string>();
  for (const [key, entry] of getSiteWideProductEntries()) {
    if (entry.kind === 'alias' && !rosterAsins.has(entry.asin)) continue;
    siteWideProducts.set(key, entry.url);
  }
  const mergedAffiliateMap = new Map([...siteWideProducts, ...linkMap]);

  // Safety net: getSiteWideProductEntries() is built from raw, unfiltered pick
  // data across every guide, keyed by name/alias strings authored per-guide.
  // A dead ASIN on this guide can still leak back in as a live /go/ link if
  // ANOTHER guide's pick for the same product (still available there) has an
  // alias that happens to appear verbatim in this guide's own prose (e.g. a
  // "the {model}" alias) — buildPickLinkMap/name-based exclusion above can't
  // catch that, since the colliding alias isn't declared on this guide's own
  // pick at all. Match by resolved URL instead: strip every map entry whose
  // target is one of this guide's dead ASINs, regardless of which guide (or
  // which alias) contributed the key.
  const deadAsinUrls = new Set(
    (rawPicks ?? [])
      .filter((p) => p.available === false && p.asin)
      .map((p) => buildAmazonUrl(p.asin as string)),
  );
  if (deadAsinUrls.size) {
    for (const [key, url] of mergedAffiliateMap) {
      if (deadAsinUrls.has(url)) mergedAffiliateMap.delete(key);
    }
  }

  // Category-aware internal guide link map (editorial ↔ editorial, Playground ↔ Playground).
  const guideLinkMap = buildGuideLinkMap(category, slug);

  // Three-pass injector helpers (bound for this guide)
  const injectAffiliate = (text: string) => injectAffiliateLinks(text, mergedAffiliateMap);
  const injectGuide = (text: string) => injectGuideLinks(text, guideLinkMap);
  const injectAuthority = (text: string) => injectAuthorityLinks(text, AUTHORITY_LINK_MAP);

  // Frontmatter prose injection (no capsule exclusion — H2 structure doesn't apply):
  // Order: affiliate → guide only. Authority outbound disabled per owner directive
  // 2026-05-11: outbound links should only target Amazon affiliate URLs or internal
  // guides. The injectAuthority helper is retained above for potential future re-enable.
  void injectAuthority;
  const injectFrontmatterProse = (text: string) =>
    injectGuide(injectAffiliate(text));

  // Auto-link product names to Amazon affiliate URLs in pick body, pick verdict, and bottomLine.
  // Authority-source linking: per the May 2026 AEO audit, body fields receive a first-occurrence-
  // only link injection for veterinary/regulatory/welfare authorities (Merck, AVMA, AAHA, RSPCA,
  // etc.), strengthening YMYL and citation signals without inflating capsule link density.
  // CLL: all auto-linked prose fields render affiliate mentions as the "inline"
  // position (guide-picks lane), tagged with this guide's slug so /go can
  // attribute the click. Pick-card CTAs are tagged separately (by rank) in the
  // render components; faq answers currently render as plain text (no links).
  const picks: GuidePick[] | undefined = rawPicks?.map((p) => {
    const linkedBody = injectFrontmatterProse(p.body);
    const linkedVerdict = injectFrontmatterProse(p.verdict);
    return {
      ...p,
      bodyHtml: linkedBody
        ? withGoContext(slug, 'inline', () => marked(linkedBody) as string)
        : '',
      verdictHtml: linkedVerdict
        ? withGoContext(slug, 'inline', () => marked.parseInline(linkedVerdict) as string)
        : undefined,
    };
  });

  // Owner ruling 2026-08-10 — SUPPRESSION. Split snapshot-gated picks out of
  // the rendered roster entirely. Everything downstream (FeaturedPicksGrid,
  // PickDeepDive, GuideComparisonTable, MethodologyBox, the JSON-LD ItemList
  // and Product/Offer nodes, the TOC, /deals, the MCP surfaces) reads
  // Guide.picks, so removing them here removes them everywhere at once.
  //
  // They are kept on Guide.suppressedPicks rather than dropped on the floor:
  // the price-refresh cron walks both lists, so a suppressed ASIN keeps being
  // re-checked and can come back on its own.
  const visiblePicks = picks?.filter((p) => !p.suppressed);
  const suppressedPicks = picks?.filter((p) => p.suppressed);

  // GuideComparisonTable is POSITIONAL: it renders comparison.rows[].values[i]
  // under picks[i]. Dropping a pick without dropping its column would shift
  // every later column one product to the left and print each product's specs
  // under its neighbour's name — a worse defect than the one suppression
  // fixes. Drop the matching value cell from every row by the same indices.
  const comparison = parseComparison(data.comparison);
  const keptIndices = picks
    ? picks.map((p, i) => (p.suppressed ? -1 : i)).filter((i) => i >= 0)
    : [];
  const alignedComparison: GuideComparison | undefined =
    comparison && picks && suppressedPicks?.length
      ? {
          ...comparison,
          rows: comparison.rows.map((row) => ({
            ...row,
            // ALWAYS reindex — never condition on row length.
            //
            // The earlier `row.values.length === picks.length` guard had a hole
            // that shipped: best-dog-nail-clippers-grinders has 6 picks but rows
            // authored with only 5 values, and its suppressed pick sits at index
            // 3. The length check failed so reindexing was skipped, but the
            // HEADERS still shrank — leaving column 4 (headed "Millers Forge")
            // rendering the suppressed pick's values, and a styptic powder
            // bottle claiming "Format: Plier clipper".
            //
            // Short rows need reindexing just as much as exact-length ones:
            // whether a row is misaligned depends on WHERE the suppressed pick
            // sits, not on how many values the author wrote. keptIndices.map is
            // already correct for a short row — indices past its end yield
            // undefined, which GuideComparisonTable renders as "–" via
            // `row.values[cIdx] ?? "–"`, exactly as it did before suppression.
            values: keptIndices.map((i) => row.values[i]),
          })),
        }
      : comparison;

  const rawBottomLine = Array.isArray(data.bottomLine)
    ? asStringArray(data.bottomLine).map(withCount)
    : undefined;
  const bottomLineHtml = rawBottomLine?.map((item) =>
    withGoContext(slug, 'inline', () => marked.parseInline(injectFrontmatterProse(item)) as string),
  );

  // Per-species sections (markdown). Full 3-pass injection applies (no H2 structure).
  const rawForDogs = frontmatterString(data.forDogs) || undefined;
  const rawForCats = frontmatterString(data.forCats) || undefined;
  const linkedForDogs = rawForDogs ? injectFrontmatterProse(rawForDogs) : undefined;
  const linkedForCats = rawForCats ? injectFrontmatterProse(rawForCats) : undefined;
  const forDogsHtml = linkedForDogs
    ? withGoContext(slug, 'inline', () => marked(linkedForDogs) as string)
    : undefined;
  const forCatsHtml = linkedForCats
    ? withGoContext(slug, 'inline', () => marked(linkedForCats) as string)
    : undefined;

  const guide: Guide = {
    slug,
    title: frontmatterString(data.title, slug),
    description: withCount(frontmatterString(data.description)),
    excerpt: withCount(frontmatterString(data.excerpt)),
    category,
    pillar: resolvePillar(data.pillar, category),
    publishDate: frontmatterString(data.publishDate),
    updatedDate: frontmatterString(data.updatedDate, frontmatterString(data.publishDate)),
    readTime: frontmatterString(data.readTime),
    featured: data.featured || false,
    image: frontmatterString(data.image),
    content: contentWithCount,
    // Body markdown: 3-pass injection with capsule + FAQ exclusions via injectIntoBody.
    // The FAQ section is stripped before rendering — it's already extracted into
    // faqItems above and mounted separately by GuideFAQ; rendering it here too
    // would duplicate the "Frequently Asked Questions" H2 and every answer.
    htmlContent: withGoContext(slug, 'inline', () =>
      marked(
        injectIntoBody(stripFAQSection(contentWithCount), injectAffiliate, injectGuide, injectAuthority)
      ) as string,
    ),
    faqItems: extractFAQFromMarkdown(contentWithCount),
    headings: extractHeadingsFromMarkdown(contentWithCount),
    products: Array.isArray(data.products) ? data.products : [],
    keywords: asStringArray(data.keywords).length ? asStringArray(data.keywords) : undefined,
    reviewMethod: typeof data.reviewMethod === 'string' ? withCount(data.reviewMethod) : data.reviewMethod,
    lastProductCheck: frontmatterString(data.lastProductCheck) || undefined,
    expertSourceCount:
      typeof data.expertSourceCount === 'number' ? data.expertSourceCount : undefined,

    heroImage: frontmatterString(data.heroImage) || frontmatterString(data.image) || undefined,
    shortAnswer: withCount(frontmatterString(data.shortAnswer)) || undefined,
    // topPicks feeds the "Evidence at a Glance" panel — a SECOND recommendation
    // surface, authored separately from `picks` and therefore not covered by the
    // roster split. Without this filter a suppressed product keeps headlining
    // the panel while its pick card is gone (e.g. bearded-dragon-substrate led
    // with two suppressed substrates). Matched by name against the suppressed
    // set, normalised for whitespace/case so authoring drift doesn't leak one
    // through.
    topPicks: (() => {
      const parsed = parseTopPicks(data.topPicks);
      if (!parsed || !suppressedPicks?.length || !picks?.length) return parsed;
      // Equality is the WRONG JOIN here and it leaked ten products, four of them
      // headlining the panel. topPicks entries are routinely authored as
      // ABBREVIATED forms of the pick name — "SHENGOCASE Wall Mounted Cat
      // Furniture Set" for a pick called "...Set, Natural Wood, 47.2 inch
      // Balcony Perch with Guardrail, 4 Steps, 2 Houses with Cushions" — so an
      // exact compare silently kept every abbreviated entry. topPicks carries no
      // ASIN, so a name join is all that is available.
      //
      // Resolve each entry to its BEST-matching pick across the whole roster
      // (visible + suppressed) by common-prefix length, then drop it only when
      // that best match is a suppressed one. Scoring against both sets is what
      // stops over-removal: "SureFlap Microchip Cat Flap" (suppressed) and
      // "SureFlap DualScan Microchip Cat Door" (surviving) share a prefix, and
      // whichever shares MORE of it wins rather than the first one tested.
      const norm = (v: string) => v.toLowerCase().replace(/\s+/g, ' ').trim();
      const prefixLen = (a: string, b: string) => {
        const n = Math.min(a.length, b.length);
        let i = 0;
        while (i < n && a[i] === b[i]) i++;
        return i;
      };
      // Second signal: DISTINCTIVE TOKEN OVERLAP, used only when the character
      // metric above finds nothing at all.
      //
      // Shared prefix fails whenever the two names diverge inside 12 characters,
      // which is exactly what an abbreviation does when it reorders the model
      // detail: "Coziwow Window-Access Catio with Platforms & Hammock" against
      // the pick "Coziwow Upgraded Catio Outdoor Cat Enclosure with Window
      // Access…" shares 8 characters, and "Arcadia D3 6% Forest T5 HO UVB"
      // against "Arcadia D3 UVB Lamp 39W Forest (Replacement T5 Tube)" shares
      // 11. Both leaked a suppressed product into the panel while its card was
      // gone. Token overlap sees through the reordering.
      //
      // Kept deliberately narrow: stop-words and category nouns are stripped, at
      // least two distinctive tokens must be shared, and the suppressed match
      // must beat every surviving one OUTRIGHT — a tie keeps the entry. A
      // topPicks entry that legitimately names a non-pick (a direct-sale brand,
      // say) shares at most the category noun and is untouched.
      const STOP = new Set([
        'the', 'and', 'for', 'with', 'pet', 'pets', 'cat', 'cats', 'dog', 'dogs',
        'inch', 'inches', 'large', 'small', 'mini', 'kit', 'kits', 'set', 'sets',
        'pack', 'size', 'sized', 'black', 'white', 'gallon', 'gal', 'lbs', 'oz',
      ]);
      const tokens = (v: string) =>
        new Set(v.split(/[^a-z0-9]+/).filter((x) => x.length >= 3 && !STOP.has(x)));
      const sharedCount = (a: Set<string>, b: Set<string>) => {
        let n = 0;
        for (const x of a) if (b.has(x)) n++;
        return n;
      };
      const roster = [
        ...picks.map((p) => ({
          name: norm(p.name),
          tokens: tokens(norm(p.name)),
          suppressed: !!p.suppressed,
        })),
      ];
      const kept = parsed.filter((tp) => {
        const t = norm(tp.name);
        let best: { score: number; suppressed: boolean } | null = null;
        for (const r of roster) {
          // Either name may be the abbreviation, so test containment both ways;
          // otherwise fall back to shared prefix. The 12-character floor keeps a
          // common brand word ("Zoo Med", "PetSafe") from matching on its own.
          const contains = t.includes(r.name) || r.name.includes(t);
          const score = contains ? Math.min(t.length, r.name.length) : prefixLen(t, r.name);
          if (score < 12) continue;
          if (!best || score > best.score) best = { score, suppressed: r.suppressed };
        }
        if (best) return !best.suppressed;
        const tt = tokens(t);
        let bestSup = 0;
        let bestVis = 0;
        for (const r of roster) {
          const n = sharedCount(tt, r.tokens);
          if (r.suppressed) bestSup = Math.max(bestSup, n);
          else bestVis = Math.max(bestVis, n);
        }
        return !(bestSup >= 2 && bestSup > bestVis);
      });
      return kept.length ? kept : undefined;
    })(),
    pickCount,
    buyablePickCount,
    picks: visiblePicks,
    suppressedPicks: suppressedPicks?.length ? suppressedPicks : undefined,
    comparison: alignedComparison,
    methodology: parseMethodology(data.methodology),
    ecosystemSection: parseEcosystem(data.ecosystemSection),
    whenNotToBuy: whenNotToBuyResolved,
    // whenNotToBuy is a frontmatter prose field — full 3-pass injection applies.
    whenNotToBuyHtml: whenNotToBuyResolved
      ? withGoContext(slug, 'inline', () => marked(injectFrontmatterProse(whenNotToBuyResolved)) as string)
      : undefined,
    bottomLine: rawBottomLine,
    bottomLineHtml,
    sources: parseSources(data.sources),
    related: asStringArray(data.related).length ? asStringArray(data.related) : undefined,

    hub: frontmatterString(data.hub) || undefined,
    guideType:
      data.guideType === 'hub' || data.guideType === 'spoke' ? data.guideType : undefined,
    spokes: asStringArray(data.spokes).length ? asStringArray(data.spokes) : undefined,

    species: (() => {
      const arr = asStringArray(data.species).map((s) => s.toLowerCase());
      const out = arr.filter((s): s is 'dog' | 'cat' => s === 'dog' || s === 'cat');
      return out.length ? out : undefined;
    })(),
    speciesPrimary:
      data.speciesPrimary === 'dog' || data.speciesPrimary === 'cat'
        ? data.speciesPrimary
        : undefined,
    sectionAnchors:
      data.sectionAnchors && typeof data.sectionAnchors === 'object'
        ? {
            forDogs:
              frontmatterString(
                (data.sectionAnchors as Record<string, unknown>).forDogs,
              ) || undefined,
            forCats:
              frontmatterString(
                (data.sectionAnchors as Record<string, unknown>).forCats,
              ) || undefined,
          }
        : undefined,

    forDogs: rawForDogs,
    forDogsHtml,
    forCats: rawForCats,
    forCatsHtml,
  };

  // Resolve count tokens across EVERY string the guide carries, at the very end.
  //
  // The earlier version interpolated a hand-listed set of fields, and that list
  // was incomplete: `sources.authorBio` was never routed through it, so
  // best-pet-pool-swim-summer-gear-2026 shipped the literal text
  // "{{pickCountWord}}" to readers — raw template syntax on a money page, and a
  // regression from the merely-wrong-but-readable "five picks" it replaced.
  //
  // Enumerating the field family by hand is the failure mode, not the fix. This
  // walks the finished object instead, so any prose field — including ones added
  // later, and nested ones like sources.authorBio, picks[].verdict,
  // comparison.rows[].values or methodology.factors[].definition — resolves
  // without anyone remembering to add it.
  return deepResolveTokens(guide, withCount);
}

/**
 * Applies a string transform to every string in a value, recursively, returning
 * a structurally identical value. Cheap: the transform is a no-op unless the
 * string actually contains a token.
 */
function deepResolveTokens<T>(value: T, fn: (s: string) => string): T {
  if (typeof value === 'string') return fn(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => deepResolveTokens(v, fn)) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = deepResolveTokens(v, fn);
    }
    return out as unknown as T;
  }
  return value;
}

// Memoized in production: getAllGuides() is called from generateMetadata AND the
// page body across ~300 statically generated pages, and each uncached call re-reads
// and re-parses the entire markdown corpus. At 142 guides that quadratic cost pushed
// individual pages past Vercel's 60s static-generation limit and failed the build
// (BUILD_UTILS_SPAWN_1, 2026-07-03). Content only changes with a deploy, so a
// per-process cache is safe; dev stays uncached for hot reload.
let guidesCache: Guide[] | null = null;

export function getAllGuides(): Guide[] {
  if (process.env.NODE_ENV === 'production' && guidesCache) return guidesCache;
  if (!fs.existsSync(guidesDirectory)) return [];

  const files = fs.readdirSync(guidesDirectory).filter((f) => f.endsWith('.md'));

  const guides = files.map((filename) => {
    const slug = filename.replace(/\.md$/, '');
    const filePath = path.join(guidesDirectory, filename);
    const fileContents = fs.readFileSync(filePath, 'utf8');
    return parseGuide(slug, fileContents);
  });

  guides.sort((a, b) => parseDate(b.publishDate).getTime() - parseDate(a.publishDate).getTime());

  if (process.env.NODE_ENV === 'production') guidesCache = guides;
  return guides;
}

export function getAllGuideSummaries(): GuideSummary[] {
  return getAllGuides().map((guide) => ({
    slug: guide.slug,
    title: guide.title,
    description: guide.description,
    excerpt: guide.excerpt,
    category: guide.category,
    pillar: guide.pillar,
    publishDate: guide.publishDate,
    updatedDate: guide.updatedDate,
    readTime: guide.readTime,
    featured: guide.featured,
    image: guide.image,
    products: guide.products,
    reviewMethod: guide.reviewMethod,
    lastProductCheck: guide.lastProductCheck,
    expertSourceCount: guide.expertSourceCount,
    heroImage: guide.heroImage,
    shortAnswer: guide.shortAnswer,
    hub: guide.hub,
    guideType: guide.guideType,
    spokes: guide.spokes,
    species: guide.species,
    speciesPrimary: guide.speciesPrimary,
    sectionAnchors: guide.sectionAnchors,
  }));
}

export function getGuidesByPillar(pillarSlug: string): Guide[] {
  return getAllGuides().filter((guide) => guide.pillar === pillarSlug);
}

export function getGuideBySlug(slug: string): Guide | null {
  const filePath = path.join(guidesDirectory, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;

  const fileContents = fs.readFileSync(filePath, 'utf8');
  return parseGuide(slug, fileContents);
}

export function getFeaturedGuides(limit?: number): Guide[] {
  const allGuides = getAllGuides();
  const featured = allGuides.filter((guide) => guide.featured);
  return limit ? featured.slice(0, limit) : featured;
}

export function getGuidesByCategory(category: string): Guide[] {
  const allGuides = getAllGuides();
  return allGuides.filter((guide) => guide.category.toLowerCase() === category.toLowerCase());
}

/**
 * Resolve all spokes for a given hub. Combines explicit `spokes:` frontmatter
 * with reverse lookup (any guide whose `hub` field matches), deduped by slug.
 * Returns guides in the order they appear in `spokes:`, then any reverse-lookup
 * additions in publish-date order. Missing slugs are skipped silently.
 */
export function getSpokesForHub(hubSlug: string): Guide[] {
  const all = getAllGuides();
  const hub = all.find((g) => g.slug === hubSlug);
  const ordered: Guide[] = [];
  const seen = new Set<string>();

  if (hub?.spokes?.length) {
    for (const slug of hub.spokes) {
      const g = all.find((x) => x.slug === slug);
      if (g && !seen.has(g.slug)) {
        ordered.push(g);
        seen.add(g.slug);
      }
    }
  }

  for (const g of all) {
    if (g.hub === hubSlug && !seen.has(g.slug)) {
      ordered.push(g);
      seen.add(g.slug);
    }
  }

  return ordered;
}

export function getAllSlugs(): string[] {
  if (!fs.existsSync(guidesDirectory)) return [];
  return fs
    .readdirSync(guidesDirectory)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''));
}

/**
 * Interaction-gated affiliate href for a given ASIN (DG-2, ports deskgear PR #10).
 * Renders as an internal `/go/{ASIN}` link that /go/[id]/route.ts 302s to the
 * real Amazon product page server-side. Bare amazon.com hrefs are no longer
 * emitted into rendered HTML so crawlers can't generate phantom affiliate
 * clicks by following the anchor without JS (DG0-DIAGNOSIS H5). For JSON-LD
 * offer URLs (which must be absolute) prefix this with the site origin.
 */
export function buildAmazonUrl(asin: string): string {
  return `/go/${asin}`;
}
