## The provisional-account delete (MB.67)

`deleteProvisionalUsers(lifetimeSeconds, capSeconds)` is the one hard delete of a table
carrying `deleted_at`, and it is a named export rather than a loosening of
`write.delete`'s type. It removes every `users` row that is unverified,
holds at least one `accounts` row, and has an `updated_at` older than
`now()` minus the lifetime or a `created_at` older than `now()` minus the
cap. `accounts` and `sessions` follow by their
`ON DELETE CASCADE`. Both cutoffs are the database's clock, as the columns are. The `EXISTS` over `accounts` is `existsIn`'s, so the delete builds no read
of its own; `soft-delete-finder-guard.test.ts`'s pinned export list names this
function.

It is hard for a reason outside this layer: Better Auth reads `users` by
address with no `deleted_at` filter, so a tombstone would keep refusing the
owner's sign-in. It runs outside `withAudit` because there is no session and
no surviving row to stamp. Two partial indexes serve it, one per half of the `OR`:
`users_provisional_updated_at_idx` and `users_provisional_created_at_idx`,
each `WHERE email_verified = false`. The rest is [`auth.md`](../auth.md), "Provisional accounts".
