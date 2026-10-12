# DeleteWorkspaceButton

`src/components/DeleteWorkspaceButton/` — Delete Workspace, on the coven index page (M6.14). A client
component taking the workspace's `workspaceId` and `name`.

## Contracts

- **It asks first.** It is a `ConfirmedAction` ([`user-list.md`](user-list.md)): a modal whose
  question names the coven in bold and says its ingredients and its grimoire become inaccessible to
  every member, other owners included. A warning says nothing is destroyed, which is what a
  restore by hand rests on.
- **One GraphQL mutation, `deleteWorkspace(workspaceId)`**, through the same path as every write
  from the browser (CLAUDE.md rule 1). A refusal, such as a second owner deleting first, is said
  above the page's buttons by `ActionFailure` (see [`leave-workspace-button.md`](leave-workspace-button.md)).
- **A success leaves the page** with `router.replace('/')`. A re-read would be a 404, since the
  deleting user has no membership of the coven any more.
- **The page decides who sees it**, from `rolePermits(role, { workspace: ['delete'] })`, never from a
  rank. The service checks the same permission whatever the page shows.
