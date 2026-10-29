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

## Contracts

- **No permission check lives here.** The page decides who gets controls and
  passes them in (CLAUDE.md rule 1). With no `removeAction` the table has no
  Remove column, not an empty one.
- **Change Role sits in the Role column**, the role on the left and the
  control on the right. It is `btn btn--small btn--quiet`.
- **Remove is `RemoveControl`** (M6.15): a `ConfirmedAction` naming the member, sending `removeMember`, and reading the page again. The page passes it to owners only, on every row but their own (leaving is the coven page's), and a refusal such as the last owner is said under the Remove pressed, as Change Role's is (below).
- **Remove has a column of its own**, as Impersonate has, from the same
  `row-action-column` mixin: last, ruled in red,
  sticky at the right edge while the table scrolls, and at the card's top
  right at phone width. Its button is `btn btn--small btn--destructive`.
- **Roles are told apart by their word**, from `workspaceRoleLabel`
  (`UserDetail/roles.ts`). An owner is
  also bold, as the user list sets an admin, but weight is never the only cue.
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

## Styling

`index.scss` holds the list's own rules only: the name with its "You" mark, the
Joined, Invited By and Updated facts muted at the caption size above the
stacking width, the Role column shrunk to its content, the role beside its
button, and the Remove column from `row-action-column`. The table, its frame
and its card layout are the `.data-table` primitives
([`../styling.md`](../styling.md)). The Change Role button has no minimum
width: every row holds the same one button, so they line up without it. Tokens
used: `space()`, `type-size('caption')`, `$text-muted`, `$table-stack-width`.

## Stories

[`index.stories.tsx`](../../src/components/MemberList/index.stories.tsx),
`Coven / Member List`: `States`, with a control that chooses Default (a member's view with no controls);
With Actions (an owner's, with plain buttons standing in for the page's
controls and the Email column); Sole Owner (the owner's page composition, addresses included, with the sole-owner note
inside a `ListFrame` ahead of the list); Gaps In The Record; and Addresses Without Actions.

## Tests

`tests/components/MemberList/index.test.tsx`, by role and label queries: all
three roles with their dates, the role controls beside each role, no Remove
column without `removeAction`, each control given its row's member, "You"
on the own row only, and the address only under
`showEmail`. `tests/components/MemberList/remove-control.test.tsx`
and `role-control.test.tsx` hold each control's refusal, said under the button
as the service's sentence alone and the focus on the button, the badge bringing it back,
and its success said in the status region.

## Notes from code comments: the columns

The columns: the name, then where the page asks, the address; then the role with its change beside it, then the facts no control changes: when they joined, who invited them, and who last changed the membership and when, in one Updated column. Remove is last, in a column ruled in red as Impersonate is, since it is the table's one destructive row action, and only when the page passes it.
