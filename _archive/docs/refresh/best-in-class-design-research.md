# Best-in-Class Design Research: ChristmasGearHQ

## Visual thesis

ChristmasGearHQ should feel like a refined specialty holiday shop's buying almanac: warm, practical, editorial, and trustworthy, with fewer generic cards and more decision support.

## UX thesis

A shopper should understand within 5 seconds where to start, what to buy for their situation, and why the recommendation is trustworthy.

## Business thesis

Better design should increase qualified affiliate clicks by making decisions easier and recommendations more credible, not by making CTAs louder.

## Research takeaways

| Reference | Page type | What works | Transferable principle |
|---|---|---|---|
| [Balsam Hill Christmas tree lights guide](https://www.balsamhill.com/inspiration/christmas-tree-lights-guide) | Brand buying guide | Explains light types, control types, density by tree height, and FAQs in a structured educational flow. | Pair product recommendations with decision tables and practical setup math. |
| [Balsam Hill outdoor light guide](https://www.balsamhill.com/inspiration/outdoor-light-buying-guide) | How-to + commerce support | Uses step-by-step setup guidance, safety tips, and contextual product education. | Add setup/safety/storage sections before pushing shoppers to buy more. |
| [Food52 holiday gift guides](https://food52.com/pages/holiday-gift-guides-2025) | Editorial commerce | Organizes gifts by persona and mood rather than raw product taxonomy. | Use “start by need” and “best for” pathways rather than a generic category wall. |
| Terrain / Anthropologie holiday collections | Premium retail category | Strong art direction, curated collection feel, restrained product labels, high materiality. | Create a catalog mood with warm imagery, parchment surfaces, and fewer equal-weight cards. |
| [The Spruce outdoor Christmas lights roundup](https://www.thespruce.com/best-outdoor-christmas-lights-4148110) | Commerce/editorial roundup | Clear “best for” segmentation and practical criteria for style, use case, budget, and storage. | Every product/guide card should communicate fit, not just category and price. |

## Design plan

### In scope for this pass

- Homepage first impression and product-card polish already started by frontend-skill.
- Guide article UX refinement: trust/navigation stack and better long-form scanning.
- Research documentation for future Figma or higher-fidelity design work.

### Out of scope for this pass

- Full Figma mockups; current Figma seat appears view-only.
- Full design-system rebuild.
- Rewriting all stub guides.
- Adding new dependencies for animation.

## Implementation targets

### Guide article template

Job: Help users orient quickly, trust the guide, and jump to relevant decision sections.

Dominant visual idea: an editorial almanac page with a strong hero, quick answer, compact trust row, table of contents, method box, then content.

Changes:

- Add a compact trust bar that combines author, update date, read time, and affiliate disclosure.
- Add a table-of-contents component generated from H2 sections.
- Add anchor IDs to Markdown H2/H3 headings.
- Keep Amazon Markdown links routed through `AffiliateLink`.

### Future product cards

Job: show recommendation fit before price.

Future refinements:

- Add `bestFor` field to product model.
- Add one-line verdict on cards.
- Show freshness as quiet trust support.

## Verification

- `npm run refresh:audit`
- `npm run validate:content`
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build --silent`
- local smoke test for `/guides/best-christmas-lights-2026`
- `git diff --check`
