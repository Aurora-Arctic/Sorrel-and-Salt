# 0074_curator-role — destructive DDL

Destructive DDL acknowledged: this adds the site role `curator` (M11.20) and widens the CHECK that holds a privileged account to the workspace-creation flag from admins alone to every role but `user`. The CHECK `users_admin_can_create_workspace` is dropped and `users_privileged_can_create_workspace` added in the same transaction, so no write meets `users` without one. Every row the old CHECK accepted, the new one accepts too, since before this migration no row holds `curator`.

## Findings this covers

| Rule              | Statement                                                                |
| ----------------- | ------------------------------------------------------------------------ |
| DROP (any object) | `ALTER TABLE "users" DROP CONSTRAINT "users_admin_can_create_workspace"` |

## Why it is a replacement and not an expand

The old CHECK names `admin`; the new one names `user`, the one role that may lack the flag. Writing it as `role not in ('admin', 'curator')` would use the value this same migration adds, which Postgres refuses until the transaction that added it commits. Naming `user` also means a later role is held to the flag without the CHECK changing again.

## What is lost

Nothing. The constraint's name changes, and the deploy before this one never reads it. A rollback to that deploy finds a role it does not know only on an account an admin has made curator since, and that account still holds the flag.
