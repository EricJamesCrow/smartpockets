#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f ".env.local" ]; then
  if [ -f ".env.example" ]; then
    cp .env.example .env.local
    echo "Created .env.local from .env.example"
  else
    echo "Missing .env.example. Create .env.local manually."
  fi
fi

link_env() {
  local app_dir="$1"
  local link_path="$app_dir/.env.local"
  local target="../../.env.local"

  if [ -e "$link_path" ] && [ ! -L "$link_path" ]; then
    echo "Skipped $link_path (already exists and is not a symlink)"
    return
  fi

  ln -sf "$target" "$link_path"
  echo "Linked $link_path -> $target"
}

link_env "apps/app"
link_env "packages/backend"
link_env "apps/web"
