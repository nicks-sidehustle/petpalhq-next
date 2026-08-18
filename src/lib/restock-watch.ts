/**
 * Restock-notify watchlist — shared types, IO, and validation.
 *
 * `data/restock-watch.json` is the repo-side register of every ASIN a
 * suppressed-OOS pick is currently collecting restock signups for. It is
 * deliberately a plain committed file rather than a database: the daily
 * buyability job (scripts/restock-check.ts) is the only writer, the file
 * diff is the audit trail, and a missing/malformed file degrades to "watch
 * nothing" instead of throwing.
 *
 * Truth boundary (important): this file is NOT the idempotency key. Brevo is.
 * A contact is notified exactly once because the send clears their
 * RESTOCK_ASINS attribute and drops them from the restock list — so even if
 * the housekeeping commit that prunes this file never lands, the next run
 * finds zero matching contacts and sends nothing. The watch file exists so
 * the job knows which ASINs to spend Amazon API quota on, and so the notify
 * email can name the product and link the right guide.
 */

import fs from 'fs';
import path from 'path';

export interface RestockWatchEntry {
  /** Amazon ASIN, 10 chars, uppercase alphanumeric. */
  asin: string;
  /** Human product name as it appears in the guide's pick. */
  productName: string;
  /** Guide slug — the page that carries the monetized link. */
  guideSlug: string;
  /** ISO timestamp the ASIN entered the watchlist. */
  addedAt: string;
  /** Set by the daily job when the ASIN flipped buyable and mail went out. */
  notifiedAt?: string;
}

export const WATCH_FILE_RELATIVE = path.join('data', 'restock-watch.json');

export function watchFilePath(cwd: string = process.cwd()): string {
  return path.join(cwd, WATCH_FILE_RELATIVE);
}

/** Amazon ASINs are exactly 10 uppercase alphanumerics. */
export function isValidAsin(asin: unknown): asin is string {
  return typeof asin === 'string' && /^[A-Z0-9]{10}$/.test(asin);
}

/** Guide slugs are lowercase kebab-case; this is also the URL path segment. */
export function isValidGuideSlug(slug: unknown): slug is string {
  return typeof slug === 'string' && /^[a-z0-9][a-z0-9-]{2,119}$/.test(slug);
}

/**
 * RFC-shaped-enough email check. Deliberately permissive on the local part and
 * strict on structure — the authoritative validation is Brevo's own, this only
 * rejects the obviously malformed before spending an API call on them.
 */
export function isValidEmail(email: unknown): email is string {
  if (typeof email !== 'string') return false;
  if (email.length < 6 || email.length > 254) return false;
  return /^[^\s@,;]+@[^\s@,;.]+(\.[^\s@,;.]+)+$/.test(email);
}

export function isValidEntry(value: unknown): value is RestockWatchEntry {
  if (!value || typeof value !== 'object') return false;
  const e = value as Record<string, unknown>;
  return (
    isValidAsin(e.asin) &&
    typeof e.productName === 'string' &&
    e.productName.trim().length > 0 &&
    e.productName.length <= 200 &&
    isValidGuideSlug(e.guideSlug) &&
    typeof e.addedAt === 'string' &&
    !Number.isNaN(Date.parse(e.addedAt))
  );
}

/** Reads the watchlist. Missing or malformed file → empty list, never throws. */
export function readWatchlist(cwd: string = process.cwd()): RestockWatchEntry[] {
  try {
    const raw = fs.readFileSync(watchFilePath(cwd), 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidEntry);
  } catch {
    return [];
  }
}

/** Writes the watchlist back, newline-terminated, stable 2-space JSON. */
export function writeWatchlist(entries: RestockWatchEntry[], cwd: string = process.cwd()): void {
  fs.writeFileSync(watchFilePath(cwd), `${JSON.stringify(entries, null, 2)}\n`, 'utf-8');
}

/** Canonical public URL of a guide — the page that carries the monetized link. */
export function guideUrl(guideSlug: string): string {
  return `https://petpalhq.com/guides/${guideSlug}`;
}
