# ChristmasGearHQ Typecheck Triage

## Command

```bash
npx tsc --noEmit
```

## Current result

Passed after the Ralph cleanup pass.

## Fixes applied

### 1. Removed unsupported Next config keys

Removed the unsupported `eslint` key and the temporary `typescript.ignoreBuildErrors` setting from `next.config.ts`.

Result: `npm run build --silent` now runs TypeScript validation during the production build.

### 2. Repaired incompatible FAQ regex

`src/lib/guides.ts` used a `s` regex flag that was incompatible with the current TypeScript target. The regex now uses `[\s\S]` to preserve behavior without changing the compiler target.

### 3. Repaired generated content type guard

`src/types/content.ts` now exports a valid `ArticleCategory` type and uses a string-safe category guard.

### 4. Pruned stale unused components

Deleted unused/stale components that imported missing modules or expected an obsolete richer product model:

- `src/components/BlogCard.tsx`
- `src/components/BlogCategories.tsx`
- `src/components/ConsensusReviewCard.tsx`
- `src/components/LiveReviewsFeed.tsx`
- `src/components/homepage/FullLiveFeed.tsx`
- `src/components/homepage/LiveContentSection.tsx`
- `src/components/reviews/ComparisonTool.tsx`
- `src/components/reviews/QuickViewModal.tsx`
- `src/components/RssFeedWidget.tsx`
- `src/components/wirecutter/ComparisonTable.tsx`

Reference check:

```bash
for b in BlogCard BlogCategories ConsensusReviewCard LiveReviewsFeed FullLiveFeed LiveContentSection ComparisonTool QuickViewModal; do rg "$b" src/app src/components -g '*.tsx' -n && exit 1 || true; done
# result: stale-component-references-clear
```

## Verification

```bash
npx tsc --noEmit
# result: passed

npm run build --silent
# result: passed, including Running TypeScript
```

## Remaining note

The deleted components appeared to be unused template leftovers. If any of their UI ideas are needed later, they should be rebuilt against the new content model and affiliate primitives rather than restored as-is.
