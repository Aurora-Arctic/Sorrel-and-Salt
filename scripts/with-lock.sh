#!/bin/sh
# Runs a command under a file lock, unless an ancestor process already holds that lock.
# A plain `flock` here deadlocks when the caller is itself wrapped in `flock` on the same
# file (the outer holds, the inner waits forever), which `flock … npm test` does.
set -eu
lock=$1
shift
: >>"$lock"
# Without /proc (macOS) the ancestor check is skipped and the lock is taken as before.
[ -r /proc/locks ] || exec flock "$lock" "$@"
inode=$(stat -c %i "$lock")
holders=$(awk -v inode=":$inode " 'index($0, inode) && $2 == "FLOCK" { print $5 }' /proc/locks)
pid=$$
while [ "$pid" -gt 1 ]; do
  for holder in $holders; do
    [ "$holder" = "$pid" ] && exec "$@"
  done
  # The parent pid is the second field after the ')' that closes the command name, which
  # may itself hold spaces (npm retitles itself "npm sh: …").
  pid=$(sed 's/.*) //' "/proc/$pid/stat" 2>/dev/null | cut -d' ' -f2 || echo 0)
  pid=${pid:-0}
done
exec flock "$lock" "$@"
