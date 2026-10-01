# Wave 01 — FK root

`users` first, because the whole FK graph roots on it: every table spreads `...auditColumns`, whose three `*_by` columns reference `users` ([`TASKS.md`](../TASKS.md), "Execution order"). M2.2 leads so Better Auth's adapter table ownership is settled before anything references `users`. M2.3's `role` column is what all of M5 waits on: M5.4's admin guard reads it, and without it there is no admin to bootstrap.
