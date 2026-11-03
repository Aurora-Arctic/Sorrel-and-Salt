# MemberList

`src/components/MemberList/` — a coven's members, one row each (M6.12). It is
render-only and a server component, and it is modelled on the admin
[`UserList`](user-list.md): the stacking [`DataTable`](data-table.md), so a row
is a card at phone width. M6.13's members page composes it, reading the members
through `Workspace.members`. Its rows hold no actions: a name opens the
member's modal over the list, [`MemberDetail`](member-detail.md), which holds
Change Role, Coven Access and Remove.

## Props

`MemberListProps` (`types.ts`):

| Prop            | What it is                                                                                                                                                                                         |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `members`       | `MemberListEntry` rows: `userId`, `name`, `role`, `joinedAt`, `updatedBy`, `updatedAt`, `invitedBy`, `email` (stewards only), `paused` (stewards only), and `openHref` and `heading` for the modal |
| `showEmail`     | Set for stewards alone (M11.19): adds the Email column after Name; absent, no column                                                                                                               |
| `showAccess`    | Set for stewards alone (`member: pause`): adds the Access column after Updated, drawn from each entry's `paused`; absent, no column                                                                |
| `currentUserId` | The signed-in user; their row's name is followed by "You"                                                                                                                                          |

## Contracts

- **No permission check lives here.** The page decides which columns to draw
  and what the modal offers (CLAUDE.md rule 1).
- **No row holds an action** (the owner's call, 2026-11-02, following the
  admin users table). The name is a link, `MemberLink` (`member-link.tsx`),
  to `?member=<id>` with the cursor kept; a press opens the modal at once
  with its heading, through the page's `RouteModalProvider`, as a user's name
  does on `/keepers/users`. It is still a link, so a new tab opens the address.
- **Roles are told apart by their word**, from `workspaceRoleLabel`
  (`UserDetail/roles.ts`). A steward is
  also bold, as the user list sets an admin, but weight is never the only cue.
- **Every role carries a tip saying what it may do**: the word is a
  [`RoleTip`](role-tip.md), its text `WORKSPACE_ROLE_ACCESS[role]`, the same
  sentence Change Role shows beside that role, on every row, so a member reads
  it too.
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
- **Access marks whether the member's access is open** where the page sets
  `showAccess`, with the admin user list's `Mark` ([`user-list.md`](user-list.md)):
  a green check while no pause stands, its hidden word and its tip "Not
  paused"; a red cross while one does, its hidden word "Paused until <instant>"
  (`UntilMark`, the site's long date form) or "Paused with no end date", and its tip "Until <instant>" or "No
  end date". The heading and the marks are centred above the stacking width
  (`.member-list__mark-column`). Pausing and lifting are the modal's.
- **The own row is marked in text** ("You"), not by colour or a test id.
- **The sole-owner note is the page's**, not this component's: a quiet warning
  drawn inside the page's `ListFrame`, ahead of the list, so the frame's gap
  spaces it (M6.16).

## The modal

`?member=<id>` opens the member's modal, [`MemberDetail`](member-detail.md),
over the list. The page finds the member among the rows it has already read,
so the modal reads nothing more for its facts; an id not on this page of the
list shows an error notice above the list instead ("No member on this page of
the list has that address. …"). The controls it holds, `role-control.tsx` and
`remove-control.tsx`, still live here, beside the role words they share.

### The role control

`role-control.tsx` (M6.13) is one Change Role button, asking first which role
the member moves to (`ConfirmedAction`), then sending `updateMemberRole`. In
the modal it asks over the modal's body (`inModal`). It is offered to stewards
only; the service is the guard.

The question has a radio per role but their own, each with what that role may
do (`role-access.ts`). The first other role in viewer, member, owner order is
chosen to start. The confirm button follows the choice: **Promote**, green
(`btn--solid`), for a role above their own, and **Demote**, red
(`btn--destructive`), for one below.

Both controls say what happened through `ConfirmedAction`'s click feedback
([`click-feedback.md`](click-feedback.md), M12.31). Change Role's refusal
floats under its button in a callout saying the service's sentence alone ("This
is the last steward, and a coven needs one. Make another member a steward
first."), with a badge on the button to bring it back; nothing in the modal
moves, and the next attempt clears it (`refusalInModal="callout"`, as the admin
user modal's is). A success is said in the page's status region: "<name> is now
<role>." or "<name> is removed.".

### The remove control

`remove-control.tsx` (M6.15) is a `ConfirmedAction` naming the member and
sending `removeMember`. In the modal its button is plain (`btn btn--quiet`):
the red is the confirm's own, on the Remove that removes. A success closes the
modal back to the list (`onSent`); a refusal is a notice in the modal.

### Pausing access

A steward can pause one member's or viewer's access to the coven, for a span or with no end date, and lift it (M15.56). The pause itself, and who may set it, is the coven service's (claude-docs/design-decisions/m15.55-coven-access-pause.md). The form, the standing pause and Earlier Pauses are the modal's Coven Access section ([`member-detail.md`](member-detail.md), "Coven Access").

- **The page reads the pauses standing on its members in one query**, `standingMemberPauses`, for a steward alone (`member: pause`), and passes each as the entry's `paused`: the Access column draws it and the modal starts from it.
- **A paused member is sent to `/coven-paused/<slug>`** from every page of the coven, by the coven guard `requireCovenMembership`. That page names the coven and when the pause ends, and sends anyone with no pause standing back to the coven; a stranger still gets the 404. A GraphQL answer of `ACCESS_PAUSED` on a coven page sends the browser there too (`src/lib/graphql-client.ts`).

## Styling

`index.scss` holds the list's own rules only: the name with its "You" mark, the
Joined, Invited By and Updated facts muted at the caption size above the
stacking width, the Role column shrunk to its content, the role beside its
tip, a standing pause's badge and end on one line (`value-and-control`), and
the address under the name in the modal's heading. The table, its frame
and its card layout are the `.data-table` primitives
([`../styling.md`](../styling.md)). Tokens
used: `space()`, `type-size('caption')`, `$text-muted`, `$table-stack-width`.

## Stories

[`index.stories.tsx`](../../src/components/MemberList/index.stories.tsx),
`Coven / Member List`: `States`, with a control that chooses Default (a member's view);
Owner View (the Email and Access columns, a standing pause on the viewer's row); Sole steward (the owner's page composition, addresses included, with the sole-owner note
inside a `ListFrame` ahead of the list); Gaps In The Record; and Addresses Without Actions (the Email column without Access).

## Tests

`tests/components/MemberList/index.test.tsx`, by role and label queries: all
three roles with their dates and tips, Invited By, the Updated stamp, each name
a link to its modal with no action on any row, the Access column's mark and
the pause's end only under `showAccess`, "You" on the own row only, and the address only
under `showEmail`. `tests/components/MemberList/remove-control.test.tsx` and
`role-control.test.tsx` hold each control's refusal and success.
`tests/app/(shell)/coven/members.test.tsx` holds the page: no row actions for
anyone, the standing pauses read in one batch for a steward alone, and the
modal opened by `?member=`. The modal's own tests and specs are listed in
[`member-detail.md`](member-detail.md).

## Columns

The roll reads left to right as who, what they may do, and what has happened to the membership. The name comes first and the address only where the page asks for it. Next is the role with its tip. Then come the facts no control changes: when the person joined, who invited them, and who last changed the membership and when, folded into one Updated column. Access is last, where the page asks for it: the pause standing on a member. No column holds an action; the modal holds them all.
