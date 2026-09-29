#!/usr/bin/env bash
# Clean up git worktrees after a merge (owner request 2026-09-29).
#  1. Remove clean worktrees whose PR is MERGED or CLOSED, and delete their LOCAL branch.
#  2. In remaining worktrees idle > N days, delete build output only.
# Never touches the main checkout, never deletes remote branches.
# Usage: bash scripts/cleanup-worktrees.sh [--dry-run] [--days N]
set -euo pipefail

DRY=0
DAYS=7
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY=1 ;;
    --days)
      shift
      [ $# -gt 0 ] || { echo "cleanup-worktrees: --days needs a number" >&2; exit 2; }
      DAYS="$1" ;;
    -h|--help) sed -n '2,7p' "$0"; exit 0 ;;
    *) echo "cleanup-worktrees: unknown argument: $1" >&2; exit 2 ;;
  esac
  shift
done
case "$DAYS" in ''|*[!0-9]*) echo "cleanup-worktrees: --days must be a non-negative integer" >&2; exit 2 ;; esac

# Fail safe: without an authenticated gh we cannot know PR state, so remove nothing.
if ! command -v gh >/dev/null 2>&1; then
  echo "cleanup-worktrees: gh CLI not found; nothing removed (fail safe)" >&2; exit 1
fi
if ! gh auth status >/dev/null 2>&1; then
  echo "cleanup-worktrees: gh is not authenticated (run 'gh auth login'); nothing removed (fail safe)" >&2; exit 1
fi

COMMON="$(git rev-parse --git-common-dir)"
MAIN="$(cd "$COMMON/.." && pwd -P)"
CUR="$(git rev-parse --show-toplevel 2>/dev/null || true)"
[ -n "$CUR" ] && CUR="$(cd "$CUR" && pwd -P)"

if stat -c %Y / >/dev/null 2>&1; then MTIME_FMT=(-c %Y); else MTIME_FMT=(-f %m); fi
NOW="$(date +%s)"
CUTOFF=$(( NOW - DAYS * 86400 ))
PFX=""; [ "$DRY" = 1 ] && PFX="[dry-run] would: "

REMOVED=0; BRANCHES=0; CLEARED=0; SKIPPED=0
R_DETACHED=0; R_DIRTY=0; R_OPEN=0; R_NOPR=0; R_OTHER=0
skip() { # counter-var label path detail
  SKIPPED=$((SKIPPED + 1))
  eval "$1=\$(( $1 + 1 ))"
  echo "skip: $2 ($3): $4"
}

is_dirty() { # path -> 0 if there are changes beyond ignorable scratch
  local out
  out="$(git -C "$1" status --porcelain </dev/null | grep -Ev '^\?\? ((.*/)?PR-BODY[^/]*\.md|(.*/)?node_modules/?|\.next/?|\.vale-bin/?)$' || true)"
  [ -n "$out" ]
}

newest_activity() { # path -> epoch of newest tracked-file mtime or HEAD commit
  local head_ts files_ts
  head_ts="$(git -C "$1" log -1 --format=%ct </dev/null 2>/dev/null || echo 0)"
  files_ts="$(git -C "$1" ls-files -z </dev/null | (cd "$1" && xargs -0 stat "${MTIME_FMT[@]}" 2>/dev/null) | sort -n | tail -1 || true)"
  files_ts="${files_ts:-0}"
  if [ "$files_ts" -gt "$head_ts" ]; then echo "$files_ts"; else echo "$head_ts"; fi
}

clear_build_output() { # path
  local p="$1" item found=0 hit
  for item in .next out .turbo tsconfig.tsbuildinfo; do
    [ -e "$p/$item" ] || continue
    hit="$(git -C "$p" ls-files -- "$item" </dev/null | head -1)"
    if [ -n "$hit" ]; then
      echo "  keep $item (contains tracked files)"; continue
    fi
    echo "  ${PFX}rm -rf $p/$item"
    [ "$DRY" = 1 ] || rm -rf "${p:?}/$item"
    found=1
  done
  [ "$found" = 1 ] && CLEARED=$((CLEARED + 1))
  return 0
}

process() { # path branch(or "") state
  local path="$1" branch="$2" state="$3" pr last label
  if [ -d "$path" ]; then path="$(cd "$path" && pwd -P)"; fi
  [ "$path" = "$MAIN" ] && return 0
  label="${branch:-detached HEAD}"
  if [ "$state" = "locked" ]; then skip R_OTHER "$label" "$path" "worktree is locked"; return 0; fi
  if [ ! -d "$path" ]; then skip R_OTHER "$label" "$path" "path missing (run git worktree prune)"; return 0; fi

  if [ -z "$branch" ]; then
    skip R_DETACHED "$label" "$path" "detached HEAD"
  elif ! pr="$(cd "$MAIN" && gh pr list --head "$branch" --state all --json state -q '.[0].state' </dev/null 2>/dev/null)"; then
    skip R_OTHER "$label" "$path" "PR lookup failed"
  elif [ -z "$pr" ]; then
    skip R_NOPR "$label" "$path" "no PR"
  elif [ "$pr" = "OPEN" ]; then
    skip R_OPEN "$label" "$path" "PR open"
  elif [ "$pr" != "MERGED" ] && [ "$pr" != "CLOSED" ]; then
    skip R_OTHER "$label" "$path" "PR state $pr"
  elif [ "$path" = "$CUR" ]; then
    skip R_OTHER "$label" "$path" "PR $pr but this is the current worktree"
  elif is_dirty "$path"; then
    skip R_DIRTY "$label" "$path" "PR $pr but worktree has uncommitted changes"
  else
    echo "${PFX}remove worktree $path (branch $branch, PR $pr)"
    if [ "$DRY" = 1 ]; then
      REMOVED=$((REMOVED + 1)); BRANCHES=$((BRANCHES + 1))
    elif git -C "$MAIN" worktree remove --force "$path" </dev/null; then
      REMOVED=$((REMOVED + 1))
      if git -C "$MAIN" branch -D "$branch" </dev/null >/dev/null; then
        BRANCHES=$((BRANCHES + 1)); echo "deleted local branch $branch"
      else
        echo "warn: could not delete local branch $branch" >&2
      fi
    else
      skip R_OTHER "$label" "$path" "git worktree remove failed"
    fi
    return 0
  fi

  # Not removed: clear build output if idle.
  last="$(newest_activity "$path")"
  if [ "$last" -lt "$CUTOFF" ]; then
    echo "idle > ${DAYS}d: $path (last activity $(( (NOW - last) / 86400 ))d ago)"
    clear_build_output "$path"
  fi
  return 0
}

path=""; branch=""; state=""
while IFS= read -r line; do
  case "$line" in
    "worktree "*) path="${line#worktree }"; branch=""; state="" ;;
    "branch "*) branch="${line#branch refs/heads/}" ;;
    "locked"*|"bare") state="locked" ;;
    "") if [ -n "$path" ]; then process "$path" "$branch" "$state"; fi; path=""; branch=""; state="" ;;
  esac
done < <(git -C "$MAIN" worktree list --porcelain; echo)

reasons=""
add() { if [ "$2" -gt 0 ]; then reasons="$reasons${reasons:+, }$2 $1"; fi; }
add "detached HEAD" "$R_DETACHED"; add "dirty" "$R_DIRTY"; add "PR open" "$R_OPEN"
add "no PR" "$R_NOPR"; add "other" "$R_OTHER"
if [ "$DRY" = 1 ]; then echo "(dry run: nothing was changed)"; fi
echo "removed $REMOVED worktrees, deleted $BRANCHES branches, cleared build output in $CLEARED worktrees, skipped $SKIPPED${reasons:+ ($reasons)}"
