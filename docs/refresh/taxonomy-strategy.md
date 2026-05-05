# ChristmasGearHQ Taxonomy Strategy

## Purpose

Replace the current narrow five-category model with a design-first, SEO/AEO-friendly taxonomy that reflects the actual guide inventory and shopper mental models.

## Current model

`src/config/site.ts` currently defines:

1. Tree Stands & Skirts (`tree-stands`)
2. Christmas Lights (`lights`)
3. Ornaments & Decor (`ornaments`)
4. Outdoor Decor (`outdoor`)
5. Holiday Storage (`storage`)

This is too narrow for the current Markdown inventory.

## Target pillar taxonomy

### 1. Tree Setup (`tree-setup`)

For real/artificial tree decisions and setup gear.

Maps from:
- Tree Stands
- Tree Stands & Skirts
- Artificial Trees
- Christmas Trees
- Tree Decorating

### 2. Lights & Power (`lights-power`)

For indoor/outdoor lights, smart lighting, projectors, power, and installation.

Maps from:
- Christmas Lights
- Christmas Lighting
- Outdoor Lighting
- Projector Lights
- Smart Decorations when lighting-led

### 3. Decor & Atmosphere (`decor-atmosphere`)

For ornaments, garlands, wreaths, stockings, villages, indoor decor, traditions, and trend content.

Maps from:
- Ornaments & Decor
- Christmas Ornaments
- Garland
- Wreaths
- Stockings
- Christmas Villages
- Indoor Decorations
- Christmas Decorations
- Holiday Traditions

### 4. Outdoor Displays (`outdoor-displays`)

For exterior decorations and yard displays.

Maps from:
- Outdoor Decor
- Outdoor Decorations
- Inflatables
- Outdoor winter landscape decorations
- Holiday outdoor lighting displays when display-led rather than installation-led

### 5. Gifts & Wrapping (`gifts-wrapping`)

For stocking stuffers, gift sets, wrapping supplies, tech gifts, kids/family gifts, and gift presentation.

Maps from:
- Gift Ideas
- Gift Wrapping
- Stocking Stuffers
- Tech Gifts
- Educational Gifts
- Holiday Fashion when gift-led

### 6. Hosting & Holiday Kitchen (`hosting-kitchen`)

For entertaining, table settings, baking, food storage, and party hosting.

Maps from:
- Holiday Entertaining
- Party Hosting
- Table Setting & Entertaining
- Baking Tools
- Food Storage

### 7. Storage & Next-Year Prep (`storage-next-year`)

For storage, organization, post-season prep, and long-term durability.

Maps from:
- Holiday Storage
- Storage & Organization
- Ornament storage
- Light storage
- Tree bags

## Migration strategy

1. Keep existing URL slugs stable during taxonomy migration.
2. Add pillar metadata first; do not rename guide URLs in the same PR.
3. Update `src/config/site.ts` category/pillar definitions after content mapping is documented.
4. Update category hub routes and navigation after validation can map old labels to target pillars.
5. Only redirect/delete duplicate guides after a merge plan identifies the canonical page.

## Quality checks

- Every guide maps to exactly one target pillar.
- Every guide may have multiple secondary facets, but only one primary pillar.
- Category labels should match shopper mental models, not internal content-production labels.
- Navigation should favor 5–7 high-level decisions, not every microcategory.
