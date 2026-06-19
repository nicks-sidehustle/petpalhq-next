export const meta = {
  name: 'petpal-batch20-build',
  description: 'Research, write, verify, and repair 20 PetPalHQ guides',
  phases: [
    { title: 'Research', detail: 'live Amazon product verification per topic' },
    { title: 'Write', detail: 'guide authoring + hero gen + gate iteration' },
    { title: 'Verify', detail: 'independent adversarial gate + fabrication check' },
    { title: 'Repair', detail: 'fix verified defects, re-verify' },
  ],
}

// args = array of topic objects {slug, title, category, aovEstimate, whyIncluded}
let topics = args
if (typeof topics === 'string') topics = JSON.parse(topics)
if (!Array.isArray(topics)) throw new Error('args must be the topic slate array')
log(`Building ${topics.length} guides`)

const RESEARCH_SCHEMA = {
  type: 'object',
  required: ['slug', 'status', 'pickCount', 'verifiedAsins', 'notes'],
  properties: {
    slug: { type: 'string' },
    status: { type: 'string', enum: ['ok', 'thin', 'dead-zone'] },
    pickCount: { type: 'number' },
    verifiedAsins: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
  },
}

const WRITE_SCHEMA = {
  type: 'object',
  required: ['slug', 'status', 'heroGenerated', 'iterations', 'notes'],
  properties: {
    slug: { type: 'string' },
    status: { type: 'string', enum: ['green', 'blocked'] },
    fk: { type: 'number' },
    wordsPerLink: { type: 'number' },
    consPerPick: { type: 'number' },
    heroGenerated: { type: 'boolean' },
    iterations: { type: 'number' },
    notes: { type: 'string' },
  },
}

const VERIFY_SCHEMA = {
  type: 'object',
  required: ['slug', 'verdict', 'defects'],
  properties: {
    slug: { type: 'string' },
    verdict: { type: 'string', enum: ['ship', 'repair', 'reject'] },
    defects: { type: 'array', items: { type: 'string' } },
    heroQuality: { type: 'string' },
  },
}

function researchPrompt(t) {
  return `You are the product-research agent for a new PetPalHQ.com guide.

TOPIC: "${t.title}" (slug: ${t.slug}, category: ${t.category}, target price band: ${t.aovEstimate})
Editorial angle: ${t.whyIncluded}

Read /Users/Nick/petpalhq-next/PIPELINE-CONFIG.md ("Expert Sources to Cite", "Content Rules", "Scoring System") first.

PROCESS:
1. WebSearch (3-5 queries) for expert consensus in this product category: what do credible outlets (Wirecutter, vet/extension/hobbyist authorities per the config) and Reddit communities actually recommend? Collect NAMED sources and their specific findings (durability complaints, safety notes, standout specs).
2. Identify 6 candidate products spanning Budget / Sweet-Spot / Premium. For EACH candidate run:
   cd /Users/Nick/smarthome-explorer-blog && node scripts/automation/amazon-lookup.cjs --product="<product name>"
   to find it on Amazon, then verify the exact ASIN:
   node scripts/automation/amazon-lookup.cjs --asin=<ASIN>
   Keep ONLY products that resolve live with a real price and image. The tool's affiliateLink output uses the WRONG tag — ignore that field entirely; record only asin/title/price/imageUrl.
3. Select the FINAL 4 picks (rank 1-4: BEST OVERALL, BEST VALUE, BEST FOR <use-case>, SPECIALIST or premium) + 2 "passed on" products (named, with the honest reason you excluded them).
4. Write the packet to /Users/Nick/petpalhq-next/.batch-20/research/${t.slug}.json with EXACTLY this shape:
{
  "slug", "title", "category", "researchDate": "2026-06-10",
  "picks": [ { "rank", "label", "name" (full Amazon title), "brand", "asin", "price", "imageUrl", "suggestedAliases": [2-3 short names], "keySpecs": [5 concrete spec strings you verified], "evidence": [3-6 strings, each "<named source>: <specific finding>"], "consHints": [3-4 honest drawbacks from real owner/expert complaints], "suggestedScore": <0-10 one decimal> } x4 ],
  "passedOn": [ { "name", "reason" } x2 ],
  "expertSources": [5-8 named outlets/authorities you actually consulted],
  "communitySources": [1-3 subreddits],
  "faqSeeds": [4-6 real questions buyers ask, from PAA/Reddit],
  "comparisonAxes": [4-6 spec axes that differentiate these picks],
  "safetyNotes": "animal-safety considerations if heat/UV/chemical, else ''"
}
INTEGRITY: every evidence string must be something you actually read. No invented specs, no invented outlet attributions. If you cannot find 4 live Amazon products, set status "thin" or "dead-zone" and say why.
Return JSON: {slug, status, pickCount, verifiedAsins, notes}.`
}

function writePrompt(t) {
  return `You are the writer agent for a new PetPalHQ.com guide.

TOPIC: "${t.title}" — slug: ${t.slug} — category: "${t.category}"

Read IN FULL, in this order:
1. /Users/Nick/petpalhq-next/.batch-20/CONTRACT.md  (your binding contract — follow every rule)
2. /Users/Nick/petpalhq-next/src/content/guides/best-dog-backyard-agility-kits-2026.md (structural exemplar)
3. /Users/Nick/petpalhq-next/.batch-20/research/${t.slug}.json (your ONLY source of product facts)
Also skim one existing guide in your category for category-specific conventions (species field, framing).

Then write /Users/Nick/petpalhq-next/src/content/guides/${t.slug}.md, generate the hero, and iterate the gates per the contract until green (max 6 iterations).

Target 2,200-2,800 words total. Write like a sharp consultative editor: concrete numbers, honest trade-offs, zero slop. Use pick aliases naturally in body prose so inline affiliate auto-linking fires.

Return the JSON report specified in the contract.`
}

function verifyPrompt(t) {
  return `You are an independent adversarial verifier for the new PetPalHQ guide "${t.slug}". Your default stance: find reasons it CANNOT ship. The writer is not your friend.

Read /Users/Nick/petpalhq-next/.batch-20/CONTRACT.md, then the guide at /Users/Nick/petpalhq-next/src/content/guides/${t.slug}.md and its research packet at /Users/Nick/petpalhq-next/.batch-20/research/${t.slug}.json.

NOTE: hero images are generated centrally AFTER this phase (OpenAI billing is capped). A missing hero for ${t.slug} is EXPECTED and is NOT a defect. Do not attempt image generation.

CHECKS (all required):
1. Gates: run cd /Users/Nick/petpalhq-next && npm run check:metrics -- --slug ${t.slug} — FK, link density, and dissent must all pass; the ONLY acceptable error is the missing-hero error for ${t.slug}.
2. Fabrication trace: every ASIN, price, product name, and image URL in the guide MUST match the research packet exactly. Every factual spec claim in pick bodies must trace to packet keySpecs/evidence. List ANY claim that doesn't trace.
3. Live re-verification: for each of the 4 ASINs run cd /Users/Nick/smarthome-explorer-blog && node scripts/automation/amazon-lookup.cjs --asin=<ASIN> and confirm it still resolves with a real title (price drift is OK to note, dead ASIN = defect).
4. Voice/banned phrases: grep the guide for: "I tested", "we tested", "in our testing", "personally tested", comprehensive, delve, leverage, elevate, seamless, cutting-edge, game-changer, revolutionary, must-have, "you'll love". Any hit = defect. Also: the guide must state "We read N expert sources" where N equals frontmatter expertSourceCount.
5. No hardcoded affiliate tags: grep for "tag=" in the file — any hit = defect.
6. Structure: 4 picks each with >=3 cons; "What We Passed On" section present; "## Frequently Asked Questions" present with 4+ Q/As; affiliate disclosure before first product CTA; related: slugs exist in src/content/guides/; species/safety rules per contract (heat/UV/chemical topics need an animal-safety section).
7. Internal consistency: scores vs verdict labels vs methodology weights coherent; comparison table data matches pick data; prices consistent everywhere.

Verdict: "ship" only if ALL pass (missing hero excepted). "repair" with a precise defect list otherwise. "reject" only for unsalvageable (dead products, wholesale fabrication).
Return JSON: {slug, verdict, defects, heroQuality: "deferred"}.`
}

function repairPrompt(t, defects) {
  return `You are the repair agent for PetPalHQ guide "${t.slug}" at /Users/Nick/petpalhq-next/src/content/guides/${t.slug}.md.

Read /Users/Nick/petpalhq-next/.batch-20/CONTRACT.md and the research packet at /Users/Nick/petpalhq-next/.batch-20/research/${t.slug}.json first.

Fix EXACTLY these verified defects — nothing else:
${defects.map((d, i) => `${i + 1}. ${d}`).join('\n')}

RULES: Do not relocate or re-introduce removed claims elsewhere (no laundering). Do NOT attempt hero/image generation (heroes are handled centrally; the missing-hero error is expected). Edits must keep all other gates green — after fixing, run cd /Users/Nick/petpalhq-next && npm run check:metrics -- --slug ${t.slug} and iterate until FK/link-density/dissent pass (max 4 iterations). Every fact you add must trace to the research packet. Do not run git commands.
Return JSON: {slug, status: "green"|"blocked", notes}.`
}

const results = await pipeline(
  topics,
  t => agent(researchPrompt(t), { label: `research:${t.slug}`, phase: 'Research', schema: RESEARCH_SCHEMA }),
  async (research, t) => {
    if (!research || research.status === 'dead-zone') {
      log(`SKIP write for ${t.slug}: research ${research ? research.status + ' — ' + research.notes : 'failed'}`)
      return { slug: t.slug, skipped: true, reason: research ? research.notes : 'research agent failed' }
    }
    if (research.status === 'thin') log(`${t.slug}: research thin — ${research.notes} (writing anyway with ${research.pickCount} picks)`)
    const write = await agent(writePrompt(t), { label: `write:${t.slug}`, phase: 'Write', schema: WRITE_SCHEMA })
    return { slug: t.slug, research, write }
  },
  async (prev, t) => {
    if (!prev || prev.skipped) return prev
    if (!prev.write || prev.write.status === 'blocked') {
      log(`${t.slug}: writer blocked — ${prev.write ? prev.write.notes : 'no report'}`)
      return { ...prev, final: 'blocked' }
    }
    let verify = await agent(verifyPrompt(t), { label: `verify:${t.slug}`, phase: 'Verify', schema: VERIFY_SCHEMA })
    let rounds = 0
    while (verify && verify.verdict === 'repair' && rounds < 2) {
      rounds++
      log(`${t.slug}: repair round ${rounds} — ${verify.defects.length} defects`)
      await agent(repairPrompt(t, verify.defects), { label: `repair:${t.slug}#${rounds}`, phase: 'Repair', schema: WRITE_SCHEMA })
      verify = await agent(verifyPrompt(t), { label: `reverify:${t.slug}#${rounds}`, phase: 'Verify', schema: VERIFY_SCHEMA })
    }
    return { ...prev, verify, repairRounds: rounds, final: verify ? verify.verdict : 'verify-failed' }
  }
)

const summary = results.filter(Boolean).map(r => ({
  slug: r.slug,
  final: r.skipped ? `skipped: ${r.reason}` : r.final,
  defectsOutstanding: r.verify && r.verify.verdict !== 'ship' ? r.verify.defects : [],
  hero: r.verify ? r.verify.heroQuality : null,
}))
return { summary, shipped: summary.filter(s => s.final === 'ship').length }
