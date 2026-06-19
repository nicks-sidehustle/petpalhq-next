#!/bin/bash
# PRODUCTION DEPLOY — PetPalHQ
#
# Push to main = Vercel production deploy = live within ~60 seconds.
# After the deploy, this script ALSO submits the shipped guide URLs to the
# search index (IndexNow + Google) by EXPLICIT slug — the deterministic fix for
# the batch index-submit gap, where post-deploy-index.yml's single-commit diff
# silently skipped guides shipped in non-tip commits of a batch push.
#
# Usage:
#   bash scripts/deploy-production.sh                       # auto-detect shipped slugs
#   bash scripts/deploy-production.sh --slug a --slug b     # explicit slugs (batch)
#   bash scripts/deploy-production.sh --yes                 # skip the confirm prompt
#   bash scripts/deploy-production.sh --no-submit           # deploy only; let the workflow handle indexing
#
# Slug resolution order for the explicit submit:
#   1) every --slug passed on the command line (deterministic, preferred for batches)
#   2) else slugs auto-detected from changed src/content/guides/*.md between
#      origin/main and HEAD (the full pushed range — NOT just the tip commit)

set -e
cd "$(dirname "$0")/.."

YES=0
NO_SUBMIT=0
SLUGS=()
while [ $# -gt 0 ]; do
  case "$1" in
    --yes) YES=1 ;;
    --no-submit) NO_SUBMIT=1 ;;
    --slug) shift; [ -n "${1:-}" ] && SLUGS+=("$1") ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
  shift
done

HEAD_SHA=$(git rev-parse HEAD)
SHORT_SHA=$(git rev-parse --short HEAD)
REMOTE_SHA=$(git rev-parse origin/main 2>/dev/null || echo "")

echo ""
echo "════════════════════════════════════════════════════"
echo "  PRODUCTION DEPLOY — PetPalHQ"
echo "  Commit: $SHORT_SHA"
echo "════════════════════════════════════════════════════"
echo ""

# Refuse to deploy a dirty tree.
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ Uncommitted changes detected. Commit or stash first."
  exit 1
fi

# Step 1: Build verification
echo "Step 1/3: Build verification..."
if ! npm run build > /dev/null 2>&1; then
  echo "❌ BUILD FAILED"
  npm run build 2>&1 | tail -10
  exit 1
fi
echo "✅ Build passed"

# Step 2: Deploy summary + confirm
echo ""
echo "Step 2/3: Deploy summary"
if [ -n "$REMOTE_SHA" ] && [ "$REMOTE_SHA" != "$HEAD_SHA" ]; then
  echo "Commits to deploy:"
  git log --oneline "$REMOTE_SHA..$HEAD_SHA" | sed 's/^/  /'
else
  echo "Commits:"
  git log --oneline -5 | sed 's/^/  /'
fi

echo ""
echo "════════════════════════════════════════════════════"
echo "  Ready to deploy $SHORT_SHA to production (petpalhq.com)."
echo "════════════════════════════════════════════════════"
echo ""
if [ "$YES" = "1" ] || [ ! -t 0 ]; then
  CONFIRM="DEPLOY"
  echo "  Auto-confirmed (--yes or non-TTY stdin)"
else
  read -p "Type DEPLOY to confirm: " CONFIRM
fi
if [ "$CONFIRM" != "DEPLOY" ]; then
  echo "❌ Cancelled."
  exit 1
fi

# Step 3: Push HEAD:main → triggers Vercel production deploy.
echo ""
echo "Step 3/3: Pushing to production..."
git push origin HEAD:main
echo "✅ Pushed. Vercel will deploy within ~60s."

# ── Explicit per-slug search-index submit (the batch-gap fix) ───────────────
if [ "$NO_SUBMIT" = "1" ]; then
  echo "Skipping explicit submit (--no-submit). post-deploy-index.yml safety net still fires."
  exit 0
fi

# Resolve shipped slugs.
if [ "${#SLUGS[@]}" -eq 0 ] && [ -n "$REMOTE_SHA" ] && [ "$REMOTE_SHA" != "$HEAD_SHA" ]; then
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    base=$(basename "$f" .md)
    SLUGS+=("$base")
  done < <(git diff --name-only --diff-filter=AM "$REMOTE_SHA..$HEAD_SHA" -- 'src/content/guides/*.md' 2>/dev/null || true)
fi

if [ "${#SLUGS[@]}" -eq 0 ]; then
  echo "No shipped guide slugs detected — nothing to submit explicitly."
  echo "(post-deploy-index.yml safety net still fires on the Vercel deploy event.)"
  exit 0
fi

echo ""
echo "Submitting ${#SLUGS[@]} shipped guide URL(s) to IndexNow + Google by slug:"
SUBMIT_ARGS=()
for s in "${SLUGS[@]}"; do
  SUBMIT_ARGS+=("--slug" "$s")
done

# Wait for production to return 200 before submitting (avoid wasting Google's
# 200/day budget + IndexNow noise on a URL still mid-ISR-warmup). Probe the
# first slug as a deploy-liveness signal.
PROBE_URL="https://petpalhq.com/guides/${SLUGS[0]}"
for i in $(seq 1 18); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "${PROBE_URL}?cb=$(date +%s)" 2>/dev/null || echo "000")
  echo "  deploy probe attempt=${i} code=${CODE}"
  [ "$CODE" = "200" ] && break
  sleep 10
done

node scripts/search-index/submit-urls.cjs "${SUBMIT_ARGS[@]}" || \
  echo "NOTE: explicit submit reported an issue (non-fatal) — post-deploy-index.yml safety net still covers this deploy."

echo ""
echo "✅ Deploy + explicit index submit complete."
echo "   Monitor CI: gh run list --branch main --limit 3"
