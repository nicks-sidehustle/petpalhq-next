export const meta = {
  name: 'petpal-batch-draft',
  description: 'Per guide, draft a complete PetPalHQ buying-guide .md from inlined verified picks, mirroring a live sibling and satisfying the full spec (capsule+FAQ body, scenario score, authoritySources on top-3, FK 8-12, dissent >=2.5). args = array of {slug, hub, category, scope, scoreName, factors, mirrorGuide, related, speciesField, verifiedPicks}.',
  phases: [{ title: 'Draft', detail: 'one Opus agent per guide writes the full guide file from verified picks', model: 'opus' }],
}

const REPO = '/Users/mm2/sites/petpalhq-next'
const GDIR = `${REPO}/src/content/guides`

const SPEC = `PETPALHQ GUIDE SPEC (every rule is a build gate or a silent-content-drop — follow exactly):
1. FAQ FORMAT (CRITICAL): body's "## Frequently Asked Questions" MUST be:
   **Q: <question>?**
   A: <answer>
   (blank line between pairs). 5-6 pairs. Any other format silently emits no FAQPage schema.
2. BODY RENDERS ONLY the intro capsule (2-3 link-free paragraphs before the first H2) + the "## Frequently Asked Questions" section. ALL other editorial MUST live in frontmatter fields — do NOT write other body H2s; they will not render.
3. REQUIRED FRONTMATTER: title (includes 2026), description, excerpt, category, keywords (8-9 specific terms), <speciesField>, pillar, hub, guideType: "spoke", publishDate "2026-06-25", updatedDate "2026-06-25", readTime, featured: false, image + heroImage both "/images/guides/<slug>.png", products: [], reviewMethod, lastProductCheck "2026-06-25", expertSourceCount, shortAnswer, topPicks (top 3), picks, comparison, methodology, whenNotToBuy, bottomLine, sources, related.
4. PICKS (5-6, from the VERIFIED PICKS ONLY — never invent an ASIN/price/image): each needs rank, label (e.g. "BEST OVERALL"), name (use the verified Amazon title, lightly cleaned), brand, score (differentiated, realistic 7.8-9.5, best overall highest, monotonic-ish down the ranks), price (verified price string), image (verified imageUrl), asin (verified asin), aliases (2-3 short names that ALSO appear in that pick's body/verdict prose for inline affiliate auto-linking), keyFeatures (5, grounded in the verified features[]), body (200-300 words), pros (5), cons (4+ — so total cons/picks >= 2.5), verdict (1 sentence). NO DUPLICATE asin.
5. authoritySources on the top-3 picks (rank 1-3): >=2 each, shape { outlet, url, stat, claim, supports: "spec"|"recommendation"|"comparison", accessed: "2026-06-25" }. Use REAL, web-verified URLs (manufacturer pages, BRStv/Bulk Reef Supply, Reef2Reef, hobbyist-authority articles, standards bodies). Do not attribute a spec to an outlet whose page does not state it.
6. methodology.formula uses the scoreName + its factors (name, weight, definition). comparison.rows: one row per pick (label + per-pick values).
7. READABILITY: all user-visible prose (shortAnswer, reviewMethod, picks[].body, picks[].verdict, bottomLine, whenNotToBuy, methodology factor definitions, FAQ answers) must hit Flesch-Kincaid grade 8-12. WRITE SHORT SENTENCES (target FK <= 11). Split long clause-heavy sentences aggressively.
8. NO HANDS-ON TESTING CLAIMS (banned): never "we tested", "we measured", "in our lab", "after using", "our top pick". Frame as expert-consensus synthesis: "Expert consensus indicates...", "According to <outlet>...", "Manufacturer documentation specifies...". PetPalHQ does not run a testing lab — say so in reviewMethod + authorBio.
9. NO OUTBOUND LINKS to authority names in visible prose (they appear as PLAIN TEXT). The only body links are internal /guides/ cross-links. ownerVoice: [].
10. NO AI-SLOP: revolutionary, game-changing, unleash, elevate, dive in, in today's world, look no further, when it comes to, our top pick, to conclude. Vary sentence openers across pick bodies (no shared 6-word opener across >=3 picks).
11. authorBio in sources: "Nick Miles is the chief editor of PetPalHQ..." (NEVER 'Rachel Cooper'). related: ONLY real existing guide slugs.`

const DRAFT_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['slug', 'written', 'picksUsed', 'gateState', 'notes'],
  properties: {
    slug: { type: 'string' },
    written: { type: 'boolean' },
    picksUsed: { type: 'number' },
    gateState: { type: 'string' },
    notes: { type: 'string' },
  },
}

const parsed = typeof args === 'string'
  ? (() => { try { return JSON.parse(args) } catch { return args } })()
  : args
const specs = Array.isArray(parsed) ? parsed.filter(Boolean) : []
if (!specs.length) return { error: 'no guide specs supplied' }

phase('Draft')
log(`petpal-batch-draft: ${specs.length} guide(s)`)

const results = await parallel(specs.map((spec) => () =>
  agent(
`You are the DRAFT agent for a new PetPalHQ buying guide: ${spec.slug}. WRITE the file ${GDIR}/${spec.slug}.md.

MIRROR GUIDE (match its structure, field shapes, voice, and scoring EXACTLY): read ${GDIR}/${spec.mirrorGuide}.md first.

GUIDE SPEC:
- slug: ${spec.slug}
- hub: ${spec.hub}  | category: ${spec.category} | guideType: spoke
- speciesField (copy the mirror's pattern, value): ${spec.speciesField}
- scope: ${spec.scope}
- scoreName: ${spec.scoreName}
- score factors (name : weight): ${JSON.stringify(spec.factors)}
- related: ${JSON.stringify(spec.related)}  (use ONLY these real slugs)

VERIFIED PICKS: read the dossier at ${spec.dossierPath} — a JSON array of {asin, title, price, imageUrl, brand, features, roleHint}. These are the ONLY products you may feature. Every asin/price/image is live-verified — use them VERBATIM, never invent or alter an ASIN/price/image. Pick the best 5-6, rank them, and honor each pick's roleHint (e.g. a pick flagged as an adjacent/alternative class must be framed honestly as such, not scored identically to the core class).

${SPEC}

PROCESS:
1. Read the mirror guide; internalize its exact frontmatter field set and body shape.
2. Choose the best 5-6 verified picks; assign ranks + differentiated scores per the scoreName factors. Ground keyFeatures/specs in each pick's verified features[] FIRST; WEB-VERIFY any spec/claim the features[] do not cover before stating it (do not invent specs).
3. For the top-3 picks, web-research and attach >=2 REAL authoritySources each (manufacturer page, BRStv/Bulk Reef Supply, Reef2Reef, hobbyist authority). Verify each URL actually supports the claim.
4. Write the complete guide file with all required frontmatter + the capsule+FAQ body. Short sentences (FK 8-12).
5. SELF-GATE before returning: \`cd ${REPO} && npx tsx scripts/check-content-metrics.ts --slug ${spec.slug}\` — fix until FK 8-12, dissent >=2.5, link density pass (a missing-hero-image error is EXPECTED and fine). Do NOT run validate-content.mjs here — it scans the whole corpus and a sibling draft may be mid-write; full validation runs later in the orchestrator once all parallel drafts settle.
Return whether you wrote it, how many picks, the final gate state, and any concern. The adversarial review runs separately next.`,
    { label: `draft:${spec.slug}`, phase: 'Draft', schema: DRAFT_SCHEMA, model: 'opus', effort: 'xhigh' }
  )
)).then((r) => r.filter(Boolean))

return { count: results.length, results }
