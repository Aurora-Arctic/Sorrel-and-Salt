#!/usr/bin/env bash
# Moved verbatim out of .github/workflows/format.yml's "Summarize output" step
# when MB.32 collapsed the five check workflows onto checks.yml's one matrix.
#
# prettier --check prints one `[warn] <file>` line per non-conforming file plus
# a trailing summary sentence — count the file lines directly rather than parse
# the sentence (singular/plural wording differs).
#
# Reads /app/output.log — the tee'd output of the matrix leg's own run step —
# and appends `summary` and `details` to $GITHUB_OUTPUT for the job-summary
# and pr-comment composite actions to render. Deliberately no `set -e`: the
# body leans on `cmd || true` and on `[ "$n" -eq 1 ] && word=singular`, whose
# false branch exits non-zero.

files=$(grep -E '^\[warn\] ' /app/output.log | grep -v 'Code style issues found' | wc -l | tr -d ' ' || true)
if [ "$files" -eq 0 ]; then
  summary="0 files need formatting"
else
  file_word="files"; verb="need"
  [ "$files" -eq 1 ] && file_word="file" && verb="needs"
  summary="$files $file_word $verb formatting"
fi
echo "summary=$summary" >> "$GITHUB_OUTPUT"

# Collapsible list of non-conforming files (capped, with a pointer
# to the full raw log below for anything past the cap).
max=15
file_list=$(grep -E '^\[warn\] ' /app/output.log | grep -v 'Code style issues found' | sed -E 's/^\[warn\] //' || true)
delim="ghadelim_$RANDOM$RANDOM"
{
  echo "details<<$delim"
  if [ -n "$file_list" ]; then
    total=$(echo "$file_list" | wc -l | tr -d ' ')
    echo '<details><summary>Files</summary>'
    echo ''
    echo "$file_list" | head -n "$max" | sed -E 's/^(.*)$/- `\1`/'
    if [ "$total" -gt "$max" ]; then
      echo ''
      echo "*…and $((total - max)) more.*"
    fi
    echo ''
    echo '</details>'
  fi
  echo "$delim"
} >> "$GITHUB_OUTPUT"
