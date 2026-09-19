#!/bin/sh
# Display bring-up for Dockerfile.e2e's `headed` stage: Xvfb, a window manager
# (so windows are movable) and a VNC/noVNC bridge on :7900, then exec the
# service's command.
set -e

Xvfb :99 -screen 0 1600x1000x24 -ac &
openbox &
x11vnc -display :99 -forever -shared -nopw -quiet &
websockify --web=/usr/share/novnc 7900 localhost:5900 &

# Also declared on the compose service, since an exec'd process gets the
# container's initial environment; exported here for a bare `docker run`.
export DISPLAY=:99

# `-ac` on Xvfb: `docker compose exec -u` attaches as another uid, which X
# would otherwise reject. :99 is container-local.
exec "$@"
