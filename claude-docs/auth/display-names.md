## Display names (MB.10)

A members list shows each member's name, and a row will show who last edited
it (M6.11, M6.18). Both read one loader, `usersById`
(`src/modules/identity/loaders/users-by-id.ts`), which answers a user id with
that user's display name and nothing else of the row: never the email
address. It batches every id a request asks for into one read.

**Who may read a name.** The viewer reads a name only for a _co-member_: a
user who holds, or has held, a seat in a coven the viewer sits in now. Any
other id answers `null`, so the loader cannot be used to look up a
stranger's name by guessing an id.

| The user asked about                      | Answer                            |
| ----------------------------------------- | --------------------------------- |
| Sits in one of the viewer's covens        | Their name                        |
| Was removed from one of them, or left     | Their name                        |
| Is a deleted user who sat in one          | The name their row last held      |
| Never shared a coven with the viewer      | `null`                            |
| Invited the viewer into a coven, pending  | Their name, on `/coven` alone     |
| Shared only a coven that is now deleted   | `null`                            |
| Shared a coven the viewer has since left  | `null`                            |
| Is anyone, and the viewer is a site admin | As for any viewer: no wider reach |
| Is anyone, and the request is signed out  | `Forbidden`, in every slot        |

- **The removed and the deleted are included on purpose.** A row's last
  editor may have left the coven since, and the viewer saw the name when the
  edit was made. A deleted user keeps the name their row held when it was
  deleted, a value nothing rewrites, so the answer is stable (the owner's
  call, [`mb.10-co-member-display-names.md`](../design-decisions/mb.10-co-member-display-names.md)).
- **An inviter's name reaches the invitee** (M10.32). The account page's
  Invitations section lists the pending coven invitations addressed to the viewer's verified
  email with who sent each, read by `findReceivedInvitationInviters` and not
  by the loader: the invitee shares no coven with the inviter yet, and the
  mail already names them (M7.3), so the list says no more than the mail.
- **The viewer's own seat must be live.** The scope is the covens the viewer
  is in now, so leaving a coven ends the viewer's view of its members.
- **A site admin gets nothing extra.** Admins curate the compendium and reach
  no workspace (CLAUDE.md's domain invariants). The privilege ledger, which
  is an admin's, reads whole user rows through `usersByIdForAdmin` instead,
  under its own gate and with its own null rule: null for a deleted user
  ([`admin-users.md`](admin-users.md), "The privilege ledger"). The two stay
  separate, since one loader serving both would need two gates and two null
  rules behind a switch.

**Where it is enforced.** The service, `displayNamesOf` in
`src/modules/identity/services/display-names.ts`, passes the session's user
id to the repository's `findCoMemberNamesIncludingSoftDeleted`
(`src/db/repository/users.ts`), which applies the whole rule in SQL (CLAUDE.md
rule 7). It reads the asked-about users' seats, a deleted seat included,
keeps a seat only where the viewer holds a live seat in the same live coven,
and left-joins each to its user row, a deleted one included. One statement
answers a batch however many covens a pair shares.

The finder takes no `Membership` proof, the fourth repository read that
doesn't, for the reason `findMembershipsOfUsers` takes none: the viewer's
covens are several, so no one workspace could hold a proof. It is also rule
4's third named exception, after M5.3's and MB.138's, which is why its name
ends `…IncludingSoftDeleted` ([`db/soft-delete.md`](../db/soft-delete.md)).

The tests: `tests/modules/identity/services/display-names.test.ts` holds
every row of the table above, each with the precondition that would have let
it succeed; `tests/modules/identity/loaders/users-by-id.test.ts` holds the
one read per batch and the per-request construction.

**A second caller: the Ingredients list (M6.18).** A card's last-edit line names its editor with `displayNamesOf` too, not the `usersById` loader, since the list is a server component and not a GraphQL request. `lastEditsOf` (`src/modules/ingredients/services/last-edits.ts`) picks each card's newest edit first and then asks for all the editors' names in one `displayNamesOf` call, so a page of 24 cards costs one name read, never one per card. A null name (a stranger, or a non-uuid id) leaves the card showing the time alone.
