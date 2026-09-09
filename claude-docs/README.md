# claude-docs

Working documentation for Sorrel & Salt. Everything here supports the code; when
it disagrees with [`DESIGN.md`](DESIGN.md), the design doc wins and the other
file gets fixed.

| Path                                | What it holds                                                                                                                                   |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `DESIGN.md`                         | The specification. The source of truth for behaviour.                                                                                           |
| `TASKS.md`, `TASKS.csv`             | The frozen original work breakdown. The live list of what to do is the Asana board (see [`CLAUDE.md`](../CLAUDE.md)).                           |
| `<subsystem>.md`                    | **A summary per subsystem** — the current shape of one area, kept short. Opens with a link to its transcript.                                   |
| `transcripts/<subsystem>.md`        | **An append-only transcript** — the chronological record of how that subsystem reached its current shape. Newest entry last. Never rewritten.   |
| `components/<name>.md`              | **One doc per standalone component.** Required by several tasks; the M0.30 workshop and its CI check expect every component to have one.        |
| `design-decisions/<mN.n>-<slug>.md` | A decision record for a task where a choice needed explaining — status, date, what was decided, and what it rules out.                          |
| `archive/<mN>/`                     | **Write-once.** Text cut from a live doc by the end-of-milestone compression pass, never deleted. See [`archive/README.md`](archive/README.md). |

## How the three kinds relate

- The **transcript** is written as work happens — one entry per milestone or
  session, appended, never edited after the fact.
- The **summary** is written (or rewritten) once a subsystem's shape settles. It
  is the page you read first; it links down into the transcript for the history.
- A **design decision** captures the reasoning behind one choice so it does not
  have to be re-argued. The transcript points at it rather than repeating it.
- The **archive** is where a summary (or `CLAUDE.md`) ends up losing text —
  the end-of-milestone compression pass trims what's settled or resolved out
  of the live doc and files it under `archive/<mN>/` instead of discarding it.

## Naming

Lower-kebab-case, matching the component directory names — `theme-toggle.md`,
not `THEME-TOGGLE.md`. A subsystem summary and its transcript share a filename
(`styling.md` ↔ `transcripts/styling.md`).
