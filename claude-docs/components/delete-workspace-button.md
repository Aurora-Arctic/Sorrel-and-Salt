# DeleteWorkspaceButton

`src/components/DeleteWorkspaceButton/` — Delete Coven, on the coven index page. A client
component taking the workspace's `workspaceId` and `name`.

## Contracts

- **It asks first.** It is a `ConfirmedAction` ([`user-list.md`](user-list.md)): a modal whose
  question names the coven in bold and says its ingredients and its grimoire become inaccessible to
  every member, other stewards included. A warning says nothing is destroyed, which is what a
  restore by hand rests on.
- **One GraphQL mutation, `deleteWorkspace(workspaceId)`**, through the same path as every write
  from the browser (CLAUDE.md rule 1). A refusal, such as a second steward deleting first, is said
  in a callout under the button, which has the focus back
  ([`click-feedback.md`](click-feedback.md)). A success announces nothing, since it
  leaves the page.
- **A success goes to the coven landing** (`/coven`) with `router.replace`, then `router.refresh()`,
  as Leave Coven does ([`leave-workspace-button.md`](leave-workspace-button.md)). A re-read would
  be a 404, since the deleting user has no membership of the coven any more.
- **The page decides who sees it**, from `canDeleteCoven` of `covenAccessOf(role)`, never from a
  rank. The service checks the same permission whatever the page shows.
- **Placement**: the coven index gives it a section of its own, "Delete This Coven", shown to
  stewards only, so it is never beside Leave Coven.

`inModal` asks the confirmation over the dialog the button sits in rather than opening a second
modal on top; a refusal is then a plain error `Notice` inside the dialog, above its buttons, with no
badge. `onlyOwner` leaves "other stewards included" out of the question, since there are none. The
only steward's guided exit ([`leave-workspace-button.md`](leave-workspace-button.md)) passes both.
