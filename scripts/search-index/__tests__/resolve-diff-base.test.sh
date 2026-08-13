#!/usr/bin/env bash
#
# Harness for scripts/search-index/resolve-diff-base.sh (issue #551).
#
# A `deployment_status` event cannot be fired on demand, so the selector is
# proven BY CONSTRUCTION instead: synthetic git repos reproduce the topologies
# that matter (including the exact commit shape of the 2026-08-12 SHE firing and
# a real depth-1 shallow clone), recorded deployment lists are injected through
# the script's test hooks, and the LEGACY selector (the code that shipped,
# reimplemented verbatim below) is run against the same fixtures.
#
# The suite is mutation-proof in both directions: cases assert what the legacy
# selector answers as well as what the new one does, so a regression to
# id-ordering fails cases 1/2, a regression that drops the success-only rule
# fails case 3, dropping --first-parent fails case 7, dropping the shallow guard
# fails case 8, and dropping either fallback guard fails cases 9/10.
#
# Known gap, accepted: the two callers' *wiring* (env passed in, `RESOLVED=$(…)`
# capturing stdout) is exercised only by case 11's stdout-purity assertion, not
# by executing the workflow YAML itself — nothing here runs a GitHub Actions
# job. A change to the workflow that stopped passing DEPLOY_ID, or that captured
# stderr too, would not be caught by this file.
#
# Run: bash scripts/search-index/__tests__/resolve-diff-base.test.sh

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESOLVER="${SCRIPT_DIR}/../resolve-diff-base.sh"
[ -f "$RESOLVER" ] || { echo "FATAL: resolver not found at $RESOLVER"; exit 1; }

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

PASS=0
FAIL=0

ok()   { PASS=$((PASS + 1)); printf '  ok    %s\n' "$1"; }
bad()  { FAIL=$((FAIL + 1)); printf '  FAIL  %s\n     expected: %s\n     actual:   %s\n' "$1" "$2" "$3"; }
is()   { if [ "$2" = "$3" ]; then ok "$1"; else bad "$1" "$2" "$3"; fi; }

# ── The selector that SHIPPED, reimplemented verbatim ────────────────────────
# $1 = "guard" to apply SHE's `select(.id < DEPLOY_ID)` filter, "noguard" for
# petpal's variant which lacked it. Reads the same fixtures as the new script.
legacy_select() {
  local guard="$1" prev="" pair did dsha state
  while IFS= read -r pair; do
    [ -z "$pair" ] && continue
    did="${pair%%:*}"; dsha="${pair##*:}"
    [ "$dsha" = "$DEPLOY_SHA" ] && continue
    if [ "$guard" = "guard" ] && [ -n "${DEPLOY_ID:-}" ]; then
      [ "$did" -lt "$DEPLOY_ID" ] || continue
    fi
    state=$(awk -F: -v id="$did" '$1 == id { print $2; exit }' "$INDEXER_STATUSES_FILE")
    [ "$state" = "success" ] || continue
    prev="$dsha"
    break
  done < <(sort -t: -k1,1nr "$INDEXER_DEPLOYMENTS_FILE")
  printf '%s' "$prev"
}

# $1 (optional) = repo dir to run in; defaults to $REPO
run_resolver() {
  ( cd "${1:-$REPO}" && bash "$RESOLVER" 2>"$WORK/stderr.txt" ) || true
}
strategy_of() { sed -n 's/^strategy=//p' "$WORK/stderr.txt" | head -1; }
walk_of()     { sed -n 's/^walk=//p'     "$WORK/stderr.txt" | head -1; }

commit_in() { # $1 repo, $2 name -> prints sha
  echo "$2" > "$1/$2.txt"; git -C "$1" add -A; git -C "$1" commit -qm "$2"; git -C "$1" rev-parse HEAD
}

# ── Synthetic history reproducing the 2026-08-12 SHE firing ──────────────────
#   A ── B ── C        (C = the merge that fired the defect)
#    \
#     └── D            (divergent branch — never an ancestor of C)
REPO="$WORK/repo"
git init -q "$REPO"
git -C "$REPO" config user.email t@t.t
git -C "$REPO" config user.name t
git -C "$REPO" config uploadpack.allowFilter true

A=$(commit_in "$REPO" A)   # role of d0aaac83 — grandparent, deployed LATER (19:48) than B
B=$(commit_in "$REPO" B)   # role of 0b40cace — git parent, deployed 19:33, failed → success 19:58
C=$(commit_in "$REPO" C)   # role of 9e865f11 — this deploy
MAIN=$(git -C "$REPO" rev-parse --abbrev-ref HEAD)
git -C "$REPO" checkout -q -b sidebranch "$A"
D=$(commit_in "$REPO" D)   # divergent commit, never an ancestor of C
git -C "$REPO" checkout -q "$MAIN"
git -C "$REPO" reset -q --hard "$C"

export GH_REPO="nicks-sidehustle/test"
export DEPLOY_ENVS="Production production"
export INDEXER_DEPLOYMENTS_FILE="$WORK/deployments.txt"
export INDEXER_STATUSES_FILE="$WORK/statuses.txt"

echo
echo "Case 1 — recreated SHE #551 firing (deployment ids diverge from git order)"
# Real ids from the incident; A carries the HIGHER id despite being the OLDER commit.
cat > "$INDEXER_DEPLOYMENTS_FILE" <<EOF
5876202883:$A
5875999719:$B
5878113980:$C
EOF
cat > "$INDEXER_STATUSES_FILE" <<EOF
5876202883:success
5875999719:success
5878113980:success
EOF
export DEPLOY_SHA="$C" DEPLOY_ID=5878113980
is "legacy selector rewinds past the git parent (the defect)" "$A" "$(legacy_select guard)"
is "new selector picks the git parent"                        "$B" "$(run_resolver)"
is "  strategy"                                    "git-ancestor" "$(strategy_of)"
is "  walk"                                        "first-parent" "$(walk_of)"

echo
echo "Case 2 — petpal exposure: a LATER-created deployment for a non-ancestor commit"
cat > "$INDEXER_DEPLOYMENTS_FILE" <<EOF
5876202883:$A
5875999719:$B
5878113980:$C
5879999999:$D
EOF
cat > "$INDEXER_STATUSES_FILE" <<EOF
5876202883:success
5875999719:success
5878113980:success
5879999999:success
EOF
is "legacy WITHOUT the id guard picks a non-ancestor (petpal)" "$D" "$(legacy_select noguard)"
is "legacy WITH the id guard still rewinds (SHE)"              "$A" "$(legacy_select guard)"
is "new selector ignores the non-ancestor entirely"            "$B" "$(run_resolver)"

echo
echo "Case 3 — success-only rule preserved (oneclickai 2026-07-30 regression guard)"
cat > "$INDEXER_DEPLOYMENTS_FILE" <<EOF
5876202883:$A
5875999719:$B
5878113980:$C
EOF
cat > "$INDEXER_STATUSES_FILE" <<EOF
5876202883:success
5875999719:failure
5878113980:success
EOF
is "failed parent deploy is skipped; base walks back to the grandparent" "$A" "$(run_resolver)"

echo
echo "Case 4 — re-deploy rows: the newest row for a SHA decides its status"
cat > "$INDEXER_DEPLOYMENTS_FILE" <<EOF
5876202883:$A
5875999719:$B
5877000000:$B
5878113980:$C
EOF
cat > "$INDEXER_STATUSES_FILE" <<EOF
5876202883:success
5875999719:failure
5877000000:success
5878113980:success
EOF
is "recovered parent (newer row = success) is the base" "$B" "$(run_resolver)"

echo
echo "Case 5 — no candidate deployments at all → caller falls back to SHA~1"
: > "$INDEXER_DEPLOYMENTS_FILE"
: > "$INDEXER_STATUSES_FILE"
OUT=$(run_resolver)
is "returns nothing" "" "$OUT"
is "  strategy"  "none" "$(strategy_of)"

echo
echo "Case 6 — deployed commit not in the object store → loud id-ordered fallback"
cat > "$INDEXER_DEPLOYMENTS_FILE" <<EOF
5876202883:$A
5875999719:$B
EOF
cat > "$INDEXER_STATUSES_FILE" <<EOF
5876202883:success
5875999719:success
EOF
export DEPLOY_SHA="0000000000000000000000000000000000000000" DEPLOY_ID=5878113980
is "falls back to the id-ordered selector" "$A" "$(run_resolver)"
is "  strategy" "deployment-id-order-fallback" "$(strategy_of)"
if grep -q '::warning::' "$WORK/stderr.txt"; then
  ok "  emits a ::warning:: that the fallback re-exposes #551"
else
  bad "  emits a ::warning::" "a ::warning:: line" "$(head -2 "$WORK/stderr.txt")"
fi

# ── Merge topology: --topo-order does NOT order an antichain ─────────────────
#   A ── M1 ─────┐
#    \            ├── MERGE     M1 and F2 are BOTH ancestors of MERGE
#     └── F1 ── F2┘             and both carry successful deployments
echo
echo "Case 7 — merge commit: mainline parent wins, not the feature parent"
MREPO="$WORK/merge-repo"
git init -q "$MREPO"
git -C "$MREPO" config user.email t@t.t
git -C "$MREPO" config user.name t
MA=$(commit_in "$MREPO" MA)
MBASE=$(git -C "$MREPO" rev-parse --abbrev-ref HEAD)
M1=$(commit_in "$MREPO" M1)
git -C "$MREPO" checkout -q -b feature "$MA"
commit_in "$MREPO" F1 >/dev/null   # depth on the feature side; never a base
F2=$(commit_in "$MREPO" F2)
git -C "$MREPO" checkout -q "$MBASE"
git -C "$MREPO" merge -q --no-ff -m "MERGE" "$F2"
MERGE=$(git -C "$MREPO" rev-parse HEAD)

# Evidence that the full topo walk really does emit the feature parent first,
# i.e. this case would fail without --first-parent rather than passing by luck.
TOPO_FIRST=$(git -C "$MREPO" rev-list --topo-order "$MERGE" | sed -n '2p')
is "full topo walk emits the FEATURE parent first (the trap)" "$F2" "$TOPO_FIRST"

cat > "$INDEXER_DEPLOYMENTS_FILE" <<EOF
100:$M1
200:$F2
300:$MERGE
EOF
cat > "$INDEXER_STATUSES_FILE" <<EOF
100:success
200:success
300:success
EOF
export DEPLOY_SHA="$MERGE" DEPLOY_ID=300
is "new selector picks the MAINLINE parent" "$M1" "$(run_resolver "$MREPO")"
is "  walk"                        "first-parent" "$(walk_of)"

echo
echo "Case 7b — deployment ONLY off the mainline → full walk rescues it"
cat > "$INDEXER_DEPLOYMENTS_FILE" <<EOF
200:$F2
300:$MERGE
EOF
cat > "$INDEXER_STATUSES_FILE" <<EOF
200:success
300:success
EOF
is "falls through to the full walk and finds the off-mainline deploy" "$F2" "$(run_resolver "$MREPO")"
is "  walk" "full" "$(walk_of)"

# ── Real shallow clone: the documented fallback trigger ──────────────────────
echo
echo "Case 8 — REAL depth-1 shallow checkout → fallback fires WITH its warning"
SHALLOW="$WORK/shallow"
git clone -q --depth 1 "file://$REPO" "$SHALLOW" 2>/dev/null
is "fixture really is shallow" "true" "$(git -C "$SHALLOW" rev-parse --is-shallow-repository)"
SHALLOW_REVCOUNT=$(git -C "$SHALLOW" rev-list --topo-order HEAD | wc -l | tr -d ' ')
is "  and rev-list is TRUNCATED, not empty (the old inference's blind spot)" "1" "$SHALLOW_REVCOUNT"
cat > "$INDEXER_DEPLOYMENTS_FILE" <<EOF
5876202883:$A
5875999719:$B
EOF
cat > "$INDEXER_STATUSES_FILE" <<EOF
5876202883:success
5875999719:success
EOF
export DEPLOY_SHA="$C" DEPLOY_ID=5878113980
is "returns a base instead of nothing" "$A" "$(run_resolver "$SHALLOW")"
is "  strategy" "deployment-id-order-fallback" "$(strategy_of)"
if grep -q '::warning::.*SHALLOW' "$WORK/stderr.txt"; then
  ok "  names SHALLOW in the warning (silent under-submission closed)"
else
  bad "  names SHALLOW in the warning" "::warning:: mentioning SHALLOW" "$(grep '::warning::' "$WORK/stderr.txt" | head -1)"
fi
if grep -q 'not in the local object store' "$WORK/stderr.txt"; then
  ok "  tells the caller the base must be fetched"
else
  bad "  tells the caller to fetch" "a 'not in the local object store' note" "(absent)"
fi

echo
echo "Case 9 — fallback still filters the CURRENT SHA (mutation kill: same-SHA guard)"
# DEPLOY_ID unset on purpose so the id guard cannot do this job for it.
cat > "$INDEXER_DEPLOYMENTS_FILE" <<EOF
5878113980:$C
5876202883:$A
EOF
cat > "$INDEXER_STATUSES_FILE" <<EOF
5878113980:success
5876202883:success
EOF
export DEPLOY_SHA="$C"; unset DEPLOY_ID
is "does not select the deploy's own SHA as its own baseline" "$A" "$(run_resolver "$SHALLOW")"

echo
echo "Case 10 — fallback still applies the DEPLOY_ID guard (mutation kill)"
cat > "$INDEXER_DEPLOYMENTS_FILE" <<EOF
5879999999:$D
5876202883:$A
EOF
cat > "$INDEXER_STATUSES_FILE" <<EOF
5879999999:success
5876202883:success
EOF
export DEPLOY_SHA="$C" DEPLOY_ID=5878113980
is "ignores a deployment created after this one" "$A" "$(run_resolver "$SHALLOW")"

echo
echo "Case 11 — stdout carries the SHA and nothing else (callers use \$(...))"
cat > "$INDEXER_DEPLOYMENTS_FILE" <<EOF
5876202883:$A
5875999719:$B
5878113980:$C
EOF
cat > "$INDEXER_STATUSES_FILE" <<EOF
5876202883:success
5875999719:success
5878113980:success
EOF
export DEPLOY_SHA="$C" DEPLOY_ID=5878113980
RAW=$( cd "$REPO" && bash "$RESOLVER" 2>/dev/null )
is "exactly one line on stdout" "1" "$(printf '%s\n' "$RAW" | wc -l | tr -d ' ')"
is "and it is the bare SHA"   "$B" "$RAW"

echo
echo "── ${PASS} passed, ${FAIL} failed ──"
[ "$FAIL" -eq 0 ]
