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
  above the page's buttons by `ActionFailure` (see [`leave-workspace-button.md`](leave-workspace-button.md)).
- **A success leaves the page** with `router.replace('/')`. A re-read would be a 404, since the
  deleting user has no membership of the coven any more.
- **The page decides who sees it**, from `rolePermits(role, { workspace: ['delete'] })`, never from a
  rank. The service checks the same permission whatever the page shows.

The optional `inModal` prop asks the confirmation over the dialog the button sits in rather than
opening a second modal on top, and `onlyOwner` leaves "other owners included" out of the question,
since there are none. The only owner's guided exit (M6.16,
[`leave-workspace-button.md`](leave-workspace-button.md)) passes both.

## Styling

None of its own: the directory has no `index.scss`. The button is the `.btn.btn--destructive`
primitive, and the confirmation is `ConfirmedAction`'s modal ([`user-list.md`](user-list.md)).
Where it sits is the page's: beside Leave in the coven index's "Your Membership" row today, and
the MB.119 review proposes a section of its own for owners
(`Coven / Pages`, below).

## Stories

`index.stories.tsx` (`Coven / Delete Workspace Button`) has `Default`. In the workshop the call
reaches no server, so confirming shows the failure. The button in its page is drawn by the
review's proposals in `.ladle/coven-pages.stories.tsx` (`Coven / Pages`, `ProposalIndex…`), each
with a `PhoneDark` and a `PhoneLight` sibling; the winner's sections are kept as component
stories and the file goes once the running page carries it.

## Testing

`tests/components/DeleteWorkspaceButton/index.test.tsx` asserts that nothing is sent until the
confirmation, then that the named coven's id is sent and the page is left, and that a refusal is
said and the page stays. The only owner's route through it is
`tests/components/LeaveWorkspaceButton/owner-exit.test.tsx`; the page's choice to show it by
permission is `tests/app/(shell)/coven/page.test.tsx`.
