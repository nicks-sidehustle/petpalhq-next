#!/usr/bin/env node
'use strict';
/**
 * Run the package's five ALWAYS gates against petpal's records and its CURRENT built output.
 *
 *   npm run build && npm run ledger:gates
 *
 * `check-ledger-parity` is deliberately NOT in this set: RULING 4/4 (2026-09-08 ~21:50Z) puts
 * the two-build parity gate on the CUTOVER PR only, re-run by the independent verifier. This
 * wrapper exists so the invocation carries the adapter path and the ledger root instead of
 * living in a session's scrollback.
 */

const path = require('node:path');
const { spawnSync } = require('node:child_process');
const L = require('./lib.cjs');

// The bin comes from the installed package (`node_modules/.bin/product-ledger`); resolving
// the runner through the package's own directory keeps this working under a
// PRODUCT_LEDGER_PATH override too.
const { dir } = L.requireLedgerPackage();
const args = [
  path.join(dir, '..', 'gates', 'run.cjs'),
  '--adapter', path.join(__dirname, 'petpal.adapter.cjs'),
  '--ledger', L.LEDGER_DIR,
  '--built', path.join(L.ROOT, '.next', 'server', 'app'),
  // check-freshness-stamps (§8jj addendum) reads <base>...HEAD and FAILS without --base: a
  // freshness gate that skips silently is a green check that proves nothing.
  '--base', process.env.LEDGER_BASE || 'origin/main',
  '--repo', L.ROOT,
  ...process.argv.slice(2),
];
process.exit(spawnSync(process.execPath, args, { stdio: 'inherit' }).status ?? 1);
