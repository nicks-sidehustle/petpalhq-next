# ChristmasGearHQ Product Freshness Plan

## Purpose

Add product freshness and affiliate trust signals before refreshing flagship buying guides.

## Current state

The refreshed audit currently finds:

- Product entries parsed by audit: 10
- Products missing Amazon tag `xmasgearhq-20`: 0
- Products missing `lastVerified`: 0
- Products with categories outside `src/config/site.ts`: 0
- Duplicate ASINs: 0

`src/data/products.ts` now includes baseline fields:

```ts
lastVerified: string;
availabilityStatus: "available" | "unavailable" | "unknown";
retailer: "amazon";
```

## Future product model additions

After affiliate primitives are centralized, consider:

```ts
bestFor?: string;
priceBand?: "budget" | "midrange" | "premium";
offers?: Array<{
  retailer: "amazon" | "target" | "walmart" | "home-depot" | "lowes" | "wayfair" | "brand";
  url: string;
  price?: number;
  lastVerified: string;
  availabilityStatus: "available" | "unavailable" | "unknown";
}>;
```

Do not add multi-retailer support until the affiliate/link component is centralized.

## Freshness rules

### Off-season
- Product availability check every 90 days.
- Update `lastVerified` after checks.

### Peak season, October–December
- High-value guides: every 14–30 days.
- Products in flagship guides: every 14 days.
- Last-minute/shipping content: weekly if published.

### January storage season
- Storage products: every 30 days through January.
- Clearance/deal content: only if actively maintained.

## Guide display rules

Guide/product cards should show:

- Last verified date.
- Availability status if unknown/unavailable.
- A neutral CTA such as “Check current price.”
- A clear drawback before CTA.

Avoid:

- Fake urgency.
- “Best” claims with stale products.
- Retailer-copy product descriptions.

## Affiliate link rules

Affiliate CTAs should render through `src/components/affiliate/AffiliateLink.tsx`, which enforces:

```tsx
rel="sponsored noopener noreferrer"
target="_blank"
```

It also tracks an `affiliate_click` event with product, retailer, and placement metadata when GA is available.

## Acceptance criteria

- Product freshness fields exist for current products.
- Audit scripts report freshness status.
- Live availability verification is deferred until network/API access is available.
