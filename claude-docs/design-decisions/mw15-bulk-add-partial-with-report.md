# MW.15 — Bulk add is partial, with a report

**Status:** decided. Bulk add itself is deferred (`../backlog.md`); this rule binds it when it is built.

**Decided:** a bulk add is not all-or-nothing. It adds what it can and returns a report of what it skipped.

## Why

Skipping an entry that is already present is the expected case on a re-run, not a failure. The call aborts only on ids the user could not act on anyway.
