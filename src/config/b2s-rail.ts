/**
 * Back-to-school dorm-pet rail — 2026 season (through ~Labor Day 2026-09-07).
 *
 * Per B2S-RAILS-STRATEGY.md (portfolio-parity program): petpal is a JUDGMENT
 * set — the rail appears ONLY on pages with an honest dorm/small-space bridge,
 * never site-wide. The 2026 set is the 4 guides below (betta/nano tanks, the
 * first-tank checklist, hamster habitats, crested gecko kits). Leopard gecko
 * kits were considered and excluded: that guide's own thesis is a 36x18-inch
 * adult enclosure plus heat fixtures, which is not an honest dorm setup.
 *
 * Honesty rules baked into the copy:
 *  - Most campus housing allows only fish (often with a ~10-gallon cap);
 *    mammal/reptile framing is aimed at student rentals and always carries
 *    the check-your-housing-policy caveat.
 *  - Every card names the exact product (EXACT-PRODUCT CTA law) and reuses a
 *    ranked pick from one of the set's own guides — no new products. All three
 *    ASINs re-verified live via the Amazon Creators API on 2026-07-10.
 *  - Cards carry no images, so pick-image parity is untouched.
 *
 * Measurement: each rail's clicks carry an `st=rail_b2s_{key}` subtag through
 * /go/ (ascsubtag on the Amazon side) plus CLL position tags s={slug}&p=rail_b2s,
 * so CLL can read rail-attributed revenue per page.
 */

export type B2SRailCard = {
  /** Exact product name, as ranked in the source guide. */
  name: string;
  /** ASIN of a shipped guide pick — re-verified live 2026-07-10 (Creators API). */
  asin: string;
  note: string;
  cta: string;
  fromGuide: { slug: string; title: string };
};

export type B2SRailEntry = {
  /** Short key → ascsubtag `rail_b2s_{key}`. */
  key: string;
  heading: string;
  intro: string;
  cards: B2SRailCard[];
};

const NANO_GUIDE = {
  slug: "best-nano-aquarium-kits-2026",
  title: "Best Nano & Betta Aquarium Kits 2026",
};
const CHECKLIST_GUIDE = {
  slug: "new-aquarium-starter-checklist-first-tank-2026",
  title: "New Aquarium Starter Checklist",
};
const HAMSTER_GUIDE = {
  slug: "best-hamster-habitats-cages-2026",
  title: "Best Hamster Habitats & Cages 2026",
};

export const B2S_RAIL: Record<string, B2SRailEntry> = {
  "best-nano-aquarium-kits-2026": {
    key: "nano",
    heading: "Heading to campus? A betta tank is the dorm pet that's usually allowed",
    intro:
      "Most campus housing bans mammals and reptiles but allows fish — typically with a 10-gallon cap that every 5-gallon kit on this page clears. Two cautions from this guide matter even more in a dorm: no kit here ships with a heater, and the water needs testing while a new tank cycles. The test kit below is the same one our first-tank checklist calls the smartest early buy.",
    cards: [
      {
        name: "API Freshwater Master Test Kit",
        asin: "B000255NCI",
        note: "The liquid test kit our first-tank checklist recommends over strips — ammonia, nitrite, nitrate, and pH readings through the critical first weeks of a new tank's cycle, roughly 800 tests per box.",
        cta: "See the API Master Test Kit",
        fromGuide: CHECKLIST_GUIDE,
      },
    ],
  },
  "new-aquarium-starter-checklist-first-tank-2026": {
    key: "checklist",
    heading: "Setting up in a dorm or student apartment?",
    intro:
      "This checklist assumes a 20-gallon build, but campus housing commonly caps tanks at 10 gallons or less. The water-quality trio above applies at any size — and for the tank itself, our nano-kit guide compares the 5-gallon all-in-ones sized for a dorm desk. The Fluval Spec V is the one we'd buy first.",
    cards: [
      {
        name: "Fluval Spec V 5-Gallon Aquarium Kit",
        asin: "B0089E5VLC",
        note: "The 5-gallon etched-glass kit our nano-aquarium guide ranks first — hidden 3-stage filtration and a long horizontal footprint that gives a betta real swim length. Budget another $15 to $25 for a 25-watt nano heater; no kit in this class includes one.",
        cta: "See the Fluval Spec V",
        fromGuide: NANO_GUIDE,
      },
    ],
  },
  "best-hamster-habitats-cages-2026": {
    key: "hamster",
    heading: "Back-to-school note: check the housing policy before the cage",
    intro:
      "A hamster is a classic small-space pet for a student rental — quiet apart from nocturnal wheel time, and the welfare-standard cages on this page fit on a dresser or long desk. But most on-campus dorms allow only fish, so verify the policy before buying an enclosure. If fish it is, a 5-gallon betta kit is the route our nano-aquarium guide maps out.",
    cards: [
      {
        name: "Fluval Spec V 5-Gallon Aquarium Kit",
        asin: "B0089E5VLC",
        note: "The 5-gallon betta kit our nano-aquarium guide would buy first — the dorm pet most campus housing actually permits, on a desk-sized footprint.",
        cta: "See the Fluval Spec V",
        fromGuide: NANO_GUIDE,
      },
    ],
  },
  "best-crested-gecko-kits-2026": {
    key: "crested",
    heading: "Student small-space note: cresties suit apartments; dorms usually don't allow them",
    intro:
      "A crested gecko is genuinely apartment-friendly — arboreal, quiet, and comfortable at room temperature with no hot basking lamp, on an 18-by-18-inch footprint. On-campus housing is stricter: most dorms permit only fish. If that's the building, our nano-aquarium guide covers the 5-gallon betta kits; if a mammal is the alternative, the hamster-habitat guide sets the welfare floor-space standard — its value pick is below.",
    cards: [
      {
        name: "BUCATSTATE Hamster Cage Metal 2.0 Large Stackable",
        asin: "B0C2461S8X",
        note: "The value pick from our hamster-habitat guide — clears the 600-square-inch welfare floor-space standard at about 774 square inches of continuous floor, with a base deep enough for real burrowing bedding.",
        cta: "See the BUCATSTATE 2.0",
        fromGuide: HAMSTER_GUIDE,
      },
    ],
  },
};
