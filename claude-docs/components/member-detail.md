# MemberDetail

`src/components/MemberDetail/` is the body of the modal that opens over
`/coven/[slug]/members` when someone presses a member's name: the facts the
members table holds about them and, for a steward, Change Role, Coven Access
and Remove. It follows the admin user modal, [`UserDetail`](user-detail.md):
the same sections parted by hairlines, on the same classes
(`UserDetail/index.scss`). It is render-only; the page decides what the viewer
may do and reads every fact before the modal opens.

## How it opens

The members page reads `?member=<id>` and finds that member among the rows it
has already read for the page, so opening the modal reads nothing more. Each
row's name is a link to its own address with the cursor kept (`MemberLink`,
[`member-list.md`](member-list.md), "Contracts"), and the page is a
`RouteModalProvider`, so a press opens the modal at once with its heading
(eyebrow Member, the name, and for a steward the address under it,
`member-heading.tsx`) and the body follows. `member-dialog.tsx` is the client
edge, a `RouteModal` closing back to the list at the same cursor.

An id that is not among this page's rows opens nothing: an error notice above
the list says "No member on this page of the list has that address. They may
have been removed, or be listed on another page."

## Props

`MemberDetailProps` (`types.ts`):

| Prop             | What it is                                                                                   |
| ---------------- | -------------------------------------------------------------------------------------------- |
| `workspaceId`    | The coven, for the writes                                                                    |
| `member`         | The row's `MemberListEntry`, its `paused` included where the page read it                    |
| `currentUserId`  | The signed-in user; their own modal offers no Remove                                         |
| `canChangeRoles` | Draws Change Role beside the role (`member: update`, stewards)                               |
| `canPause`       | Draws the Coven Access section on a member's or viewer's modal (`member: pause`, stewards)   |
| `canRemove`      | Draws Remove on every modal but the viewer's own (`member: remove`, stewards)                |
| `onRemoved`      | Called once the member is removed; the dialog passes the modal's close, so it fades and goes |

## Contracts

- **Membership comes first**: a `<dl>` of Role (bold for a steward), Joined,
  Invited By (only when someone did) and Updated ("by **name** on date"), the
  terms in one column and their values in the next, as the user modal's
  Account facts are. The address is the heading's, so it is not repeated.
- **Change Role sits beside Role**, the member list's `RoleControl` with
  `inModal`: it asks over the modal's body, and a refusal floats under it in
  the click feedback's callout, so nothing moves. It is keyed by the role, so
  the page's read after a change mounts a fresh control offering the others,
  and the modal stays open on the new role.
- **A practitioner or observer sees the facts alone**, with no actions: the same
  facts the table shows them.
- **Remove is last**, in the action row (`user-detail__actions`), plain
  (`btn btn--quiet`), the red kept for its confirm. It is the member list's
  `RemoveControl` with `inModal`; a success closes the modal through
  `onRemoved`, and a refusal is a notice in the modal. Nobody removes
  themself: leaving is the coven page's.

## Coven Access

Where `canPause`, and the member is not a steward (a steward's access is never
paused), a folded section, Coven Access, holds `CovenAccessPanel`
(`coven-access-panel.tsx`): the user modal's `PausePanel`
(`UserDetail/pause-panel.tsx`) given the coven's words and writes, so the two
ask and list alike ([`user-detail.md`](user-detail.md), "Site Access").

- **With no pause standing** it is the form: For (1 Day, 1 Week, 1 Month, Until
  a Date, No End Date), Until for a date, and Note, then **Pause Access**,
  which asks over the modal and confirms with a red **Pause**, sending
  `pauseMemberAccess`. It is held while Until a Date has no future day
  (`pauseReady`).
- **With a pause standing** it is a card: the Paused badge, its end, the note,
  who set it and when, and **Lift Pause**, confirming with a red **Lift** and
  sending `liftMemberAccessPause`.
- **Where each fact comes from.** Whether a pause stands, and its end, come
  from the page's one `standingMemberPauses` read, so the section's summary
  is right at once. The note, who set it, and the Earlier Pauses beneath are
  read through `Workspace.memberPauses` (the `MemberPauses` query) as the
  modal opens, and again after either write; the page is read again too, so
  the row behind shows the new state. A refused read, as when the owner is made a member while the
  modal is open, leaves the page's answer showing rather than the error page.

## Stories

[`index.stories.tsx`](../../src/components/MemberDetail/index.stories.tsx),
`Coven / Member Detail`, wrapped in a query client: Owner (a steward's view of
a member, every action), Paused (a standing pause), On an Owner (no Coven
Access), Own Row (no Remove), and As a Member (the facts alone). The workshop
serves no GraphQL, so Earlier Pauses stays empty there.

## Tests

`tests/components/MemberDetail/index.test.tsx`: the facts, a steward's three
actions, no Coven Access on a steward's modal, no Remove on the observer's own,
a member's modal with no actions, and a removal sent only once confirmed and
then closing through `onRemoved`.
`tests/components/MemberDetail/coven-access-panel.test.tsx`: Earlier Pauses
with who set and lifted each, an open-ended pause with its trimmed note, a
one-day pause's end, Pause Access held while Until a Date has no day, and a
standing pause lifted, the pauses read again after a write, and a refused
read that leaves the page's answer showing.
`tests/app/(shell)/coven/members.test.tsx` holds the page's side: the links,
the modal opened by `?member=` from the page's own rows, what each role is
offered, the close back to the cursor, and the notice for an id not on the
page.

`tests/e2e/coven-access-pause.spec.ts` walks the pause in a browser from the
modal, with axe on the question; `tests/e2e/stories/01-members.spec.ts`
(stories 9–11) removes, refuses and changes roles through it.
