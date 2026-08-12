#!/usr/bin/env bash
#
# Pinned, checksum-verified, retrying installer for the Vale linter binary.
#
# WHY THIS EXISTS (2026-08-12) — ported from SHE PR #547
# -----------------------------------------------------
# Vale used to arrive via the `@vvago/vale` npm devDependency. That package
# ships a postinstall script (`node index.js`) that downloads the real Vale
# binary from GitHub releases. Two properties made it an outage vector:
#
#   1. It ran on EVERY `npm install` / `npm ci` that does not pass
#      `--ignore-scripts` — including Vercel's default PRODUCTION install
#      (vercel.json sets no `installCommand`) and this repo's CI guards —
#      even though nothing in the production build path invokes Vale. Vale is
#      a CI prose gate; the shipped pages do not need it.
#   2. Its downloader (node_modules/@vvago/vale/index.js `fetchURL`) has NO
#      retry and NO checksum verification. A single transient HTTP 503 or
#      ECONNRESET rejects the promise, the postinstall exits 1, and the whole
#      install fails.
#
# On smarthome-explorer-blog that took down four consecutive Production
# deploys on main (SHE issues #538 / #541 / #545 / #546). On THIS repo it
# fired on 2026-08-12: a Dead-ASIN guard run died at `npm ci` with an
# ECONNRESET out of the same postinstall (a re-run passed — the failure mode
# is transient network weather, which is exactly why it is unacceptable in a
# required-check path).
#
# The dependency is now gone from package.json, so no install of this repo
# can touch Vale. CI fetches the SAME binary from the SAME GitHub release the
# npm wrapper used, but with the three things the wrapper lacked: an exact
# version pin, a sha256 pin, and retries.
#
# PARITY NOTE: `@vvago/vale@3.12.0`'s postinstall resolved to
#   https://github.com/errata-ai/vale/releases/download/v3.12.0/vale_3.12.0_<platform>.tar.gz
# which is the same artifact this script fetches (errata-ai/vale now redirects
# to vale-cli/vale). Same version, same bytes — the gate's behaviour is
# unchanged; only the delivery path is hardened.
#
# VERSION CHOICE: 3.12.0 is this repo's declared + lockfile version. Note the
# old CI step ran `npm install --save-dev @vvago/vale` with NO specifier, so
# it silently floated to npm `latest` (3.17.1 as of 2026-08-12) while local
# checkouts ran 3.12.0 — the required gate and the dev machine were on
# different linters. Pinning ends that drift. Verified before pinning: 3.12.0
# and 3.17.1 emit byte-identical `--output=line` results on this repo's whole
# src/content/guides/ corpus, both clean (0 alerts, exit 0) and with planted
# Banned-Testing / Banned-Slop violations (3 alerts, exit 1). Pinning the
# declared version therefore changes no gate verdict in either direction.
#
# USAGE
#   npm run vale:install          # idempotent; no-ops when already correct
#   bash scripts/gates/install-vale.sh
#
# The binary lands in .vale-bin/vale (gitignored). `npm run lint:vale` and
# .github/workflows/vale-lint.yml both resolve it from there. To bump Vale:
# change VALE_VERSION, then replace the checksums block with the contents of
#   https://github.com/vale-cli/vale/releases/download/v<VERSION>/vale_<VERSION>_checksums.txt

set -euo pipefail

# ─── PIN ──────────────────────────────────────────────────────────────────
VALE_VERSION="3.12.0"

# sha256 of each release tarball, verbatim from the upstream
# vale_3.12.0_checksums.txt. A mismatch is a hard failure — never a warning.
read -r -d '' VALE_CHECKSUMS <<'CHECKSUMS' || true
3f4ea05cd1f2291b660ecf11a77cbb6b544b0f3b780604ad183f63285611321b  vale_3.12.0_Linux_64-bit.tar.gz
2034e7d17202114afb5f40fb2ba890e4ed0c5d6bee12e8499d54fbe262ae8b9e  vale_3.12.0_Linux_arm64.tar.gz
f369005d800257ccefe84c0fd4513973c58dcf2ffd3119c9817fe869f36a0c24  vale_3.12.0_macOS_64-bit.tar.gz
36b66e71a56b97e288ae479a9b205687b13361f08e7d9ac016fe9d4fdf72eace  vale_3.12.0_macOS_arm64.tar.gz
CHECKSUMS

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BIN_DIR="$REPO_ROOT/.vale-bin"
BIN_PATH="$BIN_DIR/vale"

# ─── IDEMPOTENCE ──────────────────────────────────────────────────────────
# Already have the pinned version? Do nothing — no network, no noise. This is
# what makes it safe to chain in front of `lint:vale` on every local run.
if [ -x "$BIN_PATH" ]; then
  CURRENT="$("$BIN_PATH" --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1 || true)"
  if [ "$CURRENT" = "$VALE_VERSION" ]; then
    echo "vale $VALE_VERSION already installed at .vale-bin/vale"
    exit 0
  fi
  echo "vale at .vale-bin/vale is '$CURRENT', want '$VALE_VERSION' — reinstalling."
fi

# ─── PLATFORM ─────────────────────────────────────────────────────────────
UNAME_S="$(uname -s)"
UNAME_M="$(uname -m)"
case "$UNAME_S" in
  Linux)  OS="Linux" ;;
  Darwin) OS="macOS" ;;
  *) echo "install-vale: unsupported OS '$UNAME_S'. Install Vale manually (brew install vale) and ensure it is on PATH." >&2; exit 1 ;;
esac
case "$UNAME_M" in
  x86_64|amd64)  ARCH="64-bit" ;;
  arm64|aarch64) ARCH="arm64" ;;
  *) echo "install-vale: unsupported arch '$UNAME_M'. Install Vale manually (brew install vale) and ensure it is on PATH." >&2; exit 1 ;;
esac

ASSET="vale_${VALE_VERSION}_${OS}_${ARCH}.tar.gz"
URL="https://github.com/vale-cli/vale/releases/download/v${VALE_VERSION}/${ASSET}"

EXPECTED_SHA="$(printf '%s\n' "$VALE_CHECKSUMS" | awk -v a="$ASSET" '$2 == a { print $1 }')"
if [ -z "$EXPECTED_SHA" ]; then
  echo "install-vale: no pinned sha256 for '$ASSET'. Refusing to install an unverified binary." >&2
  exit 1
fi

# ─── FETCH (with retries) ─────────────────────────────────────────────────
TMP_DIR="$(mktemp -d)"
# shellcheck disable=SC2064
trap "rm -rf '$TMP_DIR'" EXIT

TARBALL="$TMP_DIR/$ASSET"
echo "Fetching Vale $VALE_VERSION ($OS/$ARCH) from GitHub releases..."

ATTEMPTS=5
n=1
while :; do
  # --retry covers transient 5xx/connection-reset WITHIN one curl invocation;
  # the outer loop covers the cases curl gives up on. This is precisely the
  # resilience @vvago/vale's one-shot https.get lacked.
  if curl --fail --location --silent --show-error \
          --retry 5 --retry-delay 2 --retry-connrefused --retry-all-errors \
          --connect-timeout 20 --max-time 300 \
          --output "$TARBALL" "$URL"; then
    break
  fi
  if [ "$n" -ge "$ATTEMPTS" ]; then
    echo "install-vale: download failed after $ATTEMPTS attempts: $URL" >&2
    exit 1
  fi
  echo "  attempt $n/$ATTEMPTS failed; retrying in $((n * 5))s..." >&2
  sleep "$((n * 5))"
  n=$((n + 1))
done

# ─── VERIFY ───────────────────────────────────────────────────────────────
if command -v sha256sum >/dev/null 2>&1; then
  ACTUAL_SHA="$(sha256sum "$TARBALL" | awk '{print $1}')"
elif command -v shasum >/dev/null 2>&1; then
  ACTUAL_SHA="$(shasum -a 256 "$TARBALL" | awk '{print $1}')"
else
  echo "install-vale: neither sha256sum nor shasum available — cannot verify download." >&2
  exit 1
fi

if [ "$ACTUAL_SHA" != "$EXPECTED_SHA" ]; then
  echo "install-vale: SHA-256 MISMATCH for $ASSET" >&2
  echo "  expected: $EXPECTED_SHA" >&2
  echo "  actual:   $ACTUAL_SHA" >&2
  exit 1
fi
echo "  sha256 verified: $ACTUAL_SHA"

# ─── INSTALL ──────────────────────────────────────────────────────────────
mkdir -p "$BIN_DIR"
tar -xzf "$TARBALL" -C "$TMP_DIR" vale
mv -f "$TMP_DIR/vale" "$BIN_PATH"
chmod +x "$BIN_PATH"

INSTALLED="$("$BIN_PATH" --version 2>&1 | head -1)"
echo "Installed: $INSTALLED -> .vale-bin/vale"
