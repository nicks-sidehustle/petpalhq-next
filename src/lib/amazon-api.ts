/**
 * Amazon Creators API client for PetPalHQ.
 *
 * Self-contained PetPalHQ port — no dependency on any sister-site repo.
 * Auth: LwA OAuth with scope "creatorsapi::default", JSON body.
 * Single-product lookup by ASIN — returns current price and availability.
 *
 * Env vars:
 *   AMAZON_CLIENT_ID       amzn1.application-oa2-client.XXXXX
 *   AMAZON_CLIENT_SECRET   amzn1.oa2-cs.v1.XXXXX
 *   AMAZON_AFFILIATE_TAG   petpalhq08-20 (default)
 */

const AFFILIATE_TAG = process.env.AMAZON_AFFILIATE_TAG || 'petpalhq08-20';
const TOKEN_URL = 'https://api.amazon.com/auth/o2/token';
const API_BASE = 'https://creatorsapi.amazon';
const MARKETPLACE = 'www.amazon.com';

// --- OAuth token cache (in-memory, 1-hour TTL) ---

let _cachedToken: string | null = null;
let _tokenExpiresAt = 0;

async function getAccessToken(): Promise<string> {
  const clientId = process.env.AMAZON_CLIENT_ID;
  const clientSecret = process.env.AMAZON_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('AMAZON_CLIENT_ID and AMAZON_CLIENT_SECRET must be set in environment');
  }

  if (_cachedToken && Date.now() < _tokenExpiresAt - 60_000) {
    return _cachedToken;
  }

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'creatorsapi::default',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Amazon token request failed ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in?: number };
  _cachedToken = data.access_token;
  _tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;
  return _cachedToken;
}

function apiHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'x-marketplace': MARKETPLACE,
  };
}

// --- Response types ---

interface PriceMoney {
  displayAmount?: string;
}

interface PriceShape {
  money?: PriceMoney;
  displayAmount?: string;
  savingBasis?: {
    money?: PriceMoney;
    displayAmount?: string;
    savingBasisType?: string;
    type?: string;
  };
  savings?: {
    percentage?: number;
  };
}

/**
 * Condition as the Creators API reports it, in every shape it has been seen to
 * use. Deliberately permissive: `condition` is sometimes a bare string
 * ("Used"), sometimes an object with `value`/`displayValue`/`subCondition`, and
 * on some payloads it hangs off `offerListing` instead of the listing itself.
 * Reading all of them costs nothing and a missed field is a used price written
 * as a New price (W4 #168, B00I9A8CW6 -> $45.99).
 */
type ConditionShape =
  | string
  | {
      /** What scripts/automation/amazon-lookup.cjs:226 reads in production. */
      value?: string;
      displayValue?: string;
      subCondition?: string;
      subConditionValue?: string;
      conditionNote?: string;
    }
  | null
  | undefined;

interface Listing {
  price?: PriceShape;
  availability?: { displayLabel?: string; type?: string };
  merchantInfo?: { id?: string; name?: string };
  condition?: ConditionShape;
  offerListing?: { condition?: ConditionShape };
}

interface ItemImages {
  primary?: {
    large?: { url?: string };
    medium?: { url?: string };
  };
}

interface ItemInfo {
  title?: { displayValue?: string };
}

interface ApiItem {
  asin?: string;
  offersV2?: { listings?: Listing[] };
  offers?: { listings?: Listing[] };
  images?: ItemImages;
  itemInfo?: ItemInfo;
}

interface GetItemsResponse {
  itemsResult?: { items?: ApiItem[] };
}

// --- ASIN price lookup result ---

export interface AmazonPriceResult {
  asin: string;
  price: string | null;
  currency: string;
  availability: string | null;
  /**
   * Seller of record on the Buy Box this read saw. The 2026-08-18 backorder
   * ruling decides on it, so it is captured on the same read as the price and
   * availability it must stay consistent with — never merged in from a
   * separate, differently-aged lookup.
   */
  merchantId: string | null;
  merchantName: string | null;
  lastChecked: string;
  /**
   * List/typical price per the 2026-09-01/02 owner PRICE-BASIS ruling: the
   * Creators API `price` field above is the BUY-BOX price, never the list
   * price. `savingBasis` is the only field that carries a list/typical
   * price, and only when Amazon includes one on the listing — null when
   * absent, never backfilled or guessed.
   */
  listPrice: string | null;
  /**
   * What kind of reference price `listPrice` is — `LIST_PRICE` (manufacturer
   * list) or `WAS_PRICE` (a recent prior price), per `savingBasis.savingBasisType`
   * (or the older `savingBasis.type` field). Null when `listPrice` is null.
   */
  listPriceBasis: 'LIST_PRICE' | 'WAS_PRICE' | string | null;
  /** `price.savings.percentage` — null when Amazon reports no savings. */
  savingsPercent: number | null;
  /**
   * OFFER CONDITION, as reported (New / Used / Renewed / Collectible / …), or
   * null when this payload carries none. Optional so every existing caller and
   * fixture keeps compiling; ABSENT IS UNKNOWN, never "New" — see
   * nonNewOfferReason(), which also reads merchant and title because this field
   * is not always populated.
   *
   * Captured on the same read as `price`, because the pair is the whole point:
   * a price without its condition is how a $45.99 USED offer got written as a
   * row price for B00I9A8CW6 (W4 #168). §8l — Renewed/Used is not New.
   */
  condition?: string | null;
  /**
   * `itemInfo.title.displayValue` — already requested by fetchAmazonPrice(), so
   * this is free. §8l title markers ("(Renewed)", "(Refurbished)", "Used —") are
   * the condition signal that survives when the condition field is absent.
   */
  title?: string | null;
}

function extractPrice(item: ApiItem): string | null {
  const listing =
    item.offersV2?.listings?.[0] ||
    item.offers?.listings?.[0] ||
    null;
  return (
    listing?.price?.money?.displayAmount ||
    listing?.price?.displayAmount ||
    null
  );
}

function extractAvailability(item: ApiItem): string | null {
  const listing =
    item.offersV2?.listings?.[0] ||
    item.offers?.listings?.[0] ||
    null;
  return listing?.availability?.type || listing?.availability?.displayLabel || null;
}

function extractMerchant(item: ApiItem): { id: string | null; name: string | null } {
  const listing =
    item.offersV2?.listings?.[0] ||
    item.offers?.listings?.[0] ||
    null;
  return {
    id: listing?.merchantInfo?.id || null,
    name: listing?.merchantInfo?.name || null,
  };
}

function conditionText(condition: ConditionShape): string | null {
  if (!condition) return null;
  if (typeof condition === 'string') return condition.trim() || null;
  const parts = [
    condition.value,
    condition.displayValue,
    condition.subCondition,
    condition.subConditionValue,
    condition.conditionNote,
  ]
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.trim());
  return parts.length ? [...new Set(parts)].join(' ') : null;
}

/**
 * Offer condition off whichever field the payload carries — a bare string, the
 * `{ value }` object scripts/automation/amazon-lookup.cjs:226 reads, or
 * `offerListing.condition`. `fetchAmazonPrice()` requests
 * `offersV2.listings.condition` (GET_ITEMS_RESOURCES above), so in production
 * this is the PRIMARY condition signal; the merchant and title heuristics in
 * nonNewOfferReason() are the backstop for payloads that still return none.
 */
export function extractCondition(item: ApiItem): string | null {
  const listing =
    item.offersV2?.listings?.[0] ||
    item.offers?.listings?.[0] ||
    null;
  if (!listing) return null;
  return conditionText(listing.condition) || conditionText(listing.offerListing?.condition) || null;
}

export function extractTitle(item: ApiItem): string | null {
  return item.itemInfo?.title?.displayValue?.trim() || null;
}

/**
 * Sellers whose NAME alone says the offer is not New. "Amazon Resale" is
 * Amazon Warehouse's current name — Amazon is the merchant of record, so
 * merchantId is ATVPDKIKX0DER and every Amazon-sold carve-out in
 * price-cache.ts would wave it straight through as a New Amazon offer.
 */
const NON_NEW_MERCHANT_MARKERS = ['amazon resale', 'amazon warehouse', 'warehouse deals'];

/**
 * §8l title markers — the condition Amazon writes into the TITLE.
 *
 * ANCHORED, not substrings (W4 fix cycle 1). A bare "used" appears in ordinary
 * product copy ("used by groomers", "gently used feel"), and a heuristic that
 * fires on it would withhold prices from perfectly New listings — the opposite
 * failure, and one that also reaches a reader. So the used/refurb words only
 * count parenthesised or as whole words with a real boundary.
 */
const NON_NEW_TITLE_MARKERS: Array<[RegExp, string]> = [
  [/\(\s*renewed[^)]*\)/, '(renewed)'],
  [/\(\s*(?:certified\s+)?refurbished[^)]*\)/, '(refurbished)'],
  [/\(\s*used[^)]*\)/, '(used)'],
  [/\brenewed premium\b/, 'renewed premium'],
  [/\bpre-owned\b/, 'pre-owned'],
  [/\bopen[- ]box\b/, 'open box'],
];

/**
 * USED-PRICE GUARD (W4 #168). Returns a human-readable REASON when this read is
 * an offer that is not New, or null when nothing says so.
 *
 * Pure and defensive on purpose, and ORDERED: condition decides first, the
 * heuristics only ever catch what condition missed.
 *   1. the CONDITION field, in any of its shapes (extractCondition) — requested
 *      on every read since W4 fix cycle 1, so this is the real signal;
 *   2. the merchant NAME (Amazon Resale is Amazon-sold and would otherwise pass
 *      every Amazon-sold carve-out);
 *   3. §8l title markers.
 *
 * ABSENCE IS NOT EVIDENCE OF NEW, and it is not evidence of used either: a read
 * with no condition signal returns null and is treated exactly as before. This
 * only ever fires on a POSITIVE non-New signal, so it can never darken a card
 * on silence — which is the same §8mm discipline the rest of this change is
 * built on.
 */
export function nonNewOfferReason(read: {
  condition?: string | null;
  merchantName?: string | null;
  title?: string | null;
}): string | null {
  const condition = (read.condition || '').trim().toLowerCase();
  if (condition && !/^new\b/.test(condition)) {
    return `condition=${read.condition}`;
  }

  const merchant = (read.merchantName || '').trim().toLowerCase();
  const merchantHit = NON_NEW_MERCHANT_MARKERS.find((m) => merchant.includes(m));
  if (merchantHit) return `merchant=${read.merchantName}`;

  const title = (read.title || '').trim().toLowerCase();
  const titleHit = NON_NEW_TITLE_MARKERS.find(([re]) => re.test(title));
  if (titleHit) return `title marker "${titleHit[1]}" (§8l)`;

  return null;
}

/**
 * 2026-09-01/02 owner PRICE-BASIS ruling: the Creators API `price` field is
 * the buy-box price; `price.savingBasis` is the only field carrying a
 * list/typical price, and it is only present when Amazon includes one on the
 * listing. Pure — no network, no fallback guessing. Returns nulls across the
 * board when the listing has no savingBasis at all.
 */
export function extractSavingBasis(item: ApiItem): {
  listPrice: string | null;
  listPriceBasis: string | null;
  savingsPercent: number | null;
} {
  const listing =
    item.offersV2?.listings?.[0] ||
    item.offers?.listings?.[0] ||
    null;
  const savingBasis = listing?.price?.savingBasis;
  const listPrice =
    savingBasis?.money?.displayAmount || savingBasis?.displayAmount || null;
  const listPriceBasis = savingBasis?.savingBasisType || savingBasis?.type || null;
  const savingsPercentRaw = listing?.price?.savings?.percentage;
  const savingsPercent = typeof savingsPercentRaw === 'number' ? savingsPercentRaw : null;
  return { listPrice, listPriceBasis, savingsPercent };
}

/**
 * Fetch current price and availability for a single ASIN from Amazon Creators API.
 * Returns null price fields when the item is not found or not listed.
 * Throws on network/auth errors — callers should catch and continue.
 */
/**
 * GetItems resources this sync asks for.
 *
 * `offersV2.listings.condition` is REQUIRED, not optional decoration (W4 fix
 * cycle 1, 2026-09-08). Without it the API never reports condition, so
 * nonNewOfferReason() below has nothing but merchant and title to go on — and
 * the read that started all of this, B00I9A8CW6 on 2026-09-08, carried merchant
 * "E-Pawz & Friends" and a title with no §8l marker, so a heuristic-only guard
 * lets its $45.99 USED price straight through again.
 *
 * The earlier worry that an unknown resource would 400 the whole corpus is
 * settled in-repo, not by argument: scripts/automation/amazon-lookup.cjs:115
 * and :155 request this exact string against this exact endpoint in production
 * (receipts 2026-09-03 and 2026-09-07). Requested in the same order it uses.
 *
 * Exported so a test can assert the string is still here — dropping it is a
 * silent, production-only regression that no fixture-driven test would catch.
 */
export const GET_ITEMS_RESOURCES = [
  'itemInfo.title',
  'offersV2.listings.price',
  'offersV2.listings.availability',
  'offersV2.listings.merchantInfo',
  'offersV2.listings.condition',
] as const;

export async function fetchAmazonPrice(asin: string): Promise<AmazonPriceResult> {
  const token = await getAccessToken();

  const res = await fetch(`${API_BASE}/catalog/v1/getItems`, {
    method: 'POST',
    headers: apiHeaders(token),
    body: JSON.stringify({
      itemIds: [asin],
      itemIdType: 'ASIN',
      marketplace: MARKETPLACE,
      partnerTag: AFFILIATE_TAG,
      resources: GET_ITEMS_RESOURCES,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GetItems failed ${res.status} for ASIN ${asin}: ${text}`);
  }

  const data = (await res.json()) as GetItemsResponse;
  const items = data.itemsResult?.items || [];
  const item = items.find((i) => i.asin === asin) || items[0] || null;

  const merchant = item ? extractMerchant(item) : { id: null, name: null };
  const savingBasis = item
    ? extractSavingBasis(item)
    : { listPrice: null, listPriceBasis: null, savingsPercent: null };

  return {
    asin,
    price: item ? extractPrice(item) : null,
    currency: 'USD',
    availability: item ? extractAvailability(item) : null,
    merchantId: merchant.id,
    merchantName: merchant.name,
    lastChecked: new Date().toISOString(),
    listPrice: savingBasis.listPrice,
    listPriceBasis: savingBasis.listPriceBasis,
    savingsPercent: savingBasis.savingsPercent,
    condition: item ? extractCondition(item) : null,
    title: item ? extractTitle(item) : null,
  };
}
