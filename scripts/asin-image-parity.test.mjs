#!/usr/bin/env node
/**
 * asin-image-parity.test.mjs — fixture test for the parity lint. No deps (node:test).
 *
 * Proves each rule fires on a seeded violation and that a clean corpus passes:
 *   (a) asin-without-image [error] · (b) bad-image-host [error] · (c) orphan-image [warn].
 * Also exercises the real petpal `picks:`-block extractor (parsePicks) end-to-end, including
 * the nested-field-clobber guard.
 *
 * Run:  node --test reference/honesty-audit/asin-image-parity.test.mjs
 *       (or `npm test` once wired)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { checkParity, parsePicks, RULES } from './asin-image-parity.mjs';

const AMZ = 'https://m.media-amazon.com/images/I/3149w6MgorL._SL500_.jpg';

test('rule (a) asin-without-image → ERROR', () => {
  const v = checkParity([{ slug: 'g', pickName: 'P', asin: 'B07WRSJC77', image: '' }]);
  const hit = v.find((x) => x.rule === RULES.ASIN_WITHOUT_IMAGE);
  assert.ok(hit, 'expected asin-without-image to fire');
  assert.equal(hit.severity, 'error');
});

test('rule (a) also fires when image is whitespace-only', () => {
  const v = checkParity([{ slug: 'g', pickName: 'P', asin: 'B07WRSJC77', image: '   ' }]);
  assert.ok(v.some((x) => x.rule === RULES.ASIN_WITHOUT_IMAGE && x.severity === 'error'));
});

test('rule (b) bad-image-host → ERROR (non-amazon URL)', () => {
  const v = checkParity([{ slug: 'g', pickName: 'P', asin: 'B07WRSJC77', image: 'https://cdn.example.com/x.jpg' }]);
  const hit = v.find((x) => x.rule === RULES.BAD_IMAGE_HOST);
  assert.ok(hit, 'expected bad-image-host to fire');
  assert.equal(hit.severity, 'error');
});

test('rule (b) also fires for a local/placeholder path', () => {
  const v = checkParity([{ slug: 'g', pickName: 'P', asin: 'B07WRSJC77', image: '/images/placeholder.png' }]);
  assert.ok(v.some((x) => x.rule === RULES.BAD_IMAGE_HOST && x.severity === 'error'));
});

test('rule (c) orphan-image → WARN (image, no asin)', () => {
  const v = checkParity([{ slug: 'g', pickName: 'P', asin: '', image: AMZ }]);
  const hit = v.find((x) => x.rule === RULES.ORPHAN_IMAGE);
  assert.ok(hit, 'expected orphan-image to fire');
  assert.equal(hit.severity, 'warn');
});

test('clean pick with asin + amazon image → no violations', () => {
  const v = checkParity([{ slug: 'g', pickName: 'P', asin: 'B07WRSJC77', image: AMZ }]);
  assert.equal(v.length, 0);
});

test('clean no-ASIN search pick (empty asin + empty image) → no violations', () => {
  const v = checkParity([{ slug: 'g', pickName: 'P', asin: '', image: '' }]);
  assert.equal(v.length, 0);
});

test('all three rules fire across a seeded corpus; exactly the two errors block', () => {
  const v = checkParity([
    { slug: 'a', pickName: 'asin-no-img', asin: 'B00000001A', image: '' },              // (a)
    { slug: 'b', pickName: 'bad-host', asin: 'B00000002B', image: 'http://evil/x.jpg' }, // (b)
    { slug: 'c', pickName: 'orphan', asin: '', image: AMZ },                             // (c)
    { slug: 'd', pickName: 'clean', asin: 'B00000004D', image: AMZ },                    // clean
    { slug: 'e', pickName: 'clean-search', asin: '', image: '' },                        // clean
  ]);
  const rules = new Set(v.map((x) => x.rule));
  assert.ok(rules.has(RULES.ASIN_WITHOUT_IMAGE) && rules.has(RULES.BAD_IMAGE_HOST) && rules.has(RULES.ORPHAN_IMAGE));
  assert.equal(v.filter((x) => x.severity === 'error').length, 2);
  assert.equal(v.filter((x) => x.severity === 'warn').length, 1);
});

// ── extractor (parsePicks) end-to-end on realistic guide-picks markdown ────────
const GUIDE = `---
title: Test Guide
image: /images/guides/hero.png
products: []
picks:
  - rank: 1
    label: BEST OVERALL
    name: Greater Goods Smart Scale
    price: $57.99
    image: 'https://m.media-amazon.com/images/I/3149w6MgorL._SL500_.jpg'
    asin: B07WRSJC77
    keyFeatures:
      - Capacity up to 66 lb
      - name: NOT-A-PICK-NAME
  - rank: 2
    name: Broken Pick No Image
    asin: B005D7FAXW
    image: ''
  - rank: 3
    name: Search Only Pick
    asin: ''
    image: ''
methodology:
  factors:
    - name: Expert Consensus
      weight: 35
---
Body text with an image: not-a-field reference.
`;

test('parsePicks extracts only picks-block items, ignores hero image + nested fields', () => {
  const picks = parsePicks(GUIDE);
  assert.equal(picks.length, 3);
  // nested `- name: NOT-A-PICK-NAME` under keyFeatures must NOT clobber the real name
  assert.equal(picks[0].pickName, 'Greater Goods Smart Scale');
  assert.equal(picks[0].asin, 'B07WRSJC77');
  assert.match(picks[0].image, /^https:\/\/m\.media-amazon\.com\//);
  assert.equal(picks[1].asin, 'B005D7FAXW');
  assert.equal(picks[1].image, '');
  assert.equal(picks[2].asin, '');
  assert.equal(picks[2].image, '');
});

test('parsePicks → checkParity: the corpus yields exactly one (a) error, no warnings', () => {
  const picks = parsePicks(GUIDE).map((p) => ({ slug: 'test', ...p }));
  const v = checkParity(picks);
  assert.equal(v.filter((x) => x.severity === 'error').length, 1);
  assert.equal(v[0].rule, RULES.ASIN_WITHOUT_IMAGE);
  assert.equal(v.filter((x) => x.severity === 'warn').length, 0);
});
