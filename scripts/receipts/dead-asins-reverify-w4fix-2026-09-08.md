# dead-asins-reverify W4 fix receipt — 2026-09-08

petpal DATA lane — W4 fix cycle on PR #178 (owner §8qq rule 2: no featured Buy Box = UNFEATURED = DARK).
Source: `scripts/receipts/dead-asins-reverify-w4fix-2026-09-08.jsonl` — 4 rows. Script: `scripts/fix-w4-unfeatured-2026-09-08.ts`.

| ASIN | Guide(s) | Finding | Fix |
|---|---|---|---|
| B0002DJNN0 | how-to-build-a-backyard-koi-pond-2026.md | marketplace-only offer, no featured Buy Box | dead-asins.json restored (no_offer), override row rewritten to dark (unavailable, price null) |
| B0078LOTV0 | best-medicated-anti-itch-dog-shampoos-2026.md | marketplace-only offer, no featured Buy Box | dead-asins.json restored (no_offer), override row rewritten to dark (unavailable, price null) |
| B00N54E9MI | best-dog-chew-toys-anxiety-2026.md, best-dog-puzzle-toys-treat-dispensing-2026.md | marketplace-only offer, no featured Buy Box | dead-asins.json restored (no_offer), override row rewritten to dark (unavailable, price null) |
| B0CZF14SWV | best-chicken-feeders-waterers-2026.md | redirectsTo: B0GX9ML82H (different variant) | dead-asins.json restored (no_offer), override row rewritten to dark (unavailable, price null) |

