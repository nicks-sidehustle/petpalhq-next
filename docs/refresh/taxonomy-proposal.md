# ChristmasGearHQ Taxonomy Proposal

## Purpose
Replace the current five-category model with a design-first content taxonomy that matches the actual guide inventory while preserving stable URLs during migration.

## Current problem
`src/config/site.ts` currently defines only:

- Tree Stands & Skirts
- Christmas Lights
- Ornaments & Decor
- Outdoor Decor
- Holiday Storage

The Markdown inventory includes many additional categories: Artificial Trees, Gift Wrapping, Stocking Stuffers, Tech Gifts, Holiday Entertaining, Baking Tools, Christmas Villages, Garland, Wreaths, Holiday Fashion, Smart Decorations, and more.

## Proposed pillar taxonomy

### 1. Tree Setup
For real/artificial tree decisions and setup gear.

Aliases:
- Tree Stands
- Tree Stands & Skirts
- Artificial Trees
- Christmas Trees

### 2. Lights & Power
For indoor/outdoor lights, smart lighting, projectors, power, and installation.

Aliases:
- Christmas Lights
- Christmas Lighting
- Outdoor Lighting
- Smart Decorations

### 3. Decor & Atmosphere
For ornaments, garlands, wreaths, stockings, villages, indoor decor, and trend content.

Aliases:
- Ornaments & Decor
- Christmas Ornaments
- Garland
- Wreaths
- Stockings
- Christmas Villages
- Indoor Decorations
- Christmas Decorations
- Holiday Traditions

### 4. Outdoor Displays
For exterior decorations and yard displays.

Aliases:
- Outdoor Decor
- Outdoor Decorations
- Holiday Outdoor Lighting Displays

### 5. Gifts & Wrapping
For stocking stuffers, gift sets, wrapping supplies, tech gifts, and kids/family gifts.

Aliases:
- Gift Ideas
- Gift Wrapping
- Stocking Stuffers
- Tech Gifts
- Educational Gifts

### 6. Hosting & Holiday Kitchen
For entertaining, table settings, baking, food storage, and party hosting.

Aliases:
- Holiday Entertaining
- Party Hosting
- Table Setting & Entertaining
- Baking Tools

### 7. Storage & Next-Year Prep
For storage, organization, post-season prep, and long-term durability.

Aliases:
- Holiday Storage
- Storage & Organization

### 8. Family & Seasonal Lifestyle
For seasonal lifestyle content that should remain Christmas-specific and not drift into generic home/fashion content.

Aliases:
- Holiday Fashion

## Migration strategy

### Step 1 — Add transitional mapping
Add a `contentPillars` or `categoryAliases` export to `src/config/site.ts` without removing the current `categories` array yet. This lets validation and guide rendering normalize existing frontmatter while preserving current `/reviews/[category]` product URLs.

### Step 2 — Normalize guide summaries
Extend `src/lib/guides.ts` to compute:

- `categoryLabel`
- `pillarSlug`
- `pillarName`
- `canonicalCategorySlug`

Keep the original `category` frontmatter available for display during migration.

### Step 3 — Update category hubs
Replace product-only category hubs with pillar hubs after product data has been mapped to pillars.

### Step 4 — Rewrite frontmatter gradually
After redirects and UX templates are ready, update Markdown frontmatter from legacy category names to the pillar system.

## URL preservation
Do not immediately replace existing product URLs such as:

- `/reviews/tree-stands/krinner-tree-genie-xxl`
- `/reviews/lights/100-led-christmas-lights-33ft`

Instead, create pillar hubs alongside or above existing product category paths until a redirect strategy is approved.

## Acceptance criteria
- Every retained Markdown guide maps to exactly one pillar.
- Product URLs continue to build.
- Search, RSS, sitemap, and guide pages can display pillar/category context from the Markdown registry.
- Validation can distinguish unknown categories from known legacy aliases.
- The site avoids creating dozens of thin category pages.

