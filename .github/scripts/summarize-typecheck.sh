#!/usr/bin/env bash
# Moved verbatim out of .github/workflows/typecheck.yml's "Summarize output"
# step when MB.32 collapsed the five check workflows onto checks.yml's one
# matrix.
#
# tsc prints one line per error (`<file>(<line>,<col>): error TS<code>: ...`)
# and no trailing summary of its own — count errors/files ourselves.
#
# Reads /app/output.log — the tee'd output of the matrix leg's own run step —
# and appends `summary` and `details` to $GITHUB_OUTPUT for the job-summary
# and pr-comment composite actions to render. Deliberately no `set -e`: the
# body leans on `cmd || true` and on `[ "$n" -eq 1 ] && word=singular`, whose
# false branch exits non-zero.

errors=$(grep -cE '^[^(]+\([0-9]+,[0-9]+\): error TS[0-9]+:' /app/output.log || true)
files=$(grep -E '^[^(]+\([0-9]+,[0-9]+\): error TS[0-9]+:' /app/output.log | sed -E 's/\([0-9]+,[0-9]+\).*$//' | sort -u | wc -l | tr -d ' ' || true)
if [ "$errors" -eq 0 ]; then
  summary="0 errors"
else
  error_word="errors"; [ "$errors" -eq 1 ] && error_word="error"
  file_word="files"; [ "$files" -eq 1 ] && file_word="file"
  summary="$errors $error_word across $files $file_word"
fi
echo "summary=$summary" >> "$GITHUB_OUTPUT"

# Collapsible, per-error breakdown (capped, with a pointer to the
# full raw log below for anything past the cap).
max=15
matches=$(grep -E '^[^(]+\([0-9]+,[0-9]+\): error TS[0-9]+:' /app/output.log || true)
delim="ghadelim_$RANDOM$RANDOM"
{
  echo "details<<$delim"
  if [ -n "$matches" ]; then
    total=$(echo "$matches" | wc -l | tr -d ' ')
    echo '<details><summary>Issues</summary>'
    echo ''
    echo "$matches" | head -n "$max" | sed -E 's/^([^(]+)\(([0-9]+),([0-9]+)\): error (TS[0-9]+): (.*)$/- **\1:\2:\3** — ❌ \4: \5/'
    if [ "$total" -gt "$max" ]; then
      echo ''
      echo "*…and $((total - max)) more — see full output below.*"
    fi
    echo ''
    echo '</details>'
  fi
  echo "$delim"
} >> "$GITHUB_OUTPUT"
