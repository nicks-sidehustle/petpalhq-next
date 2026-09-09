'use strict';
/**
 * petpal ADAPTER for @affiliate/product-ledger.
 *
 * Replaces the package's deliberate NOT_IMPLEMENTED stub (src/adapters/petpal.adapter.cjs).
 * A gate never knows a site: the gates ask the RECORD what should be true and ask this file
 * what the built site actually rendered.
 *
 *   node <pkg>/gates/run.cjs --adapter scripts/ledger/petpal.adapter.cjs \
 *        --ledger data/product-ledger --built .next/server/app
 *
 * IDENTITY, and the one thing that makes this adapter unlike the reference one.
 * petpal's built markup carries NO product data-attributes: `/go/{ASIN}` IS the product
 * reference on every surface (src/lib/affiliate-href.ts:18, src/lib/guides.ts:1757, and the
 * JSON-LD ItemList `url`). Records are keyed by product id, never by ASIN (RULING (a)), so
 * this adapter carries an ASIN -> productId index built from the ledger itself. Every
 * extractor resolves through it. An ASIN with no record resolves to `asin:<ASIN>`, which no
 * record can match — so an unrecorded product surfaces as a gate FINDING (R0 / NO-RECORD)
 * instead of silently vanishing from the comparison.
 *
 * ANCHORS (documented so a markup change breaks loudly rather than quietly):
 *   pick card      <article class="rounded-lg border bg-white overflow-hidden flex flex-col"
 *                  …>…</article>                    (FeaturedPicksGrid.tsx)
 *   price slot     <p class="text-sm font-semibold mb-3 mt-auto"  (no chip/disclosure)
 *                  <p class="text-sm font-semibold mb-1 mt-auto"  (chip or disclosure follows)
 *                  — the component comments call this a class STRING, not a template,
 *                    precisely so both branches emit byte-identical markup.
 *   CTA            <a … href="/go/{ASIN}?s={slug}&p={placement}" data-affiliate-tracked="1">
 *   placement      the `p=` query param (1..N for pick CTAs, "inline"/"faq" elsewhere)
 *   roster         the ordered pick cards on the surface
 *   comparison     <section id="comparison"> … <th scope="col">{product name}</th>
 *                  petpal's head-to-head table is COLUMN-oriented: products are columns and
 *                  features are rows, so "comparison rows" here are the product columns,
 *                  matched by NAME against the record (the table prints no ASIN).
 *   sticky         <div data-sticky-price-bar="true"> — ONE product, not a list.
 *   JSON-LD        the ItemList whose @id ends `#picks` (never the BreadcrumbList or the
 *                  FAQPage, both of which also carry an `itemListElement` array).
 *
 * Every surface is read in BOTH forms. `.rsc` flight payloads are not HTML — they are the
 * React tree as JSON, with card bodies often deferred to another flight row — so each anchor
 * above has a second, JSON-shaped form below, and card slices resolve `"$L<hex>"` references
 * before they are read. An adapter with only the HTML forms sees zero cards in every flight
 * payload and passes clean on a surface it never looked at: the false-green class the
 * package's interface note describes.
 *
 * NOT MEASURABLE in petpal's built output, and reported as such rather than guessed:
 * the printed "N picks" figure (petpal prints none), a struck list price (petpal cards never
 * strike one), and a lead HOLD marker. The sticky price bar is a SINGLE-product bar, so it
 * cannot equal a roster of N — see the PR body's structural findings.
 */

const fs = require('node:fs');
const path = require('node:path');

const L = require('./lib.cjs');
const { pkg } = L.requireLedgerPackage();
const { normalize, walkBuilt, hrefs, assertAdapter, goIdFromHref } = pkg.adapters;
const { loadLedger } = pkg;

const CARD_OPEN = '<article class="rounded-lg border bg-white overflow-hidden flex flex-col"';
const PRICE_SLOT = /<p class="text-sm font-semibold mb-[13] mt-auto"[^>]*>([\s\S]*?)<\/p>/;
const ITEMLIST = /"@type":"ItemList","@id":"[^"]*#picks"[\s\S]*?"itemListElement":\[([\s\S]*?)\}\]\}/;

// Same three anchors as above, in the RSC flight payload's JSON form.
const RSC_CARD_CLASS = '"className":"rounded-lg border bg-white overflow-hidden flex flex-col"';
const RSC_PRICE_SLOT = /"className":"text-sm font-semibold mb-[13] mt-auto"[\s\S]{0,240}?"children":"((?:[^"\\]|\\.)*)"/;
const RSC_HEADING = /"className":"font-serif text-lg font-bold mb-2 leading-tight"[\s\S]{0,240}?"children":"((?:[^"\\]|\\.)*)"/;

/** Guide/review body text, tags stripped — used only for name matching in the table. */
function textOf(html) {
  return String(html || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&apos;|&#39;/g, "'")
    // Entities are decoded AFTER tags are stripped, so `&lt;` can never re-introduce markup.
    // Without this a name like "Pawfit Lite … (<18g)" never matches its record.
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Slice every pick card from server HTML. `<article>` is not nested inside a pick card. */
function htmlCardSlices(text) {
  const out = [];
  let from = 0;
  for (;;) {
    const start = text.indexOf(CARD_OPEN, from);
    if (start === -1) return out;
    const end = text.indexOf('</article>', start);
    if (end === -1) return out;
    out.push({ form: 'html', text: text.slice(start, end) });
    from = end + 10;
  }
}

/** Index of the `]` matching the `[` at `i`, skipping bracket characters inside strings. */
function matchBracket(s, i) {
  let depth = 0;
  let inStr = false;
  for (let k = i; k < s.length; k++) {
    const c = s[k];
    if (inStr) {
      if (c === '\\') k++;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '[') depth++;
    else if (c === ']' && --depth === 0) return k;
  }
  return -1;
}

/**
 * The flight payload's rows: `<hex>:<json>` at line starts. A card's body is often DEFERRED
 * to another row and referenced as `"$L3e"`, so a slicer that reads only the inline text
 * gets an empty card — card 2 of 4 on every guide came back with no price, no CTA and no
 * ASIN before this. A deferred money surface is still a money surface.
 */
function flightRows(text) {
  const rows = new Map();
  const marks = [];
  const re = /(?:^|\n)([0-9a-f]+):/g;
  let m;
  while ((m = re.exec(text))) marks.push({ id: m[1], from: m.index + m[0].length });
  for (let i = 0; i < marks.length; i++) {
    const end = i + 1 < marks.length ? marks[i + 1].from - marks[i + 1].id.length - 2 : text.length;
    rows.set(marks[i].id, text.slice(marks[i].from, end).trim());
  }
  return rows;
}

/** Inline `"$L<hex>"` references, depth-capped so a cyclic payload cannot hang a gate. */
function expandFlight(text, rows, depth) {
  if (!rows || (depth || 0) > 4) return text;
  return text.replace(/"\$L([0-9a-f]+)"/g, (whole, id) =>
    rows.has(id) ? expandFlight(rows.get(id), rows, (depth || 0) + 1) : whole
  );
}

/**
 * Slice every pick card from an RSC FLIGHT PAYLOAD.
 *
 * `.rsc` does not contain HTML: it contains the React tree as JSON
 * (`["$","article","1",{"className":"…","children":[…]}]`). An adapter that reads only
 * `<article class="…">` therefore sees ZERO cards in every flight payload and reports a
 * clean pass on a surface it never looked at — the false-green class the package's interface
 * note names ("escaped-only content in client islands made three earlier proofs go green on
 * live defects"). This walks the bracket structure so the flight copy of a card is checked
 * with the same rules as the HTML copy.
 */
function rscCardSlices(text, rows) {
  const out = [];
  // Iterate the ARTICLE OPENINGS, not the class occurrences. Searching backwards from each
  // class match pairs a card with whatever article opened before it, and one bad pairing
  // then swallows the rest of the payload in a single slice (card 2 of 4 arrived empty).
  const re = /\["\$","article"/g;
  let m;
  while ((m = re.exec(text))) {
    const end = matchBracket(text, m.index);
    if (end === -1) continue;
    const slice = text.slice(m.index, end + 1);
    if (slice.slice(0, 240).includes(RSC_CARD_CLASS)) out.push({ form: 'rsc', text: expandFlight(slice, rows) });
    re.lastIndex = m.index + 14;
  }
  return out;
}

/**
 * React flight escapes a value's leading `$` by doubling it, so a price arrives as
 * `"$$524.00"`. Undoubling it here is what makes the RSC copy of a card comparable to the
 * HTML copy — otherwise every flight-payload price disagrees with the record by a character.
 */
function unflight(value) {
  return String(value || '').replace(/^\$\$/, '$');
}

function cardSlices(text, rows) {
  const html = htmlCardSlices(text);
  return html.length ? html : rscCardSlices(text, rows);
}

/** The card's price slot, in whichever form the surface carries. */
function priceRegionOf(slice) {
  if (slice.form === 'html') {
    const m = PRICE_SLOT.exec(slice.text);
    return m ? textOf(m[1]) : '';
  }
  const m = RSC_PRICE_SLOT.exec(slice.text);
  return m ? textOf(unflight(m[1])) : '';
}

function headingOf(slice) {
  if (slice.form === 'html') {
    const m = /<h3[^>]*>([\s\S]*?)<\/h3>/.exec(slice.text);
    return m ? m[1] : null;
  }
  const m = RSC_HEADING.exec(slice.text);
  return m ? m[1] : null;
}

/** `href="…"` (HTML) and `"href":"…"` (flight payload). */
function hrefsOf(slice) {
  if (slice.form === 'html') return hrefs(slice.text);
  const out = [];
  const re = /"href":"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = re.exec(slice.text))) out.push(m[1].replace(/\\"/g, '"'));
  return out;
}

/** Every ASIN referenced by a `/go/` href in this list. */
function asinsFrom(hrefList) {
  const out = [];
  for (const href of hrefList) {
    const id = goIdFromHref(String(href).replace(/&amp;/g, '&'));
    if (id && L.ASIN_RE.test(id)) out.push(id);
  }
  return out;
}

/** Same, for a raw region of a surface in either form (HTML attrs or flight-payload JSON). */
function asinsIn(text) {
  const list = hrefs(text);
  const re = /"href":"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = re.exec(text))) list.push(m[1]);
  return asinsFrom(list);
}

/**
 * petpal's buy path is `/go/{ASIN}`, and the gates match a destination as `/go/{productId}`
 * or `/dp/{ASIN}` — so a petpal card's real, working CTA reads to them as no destination at
 * all (1,283 false R1a findings on the first run of this adapter).
 *
 * The `/go/` route 302s to `https://www.amazon.com/dp/{id}` (src/app/go/[id]/route.ts via
 * src/lib/go-destination.ts), so this appends the RESOLVED destination beside the raw href
 * rather than in place of it. It cannot launder a wrong link: the ASIN is carried through
 * unchanged, so a card pointing at another product's ASIN still fails the record match.
 *
 * The package-side fix — teaching `hrefTargetsProduct` that a site's /go/ id may be its ASIN
 * — is a template PR, and is listed as a finding in this PR's body.
 */
function resolveDestinations(rawHrefs) {
  const out = rawHrefs.slice();
  for (const href of rawHrefs) {
    const id = goIdFromHref(href);
    if (id && L.ASIN_RE.test(id)) out.push(`https://www.amazon.com/dp/${id}`);
  }
  return out;
}

function placementsIn(text) {
  const out = [];
  const re = /\/go\/[A-Za-z0-9]+\?[^"']*?[?&](?:amp;)?p=([^"'&\s]+)/g;
  let m;
  while ((m = re.exec(text.replace(/&amp;/g, '&')))) out.push(decodeURIComponent(m[1]));
  return out;
}

function surfaceKind(rel) {
  // `.rsc` flight payloads carry the same money surfaces in backslash-escaped form; they are
  // the same KIND of page, not opaque data — classing them 'data' is how an escaped-only
  // defect passes a gate that treats guide and index surfaces differently.
  if (rel.startsWith('guides/') && /\.(html|rsc|body)$/.test(rel)) return 'guide';
  if (rel.startsWith('reviews/')) return 'review';
  if (rel === 'index.html' || rel === 'page.html') return 'home';
  if (/^(guides|reviews|scores|search)\.html$/.test(rel)) return 'index';
  return 'data';
}

function createPetpalAdapter(opts) {
  const siteRoot = (opts && opts.siteRoot) || L.ROOT;
  const ledgerDir = (opts && opts.ledgerDir) || path.join(siteRoot, 'data', 'product-ledger');
  let index = opts && opts.asinIndex;
  let names = opts && opts.nameIndex;

  /**
   * ASIN -> productId (from the ledger) and product NAME -> productId.
   *
   * The name index is built from EVERY frontmatter name variant, not only `record.name`.
   * petpal's comparison table prints the guide's own title for a product, and the same ASIN
   * carries different titles across guides (the migration receipt counts ~130 such ASINs) —
   * a single-name index binds the column on one guide and misses it on the next. Reading the
   * content model here is what the adapter is FOR: slot membership and on-page naming are
   * derived, never stored on a record.
   */
  function indexes() {
    if (index && names) return { index, names };
    index = new Map();
    names = new Map();
    if (fs.existsSync(ledgerDir)) {
      for (const record of loadLedger(ledgerDir, { idIsAsin: true }).values()) {
        for (const h of record.asin.history) if (h.asin) index.set(h.asin.toUpperCase(), record.productId);
        if (record.asin.current) index.set(record.asin.current.toUpperCase(), record.productId);
        index.set(record.productId.toUpperCase(), record.productId);
        names.set(textOf(record.name).toLowerCase(), record.productId);
      }
    }
    for (const row of L.loadPicks().rows) {
      if (!row.asin || !row.name) continue;
      const id = index.get(row.asin.toUpperCase());
      if (id) names.set(textOf(row.name).toLowerCase(), id);
    }
    return { index, names };
  }

  /**
   * An ASIN with no record becomes `asin:<ASIN>` rather than being dropped. Dropping it
   * would make an unrecorded product look like a product that is simply not on the page —
   * the gates would go green on exactly the case they exist to catch.
   */
  function toProductId(asin) {
    // Under RULING 1 the id IS the ASIN, so this lookup is usually identity — but it stays a
    // LOOKUP, because a record found by an ASIN in its `history` (a pre-swap listing) must
    // resolve to the record's current key. An ASIN with no record at all becomes
    // `asin:<ASIN>`, which no record can match: an unrecorded product surfaces as a gate
    // finding instead of vanishing from the comparison.
    return indexes().index.get(String(asin).toUpperCase()) || `asin:${asin}`;
  }

  function nameToProductId(name) {
    const key = textOf(name).toLowerCase();
    const { names: n } = indexes();
    if (n.has(key)) return n.get(key);
    for (const [candidate, id] of n) {
      if (candidate.length > 12 && (candidate.startsWith(key) || key.startsWith(candidate))) return id;
    }
    return `name:${key.slice(0, 60)}`;
  }

  const adapter = {
    id: 'petpal',
    ledgerDir: (root) => path.join(root || siteRoot, 'data', 'product-ledger'),
    builtDir: (root) => path.join(root || siteRoot, '.next', 'server', 'app'),

    /**
     * petpal's `/go/{id}` id IS the ASIN, and under owner RULING 1 (2026-09-09 ~01:05Z) so is
     * the record key. Declared, never inferred: a slug that happens to look like an ASIN is
     * not one. Without this the package's buy-path check read every working CTA as "no
     * destination" — 1,283 false R1a findings on this lane's first run.
     */
    idIsAsin: true,

    /** The sticky price bar is the lead pick's bar: one product by design (956 false PARITY). */
    singleItemLanes: ['stickyEntries'],

    /**
     * …and it is a CLIENT component, absent from every `.rsc` flight payload. Declaring the
     * lane client-only on that extension stops 717 findings on payloads that can never carry
     * it, while leaving it fully checked on all 239 `.html` surfaces — where its absence
     * would still be a removal (§8rr.2). Scoped to one lane and one extension on purpose: a
     * blanket exemption would hide a real removal.
     */
    lanes: { stickyEntries: { clientOnly: ['rsc'] } },

    /** §8jj three-date byline, petpal's field names. */
    frontmatterFields: { published: 'publishDate', updated: 'updatedDate', pricesVerified: 'lastProductCheck' },

    /**
     * petpal's roster lives INSIDE the frontmatter fence, so these keys are body for the
     * §8jj freshness gate: a price or roster change under them must move the editorial date.
     */
    bodyFrontmatterKeys: ['picks', 'products', 'verdict', 'image', 'heroImage'],

    /** Guides/articles/reviews an author edits. Generated output is never content. */
    isContentFile(file) {
      return /(^|\/)(src\/)?content\/(guides|articles|reviews)\/.*\.mdx?$/.test(String(file || ''));
    },

    loadSurfaces({ builtDir }) {
      const dir = builtDir || adapter.builtDir(siteRoot);
      return walkBuilt(dir).map((file) => {
        const rel = path.relative(dir, file);
        const text = normalize(fs.readFileSync(file, 'utf8'));
        // `rows` is the flight index; only `.rsc` payloads have one. It is carried on the
        // surface rather than rebuilt per extractor: five gates read every surface.
        return { path: rel, kind: surfaceKind(rel), text, rows: rel.endsWith('.rsc') ? flightRows(text) : null };
      });
    },

    extractCards(surface) {
      return cardSlices(surface.text, surface.rows).map((slice) => {
        const html = slice.text;
        const raw = hrefsOf(slice).map((h) => h.replace(/&amp;/g, '&'));
        // The card's OWN product is the one behind the pick CTA — the `/go/` href whose `p=`
        // is the numeric rank. Body text inside a card carries injected `/go/…&p=inline`
        // links to OTHER products (guides.ts injects ~5,000 of them corpus-wide), so taking
        // simply the first `/go/` on the card binds some cards to a product they merely
        // mention. That is the wrong-product class, at identity level.
        const ctaHref = raw.find((h) => /[?&]p=\d+(?:&|$)/.test(h));
        const asin = asinsFrom(ctaHref ? [ctaHref] : raw)[0] || null;
        const heading = headingOf(slice);
        return {
          // A card with no `/go/{ASIN}` (petpal has a few picks whose frontmatter `asin:` is a
          // search phrase) is bound by its printed NAME, the same index the comparison table
          // uses. Falling straight through to an unbindable placeholder would report the two
          // Eshopps cards as products with no record when their records exist.
          productId: asin ? toProductId(asin) : heading ? nameToProductId(heading) : `card:${textOf(html).slice(0, 40)}`,
          block: null,
          // Only the pick CTA's own placement; "inline"/"faq" links live in the body, not
          // inside a card slice, so this list is the card's own buy paths.
          placements: placementsIn(html),
          priceRegion: priceRegionOf(slice),
          hrefs: resolveDestinations(raw),
          // petpal never strikes a list price on a card; §8qq.4's struck-figure shape does
          // not exist in this markup, so this is structurally false rather than unchecked.
          listBasisStrike: false,
          ctaLabels:
            slice.form === 'html'
              ? (html.match(/>([^<>]*Check price[^<>]*)</gi) || []).map((t) => t.slice(1, -1).trim())
              : (html.match(/"children":"([^"]*Check price[^"]*)"/g) || []).map((t) => t.slice(13, -1).trim()),
          html,
        };
      });
    },

    extractCounts(surface) {
      const cards = adapter.extractCards(surface);
      const roster = cards.map((c) => c.productId);

      // Comparison COLUMNS (petpal's table is column-oriented), matched by name.
      const comparisonRowIds = [];
      const section = /<section id="comparison"[\s\S]*?<\/section>/.exec(surface.text);
      if (section) {
        const head = /<thead>([\s\S]*?)<\/thead>/.exec(section[0]);
        if (head) {
          const ths = head[1].match(/<th[^>]*scope="col"[^>]*>([\s\S]*?)<\/th>/g) || [];
          for (const th of ths.slice(1)) comparisonRowIds.push(nameToProductId(th.replace(/<[^>]*>/g, '')));
        }
      } else {
        // Flight-payload form. Scoped to the FIRST thead after the `id: "comparison"` marker,
        // never a page-wide `scope="col"` scan: the score grid further down the page has its
        // own header row ("Rank", "Product", "Score") and a flat scan reports those three as
        // comparison members on every guide.
        const at = surface.text.indexOf('"id":"comparison"');
        if (at !== -1) {
          const head = surface.text.indexOf('["$","thead"', at);
          const end = head === -1 ? -1 : matchBracket(surface.text, head);
          if (end !== -1) {
            const region = expandFlight(surface.text.slice(head, end + 1), surface.rows);
            const ths = region.match(/"scope":"col","children":"((?:[^"\\]|\\.)*)"/g) || [];
            for (const th of ths.slice(1)) {
              const name = /"children":"((?:[^"\\]|\\.)*)"/.exec(th);
              if (name) comparisonRowIds.push(nameToProductId(unflight(name[1])));
            }
          }
        }
      }

      // The sticky bar is ONE product (a bar, not a list). It names its product only through
      // its /go/ href; a bar with no href names nothing and contributes no id.
      const stickyEntryIds = [];
      const sticky =
        /<div data-sticky-price-bar="true"[\s\S]*?<\/div>\s*<\/div>/.exec(surface.text) ||
        /"data-sticky-price-bar":(?:"true"|true)[\s\S]{0,6000}/.exec(surface.text);
      if (sticky) for (const a of new Set(asinsIn(sticky[0]))) stickyEntryIds.push(toProductId(a));

      const jsonLdItemIds = [];
      const list = ITEMLIST.exec(surface.text);
      if (list) {
        for (const entry of list[1].split(/\},\s*\{/)) {
          const url = /"url":"([^"]+)"/.exec(entry);
          const id = url ? goIdFromHref(url[1]) : null;
          jsonLdItemIds.push(id && L.ASIN_RE.test(id) ? toProductId(id) : `#${jsonLdItemIds.length + 1}`);
        }
      }

      // petpal's pick CTA carries its rank in the `p=` param; the card prints no rank badge,
      // so this is the page's own rank sequence and the only one it asserts.
      const ranks = cards
        .map((c) => Number(c.placements.find((p) => /^\d+$/.test(p))))
        .filter((n) => Number.isFinite(n));

      return {
        roster,
        cardIds: roster,
        comparisonRowIds,
        stickyEntryIds,
        jsonLdItemIds,
        ranks,
        // petpal prints no "N picks" figure anywhere in the built markup. `null` is the
        // honest answer; a fabricated 0 would fail every roster on the page.
        printedCount: null,
        get cards() {
          return this.cardIds.length;
        },
        get comparisonRows() {
          return this.comparisonRowIds.length;
        },
        get stickyEntries() {
          return this.stickyEntryIds.length;
        },
        get jsonLdItems() {
          return this.jsonLdItemIds.length;
        },
      };
    },

    /** The lead is the card whose CTA carries placement `p=1`. petpal has no HOLD marker. */
    extractLead(surface) {
      const card = adapter.extractCards(surface).find((c) => c.placements.includes('1'));
      return card ? { productId: card.productId, held: false, taskId: null } : null;
    },

    extractFacts(surface) {
      const facts = [];
      for (const card of adapter.extractCards(surface)) {
        const price = /\$\d[\d,]*(?:\.\d{2})?/.exec(card.priceRegion);
        if (price) facts.push({ productId: card.productId, fact: 'price', value: price[0], where: surface.path });
        for (const asin of new Set(asinsFrom(card.hrefs))) {
          facts.push({ productId: card.productId, fact: 'asin', value: asin, where: surface.path });
        }
      }
      // JSON-LD Product offers — the surface AI answers read. Keyed by the block's own
      // /go/{ASIN}, resolved to the record's product id like every other reference here.
      const re = /\{"@type":"Product","@id":"[^"]*"[\s\S]{0,4000}?"offers":\{([\s\S]*?)\}/g;
      let m;
      while ((m = re.exec(surface.text))) {
        const price = /"price":"?([\d.,]+)"?/.exec(m[1]);
        const url = /"url":"([^"]+)"/.exec(m[0]);
        const asin = url ? goIdFromHref(url[1]) : null;
        if (!price || !asin || !L.ASIN_RE.test(asin)) continue;
        const amount = Number(String(price[1]).replace(/,/g, ''));
        if (!Number.isFinite(amount)) continue;
        facts.push({
          productId: toProductId(asin),
          fact: 'price',
          value: `$${amount.toFixed(2)}`,
          where: `${surface.path} (JSON-LD offers)`,
          refKind: 'jsonld',
        });
      }
      return facts;
    },

    describe() {
      return {
        site: 'petpal',
        productIdSource:
          'the ASIN (owner RULING 1, 2026-09-09 ~01:05Z) — lowercased only because the package schema\'s ' +
          'productId pattern rejects uppercase; asin.current carries the canonical form',
        productReferenceInBuiltOutput: '/go/{ASIN}, resolved to the record id through the ledger ASIN index',
        anchors: {
          card: CARD_OPEN,
          priceSlot: String(PRICE_SLOT),
          cta: 'a[href^="/go/"][data-affiliate-tracked="1"]',
          comparison: 'section#comparison thead th[scope=col] (COLUMN-oriented; matched by name)',
          sticky: 'div[data-sticky-price-bar=true] (one product, not a list)',
          jsonLd: 'ItemList @id ending #picks',
        },
        notMeasurable: {
          printedCount: 'petpal prints no "N picks" figure',
          listBasisStrike: 'petpal cards never strike a list price',
          leadHold: 'petpal has no HOLD marker in built output',
          stickyEntries:
            'a single-item lane on .html, and a CLIENT component absent from .rsc — declared as ' +
            'lanes.stickyEntries.clientOnly so the gate checks it exactly where the server renders it',
        },
      };
    },
  };

  assertAdapter(adapter);
  return adapter;
}

const adapter = createPetpalAdapter();

module.exports = { adapter, createPetpalAdapter, petpalAdapter: adapter, cardSlices, textOf };
