#!/usr/bin/env bash
# Regenerates the Claude Code OAuth token and writes it into Docker/.env.
#
# `claude setup-token` runs an interactive browser-based OAuth login and
# prints a token (sk-ant-oat...) at the end. This script captures that
# output, pulls the token out of it, and upserts CLAUDE_CODE_OAUTH_TOKEN in
# Docker/.env so the devcontainer picks it up on the next
# `docker compose up` (VS Code: "Dev Containers: Rebuild Container").
#
# It does not touch GITHUB_PERSONAL_ACCESS_TOKEN — set that by hand in
# Docker/.env (see Docker/.env.example).
#
# Ported from resume-2026/Docker/update-token.sh (M0.14).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

if ! command -v claude >/dev/null 2>&1; then
  echo "error: 'claude' CLI not found on PATH. Install it first (see https://docs.claude.com/claude-code)." >&2
  exit 1
fi

echo "Generating a new Claude Code OAuth token (claude setup-token)..."
echo "This opens a browser login flow — follow the prompts."

OUTPUT_FILE="$(mktemp)"
trap 'rm -f "$OUTPUT_FILE"' EXIT

# tee to the terminal so the user still sees/can complete the interactive flow.
claude setup-token | tee "$OUTPUT_FILE"

TOKEN="$(grep -oE 'sk-ant-oat[0-9]+-[A-Za-z0-9_-]+' "$OUTPUT_FILE" | tail -n1 || true)"

if [ -z "$TOKEN" ]; then
  echo "error: could not find a token in 'claude setup-token' output." >&2
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  cp "$SCRIPT_DIR/.env.example" "$ENV_FILE"
fi

if grep -q '^CLAUDE_CODE_OAUTH_TOKEN=' "$ENV_FILE"; then
  sed -i.bak "s|^CLAUDE_CODE_OAUTH_TOKEN=.*|CLAUDE_CODE_OAUTH_TOKEN=${TOKEN}|" "$ENV_FILE"
  rm -f "$ENV_FILE.bak"
else
  echo "CLAUDE_CODE_OAUTH_TOKEN=${TOKEN}" >>"$ENV_FILE"
fi

echo "Updated $ENV_FILE with a new token."
