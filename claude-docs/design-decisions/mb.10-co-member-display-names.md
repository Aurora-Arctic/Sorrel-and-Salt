# MB.10 — A deleted co-member reads under their last name

**Status:** decided · **Date:** 2026-10-12

The owner's call, made while building MB.10: when the `usersById` loader is
asked for a deleted user who shared a coven with the viewer, it answers with
the name that user's row held when it was deleted. The result is in
[`auth/display-names.md`](../auth/display-names.md), and in CLAUDE.md rule 4
and DESIGN.md §5's third enforcement rule, which now name a third exception.

## What the task left open

MB.10's acceptance criteria ask that "a deleted user still resolves to a
stable display value", without saying which. Nothing in v1 deletes a user
yet: Better Auth's own account deletion is a hard delete that every audit
foreign key refuses (MB.74), and the provisional-account sweep hard-deletes
only unverified rows, which hold no seat (MB.67). But `users` carries
`deleted_at`, so a later task can soft-delete one, and a row they last
edited would still name them.

## The two options

| Option                          | What a deleted co-member reads as | What it costs                                                                                                                                                          |
| ------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A fixed label                   | The same label for every one      | Nothing. The read never touches a deleted user's row: a co-member's seat with no live user behind it can only be a deleted user.                                       |
| **The last known name, chosen** | The name their row last held      | The finder reads a deleted user's row, so it is a third named exception to rule 4, ending `…IncludingSoftDeleted` and pinned by the soft-delete guard like the others. |

The owner chose the last known name. It matches what the viewer saw when
the edit was made, as a substitute keeps showing the last name of the
ingredient it links (MB.138), and the name is stable because no writer
touches a deleted row.

## What the exception covers, and what it doesn't

`findCoMemberNamesIncludingSoftDeleted` skips two filters, each for a reason
the task states:

- **The asked-about user's seat**, so that a member removed from the coven
  still counts as a co-member.
- **The asked-about user's row**, so that a deleted user still has a name.

Two filters stay, both applied by `existsIn`:

- **The viewer's own seat must be live.** Leaving a coven ends the view of
  its members.
- **The coven must be live.** A deleted coven shares nobody.

The finder returns an id and a name per user, never the rest of the row, so
the email address of a deleted user never leaves the repository.

## A fourth read without a proof

Every workspace-scoped finder takes the `Membership` proof that
`assertMembership` returns (CLAUDE.md rule 5). This one can't: the viewer's
covens are several, and a proof names one. It takes the viewer's id
instead, which the service reads off the session, as `findMembershipsOfUsers`
takes the user ids its service has cleared. The repository's comments called
a fourth such read a decision. The task's co-member gate is that decision,
and this record is where it is written down.
