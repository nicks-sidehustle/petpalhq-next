#!/usr/bin/env bash
#
# resolve-diff-base.sh — pick the diff BASELINE for the post-deploy search-index
# workflow: the SHA of the last production deploy whose URLs were already
# submitted.
#
# ── Why this exists (issue #551, fired on SHE 2026-08-12) ────────────────────
# The previous selector was "newest successful production deployment by
# deployment id". Deployment id order is CREATION order, which is NOT git
# ancestor order once a deploy fails and recovers:
#
#   deployment 5876202883  sha d0aaac83 (grandparent)  created 19:48  success
#   deployment 5875999719  sha 0b40cace (git parent)   created 19:33  failure → success 19:58
#   deployment 5878113980  sha 9e865f11 (this deploy)  created 22:04  success
#
# id order says d0aaac83 is "newest"; git says 0b40cace is. Taking d0aaac83 as
# the baseline rewound one commit PAST the git parent, re-detected the parent's
# content changes, and re-sent 5 URLs that had already been submitted and
# accepted 13 minutes earlier.
#
# ── The rule implemented here ────────────────────────────────────────────────
# Baseline = the newest SUCCESSFUL production deployment whose SHA is a GIT
# ANCESTOR of the deployed SHA. "Newest" is decided by git topology, not by
# deployment id:
#
#   1. `git rev-list --topo-order <DEPLOY_SHA>` enumerates exactly the ancestors
#      of the deployed commit, children strictly before parents. The first
#      candidate encountered in that walk is therefore the newest ancestor, and
#      nothing later in the walk can be a descendant of it.
#   2. Non-ancestors (a divergent branch, or a LATER-created deployment for a
#      descendant commit) never appear in that walk, so they can never become
#      the base — this is what the `.id < DEPLOY_ID` guard was approximating.
#   3. Deployments whose LATEST status is not `success` are skipped and the walk
#      continues to the next-newest ancestor. That preserves the success-only
#      rule (oneclickai 2026-07-30): a FAILED deploy must never become the base,
#      or the next run diffs only its own commits and silently under-submits.
#
# Falls back to the old deployment-id-ordered selector ONLY when git ancestry
# cannot be determined at all (rev-list yields nothing — shallow/corrupt
# checkout). That fallback is loud: it re-exposes #551 by construction.
#
# ── Contract ─────────────────────────────────────────────────────────────────
# Required env:
#   DEPLOY_SHA   SHA of the commit that was just deployed
#   GH_REPO      owner/repo (for the deployments API)
# Optional env:
#   DEPLOY_ID    deployment id of the current deploy; rows with an id >= this
#                are excluded from the candidate list (belt-and-braces; the
#                ancestry walk already excludes descendants)
#   DEPLOY_ENVS  space-separated environment names to query (default "Production
#                production")
#   REVLIST_LIMIT  max commits to walk (default 5000)
# Test hooks (bypass the GitHub API — see __tests__/resolve-diff-base.test.sh):
#   INDEXER_DEPLOYMENTS_FILE  file of "<id>:<sha>" lines, any order
#   INDEXER_STATUSES_FILE     file of "<id>:<state>" lines
#
# stdout: the baseline SHA (nothing else). stderr: human-readable log lines,
#         including one `strategy=<git-ancestor|deployment-id-order-fallback>`.
# exit 0: a baseline was resolved. exit 1: none — caller should fall back to
#         ${DEPLOY_SHA}~1.

set -uo pipefail

: "${DEPLOY_SHA:?DEPLOY_SHA is required}"
: "${GH_REPO:?GH_REPO is required}"
DEPLOY_ID="${DEPLOY_ID:-}"
DEPLOY_ENVS="${DEPLOY_ENVS:-Production production}"
REVLIST_LIMIT="${REVLIST_LIMIT:-5000}"

log() { printf '%s\n' "$*" >&2; }

# ── Candidate deployments: "<id>:<sha>", newest id first ─────────────────────
list_candidates() {
  if [ -n "${INDEXER_DEPLOYMENTS_FILE:-}" ]; then
    cat "$INDEXER_DEPLOYMENTS_FILE"
    return 0
  fi
  local envname
  for envname in $DEPLOY_ENVS; do
    gh api "repos/${GH_REPO}/deployments?environment=${envname}&per_page=100" \
      --jq '.[] | "\(.id):\(.sha)"' 2>/dev/null || true
  done
}

# ── Latest status of one deployment ──────────────────────────────────────────
deployment_state() {
  local did="$1"
  if [ -n "${INDEXER_STATUSES_FILE:-}" ]; then
    awk -F: -v id="$did" '$1 == id { print $2; exit }' "$INDEXER_STATUSES_FILE"
    return 0
  fi
  gh api "repos/${GH_REPO}/deployments/${did}/statuses?per_page=1" \
    --jq '.[0].state' 2>/dev/null || true
}

# Drop the current SHA and (when DEPLOY_ID is known) any row created at or after
# this deploy, then sort by id DESC so the first row for a given SHA is that
# SHA's most recent deployment attempt.
CANDIDATES=$(
  list_candidates |
    awk -F: -v cur="$DEPLOY_SHA" -v maxid="$DEPLOY_ID" '
      NF >= 2 && $1 != "" && $2 != "" && $2 != cur &&
      (maxid == "" || $1 + 0 < maxid + 0) { print $1 ":" $2 }
    ' |
    sort -t: -k1,1nr
)

if [ -z "$CANDIDATES" ]; then
  log "No prior production deployment rows to consider."
  log "strategy=none"
  exit 1
fi

# ── Primary: newest SUCCESSFUL deployment that is a git ancestor ─────────────
ANCESTORS=$(git rev-list --topo-order --max-count="$REVLIST_LIMIT" "$DEPLOY_SHA" 2>/dev/null || true)

BASE=""
if [ -n "$ANCESTORS" ]; then
  while IFS= read -r RSHA; do
    [ -z "$RSHA" ] && continue
    [ "$RSHA" = "$DEPLOY_SHA" ] && continue
    DID=$(printf '%s\n' "$CANDIDATES" | awk -F: -v s="$RSHA" '$2 == s { print $1; exit }')
    [ -n "$DID" ] || continue
    STATE=$(deployment_state "$DID")
    if [ "$STATE" != "success" ]; then
      log "  skipping ancestor ${RSHA} — deployment ${DID} latest status '${STATE:-unknown}', not success"
      continue
    fi
    BASE="$RSHA"
    log "Diff base = newest SUCCESSFUL production deployment that is a git ancestor of ${DEPLOY_SHA}: ${BASE} (deployment ${DID})"
    log "strategy=git-ancestor"
    break
  done <<< "$ANCESTORS"

  if [ -n "$BASE" ]; then
    printf '%s\n' "$BASE"
    exit 0
  fi

  # Ancestry WAS determinable and simply found no successful ancestor (first
  # deploy on this line of history). Do NOT fall back to the id-ordered
  # selector here: it would hand back a NON-ancestor, which is the defect.
  log "No successful production deployment is a git ancestor of ${DEPLOY_SHA}."
  log "strategy=none"
  exit 1
fi

# ── Fallback: ancestry undeterminable → old deployment-id-ordered selector ───
log "::warning::git ancestry could not be determined for ${DEPLOY_SHA} (rev-list returned nothing — shallow or incomplete checkout). Falling back to the deployment-id-ordered selector, which can rewind the baseline after a failed-then-recovered deploy (issue #551) and re-submit already-submitted URLs."
while IFS= read -r PAIR; do
  [ -z "$PAIR" ] && continue
  DID="${PAIR%%:*}"
  DSHA="${PAIR##*:}"
  git cat-file -e "${DSHA}^{commit}" 2>/dev/null || continue
  STATE=$(deployment_state "$DID")
  [ "$STATE" = "success" ] || continue
  BASE="$DSHA"
  log "Diff base from previous SUCCESSFUL production deployment (id order): ${BASE} (deployment ${DID})"
  log "strategy=deployment-id-order-fallback"
  break
done <<< "$CANDIDATES"

if [ -n "$BASE" ]; then
  printf '%s\n' "$BASE"
  exit 0
fi

log "No usable prior production deployment found."
log "strategy=none"
exit 1
