# PetPalHQ Design Identity Document
## "The Trusted Friend" — Complete Visual System v1.0

---

## 1. Design Philosophy

### The Core Position

"The Trusted Friend" means one specific person: not a stranger on Reddit, not a listicle bot, not a clinical vet chart. It means your college friend who happened to become a vet tech, who texts you unprompted when she sees a harness go on sale, who says "honestly, skip that one — the buckle broke on mine after six months."

That voice has three qualities that must translate into every design decision:
- **Warm but not cute.** No pastel paw prints, no Comic Sans energy, no cartoon dogs in sunglasses. But also not cold, clinical, or minimalist to the point of feeling corporate.
- **Credible but not stiff.** Expertise is earned through specificity, not through the word "EXPERT" in a badge. A safety callout written in Rachel's voice is more credible than a generic "Vet Approved" stamp.
- **Personal but scalable.** The site is one person's tested opinions, but the design system must feel like it could expand gracefully — more guides, more categories, eventual contributors.

### The Anti-Patterns to Avoid

- **WebMD for pets**: White backgrounds, navy blues, clinical data tables, zero warmth. Accurate but alienating.
- **PetSmart blog**: Bright primary colors, clip art paw prints, "fun" typography, zero editorial credibility.
- **Generic affiliate blog**: Gray cards on white, orange Amazon buttons, zero visual personality. Forgettable by definition.
- **Kinfolk cosplay**: Beautiful photography, zero information density, impractical for a buyer making a decision at 11pm.

### The Sweet Spot: Editorial Warmth

The target is closer to a well-produced food magazine that also happens to be rigorously useful — think *Bon Appétit* circa 2018 crossed with the information density of *Consumer Reports*, rendered in materials that feel like a sun-warmed kitchen rather than a laboratory.

---

## 2. Color System

### Existing Foundation (Confirmed in `globals.css`)

The variables are well-named and mostly correct. The gap is that inner pages and components still reach for raw Tailwind `amber-*` and `gray-*` classes, breaking the system. Every color decision below should be expressed through the CSS variables.

### Full Palette — Specific Values

```css
:root {
  /* ── Core Brand ────────────────────────────────── */
  --forest:           #1B3A2D;   /* HSL: 153 35% 16%  — anchor primary */
  --forest-mid:       #2C5F45;   /* HSL: 153 35% 27%  — hover, active states */
  --forest-light:     #4A8C65;   /* HSL: 145 31% 42%  — icons, accents on dark bg */
  --forest-faint:     #EEF4F0;   /* HSL: 145 18%  94% — tinted surface, dog-mode bg */

  /* ── Warm Neutrals ─────────────────────────────── */
  --parchment:        #F5EDD8;   /* HSL: 41 63% 90%  — primary background */
  --parchment-alt:    #EBE4D2;   /* HSL: 40 37% 87%  — section alternates */
  --parchment-warm:   #E2D8C4;   /* HSL: 39 32% 83%  — border-level depth */
  --linen:            #FAF6EE;   /* HSL: 42 67% 95%  — card backgrounds on parchment */

  /* ── Ink Scale ─────────────────────────────────── */
  --ink:              #1C1209;   /* HSL: 30 52%  7%  — primary text */
  --ink-soft:         #6B5F4E;   /* HSL: 33 17% 36%  — secondary text, captions */
  --ink-faint:        #9E917E;   /* HSL: 34 14% 56%  — placeholder, disabled */

  /* ── Accent: Terracotta ────────────────────────── */
  --terracotta:       #E05C2A;   /* HSL: 20 74% 52%  — CTAs, links, tags */
  --terracotta-dark:  #B8441A;   /* HSL: 20 74% 40%  — hover on terracotta */
  --terracotta-faint: #FAEADE;   /* HSL: 23 83% 93%  — tint bg for callouts */

  /* ── Gold ──────────────────────────────────────── */
  --gold:             #C8A96E;   /* HSL: 37 48% 61%  — labels, stars, "this week" */
  --gold-dark:        #A8893E;   /* HSL: 42 48% 45%  — hover gold */
  --gold-faint:       #F5EDDA;   /* HSL: 40 63% 91%  — very subtle gold tint */

  /* ── Pet-Type Differentiation ──────────────────── */
  --dog-accent:       #4A8C65;   /* Forest mid — earthy, active, outdoors */
  --dog-surface:      #EEF4F0;   /* Pale sage — dog-filtered sections */
  --cat-accent:       #8B5E3C;   /* Warm amber-brown — mysterious, interior */
  --cat-surface:      #F5EDE0;   /* Warm buff — cat-filtered sections */

  /* ── Status / Safety ───────────────────────────── */
  --safe-green:       #2D6A4F;   /* Deep forest variant — safety approved */
  --warn-amber:       #C8860A;   /* Saturated gold — caution, check sizing */
  --danger-red:       #B03030;   /* Muted brick red — safety warning */

  /* ── Hero Dark Mode ────────────────────────────── */
  --hero-bg:          #0F2417;   /* Near-black forest */
  --hero-foreground:  #F0FDF4;   /* Cool white with green tint */
  --hero-muted:       #6B8F71;   /* Desaturated mid-forest */
}
```

### Color Usage Rules

**Do:** Use `--forest` for primary buttons, nav backgrounds, footer. Use `--terracotta` for CTAs, active links, tag chips. Use `--gold` for labels, "Editor's Pick" markers, star ratings, secondary decorative text. Use `--parchment` as the page ground — not white, never white.

**Do not:** Use raw Tailwind color classes (`amber-500`, `gray-200`, `green-700`) anywhere in the codebase. Every color must come from a CSS variable. The current `ProductCard.tsx` and `guides/page.tsx` violate this rule systemically and need to be refactored.

**Dog vs. Cat Differentiation:** Apply pet-type accent as a subtle surface tint and left-border color on filtered cards — never as full background floods. A dog-filtered guide card gets `border-left: 3px solid var(--dog-accent)` and a `background: var(--dog-surface)` chip on the category tag. A cat guide gets `--cat-accent` and `--cat-surface`. This is the total extent of differentiation — enough to be legible, not enough to feel like a different site.

---

## 3. Typography Scale

### Font Assessment: Fraunces + Nunito

**Fraunces (headings):** An excellent choice for this brief. It is a "wonky" optical size serif with ink traps and slight humanist irregularity — it reads as editorial and warm simultaneously, without being generic. The italic is exceptional and should be deployed more aggressively than the current implementation (currently only used in the hero h1).

Critical caveat: Fraunces at weights below 400 at small sizes (under 14px) becomes problematic due to stroke contrast. Do not use it for UI text, captions, or anything under 16px unless it is bold and italic.

**Nunito (body/UI):** Functional but the current implementation undersells it. Nunito is a rounded sans-serif — that roundness is actually thematically appropriate (warm, approachable) but needs to be controlled. At weights 400 and 600, it reads friendly. At 700+ it starts to feel juvenile. Cap heading-style uses at 700 max; prefer 600 for most UI labels.

**The missing piece:** Both fonts currently load only 3 weight variants. Fraunces needs the `opsz` (optical size) axis loaded for the display-size dramatic variant. Load it as a variable font for full control.

### Complete Type Scale

```
Display (Hero h1):
  Font:    Fraunces, variable, opsz 72–144, weight 700, italic for emphasis spans
  Size:    clamp(2.5rem, 6vw, 4.5rem)   [40px → 72px]
  Line-h:  1.05
  Letter:  -0.02em
  Use:     Hero headline only

H1 (Page title):
  Font:    Fraunces, weight 700, normal
  Size:    clamp(1.75rem, 3.5vw, 2.5rem)  [28px → 40px]
  Line-h:  1.15
  Letter:  -0.015em

H2 (Section heading):
  Font:    Fraunces, weight 700, normal
  Size:    clamp(1.25rem, 2.5vw, 1.75rem)  [20px → 28px]
  Line-h:  1.25
  Letter:  -0.01em

H3 (Card title, subhead):
  Font:    Fraunces, weight 400 (NOT 700 — let the serif do the work)
  Size:    1.125rem  [18px]
  Line-h:  1.3

H4 (Section label, widget title):
  Font:    Nunito, weight 700
  Size:    0.875rem  [14px]
  Letter:  0.06em (tracked out)
  Text-t:  uppercase
  Color:   var(--gold)

Body (prose):
  Font:    Nunito, weight 400
  Size:    1rem  [16px]
  Line-h:  1.75
  Color:   var(--ink)

Body secondary:
  Font:    Nunito, weight 400
  Size:    0.9375rem  [15px]
  Line-h:  1.65
  Color:   var(--ink-soft)

Caption / meta:
  Font:    Nunito, weight 600
  Size:    0.75rem  [12px]
  Letter:  0.04em
  Color:   var(--ink-faint)

UI label (tabs, buttons, tags):
  Font:    Nunito, weight 700
  Size:    0.8125rem  [13px]
  Letter:  0.01em

Price (large):
  Font:    Fraunces, weight 700
  Size:    1.5rem  [24px]
  Color:   var(--ink)  — NOT amber. Price is neutral data, not a CTA.

Price (small/inline):
  Font:    Nunito, weight 700
  Size:    1rem
  Color:   var(--ink-soft)

Pull quote / editorial aside:
  Font:    Fraunces, weight 400, italic
  Size:    1.25rem  [20px]
  Line-h:  1.5
  Color:   var(--forest)
  Border:  3px left border, var(--gold)
```

### What Fraunces Cannot Do

Fraunces should never appear at: sizes below 16px outside of bold/italic use, in tables (cells, headers), in navigation links (too heavy at small sizes), in breadcrumbs, in form labels, or in captions. These all use Nunito. The `h1, h2, h3, h4` blanket rule in `globals.css` needs `h4` removed — h4 in UI contexts should use Nunito.

---

## 4. Layout & Grid

### Page Skeleton

```
Max-width: 1280px (outer container, used only for full-bleed sections)
Max-width: 960px  (content container — tighter than typical 1200px for editorial feel)
Max-width: 720px  (prose/article body — readable line length at 16px, ~70 chars)

Horizontal padding: 1.5rem (mobile) → 2rem (tablet) → 3rem (desktop)
```

### Vertical Rhythm

Base unit: `0.5rem` (8px). All spacing increments in multiples of this: 8, 12, 16, 24, 32, 48, 64, 96px. Never use arbitrary values like `py-7` or `mt-5`. Prefer the explicit rhythm: section padding is always `py-16` (64px) on desktop, `py-12` (48px) on mobile.

### Homepage Section Order (Current state → Recommended)

The current structure is sound. Refine:

1. **Hero split** — asymmetric 3fr:2fr. The `🐾` emoji placeholder must be replaced with an actual image component before launch.
2. **This Week's Pick** — keep as `expert-bar` pattern, but elevate the typography contrast.
3. **Browse by Situation** — `parchment-alt` background section, 4-col grid. Replace the `w-8 h-8 rounded-lg` color swatches with proper illustrated spot icons (see Iconography section).
4. **Latest Guides** — the `review-card` left-border pattern is good. Keep.
5. **Browse by Pet** — the icon grid works. Ensure dog/cat icons use pet-specific colors.
6. **Expert Bar** — the Rachel block needs to be a proper component, not an inline section.
7. **Newsletter** — compact forest-bg strip at bottom of every page.

### Guide Page Layout

```
┌─────────────────────────────────────────────────┐
│  Breadcrumb  >  Category  >  Guide Title        │ ← full width, parchment-alt bg
├──────────────────────────┬──────────────────────┤
│                          │                      │
│  Guide body (prose)      │  Sidebar             │
│  max-w: 680px            │  280px               │
│                          │  - Jump-to nav       │
│  - Expert bar (inline)   │  - Price tracker     │
│  - Products (cards)      │  - Rachel mini-bio   │
│  - Comparison table      │  - Related guides    │
│  - FAQ                   │                      │
│                          │                      │
├──────────────────────────┴──────────────────────┤
│  Related guides (full width)                    │
└─────────────────────────────────────────────────┘
```

The current guide pages appear to use a single-column layout. For SEO and user experience, a sticky sidebar with a jump-navigation is a priority upgrade — particularly for the comparison tables where users are simultaneously scrolling and referring back.

### Pet-Type Tab Journey

The two-tier header is the right structure. Enhancement needed:

**Dog owner path:** Lands on `/reviews/dogs` → sees dog-surface (`#EEF4F0`) section tints, forest-mid category badges, guides filtered to dog content. The breadcrumb chip uses `--dog-accent`.

**Cat owner path:** Lands on `/reviews/cats` → sees cat-surface (`#F5EDE0`) section tints, cat-accent (`#8B5E3C`) category badges. The visual shift is subtle but perceptible — enough to feel like "you're in the right place" without feeling like a different site.

The tab system should persist state with a URL param (`?pet=dog`) so filtered states are shareable and bookmark-able.

---

## 5. Component Design Language

### 5a. Product Cards

**The trust problem with the current card:** It uses `bg-white` and `border-gray-200` — completely outside the design system. It has no trust signals beyond a generic "Our Take" callout box. It reads like every other affiliate card on the internet.

**Redesigned card architecture:**

```
┌─────────────────────────────────────┐
│  [Product image — lifestyle shot]   │  ← aspect-ratio: 4/3, object-cover
│  ┌──────────────┐ ┌──────────────┐  │
│  │ Dog Harness  │ │ ✓ Vet Tested │  │  ← category chip (forest bg) + trust chip (gold border)
│  └──────────────┘ └──────────────┘  │
├─────────────────────────────────────┤
│  Product Name  (Fraunces 18px)      │  ← bg: var(--linen)
│  ──────────────────────             │
│  Rachel's Take (italic Fraunces)    │  ← left border var(--gold), terracotta-faint bg
│                                     │
│  ● Safety: ████████░░  8/10         │  ← safety rating bar (forest fill)
│  ● Durability: ██████░░░  6/10      │
│                                     │
│  ✓ Machine washable                 │  ← pro (forest check)
│  ✓ No-pull design                   │
│  ✗ Sizing runs small                │  ← con (ink-faint X, NOT red)
│                                     │
│  Best for: Medium dogs • Pullers    │  ← breed/size chips
│                                     │
│  $34.99  ~~$42.99~~   ▼ $8 off      │  ← price: ink bold, strikethrough ink-faint,
│                                     │     deal chip in terracotta-faint/terracotta text
│  ┌─────────────────────────────┐    │
│  │  View on Amazon  →          │    │  ← CTA: full-width, forest bg, parchment text
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

**Key design decisions on the card:**
- Background is `--linen` (#FAF6EE), not white. On parchment pages this creates subtle layering.
- Border is `1px solid var(--parchment-warm)` — warm, not cool gray.
- No drop shadows on default state. Shadows appear on hover only.
- "Our Take" uses Fraunces italic, not Nunito bold — it is Rachel's voice, not a UI label.
- Safety rating bars are the signature trust element: a simple 10-point bar in forest green, with the score numeric. More credible than stars because it invites explanation.
- The CTA button is forest green on desktop, terracotta on mobile (higher contrast for bright sunlight scanning).
- Cons use `--ink-faint` X marks, not red — red signals danger, not just a tradeoff.

**Featured card (full-width):** The 2-column split layout is correct. Refine: the left column should use `--linen` bg, the image column should be full-bleed with no white gaps, and the "Our Take" callout should use the signature Fraunces italic treatment rather than the current amber box.

### 5b. Pet-Type Tabs

Current state: Pill-shaped tabs in `--ink` background on active. This works. Refinements:

```css
.pet-tab {
  padding: 0.375rem 0.875rem;
  font-size: 0.8125rem;
  font-weight: 700;
  font-family: var(--font-body);
  letter-spacing: 0.01em;
  border-radius: var(--radius-chip);
  border: 1.5px solid transparent;
  color: var(--ink-soft);
  background: transparent;
  transition: background 180ms ease, color 180ms ease, border-color 180ms ease;
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;   /* for icon */
}

.pet-tab:hover {
  background: var(--parchment-warm);
  color: var(--ink);
  border-color: var(--parchment-warm);
}

.pet-tab[data-active="true"] {
  background: var(--forest);
  color: var(--parchment);
  border-color: var(--forest);
}

/* Dog tab active — subtle shift */
.pet-tab[data-pet="dogs"][data-active="true"] {
  background: var(--forest);
  border-color: var(--dog-accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--dog-accent) 20%, transparent);
}

/* Cat tab active */
.pet-tab[data-pet="cats"][data-active="true"] {
  background: var(--cat-accent);
  border-color: var(--cat-accent);
}
```

**Icon treatment:** Each tab gets a Lucide icon (16×16, strokeWidth 1.5). Dogs → `Dog`, Cats → `Cat`, Small Pets → `Rabbit`, Birds → `Bird`, Fish → `Fish`, Outdoor → `Compass`. Icons are present at 14px, muted at inactive state, full opacity at active. Do not use emoji.

**Active indicator:** The pill fill is the active state — no underline, no border-bottom, no separate indicator bar. The pill IS the indicator.

### 5c. Expert Bar

Currently: an `expert-bar` div with Rachel's emoji avatar, name, title, and quote. This needs to become a proper component used in two contexts:

**Inline guide variant (within article body):** Appears once per guide, early in the article, before the first product recommendation.

```
┌──────────────────────────────────────────────────┐
│  [Rachel photo]  Rachel Cooper                   │
│  40×40 circle   Senior Pet Editor                │
│                 Former Vet Tech · 10 yrs         │
│                                                  │
│  "I spent three weeks testing these harnesses    │
│   with Biscuit, my 45-lb Lab mix who pulls       │
│   like he's auditioning for sled racing."        │
│                                                  │
│  Testing method: [3 dogs] [6 weeks] [12 walks]  │  ← stat pills
│  [Medically reviewed by Dr. Jane Walsh, DVM →]  │  ← vet reviewer link (optional)
└──────────────────────────────────────────────────┘
```

**Page footer mini variant:** Compact horizontal strip above the newsletter. Avatar left, credentials center, link right.

**Design specifics:**
- Background: `var(--linen)`, border `1px solid var(--parchment-warm)`, left accent `3px solid var(--gold)`
- Rachel's photo: 40px (inline), 64px (standalone section) — warm border `2px solid var(--gold)`
- Title/credential text: Nunito 600, 12px, `--ink-faint`, tracked 0.05em
- Quote: Fraunces 400 italic, 16px, `--forest` color — this is the most credible element on the card
- Testing stats: small pill chips, `--parchment-alt` bg, Nunito 700, 11px, ink-faint text

### 5d. Size/Breed Selectors

Used in two contexts: filtering a comparison table, and annotating a product card.

**Filter chips (for table/list filtering):**
```
┌─────────────┐ ┌──────────────┐ ┌─────────────────┐
│  Small (0-25lb) │ │  Medium (25-60lb) │ │  Large (60lb+) │
└─────────────┘ └──────────────┘ └─────────────────┘
```
Style: `--parchment-alt` bg, `1px solid var(--parchment-warm)` border, Nunito 700 13px. Active: `--forest` bg, `--parchment` text.

**Product annotation chips (on cards):**
```
Best for: [Medium dogs ×] [Active breeds ×] [Apartments ×]
```
Style: Smaller, `--forest-faint` bg, `--forest` text, 11px Nunito 600. Not interactive — display-only.

**Breed display:** When specific breeds are called out, format as: `Great for: Labs, Goldens, GSDs`. Nunito 12px, `--ink-soft`. Never use checkboxes or dropdowns for breed selection in the current scope — text chips are sufficient.

### 5e. Safety Warnings

Three tiers, each with a distinct visual treatment:

**Tier 1 — Safety Info (neutral):**
```
┌──────────────────────────────────────────────────────────┐
│  ⓘ  Check sizing: This harness runs small. Order one   │
│     size up from your dog's measured chest girth.       │
└──────────────────────────────────────────────────────────┘
```
Style: `--forest-faint` bg, `2px left border var(--forest)`, Nunito 400 14px. Icon: Lucide `Info`, 16px, `--forest`.

**Tier 2 — Caution (safety-adjacent):**
```
┌──────────────────────────────────────────────────────────┐
│  △  Supervision required: Puzzle feeders can cause      │
│     resource guarding in multi-dog households.          │
└──────────────────────────────────────────────────────────┘
```
Style: `--gold-faint` bg, `2px left border var(--gold-dark)`, Nunito 400 14px. Icon: Lucide `AlertTriangle`, 16px, `--gold-dark`.

**Tier 3 — Warning (genuine safety concern):**
```
┌──────────────────────────────────────────────────────────┐
│  ⚠  Safety concern: Several users reported the clasp   │
│     releasing under sustained pressure. Not recommended │
│     for escape artists or strong pullers.               │
└──────────────────────────────────────────────────────────┘
```
Style: `--terracotta-faint` bg, `3px left border var(--terracotta)`, Nunito 700 14px for first sentence, 400 for body. Icon: Lucide `AlertOctagon`, 16px, `--terracotta`.

**Placement rule:** Safety callouts always appear directly below the product name, before pros/cons. They cannot be buried.

### 5f. Price Display

Live Amazon pricing adds temporal complexity. The system needs to communicate three states:

**State 1 — Current price (no comparison):**
```
$34.99
```
Fraunces 700, 24px (featured card), 18px (regular card), `--ink` color. Price is neutral data, not a promotional color.

**State 2 — Price drop (current < was):**
```
$34.99   ~~$42.99~~   🏷 $8 off today
```
Current price: Fraunces 700, 24px, `--ink`.
Original price: Nunito 400, 14px, `--ink-faint`, strikethrough.
Deal chip: `--terracotta-faint` bg, `--terracotta` text, Nunito 700 11px. Icon: Lucide `Tag`, 12px.

**State 3 — Price increase alert (current > expected):**
```
$48.99   ↑ Up from $34.99 at last check
```
Current price: Fraunces 700, 24px, `--ink`.
Alert text: Nunito 400, 12px, `--warn-amber`. Icon: Lucide `TrendingUp`, 12px.

**State 4 — Out of stock:**
```
Currently unavailable on Amazon
[Check back] [View alternatives →]
```
Price area replaced with `--ink-faint` text, Nunito 400 14px. Two ghost buttons: `--parchment-warm` bg.

**Price freshness indicator:** "Updated 2 hours ago" in Nunito 400 11px `--ink-faint` beneath the price. Cron-based refresh should show recency — live pricing that shows no timestamp is untrustworthy.

**Do not:** Use `--gold` or `--terracotta` as the primary price color. Price is information, not persuasion. The terracotta only appears on savings deltas.

### 5g. Comparison Tables

Pet product comparisons require dimensions that generic comparison tables ignore. Required columns for dog harnesses as an example:

```
Product | Price | Weight range | Girth range | Material | Safety | Washable | Our rating
```

**Visual design:**
- Table container: `--linen` bg, `border: 1px solid var(--parchment-warm)`, `border-radius: 12px`, overflow-hidden
- Header row: `--parchment-alt` bg, Nunito 700 12px, tracked 0.05em uppercase, `--ink-soft` color
- Data cells: Nunito 400 14px, `--ink`
- Alternating rows: even rows `--parchment` (not white), odd rows `--linen`
- The `Our rating` column uses the safety-bar widget (small, 60px wide), not stars
- Sticky first column on mobile: product name stays visible while scrolling horizontally
- "Best pick" row: `2px solid var(--forest)` full border, `--forest-faint` bg on that row, small "Rachel's Pick" chip in header cell

**Mobile:** The table must be horizontally scrollable with momentum scroll on iOS. Pin the product name column. Add a "Compare" CTA above the table on mobile that scrolls to it.

**Column sort:** Clicking a column header sorts the table. Visual indicator: Lucide `ChevronUp`/`ChevronDown`, 12px, `--forest`. This requires client component.

### 5h. Image Treatment

**Lifestyle over product shots — but both have a place:**

- **Hero images:** Real pets using the product in a believable home environment. Not white-background product photography. Not stock photo humans smiling. The composition should be pet-forward with product visible but not perfectly centered.
- **Product card thumbnail:** Accept that Amazon images are white-background product shots. Do not fight this — present them cleanly on `--linen` background with an `object-contain` (not `object-cover`) for product-only images, `object-cover` for lifestyle shots.
- **Guide hero:** Wide landscape, lifestyle. A dog genuinely pulling on a harness (not posed). Motion blur on the dog acceptable and preferred — it communicates energy.
- **Author photo:** Rachel with her own pets preferred. Warm, indoor, editorial — not a corporate headshot.

**Image corner radius:** 8px for product images within cards. 0px for full-bleed images. 12px for standalone lifestyle images in editorial sections.

**Alt text standard:** Descriptive and specific: "Golden Retriever wearing the Ruffwear Front Range harness on a forest trail, back-clip attachment visible." Not: "dog in harness."

---

## 6. Trust Signals

### The Hierarchy of Trust (Most to Least Credible)

1. **Specific personal experience** ("After six weeks of daily use with my 45-lb Lab") — this is Rachel's voice in the guide intro. The most credible. No visual treatment needed — the specif