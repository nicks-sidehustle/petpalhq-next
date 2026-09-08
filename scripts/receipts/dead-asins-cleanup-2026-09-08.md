# dead-asins-cleanup receipt — 2026-09-08

petpal DATA lane — STALE DEAD-ASIN CLEANUP (owner rules §8qq/§8rr).
Source: `scripts/receipts/dead-asins-cleanup-2026-09-08.jsonl` — 26 unique ASINs, Chrome-lane live reads today (curl lane hit a genuine 2-consecutive-captcha wall after 3 ASINs and was abandoned per protocol; raw captcha HTML confirmed by hand before switching lanes).
Script: `scripts/clear-stale-dead-asins.ts`. Run: `npx tsx scripts/clear-stale-dead-asins.ts`.

## Headline

- ASINs re-read live today: 26 (26 unique, covering 29 guide rows)
- **`data/dead-asins.json` entries cleared this lane: 1**
- **`data/live-read-overrides.json` rows written this lane: 3**
- Already resolved by PR #164 (merged earlier today) and re-confirmed LIVE-NEW by this lane's own independent read — no file change needed: 22
- KEPT (not confirmed LIVE-NEW today, stays gated): 1

## Cleared this lane

| ASIN | Guides | Prior dead-asins status/reason/lastVerified | Live price today | Merchant | Override written |
|---|---|---|---:|---|---|
| B0G3XJRKSM | best-cat-water-fountains-2026 | no_offer / OUT_OF_STOCK / unavailable / 2026-07-29 | $32.99 | Amazon.com | yes |

## Override-only writes (no dead-asins.json entry existed — snapshot-gated only)

| ASIN | Guides | Live price today | Merchant | Note |
|---|---|---:|---|---|
| B0D547KMH5 | best-catio-outdoor-cat-enclosures-2026 | $189.99 | Amazon.com |  |
| B07JHG13WP | best-turtle-aquatic-reptile-filtration-2026 | $170.99 | Amazon.com | winning Buy-New buybox is Amazon.com $170.99; a secondary Used-Like New $153.89 (Monster Pets) offer sits below it but is NOT the buy-box winner |

## Already resolved by PR #164 — re-confirmed LIVE-NEW today, no file change

| ASIN | Guides | Live price today | Merchant | Note |
|---|---|---:|---|---|
| B00004ZB4U | best-squirrel-proof-bird-feeders-2026 | $99.99 | Amazon.com |  |
| B00LB2UOCK | best-limited-ingredient-diets-food-sensitivities-2026 | $74.97 | Amazon.com |  |
| B0988DB9PP | best-pet-dental-care-products-dogs-cats | $25.00 | Petsmile (ships from Amazon) |  |
| B08YGTTB6B | senior-cat-accessibility-setup | $49.95 | Amazon.com |  |
| B0DJFXCBTK | best-bearded-dragon-starter-kits-2026, best-ball-python-starter-kits-2026 | $349.00 | Amazon.com |  |
| B09L1PBFTH | best-planted-aquarium-lights-2026 | $189.19 | Amazon.com |  |
| B0006L2UC4 | best-reptile-heat-lamps-basking-fixtures-2026 | $4.96 | Amazon.com |  |
| B075MSPYVG | best-dog-backyard-agility-kits-2026 | $62.99 | Amazon.com |  |
| B0F3WW267L | best-cellular-no-wifi-pet-cameras-2026 | $39.99 | YAYAMOTH (ships from Amazon) |  |
| B014Z4IOC2 | how-to-set-up-a-chameleon-enclosure-2026, best-large-arboreal-terrariums-paludariums-2026 | $181.71 | Amazon.com |  |
| B0F5HWQ2T1 | how-to-set-up-a-leopard-gecko-habitat-2026 | $27.98 | Amazon.com |  |
| B0FNRMTF5B | how-to-set-up-a-bioactive-reptile-terrarium-2026 | $89.99 | Reptile Basics (ships from Amazon) |  |
| B0F3JD4D9X | best-aquarium-stands-cabinets-2026 | $169.98 | Amazon.com |  |
| B0GH6KC3L4 | best-dog-cooling-house-outdoor-shade-2026 | $35.99 | Mowonder (ships from Amazon) |  |
| B0CLGPX16G | best-guinea-pig-cages-habitats-2026 | $31.99 | VISCOO-STORE (ships from Amazon) |  |
| B003LW0BV2 | best-large-parrot-flight-cages-2026 | $1574.00 | Amazon.com |  |
| B0CP693KXK | best-ball-python-starter-kits-2026 | $129.99 | Reptile Basics (ships from Amazon) |  |
| B0DNGK22LG | how-to-keep-your-dog-cool-and-prevent-heatstroke-2026 | $59.99 | Ruffwear, Inc. (ships from Amazon) |  |
| B01MRIQW7K | best-nano-aquarium-kits-2026 | $151.98 | Amazon.com |  |
| B0CVN7V7GG | best-4th-of-july-pet-safety-costumes-2026 | $189.00 | Fi Dogs (ships from Amazon) | redirects to default child variant B0FH7SLFCH (normal parent/child ASIN behavior) |
| B08GFLJLBW | best-cat-nail-clippers-grooming-restraints | $22.99 | Cinf (ships from Amazon) |  |
| B007UMTWAK | best-reptile-uvb-bulbs-2026 | $64.95 | Reptile Basics (ships from Amazon) |  |

## KEPT — not confirmed LIVE-NEW today

| ASIN | Guides | Today's read | Note |
|---|---|---|---|
| B0BGG1M5MR | how-to-stop-pets-stealing-each-others-food-2026, best-elevated-raised-dog-feeders-2026 | SEE-ALL-BUYING-OPTIONS — See All Buying Options (no single New buy-box winner) | Existing PR #164 override for this ASIN claims LIVE-NEW $61.70 — no longer matches today's read; left untouched (out of this lane's scope), flagged for follow-up. |

