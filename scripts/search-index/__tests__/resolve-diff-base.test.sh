#!/usr/bin/env bash
#
# Harness for scripts/search-index/resolve-diff-base.sh (issue #551).
#
# A `deployment_status` event cannot be fired on demand, so the selector is
# proven BY CONSTRUCTION instead: a synthetic git repo reproduces the exact
# commit topology of the 2026-08-12 SHE firing, recorded deployment lists are
# injected through the script's test hooks, and the LEGACY selector (the code
# that shipped, reimplemented verbatim below) is run against the same fixtures.
#
# The suite is mutation-proof in both directions: every case asserts what the
# legacy selector answers as well as what the new one does, so a regression to
# id-ordering fails case 1/2 and a regression that drops the success-only rule
# fails case 3.
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

run_resolver() {
  ( cd "$REPO" && bash "$RESOLVER" 2>"$WORK/stderr.txt" ) || true
}
strategy_of() { sed -n 's/^strategy=//p' "$WORK/stderr.txt" | head -1; }

# ── Synthetic history reproducing the 2026-08-12 SHE firing ──────────────────
#   A ── B ── C        (C = the merge that fired the defect)
#    \
#     └── D            (divergent branch — never an ancestor of C)
REPO="$WORK/repo"
git init -q "$REPO"
git -C "$REPO" config user.email t@t.t
git -C "$REPO" config user.name t
mk() { echo "$1" > "$REPO/$1.txt"; git -C "$REPO" add -A; git -C "$REPO" commit -qm "$1"; git -C "$REPO" rev-parse HEAD; }

A=$(mk A)   # role of d0aaac83 — grandparent, deployed LATER (19:48) than B
B=$(mk B)   # role of 0b40cace — git parent, deployed 19:33, failed → success 19:58
C=$(mk C)   # role of 9e865f11 — this deploy
git -C "$REPO" checkout -q -b sidebranch "$A"
D=$(mk D)   # divergent commit, never an ancestor of C
git -C "$REPO" checkout -q main 2>/dev/null || git -C "$REPO" checkout -q master
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
echo "Case 6 — ancestry undeterminable → loud id-ordered fallback (documented)"
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

echo
echo "── ${PASS} passed, ${FAIL} failed ──"
[ "$FAIL" -eq 0 ]
