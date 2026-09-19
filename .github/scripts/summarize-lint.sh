#!/usr/bin/env bash
# Moved verbatim out of .github/workflows/lint.yml's "Summarize output" step
# when MB.32 collapsed the five check workflows onto checks.yml's one matrix.
#
# oxlint prints one line per finding (`<file>:<line>:<col>: <severity> ...`)
# and no trailing summary of its own — count severities/files ourselves.
# Warnings don't fail the build (exit 0), so checks.yml runs this regardless of
# outcome to surface warning counts even on a technical pass.
#
# Reads /app/output.log — the tee'd output of the matrix leg's own run step —
# and appends `summary` and `details` to $GITHUB_OUTPUT for the job-summary
# and pr-comment composite actions to render. Deliberately no `set -e`: the
# body leans on `cmd || true` and on `[ "$n" -eq 1 ] && word=singular`, whose
# false branch exits non-zero.

errors=$(grep -cE '^[^:]+:[0-9]+:[0-9]+: error' /app/output.log || true)
warnings=$(grep -cE '^[^:]+:[0-9]+:[0-9]+: warning' /app/output.log || true)
files=$(grep -E '^[^:]+:[0-9]+:[0-9]+: (error|warning)' /app/output.log | cut -d: -f1 | sort -u | wc -l | tr -d ' ' || true)
error_word="errors"; [ "$errors" -eq 1 ] && error_word="error"
warning_word="warnings"; [ "$warnings" -eq 1 ] && warning_word="warning"
if [ "$errors" -eq 0 ] && [ "$warnings" -eq 0 ]; then
  summary="0 errors, 0 warnings"
else
  file_word="files"; [ "$files" -eq 1 ] && file_word="file"
  summary="$errors $error_word, $warnings $warning_word across $files $file_word"
fi
echo "summary=$summary" >> "$GITHUB_OUTPUT"

# Collapsible, per-finding breakdown (capped, with a pointer to the
# full raw log below for anything past the cap).
max=15
matches=$(grep -E '^[^:]+:[0-9]+:[0-9]+: (error|warning)' /app/output.log || true)
delim="ghadelim_$RANDOM$RANDOM"
{
  echo "details<<$delim"
  if [ -n "$matches" ]; then
    total=$(echo "$matches" | wc -l | tr -d ' ')
    echo '<details><summary>Issues</summary>'
    echo ''
    echo "$matches" | head -n "$max" | sed -E \
      -e 's/^([^:]+):([0-9]+):([0-9]+): error:? ?(.*)$/- **\1:\2:\3** — ❌ \4/' \
      -e 's/^([^:]+):([0-9]+):([0-9]+): warning (.*)$/- **\1:\2:\3** — ⚠️ \4/'
    if [ "$total" -gt "$max" ]; then
      echo ''
      echo "*…and $((total - max)) more — see full output below.*"
    fi
    echo ''
    echo '</details>'
  fi
  echo "$delim"
} >> "$GITHUB_OUTPUT"
