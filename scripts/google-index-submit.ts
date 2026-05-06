#!/usr/bin/env npx tsx
/**
 * Google Indexing API — fast indexing for individual URLs.
 *
 * Limit: 200 URLs/day per service account, per Google quota.
 * Used in the post-deploy GitHub Actions workflow to submit guide URLs
 * that changed in the deployed commit. Product/review URLs are
 * intentionally excluded — they re-crawl naturally via the guide link
 * graph, and burning quota on them would exhaust the daily budget.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json \
 *     npx tsx scripts/google-index-submit.ts --url https://petpalhq.com/guides/...
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json \
 *     npx tsx scripts/google-index-submit.ts --file urls.txt
 *
 *   npx tsx scripts/google-index-submit.ts --dry-run --url ...
 *
 * Auth: GoogleAuth picks up GOOGLE_APPLICATION_CREDENTIALS env var
 * (path to service account JSON) OR a workflow-mounted file at
 * .google-service-account.json in the project root.
 *
 * The service account must be added as Owner on the GSC property
 * for petpalhq.com — Google API will respond 403 PERMISSION_DENIED
 * otherwise.
 */

import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE_URL = 'https://petpalhq.com';
const FALLBACK_KEY_FILE = path.join(__dirname, '..', '.google-service-account.json');
const DAILY_LIMIT = 200;

async function getAuthClient() {
  const auth = new google.auth.GoogleAuth({
    // GoogleAuth resolution order:
    //  1. GOOGLE_APPLICATION_CREDENTIALS env var
    //  2. keyFile option
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || FALLBACK_KEY_FILE,
    scopes: ['https://www.googleapis.com/auth/indexing'],
  });

  if (
    !process.env.GOOGLE_APPLICATION_CREDENTIALS &&
    !fs.existsSync(FALLBACK_KEY_FILE)
  ) {
    throw new Error(
      'No service account credentials. Set GOOGLE_APPLICATION_CREDENTIALS env var ' +
        `or place a key file at ${FALLBACK_KEY_FILE}.`,
    );
  }

  return auth.getClient();
}

interface SubmitResult {
  url: string;
  success: boolean;
  error?: string;
}

async function submitUrl(
  authClient: unknown,
  url: string,
  type: 'URL_UPDATED' | 'URL_DELETED' = 'URL_UPDATED',
): Promise<SubmitResult> {
  try {
    await google.indexing('v3').urlNotifications.publish({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      auth: authClient as any,
      requestBody: { url, type },
    });
    return { url, success: true };
  } catch (err: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = err as any;
    const status = e?.response?.status;
    const message = e?.response?.data?.error?.message || e?.message || 'unknown';
    return { url, success: false, error: `${status}: ${message}` };
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  let urls: string[] = [];

  if (args.includes('--url')) {
    const idx = args.indexOf('--url');
    const raw = args[idx + 1];
    if (!raw) throw new Error('--url requires a value');
    urls = [raw.startsWith('http') ? raw : `${SITE_URL}${raw}`];
  } else if (args.includes('--file')) {
    const idx = args.indexOf('--file');
    const filePath = args[idx + 1];
    if (!filePath) throw new Error('--file requires a path');
    urls = fs
      .readFileSync(filePath, 'utf-8')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((u) => (u.startsWith('http') ? u : `${SITE_URL}${u}`));
  } else {
    console.error(
      'Usage: --url <URL> | --file <path> | --dry-run (with --url or --file)',
    );
    process.exit(1);
  }

  if (urls.length > DAILY_LIMIT) {
    console.log(
      `Warning: ${urls.length} URLs exceeds daily limit ${DAILY_LIMIT}. Submitting first ${DAILY_LIMIT}.`,
    );
    urls = urls.slice(0, DAILY_LIMIT);
  }

  console.log('Google Indexing API submission');
  console.log(`URLs: ${urls.length}`);
  console.log(`Daily limit: ${DAILY_LIMIT}`);
  console.log(dryRun ? 'Mode: DRY RUN\n' : 'Mode: LIVE\n');

  if (dryRun) {
    urls.forEach((u, i) => console.log(`  ${i + 1}. ${u}`));
    console.log('\nDry run complete.');
    return;
  }

  const authClient = await getAuthClient();

  let success = 0;
  let failed = 0;
  const errors: { url: string; error: string }[] = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const result = await submitUrl(authClient, url);

    if (result.success) {
      success++;
      console.log(`  ✓ ${i + 1}/${urls.length} ${url}`);
    } else {
      failed++;
      errors.push({ url, error: result.error || 'unknown' });
      console.log(`  ✗ ${i + 1}/${urls.length} ${url} — ${result.error}`);
    }

    // Rate-limit ~2 req/s (Google limit is roughly that)
    if (i < urls.length - 1) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`Submitted: ${success}/${urls.length}`);
  console.log(`Failed: ${failed}`);
  console.log(`Remaining daily budget: ${DAILY_LIMIT - success}`);

  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.forEach((e) => console.log(`  ${e.url}: ${e.error}`));
  }

  if (success === 0 && failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
