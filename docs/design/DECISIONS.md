# Design Decisions — PetPalHQ v2

**Status:** Draft for owner review (2026-05-05). Edit freely; this file is the source of truth for which design variant the v2 build implements.

## Why this file exists

The May 5 wireframes in `wireframes/` show **four parallel directions** for review pages and guides, and two for the homepage. They're exploration, not a spec. Without a written pick, every future build session will silently re-litigate "should we do A or B?" — and the result is overengineering (four templates instead of one, "personalization" features built before there's a single guide live).

This file pins one direction per page type, with one line of *why*. Change a pick by editing this file and noting the date — don't add a second variant to "ship both."

## Picks

| Page type | Pick | Why | Defer |
|---|---|---|---|
| **Review pages** | A — Editorial | Affiliate reviews are read for the verdict + score + buy box. Editorial layout serves that without state. | B (Magazine "lived-with-it"), D (comparison) are *content choices* you can author into A's structure. C (Personalized) needs saved-pet state — defer to v1.1. |
| **Buying guides** | A — Editorial | Same logic — guides are evergreen reference. Editorial structure (intro → checkpoints → top picks → FAQ) ships without infrastructure. | B (Magazine quick-pick grid), D (spreadsheet) are content choices. C (Personalized) needs pet profiles — defer. |
| **Homepage** | B — Magazine grid | Five pet types (dogs/cats/small pets/birds/fish/reptiles) need category browsing. Editorial blog-first (A) buries category nav. | A's "live deals" strip is worth lifting into B as a sidebar element — small graft, not a rebuild. |
| **Landing / dashboard** | DEFER | Both C and D depend on features that don't exist (pet profiles, cross-category comparison engine). | Revisit after Wave 1 + Wave 2 guides ship and there's actual content to land users on. |

## What this means for the build

- **One review template**, one guide template, one homepage. No template selector, no per-page layout variants.
- **No pet-profile feature in v1.** No "Mochi · Shiba · 22 lb" pill, no profile-driven filtering, no "saved pets" account state. The wireframes that show this (reviews-C, guides-C, landing-C) are v1.1+ candidates.
- **No comparison engine in v1.** The "compare tray" UI in wireframes (reviews-D, guides-D, landing-D) is its own product surface. Defer.
- **Magazine-style content variants are fine.** A six-month "lived with it" review can be written into the editorial template — it doesn't need its own layout.

## What stays in scope for v1

From the wireframes, these elements ARE worth implementing inside the chosen templates:

- Sticky buy box on scroll (reviews-A)
- Score breakdown bars (reviews-A, reviews-B)
- "Editor's Choice" / "Best for" pill labels (reviews-A, reviews-B)
- "Also consider" sidebar (reviews-A)
- Live deals / price-drop strip on homepage (homepage-A → grafted into homepage-B)
- Category tabs on homepage (homepage-B)
- "Trending this week" + "Latest reviews" feeds (homepage-B)

## Reference

- Wireframes: `./wireframes/` (May 5 from claude.com Designer)
- Superseded HTML mockups: `./early-html-mockups/` (May 1, kept for reference, do not implement against)
- Execution brief: `../../BRIEF_PETPAL_V2.md`
