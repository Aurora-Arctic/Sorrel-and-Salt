# DeleteWorkspaceButton

`src/components/DeleteWorkspaceButton/` — Delete Coven, on the coven index page (M6.14). A client
component taking the workspace's `workspaceId` and `name`.

## Contracts

- **It asks first.** It is a `ConfirmedAction` ([`user-list.md`](user-list.md)): a modal whose
  question names the coven in bold and says its ingredients and its grimoire become inaccessible to
  every member, other owners included. A warning says nothing is destroyed, which is what a
  restore by hand rests on.
- **One GraphQL mutation, `deleteWorkspace(workspaceId)`**, through the same path as every write
  from the browser (CLAUDE.md rule 1). A refusal, such as a second owner deleting first, is said
  in a callout under the button, which has the focus back
  ([`click-feedback.md`](click-feedback.md), M12.31). A success announces nothing, since it
  leaves the page.
- **A success goes to the coven landing** (`/coven`) with `router.replace`, then `router.refresh()`,
  as Leave Coven does ([`leave-workspace-button.md`](leave-workspace-button.md)). A re-read would
  be a 404, since the deleting user has no membership of the coven any more.
- **The page decides who sees it**, from `rolePermits(role, { workspace: ['delete'] })`, never from a
  rank. The service checks the same permission whatever the page shows.

The optional `inModal` prop asks the confirmation over the dialog the button sits in rather than
opening a second modal on top, and `onlyOwner` leaves "other owners included" out of the question,
since there are none. With `inModal`, a refusal is a plain error `Notice` inside the dialog,
on its own line above the dialog's buttons (the shared `.modal__actions` style), with no badge (the owner's call, 2026-10-20). The only owner's guided exit
(M6.16, [`leave-workspace-button.md`](leave-workspace-button.md)) passes both.

## Styling

None of its own: the directory has no `index.scss`. The button is the `.btn.btn--destructive`
primitive, and the confirmation is `ConfirmedAction`'s modal ([`user-list.md`](user-list.md)).
Where it sits is the page's: the coven index gives it a section of its own, "Delete This Coven",
shown to owners only, with a sentence saying what it does (MB.119's review), so it is never beside
Leave Coven.

## Stories

`index.stories.tsx` (`Coven / Delete Coven Button`) has `States`, with a control that chooses Resting, Asking To Confirm, Asking The Only Owner, Refused After Confirming and Asking Over A Dialog It Sits In. In the workshop the call reaches no server, so confirming shows the
failure. The button in its page is the coven index's, which reads the session and so has no
story.

## Testing

`tests/components/DeleteWorkspaceButton/index.test.tsx` asserts that nothing is sent until the
confirmation, then that the named coven's id is sent and the landing replaces the page, and that a refusal is said under the button, with the focus on it and the badge
bringing it back, and the page stays. The only owner's route through it is
`tests/components/LeaveWorkspaceButton/owner-exit.test.tsx`; the page's choice to show it by
permission is `tests/app/(shell)/coven/page.test.tsx`.
