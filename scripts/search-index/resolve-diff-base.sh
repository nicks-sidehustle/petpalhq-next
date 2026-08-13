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
# deployment id.
#
# Ordering is taken from the FIRST-PARENT chain, not the full ancestor walk.
# `--topo-order` alone guarantees only that children precede parents; it does
# NOT totally order an antichain. At a merge commit the two parents are
# mutually unordered and git emits them in an arbitrary order, so "first
# candidate in the walk" can land on the FEATURE side of a merge while the
# mainline side is the newer already-submitted state — which re-sends the
# mainline changes, the same duplicate class as #551 (counter-example
# constructed by review; covered by the merge case in the harness). The
# first-parent chain is a genuine total order and is the sequence of states
# production actually moved through, so:
#
#   1. `git rev-list --topo-order --first-parent <DEPLOY_SHA>` enumerates the
#      mainline states newest-first. The first candidate on that chain is
#      unambiguously the newest mainline ancestor.
#   2. If no candidate is found on the first-parent chain (a deployment exists
#      only for a commit off the mainline — Vercel promote / instant rollback
#      can produce one), the FULL ancestor walk is retried as a second pass, so
#      such a deployment is still usable as a base rather than being ignored.
#   3. Non-ancestors never appear in either walk, so they can never become the
#      base — this is what the `.id < DEPLOY_ID` guard was approximating.
#   4. Deployments whose LATEST status is not `success` are skipped and the walk
#      continues to the next-newest ancestor. That preserves the success-only
#      rule (oneclickai 2026-07-30): a FAILED deploy must never become the base,
#      or the next run diffs only its own commits and silently under-submits.
#
# ── When the ancestry path is NOT usable ─────────────────────────────────────
# A SHALLOW checkout is the case that matters, and it does not announce itself
# by producing an empty walk — it produces a TRUNCATED one. An earlier revision
# of this script inferred "ancestry undeterminable" from an empty `rev-list`,
# which a shallow clone never yields; the primary path then found no candidate,
# returned nothing, and the caller skipped the run with 0 URLs and no warning —
# silent under-submission, worse than the duplicate being fixed. Shallowness is
# therefore tested EXPLICITLY (`git rev-parse --is-shallow-repository`) before
# the ancestry path is trusted, and the id-ordered fallback below is entered
# with a loud ::warning:: rather than reached by accident.
#
# The fallback deliberately does NOT require the chosen SHA to be present in the
# local object store: in a shallow checkout it will not be, and both callers
# fetch the baseline commit directly before using it. Gating on local presence
# here is what would turn "shallow but recoverable" into "nothing submitted".
#
# ── Contract ─────────────────────────────────────────────────────────────────
# Required env:
#   DEPLOY_SHA   SHA of the commit that was just deployed
#   GH_REPO      owner/repo (for the deployments API)
# Optional env:
#   DEPLOY_ID    deployment id of the current deploy; rows with an id >= this
#                are excluded from the candidate list (belt-and-braces; the
#                ancestry walk already excludes descendants, but the fallback
#                path has no ancestry to lean on)
#   DEPLOY_ENVS  space-separated environment names to query, de-duplicated in
#                order (default "Production production"). BOTH callers pass the
#                same expression — "$ENV Production production", event-derived
#                name first — so the two repos cannot diverge on input while
#                sharing a byte-identical script.
#   REVLIST_LIMIT  max commits to walk (default 5000)
# Test hooks (bypass the GitHub API — see __tests__/resolve-diff-base.test.sh):
#   INDEXER_DEPLOYMENTS_FILE  file of "<id>:<sha>" lines, any order
#   INDEXER_STATUSES_FILE     file of "<id>:<state>" lines
#
# stdout: the baseline SHA and NOTHING else — the callers capture it with
#         `RESOLVED=$(...)`, so every human-readable line goes to stderr via
#         log(). The harness asserts this separation.
# stderr: log lines, including one `strategy=<git-ancestor|
#         deployment-id-order-fallback|none>`.
# exit 0: a baseline was resolved. exit 1: none — caller should fall back to
#         ${DEPLOY_SHA}~1.

set -uo pipefail

: "${DEPLOY_SHA:?DEPLOY_SHA is required}"
: "${GH_REPO:?GH_REPO is required}"
DEPLOY_ID="${DEPLOY_ID:-}"
DEPLOY_ENVS="${DEPLOY_ENVS:-Production production}"
REVLIST_LIMIT="${REVLIST_LIMIT:-5000}"

log() { printf '%s\n' "$*" >&2; }

CAND_FILE=$(mktemp) || exit 1
REV_FILE=$(mktemp) || exit 1
trap 'rm -f "$CAND_FILE" "$REV_FILE"' EXIT

# ── Candidate deployments: "<id>:<sha>" ──────────────────────────────────────
list_candidates() {
  if [ -n "${INDEXER_DEPLOYMENTS_FILE:-}" ]; then
    cat "$INDEXER_DEPLOYMENTS_FILE"
    return 0
  fi
  local envname seen=" "
  for envname in $DEPLOY_ENVS; do
    # De-duplicate: callers pass the event-derived environment name first,
    # which is usually already one of the literals that follow it.
    case "$seen" in *" $envname "*) continue ;; esac
    seen="${seen}${envname} "
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
list_candidates |
  awk -F: -v cur="$DEPLOY_SHA" -v maxid="$DEPLOY_ID" '
    NF >= 2 && $1 != "" && $2 != "" && $2 != cur &&
    (maxid == "" || $1 + 0 < maxid + 0) { print $1 ":" $2 }
  ' |
  sort -t: -k1,1nr > "$CAND_FILE"

if [ ! -s "$CAND_FILE" ]; then
  log "No prior production deployment rows to consider."
  log "strategy=none"
  exit 1
fi

# ── Is the ancestry path trustworthy? ────────────────────────────────────────
is_shallow() {
  local out gitdir
  out=$(git rev-parse --is-shallow-repository 2>/dev/null || true)
  case "$out" in
    true|false) printf '%s' "$out"; return 0 ;;
  esac
  # git < 2.15 has no --is-shallow-repository: test for the marker file.
  gitdir=$(git rev-parse --git-dir 2>/dev/null || true)
  if [ -n "$gitdir" ] && [ -f "${gitdir}/shallow" ]; then printf 'true'; else printf 'false'; fi
}

ANCESTRY_USABLE=1
if [ "$(is_shallow)" = "true" ]; then
  ANCESTRY_USABLE=0
  log "::warning::The checkout is SHALLOW, so git ancestry is truncated and cannot decide which prior deployment is newest. Falling back to the deployment-id-ordered selector, which rewinds the baseline after a failed-then-recovered deploy and re-submits already-submitted URLs (issue #551). Restore fetch-depth: 0 on the checkout step."
fi

# ── Primary: newest SUCCESSFUL deployment that is a git ancestor ─────────────
# Two passes: the first-parent chain (a total order, and the sequence of states
# production actually moved through), then the full ancestor walk as a rescue
# for a deployment that exists only off the mainline.
BASE=""
ANY_ANCESTORS=0
if [ "$ANCESTRY_USABLE" -eq 1 ]; then
  for WALK in first-parent full; do
    [ -n "$BASE" ] && break
    if [ "$WALK" = "first-parent" ]; then
      git rev-list --topo-order --first-parent --max-count="$REVLIST_LIMIT" "$DEPLOY_SHA" \
        > "$REV_FILE" 2>/dev/null || : > "$REV_FILE"
    else
      git rev-list --topo-order --max-count="$REVLIST_LIMIT" "$DEPLOY_SHA" \
        > "$REV_FILE" 2>/dev/null || : > "$REV_FILE"
    fi
    [ -s "$REV_FILE" ] || continue
    ANY_ANCESTORS=1

    # ONE awk pass builds the sha->id map from the candidate rows and emits the
    # candidates in walk order. (Was one awk per commit walked: 10.8s on a
    # 3,399-commit walk with no match, per review.) CAND_FILE is id-DESC, so
    # the first row seen for a sha is that sha's most recent deployment.
    MATCHES=$(awk -F: -v cur="$DEPLOY_SHA" '
      NR == FNR { if (NF >= 2 && !($2 in id)) id[$2] = $1; next }
      { if ($0 != cur && ($0 in id)) print $0 ":" id[$0] }
    ' "$CAND_FILE" "$REV_FILE")

    while IFS= read -r PAIR; do
      [ -z "$PAIR" ] && continue
      RSHA="${PAIR%%:*}"; DID="${PAIR##*:}"
      STATE=$(deployment_state "$DID")
      if [ "$STATE" != "success" ]; then
        log "  skipping ancestor ${RSHA} — deployment ${DID} latest status '${STATE:-unknown}', not success"
        continue
      fi
      BASE="$RSHA"
      log "Diff base = newest SUCCESSFUL production deployment that is a git ancestor of ${DEPLOY_SHA}: ${BASE} (deployment ${DID}, walk=${WALK})"
      log "walk=${WALK}"
      log "strategy=git-ancestor"
      break
    done <<< "$MATCHES"

    if [ -z "$BASE" ] && [ "$WALK" = "first-parent" ]; then
      log "  no successful deployment on the first-parent chain — retrying over the full ancestor walk"
    fi
    # A walk that hit the cap may have stopped short of the real base.
    if [ -z "$BASE" ] && [ "$(wc -l < "$REV_FILE" | tr -d ' ')" -ge "$REVLIST_LIMIT" ]; then
      log "::warning::The ${WALK} ancestor walk hit REVLIST_LIMIT=${REVLIST_LIMIT} without finding a deployed ancestor — the baseline may be older than the walk reached."
    fi
  done

  if [ -n "$BASE" ]; then
    printf '%s\n' "$BASE"
    exit 0
  fi

  if [ "$ANY_ANCESTORS" -eq 1 ]; then
    # Ancestry WAS determinable and simply found no successful ancestor (first
    # deploy on this line of history). Do NOT fall back to the id-ordered
    # selector here: it would hand back a NON-ancestor, which is the defect.
    log "No successful production deployment is a git ancestor of ${DEPLOY_SHA}."
    log "strategy=none"
    exit 1
  fi

  log "::warning::git rev-list returned nothing for ${DEPLOY_SHA} on a non-shallow repository (unknown or corrupt object store). Falling back to the deployment-id-ordered selector, which can rewind the baseline after a failed-then-recovered deploy (issue #551)."
fi

# ── Fallback: ancestry unusable → old deployment-id-ordered selector ─────────
# Presence in the local object store is deliberately NOT required (see header):
# in the shallow case the answer is by definition absent, and both callers fetch
# the baseline commit before using it.
while IFS= read -r PAIR; do
  [ -z "$PAIR" ] && continue
  DID="${PAIR%%:*}"
  DSHA="${PAIR##*:}"
  STATE=$(deployment_state "$DID")
  [ "$STATE" = "success" ] || continue
  BASE="$DSHA"
  log "Diff base from previous SUCCESSFUL production deployment (id order): ${BASE} (deployment ${DID})"
  if ! git cat-file -e "${BASE}^{commit}" 2>/dev/null; then
    log "  note: ${BASE} is not in the local object store — the caller must fetch it before diffing."
  fi
  log "strategy=deployment-id-order-fallback"
  break
done < "$CAND_FILE"

if [ -n "$BASE" ]; then
  printf '%s\n' "$BASE"
  exit 0
fi

log "No usable prior production deployment found."
log "strategy=none"
exit 1
