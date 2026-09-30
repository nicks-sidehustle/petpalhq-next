/**
 * sponsored-rail.ts — selects SPCC products for the guide side rail
 * (owner 2026-09-29).
 *
 * SPCC = Amazon Creator Connections "Sponsored Products for Creators"
 * campaigns (Creator Connections > Accepted tab, type=spcc). This is the ONLY
 * Creator Connections campaign type used here: no Affiliate+ campaigns, and
 * nothing from any other Creator Connections campaign type.
 *
 * Data: data/sponsored-rail.json — accepted SPCC pet campaigns, with `name`
 * and `image` taken from the Creators API lookup. It carries NO price field by
 * design: the rail unit never shows a price, so nothing here is subject to the
 * live-read / price-stamp rules, and it is separate from the guides' own
 * pick/price data.
 *
 * Selection (owner 2026-09-29: "The main purpose of side rails is to get the
 * cookies set for those readers. High ppc is good, but most likely to get a
 * click is even better."): click likelihood first, EPC only as a tiebreak.
 * After the animal-fit filter (guideAnimals, unchanged), the pool is sorted by
 *   (a) topical relevance to the guide  — topicRelevance(): the product's
 *       `topics` against the guide's slug/category, title and keywords through the
 *       explicit SPONSORED_TOPIC_TOKENS mapping below (no runtime judgment);
 *   (b) `appeal` — broad everyday-purchase appeal, high before low (set per
 *       product in the data file, documented there);
 *   (c) campaign EPC desc (null last);
 *   (d) ASIN.
 * Walking that order, a product whose `family` is already in the unit is
 * skipped: at most ONE product per brand/product family per guide (owner
 * 2026-09-29; e.g. never two PetSafe ScoopFree litter scents).
 * Deterministic (no Math.random()). Products tied on (a)-(c) rotate by a hash
 * of the guide slug, so guides that tie do not all show the same order; the
 * rotation never lets a lower-ranked product jump a higher-ranked one.
 */

import sponsoredRailData from "../../../data/sponsored-rail.json";

export type SponsoredAnimal = "dog" | "cat" | "multi" | "bird" | "small-pet";

export type SponsoredAppeal = "high" | "low";

export interface SponsoredRailProduct {
  asin: string;
  brand: string | null;
  animal: SponsoredAnimal | null;
  /** Product type(s); keys of SPONSORED_TOPIC_TOKENS. */
  topics: string[];
  /** Broad everyday-purchase appeal (see appealNote in the data file). */
  appeal: SponsoredAppeal;
  /**
   * Brand product line (see familyNote in the data file). Variants of one line
   * (scents, colors, sizes, filter fits) share it; a unit shows at most one
   * product per family (owner 2026-09-29).
   */
  family: string;
  /**
   * Campaign's advertised "Up to" earnings per click, USD. SPCC pays the
   * brand's per-click rate on qualifying clicks, not a commission. Never rendered.
   */
  epc: number | null;
  name: string;
  image: string;
}

export const SPONSORED_RAIL_PRODUCTS: SponsoredRailProduct[] =
  sponsoredRailData.products as SponsoredRailProduct[];

/** Subtag (st=) + CLL position (p=) for every rail SPCC click. */
export const SPONSORED_RAIL_PLACEMENT = "rail_spcc";

/** data-sponsored-unit marker: the unit carries SPCC products only. */
export const SPONSORED_UNIT_MARKER = "spcc";

/**
 * Topic -> guide words (owner 2026-09-29). A product is topically relevant to
 * a guide when a word listed for one of its `topics` appears in the guide's
 * slug, title, category or keywords. Words are matched as whole normalized
 * tokens (lowercase, simple plural stripped: see normalizeToken), so every
 * word here is written in its normalized form (the gate checks this).
 * Generic words (dog, cat, pet, best, guide, year) are deliberately absent.
 */
export const SPONSORED_TOPIC_TOKENS: Readonly<Record<string, readonly string[]>> = {
  food: ["food", "diet", "kibble", "nutrition", "meal", "topper", "feeder", "feeding", "eater", "picky"],
  calming: ["calming", "anxiety", "anxiou", "stress", "separation", "pheromone", "diffuser", "fear", "firework", "thunder", "decompression", "noise"],
  litter: ["litter"],
  dental: ["dental", "teeth", "tooth", "oral", "breath", "plaque", "toothpaste"],
  chew: ["chew", "chewer", "chewing", "teething", "antler", "bone"],
  toy: ["toy", "play", "enrichment", "puzzle", "boredom", "fetch", "ball", "catnip", "squeaky"],
  puppy: ["puppy", "puppie", "teething"],
  crate: ["crate", "whining", "sleep"],
  grooming: ["grooming", "groom", "brush", "shedding", "deshedding", "dematting", "undercoat", "coated", "bath", "bathing", "shampoo"],
  skin: ["skin", "itch", "itchy", "allergy", "allergie", "dermatiti"],
  "hair-cleanup": ["hair", "fur", "lint", "shedding", "dander", "vacuum"],
  odor: ["odor", "smell", "urine", "stain", "deodorizer", "pee", "cleanup", "carpet", "extractor"],
  yard: ["yard", "backyard", "kennel", "outdoor", "patio", "turf", "lawn"],
  car: ["car", "seat", "travel", "road", "trip", "cargo", "booster", "rv", "hammock", "vehicle"],
  weather: ["rain", "raincoat", "winter", "cold", "snow", "jacket", "weather"],
  "summer-heat": ["hot", "pavement", "summer", "heat", "heatstroke", "hiking", "boot", "shoe", "cooling"],
  paw: ["paw", "mud", "muddy"],
  joint: ["joint", "arthriti", "mobility", "hip", "senior", "aging"],
  supplement: ["supplement", "vitamin", "probiotic"],
  ear: ["ear"],
  wipe: ["wipe", "hygiene"],
  walk: ["harness", "leash", "walk", "walking", "pull", "pulling"],
  parasite: ["worm", "deworm", "dewormer", "parasite", "flea", "tick"],
  diaper: ["diaper", "incontinence", "potty", "housetraining"],
  water: ["fountain", "hydration", "drinking", "filter", "bucket"],
  bowl: ["bowl", "feeding", "feeder", "mess", "messy", "mealtime", "slow"],
  door: ["door", "latch", "gate", "proofing", "stealing"],
  window: ["window", "perch", "indoor"],
  scratch: ["scratch", "scratcher", "scratching", "furniture", "tree"],
  training: ["training", "train", "trainer", "bark", "barking", "behavior", "correction", "recall", "jumping"],
  fashion: ["bandana", "bowtie", "costume", "halloween", "holiday", "photo", "birthday", "gift", "christma", "party", "outfit"],
  respiratory: ["cough", "throat", "respiratory", "trachea", "collapse"],
  "bird-feeder": ["feeder", "cardinal", "wild", "backyard", "birdwatching", "songbird"],
  hummingbird: ["hummingbird", "nectar"],
  "small-pet": ["hideaway", "hay", "rabbit", "guinea", "hamster"],
  horse: ["horse", "equine"],
};

/**
 * Lowercase and strip a simple plural so "toys"/"toy", "feeders"/"feeder",
 * "brushes"/"brush", "harnesses"/"harness", "puppies"/"puppie",
 * "arthritis"/"arthriti" meet; "-ss" words (stress, harness) are kept. Deliberately crude and
 * deterministic; the mapping above is written in this normalized form.
 */
export function normalizeToken(w: string): string {
  const t = w.toLowerCase();
  if (t.length > 4 && /(ches|shes|xes|sses)$/.test(t)) return t.slice(0, -2);
  if (t.length > 3 && t.endsWith("s") && !t.endsWith("ss")) return t.slice(0, -1);
  return t;
}

const tokensOf = (text: string | null | undefined): Set<string> =>
  new Set((text ?? "").split(/[^a-zA-Z]+/).filter(Boolean).map(normalizeToken));

/** The guide text topical relevance is read from. */
export interface GuideTopicText {
  slug: string;
  title?: string | null;
  category?: string | null;
  keywords?: readonly string[] | null;
}

/**
 * Topical relevance of one product to one guide. For each of the product's
 * topics, the strongest place a topic word appears scores:
 *   +100  in the guide's slug or category (the page's own subject),
 *   +10   in the guide's title only,
 *   +1    in the guide's keywords only (secondary search phrases),
 *   0     nowhere.
 * Higher is more relevant. A product has at most 4 topics, so each tier
 * always outranks any number of hits in the tier below (e.g. on the dental
 * guide the dental powder, a slug match, beats wipes named only in the title).
 */
export function topicRelevance(product: Pick<SponsoredRailProduct, "topics">, guide: GuideTopicText): number {
  const inSlug = new Set([...tokensOf(guide.slug), ...tokensOf(guide.category)]);
  const inTitle = tokensOf(guide.title);
  const inKeywords = tokensOf((guide.keywords ?? []).join(" "));
  let score = 0;
  for (const topic of product.topics ?? []) {
    const words = SPONSORED_TOPIC_TOKENS[topic] ?? [];
    if (words.some((w) => inSlug.has(w))) score += 100;
    else if (words.some((w) => inTitle.has(w))) score += 10;
    else if (words.some((w) => inKeywords.has(w))) score += 1;
  }
  return score;
}

const APPEAL_RANK: Record<SponsoredAppeal, number> = { high: 1, low: 0 };

/**
 * Wild-bird feeding guides (owner ruling 2026-09-29): "Bird pages: show the
 * feeders only on guides about wild-bird feeding; other bird-category pages
 * (coops, parrots, baths, aviaries, chickens) show no sponsored unit."
 * The only bird campaigns are wild-bird feeders, so bird products are matched
 * by this explicit slug allowlist, never by category. Every other Birds guide
 * renders nothing. Add a slug here only for a guide about feeding wild birds.
 */
export const WILD_BIRD_FEEDING_SLUGS: ReadonlySet<string> = new Set([
  "best-hummingbird-feeders-2026",
  "best-smart-bird-feeders-2026",
  "best-squirrel-proof-bird-feeders-2026",
  "smart-bird-feeders-backyard-birdwatching",
  "best-bird-feeder-pole-systems-baffles-2026",
]);

const DOG_WORDS = new Set(["dog", "dogs", "puppy", "puppies"]);
const CAT_WORDS = new Set(["cat", "cats", "kitten", "kittens"]);

/** Dog/cat named explicitly by whole words in the slug (e.g. "trim-your-dogs-nails"). */
export function slugAnimals(slug: string): Array<"dog" | "cat"> {
  const words = slug.toLowerCase().split(/[^a-z]+/);
  const out: Array<"dog" | "cat"> = [];
  if (words.some((w) => DOG_WORDS.has(w))) out.push("dog");
  if (words.some((w) => CAT_WORDS.has(w))) out.push("cat");
  return out;
}

/**
 * Map a guide to the campaign animals it fits (owner 2026-09-29, W4 #209):
 *  - Wild-bird feeding guides (allowlist above) -> ["bird"]; any other Birds
 *    guide -> nothing.
 *  - Dog/cat comes from the guide's `species`, narrowed by the slug: a slug
 *    that names only dogs (or only cats) is a dog-only (cat-only) guide even
 *    when its frontmatter lists both, so it never gets the other animal.
 *  - No `species`: dog/cat only from explicit slug words (dog/puppy, cat/
 *    kitten); neither -> nothing. Category is never used to guess an animal.
 * Aquarium / Reptile / small-pet / uncategorized guides map to nothing, so
 * the unit does not render there.
 */
export function guideAnimals(
  slug: string,
  species: readonly string[] | undefined | null,
  category: string | undefined | null,
): SponsoredAnimal[] {
  if (WILD_BIRD_FEEDING_SLUGS.has(slug)) return ["bird"];
  if ((category ?? "").trim().toLowerCase() === "birds") return [];
  const fromSlug = slugAnimals(slug);
  const fromSpecies = (species ?? []).filter(
    (s): s is "dog" | "cat" => s === "dog" || s === "cat",
  );
  if (fromSpecies.length === 0) return fromSlug;
  // Slug names exactly one of dog/cat: keep only that one.
  if (fromSlug.length === 1) return fromSpecies.filter((a) => a === fromSlug[0]);
  return fromSpecies;
}

/**
 * The guide's own pick ASINs (live and suppressed picks). page.tsx passes
 * these to GuideSideRail so the sponsored unit never shows one of them;
 * scripts/test/sponsored-rail.test.tsx checks that wiring on the real page.
 */
export function guidePickAsins(guide: {
  picks?: ReadonlyArray<{ asin?: string | null }> | null;
  suppressedPicks?: ReadonlyArray<{ asin?: string | null }> | null;
}): string[] {
  return [...(guide.picks ?? []), ...(guide.suppressedPicks ?? [])]
    .map((p) => p.asin)
    .filter((a): a is string => Boolean(a));
}

/** djb2 string hash — deterministic, no Math.random(). */
function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * Up to `limit` SPCC products for a guide. `multi` campaigns fit dog and cat
 * guides. ASINs in `excludeAsins` (the guide's own picks) are never shown.
 * Ranking: topical relevance, then appeal, then EPC, then ASIN; exact ties on
 * (relevance, appeal, EPC) rotate by a slug hash. A product whose family is
 * already chosen is skipped. Returns [] when nothing matches the guide's animals.
 */
export function selectSponsoredRailProducts(
  args: {
    slug: string;
    animals: readonly SponsoredAnimal[];
    excludeAsins?: Iterable<string>;
    title?: string | null;
    category?: string | null;
    keywords?: readonly string[] | null;
  },
  products: readonly SponsoredRailProduct[] = SPONSORED_RAIL_PRODUCTS,
  limit = 3,
): SponsoredRailProduct[] {
  const exclude = new Set(args.excludeAsins ?? []);
  const fitsDogOrCat = args.animals.some((a) => a === "dog" || a === "cat");
  const guide: GuideTopicText = { slug: args.slug, title: args.title, category: args.category, keywords: args.keywords };
  const scored = products
    .filter((p) => {
      if (!p.animal || exclude.has(p.asin)) return false;
      if (args.animals.includes(p.animal)) return true;
      return p.animal === "multi" && fitsDogOrCat;
    })
    .map((p) => ({
      p,
      key: [topicRelevance(p, guide), APPEAL_RANK[p.appeal] ?? 0, p.epc ?? -1] as const,
    }))
    .sort(
      (a, b) =>
        b.key[0] - a.key[0] || b.key[1] - a.key[1] || b.key[2] - a.key[2] || a.p.asin.localeCompare(b.p.asin),
    );
  if (scored.length === 0) return [];
  // Rotate within each run of exact ties on (relevance, appeal, EPC) only.
  const h = hashString(args.slug);
  const ordered: SponsoredRailProduct[] = [];
  for (let i = 0; i < scored.length; ) {
    let j = i + 1;
    while (j < scored.length && scored[j].key.every((v, k) => v === scored[i].key[k])) j++;
    const run = scored.slice(i, j).map((x) => x.p);
    const start = h % run.length;
    for (let r = 0; r < run.length; r++) ordered.push(run[(start + r) % run.length]);
    i = j;
  }
  // At most one product per family (owner 2026-09-29): skip later products of
  // a family already chosen; order is otherwise unchanged.
  const chosen: SponsoredRailProduct[] = [];
  const families = new Set<string>();
  for (const p of ordered) {
    const family = p.family || p.asin;
    if (families.has(family)) continue; // family skip
    families.add(family);
    chosen.push(p);
    if (chosen.length >= limit) break;
  }
  return chosen;
}
