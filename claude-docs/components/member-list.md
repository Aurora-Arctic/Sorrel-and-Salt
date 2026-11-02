# MemberList

`src/components/MemberList/` — a coven's members, one row each (M6.12). It is
render-only and a server component, and it is modelled on the admin
[`UserList`](user-list.md): the stacking [`DataTable`](data-table.md), so a row
is a card at phone width. M6.13's members page composes it, reading the members
through `Workspace.members`.

## Props

`MemberListProps` (`types.ts`):

| Prop            | What it is                                                                                                                                                       |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `members`       | `MemberListEntry` rows: `userId`, `name`, `role`, `joinedAt`, `updatedBy`, `updatedAt`, `invitedBy`, and `email` (the address, owners only), in the page's order |
| `showEmail`     | Set for owners alone (M11.19): adds the Email column after Name; absent, no column                                                                               |
| `currentUserId` | The signed-in user; their row's name is followed by "You"                                                                                                        |
| `roleAction`    | `(member) => ReactNode`, drawn beside the role (Change Role); absent, the role alone                                                                             |
| `removeAction`  | `(member) => ReactNode`, drawn in a Remove column at the end; absent, no column                                                                                  |
| `accessAction`  | `(member) => ReactNode`, drawn in an Access column after Updated (Pause Access, or Paused with Lift Pause); absent, no column                                    |

## Contracts

- **No permission check lives here.** The page decides who gets controls and
  passes them in (CLAUDE.md rule 1). With no `removeAction` the table has no
  Remove column, not an empty one.
- **Change Role sits in the Role column**, the role on the left and the
  control on the right. It is `btn btn--quiet btn--small`.
- **Remove is `RemoveControl`** (M6.15): a `ConfirmedAction` naming the member, sending `removeMember`, and reading the page again. The page passes it to owners only, on every row but their own (leaving is the coven page's), and a refusal such as the last owner is said under the Remove pressed, as Change Role's is (below).
- **Remove has a column of its own**, as the Compendium's Edit has, from the same
  `sticky-action-column` mixin: last, on the neutral rule,
  sticky at the right edge while the table scrolls, and at the card's top
  right at phone width. Its button is `btn btn--quiet btn--small`, plain as
  Change Role is: the red is the confirm's own, on the Remove that removes.
- **Roles are told apart by their word**, from `workspaceRoleLabel`
  (`UserDetail/roles.ts`). An owner is
  also bold, as the user list sets an admin, but weight is never the only cue.
- **Every role carries a tip saying what it may do**: the word is a
  [`RoleTip`](role-tip.md), its text `WORKSPACE_ROLE_ACCESS[role]`, the same
  sentence Change Role shows beside that role, on every row whether or not it
  carries Change Role, so a viewer reads it too.
- **The joined date** is a `<time>` holding the ISO date, muted above the
  stacking width, as the user list's Signed Up is.
- **Invited By** is the display name of whoever sent the invitation that seated
  the member, resolved by the page (`displayNamesOf`). It is empty for a coven's
  creator and where the name is withheld. A muted fact like Joined, between
  Joined and Updated.
- **Updated** is one column holding the row's audit stamp: who last changed
  the membership, as a display name the page resolves (`displayNamesOf`), as
  "by **Fixture A** on 2026-10-12", the name in bold. Where the service withholds the editor's name the cell is
  empty, date included. A role change moves it; the joined date stays. A muted
  fact like Joined.
- **Email is the owner's** (M11.19). The page sets `showEmail`
  only for a caller holding `member: readEmail` and fills each entry's `email`
  from the members service's `memberEmails`. The cell is the address alone,
  with no verified mark as the admin user list draws, since every member's address is verified. A seat is taken only by accepting an invitation, which matches a verified address, or by creating a coven, which an unverified account cannot reach, and an address changes only at verification. Without `showEmail` the column
  does not exist, so a member's table has no
  empty Email column to give the feature away.
- **The own row is marked in text** ("You"), not by colour or a test id.
- **The sole-owner note is the page's**, not this component's: a quiet warning
  drawn inside the page's `ListFrame`, ahead of the list, so the frame's gap
  spaces it (M6.16).

## The role control

`role-control.tsx` (M6.13) is the client component the members page passes
as `roleAction`: one Change Role button on every row, asking first in a modal
naming the member (`ConfirmedAction`), then sending `updateMemberRole`. It is
drawn for owners only; the service is the guard.

The modal asks which role the member moves to: a radio per role but their own,
each with what that role may do (`role-access.ts`). The first other role in
viewer, member, owner order is chosen to start. The confirm button follows the
choice: **Promote**, green (`btn--solid`), for a role above their own, and
**Demote**, red (`btn--destructive`), for one below.

Both controls say what happened through `ConfirmedAction`'s click feedback
([`click-feedback.md`](click-feedback.md), M12.31). A refusal gives the focus
back to the button that opened the modal and floats under it in a callout
saying the service's sentence alone ("This is the last owner, and a coven
needs one. Make another member an owner first."), with no prefix naming the
member, since the callout hangs from that member's row (the owner's call,
2026-10-20), and with a badge on the button to bring it back; nothing on the page moves, and the next attempt clears it. A
success is said in the page's status region: "<name> is now <role>." or
"<name> is removed.".

## Pausing access

An owner can pause one member's or viewer's access to the coven, for a span or with no end date, and lift it (M15.56). The pause itself, and who may set it, is the coven service's (claude-docs/design-decisions/m15.55-coven-access-pause.md).

- **The control is `PauseControl`** (`pause-control.tsx`), passed as `accessAction`. With no pause standing it is **Pause Access**: a `ConfirmedAction` whose dialog asks For (1 Day, 1 Week, 1 Month, Until a Date, No End Date), Until (the day, for Until a Date) and a Note, and confirms with a red **Pause**. With a pause standing it is a **Paused** badge, the pause's end, and **Lift Pause**, which confirms with a red **Lift**. Either way the page is read again afterwards, so the row shows the state the action leaves.
- **Pause is held while Until a Date has no future day picked**: the confirm is disabled and the dialog stays open, as the admin's Pause Access is held. Both screens read the one rule, `pauseReady` in `access-pause-parts.tsx`, and the dialog holds its confirm through `ConfirmedAction`'s `confirmDisabled`.
- **Each dialog lists the member's earlier pauses** under Earlier Pauses, each with its dates, note, and "Set by X · Lifted by Y". The list is read through `Workspace.memberPauses` (a paged list) only once a dialog opens, so the page itself makes no read per row.
- **The fields, the end and the list are shared** with the admin's site-wide pause, from `UserDetail/access-pause-parts.tsx`, so the two ask and list alike (claude-docs/components/user-detail.md, "Site Access").
- **The page passes it to owners alone** (`member: pause`), and returns nothing on an owner's row, since an owner's access is never paused. The pauses standing on the page's members are read in one query, `standingMemberPauses`.
- **A paused member is sent to `/coven-paused/<slug>`** from every page of the coven, by the coven guard `requireCovenMembership`. That page names the coven and when the pause ends, and sends anyone with no pause standing back to the coven; a stranger still gets the 404. A GraphQL answer of `ACCESS_PAUSED` on a coven page sends the browser there too (`src/lib/graphql-client.ts`).

## Styling

`index.scss` holds the list's own rules only: the name with its "You" mark, the
Joined, Invited By and Updated facts muted at the caption size above the
stacking width, the Role column shrunk to its content, the role beside its
button, a standing pause's badge, end and Lift Pause on one line (`value-and-control`), and the Remove column from `sticky-action-column`. The table, its frame
and its card layout are the `.data-table` primitives
([`../styling.md`](../styling.md)). The Change Role button has no minimum
width: every row holds the same one button, so they line up without it. Tokens
used: `space()`, `type-size('caption')`, `$text-muted`, `$table-stack-width`.

## Stories

[`index.stories.tsx`](../../src/components/MemberList/index.stories.tsx),
`Coven / Member List`: `States`, with a control that chooses Default (a member's view with no controls);
With Actions (an owner's, with plain buttons standing in for the page's
controls, a standing pause on the viewer's row, and the Email column); Sole Owner (the owner's page composition, addresses included, with the sole-owner note
inside a `ListFrame` ahead of the list); Gaps In The Record; and Addresses Without Actions.

## Tests

`tests/components/MemberList/index.test.tsx`, by role and label queries: all
three roles with their dates, the role controls beside each role, no Remove
column without `removeAction`, each control given its row's member, "You"
on the own row only, and the address only under
`showEmail`. `tests/components/MemberList/remove-control.test.tsx`
and `role-control.test.tsx` hold each control's refusal, said under the button
as the service's sentence alone and the focus on the button, the badge bringing it back,
and its success said in the status region. `pause-control.test.tsx` holds the pause each sends (open-ended with its note, and one day), the Pause confirm held, with the dialog open and nothing sent, while Until a Date has no day, the lift, and the earlier pauses each dialog lists. `tests/e2e/coven-access-pause.spec.ts` walks pause, the paused page, lift and access restored, with axe on the dialog and on the paused page.

## Columns

The roll reads left to right as who, what they may do, and what has happened to the membership. The name comes first and the address only where the page asks for it. Next is the role with its change control beside it. Then come the facts no control changes: when the person joined, who invited them, and who last changed the membership and when, folded into one Updated column. Access follows, where the page passes it: the pause standing on a member, or the control to set one. Remove is last, and only when the page passes it. It is the table's one destructive row action, yet its column is drawn plain, on the neutral rule: the red is kept for the Remove in its question, the one that removes.
