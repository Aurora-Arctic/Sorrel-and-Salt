#!/bin/sh
# Container entrypoint: installs packages when package-lock.json has changed,
# then runs the service's command. POSIX sh, because the image is Alpine.
#
# Each service keeps `/app/node_modules` in its own named volume, and Docker
# fills a volume from the image only when the volume is first created. After
# that the volume hides the rebuilt image's packages, so a branch that adds a
# package would start without it. This script closes that gap: it compares the
# lock file's hash with the one saved beside the packages, and runs `npm ci`
# only when they differ. Dockerfile.node and Dockerfile.e2e save the same hash
# after their own `npm ci`, so a fresh volume copies it and installs nothing.
#
# `npm ci`, never `npm i`, as in Dockerfile.node. `npm ci` empties what is
# inside `node_modules` but not the directory itself, so it works on a mount
# point. It empties the fingerprint too, so that is written after the install.
# A failed install stops the container (`set -e`) and leaves no fingerprint,
# so the next start tries again.
set -e

cd /app

lock_hash=$(sha256sum package-lock.json | cut -d ' ' -f 1)
saved_hash=$(cat node_modules/.lock-sha256 2>/dev/null || true)

if [ "$lock_hash" != "$saved_hash" ]; then
  echo "ensure-deps: package-lock.json changed since the last install; running npm ci"
  npm ci
  printf '%s\n' "$lock_hash" > node_modules/.lock-sha256
fi

exec "$@"
