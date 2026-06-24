export const meta = {
  name: 'petpal-content-review',
  description: 'Reusable PetPalHQ content review pipeline: per slug, triple-lens adversarial review (spec + vet-factual + editorial) -> fix blocking/major findings (re-grounding facts in verified data) -> independent verify, looping until the verdict is clean. args = array of guide slugs.',
  phases: [
    { title: 'Review', detail: '3 parallel lenses per guide: spec/gate, veterinary-factual (YMYL), editorial/cannibalization' },
    { title: 'Fix', detail: 'one Opus agent per guide resolves every blocking+major issue, re-grounds factual claims, re-gates', model: 'opus' },
    { title: 'Verify', detail: 'an independent agent (did not write or fix) confirms each issue is genuinely resolved and no new error was introduced' },
  ],
}

const REPO = '/Users/mm2/sites/petpalhq-next'
const GDIR = `${REPO}/src/content/guides`

// Bound the review->fix->verify loop so the workflow always terminates (no Date/random).
const MAX_ROUNDS = 2

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const REVIEW_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['slug', 'lens', 'verdict', 'issues'],
  properties: {
    slug: { type: 'string' }, lens: { type: 'string' },
    verdict: { type: 'string', enum: ['pass', 'needs_fix', 'fail'] },
    issues: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false, required: ['severity', 'field', 'problem', 'fix'],
        properties: {
          severity: { type: 'string', enum: ['blocking', 'major', 'minor'] },
          field: { type: 'string' }, problem: { type: 'string' }, fix: { type: 'string' },
        },
      },
    },
  },
}

const FIX_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['slug', 'changesSummary', 'factualCorrections', 'gatesPass', 'remainingConcerns'],
  properties: {
    slug: { type: 'string' },
    changesSummary: { type: 'string' },
    factualCorrections: { type: 'array', items: { type: 'string' } },
    gatesPass: { type: 'boolean' },
    remainingConcerns: { type: 'string' },
  },
}

const VERIFY_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['slug', 'verdict', 'unresolvedIssues', 'newIssues', 'notes'],
  properties: {
    slug: { type: 'string' },
    verdict: { type: 'string', enum: ['clean', 'minor-remaining', 'still-broken'] },
    unresolvedIssues: { type: 'array', items: { type: 'string' } },
    newIssues: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
  },
}

// ---------------------------------------------------------------------------
// Shared rule blocks (verbatim from the 2026-06-23 Tier-1 session workflows)
// ---------------------------------------------------------------------------

const SPEC_RULES = `PETPALHQ GUIDE SPEC (hard rules — violating any of these breaks the build or silently drops content):
1. FAQ FORMAT (CRITICAL): The body's "## Frequently Asked Questions" section MUST use this exact format, or it silently emits no schema:
   **Q: <question text>?**
   A: <answer text>
   (blank line between pairs). NOT "**<question>?**" then a paragraph. 4-6 Q/A pairs.
2. BODY IS MOSTLY INVISIBLE: Only the intro capsule (2-3 link-free paragraphs before any H2) and the "## Frequently Asked Questions" section render from the body. ALL other editorial MUST live in frontmatter fields. Do not write narrative H2 sections in the body — they won't render.
3. REQUIRED FRONTMATTER: title, description, excerpt, category, keywords (8-9), species, guideType, pillar, hub, publishDate, updatedDate, readTime, featured: false, heroImage "/images/guides/<slug>.png", products: [], reviewMethod, lastProductCheck, expertSourceCount, shortAnswer, topPicks (top 3), picks, comparison, methodology, bottomLine (4 entries), whenNotToBuy (5-6 skip scenarios), sources, ownerVoice: [], related.
4. category/pillar/hub/guideType/species: use EXACTLY the values established for this cluster (match the canonical template + sibling guides).
5. PICKS (5-6 picks, chosen from verified product data ONLY — never invent an ASIN): each pick needs rank, label (e.g. "BEST OVERALL"), name (use the verified Amazon title), brand, score (differentiated, realistic 6.8-9.0, best overall highest), price (verified price string), image (verified imageUrl), asin (verified asin), aliases (2-3 short names that ALSO appear in the body/verdict prose for inline affiliate auto-linking), keyFeatures (5), body (200-300 words), pros (5), cons (4+ — needed so total cons/picks >= 2.5), verdict (1 sentence).
6. DISSENT RATIO: total cons across all picks / number of picks MUST be >= 2.5. With 4+ cons/pick you clear this.
7. authoritySources on the top 3 picks (rank 1-3): >=2 each, shape: { outlet, url (or ""), stat, claim, supports: "spec"|"recommendation"|"comparison", accessed }.
8. methodology: formula string using the cluster scoreName + the 4 factors (name, weight, definition). comparison.rows: one row per pick.
9. READABILITY (FK gate): user-visible prose (shortAnswer, reviewMethod, picks[].body, picks[].verdict, bottomLine, whenNotToBuy, methodology.factors[].definition, FAQ answers) MUST score Flesch-Kincaid grade 8-12 (hard-fail outside 7-13). WRITE SHORT SENTENCES. Target FK <=11. Expert/clinical prose tends to read HIGH — split long sentences aggressively.
10. NO HANDS-ON TESTING CLAIMS (banned): never "we tested", "we measured", "in our lab", "after using", "in our experience". Frame as expert-consensus synthesis: "Expert consensus indicates...", "According to [outlet]...", "Manufacturer documentation specifies...".
11. NO OUTBOUND LINKS to authority names — authority names (AVMA, WSAVA, Aqueon, etc.) appear as PLAIN TEXT only. The only links are inline affiliate links that fire via pick aliases, and internal /guides/ cross-links.
12. related: use ONLY real, existing guide slugs. ownerVoice: [] (ship empty unless owner-supplied).
13. authorBio in sources: "Nick Miles is the chief editor of PetPalHQ..." (NEVER 'Rachel Cooper'). PetPalHQ does not run a testing lab — say so in reviewMethod/authorBio.
14. NO AI-SLOP words: revolutionary, game-changing, unleash, elevate, dive in, in today's world, look no further, when it comes to.`

const COMMON_RULES = `HARD RULES (do not break while fixing):
- FAQ section MUST stay in "**Q: ...?**\\nA: ..." format (any other format silently drops FAQ schema).
- Body renders ONLY the intro capsule + "## Frequently Asked Questions"; keep all other editorial in frontmatter.
- Every pick's asin/price/image MUST match a real verified product. Never invent an ASIN.
- NO hands-on testing claims ("we tested", "in our lab", etc.). Authority names = plain text, no outbound links to them (inline AFFILIATE links via aliases are fine and encouraged).
- Keep dissent ratio (total cons / picks) >= 2.5 and Flesch-Kincaid grade 8-12.
- authorBio = Nick Miles, chief editor; PetPalHQ does not run a testing lab.
- When you re-ground a factual claim, base it on the VERIFIED product (real ingredient panel / real active ingredients). If a claim's truth is uncertain, WEB-SEARCH the actual product (by ASIN or exact title) and correct it — do not just soften wording around a false fact.`

// ---------------------------------------------------------------------------
// Per-slug stage builders
// ---------------------------------------------------------------------------

// STAGE 1 — triple-lens adversarial review (3 parallel distinct lenses).
function reviewLenses(slug) {
  const file = `${GDIR}/${slug}.md`
  return parallel([
    // Lens A — spec / gate compliance
    () => agent(
`ADVERSARIAL REVIEW — SPEC/GATE LENS for ${file} (read it).
A dossier of verified picks may exist at the scratchpad as dossier-${slug}.json; if present, cross-check every pick against its verifiedPicks. If absent, treat the guide's own picks[] (asin/price/image) as the ground truth to internally cross-check for consistency and dupes.

${SPEC_RULES}

Verify rigorously, report every violation:
- FAQ uses EXACT "**Q: ...?**\\nA: ..." format (anything else silently fails). Count pairs (need 4-6).
- Body contains ONLY the intro capsule + "## Frequently Asked Questions" (no other narrative H2s, which won't render).
- Every required frontmatter field present. category/pillar/hub/guideType/species match the cluster's siblings.
- Every pick's asin/price/image matches a verified product; no invented ASINs; NO DUPLICATE asin within the guide. 5-6 picks.
- Each pick has rank, label, name, brand, score (differentiated), aliases (2-3, and they actually appear in body/verdict prose), keyFeatures (5), body, pros (5), cons (4+), verdict.
- Dissent ratio (total cons / picks) >= 2.5 — compute it.
- Top-3 picks have >=2 authoritySources each with the right shape.
- related: slugs all present and point at real existing guides. ownerVoice: []. heroImage path set.
- methodology has scoreName formula + 4 factors; comparison.rows one per pick.
- No stray outbound link in body/visible prose whose href is neither an Amazon affiliate link nor an internal /guides/ link.
Return verdict (pass if zero blocking/major; needs_fix if fixable; fail if structurally broken) + issues.`,
      { label: `spec:${slug}`, phase: 'Review', schema: REVIEW_SCHEMA, effort: 'high' }
    ).then((r) => ({ ...r, lens: 'spec' })),
    // Lens B — veterinary / factual accuracy (YMYL — the critical lens)
    () => agent(
`ADVERSARIAL REVIEW — VETERINARY/FACTUAL-ACCURACY LENS for ${file} (read it). This is YMYL pet-health content; a confidently-wrong clinical claim is the worst failure mode.
ROOT CAUSE TO WATCH: the product-lookup pipeline returns only asin/title/price/image — NOT ingredient panels or active ingredients — so a draft agent WILL hallucinate specs unless you re-ground them against live product data. WEB-VERIFY any ingredient panel / active-ingredient / spec claim by ASIN or exact product title before trusting it.
Scrutinize every factual/clinical claim:
- For shampoos: active-ingredient claims correct? (chlorhexidine = antibacterial/antiseptic; ketoconazole/miconazole = antifungal/yeast/Malassezia; benzoyl peroxide = seborrhea/follicular flushing/degreasing; salicylic acid = keratolytic). Contact-time guidance present (~5-10 min)? Cat-safety cautions where relevant? Clear "see a vet for diagnosis" framing?
- For foods (hypoallergenic/GI): hydrolyzed/novel-protein framing correct for true food allergy? Highly-digestible/low-fat/fiber-responsive framing correct for GI? Prescription diets correctly described as vet-authorization-gated context (NOT presented as freely-buyable affiliate picks)? AAFCO framing accurate (AAFCO sets nutrient profiles; the manufacturer makes the complete-and-balanced statement)? No dangerous nutritional advice?
- For aquarium: aeration science correct (air pumps oxygenate mainly via surface agitation/gas exchange, not bubbles dissolving O2; head pressure/depth matters; sponge filters/air stones need a pump)? HOB flow/GPH honesty? Biological vs mechanical filtration described correctly?
- Rankings must follow the guide's OWN stated criteria — flag any pick whose rank contradicts the methodology it sets out.
- Any overclaiming, any "we tested" hands-on claim, any unsafe recommendation, any spec that contradicts the verified product.
Report each factual problem with severity (blocking = could harm a pet or is plainly false; major = misleading; minor = imprecise) + the corrected fact. Return verdict + issues.`,
      { label: `vet:${slug}`, phase: 'Review', schema: REVIEW_SCHEMA, effort: 'xhigh' }
    ).then((r) => ({ ...r, lens: 'vet-factual' })),
    // Lens C — editorial / voice / cannibalization
    () => agent(
`ADVERSARIAL REVIEW — EDITORIAL/VOICE/CANNIBALIZATION LENS for ${file} (read it). Identify the most overlapping existing PetPalHQ guide from this guide's own related: slugs (read that overlapping guide at ${GDIR}/<related-slug>.md) and compare.
Check:
- Voice = PetPalHQ expert-consensus synthesis (authoritative, specific, no fluff). NO AI-slop words (revolutionary, game-changing, unleash, elevate, dive in, look no further, when it comes to, in today's world).
- Readability: sentences are SHORT (this guide must pass an FK 8-12 gate). Flag any long/clause-heavy sentence in visible prose.
- shortAnswer front-loads the actual named best pick in the first 1-2 sentences (AEO).
- TEMPLATED SCAFFOLDING: flag any >=6-word sentence opener repeated across >=3 pick bodies (reads AI-generated) — it must be varied.
- DIFFERENTIATION: is this guide genuinely distinct from the overlapping guide, or does it rehash it (keyword cannibalization)? It should add a unique angle and cross-link to the overlap guide via a real markdown /guides/ link, not duplicate its picks-framing. Flag overlap.
- description/excerpt are specific and compelling; title is clear + includes the year.
Return verdict + issues.`,
      { label: `ed:${slug}`, phase: 'Review', schema: REVIEW_SCHEMA, effort: 'high' }
    ).then((r) => ({ ...r, lens: 'editorial' })),
  ]).then((lenses) => lenses.filter(Boolean))
}

// Reduce the three lens results into a flat issue list + blocking/major counts.
function summarizeLenses(slug, lenses) {
  const allIssues = lenses.flatMap((l) => (l.issues || []).map((i) => ({ ...i, lens: l.lens })))
  const blocking = allIssues.filter((i) => i.severity === 'blocking')
  const major = allIssues.filter((i) => i.severity === 'major')
  return {
    slug,
    verdicts: lenses.map((l) => `${l.lens}:${l.verdict}`).join(' '),
    blockingCount: blocking.length,
    majorCount: major.length,
    allIssues,
    blockerSlice: blocking.concat(major),
  }
}

// STAGE 2 — fix every blocking + major issue (Opus, re-grounding facts in verified data).
function fixGuide(slug, issuesForFix) {
  const file = `${GDIR}/${slug}.md`
  const issuesJson = JSON.stringify(issuesForFix, null, 2)
  return agent(
`You are the FIX stage for a PetPalHQ guide: ${file} (read it fully).

CONTEXT:
- A research dossier of verified picks may exist at the scratchpad as dossier-${slug}.json — read it if present and ground every pick (asin/price/image/spec) in its verifiedPicks.
- This guide's own related: frontmatter names the overlapping existing guide(s) to differentiate from / cross-link to (read them at ${GDIR}/<related-slug>.md).

THE REVIEW ISSUES TO RESOLVE (resolve EVERY blocking and major, and as many minors as sensible):
${issuesJson}

${COMMON_RULES}

For YMYL factual issues: re-ground the claim against the REAL product. If a panel/active-ingredient/spec is uncertain, WEB-SEARCH the product by ASIN or exact title and correct it — never just soften wording around a false fact. Reconcile any ranking that contradicts the guide's own stated criteria.

After editing, RE-GATE this guide:
1. \`cd ${REPO} && npx tsx scripts/check-content-metrics.ts --slug ${slug}\` — confirm FK 8-12, dissent >=2.5, link density all pass (a missing-hero-image error is EXPECTED for a not-yet-illustrated guide and is fine).
2. \`cd ${REPO} && node scripts/validate-content.mjs\` — confirm no new errors.
Iterate until clean (except the known hero error). Return what you changed and the final gate state.`,
    { label: `fix:${slug}`, phase: 'Fix', schema: FIX_SCHEMA, model: 'opus', effort: 'xhigh' }
  )
}

// STAGE 3 — independent verify (a different agent that did NOT write or fix the guide).
function verifyGuide(slug, originalIssues) {
  const file = `${GDIR}/${slug}.md`
  const issuesJson = JSON.stringify(originalIssues, null, 2)
  return agent(
`You are an INDEPENDENT VERIFIER (you did NOT write or fix this guide). Read ${file} fresh.
These were the original review issues — confirm each BLOCKING and MAJOR is genuinely resolved (not just reworded around):
${issuesJson}
Also independently spot-check: (a) no factual claim contradicts the verified product (dossier-${slug}.json verifiedPicks if present; web-check any clinical/spec claim that looks shaky); (b) FAQ is in "**Q:?**/A:" format and 4-6 pairs parse; (c) the fix did not INTRODUCE a new error (e.g. broke FK, dropped a pick, created an inconsistency, added a duplicate ASIN); (d) for food guides: the ranking now matches the stated criteria.
Return your verdict (clean = no unresolved blocking/major and no new error; minor-remaining = only minors left; still-broken = a blocking/major remains or a new one was introduced).`,
    { label: `verify:${slug}`, phase: 'Verify', schema: VERIFY_SCHEMA, effort: 'xhigh' }
  )
}

// ---------------------------------------------------------------------------
// Per-slug orchestration: review -> (fix -> verify) loop until clean.
// ---------------------------------------------------------------------------

async function reviewOneSlug(slug) {
  let lastReview = null
  let lastFix = null
  let lastVerify = null
  let rounds = 0

  // Round 1 is always a fresh triple-lens review.
  const lenses = await reviewLenses(slug)
  lastReview = summarizeLenses(slug, lenses)

  // No blocking/major -> the guide is clean as-is; skip fix + verify.
  if (lastReview.blockerSlice.length === 0) {
    return {
      slug,
      verdict: 'clean',
      rounds: 0,
      reviewVerdicts: lastReview.verdicts,
      blockingCount: lastReview.blockingCount,
      majorCount: lastReview.majorCount,
      fix: null,
      verify: null,
      remainingIssues: lastReview.allIssues.filter((i) => i.severity === 'minor'),
    }
  }

  // Fix -> independent verify, looping (bounded) while still-broken.
  let issuesForFix = lastReview.blockerSlice
  while (rounds < MAX_ROUNDS) {
    rounds += 1
    lastFix = await fixGuide(slug, issuesForFix)
    lastVerify = await verifyGuide(slug, issuesForFix)

    if (lastVerify.verdict === 'clean' || lastVerify.verdict === 'minor-remaining') break

    // Still broken — feed the verifier's unresolved + new issues back into another fix round.
    const unresolved = (lastVerify.unresolvedIssues || []).map((p) => ({
      severity: 'blocking', field: 'unresolved', problem: p, fix: 'resolve fully, re-ground in verified data',
    }))
    const introduced = (lastVerify.newIssues || []).map((p) => ({
      severity: 'major', field: 'regression', problem: p, fix: 'revert the regression without losing the original fix',
    }))
    issuesForFix = unresolved.concat(introduced)
    if (issuesForFix.length === 0) break
  }

  return {
    slug,
    verdict: lastVerify ? lastVerify.verdict : 'clean',
    rounds,
    reviewVerdicts: lastReview.verdicts,
    blockingCount: lastReview.blockingCount,
    majorCount: lastReview.majorCount,
    fix: lastFix ? { changesSummary: lastFix.changesSummary, gatesPass: lastFix.gatesPass, remainingConcerns: lastFix.remainingConcerns } : null,
    verify: lastVerify ? { unresolved: lastVerify.unresolvedIssues, newIssues: lastVerify.newIssues, notes: lastVerify.notes } : null,
    remainingIssues: lastVerify ? (lastVerify.unresolvedIssues || []) : [],
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const slugs = Array.isArray(args) ? args.filter(Boolean) : []

if (slugs.length === 0) {
  log('petpal-content-review: no slugs supplied in args; nothing to review.')
  return { error: 'no slugs supplied', usage: "Workflow({ name: 'petpal-content-review', args: ['best-foo-2026', 'best-bar-2026'] })", results: [] }
}

phase('Review')
log(`petpal-content-review: ${slugs.length} guide(s) -> triple-lens review -> fix -> independent verify`)

// Each slug runs its own review->fix->verify pipeline; run them in parallel.
const results = await pipeline(slugs, (slug) => reviewOneSlug(slug))

const out = results.filter(Boolean)
const clean = out.filter((r) => r.verdict === 'clean').length
const minor = out.filter((r) => r.verdict === 'minor-remaining').length
const broken = out.filter((r) => r.verdict === 'still-broken').length

log(`petpal-content-review complete: ${clean} clean, ${minor} minor-remaining, ${broken} still-broken (of ${out.length})`)

return {
  summary: { total: out.length, clean, minorRemaining: minor, stillBroken: broken },
  shipReady: broken === 0,
  results: out,
}
