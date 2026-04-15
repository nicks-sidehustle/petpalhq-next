/**
 * Structured data (JSON-LD) builder for PetPalHQ
 *
 * Track 1 Phase C / Commit 2 (2026-04-15): four entity builders now
 * delegate to @omc/schema's createSchemaBuilders factory, completing
 * network-wide adoption after SHE (Phase B), GGHQ, CGHQ, DGHQ.
 *
 * Scope discipline: four direct passthroughs (Org, WebSite, Person, FAQ).
 * buildArticleGraph stays local — the factory's implementation defaults
 * missing images to `${siteUrl}/og-default.png`, but PPHQ uses Next's
 * dynamic /opengraph-image route and has no og-default.png file. Every
 * current PPHQ guide has an empty `image:` frontmatter field, so
 * delegating Article would inject a broken image reference on every
 * guide page. Preserving the local "no image block when empty" behavior
 * matches pre-refactor JSON-LD byte-equivalently.
 *
 * buildPageGraph / buildPageGraphWithFAQ / buildBreadcrumbList /
 * buildOfferGraph / buildCollectionPage kept local because their output
 * shapes or call-site conventions diverge from the factory's and
 * rewiring would change observable JSON-LD. buildPageGraph + WithFAQ
 * internally compose factory-backed Org/WebSite/Person so those entities
 * still benefit from the shared implementation.
 *
 * All helpers return plain objects — callers are responsible for
 * JSON.stringify and script injection.
 */

import { loadSiteConfig } from '@omc/config';
import { createSchemaBuilders } from '@omc/schema';

const SITE_URL = 'https://petpalhq.com';
const ORG_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;
const PERSON_ID = `${SITE_URL}/#person-rachel-cooper`;

// ─── Bound builder set ────────────────────────────────────────────────────
// Load PPHQ config once at module load; createSchemaBuilders returns a bundle
// of pre-bound builders. Config flows through here; per-call params never
// carry siteUrl/org/person IDs.
// ──────────────────────────────────────────────────────────────────────────

const pphqBuilders = createSchemaBuilders(loadSiteConfig('petpalhq'));

// ---------------------------------------------------------------------------
// Brand → Wikipedia / Wikidata sameAs map
// ---------------------------------------------------------------------------
export const BRAND_SAME_AS_MAP: Record<string, string[]> = {
  Kong: [
    'https://en.wikipedia.org/wiki/Kong_(dog_toy)',
    'https://www.wikidata.org/wiki/Q6428292',
  ],
  KONG: [
    'https://en.wikipedia.org/wiki/Kong_(dog_toy)',
    'https://www.wikidata.org/wiki/Q6428292',
  ],
  PetSafe: [
    'https://en.wikipedia.org/wiki/PetSafe',
    'https://www.wikidata.org/wiki/Q7173574',
  ],
  Ruffwear: [
    'https://en.wikipedia.org/wiki/Ruffwear',
    'https://www.wikidata.org/wiki/Q7378124',
  ],
  Furminator: [
    'https://en.wikipedia.org/wiki/FURminator',
    'https://www.wikidata.org/wiki/Q5411765',
  ],
  'Blue Buffalo': [
    'https://en.wikipedia.org/wiki/Blue_Buffalo_Pet_Products',
    'https://www.wikidata.org/wiki/Q4924983',
  ],
  'Royal Canin': [
    'https://en.wikipedia.org/wiki/Royal_Canin',
    'https://www.wikidata.org/wiki/Q2167820',
  ],
  Purina: [
    'https://en.wikipedia.org/wiki/Nestl%C3%A9_Purina_PetCare',
    'https://www.wikidata.org/wiki/Q1001255',
  ],
  Kurgo: [
    'https://www.wikidata.org/wiki/Q118847049',
  ],
  Chewy: [
    'https://en.wikipedia.org/wiki/Chewy_(company)',
    'https://www.wikidata.org/wiki/Q28799936',
  ],
};

// ---------------------------------------------------------------------------
// Core entity builders
// ---------------------------------------------------------------------------

// Direct passthroughs: four entity builders whose config-driven shape
// unifies cleanly network-wide. Factory reads brand/org/website/person
// from the loaded SiteConfig (config.person.useAffiliationField === true
// on PPHQ causes the factory to emit `affiliation` instead of `worksFor`,
// matching the pre-refactor inline implementation).
export const buildOrganizationEntity = pphqBuilders.buildOrganizationEntity;
export const buildWebSiteEntity = pphqBuilders.buildWebSiteEntity;
export const buildPersonEntity = pphqBuilders.buildPersonEntity;

// ---------------------------------------------------------------------------
// Page-level schema builders
// ---------------------------------------------------------------------------

export interface ArticleInput {
  title: string;
  description: string;
  url: string;
  publishDate?: string;
  updatedDate?: string;
  imageUrl?: string;
}

export function buildArticleGraph(input: ArticleInput) {
  return {
    '@type': 'Article',
    headline: input.title,
    description: input.description,
    url: input.url,
    datePublished: input.publishDate,
    dateModified: input.updatedDate || input.publishDate,
    author: { '@id': PERSON_ID },
    publisher: { '@id': ORG_ID },
    isPartOf: { '@id': WEBSITE_ID },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': input.url,
    },
    ...(input.imageUrl
      ? {
          image: {
            '@type': 'ImageObject',
            url: input.imageUrl,
            width: 1200,
            height: 630,
          },
        }
      : {}),
  };
}

export interface OfferInput {
  name: string;
  price?: string;
  priceCurrency?: string;
  url: string;
  availability?: string;
}

export function buildOfferGraph(input: OfferInput) {
  return {
    '@type': 'Offer',
    name: input.name,
    url: input.url,
    priceCurrency: input.priceCurrency ?? 'USD',
    ...(input.price != null ? { price: input.price } : {}),
    availability: input.availability ?? 'https://schema.org/InStock',
    seller: { '@id': ORG_ID },
  };
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function buildBreadcrumbList(items: BreadcrumbItem[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export interface FAQItem {
  question: string;
  answer: string;
}

export const buildFAQGraph = pphqBuilders.buildFAQGraph;

export interface CollectionPageInput {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
}

export function buildCollectionPage(input: CollectionPageInput) {
  return {
    '@type': 'CollectionPage',
    name: input.title,
    description: input.description,
    url: input.url,
    isPartOf: { '@id': WEBSITE_ID },
    publisher: { '@id': ORG_ID },
    ...(input.imageUrl
      ? {
          image: {
            '@type': 'ImageObject',
            url: input.imageUrl,
          },
        }
      : {}),
  };
}

// ---------------------------------------------------------------------------
// Full @graph assemblers
// ---------------------------------------------------------------------------

export interface PageGraphInput {
  article?: ReturnType<typeof buildArticleGraph>;
  breadcrumb?: ReturnType<typeof buildBreadcrumbList>;
  collectionPage?: ReturnType<typeof buildCollectionPage>;
}

export function buildPageGraph(input: PageGraphInput) {
  const graph = [
    buildOrganizationEntity(),
    buildWebSiteEntity(),
    buildPersonEntity(),
    ...(input.article ? [input.article] : []),
    ...(input.breadcrumb ? [input.breadcrumb] : []),
    ...(input.collectionPage ? [input.collectionPage] : []),
  ];

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}

export interface PageGraphWithFAQInput extends PageGraphInput {
  faq: FAQItem[];
}

export function buildPageGraphWithFAQ(input: PageGraphWithFAQInput) {
  const base = buildPageGraph(input);
  return {
    ...base,
    '@graph': [...base['@graph'], buildFAQGraph(input.faq)],
  };
}
