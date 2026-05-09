/**
 * Amazon Creators API client for PetPalHQ.
 *
 * Ported from gardengearhq-next/scripts/automation/amazon-lookup.cjs.
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
}

interface Listing {
  price?: PriceShape;
  availability?: { displayLabel?: string; type?: string };
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
  lastChecked: string;
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

  return {
    asin,
    price: item ? extractPrice(item) : null,
    currency: 'USD',
    availability: item ? extractAvailability(item) : null,
    lastChecked: new Date().toISOString(),
  };
}
