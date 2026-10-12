# MemberList

`src/components/MemberList/` — a coven's members, one row each (M6.12). It is
render-only and a server component, and it is modelled on the admin
[`UserList`](user-list.md): the stacking [`DataTable`](data-table.md), so a row
is a card at phone width. M6.13's members page composes it, reading the members
through `Workspace.members`.

## Props

`MemberListProps` (`types.ts`):

| Prop            | What it is                                                                               |
| --------------- | ---------------------------------------------------------------------------------------- |
| `members`       | `MemberListEntry` rows: `userId`, `name`, `role`, `joinedAt`, in the page's order        |
| `currentUserId` | The signed-in user; their row's name is followed by "You"                                |
| `roleAction`    | `(member) => ReactNode`, drawn beside the role (Promote, Demote); absent, the role alone |
| `removeAction`  | `(member) => ReactNode`, drawn in a Remove column at the end; absent, no column          |

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
  (`UserDetail/roles.ts`, which M6.13 may move somewhere shared). An owner is
  also bold, as the user list sets an admin, but weight is never the only cue.
- **The joined date** is a `<time>` holding the ISO date, muted above the
  stacking width, as the user list's Signed Up is.
- **The own row is marked in text** ("You"), not by colour or a test id.
- **Styling stops at the tokens** until the section's design review
  ([`../styling.md`](../styling.md), "Designing a section").

## Tests

`tests/components/MemberList/index.test.tsx`, by role and label queries: all
three roles with their dates, the role controls beside each role, no Remove
column without `removeAction`, each control given its row's member, and "You"
on the own row only.
