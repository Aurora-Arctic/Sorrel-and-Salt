# MemberList

`src/components/MemberList/` — a coven's members, one row each (M6.12). It is
render-only and a server component, and it is modelled on the admin
[`UserList`](user-list.md): the stacking [`DataTable`](data-table.md), so a row
is a card at phone width. M6.13's members page composes it, reading the members
through `Workspace.members`.

## Props

`MemberListProps` (`types.ts`):

| Prop            | What it is                                                                                                  |
| --------------- | ----------------------------------------------------------------------------------------------------------- |
| `members`       | `MemberListEntry` rows: `userId`, `name`, `role`, `joinedAt`, `updatedBy`, `updatedAt`, in the page's order |
| `currentUserId` | The signed-in user; their row's name is followed by "You"                                                   |
| `roleAction`    | `(member) => ReactNode`, drawn beside the role (Promote, Demote); absent, the role alone                    |
| `removeAction`  | `(member) => ReactNode`, drawn in a Remove column at the end; absent, no column                             |

## Contracts

- **No permission check lives here.** The page decides who gets controls and
  passes them in (CLAUDE.md rule 1). With no `removeAction` the table has no
  Remove column, not an empty one.
- **Promote and Demote sit in the Role column**, the role on the left and the
  control on the right, as the user list holds Promote and Revoke. Promote is
  `btn btn--small btn--quiet`; Demote is `btn btn--small btn--destructive`.
- **Remove has a column of its own**, as Impersonate has, from the same
  `row-action-column` mixin: last, ruled in red,
  sticky at the right edge while the table scrolls, and at the card's top
  right at phone width. Its button is `btn btn--small btn--destructive`.
- **Roles are told apart by their word**, from `workspaceRoleLabel`
  (`UserDetail/roles.ts`). An owner is
  also bold, as the user list sets an admin, but weight is never the only cue.
- **The joined date** is a `<time>` holding the ISO date, muted above the
  stacking width, as the user list's Signed Up is.
- **Updated By and Updated At** show the row's audit stamp: who last changed
  the membership, as a display name the page resolves (`displayNamesOf`, and
  when. Where the service withholds the editor's name both cells are empty. A role change moves
  them; the joined date stays. Both are muted facts like Joined.
- **The own row is marked in text** ("You"), not by colour or a test id.
- **Styling stops at the tokens** until the section's design review
  ([`../styling.md`](../styling.md), "Designing a section").

## The role control

`role-control.tsx` (M6.13) is the client component the members page passes
as `roleAction`: Promote and Demote, each asking first in a modal naming the
member (`ConfirmedAction`), then sending `updateMemberRole`. It moves one
rung (viewer, member, owner). It is drawn for owners only; the service is the
guard.

Each control opens a modal asking which role the member moves to: a radio per
role beyond their own in that direction (an owner demotes to member or viewer;
a viewer promotes to member or owner), each with what that role may do
(`role-access.ts`). The rung nearest their own is chosen to start.

A refusal is shown by `role-failure.tsx`, which wraps the list: an error
notice above the table naming the member ("<name>'s role was not changed. This is the
last owner, and a coven needs one. Make another member an owner first."),
cleared when the next attempt starts. `ConfirmedAction` takes it through
`onFailure` instead of drawing it beside the row.

## Tests

`tests/components/MemberList/index.test.tsx`, by role and label queries: all
three roles with their dates, the role controls beside each role, no Remove
column without `removeAction`, each control given its row's member, and "You"
on the own row only.
