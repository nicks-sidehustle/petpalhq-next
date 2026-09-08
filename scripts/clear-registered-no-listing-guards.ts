#!/usr/bin/env npx tsx
/**
 * clear-registered-no-listing-guards.ts — petpal DATA lane, 2026-09-08.
 *
 * PR #169 (branch content/register-asins-27-picks-2026-09-08) registered live
 * Amazon ASINs on 24 of the 27 picks that data/dead-asins.json's `no_listing`
 * entries had flagged as "no identified Amazon listing" (19 REGISTERED + 5
 * REPLACED per the receipt below). Those 27 entries are keyed by PICK
 * REFERENCE (`<slug>#<rank>`, see pickRefKey() in src/lib/dead-asin-guard.ts)
 * rather than by ASIN, because at the time they were written there was no
 * ASIN to key by.
 *
 * src/lib/guides.ts's parsePicks() treats ANY no_listing guard entry as a
 * hard gate regardless of what frontmatter now says — so the 24 newly
 * registered picks still render nowhere until their stale guard entries are
 * removed. This script is that removal, driven mechanically off the receipt
 * below (never a hand edit — lockdown rule 5): for every no_listing entry, it
 * re-reads the guide's OWN frontmatter and removes the entry ONLY if that
 * pick's `asin` field now holds a real, well-formed ASIN
 * (/^B0[A-Z0-9]{8}$/), which is exactly the shape #169 wrote in. Any entry
 * whose pick still carries no asin (the 3 NO-AMAZON-EQUIVALENT picks:
 * Eshopps RS-100, Eshopps Refugium Cube Nano, PetStep Original) is left
 * untouched.
 *
 * Source receipt: scripts/receipts/noasin-2026-09-08.md (copied verbatim from
 * programs/2026-09-multisite-conversion/receipts-2026-09-07-session-a16b/
 * petpal-noasin--receipt-2026-09-08.md so this PR is self-evidencing).
 *
 * Run: npx tsx scripts/clear-registered-no-listing-guards.ts
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const DEAD_ASINS_PATH = path.join(REPO_ROOT, 'data', 'dead-asins.json');
const GUIDES_DIR = path.join(REPO_ROOT, 'src', 'content', 'guides');

const REAL_ASIN_RE = /^B0[A-Z0-9]{8}$/;

interface DeadAsinEntry {
  status: string;
  reason: string;
  pick?: string;
  lastVerified: string;
  guides: string[];
}

interface FrontmatterPick {
  rank?: number;
  name?: string;
  asin?: string;
  [key: string]: unknown;
}

function readJson<T>(p: string): T {
  return JSON.parse(fs.readFileSync(p, 'utf-8')) as T;
}

function writeJson(p: string, obj: unknown) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');
}

/** Splits a `<slug>#<rank>` pick-reference key. Returns null if malformed. */
function parsePickRefKey(key: string): { slug: string; rank: number } | null {
  const idx = key.lastIndexOf('#');
  if (idx === -1) return null;
  const slug = key.slice(0, idx);
  const rank = Number(key.slice(idx + 1));
  if (!slug || !Number.isFinite(rank)) return null;
  return { slug, rank };
}

function getPickAsinAtRank(slug: string, rank: number): { asin: string | null; name: string | null } | null {
  const filePath = path.join(GUIDES_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data } = matter(raw);
  const picks = Array.isArray(data.picks) ? (data.picks as FrontmatterPick[]) : [];
  const pick = picks.find((p) => p.rank === rank);
  if (!pick) return null;
  return { asin: typeof pick.asin === 'string' ? pick.asin.trim() : null, name: pick.name ?? null };
}

function main() {
  const deadAsins = readJson<Record<string, DeadAsinEntry>>(DEAD_ASINS_PATH);

  const noListingKeys = Object.keys(deadAsins).filter((k) => deadAsins[k].status === 'no_listing');

  const removed: { key: string; asin: string; name: string | null; priorPick: string | undefined }[] = [];
  const kept: { key: string; reason: string }[] = [];

  for (const key of noListingKeys) {
    const ref = parsePickRefKey(key);
    if (!ref) {
      kept.push({ key, reason: 'malformed pick-reference key — could not parse slug/rank' });
      continue;
    }
    const current = getPickAsinAtRank(ref.slug, ref.rank);
    if (!current) {
      kept.push({ key, reason: `guide/pick not found at src/content/guides/${ref.slug}.md rank ${ref.rank}` });
      continue;
    }
    if (current.asin && REAL_ASIN_RE.test(current.asin)) {
      removed.push({ key, asin: current.asin, name: current.name, priorPick: deadAsins[key].pick });
      delete deadAsins[key];
    } else {
      kept.push({ key, reason: `pick still carries no real ASIN (asin field: ${JSON.stringify(current.asin)})` });
    }
  }

  writeJson(DEAD_ASINS_PATH, deadAsins);

  console.log(`no_listing entries scanned: ${noListingKeys.length}`);
  console.log(`Removed (pick now has a live ASIN): ${removed.length}`);
  console.log('');
  console.log('key\tnew_asin\tpick_name');
  for (const r of removed) {
    console.log(`${r.key}\t${r.asin}\t${r.name ?? r.priorPick ?? ''}`);
  }
  console.log('');
  console.log(`Kept (no real ASIN yet): ${kept.length}`);
  for (const k of kept) {
    console.log(`${k.key}\t${k.reason}`);
  }
}

main();
