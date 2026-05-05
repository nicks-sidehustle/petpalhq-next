# PetPalHQ v2 — Execution Brief

**Status:** Ready to execute pending two preconditions.
**Owner:** Nick Miles
**Drafted:** 2026-05-04 (carries forward decisions from this session so context isn't load-bearing)

> **Update 2026-05-05 — folder consolidation.** Four sibling folders (`petpalhq-next/`, `petpalhq-next-legacy/`, `petpalhq-design/`, `petpalhq-pipeline/`) plus this brief have been consolidated into a single project root. New layout:
> - **Active root:** `/Users/mm2/sites/petpalhq-next/` (this folder)
> - **Research source (was `petpalhq-pipeline/research/`):** `./docs/research/`
> - **Design wireframes + decisions:** `./docs/design/wireframes/` and `./docs/design/DECISIONS.md`
> - **Quarantined v1 (was `petpalhq-next-legacy/`):** `/Users/mm2/sites/_archive/petpalhq-v1/`
>
> References below to `petpalhq-pipeline/` and `petpalhq-next-legacy/` describe historical state; current paths are above.

---

## TL;DR

Clone `nicks-sidehustle/smarthome-explorer-blog` (SHE — the master template), swap branding + content + identity for **PetPalHQ** focused on **exotic pets starting with reptile / fish / birds**. No new platform code. Use existing network identity (Nick Miles, Chief Editor; `nicks.sidehustle.2024@gmail.com`). Domain `petpalhq.com` is retained.

The previous attempt (Loyal & Found rebrand of original petpalhq) is being shelved as `petpalhq-next-legacy/` — nothing in it carries forward. Subject matter (dogs/cats), brand (L&F), and editorial persona (Rachel Cooper) are all wrong for the new direction.

---

## Preconditions (DO NOT proceed until both are true)

1. **SHE cleanup is finished.** Nick has been cleaning `smarthome-explorer-blog` of legacy processes/drafts in dedicated sessions. Concurrent writes from a parallel petpal session will cause merge conflicts. Confirm with Nick before any `git clone` of SHE.

2. **Nick has greenlit the directory move.** The plan is option (a) from this session: rename `petpalhq-next/` → `petpalhq-next-legacy/`, then clone SHE into a fresh `petpalhq-next/`. This is non-destructive and reversible, but it's still a directory rename — confirm before doing it.

---

## Execution sequence

### Phase 0 — Preserve and quarantine legacy

```bash
cd /Users/mm2/sites/petpalhq-next
# Stash the 8 uncommitted modified files so they're recoverable
git stash push -u -m "petpal v1 final wip — abandoned for v2 SHE-clone strategy"
# Rename the legacy dir
cd /Users/mm2/sites
mv petpalhq-next petpalhq-next-legacy
```

The remote (`origin = github.com/nicks-sidehustle/petpalhq-next.git`) stays attached to the legacy dir. The fresh SHE clone will need its remote re-pointed to the same repo so we keep the GitHub URL.

### Phase 1 — Clone SHE as the new petpalhq-next

```bash
cd /Users/mm2/sites
git clone https://github.com/nicks-sidehustle/smarthome-explorer-blog.git petpalhq-next
cd petpalhq-next
# Re-point remote at the petpal GitHub repo
git remote set-url origin https://github.com/nicks-sidehustle/petpalhq-next.git
# Force-push? NO. Branch off and PR or replace deliberately. Confirm with Nick.
```

**Open question for Nick at this step:** the GitHub repo `nicks-sidehustle/petpalhq-next` already has the v1 history (last commit `c67ff46` Apr 16). Does v2 want a clean main (force-push, abandon v1 history), a merged main (preserve v1 history with a new direction commit), or a fresh repo entirely (`petpalhq-next-v2`)? Don't push until Nick decides.

### Phase 2 — Per-site swap surface (the only files that change vs. SHE)

| File | Change |
|---|---|
| `src/config/site.ts` | name=`PetPalHQ`, domain=`petpalhq.com`, tagline=TBD, palette=TBD (see Brand decisions below) |
| `EDITORIAL-IDENTITY.md` | Rewrite for exotic pets vertical, "Nick Miles Chief Editor" persona |
| `DESIGN-IDENTITY.md` | Rewrite for petpal palette + visual direction (or copy SHE's structure and re-skin) |
| `PIPELINE-CONFIG.md` | Set vertical-specific keyword classes, AOV bands, source domains for reptile/fish/bird research |
| `package.json` | Set `name` field to `petpalhq-next` |
| `public/` favicon, OG image, logo | Regenerate using `npm run generate:logo` (script exists in SHE) |
| `src/content/guides/*.md` | Delete SHE's guide content; populate fresh from Nick's ChatGPT research |
| `vendor/omc-*.tgz` | Keep as-is — shared network infrastructure |
| All other source code | DO NOT MODIFY — that's the platform spine |

### Phase 3 — Content load (research already staged; this session executes)

Research is at **`./docs/research/`** (was `/Users/mm2/sites/petpalhq-pipeline/research/` before the 2026-05-05 consolidation) — see `README.md` there for the full index. 9 deep-research reports across aquarium (6), reptile (2), and birds (1), plus 6 ChatGPT-generated images for visual reference. Each report is structured around editorial-hub angles with product picks and expert-source backing. **DO NOT fabricate** — pull product picks, source counts, and editorial framing only from these reports.

Each guide goes into `src/content/guides/<slug>.md` following the SHE markdown frontmatter schema (which we'll learn from the existing SHE guides — same three-tier `tiers: { budget, sweetSpot, splurge }` structure as v1 petpal used).

**Recommended sequencing** (per `research/README.md`):
1. **Aquarium first** — has the most research weight (6 reports) and a pre-baked hub-and-spoke structure. Ship hub pages (water-quality, filtration) first, then spokes.
2. **Reptile second** — 2 hub-framed reports; needs a species-spoke decision (bearded dragon, leopard gecko, ball python, crested gecko) before product guides.
3. **Birds last** — note that this report is **backyard birdwatching gear**, not pet birds (parrot/cage). Distinct submarket. Don't conflate.

First guides should target high-AOV exotic-pet categories. Likely candidates (Nick to confirm or override from his research):
- Reptile: heat lamps + UVB lighting setups, bioactive vivariums, large terrariums
- Fish: planted aquarium kits, canister filters, full reef-tank starter kits
- Birds: large parrot cages, automatic feeders, training/enrichment setups

These are notable because: AOV $200-1500, niche enough that Wirecutter/Strategist don't dominate the SERP, expert synthesis is genuinely valuable (wrong gear can kill these animals fast — high-trust query class).

### Phase 4 — Deploy

Vercel auto-deploys on push to main of `nicks-sidehustle/petpalhq-next`. The existing Vercel project should carry over since the repo URL is unchanged. Verify:
- Vercel project still linked to the repo
- Domain `petpalhq.com` still routed to the project
- Environment variables intact (especially `NEXT_PUBLIC_GA_MEASUREMENT_ID`, Amazon Associates tag, any Resend/email config)

If Vercel has v1 build artifacts cached, force a fresh build.

---

## Brand decisions (locked this session)

| Decision | Value |
|---|---|
| Display brand name | **PetPalHQ** (not Loyal & Found — that pivot is shelved) |
| Domain | `petpalhq.com` |
| Editorial persona | **Nick Miles, Chief Editor** (network-wide; no site-specific personas) |
| Git author | `Nick Miles <nicks.sidehustle.2024@gmail.com>` |
| Voice | First-person plural "we" (matches SHE pattern) |
| Subject vertical | Exotic pets — start reptile / fish / birds, expand from there |
| Monetization | Amazon Associates tag `petpalhq-20` (verify still active) |
| Three-tier framework | Inherit from SHE template if SHE uses it; else adopt explicitly |
| Tagline | TBD — Nick to decide. Avoid "tested" claims (FTC scrutiny on hands-on testing assertions for synthesis-driven sites). Lean toward "expert consensus" framing. |

---

## What's NOT carrying over from petpalhq-next-legacy

For the audit trail / sanity check:

- **L&F brand identity** (Loyal & Found wordmark, Tomato ampersand, "thoughtfully tested" tagline) — pivoted away from
- **Rachel Cooper persona** (Senior Pet Editor, former vet tech) — replaced by Nick Miles, Chief Editor
- **Dog/cat-focused consensus data** (`src/lib/content/consensus-data.ts` — 25 products) — wrong subject matter
- **6 dog/cat guides** in `src/content/guides/` — wrong subject matter
- **Paw Score** as named — SHE template's own scoring system carries over instead (whatever that is); if SHE doesn't have one, we may re-implement from `/Users/mm2/sites/_archive/petpalhq-v1/src/lib/paw-score.ts` as it's a clean, standalone module
- **PORT_PHASE_2_FINISH.md plan** in `.claude/plans/` — completed and obsolete
- **`loyalfound-redesign-prd.md`** in `.claude/docs/` — pivoted away from

---

## Carryover candidates (worth a second look before discarding)

If SHE template is missing any of these, they may be worth porting from legacy:
- `src/lib/paw-score.ts` — standalone scoring module, vertical-agnostic
- `src/components/LastVerified.tsx` — machine-readable freshness stamp
- The vendored `vendor/omc-*.tgz` versions in legacy may be older than what SHE has — use SHE's

---

## Coordination protocol

- **Before any work in this brief:** Nick must confirm SHE cleanup is finished.
- **Before any `mv petpalhq-next petpalhq-next-legacy`:** Nick must greenlight (it's reversible but visible).
- **Before any push to `nicks-sidehustle/petpalhq-next`:** Nick must decide repo strategy (force-push v2 main, merged history, or fresh repo).
- **Content arrives from Nick:** when his ChatGPT research is ready. Don't fabricate content; load only from his source material.

---

## What this brief intentionally does NOT decide

- Final palette and visual direction (downstream of SHE template — see what SHE looks like first, then decide what to keep vs. reskin)
- Specific guide topics and AOV targets (Nick's ChatGPT research will determine)
- Newsletter / email list strategy
- Cross-link structure with the rest of the network (handle in a follow-up after v2 ships)
- Whether to migrate existing search/index registrations or treat as a soft relaunch

These are deferred deliberately — locking them now would constrain choices we don't need to make yet.
