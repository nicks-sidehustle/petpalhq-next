---
name: petpal-demand-gate
description: Demand-validate new PetPalHQ guide topics (CLAUDE.md §9 hard gate) from a fresh Bing Webmaster Tools AI Performance 7-day pull read in the owner's Chrome, then check cannibalization and return BUILD / REFRESH-INSTEAD / INSUFFICIENT DATA per topic. Use before cp-pp-strategy or petpal-candidate-research, and whenever someone asks for new guides, trending topics, "what should we write", "demand gate", "demand validation", "BWT pull", or "AI Performance".
---

# PetPal demand gate

CLAUDE.md §9 (owner 2026-09-24, hard gate): a new guide needs demand validated over the **trailing two weeks** and must not cannibalize an existing guide. This skill is how to meet that gate. Built 2026-09-26 from the method behind #183/#185 and the 09-26 pull.

## 0. Freshness first
- Look for an existing receipt: `.omc/receipts/BWT-7D-AI-PERFORMANCE-*.md` (local) and `~/affiliate-site-template/programs/**/receipts-petpal-*/BWT-*`.
- A receipt counts only if its window, read off the pane, falls inside the trailing 14 days. State its age. If none qualifies, pull fresh (step 1). Never reuse an older window as current.
- The 7 D pane only covers ~6 dated days, so a full trailing-14-day read needs two pulls about a week apart (keep both receipts). The owner may approve a topic on one pull; say which window you have.
- Don't use `AIPageStatsReport` CSV exports: they have no date column, and two same-day exports disagreed 8x (09-13 receipt). `~/Downloads` is not readable from the sandbox anyway.

## 1. Pull (owner's logged-in Chrome, read-only)
Reading the dashboard needs the owner's OK in this session. Touch no settings and download nothing.
1. `tabs_context_mcp` (createIfEmpty), navigate to `https://www.bing.com/webmasters/aiperformance?siteUrl=https://www.petpalhq.com/`.
2. The pane opens on **3 M**. Use `find` "7 D time range button" and click it by `ref` (coordinate clicks missed). Wait 3s, then confirm the dated columns show the last ~6 days.
3. `get_page_text` once to capture the headline: total citations, average cited pages, per-day totals and query count.
4. Page through **every** grounding-query row with page JS. The rows-per-page change to 100 did not apply, and `get_page_text` / `find` truncate or drop the numbers:
   ```js
   const rows=[]; const grab=()=>[...document.querySelectorAll('[role=row]')].map(r=>r.innerText.replace(/\s*\n\s*/g,' | ').trim()).filter(t=>/%/.test(t));
   for(let i=0;i<40;i++){ const g=grab(); const first=g[0]; rows.push(...g); const nb=document.querySelector('button[aria-label="Go to next Page"]'); if(!nb||nb.disabled||nb.getAttribute('aria-disabled')==='true') break; nb.click(); let t=0; while(t<40){ await new Promise(r=>setTimeout(r,250)); const n=grab(); if(n.length&&n[0]!==first) break; t++; } }
   window.__c=rows.map(r=>{const p=r.split(' | ');return p[0]+'\t'+p[3]+'\t'+p[4]}); window.__c.length
   ```
   The count must equal the pane's "N results found".
5. Tool output truncates at roughly 1,000 characters, so query **by cluster** instead of dumping everything:
   ```js
   const f=re=>window.__c.filter(r=>re.test(r.split('\t')[0])).map(r=>r.replace(/\t/g,' ')).join('; ');
   f(/groom|dryer|clipper/i)
   ```
   Cluster totals: `window.__c.filter(...).reduce((s,r)=>s+(+r.split('\t')[1]||0),0)`. Values like "1.2K" need converting before summing.
6. Close the tab.

## 2. Receipt
Write `.omc/receipts/BWT-7D-AI-PERFORMANCE-<YYYY-MM-DD>.md` with:
- who pulled it and how, the property, and the window read off the pane
- the headline figures and per-day totals
- the top ~15 queries (cites · share)
- a cluster table: queries, cites and key rows for every candidate topic, **including clusters that returned 0**

Every number must come from the pane. Mark anything not read as UNVERIFIED. Template: `.omc/receipts/BWT-7D-AI-PERFORMANCE-2026-09-26.md`.

## 3. Verdict per topic
Working heuristics (from #183/#185 and the 09-26 pull; the owner can tighten them):
- **Demand present:** the topic's own intent shows up in the window, meaning a query that asks for *that product type*, not just a neighbouring cluster. Rough bar: ≥1 query with ≥20 cites, or a cluster ≥50 cites whose queries match the guide's intent.
- **Headroom:** a citation share under ~25% on those queries means room to win. Over ~40% means we already own it; prefer refreshing.
- **Neighbour-only demand is INSUFFICIENT DATA.** 09-26 examples:
  - A strong odor cluster made up only of enzyme-cleaner queries does not validate a floor-cleaner guide.
  - An aquarium cluster of test kits and pumps does not validate a tank-kit guide.
- **Cannibalization:** `ls src/content/guides` plus grep titles and shortAnswers for the product type. If an existing guide serves the intent → **REFRESH-INSTEAD**, naming the slug.
  - 09-26: "prevent cat from stealing food" (120 · 12%) → `best-smart-pet-feeders-multi-pet-2026`; catio (~281) → `best-catio-outdoor-cat-enclosures-2026`.
- Output a table: topic · proposed slug · evidence rows (query, cites, share, window) · nearest guides · verdict (BUILD / REFRESH-INSTEAD / INSUFFICIENT DATA).

## 4. Owner approval
The gate result goes to the owner before cp-pp-strategy locks a topic. Put the verdict table first, then at most 3 questions. INSUFFICIENT DATA is a valid outcome; never stretch neighbour demand into a BUILD.

## Lessons
- 09-13: AIPageStatsReport CSVs are cumulative and undated, so they can't be used as a 7-day validator.
- 09-26: rows-per-page did not apply; paging with JS did. `find` returns row names but not the numbers. Coordinate clicks on the range tabs missed; click by `ref`.
- Seasonal or gift topics with no query rows are timing bets, not demand-validated. Label them that way.
