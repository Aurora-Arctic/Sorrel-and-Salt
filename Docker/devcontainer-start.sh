#!/bin/sh
# The devcontainer service's command, run by ensure-deps.sh. Starts the
# forwarder that lets the host reach the Plannotator Inbox, then idles as the
# container's main process; the editor runs `npm run dev` itself.
#
# The forwarder starts here, not from devcontainer.json's `postStartCommand`,
# because a process a lifecycle hook leaves behind does not reliably survive the
# Dev Containers CLI. The loop restarts it if it ever exits.
(
  while :; do
    node /app/Docker/tcp-forward.cjs 43502 43501
    sleep 1
  done
) &

exec sleep infinity
