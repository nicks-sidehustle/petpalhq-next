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
 * BOTH citation surfaces:
 *   - PickAuthoritySources  (per-pick "Sources" list)
 *   - SourcesPanel          ("Sources & Methodology" panel)
 *
 * Genuine third-party outlet citations (catvets.com, wirecutter, …) are
 * expected to stay as plain nofollow links — the gate asserts those survive, so
 * it cannot be "passed" by stripping every link.
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
import type { AuthoritySource, GuideSources, GuideMethodology } from '../../src/lib/guides';

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
if (failures > 0) {
  console.error(`\nsources citation-surface gate FAILED (${failures} violation(s)).`);
  console.error('Citation surfaces must never carry affiliate/monetized hrefs.');
  process.exit(1);
}
console.log('\n  ✓ no monetized hrefs in any rendered sources region');
console.log('sources citation-surface gate passed.');
