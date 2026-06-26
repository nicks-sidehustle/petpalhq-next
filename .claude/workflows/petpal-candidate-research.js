export const meta = {
  name: 'petpal-candidate-research',
  description: 'Per guide spec, research 6-8 GENUINELY Amazon-stocked candidate products (exact model + search term + optional ASIN + tier + rationale), confirm hub, flag cannibalization vs existing cluster guides. args = array of guide specs.',
  phases: [{ title: 'Research', detail: 'one agent per guide proposes verified-searchable candidate products' }],
}

const REPO = '/Users/mm2/sites/petpalhq-next'
const GDIR = `${REPO}/src/content/guides`

const SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['slug', 'hub', 'mirrorGuide', 'cannibalizationNotes', 'candidates'],
  properties: {
    slug: { type: 'string' },
    hub: { type: 'string' },
    mirrorGuide: { type: 'string' },
    cannibalizationNotes: { type: 'string' },
    candidates: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['brand', 'model', 'amazonSearchTerm', 'tier', 'priceEstimate', 'whyItFits', 'amazonConfidence'],
        properties: {
          brand: { type: 'string' },
          model: { type: 'string' },
          amazonSearchTerm: { type: 'string' },
          knownAsin: { type: 'string' },
          tier: { type: 'string', enum: ['premium', 'high', 'mid', 'budget', 'niche'] },
          priceEstimate: { type: 'string' },
          whyItFits: { type: 'string' },
          amazonConfidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
      },
    },
  },
}

// The Workflow runtime may hand `args` over as a JSON string. Tolerate both.
const parsed = typeof args === 'string'
  ? (() => { try { return JSON.parse(args) } catch { return args } })()
  : args
const specs = Array.isArray(parsed) ? parsed.filter(Boolean) : []
if (!specs.length) {
  return { error: 'no guide specs supplied', usage: 'args = [{slug, hub, mirrorGuide, scope, scoreName, brands:[]}]' }
}

phase('Research')
log(`petpal-candidate-research: ${specs.length} guide(s)`)

const results = await parallel(specs.map((spec) => () =>
  agent(
`CANDIDATE-PRODUCT RESEARCH for a new PetPalHQ buying guide.

GUIDE SPEC:
${JSON.stringify(spec, null, 2)}

YOUR JOB: propose 6-8 candidate products that are GENUINELY AMAZON-STOCKED (purchasable on amazon.com at a /dp/<ASIN> page — NOT freight-only, dealer-only, or DTC-website-only). PetPalHQ is an Amazon-affiliate, expert-consensus site: a product not stocked on Amazon is useless here, and the #1 failure mode for this category is proposing premium reef/pro gear that is actually dealer-only.

STEPS:
1. Read the mirror guide ${GDIR}/${spec.mirrorGuide}.md to learn the EXACT structure, voice, scoring style, and field shapes you must match.
2. Read 1-2 sibling guides in the same cluster (start with the mirror's related: slugs) to AVOID cannibalization — your candidates MUST be a distinct product class, not a rehash of an existing guide's picks.
3. Using your product knowledge + the spec's expected brands (${(spec.brands || []).join(', ')}), propose 6-8 candidates spanning the price band "${spec.scope}". For EACH: brand, exact model, an amazonSearchTerm specific enough to retrieve THAT product (brand + model + a key spec), a knownAsin ONLY if you are genuinely confident of it (else omit), tier, price estimate, why it fits this guide's scenario/scoring, and amazonConfidence (high/medium/low — your honest read of whether amazon.com stocks it).
4. HONESTY GATE: prefer candidates you are confident Amazon stocks (amazonConfidence high). If a flagship is likely dealer-only, you may still list it but mark amazonConfidence low and tier 'niche'. Over-provide (aim for 8) so the orchestrator can drop any that fail the live ASIN lookup and still land 5-6 real picks.
5. Confirm the hub (match the cluster siblings) and write a 1-2 sentence cannibalizationNotes naming the closest existing guide and how this one stays distinct.

Return the structured result. This is research only — do NOT write any guide file.`,
    { label: `research:${spec.slug}`, phase: 'Research', schema: SCHEMA, effort: 'high' }
  )
)).then((r) => r.filter(Boolean))

return { count: results.length, results }
