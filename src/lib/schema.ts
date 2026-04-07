/**
 * Structured data (JSON-LD) builder for PetPalHQ
 * All helpers return plain objects — callers are responsible for JSON.stringify and script injection.
 */

const SITE_URL = 'https://petpalhq.com';
const ORG_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;
const PERSON_ID = `${SITE_URL}/#person-rachel-cooper`;

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

export function buildOrganizationEntity() {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: 'PetPalHQ',
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/opengraph-image`,
      width: 1200,
      height: 630,
    },
    sameAs: [
      'https://twitter.com/petpalhq',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'hello@petpalhq.com',
      contactType: 'customer support',
    },
  };
}

export function buildWebSiteEntity() {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: 'PetPalHQ',
    url: SITE_URL,
    publisher: { '@id': ORG_ID },
    // SearchAction removed — no /search page exists yet
  };
}

export function buildPersonEntity() {
  return {
    '@type': 'Person',
    '@id': PERSON_ID,
    name: 'Rachel Cooper',
    jobTitle: 'Senior Pet Editor',
    description:
      'Rachel Cooper is a former vet tech with 10+ years of experience covering pet gear, nutrition, and health. She has tested hundreds of products to help pet owners make informed buying decisions.',
    url: `${SITE_URL}/author/rachel-cooper`,
    image: `${SITE_URL}/images/authors/rachel-cooper.jpg`,
    knowsAbout: [
      'Dog Harnesses & Leashes',
      'Cat Feeders & Toys',
      'Pet Nutrition',
      'Small Animal Care',
      'Pet Travel Gear',
      'Veterinary Wellness',
    ],
    affiliation: { '@id': ORG_ID },
  };
}

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

export function buildFAQGraph(items: FAQItem[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

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
