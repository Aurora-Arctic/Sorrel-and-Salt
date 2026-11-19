#!/bin/sh
# Starts the `lighthouse-chrome` service's Chromium with a DevTools port that
# `scripts/lighthouse-seo.mjs` can reach from the devcontainer (MB.84).
#
# Chromium binds its DevTools port to loopback whatever it is told, so the
# Node forwarder Docker/tcp-forward.cjs publishes it on 0.0.0.0:9222 and
# Chromium itself listens on 127.0.0.1:9223.
set -e

# Playwright's image keeps one Chromium per revision under /ms-playwright. The
# directory's name and the `chrome-linux` / `chrome-linux64` folder inside it
# change with the version and the CPU, so the binary is found, never named.
# `chromium-*` skips `chromium_headless_shell-*`, which has no `--headless=new`.
CHROME=$(find /ms-playwright -path '*/chromium-*/*' -type f -name chrome | head -n 1)
if [ -z "$CHROME" ]; then
  echo "lighthouse-chrome: no Chromium under /ms-playwright" >&2
  exit 1
fi

node /tcp-forward.cjs 9222 9223 &

# `exec`, so the container lives and dies with Chromium. `--no-sandbox`: the
# container runs as root, and Chromium refuses to start sandboxed as root.
# `--remote-allow-origins=*`: Chromium rejects DevTools WebSocket upgrades from
# an unlisted origin, and Lighthouse's connection carries none it can list.
exec "$CHROME" \
  --headless=new \
  --no-sandbox \
  --disable-gpu \
  --user-data-dir=/tmp/lighthouse-chrome-profile \
  --remote-debugging-address=127.0.0.1 \
  --remote-debugging-port=9223 \
  --remote-allow-origins=* \
  about:blank
