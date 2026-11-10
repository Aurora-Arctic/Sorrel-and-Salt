# LeaveWorkspaceButton

`src/components/LeaveWorkspaceButton/` is Leave Coven, in the coven index's Your Membership section and on the paused page `/coven-paused/[slug]` for a member whose access is paused. A steward is never paused, so the paused page passes no `successors`. `quiet` draws the opening button as `btn btn--quiet` for the paused page, where leaving is a secondary action; the confirm stays `btn btn--destructive` either way.

## Contracts

- **It asks first.** It is a `ConfirmedAction` ([`user-list.md`](user-list.md)): a modal whose question names the coven and says the member loses access until a steward invites them back.
- **One GraphQL mutation, `leaveWorkspace(workspaceId)`** (CLAUDE.md rule 1). It names no user: the service leaves the caller's own seat. A refusal is said in a callout under the button, which has the focus back ([`click-feedback.md`](click-feedback.md)). A success announces nothing, since it leaves the page.
- **The last steward is refused by the service** whatever the page shows. A refusal that still reaches the button, such as when the stewards changed after the page was drawn, is said as it stands. The control stays visible and enabled for every role, so an observer, who cannot open the members page, can still go.
- **A success goes to the coven landing** (`/coven`, `COVEN_LANDING_PATH`) with `router.replace`, then `router.refresh()`. A re-read of the coven would be a 404, since the leaver has no seat in it, and the refresh brings the shell's switcher a list without it. The landing opens the leaver's next coven, or says how to get into one. The only steward's hand-over lands the same way.

## The only steward's guided exit

The last-steward guard is right and would read as a bug if it only refused. So the coven page reads the roll for a steward (`memberRoster`, which pages through `listMembers` to the end), and when they are the only steward it gives the button `successors`: every other member, with their role. The button then opens `owner-exit.tsx` instead of the plain confirmation. Anyone else gets the plain one, and the page reads nothing for them. The page reads the roll, not the refusal, because the guard's `LastOwner` carries `remedy` and `promotable` but GraphQL does not pass them to the browser, and the explanation is meant to come before an attempt.

- **Visible and enabled; the explanation comes on click.** Nothing is greyed out or put in a tooltip.
- **It asks what happens to the coven, the way Change Role asks which role:** a radio pair, each with a line of explanation, and one row of buttons whose confirm follows the choice. "Hand It to Another Member" is chosen to start, and its confirm is the green Promote and Leave. "Delete Coven" swaps the confirm for the red Delete Coven. Both ways out are always on screen together.
- **The new steward is found by typing, with their role.** Under the hand-over choice, a `ComboboxTypeahead` in a `FieldShell`, labelled "New Owner", narrows the other members by name. Each row reads the member with their role, and once picked the box shows the role as its qualifier, with what that role may do (`WORKSPACE_ROLE_ACCESS`) in the tooltip. Typing matches the name alone, never the role. Promote and Leave stays disabled until one is picked. It searches names only: no service gives a steward a co-member's email address, so searching by email would be a privacy change of its own.
- **One other member is offered by name**, with no box, and Promote and Leave live at once.
- **Nobody else: the deletion is the whole answer.** No radio pair. The question says they are the only member, and the row holds Delete Coven and Cancel under the deletion's own warning line.
- **Promote and Leave is two requests in a fixed order:** `updateMemberRole` makes the chosen member a steward, then `leaveWorkspace`. If the leave fails, the coven keeps two stewards, and the dialog says the promotion happened and the leave did not. If the promotion is refused, nothing else is sent.
- **Delete routes into the coven deletion's own confirmation.** The dialog's Delete Coven is a `DeleteWorkspaceButton` with `inModal` and `onlyOwner`, so its confirmation asks over the dialog, and nothing is deleted from the dialog itself.
- **The button is a `ModalButton`** ([`modal.md`](modal.md)), so the focus returns to Leave Coven however the dialog closes. `Modal` restores nothing itself.
- **A refusal is said inside the dialog,** in a plain error `Notice`. Promote and Leave's is at the dialog's top: `ExitDialog` in `owner-exit.tsx` holds it and hands the handover a `report`. The in-dialog Delete Coven says its own on a full-width line above the dialog's buttons, with no badge: inside the row it squeezed Delete and pushed Cancel past the dialog's edge on a phone. `coven.spec.ts` holds that at 375px.
- **The service still decides.** Bypassing the dialog, `leaveWorkspace` refuses the only steward.

## Not here

No `index.scss`. Stories: `src/components/LeaveWorkspaceButton/index.stories.tsx`; in the workshop the calls reach no server, so confirming shows the failure. `Overview` is walked in `tests/e2e/coven.spec.ts`. Tests: `tests/components/LeaveWorkspaceButton/`.
