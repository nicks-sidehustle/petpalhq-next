# LAW-LOCAL — petpalhq-next

**Scope:** shipping content in THIS repo. **Stamped:** 2026-09-14.
Sources: Archo 0914 note (`NOTE-LAW-LOCAL-FOR-OPEN-SITE-SESSIONS-2026-09-14.md`),
`CONTENT-FLOW-FIX-PROPOSAL-2026-09-14.md`, `receipts-petpal-0913/BLOCKER-REPORT-petpal-2026-09-14.md`,
pricing rulings D22–D36 (`DECISIONS-2026-09-13-ARCHO.md`).

---

## 1. Precedence

**For shipping content in this repo, this file wins. Everything else is reference.**

RUNBOOK, PLAYBOOK, LAW.md, CONVENTIONS.md, this repo's `CLAUDE.md`, and skill files are reference.
Where any of them contradicts a line below, this file decides. Where this file is silent, they apply
unchanged. Stale text elsewhere does not need deleting — it just stops outranking this page.

Two floors are never overridden, by this file or any instruction in it: **no fabricated citations**
and **no invented ASINs**. Those protect the Amazon account and the site's AI citations.

## 2. Pricing — settled states (owner, 2026-09-12; D22–D36)

Only API/Amazon-served prices ever render. No savings math.

- **D22 NO_OFFER** — the API never sets GONE alone. NO_OFFER queues a live read. Live-buyable: card + link stay, **no figure**, queued for replacement by AOV. Live-gone: GONE → replace.
- **D23 Deal window** — inside a declared deal window (Prime Day, Prime Big Deal Days, BFCM; dates in ONE config file) the pricing function returns only an API LIST_PRICE basis; rows without one print no figure, link kept, until the window closes.
- **D24 Live read before an API figure reaches readers** — required **only on state changes** (figure appears/disappears, LIVE/DARK/GONE flips, ASIN or basis changes). A same-state API price move ships on API stamp + gates.
- **D26 Maker-sourced figures** — not lawful (Associates §2(b)). Drop the figure; keep card, link, disclaimer.
- **D27 Legacy pricing path** — legacy renderer uses the price token. No module types or checks a legacy price by hand.
- **D28 List price** — **PENDING OWNER RULING 2026-09-14.** D28 says offer-first, list alone only when it is the only API figure, labeled "List price" + stamp. RUNBOOK §8vv item 1 says list-first when `SavingBasisType === "LIST_PRICE"`. Both were ruled the same day and they contradict; 406 of 2,071 snapshot rows (19.6%) carry a list-price basis. **Do not code this line. Do not pick a side. Escalate to the owner.**
- **D29 3P / Renewed** — 3P-featured renders (it is the buy box Amazon serves). 3P-unfeatured and Renewed/used-only: no figure, card + link kept, replacement queue by AOV. No seller/condition wording on cards.
- **D30 Freshness** — price + availability receipts valid **7 days**; citation URLs fetch-resolved at write time, no expiry; spec receipts bound to the exact product, no expiry.
- **D31 GONE interim / no ASIN** — no figure, link kept (buy-path floor). No ASIN / no row: no figure + direct Amazon search link.
- **D32 Same-state price drift** — no re-verify; REFRESH only when a dependent claim ("under $300", "cheapest", a price gap) changes truth.
- **D33 IndexNow on price-only changes** — submit **only if `dateModified` moves**.
- **D34 Sync schedule** — a daily proposer opens a work item; it never writes main and never merges.
- **D35 Outbound citation links** — **≥2 fetch-resolved citations per guide**; the external-link-leak policy applies to *non-citation* outbound links only.
- **D36 Owner preview on money-template render items** — required, inside the merge window; the owner's merge is the approval.

## 3. Ship rule

**Ship when the page is more honest than it was.** Not when the system around it is correct.
One wrong price is fixed on the page; it does not become a resolver change plus a gate change before
anything ships. Per §8gg.3, a gate change is its own PR and never rides inside a content PR.

## 4. Content-flow mechanisms — how to clear the gates without inventing

The gates measure compliance, not truth. When verified data falls short of a required count, a writer
has exactly two moves: fail, or invent. These five mechanisms remove the second move. They are lane
discipline today — the manifest/token tooling does not exist yet.

1. **Writers may not ORIGINATE facts.** The writer receives verified data (pick JSON, a fact list with
   verbatim source sentence + URL + access date) and references it. Brief every writer verbatim:
   **"Do not add any citation you have not been handed."** A writer with no research budget cannot
   invent, because it has no mechanism to.
2. **Quotes are copy-paste only.** Never retyped, never tidied, never typo-corrected, never reordered,
   never trimmed of qualifiers inside quotation marks. If a source has a typo, the quote has the typo.
   Four of the six citation defects found on 2026-09-13 were edits made inside quotation marks.
3. **Every count requirement is DATA-BOUNDED** — "up to N, minimum = what the data supports" — never a
   floor to be padded. `authoritySources`: up to 3, minimum = however many verified sources exist for
   that pick. Picks: up to 8, bounded by how many passed live verification. Cons: ≥3 **grounded in the
   listing or a source**, never 3 invented ones. Five well-sourced picks beat eight with three padded.
4. **`INSUFFICIENT DATA` is a successful lane outcome.** Every writer brief carries this verbatim:
   > If the verified data does not support a requirement, DO NOT invent to satisfy it. Return
   > `INSUFFICIENT DATA: <requirement> — <what is missing> — <what would close it>`. That is a
   > successful outcome and will be treated as one. Producing an unsupported claim to pass a gate is
   > the only real failure.

   Research lanes get the same blessing: **"record UNVERIFIED — that is a valuable, expected answer."**
5. **Gates check PROVENANCE, not presence.** Until the tooling lands, the review lane does this by hand:
   every `authoritySources[].url` + `.stat` traces to handed-over verified data; every quoted string
   attributed to a named source byte-matches its source; `listPrice` carries a source and is not a sale
   price. An entry with no backing fails, even though the field is non-empty.

**Writer and verifier are never the same lane.** The verifier re-fetches sources independently.
Result of applying 1–5 on the four life-stage articles: 226 of 232 quoted sentences verified
letter-for-letter, zero fabrications — against one blocking fabrication on the guide written before.

## 5. The petpal ship recipe (proven, PR #183 → `c690c40`)

1. **Branch** `content/<slug>` off `origin/main`. Never touch uncommitted guide drafts in the tree.
2. **Run Vale locally before pushing** — `/opt/homebrew/bin/vale`. **CI under-reports**: on 2026-09-13
   it flagged 1 of 4 instances of the same violation. Sweep the whole class, not the flagged line.
   Target 0 alerts at any level. A red CI gate costs far more than the local check. Scope: the CI job
   lints `src/content/guides/` only — machinery terms in repo docs like this one are not reader prose
   and are not linted.
3. **`npm run build`** (runs `validate:content` on prebuild and the schema/buy-path gates on postbuild).
   `checkStrayLinks` in `validate-guide-integrity.mjs` is WARN by default and does not block picks-less
   informational articles; `--strict` flips it to error.
4. **Pre-satisfy lockdown rule 1 before asking to merge.** It needs four things and it is right to:
   - `## Justification` section in the PR body;
   - `## BLAST RADIUS` section in the PR body (required when money/render paths are touched);
   - green required checks;
   - a durable **PR comment** ending with the literal line
     `VERDICT: MERGE | MERGE-WITH-NOTES | HOLD`
     — a verdict that lives only in a session transcript cannot be audited later.
   Produce the artifact the gate wants. Never request an override.
5. **W4 before merge** (`w4-verify`), orchestrator-spawned, never self-approved.
6. **Merge IS the deploy.** Push to `main` → Vercel production, live in ~60s. **No `vercel --prod` on
   this repo** — `docs/GUIDE_CREATION_PROCESS.md` is stale on this point.
7. **Regenerate llms.txt** — `npm run generate:llms-txt` (+ `generate:llms-full-txt`). llms.txt and
   sitemap.xml must track the live corpus.
8. **IndexNow by explicit `--slug`, changed set only:**
   `node scripts/search-index/submit-urls.cjs --slug <slug> [--slug <slug>] --indexnow-only`
   The `post-deploy-index.yml` workflow reported **`skipped`** on 2026-09-13 (single-commit-diff gap) —
   had the session trusted it, both guides would have shipped with zero submission. The explicit
   `--slug` call is the load-bearing path; the workflow is the safety net. Never the full corpus.
   Google is never pushed.
9. **Probe with `curl -sL`.** Without `-L` the apex/www redirect returns `307` and reads as a false
   dead-surface alarm on llms.txt and sitemap.xml.
10. **W5b audit within ~15 min** (`w5b-indexer-audit`): exactly the changed-set URLs, Dropped 0,
    HTTP 200/202, per-site key served at 200 / exactly 32 bytes, sitemap + llms parity, pages 200 with
    real rendered content (byte size, `/go/` count, `<th>` count — not just HTTP 200).

---

**This is one page, not a project.** It is not a gate programme, not a build, not a refactor.
Nothing here revives the 12-PR gate programme the owner stopped on 2026-09-13.
Changes to this file are owner-authored; a session proposes and records, never self-amends.
