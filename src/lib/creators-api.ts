/**
 * PetPalHQ – Amazon Creators API Client
 *
 * MIGRATION NOTICE: Amazon mandates full migration from PA-API 5.0 to
 * the Amazon Creators API by April 2026. This module provides the typed
 * interface and stub implementation. Wire in real credentials via .env.
 */

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface CreatorsAPIConfig {
  /** Amazon Creators API access key — set in .env as AMAZON_CREATORS_API_CLIENT_SECRET */
  apiKey: string;
  /** Your Amazon Associates tag (e.g. petpalhq-20) */
  associatesTag: string;
  /** Optional: UCP partner tag for Universal Commerce Protocol telemetry */
  ucpTag?: string;
  /** API base URL — defaults to production */
  baseUrl?: string;
}

/**
 * OffersV2 real-time product data from the Amazon Creators API.
 */
export interface OffersV2Data {
  asin: string;
  productTitle: string;
  /** Current buy-box price in USD */
  price: string;
  /** "IN_STOCK" | "OUT_OF_STOCK" | "PRE_ORDER" */
  availability: string;
  /** Tracked affiliate URL with Associates tag embedded */
  affiliateUrl: string;
  /** UCP-compatible checkout URL for agent-led "Buy it for me" flows */
  ucpCheckoutUrl?: string;
  /** Timestamp of last price check */
  lastUpdated: string;
  /** Deep link to the Creators-API-managed product detail page */
  creatorPageUrl?: string;
}

export interface AffiliateLinkOptions {
  /** Override the default Associates tag */
  tag?: string;
  /** Inject UCP telemetry parameter for agent-led checkout */
  includeUCP?: boolean;
  /** Tracking ID for internal analytics */
  trackingId?: string;
}

// ─── Client ────────────────────────────────────────────────────────────────────

export class AmazonCreatorsAPIClient {
  private config: CreatorsAPIConfig;
  private baseUrl: string;

  constructor(config: CreatorsAPIConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://creators-api.amazon.com/v1';
  }

  async getProductPricing(asin: string): Promise<OffersV2Data> {
    if (!this.config.apiKey || this.config.apiKey === 'STUB') {
      return this.getMockOffer(asin);
    }

    const response = await fetch(`${this.baseUrl}/products/${asin}/offers`, {
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'X-Associates-Tag': this.config.associatesTag,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Creators API error ${response.status}: ${await response.text()}`);
    }

    return response.json();
  }

  getAffiliateLink(asin: string, options: AffiliateLinkOptions = {}): string {
    const tag = options.tag || this.config.associatesTag;
    const baseAmazonUrl = `https://www.amazon.com/dp/${asin}`;

    const params = new URLSearchParams({
      tag,
      linkCode: 'as2',
      camp: '1789',
      creative: '9325',
    });

    if (options.includeUCP && this.config.ucpTag) {
      params.set('ucp_tag', this.config.ucpTag);
    }

    if (options.trackingId) {
      params.set('tracking_id', options.trackingId);
    }

    return `${baseAmazonUrl}?${params.toString()}`;
  }

  async injectPricingIntoMarkdown(
    markdown: string,
    asinMap: Record<string, string>
  ): Promise<string> {
    let updated = markdown;

    for (const [productName, asin] of Object.entries(asinMap)) {
      try {
        const offer = await this.getProductPricing(asin);
        const pricePattern = new RegExp(
          `(${productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^|\\n]*)\\$[\\d,]+`,
          'gi'
        );
        updated = updated.replace(pricePattern, `$1${offer.price}`);
      } catch {
        console.warn(`[Creators API] Could not fetch pricing for ASIN ${asin}`);
      }
    }

    return updated;
  }

  getMockOffer(asin: string): OffersV2Data {
    return {
      asin,
      productTitle: `Product ${asin}`,
      price: '$0.00',
      availability: 'IN_STOCK',
      affiliateUrl: `https://www.amazon.com/dp/${asin}?tag=${this.config.associatesTag}`,
      ucpCheckoutUrl: undefined,
      lastUpdated: new Date().toISOString(),
    };
  }
}

// ─── Singleton Factory ─────────────────────────────────────────────────────────

let _client: AmazonCreatorsAPIClient | null = null;

export function getCreatorsAPIClient(): AmazonCreatorsAPIClient {
  if (!_client) {
    _client = new AmazonCreatorsAPIClient({
      apiKey: process.env.AMAZON_CREATORS_API_CLIENT_SECRET || 'STUB',
      associatesTag: process.env.AMAZON_ASSOCIATES_TAG || 'petpalhq-20',
    });
  }
  return _client;
}

export function migratePaApiUrl(
  oldUrl: string,
  asin: string,
  options: AffiliateLinkOptions = {}
): string {
  const client = getCreatorsAPIClient();
  return client.getAffiliateLink(asin, options);
}
