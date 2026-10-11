## The provisional-account delete (MB.67)

`deleteProvisionalUsers(lifetimeSeconds, capSeconds)` is the one hard delete of a table
carrying `deleted_at`, and it is a named export rather than a loosening of
`write.delete`'s type. It removes every `users` row that is unverified,
holds at least one `accounts` row, and has an `updated_at` older than
`now()` minus the lifetime or a `created_at` older than `now()` minus the
cap. `accounts` and `sessions` follow by their
`ON DELETE CASCADE`. Both cutoffs are the database's clock, as the columns are. The `EXISTS` over `accounts` is `existsIn`'s, so the delete builds no read
of its own.

It skips a row holding any `user_privilege_changes` row (MB.204), as
`not(existsIn(...))`, the negation `citesNothing` uses. Such an account is
one an admin has vouched for, and the ledger references it with a plain
foreign key, so deleting it would fail the whole statement, and every sweep
after it, over one account. The rows are not deleted with it either:
`forbid_rewrite` refuses that, and the ledger is the history.

It is hard for a reason outside this layer: Better Auth reads `users` by
address with no `deleted_at` filter, so a tombstone would keep refusing the
owner's sign-in. It runs outside `withAudit` because there is no session and
no surviving row to stamp. Two partial indexes serve it, one per half of the `OR`:
`users_provisional_updated_at_idx` and `users_provisional_created_at_idx`,
each `WHERE email_verified = false`. The rest is [`auth/admin-bootstrap.md`](../auth/admin-bootstrap.md), "Provisional accounts".
