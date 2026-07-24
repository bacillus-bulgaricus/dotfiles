#!/usr/bin/env bash
# Canonical bootstrap for applying this repository with chezmoi.
# Usage: ./install.sh
set -euo pipefail

DOTFILES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v chezmoi >/dev/null 2>&1; then
    command -v curl >/dev/null 2>&1 || { echo "curl is required to install chezmoi" >&2; exit 1; }
    sh -c "$(curl -fsLS https://get.chezmoi.io)" -- -b "$HOME/.local/bin"
    export PATH="$HOME/.local/bin:$PATH"
fi

command -v chezmoi >/dev/null 2>&1 || { echo "chezmoi installation failed" >&2; exit 1; }
chezmoi init --source "$DOTFILES_DIR" --apply
