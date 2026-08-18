#!/usr/bin/env npx tsx
/**
 * Daily restock buyability check — PetPalHQ.
 *
 * Reads data/restock-watch.json, asks the Amazon Creators API whether each
 * watched ASIN has a live, buyable offer today, and — for the ones that
 * flipped — mails everyone who signed up for that ASIN, clears their Brevo
 * attributes, and drops the ASIN from the watchlist.
 *
 *   npx tsx scripts/restock-check.ts
 *   npx tsx scripts/restock-check.ts --dry-run      # check + report, send nothing
 *
 * BUYABILITY is not re-invented here. It reuses isUnbuyableAvailability() from
 * src/lib/price-cache.ts — the same predicate the guide pages use to decide
 * whether a pick gets a Buy CTA. If the site would show a CTA for this ASIN,
 * this job calls it back in stock; if it would not, it stays on the watch. One
 * definition, so the email can never contradict the page it links to.
 *
 * IDEMPOTENCE has a single source of truth, and it is Brevo, not this file.
 * Sending clears the contact's RESTOCK_ASINS entry. If the housekeeping commit
 * that prunes data/restock-watch.json fails to land (Actions PR creation is a
 * repo setting that can be off — see weekly-price-sync.yml's preflight), the
 * next run re-checks the ASIN, finds zero contacts still holding it, and mails
 * nobody. A failed commit costs one wasted API call, never a duplicate email.
 *
 * FAILURE POSTURE is retain-on-error throughout. A thrown fetch, a 200 with no
 * usable offer, a Brevo hiccup mid-batch — none of them remove an ASIN from
 * the watchlist. Entries only leave after a send that actually succeeded.
 *
 * NO AMAZON LINK EVER LEAVES THIS SCRIPT. The email links the guide page; see
 * getRestockEmailTemplate in src/lib/email-templates.ts.
 *
 * Env: AMAZON_CLIENT_ID, AMAZON_CLIENT_SECRET, AMAZON_AFFILIATE_TAG,
 *      BREVO_API_KEY, BREVO_RESTOCK_LIST_ID.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fetchAmazonPrice } from '../src/lib/amazon-api';
import { isUnbuyableAvailability } from '../src/lib/price-cache';
import { getRestockEmailTemplate } from '../src/lib/email-templates';
import {
  guideUrl,
  isValidAsin,
  readWatchlist,
  writeWatchlist,
  type RestockWatchEntry,
} from '../src/lib/restock-watch';

// Load .env.local if present (mirrors scripts/sync-amazon-prices.ts — local
// runs outside the Next.js runtime don't get .env.local loaded automatically).
const ROOT_DIR = path.join(import.meta.dirname, '..');
const envPath = path.join(ROOT_DIR, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

const BREVO_BASE = 'https://api.brevo.com/v3';
const SENDER = { name: 'PetPalHQ', email: 'editor@petpalhq.com' };
const STAGGER_MS = 1100; // matches the price-sync budget against the Amazon API

const dryRun = process.argv.includes('--dry-run');

interface BrevoContact {
  id: number;
  email: string;
  attributes?: Record<string, unknown>;
}

function log(message: string): void {
  console.log(message);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function brevoHeaders(apiKey: string): Record<string, string> {
  return { accept: 'application/json', 'content-type': 'application/json', 'api-key': apiKey };
}

function parseAsins(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  return value
    .split(',')
    .map((a) => a.trim().toUpperCase())
    .filter(isValidAsin);
}

// ─── Amazon ────────────────────────────────────────────────────────────────────

/**
 * True when Amazon has a live, buyable offer for the ASIN right now.
 * A thrown lookup is NOT "unbuyable" — it propagates so the caller can retain
 * the entry rather than silently deciding an API outage means "still gone".
 */
async function isBuyable(asin: string): Promise<{ buyable: boolean; detail: string }> {
  const result = await fetchAmazonPrice(asin);
  const buyable = !!result.price && !isUnbuyableAvailability(result.availability);
  return {
    buyable,
    detail: `price=${result.price ?? 'null'} availability=${result.availability ?? 'null'}`,
  };
}

// ─── Brevo ─────────────────────────────────────────────────────────────────────

/** Pages the restock list and returns every contact holding this ASIN. */
async function contactsWatching(
  asin: string,
  apiKey: string,
  listId: number
): Promise<BrevoContact[]> {
  const matches: BrevoContact[] = [];
  const limit = 500;
  let offset = 0;

  for (;;) {
    const url = `${BREVO_BASE}/contacts/lists/${listId}/contacts?limit=${limit}&offset=${offset}`;
    const res = await fetch(url, { headers: brevoHeaders(apiKey) });
    if (!res.ok) {
      throw new Error(`Brevo list fetch failed ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    const data = (await res.json()) as { contacts?: BrevoContact[] };
    const batch = data.contacts || [];
    for (const contact of batch) {
      if (parseAsins(contact.attributes?.RESTOCK_ASINS).includes(asin)) matches.push(contact);
    }
    if (batch.length < limit) break;
    offset += limit;
  }

  return matches;
}

async function sendRestockEmail(
  contact: BrevoContact,
  entry: RestockWatchEntry,
  apiKey: string
): Promise<void> {
  const template = getRestockEmailTemplate(entry.productName, guideUrl(entry.guideSlug));
  const res = await fetch(`${BREVO_BASE}/smtp/email`, {
    method: 'POST',
    headers: brevoHeaders(apiKey),
    body: JSON.stringify({
      sender: SENDER,
      to: [{ email: contact.email }],
      subject: template.subject,
      htmlContent: template.html,
      textContent: template.text,
      tags: ['restock-notify', entry.asin],
    }),
  });
  if (!res.ok) {
    throw new Error(`Brevo send failed ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
}

/**
 * Drops the fired ASIN from the contact's watch attributes. When it was their
 * last one, the restock attributes are blanked and the contact is removed from
 * the restock list outright — the signup copy promised one email and no
 * newsletter, so a spent contact should not keep sitting on a mailing list.
 */
async function clearContactAsin(
  contact: BrevoContact,
  asin: string,
  apiKey: string,
  listId: number
): Promise<void> {
  const remaining = parseAsins(contact.attributes?.RESTOCK_ASINS).filter((a) => a !== asin);

  const res = await fetch(`${BREVO_BASE}/contacts/${encodeURIComponent(contact.email)}`, {
    method: 'PUT',
    headers: brevoHeaders(apiKey),
    body: JSON.stringify({
      attributes: remaining.length
        ? { RESTOCK_ASINS: remaining.join(',') }
        : { RESTOCK_ASINS: '', RESTOCK_PRODUCT: '', RESTOCK_GUIDE: '', RESTOCK_REQUESTED_AT: '' },
    }),
  });
  if (!res.ok) {
    throw new Error(`Brevo attribute update failed ${res.status} for contact ${contact.id}`);
  }

  if (!remaining.length) {
    const removal = await fetch(`${BREVO_BASE}/contacts/lists/${listId}/contacts/remove`, {
      method: 'POST',
      headers: brevoHeaders(apiKey),
      body: JSON.stringify({ emails: [contact.email] }),
    });
    if (!removal.ok) {
      // Non-fatal: attributes are already cleared, so the contact can no longer
      // match any ASIN. List membership is cosmetic at this point.
      console.warn(
        `[restock] Could not remove ${contact.id} from list ${listId} (${removal.status}) — attributes already cleared, no duplicate risk.`
      );
    }
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const startedAt = new Date().toISOString();
  const watchlist = readWatchlist(ROOT_DIR);

  let checked = 0;
  let flipped = 0;
  let notified = 0;
  let errors = 0;
  const remaining: RestockWatchEntry[] = [];

  if (!watchlist.length) {
    log(
      `RESTOCK-RECEIPT ${startedAt} | watched=0 checked=0 flipped=0 notified=0 errors=0 | dryRun=${dryRun} | source=creatorsapi.amazon/catalog/v1/getItems x-marketplace=www.amazon.com | nothing on watch`
    );
    return;
  }

  const amazonReady = !!process.env.AMAZON_CLIENT_ID && !!process.env.AMAZON_CLIENT_SECRET;
  if (!amazonReady) {
    console.error(
      '[restock] AMAZON_CLIENT_ID / AMAZON_CLIENT_SECRET missing — cannot check buyability. Aborting without touching the watchlist.'
    );
    log(
      `RESTOCK-RECEIPT ${startedAt} | watched=${watchlist.length} checked=0 flipped=0 notified=0 errors=1 | dryRun=${dryRun} | abort=missing-amazon-credentials`
    );
    process.exit(1);
  }

  const apiKey = process.env.BREVO_API_KEY || '';
  const listId = Number.parseInt(process.env.BREVO_RESTOCK_LIST_ID || '', 10);
  const brevoReady = !!apiKey && Number.isFinite(listId);
  if (!brevoReady && !dryRun) {
    console.error(
      '[restock] BREVO_API_KEY / BREVO_RESTOCK_LIST_ID missing — cannot notify anyone. Aborting without touching the watchlist.'
    );
    log(
      `RESTOCK-RECEIPT ${startedAt} | watched=${watchlist.length} checked=0 flipped=0 notified=0 errors=1 | dryRun=${dryRun} | abort=missing-brevo-credentials`
    );
    process.exit(1);
  }

  for (const entry of watchlist) {
    if (checked > 0) await sleep(STAGGER_MS);

    let verdict: { buyable: boolean; detail: string };
    try {
      verdict = await isBuyable(entry.asin);
      checked += 1;
    } catch (error) {
      errors += 1;
      console.error(`[restock] ${entry.asin} lookup failed — retained on watch:`, error);
      remaining.push(entry);
      continue;
    }

    log(`[restock] ${entry.asin} ${entry.productName} → buyable=${verdict.buyable} ${verdict.detail}`);

    if (!verdict.buyable) {
      remaining.push(entry);
      continue;
    }

    flipped += 1;

    if (dryRun) {
      log(`[restock] DRY RUN — would notify signups for ${entry.asin} and drop it from the watch.`);
      remaining.push(entry);
      continue;
    }

    let contacts: BrevoContact[];
    try {
      contacts = await contactsWatching(entry.asin, apiKey, listId);
    } catch (error) {
      errors += 1;
      console.error(`[restock] Could not read signups for ${entry.asin} — retained on watch:`, error);
      remaining.push(entry);
      continue;
    }

    let sentAll = true;
    for (const contact of contacts) {
      try {
        await sendRestockEmail(contact, entry, apiKey);
        await clearContactAsin(contact, entry.asin, apiKey, listId);
        notified += 1;
      } catch (error) {
        sentAll = false;
        errors += 1;
        console.error(`[restock] Notify failed for contact ${contact.id} on ${entry.asin}:`, error);
      }
    }

    if (sentAll) {
      log(
        `[restock] ${entry.asin} restocked — notified ${contacts.length} signup(s), removed from watch.`
      );
    } else {
      // At least one contact still holds the ASIN. Keep it on the watch so the
      // next run retries them; already-notified contacts are cleared and will
      // not match again.
      remaining.push(entry);
      log(`[restock] ${entry.asin} restocked but not every signup was notified — retained on watch.`);
    }
  }

  if (!dryRun && remaining.length !== watchlist.length) {
    writeWatchlist(remaining, ROOT_DIR);
    log(`[restock] Watchlist rewritten: ${watchlist.length} → ${remaining.length} entries.`);
  }

  log(
    `RESTOCK-RECEIPT ${startedAt} | watched=${watchlist.length} checked=${checked} flipped=${flipped} notified=${notified} errors=${errors} | dryRun=${dryRun} | source=creatorsapi.amazon/catalog/v1/getItems x-marketplace=www.amazon.com | sender=${SENDER.email}`
  );

  if (errors > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error('[restock] Fatal:', error);
  log(
    `RESTOCK-RECEIPT ${new Date().toISOString()} | fatal=1 | ${error instanceof Error ? error.message : String(error)}`
  );
  process.exit(1);
});
