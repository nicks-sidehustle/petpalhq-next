/**
 * PetPalHQ – Amazon Creators API Client
 *
 * MIGRATION NOTICE: Amazon mandates full migration from PA-API 5.0 to
 * the Amazon Creators API by April 2026. This module provides the typed
 * interface and stub implementation. Wire in real credentials via .env.
 *
 * Skill: creators-api-fetcher
 * Agent: Bulk Data Agent (GPT-OSS 120B)
 */

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface CreatorsAPIConfig {
    /** Amazon Creators API access key — set in .env as AMAZON_CREATORS_API_CLIENT_SECRET */
    apiKey: string;
    /** Your Amazon Associates tag (e.g. xmasgearhq-20) */
    associatesTag: string;
    /** Optional: UCP partner tag for Universal Commerce Protocol telemetry */
    ucpTag?: string;
    /** API base URL — defaults to production */
    baseUrl?: string;
}

/**
 * OffersV2 real-time product data from the Amazon Creators API.
 * Replaces the static price strings previously managed via PA-API 5.0.
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

    /**
     * Fetch real-time pricing and availability for a product ASIN.
     * Replaces PA-API 5.0 GetItems endpoint.
     *
     * TODO: Replace stub with live SDK call once API credentials are provisioned:
     *   import { CreatorsAPI } from '@amazon/creators-api-sdk';
     *   const client = new CreatorsAPI({ apiKey: this.config.apiKey });
     *   return client.products.getOffers(asin);
     */
    async getProductPricing(asin: string): Promise<OffersV2Data> {
        if (!this.config.apiKey || this.config.apiKey === 'STUB') {
            // Return mock data in stub mode — safe for development
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

    /**
     * Generate a tracked affiliate URL for a product.
     * Returns a UCP-compatible URL when includeUCP is true.
     *
     * UCP (Universal Commerce Protocol): Google's standard that embeds partner
     * telemetry in agent-led checkout flows, ensuring commission attribution
     * even when transactions complete entirely within an AI interface.
     */
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
            // UCP telemetry parameter — activated when Google UCP SDK is integrated
            // Full integration: https://developers.google.com/commerce/ucp/integration
            params.set('ucp_tag', this.config.ucpTag);
        }

        if (options.trackingId) {
            params.set('tracking_id', options.trackingId);
        }

        return `${baseAmazonUrl}?${params.toString()}`;
    }

    /**
     * Inject OffersV2 data into a markdown product table.
     * Designed to be called by the Bulk Data Agent (GPT-OSS 120B) during
     * content pipeline runs to keep prices current.
     */
    async injectPricingIntoMarkdown(
        markdown: string,
        asinMap: Record<string, string>
    ): Promise<string> {
        let updated = markdown;

        for (const [productName, asin] of Object.entries(asinMap)) {
            try {
                const offer = await this.getProductPricing(asin);
                // Replace static price patterns like "$249" adjacent to the product name
                const pricePattern = new RegExp(
                    `(${productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^|\\n]*)\\$[\\d,]+`,
                    'gi'
                );
                updated = updated.replace(pricePattern, `$1${offer.price}`);
            } catch {
                // Non-fatal: keep existing price if API is unavailable
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

// ─── Migration Helper ──────────────────────────────────────────────────────────

/**
 * Converts a legacy PA-API 5.0 Amazon search URL to a Creators API direct ASIN link.
 * Use this during the April 2026 migration to update all existing affiliate links.
 *
 * PA-API 5.0 pattern: https://www.amazon.com/s?k=Product+Name&tag=xmasgearhq-20
 * Creators API pattern: https://www.amazon.com/dp/ASIN?tag=xmasgearhq-20&linkCode=as2
 */
export function migratePaApiUrl(
    oldUrl: string,
    asin: string,
    options: AffiliateLinkOptions = {}
): string {
    const client = getCreatorsAPIClient();
    return client.getAffiliateLink(asin, options);
}
