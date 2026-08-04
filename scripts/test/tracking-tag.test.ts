/**
 * Per-category Amazon tracking-ID resolver regression test (attribution §6,
 * sister-repo tracking-ID wiring spec).
 *
 * Locks the RULE ORDER documented in src/config/tracking-ids.ts: gift (slug
 * only) → cam → gps → litter → groom → feed → base, bucketed on the guide's
 * `hub:` field + slug — NEVER the species-based `category:` field. Covers
 * every bucket, the gift-first-checked rule, the bird-feeder-camera vs.
 * plain-feeder rule-order collision, and the no-slug (direct /go hit) →
 * base fallback.
 *
 * Run: `npx tsx scripts/test/tracking-tag.test.ts`.
 */
import { AMAZON_TAGS, resolveTagFromSlugAndHub } from '../../src/config/tracking-ids';

let failures = 0;

function check(name: string, cond: boolean) {
  if (cond) {
    console.log(`  ✓ ${name}`);
  } else {
    console.error(`  ✗ ${name}`);
    failures++;
  }
}

function checkTag(
  label: string,
  slug: string | undefined,
  hub: string | undefined,
  expected: string,
) {
  const got = resolveTagFromSlugAndHub(slug, hub);
  check(`${label}: ${slug ?? '(no slug)'} → ${expected}`, got === expected);
}

console.log('tracking-tag resolver test:');

// Rule 1: gift — slug-only, checked first (must win even if hub would match
// a different bucket).
checkTag('gift (slug only)', 'best-fathers-day-gifts-pet-dads-2026', undefined, AMAZON_TAGS.gift);
checkTag(
  'gift wins over hub bucket',
  'best-litter-box-gift-bundle-2026',
  'automatic-litter-box-systems',
  AMAZON_TAGS.gift,
);

// Rule 2: cam — bird-feeder OR camera OR cam\b, via hub or slug. The
// rule-order case: a bird-feeder guide is CAM, never FEED, even though
// "feeder" also matches the feed regex later in the chain.
checkTag('cam: camera in slug', 'best-pet-cameras-2026', 'pet-home-systems-cleanup-travel', AMAZON_TAGS.cam);
checkTag('cam: cellular camera, no hub', 'best-cellular-no-wifi-pet-cameras-2026', undefined, AMAZON_TAGS.cam);
checkTag(
  'cam: bird-feeder-camera slug beats feed bucket (rule order)',
  'best-bird-feeder-camera-2026',
  undefined,
  AMAZON_TAGS.cam,
);
checkTag(
  'cam: smart bird feeder, hub matches too',
  'best-smart-bird-feeders-2026',
  'smart-bird-feeders-backyard-birdwatching',
  AMAZON_TAGS.cam,
);
checkTag('cam: bird-feeder accessory (no camera), still CAM per literal regex', 'best-bird-feeder-pole-systems-baffles-2026', undefined, AMAZON_TAGS.cam);
checkTag('cam: cam\\b word boundary', 'best-outdoor-cam-mounts-2026', undefined, AMAZON_TAGS.cam);
// Known spec-literal quirk: /cam\b/i only anchors the trailing boundary, not
// the leading one, so any slug ending "...cam" (e.g. "scam") also matches —
// this mirrors the spec's regex verbatim (sister-tracking-wiring-spec.md
// petpalhq-next section, rule 2) and is not something this resolver corrects.
// No real guide slug in this corpus triggers it; documented, not asserted-safe.
check(
  'cam: spec-literal cam\\b quirk also matches trailing "...cam" substrings (e.g. "scam") — documented, not fixed',
  resolveTagFromSlugAndHub('scam-alert-2026', undefined) === AMAZON_TAGS.cam,
);

// Rule 3: gps/tracker/collar
checkTag('gps: dog gps trackers, no hub', 'best-dog-gps-trackers-2026', undefined, AMAZON_TAGS.gps);
checkTag('gps: collar via hub only', 'fi-vs-tractive-dog-gps-comparison-2026', 'gps-tracking-comparison', AMAZON_TAGS.gps);
checkTag('gps: training e-collar', 'best-gps-dog-training-e-collar-systems-2026', undefined, AMAZON_TAGS.gps);

// Rule 4: litter
checkTag('litter: self-cleaning boxes, hub set', 'best-self-cleaning-litter-boxes-large-multi-cat-2026', 'automatic-litter-box-systems', AMAZON_TAGS.litter);
checkTag('litter: hub-only match (litter not in slug)', 'litter-robot-5-vs-litter-robot-4-2026', undefined, AMAZON_TAGS.litter);

// Rule 5: groom/dental/shedding
checkTag('groom: brushes/shedding, hub set', 'best-dog-brushes-shedding-mats', 'cat-dog-grooming-dental-shedding', AMAZON_TAGS.groom);
checkTag('groom: dental care, no hub', 'best-pet-dental-care-products-dogs-cats', undefined, AMAZON_TAGS.groom);

// Rule 6: feeder/fountain/nutrition/hydration (checked AFTER cam, so a bare
// "feeder"/"fountain" slug with no bird/camera signal lands here).
checkTag('feed: automatic pet feeders, hub set', 'best-automatic-pet-feeders-2026', 'cat-dog-nutrition-hydration-digestive-health', AMAZON_TAGS.feed);
checkTag('feed: cat water fountains, no hub', 'best-cat-water-fountains-2026', undefined, AMAZON_TAGS.feed);
checkTag('feed: hydration in hub only', 'some-hydration-adjacent-slug-2026', 'cat-dog-nutrition-hydration-digestive-health', AMAZON_TAGS.feed);

// Rule 7: else → base (unknown / aquarium / reptile / behavior buckets have
// no dedicated tracking ID).
checkTag('base: aquarium filtration, unrelated hub', 'best-aquarium-hang-on-back-filters-2026', 'aquarium-filtration-maintenance-systems', AMAZON_TAGS.base);
checkTag('base: reptile habitat', 'best-reptile-heat-lamps-basking-fixtures-2026', 'reptile-habitat-environmental-control', AMAZON_TAGS.base);
checkTag('base: behavior/enrichment', 'best-dog-puzzle-toys-treat-dispensing-2026', 'cat-dog-behavior-anxiety-enrichment', AMAZON_TAGS.base);
checkTag('base: no hub, no keyword match', 'some-unrelated-guide-2026', undefined, AMAZON_TAGS.base);

// No `?s=` at all (direct /go hit) → base, regardless of hub.
checkTag('base: no slug at all', undefined, 'automatic-litter-box-systems', AMAZON_TAGS.base);
checkTag('base: empty-string slug treated as no slug', '', undefined, AMAZON_TAGS.base);

// Base tag must stay byte-identical to today's site config value.
check('base tag is byte-identical to petpalhq08-20', AMAZON_TAGS.base === 'petpalhq08-20');

if (failures > 0) {
  console.error(`\ntracking-tag test FAILED (${failures} assertion(s)).`);
  process.exit(1);
}
console.log('\ntracking-tag test passed — rule order + every bucket + gift + base fallback verified.');
