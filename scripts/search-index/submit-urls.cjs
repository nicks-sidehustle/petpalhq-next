#!/usr/bin/env node
/**
 * submit-urls.cjs — reusable batch search-index submitter (IndexNow + Google).
 *
 * WHY THIS EXISTS
 * ---------------
 * The post-deploy-index.yml workflow builds its URL set from a single-commit
 * diff (deployed TIP vs TIP~1). When several guides ship in one push (N commits,
 * ONE production Vercel deploy), only the guides touched in the tip commit reach
 * IndexNow + Google; the earlier N-1 commits in the same push are silently
 * skipped. This script is the *deterministic* fix: the ship step calls it with
 * the EXACT slugs/URLs just shipped, independent of git topology. The workflow
 * remains as a safety net.
 *
 * WHAT IT DOES
 * ------------
 *   - Tier 1: POST IndexNow (7 engines) with the same payload shape the workflow
 *     already builds (host/key/keyLocation/urlList). IndexNow key is public by
 *     design (also served at /{key}.txt and committed to the repo). The pet
 *     workflow reads INDEXNOW_KEY from secrets — this script honors that env var
 *     and falls back to the literal public key.
 *   - Tier 3: Google Indexing API, delegated to the existing
 *     scripts/google-index-submit.ts via `npx tsx` (reuses its googleapis auth,
 *     URL_UPDATED logic, and 200/day cap — NOT reimplemented here).
 *
 * USAGE
 * -----
 *   node scripts/search-index/submit-urls.cjs --url https://petpalhq.com/guides/foo
 *   node scripts/search-index/submit-urls.cjs --url <u1> --url <u2> --slug bar --slug baz
 *   node scripts/search-index/submit-urls.cjs --file /tmp/urls.txt
 *   node scripts/search-index/submit-urls.cjs --slug foo --dry-run
 *   node scripts/search-index/submit-urls.cjs --slug foo --indexnow-only
 *   node scripts/search-index/submit-urls.cjs --slug foo --google-only
 *
 * FLAGS
 *   --url <URL>            Absolute URL to submit (repeatable).
 *   --slug <slug>          Guide slug → https://petpalhq.com/guides/{slug} (repeatable).
 *   --file <path>          File with one URL (or bare slug) per line.
 *   --indexnow-only        Skip Google.
 *   --google-only          Skip IndexNow.
 *   --dry-run              Print the payload + planned Google calls; POST nothing.
 *   --indexnow-key <key>   Override IndexNow key (default: INDEXNOW_KEY env or inlined public key).
 *
 * EXIT CODES
 *   0  always on submission attempts (search-index failures must never block a ship).
 *   2  usage error (no URLs provided / bad flags).
 *
 * Google creds: delegated script reads GOOGLE_APPLICATION_CREDENTIALS (or
 * GOOGLE_SERVICE_ACCOUNT_JSON written to a temp file by the caller) — same path
 * the workflow already uses. If neither is present, the Google leg is skipped
 * with a warning (IndexNow still runs).
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

// ---- Repo-specific constants (public by design) ----------------------------
const HOST = 'petpalhq.com';
const BASE_URL = `https://${HOST}`;
const DEFAULT_INDEXNOW_KEY = '97b4501830e1517ea48c01d86ff03a81';
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/IndexNow';
const GOOGLE_SUBMIT_SCRIPT = path.join(__dirname, '..', 'google-index-submit.ts');
const GOOGLE_DAILY_LIMIT = 200; // mirrors google-index-submit.ts DAILY_LIMIT

// ---- Arg parsing -----------------------------------------------------------
function parseArgs(argv) {
  const out = {
    urls: [],
    slugs: [],
    files: [],
    indexnowOnly: false,
    googleOnly: false,
    dryRun: false,
    indexnowKey: process.env.INDEXNOW_KEY || DEFAULT_INDEXNOW_KEY,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--url':
        out.urls.push(argv[++i]);
        break;
      case '--slug':
        out.slugs.push(argv[++i]);
        break;
      case '--file':
        out.files.push(argv[++i]);
        break;
      case '--indexnow-only':
        out.indexnowOnly = true;
        break;
      case '--google-only':
        out.googleOnly = true;
        break;
      case '--dry-run':
        out.dryRun = true;
        break;
      case '--indexnow-key':
        out.indexnowKey = argv[++i];
        break;
      default:
        console.error(`Unknown argument: ${a}`);
        process.exit(2);
    }
  }
  return out;
}

function toUrl(token) {
  const t = String(token || '').trim();
  if (!t) return null;
  if (t.startsWith('http://') || t.startsWith('https://')) return t;
  // Bare slug → canonical guide URL.
  return `${BASE_URL}/guides/${t}`;
}

function collectUrls(opts) {
  const urls = [];
  for (const u of opts.urls) {
    const v = toUrl(u);
    if (v) urls.push(v);
  }
  for (const s of opts.slugs) {
    const v = toUrl(s);
    if (v) urls.push(v);
  }
  for (const f of opts.files) {
    if (!fs.existsSync(f)) {
      console.error(`--file not found: ${f}`);
      continue;
    }
    const lines = fs
      .readFileSync(f, 'utf-8')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    for (const l of lines) {
      const v = toUrl(l);
      if (v) urls.push(v);
    }
  }
  // Dedupe, preserve order.
  return [...new Set(urls)];
}

// ---- IndexNow (Tier 1) -----------------------------------------------------
async function submitIndexNow(urls, key, dryRun) {
  const payload = {
    host: HOST,
    key,
    keyLocation: `${BASE_URL}/${key}.txt`,
    urlList: urls,
  };

  if (dryRun) {
    console.log('[IndexNow] DRY RUN — payload that WOULD be POSTed:');
    console.log(JSON.stringify(payload, null, 2));
    return { ok: true, httpCode: 'dry-run' };
  }

  const body = JSON.stringify(payload);
  const post = async () => {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body,
    });
    return res;
  };

  try {
    let res = await post();
    // Retry once on transient 429/5xx (mirrors the workflow).
    if (res.status === 429 || (res.status >= 500 && res.status <= 599)) {
      console.log(`[IndexNow] transient ${res.status} — retrying in 5s...`);
      await new Promise((r) => setTimeout(r, 5000));
      res = await post();
    }
    const okCodes = res.ok || res.status === 200 || res.status === 202;
    console.log(
      `[IndexNow] HTTP ${res.status} for ${urls.length} URL(s) — ${okCodes ? 'accepted' : 'WARN non-success'}`
    );
    return { ok: okCodes, httpCode: res.status };
  } catch (err) {
    console.error(`[IndexNow] error: ${err && err.message ? err.message : err}`);
    return { ok: false, httpCode: '000' };
  }
}

// ---- Google Indexing API (Tier 3) — delegate to existing TS script ---------
function submitGoogle(urls, dryRun) {
  if (!fs.existsSync(GOOGLE_SUBMIT_SCRIPT)) {
    console.error(`[Google] delegate script missing: ${GOOGLE_SUBMIT_SCRIPT} — skipping Google.`);
    return { submitted: 0, failed: 0, skipped: true };
  }

  const haveCreds =
    !!process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
    fs.existsSync(path.join(__dirname, '..', '..', '.google-service-account.json'));

  if (!haveCreds && !dryRun) {
    console.warn(
      '[Google] no credentials (GOOGLE_APPLICATION_CREDENTIALS / GOOGLE_SERVICE_ACCOUNT_JSON / .google-service-account.json) — skipping Google leg.'
    );
    return { submitted: 0, failed: 0, skipped: true };
  }

  // If JSON was passed inline (as the workflow does), materialize it to a temp
  // file and point GOOGLE_APPLICATION_CREDENTIALS at it — that's what the
  // delegate script expects.
  let tmpKeyFile = null;
  const childEnv = { ...process.env };
  if (!childEnv.GOOGLE_APPLICATION_CREDENTIALS && childEnv.GOOGLE_SERVICE_ACCOUNT_JSON) {
    tmpKeyFile = path.join(os.tmpdir(), `sa-key-${process.pid}.json`);
    fs.writeFileSync(tmpKeyFile, childEnv.GOOGLE_SERVICE_ACCOUNT_JSON, { mode: 0o600 });
    childEnv.GOOGLE_APPLICATION_CREDENTIALS = tmpKeyFile;
  }

  const capped = urls.slice(0, GOOGLE_DAILY_LIMIT);
  if (urls.length > GOOGLE_DAILY_LIMIT) {
    console.warn(
      `[Google] ${urls.length} URLs exceeds daily cap ${GOOGLE_DAILY_LIMIT}; submitting first ${GOOGLE_DAILY_LIMIT}.`
    );
  }

  let submitted = 0;
  let failed = 0;
  try {
    for (const url of capped) {
      const args = ['tsx', GOOGLE_SUBMIT_SCRIPT, '--url', url];
      if (dryRun) args.push('--dry-run');
      const r = spawnSync('npx', args, {
        env: childEnv,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      const stdout = r.stdout || '';
      const stderr = r.stderr || '';
      const okMatch = /✓|Submitted: [1-9]/.test(stdout);
      if (dryRun) {
        // In dry-run the delegate just prints the URL it would submit.
        console.log(`[Google] DRY RUN would submit: ${url}`);
        submitted++;
      } else if (r.status === 0 && okMatch) {
        console.log(`[Google] OK   ${url}`);
        submitted++;
      } else {
        console.log(`[Google] FAIL ${url}`);
        const tail = (stderr || stdout).trim().split('\n').slice(-3).join('\n');
        if (tail) console.log(`         ${tail}`);
        failed++;
      }
      // Light pacing between calls (the delegate also rate-limits internally,
      // but it exits per-URL here so we add a small gap).
      if (!dryRun) {
        const wait = 300;
        const end = Date.now() + wait;
        while (Date.now() < end) {
          /* tiny sync wait to keep this fn dependency-free */
        }
      }
    }
  } finally {
    if (tmpKeyFile) {
      try {
        fs.unlinkSync(tmpKeyFile);
      } catch {
        /* ignore */
      }
    }
  }

  return { submitted, failed, skipped: false };
}

// ---- Main ------------------------------------------------------------------
async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.indexnowOnly && opts.googleOnly) {
    console.error('--indexnow-only and --google-only are mutually exclusive.');
    process.exit(2);
  }

  const urls = collectUrls(opts);
  if (urls.length === 0) {
    console.error('No URLs to submit. Pass --url / --slug / --file.');
    process.exit(2);
  }

  console.log(`submit-urls: ${urls.length} URL(s)`);
  urls.forEach((u, i) => console.log(`  ${i + 1}. ${u}`));
  console.log(opts.dryRun ? 'Mode: DRY RUN (no POSTs)\n' : 'Mode: LIVE\n');

  let indexnow = { ok: true, httpCode: 'skipped' };
  let google = { submitted: 0, failed: 0, skipped: true };

  if (!opts.googleOnly) {
    indexnow = await submitIndexNow(urls, opts.indexnowKey, opts.dryRun);
  }
  if (!opts.indexnowOnly) {
    google = submitGoogle(urls, opts.dryRun);
  }

  console.log('\n=== submit-urls summary ===');
  console.log(`IndexNow: ${opts.googleOnly ? 'skipped' : `HTTP ${indexnow.httpCode}`}`);
  console.log(
    `Google:   ${
      opts.indexnowOnly
        ? 'skipped'
        : google.skipped
          ? 'skipped (no creds / delegate missing)'
          : `${google.submitted} submitted, ${google.failed} failed`
    }`
  );

  // Never fail a ship over a search-index hiccup.
  process.exit(0);
}

main().catch((err) => {
  console.error(`submit-urls fatal: ${err && err.stack ? err.stack : err}`);
  // Still exit 0 — index submission must not block deploys.
  process.exit(0);
});
