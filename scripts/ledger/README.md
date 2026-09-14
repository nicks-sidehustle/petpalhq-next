# petpal product-ledger adoption — ADDITIVE lane

One product, one record. `data/product-ledger/<ASIN>.json`, one JSON file per product,
**uppercase**: on petpal the site's product id IS the ASIN (owner RULING 1, 2026-09-09
~01:05Z), because `/go/{id}` resolves the ASIN directly, and package v0.1.2 enforces the
canonical uppercase form under `idIsAsin`. `asin.current` still carries the ASIN as a dated field,
and identity continuity across a swap lives in the old record's `replaced-by` decision.

Authority: **PRODUCT LEDGER RULINGS (a)–(d)** and **LEDGER GATE RULINGS 1–4** and the
**§8qq.2 addendum**, all in `programs/decision-log/2026-09.md` (affiliate-site-template),
2026-09-08. Package: `@affiliate/product-ledger` from `affiliate-site-template`.

## Nothing here is read by the site

This lane is additive (§8oo / RULING (a)). It writes `data/product-ledger/` and
`.ledger-derived/` and reads everything else. **No legacy store is edited, the renderer is
unchanged, and no served page changes.** The cutover — renderer reads the derived snapshot,
legacy stores retired — is a separate PR under RULING (c): byte-identical built output with a
named, individually-signed exception list, an independent verifier `VERDICT: MERGE`, and the
owner pressing merge.

## Commands

```
npm run ledger:migrate    # legacy stores -> data/product-ledger/*.json  (idempotent)
npm run ledger:derive     # records -> .ledger-derived/  (SHADOW; never over the live files)
npm run ledger:parity     # shadow vs live, as candidate exception rows
npm run build && npm run ledger:gates    # the six ALWAYS gates against the BUILT output
```

`ledger:gates` passes `--base origin/main --repo .` because `check-freshness-stamps` FAILS
without a base (a freshness gate that skips silently is a green check that proves nothing).
Override with `LEDGER_BASE=<ref>`.

Figures always come from the built page, never from frontmatter
(`programs/2026-09-multisite-conversion/KICKOFF-petpal.md`, LESSON BAKED 2026-09-08).

## The dependency

```jsonc
"@affiliate/product-ledger": "github:nicks-sidehustle/affiliate-site-template#product-ledger-v0.1.2"
```

Installed from the tag, not hand-copied (PRODUCT LEDGER RULING (a)); the bin runs as
`npx --no-install product-ledger`. A bump is a one-line PR, and the line is the receipt of
which ruleset petpal ran on any date. `PRODUCT_LEDGER_PATH` remains only as a development
override for testing an unreleased branch; `lib.cjs` refuses a copy older than v0.1.2 rather
than silently deriving figures from an older ruleset.

**CI credential owed (owner-typed, see the package's INSTALL.md).** `affiliate-site-template`
is private and a sister's `GITHUB_TOKEN` grants no access to it, so this install works on a
developer machine and **not** in petpal CI until the owner adds a fine-grained read token (or
a deploy key, or makes the template public). Nothing in this PR depends on it: `ledger:*` are
local commands and no workflow was changed.

## Files

| File | What it is |
|---|---|
| `lib.cjs` | package resolution, guide-frontmatter reading, product-id minting, legacy receipts |
| `migrate-from-stores.cjs` | legacy stores -> records; emits the migration receipt + writer manifest |
| `derive-legacy.cjs` | records -> the legacy files' content, into `.ledger-derived/` |
| `parity-report.cjs` | shadow vs live, every difference as a candidate exception row |
| `petpal.adapter.cjs` | the site adapter the gates read the BUILT output through (`idIsAsin`, `singleItemLanes`, `isContentFile`, `frontmatterFields`, `bodyFrontmatterKeys`) |
| `gates.cjs` | `ledger:gates` wrapper (five ALWAYS gates; parity is a cutover-only gate) |

## The two things a reader should know before trusting this

**1. The key is the uppercase ASIN — and a product with no ASIN currently has no key.**
RULING 1 keys records by ASIN; v0.1.2 widened the schema pattern and enforces the uppercase
canonical form under `idIsAsin`. That enforcement also refuses ANY non-ASIN key on this site,
at write and at load — so the four picks RULING 2 covers (no Amazon listing, therefore no
ASIN) **cannot be written at all**. Their evidence is gathered and shown in the migration
receipt under BLOCKED; the records are not written; their cards surface as no-record gate
findings. The package needs a key form for a record whose `asin.current` is null, or the
ruling needs another shape. Nothing here invents an ASIN.

**2. The clock is derived from the inputs.** `now` is the newest timestamp any legacy store
carries, never `Date.now()`. Re-running against a newer main produces byte-identical files
for unchanged inputs, and the 7-day opinion window (RULING 2/4) is measured against the
corpus's own newest fact rather than against whenever a session happened to run.
