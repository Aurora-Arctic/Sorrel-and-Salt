# LeaveWorkspaceButton

`src/components/LeaveWorkspaceButton/` — Leave Workspace, on the coven index page (M6.15). A client
component taking the workspace's `workspaceId` and `name`.

## Contracts

- **It asks first.** It is a `ConfirmedAction` ([`user-list.md`](user-list.md)): a modal whose
  question names the coven in bold and says the member loses access until an owner invites them back.
- **One GraphQL mutation, `leaveWorkspace(workspaceId)`**, through the same path as every write from
  the browser (CLAUDE.md rule 1). It names no user: the service leaves the caller's own seat and has
  no argument to name another's. A refusal is said above the page's buttons, under the "Your
  Membership" heading, through `ActionFailure` (`src/components/WorkspaceActions/`), which the page
  wraps both Leave and Delete in. Rendered outside it, the button says its refusal beside itself.
- **The last owner is refused by the service** (M6.8's guard), and the refusal shows here as it
  stands. M6.16 replaces it with the guided exit; the control stays visible and enabled for every
  role meanwhile.
- **A success goes to the home page** with `router.replace('/')`: a re-read of the coven would be a
  404, since the leaver has no seat in it any more.
- **Every role sees it.** The page shows it unconditionally, so a viewer, who cannot open the members
  page, can still go.
