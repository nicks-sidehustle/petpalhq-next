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

interface Listing {
  price?: PriceShape;
  availability?: { displayLabel?: string; type?: string };
  merchantInfo?: { id?: string; name?: string };
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
      resources: [
        'itemInfo.title',
        'offersV2.listings.price',
        'offersV2.listings.availability',
        'offersV2.listings.merchantInfo',
      ],
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
  };
}
