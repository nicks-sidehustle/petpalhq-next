#!/usr/bin/env node
/**
 * Post-deploy index gate for CHANGED GUIDE URLs (petpal port of the sister
 * repo's WI-2 gate; multisite conversion program, owner ruling 2026-09-01
 * R-P4 / PLAN §5 ruling 7 — the same class fix on all four sister indexers).
 *
 * Owns two decisions that had no home at all in
 * `.github/workflows/post-deploy-index.yml` on this repo:
 *
 *   (1) GUIDE_CAP — a hard ceiling (default 25) on how many changed-guide
 *       URLs one deploy may derive. Over the cap, derive NOTHING and say so
 *       with an `::error::`, rather than trusting any derivation to
 *       auto-submit an unbounded set.
 *   (2) `[skip-index]` — a marker read from the DEPLOYED COMMIT MESSAGE.
 *       Present -> this deploy submits nothing at all, to any engine, and
 *       says so with a `::notice::`.
 *
 * WHY THIS EXISTS. The workflow derives one guide URL per changed
 * `src/content/guides/*.md` file with NO upper bound, and its
 * `git diff --name-status` loop reads STATUS only to echo it — there is no
 * add/modify/delete filter, so a DELETION derives a URL exactly as an
 * addition does. A codemod, a bulk retitle, or a corpus-wide regen over this
 * site's 252-guide corpus would therefore announce the whole corpus to
 * IndexNow (and eat the shared Google Indexing API 200/day pool) in one
 * deploy. That is exactly the churn trigger behind the portfolio's Bing
 * grounding cuts (CLAUDE.md "AI-Grounding Protection", RUNBOOK §4.23 IndexNow
 * hygiene / §4.24 churn ceiling on a cited site); petpal draws ~10,000 BWT
 * citations/7d.
 *
 * THE MARKER IS FOR CONTENT-PRESERVING DEPLOYS ONLY — a merge after which the
 * page renders the same information (tooling/workflow/refactor merges, data
 * refreshes that keep the same rendered content) and carries nothing an index
 * needs to re-read.
 *
 * WHERE TO PUT THE MARKER. The workflow triggers on `deployment_status` and
 * therefore has no PR context — a PR *label* would need an extra API call and
 * a repo flag. The commit message needs neither, but ONLY because of a repo
 * setting: `squash_merge_commit_title=PR_TITLE` and
 * `squash_merge_commit_message=PR_BODY`. Under those, a squash merge takes the
 * PR title as the commit subject and the PR body as the commit body, so a PR
 * titled `... [skip-index]` reaches this gate with no extra machinery.
 * `merge_commit_message=PR_TITLE` covers the merge-commit path the same way.
 *
 * IF THAT SETTING IS NOT IN PLACE, the marker must be placed in the COMMIT
 * MESSAGE itself (author it into the commit subject), not the PR title. Under
 * `squash_merge_commit_title=COMMIT_OR_PR_TITLE` a SINGLE-commit PR squashes
 * to that commit's own subject and a marker living only in the PR title is
 * silently dropped — the gate then reads `normal` and the deploy submits.
 * That is the over-submission direction this gate exists to prevent, so treat
 * the repo setting as part of the contract: check it before relying on a
 * title-only marker.
 *
 * FAIL-SAFE DIRECTION. Everywhere else in this workflow under-submission is
 * the worse failure (see its debounce "fail CLOSED" comment); here it is the
 * reverse. Over-submission is the failure this gate exists to prevent, so
 * every ambiguous case resolves toward submitting LESS: the marker match is
 * case-insensitive (a `[Skip-Index]` typo must not release a corpus-wide
 * submission), an unparseable line is not counted as a guide, and both gated
 * branches derive the EMPTY set rather than a truncated one. The run always
 * stays green — indexing must never block a deploy.
 *
 * Zero dependencies on purpose: this step runs on the runner's stock node,
 * before any `npm ci` (this workflow never installs at all).
 *
 * Usage (see the "Detect changed guides" step of post-deploy-index.yml):
 *   node scripts/search-index/guide-index-gate.mjs \
 *     --name-status-file /tmp/changed-name-status.txt \
 *     --commit-message-file /tmp/deployed-commit-message.txt \
 *     --base-url https://petpalhq.com \
 *     --cap 25 \
 *     --urls-out /tmp/guide-urls.txt \
 *     --decision-out /tmp/guide-index-gate.env
 *
 * Writes the (possibly empty) guide URL list to --urls-out, a shell-sourceable
 * decision to --decision-out, and prints its annotations to stdout.
 */
import * as fs from 'node:fs';
import { pathToFileURL } from 'node:url';

/** Portfolio-parity default, same number as the sister gate's GUIDE_CAP. */
export const GUIDE_CAP_DEFAULT = 25;

export const SKIP_INDEX_MARKER = '[skip-index]';

/**
 * Guide source paths, matched exactly as the workflow's own `case` arm matches
 * them (`src/content/guides/*.md`). In a bash `case` pattern `*` is not
 * pathname expansion and therefore DOES cross `/`, so `.*` is the faithful
 * translation. petpal is a single-lane `.md` corpus under `src/content/guides/`.
 */
const GUIDE_PATH_RE = /^src\/content\/guides\/.*\.md$/;

export function parseArgs(argv) {
  const args = {
    nameStatusFile: null,
    commitMessageFile: null,
    baseUrl: 'https://petpalhq.com',
    cap: GUIDE_CAP_DEFAULT,
    urlsOut: null,
    decisionOut: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const next = argv[i + 1];
    switch (argv[i]) {
      case '--name-status-file': args.nameStatusFile = next; i += 1; break;
      case '--commit-message-file': args.commitMessageFile = next; i += 1; break;
      case '--base-url': args.baseUrl = next; i += 1; break;
      case '--cap': args.cap = Number.parseInt(next, 10); i += 1; break;
      case '--urls-out': args.urlsOut = next; i += 1; break;
      case '--decision-out': args.decisionOut = next; i += 1; break;
      default: break;
    }
  }
  return args;
}

/** Literal `[skip-index]` anywhere in the message; case-insensitive per the fail-safe direction above. */
export function hasSkipIndexMarker(commitMessage) {
  return String(commitMessage ?? '').toLowerCase().includes(SKIP_INDEX_MARKER);
}

/** Mirrors the workflow's `basename "$FILE" .md`: strip the trailing `.md` only. */
export function slugForGuidePath(file) {
  const base = file.slice(file.lastIndexOf('/') + 1);
  return base.endsWith('.md') ? base.slice(0, -3) : base;
}

/**
 * Derive the changed-guide URL set from `git diff --name-status` text.
 *
 * Every status counts — `A`, `M` and `D` alike — because the workflow's URL
 * mapping has no status filter and a deleted guide's URL is submitted exactly
 * as an added one's is. Renames (`R###`) and copies (`C###`) carry TWO paths;
 * both are considered, since a slug rename genuinely changes two URLs (the
 * workflow's own `IFS=$'\t' read -r STATUS FILE` loop silently drops the
 * second path — the gate is deliberately the wider of the two, never the
 * narrower).
 */
export function deriveGuideUrls(nameStatus, baseUrl) {
  const files = [];
  for (const rawLine of String(nameStatus ?? '').split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    if (line.trim() === '') continue;
    const fields = line.split('\t');
    for (const path of fields.slice(1)) {
      const file = path.trim();
      if (file !== '' && GUIDE_PATH_RE.test(file)) files.push(file);
    }
  }
  const urls = [];
  const seen = new Set();
  for (const file of files) {
    const url = `${baseUrl}/guides/${slugForGuidePath(file)}`;
    if (seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }
  return { files, urls };
}

/**
 * The whole gate decision, as a pure function — this is the unit the mutation
 * tests exercise, so the gate can never be "shipped but untested".
 *
 * The marker outranks the cap: a marked deploy submits nothing regardless of
 * size, and its annotation names the marker rather than the count.
 *
 * @param {{ nameStatus?: string, commitMessage?: string, baseUrl?: string, cap?: number }} [options]
 */
export function evaluateGuideIndexGate(options = {}) {
  const { nameStatus, commitMessage, baseUrl, cap = GUIDE_CAP_DEFAULT } = options;
  const effectiveCap = Number.isFinite(cap) ? cap : GUIDE_CAP_DEFAULT;
  const { files, urls } = deriveGuideUrls(nameStatus, baseUrl);
  const derivedCount = urls.length;
  const base = {
    derivedCount,
    guideFileCount: files.length,
    cap: effectiveCap,
  };

  if (hasSkipIndexMarker(commitMessage)) {
    return {
      ...base,
      decision: 'skip-marker',
      guideUrls: [],
      reason: `deployed commit message carries the ${SKIP_INDEX_MARKER} marker — ${derivedCount} changed-guide URL(s) and every other derived URL withheld from IndexNow and the Google Indexing API`,
      annotations: [
        `::notice::${SKIP_INDEX_MARKER} in the deployed commit message — submitting NOTHING for this deploy (IndexNow and the Google Indexing API leg both skipped). ${derivedCount} changed-guide URL(s) from ${files.length} changed guide file(s) were derived and discarded, along with every non-guide route URL. The marker is for content-preserving deploys: the served page carries no new information for an index. If this deploy DID change what a page says, re-deploy without the marker or submit manually.`,
      ],
    };
  }

  if (derivedCount > effectiveCap) {
    return {
      ...base,
      decision: 'over-cap',
      guideUrls: [],
      reason: `${derivedCount} changed-guide URLs exceeded GUIDE_CAP=${effectiveCap} — no guide URLs derived`,
      annotations: [
        `::error::Changed-guide derivation found ${derivedCount} guide URL(s) from ${files.length} changed guide file(s) (cap: ${effectiveCap}) — this looks like a codemod, a bulk deletion or a corpus-wide regen, not a normal per-guide ship. NOT auto-submitting ANY derived guide URLs from this diff, to IndexNow or to the Google Indexing API. Ship the change in waves of <= ${effectiveCap} guides per merge, or mark it ${SKIP_INDEX_MARKER} if it is content-preserving, or submit manually once reviewed.`,
      ],
    };
  }

  return {
    ...base,
    decision: 'normal',
    guideUrls: urls,
    reason: '',
    annotations: [],
  };
}

/**
 * The decision is sourced by the workflow's `bash -e` shell and some fields are
 * interpolated into a later step's `${{ }}`, so every emitted value is held to
 * a conservative charset. Values here are script-authored (never a commit
 * message), so this is a belt-and-braces guarantee, not a parser.
 */
export function shellSafe(value) {
  return String(value ?? '').replace(/[^A-Za-z0-9 _.,:;/=<>()@+-]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function renderDecisionEnv(result) {
  return [
    `GATE_DECISION='${shellSafe(result.decision)}'`,
    `GATE_CAP='${shellSafe(String(result.cap))}'`,
    `GATE_DERIVED_COUNT='${shellSafe(String(result.derivedCount))}'`,
    `GATE_GUIDE_FILE_COUNT='${shellSafe(String(result.guideFileCount))}'`,
    `GATE_REASON='${shellSafe(result.reason)}'`,
    '',
  ].join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.nameStatusFile || !args.urlsOut || !args.decisionOut) {
    console.error(
      'Usage: guide-index-gate.mjs --name-status-file <f> --commit-message-file <f> ' +
        '--urls-out <f> --decision-out <f> [--base-url <url>] [--cap <n>]',
    );
    process.exit(1);
  }

  const nameStatus = fs.existsSync(args.nameStatusFile)
    ? fs.readFileSync(args.nameStatusFile, 'utf-8')
    : '';
  const commitMessage =
    args.commitMessageFile && fs.existsSync(args.commitMessageFile)
      ? fs.readFileSync(args.commitMessageFile, 'utf-8')
      : '';

  const result = evaluateGuideIndexGate({
    nameStatus,
    commitMessage,
    baseUrl: args.baseUrl,
    cap: args.cap,
  });

  fs.writeFileSync(
    args.urlsOut,
    result.guideUrls.length > 0 ? `${result.guideUrls.join('\n')}\n` : '',
    'utf-8',
  );
  fs.writeFileSync(args.decisionOut, renderDecisionEnv(result), 'utf-8');

  for (const annotation of result.annotations) console.log(annotation);
  console.log(
    `guide-index-gate: decision=${result.decision} derived=${result.derivedCount} ` +
      `files=${result.guideFileCount} cap=${result.cap} submitted=${result.guideUrls.length}`,
  );
}

// Only run when executed directly (not when imported by a test).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
