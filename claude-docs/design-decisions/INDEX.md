# Design decisions

One record per task where a choice needed explaining — what was decided, why,
and what it rules out. Named `<mN.n>-<slug>.md`.

**M0's records are archived** under `../archive/m0/design-decisions/`, Wave 1's
`mb.5-task-resequencing.md` under `../archive/wave-1/design-decisions/`, and
Wave 2's three (`mb.20`, `mb.22`, `mb.23`) under
`../archive/wave-2/design-decisions/`. None is required reading. Nothing archived them but the
compression pass, and MB.31 retired it — so **records now stay here**, and one
that is overtaken gets a status line at the top saying what superseded it
rather than being moved. Every decision and constraint a record holds must
also be written into the live summary that depends on it: if you find yourself
needing a record to understand the system, the summary is missing something,
and the summary is what to fix.

Write a new record when a task's choice would otherwise get re-argued later;
link it from the subsystem summary that depends on it.
