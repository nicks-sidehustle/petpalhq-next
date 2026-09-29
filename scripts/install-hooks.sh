#!/usr/bin/env bash
# Opt-in: install the post-merge hook (runs scripts/cleanup-worktrees.sh on main).
# Respects core.hooksPath; never overwrites an existing post-merge hook (chains onto it).
set -euo pipefail

HOOKS_DIR="$(git rev-parse --git-path hooks)"
mkdir -p "$HOOKS_DIR"
TARGET="$HOOKS_DIR/post-merge"
MARK="# >>> petpalhq cleanup-worktrees >>>"
BLOCK="$MARK
root=\"\$(git rev-parse --show-toplevel 2>/dev/null || true)\"
[ -n \"\$root\" ] && [ -f \"\$root/scripts/hooks/post-merge\" ] && bash \"\$root/scripts/hooks/post-merge\" \"\$@\" || true
# <<< petpalhq cleanup-worktrees <<<"

if [ -f "$TARGET" ]; then
  if grep -qF "$MARK" "$TARGET"; then
    echo "install-hooks: already installed in $TARGET"; exit 0
  fi
  if ! head -1 "$TARGET" | grep -Eq '^#!.*(sh|bash|zsh)( |$)'; then
    echo "install-hooks: $TARGET is not a shell script; not touching it. Chain manually." >&2; exit 1
  fi
  printf '\n%s\n' "$BLOCK" >> "$TARGET"
  echo "install-hooks: appended to existing $TARGET"
else
  printf '#!/usr/bin/env bash\n%s\n' "$BLOCK" > "$TARGET"
  echo "install-hooks: created $TARGET"
fi
chmod +x "$TARGET"
