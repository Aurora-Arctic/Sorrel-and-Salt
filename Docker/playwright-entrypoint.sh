#!/bin/sh
# Sorrel & Salt — display bring-up for Dockerfile.e2e's `headed` stage. Only
# the `playwright-server` compose service runs it; CI and `make docker-e2e`
# build `target: e2e` and never see this file.
#
# Raises a virtual display, a window manager (so the Chromium and Inspector
# windows are movable rather than overlapping unmanaged) and a VNC/noVNC
# bridge reachable from an ordinary browser tab at :7900 — then hands off to
# whatever command the service asked for, unchanged.
set -e

Xvfb :99 -screen 0 1600x1000x24 -ac &
openbox &
x11vnc -display :99 -forever -shared -nopw -quiet &
websockify --web=/usr/share/novnc 7900 localhost:5900 &

# Also declared on the `playwright-server` compose service, and that is the
# copy a later `docker compose exec` reads — an exec'd process gets the
# container's *initial* environment, not what this shell exports. Exported
# here as well so a bare `docker run` of this image still works.
export DISPLAY=:99

# `-ac` on Xvfb rather than an XAUTHORITY shared between this (root)
# entrypoint and whatever uid `docker compose exec -u` attaches as — without
# it X rejects the second user as unauthorised. Acceptable because :99 is a
# container-local display, reachable only through the published ports.
exec "$@"
