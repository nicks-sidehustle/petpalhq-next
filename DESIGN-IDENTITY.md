# PetPalHQ — Design Identity Document

**Visual system v2.0 — relaunched 2026-05-04**

---

## 1. Design Philosophy

### Core Premise

PetPalHQ is the visual equivalent of a **field guide on a quiet bookshelf**. Not a pet store — pet stores are loud, primary-color, novelty-driven. Not a vet's office either — clinical and cold. Closer to *Sibley's Bird Guide*, the Audubon field guides, or Cornell Lab of Ornithology's print materials: **earnest, observation-driven, scientific-but-warm.**

The operative question for every design decision: *Would this appear in a Cornell Lab field guide, or in a PetSmart promotional flyer?* Every color choice, spacing decision, and type selection should answer correctly.

### The Sophistication Problem

Pet content has a binary failure mode: **cartoonish** (paw prints, comic sans, primary blue/red, "best fluffy buddy" listicle voice) or **clinical sterile** (overcorrecting with all-white-and-grey, lifeless, "consult your veterinarian" energy). PetPalHQ threads this by treating pet keeping as a *natural-history* story — the patina of well-loved aquarium glass, the light filtering through a UVB-lit terrarium, the patience of someone watching a feeder for an hour.

The aesthetic is **earned warmth**, not performed cuteness. Living things deserve thoughtful presentation.

### Guiding Tension

**Sophisticated but warm. Authoritative but accessible. Editorial but actionable.** This is not a personal pet blog. It's a trusted advisor who actually read the research, with the visual gravity to match.

---

## 2. Color System

### Working Palette (v2 — locked from logo direction 2026-05-04)

The palette is drawn directly from the approved PetPalHQ logo. The logo intentionally shows **all four animal verticals at once** (dog, cat, parrot, fish, gecko), which gives us a five-color brand system where each color does specific editorial work:

```css
/* Brand — sourced from logo */
--color-navy:        #1e3a6e;   /* Primary — "PetPal" wordmark, dog silhouette, anchor color */
--color-navy-deep:   #13284e;   /* Hover/pressed states, deep emphasis */
--color-teal:        #2db8c5;   /* Secondary — "HQ" wordmark, cat/parrot/fish silhouettes, aquatic+avian content */
--color-teal-deep:   #1e8a96;   /* Hover/pressed for teal CTAs */
--color-green:       #4caf50;   /* Tertiary — gecko silhouette, reptile vertical, planted-tank highlights */
--color-green-deep:  #357a38;   /* Hover/pressed for green CTAs */
--color-coral:       #f29c3a;   /* Accent — paw print, heart, primary CTAs, score-bar highs, attention pulls */
--color-coral-deep:  #d97f1d;   /* Hover/pressed for coral CTAs */
--color-cream:       #fdfaf3;   /* Background — warm off-white body */
--color-cream-deep:  #f7eedd;   /* Section backgrounds, subtle separators */
--color-ink:         #1a2440;   /* Body text — deep navy-black, harmonizes with primary navy */
--color-slate:       #4a5570;   /* Secondary text, captions, muted UI */
```

### Color Roles by Editorial Use

The logo encodes a vertical-to-color mapping that should flow into the site's information architecture:

| Color | Vertical / Role | Where to use it |
|---|---|---|
| **Navy** | Primary brand, dog/cat-adjacent (when those expand) | Wordmark, headings, primary CTAs, navigation |
| **Teal** | Aquarium + bird (aquatic and avian; the "wet/feathered" verticals) | Aquarium category color, bird category color, secondary CTAs |
| **Green** | Reptile vertical specifically | Reptile category color, planted-aquarium accents, "alive" indicators |
| **Coral** | Universal attention pull, the "heart" of the brand | Primary CTAs, score-bar highs (scores ≥ 8.5), affiliate links, key callouts |
| **Cream** | Background, breathing room | Body backgrounds, card surfaces, never pure white |

Inherited from the SHE/christmasgearhq design system (some tokens may be repurposed):

```css
/* Inherited utility tokens — keep until refactored */
--color-parchment:        hsl(38, 45%, 92%);    /* #F5ECE0 — section backgrounds */
--color-parchment-dark:   hsl(38, 35%, 86%);    /* dividers, score bar tracks */
--color-linen:            hsl(36, 35%, 86%);    /* #E8D9C8 — borders */
--color-evergreen:        hsl(150, 46%, 22%);   /* still in use by ScoreCard component */
--color-antique-gold:     hsl(42, 62%, 48%);    /* still in use by ScoreCard component */
--color-cranberry:        hsl(354, 68%, 34%);   /* still referenced by ScoreCard component */
```

> **Note:** `globals.css` still holds the christmas-era token names (cranberry, evergreen, antique-gold) because the `PetPalScoreCard` component references them. Final design pass will rename these to pet-vertical-native tokens (e.g., `--color-coral-warning`, `--color-sage-primary`, `--color-honey-accent`) and update `globals.css` + component CSS-var references in lockstep.

### What the Palette Should Evoke

- **Navy** — authority, depth, the ink of a field guide. Anchors the wordmark and gives the site editorial gravity (think Wirecutter, The Strategist) rather than cartoon-pet-store energy.
- **Teal** — fresh water, healthy aquariums, the iridescence of bird plumage. Both "wet" and "winged" — the aquatic and avian verticals share this color, and it works for both.
- **Green** — leaf, gecko skin, planted vivarium foliage. Reptile-vertical specific. Distinct from the teal so reptile content reads as its own thing rather than blending into aquarium.
- **Coral / warm orange** — the warm glow of UVB lamps, the heart of the logo, the attention-pull color. Reserved for CTAs, score-bar highs, and "this is the point" moments.
- **Cream** — paper of a field guide, eggshell. The unfussy backdrop that lets product imagery and content breathe. Never pure white.
- **Deep ink** — readable, warm, harmonizes with the navy primary rather than fighting it like a dead-grey would.

### What to Avoid

- Tropical-fish neon (electric blue + magenta + lime) — reads as cartoon
- Vet-clinic teal + white — clinical, cold (we use teal as an accent color, not as the primary surface)
- Pet-store primary red + green + yellow — playground energy
- Pure black (#000) — too harsh; use ink (#1a2440) for body text
- Pure white (#fff) — use cream (#fdfaf3) for body backgrounds, white sparingly for cards
- Sage / forest green — earlier provisional palette, replaced by navy-led system

---

## 3. Typography

### Inherited from SHE pattern (review and refine as design pass continues)

The platform inherits whatever the SHE-pattern globals.css defines. As of v2 launch:

- **Heading font:** `var(--font-heading)` — currently Playfair Display (christmas's choice). May refine to a more field-guide-appropriate serif (e.g., Source Serif Pro, Spectral, or Lora) in a follow-up design pass.
- **Body font:** `var(--font-sans)` — currently Nunito (christmas's choice). Likely keep for v2 — friendly without being cute.
- **Editorial body:** `var(--font-editorial)` — for long-form prose in guides.

### Type Hierarchy

- **H1 (page titles):** Heading font, weight 600-700, generous size (40-56px on desktop)
- **H2 (section heads):** Heading font, weight 500-600, 28-36px
- **H3 (subsections):** Sans, weight 600, 20-24px — break the rhythm with sans
- **Body:** Editorial or sans, 16-18px, 1.6-1.7 line height
- **Small/captions:** Sans, 12-14px, muted color

### Editorial Conventions

- Italics for species names (*Pogona vitticeps*, *Carassius auratus*)
- Bold sparingly — only for product names within prose, or for emphasis on safety-critical points
- Pull quotes use heading font, oversized, with quote mark as a styled glyph
- Footnote/caveat text uses smaller sans, muted color, never red/yellow alarm coloring

---

## 4. Layout & Spacing

### Container widths (inherited from SHE pattern)

```css
--container-reading: 720px;   /* article body */
--container-layout:  900px;   /* section widths */
--container-wide:    1200px;  /* full-bleed sections */
```

Reading column width (720px) is the priority. Long-form pet content rewards a clean reading column — guides run 2,000-5,000 words. Don't widen for the sake of filling viewport.

### Spacing scale

Inherit Tailwind's default 4px-base scale. Generous vertical rhythm between sections (96-128px desktop, 64-80px mobile).

---

## 5. Component Patterns

The SHE-pattern component library is inherited:

- **`PetPalScoreCard`** — proprietary 5-pillar Gear Score with subscore bars (Expert Consensus 30 / Effectiveness 25 / Animal Safety 20 / Durability 15 / Value 10)
- **`ConsensusReviewCard`** — full product card with rank badge, image, score, verdict, expert quotes
- **`ComparisonTable`** — Quick Picks table with score circles and verdicts
- **`GuideHero`** — guide page hero with title, source count, last verified date
- **`GuideToc`** — section navigation
- **`MethodologyBox`** — collapsible "How We Score" callout
- **`QuickAnswer`** — TL;DR top-of-guide answer block
- **`RelatedGuideShelf`** — bottom-of-guide cross-link shelf
- **`AffiliateLink`** — wraps affiliate CTAs with disclosure microcopy
- **`AffiliateDisclosure`** — full-paragraph disclosure block

These components are **shared platform code** — do not fork them per-site. Site identity flows through `siteConfig` and CSS variables.

### Component-specific brand notes

- **`PetPalScoreCard`** — currently uses inherited christmas-era CSS color refs (evergreen, antique-gold, cranberry). Rename in design pass.
- **Score circle colors** — high score = sage/forest, mid score = honey, low score = warning-red (TBD pet-friendly red token, NOT cranberry which reads as christmas).

---

## 6. Imagery

### Hero / guide imagery

Lean toward:
- Natural light, unstaged
- Animal in habitat (not posing for camera)
- Equipment in use (filter running, UVB on, feeder visited by bird) rather than packshots
- Field-guide energy: educational over advertising

Avoid:
- Stock photo "happy family with golden retriever" energy
- Manufacturer marketing imagery (use sparingly, attribute clearly)
- Anthropomorphic pet imagery (pets in costumes, in human poses)

### Product imagery

- Default: Amazon product image (highest-quality available)
- Fallback: Unsplash for category illustrations
- Aspirational future: original product photography (defer to post-launch)

### Logo

- Static SVG at `public/logo.svg`
- Wordmark or simple icon — TBD post-image-review of ChatGPT generation candidates
- Favicon at `public/favicon.png` and `public/favicon.svg`
- OG image regenerated to PetPalHQ branding via `public/opengraph-image.tsx`

---

## 7. Accessibility

- All interactive elements ≥ 44×44px tap target
- Color contrast minimum WCAG AA (4.5:1 body text, 3:1 large text)
- Score bars and verdicts must convey meaning beyond color alone (label always present)
- Image alt text on every product image — describe what's shown, not generic "product"
- Focus rings visible on all keyboard-navigable elements
- No autoplay video, no aggressive popups during read

---

## 8. Dark Mode

Deferred. Inherit whatever the SHE pattern defines (currently no formal dark mode). Add later if user demand emerges.

---

## 9. What's NOT a Design Decision

These are flagged for the next design pass, not blocking v2 launch:

- [ ] Final color token rename (christmas-era cranberry/evergreen/antique-gold → pet-native sage/honey/coral)
- [ ] Final logo + wordmark
- [ ] Heading font final pick (Playfair vs alternatives)
- [ ] Final hero illustrations / category icons (currently emoji placeholders)
- [ ] Author photo (Nick Miles)
- [ ] Original product photography (deferred to post-launch)

---

## 10. Versioning

This document defines the visual identity for PetPalHQ v2 (relaunched 2026-05-04). The first iteration intentionally inherits much of the SHE pattern unchanged — substituting only what's necessary for a clean launch. A follow-up design pass will refine pet-native tokens, typography, and imagery once the site has shipping content and we can iterate against real pages rather than abstract specs.
