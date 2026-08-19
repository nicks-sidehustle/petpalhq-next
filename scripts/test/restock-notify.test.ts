/**
 * Restock-notify system gate (2026-08-18).
 *
 * Four things about this system are load-bearing and easy to break silently,
 * so each gets a job here rather than a comment nobody re-reads.
 *
 *  1. WATCHLIST SHAPE. data/restock-watch.json is read by a cron job that
 *     spends Amazon API quota per entry and mails real people off the result.
 *     A malformed entry degrades to "watch nothing" at runtime — silent, and
 *     the failure looks exactly like "no ASIN restocked today". Validate the
 *     shape here, where it is loud.
 *
 *  2. NO AMAZON LINK IN THE EMAIL. Affiliate links in email are prohibited by
 *     the Associates Operating Agreement, and a bare amazon.com link would give
 *     the sale away unattributed. The notify template must link the guide and
 *     only the guide.
 *
 *  3. THE BREVO KEY STAYS SERVER-SIDE. The capture component is a client
 *     component; if BREVO_API_KEY is ever referenced from it, the key ships in
 *     the browser bundle.
 *
 *  4. VACUITY. Jobs 2 and 3 pass trivially against an empty template or a
 *     deleted component. Assert the artifacts still exist and still carry the
 *     promise the microcopy makes.
 *
 * Run: npx tsx scripts/test/restock-notify.test.ts
 */
import fs from 'fs';
import path from 'path';
import { getRestockEmailTemplate, containsAmazonLink, stripUrls } from '../../src/lib/email-templates';
import { isValidEntry, readWatchlist } from '../../src/lib/restock-watch';

const ROOT = path.join(import.meta.dirname, '..', '..');

let failures = 0;
function check(label: string, ok: boolean) {
  if (!ok) {
    failures++;
    console.error(`  FAIL: ${label}`);
  }
}

// --- Job 1: watchlist shape -------------------------------------------------

const watchPath = path.join(ROOT, 'data', 'restock-watch.json');
check('data/restock-watch.json exists', fs.existsSync(watchPath));

let rawEntries: unknown[] = [];
try {
  const parsed: unknown = JSON.parse(fs.readFileSync(watchPath, 'utf-8'));
  check('watchlist is a JSON array', Array.isArray(parsed));
  rawEntries = Array.isArray(parsed) ? parsed : [];
} catch (error) {
  check(`watchlist parses as JSON (${String(error)})`, false);
}

for (const [i, entry] of rawEntries.entries()) {
  check(`watchlist[${i}] has a valid asin/productName/guideSlug/addedAt`, isValidEntry(entry));
}

// Every watched guideSlug must resolve to a real guide file — a typo here means
// the notify email links a 404.
for (const entry of readWatchlist(ROOT)) {
  const guideFile = path.join(ROOT, 'src', 'content', 'guides', `${entry.guideSlug}.md`);
  check(`watched ASIN ${entry.asin} points at an existing guide (${entry.guideSlug})`, fs.existsSync(guideFile));
}

// The loader silently drops malformed entries; if it dropped any, jobs above
// already failed, but assert the counts agree so the two paths can't diverge.
check(
  'no watchlist entry is silently dropped by the loader',
  readWatchlist(ROOT).length === rawEntries.length
);

// --- Job 2: the notify email never links Amazon -----------------------------

const sample = getRestockEmailTemplate(
  'PetSafe ScoopFree SmartSpin',
  'https://petpalhq.com/guides/are-automatic-litter-boxes-worth-it-2026'
);
const emailBody = `${sample.html}\n${sample.text}\n${sample.subject}`;

check('notify email contains no amazon.com link', !/https?:\/\/[^\s"']*amazon\.com/i.test(emailBody));
check('notify email contains no affiliate tag', !/tag=[a-z0-9]+-20/i.test(emailBody));
check('notify email contains no /go/ redirect', !emailBody.includes('/go/'));

// --- Job 2b: the Amazon-link gate is a GATE, not a comment ---------------
//
// The three assertions above only prove the hardcoded copy is clean, which it
// always was — they would pass just as green with no gate in the code at all.
// productName is the one value in this template a stranger controls: it comes
// from an unauthenticated POST to /api/restock-notify and Brevo stores it
// verbatim. So plant the payload and prove the gate fires, mutation-style.
//
// An affiliate link in email breaches the Associates Operating Agreement and
// risks the account for the whole portfolio, so "neutralised" here must mean
// no link survives ANYWHERE in subject, html, or text — not merely that the
// visible copy looks tidy.
const HOSTILE_NAMES = [
  'Widget https://www.amazon.com/dp/B01234567X?tag=petpalhq08-20',
  'Widget https://amzn.to/3abcd',
  'Widget www.amazon.co.uk/dp/B01234567X',
  'Widget <a href="https://amazon.com/dp/B01234567X">buy now</a>',
  'Widget /go/B01234567X',
];

for (const hostile of HOSTILE_NAMES) {
  let neutralised = false;
  try {
    const out = getRestockEmailTemplate(hostile, 'https://petpalhq.com/guides/best-cat-litter-boxes-2026');
    const rendered = `${out.subject}\n${out.html}\n${out.text}`;
    // Survived rendering — then it must carry no Amazon link and no injected
    // anchor to anywhere that is not us.
    neutralised =
      !containsAmazonLink(rendered) &&
      !/<a [^>]*href=["']https?:\/\/(?!petpalhq\.com)/i.test(out.html);
  } catch {
    // Refusing to render is the other acceptable outcome, and the stronger one.
    neutralised = true;
  }
  check(`hostile productName is neutralised: ${hostile.slice(0, 44)}`, neutralised);
}

// Positive control for the gate itself. If containsAmazonLink() ever stops
// matching, every assertion in this block passes vacuously — exactly the
// failure this section exists to correct. Assert it still recognises the
// shapes it is supposed to catch, and still clears an ordinary product name.
for (const shape of [
  'https://www.amazon.com/dp/B01234567X',
  'https://amzn.to/3abcd',
  'www.amazon.co.uk/dp/X',
  'tag=petpalhq08-20',
  '/go/B01234567X',
]) {
  check(`containsAmazonLink() still catches ${shape}`, containsAmazonLink(shape));
}
check(
  'containsAmazonLink() does not fire on an ordinary product name',
  !containsAmazonLink('PetSafe ScoopFree SmartSpin Self-Cleaning Litter Box')
);
check('stripUrls removes a planted URL', stripUrls('Widget https://evil.example/x') === 'Widget');
check('stripUrls leaves an ordinary name intact', stripUrls('AquaClear 30 Power Filter') === 'AquaClear 30 Power Filter');

// --- Job 3: the Brevo key never reaches the client bundle -------------------

const componentPath = path.join(ROOT, 'src', 'components', 'guides', 'RestockNotify.tsx');
const component = fs.readFileSync(componentPath, 'utf-8');
check('capture component never references BREVO_API_KEY', !component.includes('BREVO_API_KEY'));
check('capture component never references any Brevo env var', !/process\.env\.BREVO/.test(component));
check('capture component posts to the server route', component.includes('/api/restock-notify'));

// --- Job 4: vacuity ---------------------------------------------------------

check('notify email links the guide page', emailBody.includes('https://petpalhq.com/guides/'));
check('notify email names the product', sample.subject.includes('PetSafe ScoopFree SmartSpin'));
check(
  'capture component still carries the one-email promise verbatim',
  component.includes('one email when it') && component.includes('No newsletter, no')
);
check(
  'capture component still renders the unavailability headline',
  component.includes('Currently unavailable on Amazon')
);
check('capture component still ships a honeypot field', component.includes('name="website"'));
check(
  'capture component still degrades without JS (real form action)',
  component.includes('method="post"') && component.includes('action="/api/restock-notify"')
);

// ---------------------------------------------------------------------------

if (failures > 0) {
  console.error(`\nrestock-notify gate: ${failures} failure(s).`);
  process.exit(1);
}
console.log('restock-notify gate: PASS');
