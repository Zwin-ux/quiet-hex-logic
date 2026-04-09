#!/usr/bin/env bash
set -euo pipefail

# Skeleton script.
# Replace AGENT_CMD with your actual tool invocation.
# Examples:
#   codex exec --prompt-file prompts/DAILY_UPDATE.prompt.md
#   claude -p "$(cat prompts/DAILY_UPDATE.prompt.md)"
#   opencode run prompts/DAILY_UPDATE.prompt.md

DATE_STR="$(date +%F)"
TARGET="brain/daily/${DATE_STR}.md"

echo "Preparing daily brain update for ${DATE_STR}"

if [ -f "${TARGET}" ]; then
  echo "Daily note already exists: ${TARGET}"
  exit 0
fi

cp brain/daily/DAILY_TEMPLATE.md "${TARGET}"

cat <<'EOF'
Next step:
1. Run your coding agent with prompts/DAILY_UPDATE.prompt.md
2. Let it fill today's daily note and patch volatile brain files
3. Review diffs before committing
EOF
