#!/usr/bin/env bash
# Compatibility entry point. install.sh is the canonical installer.
set -euo pipefail

DOTFILES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$DOTFILES_DIR/install.sh" "$@"
