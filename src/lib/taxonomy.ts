import { categoryAliases, contentPillars } from "@/config/site";

export type PillarSlug = typeof contentPillars[number]["slug"];

export function normalizeTaxonomyKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function getPillarSlugForCategory(category: string): PillarSlug | null {
  const normalized = normalizeTaxonomyKey(category);
  const directPillar = contentPillars.find((pillar) => pillar.slug === normalized || normalizeTaxonomyKey(pillar.name) === normalized);
  if (directPillar) return directPillar.slug;

  return (categoryAliases as Record<string, PillarSlug>)[normalized] ?? null;
}

export function getPillarForCategory(category: string) {
  const slug = getPillarSlugForCategory(category);
  return slug ? contentPillars.find((pillar) => pillar.slug === slug) ?? null : null;
}
