#!/bin/sh
# Sorrel & Salt — display bring-up for the `headed` Dockerfile.e2e stage
# (MB.23). Only the `playwright-server` compose service uses this as its
# entrypoint; `e2e`-stage consumers (CI, `make docker-e2e`) never build the
# `headed` stage and never run this file.
#
# Raises a virtual display, a window manager (so the Chromium and Inspector
# windows are movable rather than overlapping unmanaged), and a VNC-over-
# noVNC bridge so that display is reachable from an ordinary browser tab at
# :7900 — then hands off to whatever command the service (or a
# `docker compose exec`) actually asked for, unchanged. That handoff is what
# keeps MB.22's `playwright run-server` path identical to before this task.
set -e

Xvfb :99 -screen 0 1600x1000x24 -ac &
openbox &
x11vnc -display :99 -forever -shared -nopw -quiet &
websockify --web=/usr/share/novnc 7900 localhost:5900 &

# Also declared as `environment: DISPLAY: ':99'` on the `playwright-server`
# compose service — that's the copy a later `docker compose exec` (make
# docker-codegen) actually reads, since an exec'd process gets the
# container's *initial* environment, not a var this script's own shell
# exports at runtime. Exported here too so the command this entrypoint
# itself launches (`exec "$@"` below, e.g. `playwright run-server`) has it
# even without compose's `environment:` block, in case this image is ever
# run directly.
export DISPLAY=:99

# `-ac` on Xvfb, not an XAUTHORITY shared between this (root) entrypoint and
# whatever uid `docker compose exec -u` later attaches as (make
# docker-codegen) — without it X rejects the second user as an unauthorised
# client. Acceptable because :99 is only reachable through the published
# 7900/4444 ports on a container-local display, not a shared host one.
exec "$@"
