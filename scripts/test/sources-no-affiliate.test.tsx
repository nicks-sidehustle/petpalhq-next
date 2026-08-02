#!/usr/bin/env npx tsx
/**
 * Citability gate: NO monetized links inside citation ("Sources") surfaces.
 *
 * Portfolio citability law (ports smarthome-explorer-blog PR #408): the Sources
 * surfaces exist to read as neutral citations to AI crawlers and to readers.
 * An affiliate/monetized href inside one is a compliance + trust defect.
 *
 * This gate renders the REAL components over the REAL guide corpus with
 * react-dom/server and asserts that no `href` in the resulting markup points at
 * a monetized destination (amazon.com, amzn.to, /go/, /recommend/). It covers
 * citation surfaces:
 *   - PickAuthoritySources  (per-pick "Sources" list)
 *   - SourcesPanel          ("Sources & Methodology" panel)
 *
 * Genuine third-party outlet citations (catvets.com, wirecutter, …) are
 * expected to stay as plain nofollow links — the gate asserts those survive, so
 * it cannot be "passed" by stripping every link.
 *
 * It also pins the plain-string-rendering architecture of two more
 * crawler-facing surfaces that must NEVER emit a live `<a href>` at all
 * (they render as inert text by design, so an LLM citation engine reading the
 * markup never sees an affiliate URL):
 *   - ShortAnswer  (the "Short Answer" capsule at the top of a guide)
 *   - GuideFAQ     (the FAQ accordion/section on a guide page)
 *
 * Run: `npx tsx scripts/test/sources-no-affiliate.test.tsx` (wired into
 * `validate:content`).
 */
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { renderToStaticMarkup } from 'react-dom/server';
import PickAuthoritySources from '../../src/components/guides/PickAuthoritySources';
import SourcesPanel from '../../src/components/guides/SourcesPanel';
import ShortAnswer from '../../src/components/guides/ShortAnswer';
import GuideFAQ from '../../src/components/guides/GuideFAQ';
import type { AuthoritySource, GuideSources, GuideMethodology } from '../../src/lib/guides';
import type { FAQItem } from '../../src/lib/schema';

const GUIDES_DIR = path.join(process.cwd(), 'src/content/guides');

/** Monetized destinations that must never appear as an href in a sources region. */
const MONETIZED_HREF = /amazon\.|amzn\.to|\/go\/|\/recommend\//i;

let failures = 0;
function fail(msg: string) {
  console.error(`  ✗ ${msg}`);
  failures++;
}

/** Extracts every href value from rendered markup. */
function hrefs(markup: string): string[] {
  return [...markup.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);
}

/** Asserts no monetized href in this rendered sources region. */
function assertClean(label: string, markup: string) {
  for (const href of hrefs(markup)) {
    if (MONETIZED_HREF.test(href)) fail(`${label}: monetized href in sources region → ${href}`);
  }
}

console.log('sources citation-surface gate:');

// ---------------------------------------------------------------------------
// 1. Synthetic fixtures — keep the gate sharp regardless of corpus drift.
// ---------------------------------------------------------------------------
const fixtures: AuthoritySource[] = [
  { outlet: 'Acme (manufacturer/Amazon listing)', url: 'https://www.amazon.com/dp/B0FCDJYWY3', stat: 'x', supports: 'spec' },
  { outlet: 'Tagged Amazon listing', url: 'https://www.amazon.com/dp/B0FCDJYWY3?tag=petpalhq08-20', stat: 'x', supports: 'spec' },
  { outlet: 'Amazon search listing', url: 'https://www.amazon.com/s?k=cat+fountain&tag=petpalhq08-20', stat: 'x', supports: 'spec' },
  { outlet: 'Shortener', url: 'https://amzn.to/3abcdef', stat: 'x', supports: 'spec' },
  { outlet: 'Internal go redirect', url: '/go/B0FCDJYWY3', stat: 'x', supports: 'spec' },
  { outlet: 'Internal recommend redirect', url: '/recommend/some-pick', stat: 'x', supports: 'spec' },
  { outlet: 'American Association of Feline Practitioners', url: 'https://catvets.com/guidelines/practice-guidelines', stat: 'x', supports: 'safety' },
  { outlet: 'Listing-only, no url', url: '', stat: 'x', supports: 'general' },
];

const fixtureMarkup = renderToStaticMarkup(<PickAuthoritySources sources={fixtures} />);
assertClean('fixture/PickAuthoritySources', fixtureMarkup);

// Every outlet name must still be visible as text, linked or not — un-linking
// must never drop the citation itself.
for (const s of fixtures) {
  if (!fixtureMarkup.includes(s.outlet)) fail(`fixture: outlet text dropped → "${s.outlet}"`);
}

// The genuine third-party citation must SURVIVE as a plain nofollow link.
const fixtureHrefs = hrefs(fixtureMarkup);
if (!fixtureHrefs.includes('https://catvets.com/guidelines/practice-guidelines')) {
  fail('fixture: genuine third-party citation lost its link (over-stripping)');
}
if (fixtureHrefs.length !== 1) {
  fail(`fixture: expected exactly 1 surviving href, got ${fixtureHrefs.length} → ${fixtureHrefs.join(', ')}`);
}
if (/rel="[^"]*sponsored/.test(fixtureMarkup)) {
  fail('fixture: rel="sponsored" present in a citation surface');
}

// ---------------------------------------------------------------------------
// 2. Full guide corpus — both citation surfaces, real content data.
// ---------------------------------------------------------------------------
interface RawPick {
  name?: string;
  authoritySources?: AuthoritySource[];
}

const files = fs.existsSync(GUIDES_DIR)
  ? fs.readdirSync(GUIDES_DIR).filter((f) => f.endsWith('.md')).sort()
  : [];

if (files.length === 0) fail('no guide files found — gate would vacuously pass');

let picksRendered = 0;
let panelsRendered = 0;
let sourcesSeen = 0;

for (const filename of files) {
  const slug = filename.replace(/\.md$/, '');
  const { data } = matter(fs.readFileSync(path.join(GUIDES_DIR, filename), 'utf8'));
  const frontmatter = data as Record<string, unknown>;

  for (const pick of (frontmatter.picks as RawPick[]) ?? []) {
    const sources = pick.authoritySources;
    if (!sources?.length) continue;
    picksRendered++;
    sourcesSeen += sources.length;
    assertClean(`${slug} / pick "${pick.name}"`, renderToStaticMarkup(<PickAuthoritySources sources={sources} />));
  }

  if (frontmatter.sources) {
    panelsRendered++;
    assertClean(
      `${slug} / SourcesPanel`,
      renderToStaticMarkup(
        <SourcesPanel
          sources={frontmatter.sources as GuideSources}
          methodology={frontmatter.methodology as GuideMethodology | undefined}
        />,
      ),
    );
  }
}

console.log(
  `  ${files.length} guide(s) · ${picksRendered} pick sources-block(s) (${sourcesSeen} source entries) · ${panelsRendered} SourcesPanel(s) rendered`,
);

// ---------------------------------------------------------------------------
// 3. ShortAnswer + GuideFAQ — plain-string-rendering surfaces, synthetic fixtures.
//
// Neither component links anything; they render their string props as inert
// text. This pins that architecture: even when the underlying text CONTAINS a
// monetized URL, no `<a href>` should ever appear in the rendered markup.
// ---------------------------------------------------------------------------
const shortAnswerFixture =
  'The best option is the Acme Cat Fountain (https://www.amazon.com/dp/B0FCDJYWY3?tag=petpalhq08-20), ' +
  'or see /go/B0FCDJYWY3 for current pricing, per catvets.com guidance.';

const shortAnswerMarkup = renderToStaticMarkup(<ShortAnswer text={shortAnswerFixture} />);
assertClean('fixture/ShortAnswer', shortAnswerMarkup);
if (!shortAnswerMarkup.includes('amazon.com/dp/B0FCDJYWY3')) {
  fail('fixture/ShortAnswer: source text dropped instead of rendered as plain text');
}
if (hrefs(shortAnswerMarkup).length !== 0) {
  fail(`fixture/ShortAnswer: expected zero hrefs, got ${hrefs(shortAnswerMarkup).length}`);
}

const faqFixtures: FAQItem[] = [
  {
    question: 'Where can I buy the Acme Cat Fountain?',
    answer: 'It is available at https://www.amazon.com/dp/B0FCDJYWY3?tag=petpalhq08-20 or via /go/B0FCDJYWY3.',
  },
  {
    question: 'Is the amzn.to/3abcdef link still active?',
    answer: 'See /recommend/some-pick for our current top pick.',
  },
];

const faqMarkup = renderToStaticMarkup(<GuideFAQ items={faqFixtures} />);
assertClean('fixture/GuideFAQ', faqMarkup);
for (const item of faqFixtures) {
  if (!faqMarkup.includes(item.question)) fail(`fixture/GuideFAQ: question text dropped → "${item.question}"`);
  if (!faqMarkup.includes(item.answer)) fail(`fixture/GuideFAQ: answer text dropped → "${item.answer}"`);
}
if (hrefs(faqMarkup).length !== 0) {
  fail(`fixture/GuideFAQ: expected zero hrefs, got ${hrefs(faqMarkup).length}`);
}

console.log('  ShortAnswer + GuideFAQ: plain-string rendering confirmed, zero hrefs in either surface');

// ---------------------------------------------------------------------------
if (failures > 0) {
  console.error(`\nsources citation-surface gate FAILED (${failures} violation(s)).`);
  console.error('Citation surfaces must never carry affiliate/monetized hrefs.');
  process.exit(1);
}
console.log('\n  ✓ no monetized hrefs in any rendered sources region');
console.log('sources citation-surface gate passed.');
