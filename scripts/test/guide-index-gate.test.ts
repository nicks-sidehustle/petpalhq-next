/**
 * Mutation tests for scripts/search-index/guide-index-gate.mjs.
 *
 * MUTATION CONTRACT: every assertion here is written so that removing the
 * guard it covers turns it RED. Delete the `derivedCount > effectiveCap`
 * branch and the 26-guide / 30-deletion cases fail with 26 / 30 derived URLs
 * instead of 0; delete the `hasSkipIndexMarker` branch and the two
 * `[skip-index]` cases fail with 3 / 420. Both mutants were run and the red
 * output is pasted in the PR body, per RUNBOOK §8hh (a guard is only tested
 * once it is shown to BLOCK).
 *
 * Why this gate exists at all: `.github/workflows/post-deploy-index.yml`
 * derived one guide URL per changed `src/content/guides/*.md` file with NO
 * upper bound and NO add/modify/delete filter — a deletion derives a URL
 * exactly as an addition does. On a site drawing ~10,000 BWT citations/7d,
 * one codemod or corpus regen would have announced the whole 252-guide corpus
 * to IndexNow in a single deploy (CLAUDE.md "AI-Grounding Protection":
 * changed URLs only, never the full corpus).
 *
 * Run: npx tsx scripts/test/guide-index-gate.test.ts
 */
import {
  GUIDE_CAP_DEFAULT,
  SKIP_INDEX_MARKER,
  deriveGuideUrls,
  evaluateGuideIndexGate,
  hasSkipIndexMarker,
  renderDecisionEnv,
  shellSafe,
  slugForGuidePath,
} from "../search-index/guide-index-gate.mjs";

const BASE_URL = "https://petpalhq.com";

let failures = 0;
let checks = 0;

function assert(cond: boolean, msg: string) {
  checks++;
  if (!cond) {
    failures++;
    console.error(`  FAIL: ${msg}`);
  }
}

/** Synthetic `git diff --name-status` text: one TAB-separated record per line. */
function nameStatus(records: Array<[string, string]>): string {
  return records.map(([status, file]) => `${status}\t${file}`).join("\n");
}

function guides(n: number, status: string, prefix = "guide"): Array<[string, string]> {
  return Array.from({ length: n }, (_, i) => [
    status,
    `src/content/guides/${prefix}-${i + 1}.md`,
  ]);
}

function evaluate(records: Array<[string, string]>, commitMessage = "chore: a normal ship") {
  return evaluateGuideIndexGate({
    nameStatus: nameStatus(records),
    commitMessage,
    baseUrl: BASE_URL,
    cap: GUIDE_CAP_DEFAULT,
  });
}

console.log("guide-index-gate — the seven named cases");

// ── Case 1: 25 changed guides (exactly at the cap) derives all 25 ──────────
{
  const r = evaluate(guides(25, "M"));
  assert(r.decision === "normal", `25 guides is at the cap, decision normal (got ${r.decision})`);
  assert(r.derivedCount === 25, `25 guides derives 25 (got ${r.derivedCount})`);
  assert(r.guideUrls.length === 25, `25 guide URLs submitted (got ${r.guideUrls.length})`);
  assert(
    r.guideUrls[0] === `${BASE_URL}/guides/guide-1`,
    `first URL is ${BASE_URL}/guides/guide-1 (got ${r.guideUrls[0]})`,
  );
  assert(r.annotations.length === 0, "a normal ship emits no annotation");
}

// ── Case 2: 26 changed guides derives ZERO + ::error:: naming count and cap ─
{
  const r = evaluate(guides(26, "M"));
  assert(r.decision === "over-cap", `26 guides is over the cap (got ${r.decision})`);
  assert(r.guideUrls.length === 0, `over cap derives the EMPTY set, never a truncated one (got ${r.guideUrls.length})`);
  assert(r.derivedCount === 26, `the count is still reported: 26 (got ${r.derivedCount})`);
  assert(r.annotations.length === 1, `exactly one annotation (got ${r.annotations.length})`);
  const a = r.annotations[0] ?? "";
  assert(a.startsWith("::error::"), "over-cap annotation is an ::error::");
  assert(a.includes("26"), "::error:: names the derived count 26");
  assert(a.includes(`cap: ${GUIDE_CAP_DEFAULT}`), `::error:: names the cap ${GUIDE_CAP_DEFAULT}`);
  assert(a.includes("IndexNow"), "::error:: names IndexNow");
  assert(a.includes("Google Indexing API"), "::error:: names the Google Indexing API");
}

// ── Case 3: 30 DELETIONS derive URLs exactly as additions do, so they gate ──
{
  const deletions = Array.from(
    { length: 30 },
    (_, i) => ["D", `src/content/guides/retired-${i + 1}.md`] as [string, string],
  );
  assert(
    deriveGuideUrls(nameStatus(deletions), BASE_URL).urls.length === 30,
    "premise: 30 deletions derive 30 URLs before the cap is applied",
  );
  const r = evaluate(deletions);
  assert(r.decision === "over-cap", `30 deletions are over the cap (got ${r.decision})`);
  assert(r.guideUrls.length === 0, `30 deletions submit nothing (got ${r.guideUrls.length})`);
  assert(r.derivedCount === 30, `deletions counted like additions: 30 (got ${r.derivedCount})`);
  assert((r.annotations[0] ?? "").includes("30"), "::error:: names the deletion count 30");
}

// ── Case 4: [skip-index] + 3 changed guides submits NOTHING ────────────────
{
  const r = evaluate(
    guides(3, "M"),
    `ops: workflow-only change ${SKIP_INDEX_MARKER}`,
  );
  assert(r.decision === "skip-marker", `marker present, decision skip-marker (got ${r.decision})`);
  assert(r.guideUrls.length === 0, `marker submits nothing (got ${r.guideUrls.length})`);
  assert(r.derivedCount === 3, `derived count still reported under the marker: 3 (got ${r.derivedCount})`);
  assert(r.annotations.length === 1, `exactly one annotation (got ${r.annotations.length})`);
  assert((r.annotations[0] ?? "").startsWith("::notice::"), "marker annotation is a ::notice::");
  assert((r.annotations[0] ?? "").includes(SKIP_INDEX_MARKER), "::notice:: names the marker");
  assert(r.reason.includes(SKIP_INDEX_MARKER), "the receipt reason names the marker");
}

// ── Case 5: no marker + 3 changed guides derives all 3 ─────────────────────
{
  const r = evaluate(guides(3, "M"), "content(guides): ship 3 refreshed guides (#999)");
  assert(r.decision === "normal", `no marker, decision normal (got ${r.decision})`);
  assert(
    JSON.stringify(r.guideUrls) ===
      JSON.stringify([
        `${BASE_URL}/guides/guide-1`,
        `${BASE_URL}/guides/guide-2`,
        `${BASE_URL}/guides/guide-3`,
      ]),
    `3 guide URLs derived in order (got ${JSON.stringify(r.guideUrls)})`,
  );
  assert(r.annotations.length === 0, "a normal ship emits no annotation");
}

// ── Case 6: [Skip-Index] mixed case is still the marker (fail-safe direction) ─
{
  const r = evaluate(guides(3, "M"), "ops: tooling only [Skip-Index]");
  assert(r.decision === "skip-marker", `mixed-case [Skip-Index] still gates (got ${r.decision})`);
  assert(r.guideUrls.length === 0, `mixed-case marker submits nothing (got ${r.guideUrls.length})`);

  assert(hasSkipIndexMarker("fix: something [skip-index]"), "lowercase marker matches");
  assert(hasSkipIndexMarker("fix: something [Skip-Index]"), "mixed-case marker matches");
  assert(
    hasSkipIndexMarker("subject line\n\nbody says [SKIP-INDEX] here"),
    "marker matches anywhere in the message body, not just the subject",
  );
  assert(!hasSkipIndexMarker("fix: skip index please"), "prose 'skip index' is NOT the marker");
  assert(
    !hasSkipIndexMarker("fix: mentions skip-index without brackets"),
    "unbracketed skip-index is NOT the marker",
  );
  assert(!hasSkipIndexMarker(""), "an empty commit message is not a marker");
  assert(!hasSkipIndexMarker(undefined), "a missing commit message is not a marker");
}

// ── Case 7: a rename record carries TWO paths; both slugs derive ───────────
{
  const r = deriveGuideUrls(
    "R100\tsrc/content/guides/old-slug.md\tsrc/content/guides/new-slug.md",
    BASE_URL,
  );
  assert(
    JSON.stringify(r.urls) ===
      JSON.stringify([`${BASE_URL}/guides/old-slug`, `${BASE_URL}/guides/new-slug`]),
    `a rename derives both slugs (got ${JSON.stringify(r.urls)})`,
  );
}

console.log("guide-index-gate — marker precedence");

{
  const r = evaluate(guides(420, "M"), `codemod: literal -> token ${SKIP_INDEX_MARKER}`);
  assert(r.decision === "skip-marker", `marker outranks the cap (got ${r.decision})`);
  assert(r.derivedCount === 420, `derived count still 420 under the marker (got ${r.derivedCount})`);
  assert(r.guideUrls.length === 0, "marker submits nothing at any size");
}

console.log("guide-index-gate — derivation fidelity to the workflow it replaces");

{
  const r = deriveGuideUrls(
    nameStatus([
      ["A", "src/content/guides/added.md"],
      ["M", "src/content/guides/modified.md"],
      ["D", "src/content/guides/deleted.md"],
    ]),
    BASE_URL,
  );
  assert(
    JSON.stringify(r.urls) ===
      JSON.stringify([
        `${BASE_URL}/guides/added`,
        `${BASE_URL}/guides/modified`,
        `${BASE_URL}/guides/deleted`,
      ]),
    `A, M and D all derive URLs (got ${JSON.stringify(r.urls)})`,
  );
}

{
  // The other watched paths keep their own mapping arms in the workflow; the
  // gate must not steal them (over-cap zeroes guide URLs only).
  const r = deriveGuideUrls(
    nameStatus([
      ["M", "src/app/page.tsx"],
      ["M", "src/app/guides/page.tsx"],
      ["M", "src/app/scores/page.tsx"],
      ["M", "src/app/deals/page.tsx"],
      ["M", "src/app/methodology/page.tsx"],
      ["M", "data/amazon-prices.json"],
      ["M", "src/content/guides/real-guide.md"],
    ]),
    BASE_URL,
  );
  assert(
    JSON.stringify(r.urls) === JSON.stringify([`${BASE_URL}/guides/real-guide`]),
    `non-guide watched paths derive no guide URL (got ${JSON.stringify(r.urls)})`,
  );
}

{
  const r = deriveGuideUrls(
    nameStatus([
      ["A", "src/content/guides/best-dog-beds-2026.md"],
      ["M", "src/content/guides/best-dog-beds-2026.md"],
    ]),
    BASE_URL,
  );
  assert(r.files.length === 2, `two file records seen (got ${r.files.length})`);
  assert(
    JSON.stringify(r.urls) === JSON.stringify([`${BASE_URL}/guides/best-dog-beds-2026`]),
    `deduped to one URL (got ${JSON.stringify(r.urls)})`,
  );
}

{
  assert(deriveGuideUrls("", BASE_URL).urls.length === 0, "an empty diff derives nothing");
  assert(deriveGuideUrls("\n\n", BASE_URL).urls.length === 0, "blank lines derive nothing");
  assert(
    JSON.stringify(deriveGuideUrls("M\tsrc/content/guides/a.md\r\n\r\n", BASE_URL).urls) ===
      JSON.stringify([`${BASE_URL}/guides/a`]),
    "CRLF input still derives the right URL",
  );
  assert(
    slugForGuidePath("src/content/guides/best-cat-trees.md") === "best-cat-trees",
    "slug strips the trailing .md, matching basename FILE .md",
  );
}

console.log("guide-index-gate — the decision handed back to the workflow");

{
  const env = renderDecisionEnv(evaluate(guides(26, "M")));
  assert(env.includes("GATE_DECISION='over-cap'"), "env carries GATE_DECISION");
  assert(env.includes(`GATE_CAP='${GUIDE_CAP_DEFAULT}'`), "env carries GATE_CAP");
  assert(env.includes("GATE_DERIVED_COUNT='26'"), "env carries GATE_DERIVED_COUNT=26");
  assert(env.includes("GATE_GUIDE_FILE_COUNT='26'"), "env carries GATE_GUIDE_FILE_COUNT=26");
  assert(/GATE_REASON='[^'\n]*'/.test(env), "GATE_REASON is a single quoted line");
  assert(!/[`$\\"]/.test(env), "env contains no shell quoting or expansion metacharacters");
}

{
  assert(shellSafe("a `b` $c \"d\" \\e 'f'") === "a b c d e f", "shellSafe strips metacharacters");
  assert(
    shellSafe("26 changed-guide URLs exceeded GUIDE_CAP=25") ===
      "26 changed-guide URLs exceeded GUIDE_CAP=25",
    "shellSafe leaves an ordinary reason intact",
  );
  const env = renderDecisionEnv(evaluate(guides(1, "M")));
  assert(env.includes("GATE_DECISION='normal'"), "a normal decision reports normal");
  assert(env.includes("GATE_REASON=''"), "a normal decision carries no reason for the receipt");
}

console.log(`\n${checks} checks, ${failures} failures`);
if (failures > 0) process.exit(1);
console.log("guide-index-gate: PASS");
