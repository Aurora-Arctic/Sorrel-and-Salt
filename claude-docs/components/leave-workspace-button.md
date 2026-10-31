# LeaveWorkspaceButton

`src/components/LeaveWorkspaceButton/` — Leave Coven, in the coven index's Your Membership section (M6.15). A client
component taking the workspace's `workspaceId` and `name`, and, for the coven's only owner,
`successors` (M6.16, below).

## Contracts

- **It asks first.** It is a `ConfirmedAction` ([`user-list.md`](user-list.md)): a modal whose
  question names the coven in bold and says the member loses access until an owner invites them back.
- **One GraphQL mutation, `leaveWorkspace(workspaceId)`**, through the same path as every write from
  the browser (CLAUDE.md rule 1). It names no user: the service leaves the caller's own seat and has
  no argument to name another's. A refusal is said in a callout under the button, which has
  the focus back ([`click-feedback.md`](click-feedback.md), M12.31). A success announces
  nothing, since it leaves the page.
- **The last owner is refused by the service** (M6.8's guard) whatever the page shows; a refusal
  that still reaches the button, such as when the owners changed after the page was drawn, is said
  as it stands. The control stays visible and enabled for every role.
- **A success goes to the coven landing** (`/coven`, `COVEN_LANDING_PATH`) with `router.replace`,
  then `router.refresh()`, as `CreateWorkspaceForm` does after creating: a re-read of the coven
  would be a 404, since the leaver has no seat in it any more, and the refresh brings the shell's
  switcher a list without it. The landing opens the leaver's next coven if they have one, and tells
  them how to get into one if not. The only owner's hand-over lands the same way.
- **Every role sees it.** The page shows it unconditionally, so a viewer, who cannot open the members
  page, can still go.

## The only owner's guided exit (M6.16)

The last-owner guard is right and would read as a bug if it only refused. So the coven page reads the
roll for an owner (`memberRoster`, which pages through `listMembers` to the end), and when they are
the only owner it gives the button `successors`: every other member, with their role. The button
then opens `owner-exit.tsx` instead of the plain confirmation. Anyone else (one of several owners, a
member, a viewer) gets the plain one, and the page reads nothing for them.

- **Visible and enabled; the explanation comes on click.** Nothing is greyed out or put in a
  tooltip.
- **It asks what happens to the coven, the way Change Role asks which role** (the owner's call at
  the design review, 2026-10-12): the question "Leave _name_? It needs an owner, so choose what
  happens to it", then a radio pair, each with a line of explanation, and one row of buttons whose
  confirm follows the choice. "Hand It to Another Member" is chosen to start, and its confirm is the
  green Promote and Leave; "Delete Coven", whose line says every other member loses access, swaps the
  confirm for the red Delete Coven. Both ways out are always on screen together.
- **The new owner is found by typing, with their role.** Under the hand-over choice, a type-ahead
  box (`ComboboxTypeahead`) in a `FieldShell`, labelled "New Owner" with the required mark, narrows the other members by name as the owner types; each row reads
  the member with their role, "Fixture B (Member)", and once picked the box shows the role after the
  name as its qualifier, with what that role may do (`WORKSPACE_ROLE_ACCESS`) in the tooltip. Typing
  matches the name alone, never the role (the owner's call). Nobody is chosen until one is picked,
  so Promote and Leave stays disabled until then. It searches names only: no service gives an owner
  a co-member's email address (only their display name, MB.10), so searching by email would be a
  privacy change of its own.
- **One other member is offered by name**, "Hand It to Fixture B", with no box to search, and
  Promote and Leave live at once (the owner's call).
- **Nobody else: the deletion is the whole answer.** No radio pair; the question says they are the
  only member, so leaving would leave the coven with no one, and the row holds Delete Coven and
  Cancel under the deletion's own warning line.
- **Promote and Leave is two requests in a fixed order:** `updateMemberRole` makes the chosen
  member an owner, then `leaveWorkspace`. If the leave fails, the coven keeps two owners, and the
  dialog says the promotion happened and the leave did not. If the promotion is refused, nothing
  else is sent.
- **Delete routes into M6.14's confirmation.** The dialog's Delete Coven is a
  `DeleteWorkspaceButton` with `inModal` and `onlyOwner`, so its confirmation (which names what
  becomes inaccessible) asks over the dialog, and nothing is deleted from the dialog itself. The
  deletion's radio line says every other member loses access before it is chosen.
- **The button is a `ModalButton`** ([`modal.md`](modal.md)), so the focus returns to Leave Coven
  however the dialog closes: Cancel, Escape, Close, or a click outside. `Modal` restores nothing
  itself (MB.119).
- **A refusal is said inside the dialog,** in a plain error `Notice`, not behind it on the page.
  Promote and Leave's is at the dialog's top: the dialog holds it (`ExitDialog` in
  `owner-exit.tsx`) and hands the handover a `report`. The in-dialog Delete Coven says its own
  on a full-width line above the dialog's buttons, as every in-dialog confirmed action does (the
  owner's calls, 2026-10-20), with no badge: inside the row it squeezed Delete and pushed Cancel
  past the dialog's edge on a phone. `coven.spec.ts` holds that at 375px.
- **The service still decides.** Bypassing the dialog, `leaveWorkspace` refuses the only owner.

Why the page and not the refusal: the guard's `LastOwner` carries `remedy` and `promotable`, but
GraphQL does not pass them to the browser, and the explanation is meant to come before an attempt.
The roll read on the page is the same fact, read by the same `member: read` check.

## Styling

None of its own: the directory has no `index.scss`. The plain Leave is the `.btn` primitive
opening `ConfirmedAction`'s modal ([`user-list.md`](user-list.md)); the guided exit is a
`ModalButton` ([`modal.md`](modal.md)) holding a `RadioGroupField`, a `FieldShell` around the
type-ahead, and the dialog's `.modal__actions` row. Promote and Leave is `.btn--solid`; Delete
is `.btn--destructive`; Cancel is `.btn--quiet`.

## Stories

`index.stories.tsx` (`Coven / Leave Coven Button`): `States`, a grid of Member (the plain Leave),
Only Owner (several members to hand over to, so the type-ahead), Only Owner One Other (one member,
offered by name) and Only Member (deletion alone); and `Open`, with a control that chooses the dialog open in each case (Member Asking, Member Refused, Only Owner Hand Over, Only Owner Delete Chosen, Only Owner One Other Hand Over Failed, Only Member Asking); and `Overview`, with a control that chooses the caller's role (Owner, Member, Viewer): the coven index page in the app shell, with the eyebrow, title, role sentence, Contents, Your Membership and, for an owner, Delete Coven. In the
workshop the calls reach no server, so confirming shows the failure. The page itself reads the session, so `Overview` draws its markup with fixture props; it is walked in
`tests/e2e/coven.spec.ts`.

## Testing

`tests/components/LeaveWorkspaceButton/index.test.tsx`: nothing sent until confirmed, then the
named coven's id, a replace to the landing and a refresh; a refusal stays on the page,
said under the button with the focus on it and the badge bringing it back, and a success
announces nothing. `owner-exit.test.tsx`: the dialog opens
with both ways out, the type-ahead and the one-member and no-member shapes, the two requests in
their order and what each failure leaves, a refused hand-over said at the dialog's top and a refused deletion inside the dialog, the Delete confirmation, and that the focus returns to
Leave Coven when the dialog closes by Cancel or Escape.
