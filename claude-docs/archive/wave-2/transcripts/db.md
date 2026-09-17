# Database — transcript (Wave 2 slice)

## 2026-09-11 — M1.19: `app.current_user_id` per transaction

`withAudit` now issues
`select set_config('app.current_user_id', $1, true)` as the first statement
inside its transaction, before `fn` runs.

Written as `set_config` rather than the `SET LOCAL` the design doc and
TASKS.md both spell out. The semantics are identical — `is_local => true`
_is_ `LOCAL` — but `SET LOCAL` accepts no bind parameters, so taking the
doc literally would mean interpolating a user id into SQL text at the one
place in the codebase whose whole job is to be the trustworthy write choke
point. The docs describe the intent (a transaction-scoped GUC carrying the
acting user); `set_config` is how that intent is expressed safely, and
`claude-docs/db.md` now records the divergence and its reason.

Observing the GUC needed some thought, because M1.16 deliberately gives
callers no handle on the transaction — only `insert`/`update`/
`softDelete`. Widening `AuditWriter` with a read method for a test's
benefit would have undone that. Instead the scratch probe table grew an
`acting_user` column defaulted from `current_setting('app.current_user_id',
true)`, so an ordinary insert through the writer reports back what the GUC
held inside its own transaction. It's also a rehearsal of what M6.4's RLS
policies will do with the same setting.

Three new assertions cover the acceptance criteria: the acting user is
visible to SQL inside the transaction; 24 concurrent `withAudit` calls with
distinct user ids each see their own (the pooled-connection leak case, which
a session-level `SET` would fail); and a connection outside any
`withAudit` transaction sees the setting unset. The "write without a
session is rejected" criterion was already met by M1.16's guard — it now also
has a test asserting the guard runs _before_ the transaction opens, so there
is no window in which a write happens with the GUC unset.
