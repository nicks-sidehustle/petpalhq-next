/**
 * Per-category Amazon tracking-ID resolver (attribution §6, sister-repo
 * tracking-ID wiring spec).
 *
 * PetPalHQ is guide-picks / markdown based — there is no consensus product
 * registry keyed by category, so buckets are derived from the GUIDE the
 * click originated on: its slug and its `hub:` frontmatter field (the
 * parent hub-guide's slug for spoke guides). The species-based `category:`
 * frontmatter field (Cats & Dogs / Aquarium / Reptile / etc.) CANNOT express
 * product-type buckets and must never be used here.
 *
 * RULE ORDER MATTERS (checked in this order, first match wins):
 *   1. slug matches /gift/i                              → gift
 *   2. hub or slug matches /(bird.?feeder|camera|cam\b)/i → cam
 *      (bird-feeder cams are CAM, not feed)
 *   3. hub or slug matches /(gps|tracker|collar)/i        → gps
 *   4. hub or slug matches /litter/i                      → litter
 *   5. hub or slug matches /(groom|dental|shedding)/i     → groom
 *   6. hub or slug matches /(feeder|fountain|nutrition|hydration)/i → feed
 *   7. else                                                → base
 *
 * A missing slug (no `?s=` on the /go hit) always resolves to base.
 */
import { siteConfig } from "@/config/site";
import { getGuideHubBySlug } from "@/lib/guide-links";

export const AMAZON_TAGS = {
  base: siteConfig.amazonTag, // petpalhq08-20 — byte-identical to today's value
  gps: "petpalgps-20",
  cam: "petpalcam-20",
  litter: "petpallitter-20",
  feed: "petpalfeed-20",
  groom: "petpalgroom-20",
  gift: "petpalgift-20",
} as const;

const GIFT_RE = /gift/i;
const CAM_RE = /(bird.?feeder|camera|cam\b)/i;
const GPS_RE = /(gps|tracker|collar)/i;
const LITTER_RE = /litter/i;
const GROOM_RE = /(groom|dental|shedding)/i;
const FEED_RE = /(feeder|fountain|nutrition|hydration)/i;

/**
 * Pure bucket resolver — no fs access, unit-testable in isolation. Given a
 * guide's slug and its (possibly undefined) `hub:` field, returns the
 * Amazon tracking tag for that guide's product-type bucket.
 */
export function resolveTagFromSlugAndHub(
  slug: string | undefined,
  hub: string | undefined,
): string {
  if (!slug) return AMAZON_TAGS.base;

  // Rule 1: gift is slug-only, checked first.
  if (GIFT_RE.test(slug)) return AMAZON_TAGS.gift;

  const haystack = `${hub ?? ""} ${slug}`;

  if (CAM_RE.test(haystack)) return AMAZON_TAGS.cam;
  if (GPS_RE.test(haystack)) return AMAZON_TAGS.gps;
  if (LITTER_RE.test(haystack)) return AMAZON_TAGS.litter;
  if (GROOM_RE.test(haystack)) return AMAZON_TAGS.groom;
  if (FEED_RE.test(haystack)) return AMAZON_TAGS.feed;

  return AMAZON_TAGS.base;
}

/**
 * Resolves the Amazon tracking tag for a `/go/{id}?s={slug}` hit — looks up
 * the guide's `hub:` field via the memoized guide-links map, then applies
 * the rule-order bucket match above. No `?s=` (slug undefined) → base.
 */
export function resolveTagForSlug(slug: string | undefined): string {
  if (!slug) return AMAZON_TAGS.base;
  const hub = getGuideHubBySlug(slug);
  return resolveTagFromSlugAndHub(slug, hub);
}

/**
 * Common cross-repo resolver shape (see sister-tracking-wiring-spec.md).
 * PetPalHQ's `category:` frontmatter is species-based (Cats & Dogs /
 * Aquarium / Reptile / etc.) and cannot express product-type buckets, so
 * `category` is intentionally ignored here — bucketing is slug/hub only,
 * via `resolveTagForSlug`. Kept for API parity with sister repos that DO
 * bucket on category.
 */
export function resolveTag(
  _category?: string,
  slugOrName?: string,
): string {
  return resolveTagForSlug(slugOrName);
}
