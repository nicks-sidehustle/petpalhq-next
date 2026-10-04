# Promo Video Kit

Beat-synced vertical (1080×1920) product countdown videos for social. One Remotion template; the same engine lives in the DeskGearHQ, ChristmasGearHQ, PetPalHQ and SmartHomeExplorer repos, each with its own brand data. Original synthesized music, so there is nothing to license.

## Structure (in beats, see `src/timeline.ts`)

| Section | Beats | What happens |
|---|---|---|
| Hook | 4 | Hero image, kicker pill, two-line headline, sub types on |
| Each pick (#N … #2) | 5 | Rank slam, then card: name types on, badge stamps, score counts up, one line + meta/price |
| Pre-drop | 2 | Words land one by one, then a quarter beat of silence |
| #1 | 6 | Bigger slam + burst, TOP PICK card |
| End | 5 | Wordmark/logo, CTA, URL, method line, Amazon disclosure |

Length = (4 + 5×(picks−1) + 2 + 6 + 5) beats at the brand's BPM. 3 picks ≈ 13–15 s, 4 picks ≈ 16 s.

## Make a new video

Setup once: `npm install` in this folder (Node 18+; Python 3 with numpy + scipy for the music).

1. Copy `data/pet.json` to e.g. `data/my-video.json`. Edit the hook, the picks (2 to 5) and the end card. Every number must come from the site's own data files.
2. Product photos: use the Amazon image URL the site already stores (`m.media-amazon.com/images/I/...`), or a path under `public/`. Download remote ones first:
   `node scripts/fetch-images.mjs data/my-video.json`
3. Music for that exact item count and tempo:
   `python3 music/make_music.py data/my-video.json public/music/my-video.wav`, then set `"music": "music/my-video.wav"` in the JSON.
4. Preview: `npx remotion studio src/index.ts`. Render:
   `npx remotion render src/index.ts PetPalHQ out/my-video.mp4 --props=data/my-video.json`

`out/`, `public/cache/` and `node_modules/` are gitignored. This folder is excluded from the site's `tsconfig.json` and ESLint, so it never touches the site build.

## Copy rules built in

- Prices only show when `priceChecked` is within 14 days of `today` (`priceMaxAgeDays` overrides). Shown as "$X · checked Mon D".
- Each site bans hype and testing claims: no "game-changer", "must-have", "BUY NOW", "we tested", "hands-on". Use "we compared / aggregated / scored".
- Badges are always qualified ("Best Overall", "Best Budget").
- The end card always carries the method line and "As an Amazon Associate we earn from qualifying purchases."
- SmartHomeExplorer: no prices captured inside deal windows (see that repo's `data/deal-windows.json`).

## Brand themes (`src/brands.ts`)

| Brand | Look | Type | Music |
|---|---|---|---|
| DeskGearHQ | Warm charcoal, amber lamp glow, film grain, amber light-ray bursts | DM Serif Display + Inter | 118 BPM lo-fi house, Rhodes, vinyl crackle, mechanical key clicks |
| ChristmasGearHQ | Evergreen, cream, gold foil, falling snow, gold sparkle bursts | Playfair Display + Nunito | 124 BPM swing pop, glockenspiel, sleigh bells, bell dings |
| PetPalHQ | Cream field-guide card, navy ink, drifting paw prints, paw bursts | Source Serif 4 + Inter | 112 BPM bouncy marimba, woodblock, boops |
| SmartHomeExplorer | Dark teal UI grid, scan line, HUD brackets, ring pulses | DM Serif Display + Geist | 122 BPM synth arps, UI blips |

## Quick start for this site

```
cd promo-video-kit
npm install
npm run render      # sample: out/PetPalHQ-promo.mp4
```
