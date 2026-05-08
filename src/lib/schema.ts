/**
 * Structured data (JSON-LD) builder for PetPalHQ
 *
 * Track 1 Phase C / Commit 2 (2026-04-15): four entity builders and the
 * Article portion of buildPageGraph now delegate to @omc/schema's
 * createSchemaBuilders factory, matching the pattern SHE adopted in
 * Phase B and GardenGearHQ adopted earlier today (see those sites'
 * src/lib/schema.ts for the reference implementations).
 *
 * Scope discipline: this commit delegates only the builders whose output
 * shape can be unified network-wide without breaking CGHQ's consumers.
 * CGHQ-specific shapes (Offer graph that wraps Product, CollectionPage
 * with graph-wrapper-or-single branching, Breadcrumb using `url` field
 * name) stay local — porting them would widen the diff across 11 call
 * sites without changing observable behavior.
 *
 * One pre-existing JSON-LD gap is fixed here: the local buildPageGraph
 * previously referenced ${PERSON_ID} in Article.author without emitting
 * the corresponding Person entity in the @graph (broken @id reference).
 * The factory-backed buildArticleGraph uses dual-author [Organization,
 * Person], and the composed @graph now includes Person so every @id is
 * resolvable.
 *
 * SITE_URL is re-exported as a plain constant (rather than derived from
 * loadSiteConfig) because 11 callsites import it directly; a hardcoded
 * constant matches the config's siteUrl exactly and avoids a module-load-
 * time dependency on @omc/config for files that don't otherwise need it.
 *
 * All helpers return plain objects — callers are responsible for
 * JSON.stringify and script injection.
 */

import { loadSiteConfig } from '@omc/config';
import {
  createSchemaBuilders,
  type ArticleGraphInput as SharedArticleGraphInput,
} from '@omc/schema';

// Re-export the shared FAQ item type so callers keep importing it from
// '@/lib/schema' without change. The shape is identical network-wide.
export type { FAQItem } from '@omc/schema';

export const SITE_URL = 'https://petpalhq.com';

// ─── Bound builder set ────────────────────────────────────────────────────
// Load PetPalHQ config once at module load; createSchemaBuilders returns a
// bundle of pre-bound builders. Config flows through here; per-call params
// never carry siteUrl/org/person IDs.
//
// Persona override: the upstream omc-config petpalhq.json still names
// "Rachel Cooper" (Loyal & Found era). PetPalHQ v2 uses the network-wide
// "Nick Miles, Chief Editor" persona. We override here at the consumer
// rather than re-publishing omc-config, so the upstream package can be
// updated on its own cadence without blocking the v2 launch.
// ──────────────────────────────────────────────────────────────────────────

const baseConfig = loadSiteConfig('petpalhq');
const petpalConfig = {
  ...baseConfig,
  person: {
    ...baseConfig.person,
    id: 'https://petpalhq.com/#person-nick-miles',
    name: 'Nick Miles',
    jobTitle: 'Chief Editor',
    description:
      'Nick Miles is the chief editor of PetPalHQ. He leads a network of expert-review publications that synthesize consensus from veterinarians, aquarists, herpetologists, and ornithologists to identify the gear that genuinely earns professional agreement.',
    url: 'https://petpalhq.com/author/nick-miles',
    image: 'https://petpalhq.com/images/authors/nick-miles.jpg',
    knowsAbout: [
      'Aquarium Setup & Water Quality',
      'Aquarium Filtration & Maintenance',
      'Reptile Habitat & Husbandry',
      'Reptile UVB Lighting & Heat',
      'Smart Bird Feeders',
      'Backyard Birdwatching Gear',
      'Exotic Pet Health',
    ],
  },
};
const cghqBuilders = createSchemaBuilders(petpalConfig);

// ─── Direct passthroughs ──────────────────────────────────────────────────
// No input augmentation; one-line re-exports are exact behavior.

export const buildOrganizationEntity = cghqBuilders.buildOrganizationEntity;
export const buildWebSiteEntity = cghqBuilders.buildWebSiteEntity;
export const buildPersonEntity = cghqBuilders.buildPersonEntity;
export const buildFAQGraph = cghqBuilders.buildFAQGraph;

// ---------------------------------------------------------------------------
// Brand → official-site sameAs map
// ---------------------------------------------------------------------------
// Kept local: smart-decor–specific lookup for BrandSameAs in buildOfferGraph
// below. If spoke-specific brand enrichment ever flows through @omc/schema,
// this migrates to the shared package or to a site-config field.
export const BRAND_SAME_AS_MAP: Record<string, string> = {
  // Aquarium brands
  'API': 'https://apifishcare.com',
  'Seachem': 'https://www.seachem.com',
  'Fluval': 'https://www.fluvalaquatics.com',
  'AquaClear': 'https://www.aquaclearfilters.com',
  'Tetra': 'https://www.tetra-fish.com',
  "DrTim's Aquatics": 'https://drtimsaquatics.com',
  'Fritz Aquatics': 'https://fritzaquatics.com',
  'hygger': 'https://hyggertank.com',
  'Aqueon': 'https://www.aqueon.com',
  'Python Products': 'https://pythonproducts.com',
  // Reptile brands
  'Zoo Med': 'https://zoomed.com',
  'Exo Terra': 'https://www.exo-terra.com',
  'Arcadia Reptile': 'https://www.arcadiareptile.com',
  'Fluker Farms': 'https://www.flukerfarms.com',
  // Bird brands
  'Bird Buddy': 'https://mybirdbuddy.com',
  'Birdfy': 'https://birdfy.com',
  'Wild Birds Unlimited': 'https://www.wbu.com',
  'Audubon': 'https://www.audubon.org',
};

// ---------------------------------------------------------------------------
// Article — delegated to @omc/schema via input-shape adapter
// ---------------------------------------------------------------------------
// The factory's buildArticleGraph takes { slug, title, excerpt, publishDate,
// updatedDate?, image? } and a site-root-relative `image` path (it prepends
// siteUrl). CGHQ's public API has historically taken { title, description,
// url, image, datePublished, dateModified, authorName } where `url` is
// fully-qualified and `image` may be fully-qualified. The adapter below
// translates once, at one callsite (buildArticleGraph + the article branch
// of buildPageGraph), so no downstream code changes.

export interface ArticleGraphInput {
  title: string;
  description: string;
  /** Fully-qualified canonical URL, e.g. `${SITE_URL}/guides/${slug}`. */
  url: string;
  /** Fully-qualified URL or site-root-relative path. */
  image?: string;
  datePublished?: string;
  dateModified?: string;
  /**
   * Retained for API stability. Ignored by the factory-backed implementation,
   * which derives author from the loaded site config
   * (`petpalhq.person.name`, overridden to "Nick Miles" above). No current caller passes this.
   */
  authorName?: string;
}

const OWN_HOSTNAME = new URL(SITE_URL).hostname;

/**
 * Classify an image URL into one of three shapes the factory can handle.
 *
 * - `external`: fully-qualified URL on a different host (e.g. Unsplash CDN).
 *   The factory's `${SITE_URL}${input.image}` concat would produce a
 *   broken URL, so the caller passes `undefined` to the factory and
 *   overrides the returned Article's `image` field with the full URL.
 * - `same-host`: fully-qualified URL on our own host (bare or www subdomain).
 *   Stripped to pathname so the factory's siteUrl-prepend produces a clean
 *   bare-host URL, resolving the bare↔www inconsistency SHE + GGHQ also
 *   normalized during their factory adoption.
 * - `relative`: site-root-relative path (starts with `/`). Passed through
 *   unchanged; factory will prepend siteUrl as designed.
 */
function classifyImage(image: string | undefined): {
  kind: 'external' | 'same-host' | 'relative' | 'none';
  forFactory: string | undefined;
  original: string | undefined;
} {
  if (!image) return { kind: 'none', forFactory: undefined, original: undefined };
  if (!/^https?:\/\//.test(image)) {
    return { kind: 'relative', forFactory: image, original: image };
  }
  const parsed = new URL(image);
  if (parsed.hostname === OWN_HOSTNAME || parsed.hostname === `www.${OWN_HOSTNAME}`) {
    // Strip host so factory's prepend produces the bare-host canonical.
    return { kind: 'same-host', forFactory: parsed.pathname, original: image };
  }
  return { kind: 'external', forFactory: undefined, original: image };
}

/**
 * Translate CGHQ's ArticleGraphInput shape into @omc/schema's shape.
 *
 * `slug` is derived from `input.url`: take the URL's pathname and strip the
 * leading `/guides/` segment. Works for any host variant (www/bare/CDN)
 * because `new URL().pathname` discards the origin.
 */
function adaptArticleInput(
  input: ArticleGraphInput,
  classifiedImage: ReturnType<typeof classifyImage>,
): SharedArticleGraphInput {
  const pathname = new URL(input.url).pathname; // e.g. "/guides/best-advent-calendars-2026"
  const slug = pathname.replace(/^\/guides\//, '').replace(/\/$/, '');
  return {
    slug,
    title: input.title,
    excerpt: input.description,
    publishDate: input.datePublished ?? '',
    updatedDate: input.dateModified,
    image: classifiedImage.forFactory,
  };
}

export function buildArticleGraph(input: ArticleGraphInput) {
  const classified = classifyImage(input.image);
  const article = cghqBuilders.buildArticleGraph(adaptArticleInput(input, classified)) as {
    image: { '@type': 'ImageObject'; url: string; width: number; height: number };
    [key: string]: unknown;
  };
  if (classified.kind === 'external' && classified.original) {
    // Preserve external-CDN URL (e.g. Unsplash) as-is; drop the factory's
    // default 1200x630 dimensions since we can't guarantee them for
    // third-party images. Matches CGHQ's pre-refactor behavior for
    // external images.
    return { ...article, image: { '@type': 'ImageObject', url: classified.original } };
  }
  return article;
}

// ---------------------------------------------------------------------------
// Offer / Product — kept local (different output shape from factory)
// ---------------------------------------------------------------------------
// CGHQ emits @type:Product with nested Offer (seller=Amazon) and nested
// aggregateRating. Factory's buildOfferGraph emits @type:Offer. Different
// shapes; rewiring would break reviews/[category]/[slug] consumers.

export interface OfferGraphInput {
  productName: string;
  description?: string;
  image?: string;
  url: string;
  affiliateUrl: string;
  price?: number;
  priceCurrency?: string;
  brand?: string;
  ratingValue?: number;
  reviewCount?: number;
}

export function buildOfferGraph(input: OfferGraphInput) {
  const brandSameAs = input.brand ? BRAND_SAME_AS_MAP[input.brand] : undefined;

  return {
    '@type': 'Product',
    name: input.productName,
    description: input.description,
    image: input.image,
    url: input.url,
    brand: input.brand
      ? {
          '@type': 'Brand',
          name: input.brand,
          ...(brandSameAs ? { sameAs: brandSameAs } : {}),
        }
      : undefined,
    offers: {
      '@type': 'Offer',
      url: input.affiliateUrl,
      priceCurrency: input.priceCurrency ?? 'USD',
      ...(input.price !== undefined ? { price: input.price.toFixed(2) } : {}),
      availability: 'https://schema.org/InStock',
      seller: {
        '@type': 'Organization',
        name: 'Amazon',
      },
    },
    ...(input.ratingValue !== undefined
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: input.ratingValue,
            bestRating: 10,
            worstRating: 1,
            reviewCount: input.reviewCount ?? 1,
          },
        }
      : {}),
  };
}

// ---------------------------------------------------------------------------
// Pick → Product + Review graph (per guide pick)
// ---------------------------------------------------------------------------
// Per the Growth Marshal Feb 2026 study (Product+Review schema correlates
// with 61.7% citation rate vs 41.6% for generic Article-only schema), every
// pick in a guide should emit a Product node with nested Review and
// AggregateRating. This function bridges the gap between the existing
// buildOfferGraph (which the /reviews routes use) and the per-pick shape
// guide pages need: Product wrapping a Review whose author resolves to the
// site's Person entity by @id, with reviewBody pulled from the editorial
// deep-dive prose so LLMs can extract the actual reasoning.

export interface PickCommunityReview {
  /** Verbatim quote from forum */
  quote: string;
  /** Author handle, e.g. "u/username" or "community member" */
  author: string;
  /** ISO yyyy-mm-dd */
  date: string;
  /** Permalink to the forum post */
  sourceUrl: string;
  /** Human-readable source label, e.g. "r/dogs" */
  sourceLabel: string;
}

export interface PickProductReviewInput {
  /** Pick name (Product.name and itemReviewed.name) */
  productName: string;
  /** Brand name; sameAs lookup applied via BRAND_SAME_AS_MAP if known */
  brand?: string;
  /** Amazon product image CDN URL */
  image?: string;
  /** Pick anchor URL on the guide (e.g., guide.url + '#' + slugifiedName) */
  url: string;
  /** Amazon affiliate URL (built via buildAmazonUrl from the ASIN) */
  affiliateUrl: string;
  /** Numeric price (parsed from "$XX.XX" string) */
  price?: number;
  priceCurrency?: string;
  /** PetPal Gear Score / Pawsome Pop Score / Sun-Ready Score / etc. (0-10) */
  ratingValue?: number;
  /** Editorial deep-dive prose for Review.reviewBody (200-800 words ideal) */
  reviewBody: string;
  /** ISO date string for Review.datePublished and aggregateRating context */
  datePublished?: string;
  /** Pick label (CAPS qualifier, e.g., "BEST PROPORTIONAL FOR REPTILES") */
  reviewName?: string;
  /** Verbatim community quotes from Reddit/forums — become sibling Review nodes in JSON-LD */
  communityReviews?: PickCommunityReview[];
  /**
   * Active promo offer — extends Offer node with priceValidUntil and description.
   * Only populated when the offer is confirmed active (isPromoActive check done at callsite).
   */
  activePromo?: { discount: string; code: string; expiry: string };
}

export function buildPickProductReviewGraph(input: PickProductReviewInput) {
  const brandSameAs = input.brand ? BRAND_SAME_AS_MAP[input.brand] : undefined;

  // Build the editorial Review node
  const editorialReview = input.reviewBody
    ? {
        '@type': 'Review',
        ...(input.reviewName ? { name: input.reviewName } : {}),
        reviewBody: input.reviewBody,
        ...(input.ratingValue !== undefined
          ? {
              reviewRating: {
                '@type': 'Rating',
                ratingValue: input.ratingValue,
                bestRating: 10,
                worstRating: 1,
              },
            }
          : {}),
        author: {
          '@id': petpalConfig.person.id,
        },
        publisher: {
          '@id': `${SITE_URL}/#organization`,
        },
        ...(input.datePublished ? { datePublished: input.datePublished } : {}),
      }
    : null;

  // Build community Review nodes from verbatim ownerVoice quotes.
  // These are siblings to the editorial Review; AggregateRating uses
  // editorial score only — community quotes don't aggregate.
  const communityReviewNodes =
    input.communityReviews?.map((cr) => ({
      '@type': 'Review',
      reviewBody: cr.quote,
      datePublished: cr.date,
      url: cr.sourceUrl,
      author: {
        '@type': 'Person',
        name: cr.author,
      },
      publisher: {
        '@type': 'Organization',
        name: 'Reddit',
        url: 'https://reddit.com',
      },
    })) ?? [];

  // Use array form when community reviews exist, singular when not.
  // Schema.org accepts both; array form is needed for multiple Review nodes.
  const reviewField =
    editorialReview && communityReviewNodes.length > 0
      ? [editorialReview, ...communityReviewNodes]
      : editorialReview && communityReviewNodes.length === 0
        ? editorialReview
        : communityReviewNodes.length > 0
          ? communityReviewNodes
          : null;

  // Build Offer node — extend with promo details when an active promo is supplied.
  // Promo activeness is checked at the callsite via isPromoActive before passing here.
  const offerNode: Record<string, unknown> = {
    '@type': 'Offer',
    url: input.affiliateUrl,
    priceCurrency: input.priceCurrency ?? 'USD',
    ...(input.price !== undefined ? { price: input.price.toFixed(2) } : {}),
    availability: 'https://schema.org/InStock',
    seller: {
      '@type': 'Organization',
      name: 'Amazon',
    },
    ...(input.activePromo
      ? {
          priceValidUntil: input.activePromo.expiry,
          description: input.activePromo.code
            ? `${input.activePromo.discount} with code ${input.activePromo.code}`
            : input.activePromo.discount,
        }
      : {}),
  };

  const product: Record<string, unknown> = {
    '@type': 'Product',
    name: input.productName,
    image: input.image,
    url: input.url,
    ...(input.brand
      ? {
          brand: {
            '@type': 'Brand',
            name: input.brand,
            ...(brandSameAs ? { sameAs: brandSameAs } : {}),
          },
        }
      : {}),
    offers: offerNode,
    ...(input.ratingValue !== undefined
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: input.ratingValue,
            bestRating: 10,
            worstRating: 1,
            reviewCount: 1,
          },
        }
      : {}),
    ...(reviewField !== null ? { review: reviewField } : {}),
  };

  return product;
}

// ---------------------------------------------------------------------------
// BreadcrumbList — kept local (CGHQ uses `url` field, factory uses `item`)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// CollectionPage — kept local (different input shape from factory's)
// ---------------------------------------------------------------------------

export interface CollectionPageInput {
  name: string;
  description: string;
  url: string;
  image?: string;
}

export function buildCollectionPage(input: CollectionPageInput) {
  return {
    '@type': 'CollectionPage',
    '@id': `${input.url}#collectionpage`,
    name: input.name,
    description: input.description,
    url: input.url,
    ...(input.image ? { image: { '@type': 'ImageObject', url: input.image } } : {}),
    isPartOf: { '@id': `${SITE_URL}/#website` },
    publisher: { '@id': `${SITE_URL}/#organization` },
  };
}

// ---------------------------------------------------------------------------
// Full @graph assemblers — kept local. CGHQ's PageGraph takes raw data and
// discriminates by `type`; the factory's equivalent is article-only. Keeping
// these local preserves the three-way type branching that consumers rely on.
// Internally the article branch delegates to factory-backed buildArticleGraph
// via the adapter above, so JSON-LD for Article benefits from the shared
// implementation (dual author, mainEntityOfPage, articleSection, inLanguage,
// image dimensions, factory-computed @id) network-wide.
// ---------------------------------------------------------------------------

export interface PageGraphInput {
  url: string;
  title: string;
  description: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  breadcrumbs?: BreadcrumbItem[];
  type?: 'article' | 'collection' | 'website';
}

export function buildPageGraph(input: PageGraphInput) {
  const graph: object[] = [
    buildOrganizationEntity(),
    buildWebSiteEntity(),
  ];

  if (input.breadcrumbs && input.breadcrumbs.length > 0) {
    graph.push(buildBreadcrumbList(input.breadcrumbs));
  }

  if (input.type === 'article') {
    // Person is referenced by @id inside the factory-backed Article's
    // author[]; emit the Person entity so every @id in the graph resolves.
    graph.push(buildPersonEntity());
    graph.push(
      buildArticleGraph({
        title: input.title,
        description: input.description,
        url: input.url,
        image: input.image,
        datePublished: input.datePublished,
        dateModified: input.dateModified,
      })
    );
  } else if (input.type === 'collection') {
    graph.push(
      buildCollectionPage({
        name: input.title,
        description: input.description,
        url: input.url,
        image: input.image,
      })
    );
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}

export interface PageGraphWithFAQInput extends PageGraphInput {
  faqItems: import('@omc/schema').FAQItem[];
}

export function buildPageGraphWithFAQ(input: PageGraphWithFAQInput) {
  const base = buildPageGraph(input);
  return {
    ...base,
    '@graph': [...(base['@graph'] as object[]), buildFAQGraph(input.faqItems)],
  };
}
