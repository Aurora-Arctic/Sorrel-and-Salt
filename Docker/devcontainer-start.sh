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

# Git without an editor: VS Code would copy the host's ~/.gitconfig and forward
# its SSH agent, so with VS Code closed these do it (claude-docs/docker.md). An
# existing ~/.gitconfig, VS Code's copy included, is left alone.
[ -e ~/.gitconfig ] || [ ! -f ~/.host-gitconfig ] || cp ~/.host-gitconfig ~/.gitconfig
# Docker Desktop's forwarded agent socket arrives owned by root.
[ ! -S /run/host-services/ssh-auth.sock ] || sudo -n chmod a+rw /run/host-services/ssh-auth.sock || true

exec sleep infinity
