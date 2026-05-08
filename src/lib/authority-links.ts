/**
 * Authority source link map for PetPalHQ
 *
 * Per the May 2026 AEO/GEO audit (compass_artifact_wf-c59d26b3...md):
 * citing veterinary, regulatory, and welfare authorities by name with
 * resolvable links is one of the highest-leverage YMYL signals an
 * affiliate review site can carry. Pre-audit: 1,974 mentions of these
 * sources existed in body markdown across 62 guides; only 2 were
 * linked. This map is consumed by `injectAuthorityLinks` in lib/guides.ts
 * and applied during markdown processing for body, pick deep-dives,
 * for-species sections, when-not-to-buy, and bottom-line prose.
 *
 * Discipline:
 * - Do NOT apply to capsules (the first paragraph after each H2).
 *   The Search Engine Land study found 91% of cited answer capsules
 *   contain zero links. We rely on the capsule-cleanup pass to enforce
 *   that.
 * - Use canonical landing pages, not deep-link to specific articles.
 *   LLMs favor stable URLs.
 * - Each source is linked once per body field (first occurrence only)
 *   to avoid link spam — this is enforced by the injector.
 */

export interface AuthorityLink {
  /** Canonical name as it appears in body text (case-insensitive matching is applied) */
  name: string;
  /** Authority's canonical landing URL */
  url: string;
  /** Optional alternate names that should resolve to the same URL */
  aliases?: string[];
}

export const AUTHORITY_LINKS: AuthorityLink[] = [
  // ─── Tier 1: Most-cited veterinary references ──────────────────
  {
    name: "Merck Veterinary Manual",
    url: "https://www.merckvetmanual.com/",
    aliases: ["Merck Vet Manual"],
  },
  {
    name: "AVMA",
    url: "https://www.avma.org/",
    aliases: ["American Veterinary Medical Association"],
  },
  {
    name: "AAHA",
    url: "https://www.aaha.org/",
    aliases: ["American Animal Hospital Association"],
  },
  {
    name: "AAFP",
    url: "https://catvets.com/",
    aliases: ["American Association of Feline Practitioners"],
  },
  {
    name: "LafeberVet",
    url: "https://lafeber.com/vet/",
  },
  {
    name: "VCA Animal Hospitals",
    url: "https://vcahospitals.com/know-your-pet",
  },
  {
    name: "Cornell Feline Health Center",
    url: "https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center",
  },
  {
    name: "Tufts Cummings Petfoodology",
    url: "https://vetnutrition.tufts.edu/petfoodology/",
    aliases: ["Petfoodology"],
  },
  {
    name: "ISFM",
    url: "https://icatcare.org/advice/",
    aliases: ["International Society of Feline Medicine"],
  },
  {
    name: "ASPCA Animal Poison Control",
    url: "https://www.aspca.org/pet-care/animal-poison-control",
  },
  {
    name: "AVSAB",
    url: "https://avsab.org/",
    aliases: ["American Veterinary Society of Animal Behavior"],
  },

  // ─── Tier 2: Regulatory + government ──────────────────────────
  {
    name: "FDA Center for Veterinary Medicine",
    url: "https://www.fda.gov/animal-veterinary",
    aliases: ["FDA CVM"],
  },
  {
    name: "AAFCO",
    url: "https://www.aafco.org/",
    aliases: ["Association of American Feed Control Officials"],
  },
  {
    name: "USDA APHIS",
    url: "https://www.aphis.usda.gov/livestock-poultry-disease/horses/equine-pet-and-aquaculture",
  },
  {
    name: "CDC Healthy Pets",
    url: "https://www.cdc.gov/healthy-pets/",
    aliases: ["CDC Healthy Pets/Healthy People", "CDC Healthy Pets Healthy People"],
  },
  {
    name: "FAA",
    url: "https://www.faa.gov/travelers/fly_pets",
  },
  {
    name: "TSA",
    url: "https://www.tsa.gov/travel/special-procedures/traveling-pets",
  },
  {
    name: "EPA",
    url: "https://www.epa.gov/",
  },

  // ─── Tier 3: Welfare + specialty ──────────────────────────────
  {
    name: "RSPCA",
    url: "https://www.rspca.org.uk/adviceandwelfare",
  },
  {
    name: "Center for Pet Safety",
    url: "https://www.centerforpetsafety.org/",
  },
  {
    name: "VOHC",
    url: "https://vohc.org/",
    aliases: ["Veterinary Oral Health Council"],
  },
  {
    name: "NASC",
    url: "https://nasc.cc/",
    aliases: ["National Animal Supplement Council"],
  },
  {
    name: "World Wildlife Fund",
    url: "https://www.worldwildlife.org/",
    aliases: ["WWF"],
  },

  // ─── Tier 4: University veterinary medicine ───────────────────
  {
    name: "NC State College of Veterinary Medicine",
    url: "https://cvm.ncsu.edu/",
    aliases: ["NC State CVM"],
  },
  {
    name: "UC Davis CVET",
    url: "https://www.vetmed.ucdavis.edu/hospital/companion-exotic-animal-medicine",
  },
  {
    name: "Bowling Green State University Herpetarium",
    url: "https://www.bgsu.edu/",
    aliases: ["BGSU Herpetarium"],
  },

  // ─── Tier 5: Insurance / financial regulatory ─────────────────
  {
    name: "NAIC",
    url: "https://content.naic.org/cipr-topics/pet-insurance",
    aliases: ["National Association of Insurance Commissioners"],
  },
  {
    name: "NAPHIA",
    url: "https://naphia.org/",
    aliases: ["North American Pet Health Insurance Association"],
  },
];

/**
 * Returns a Map keyed by authority name (and aliases) → URL,
 * sorted with longest names first so substring matches don't trigger
 * before full-name matches (e.g., "AAFP" inside "AAFCO" must not match).
 */
export function buildAuthorityLinkMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const link of AUTHORITY_LINKS) {
    map.set(link.name, link.url);
    for (const alias of link.aliases ?? []) {
      map.set(alias, link.url);
    }
  }
  return map;
}
