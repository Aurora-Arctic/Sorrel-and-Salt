# claude-docs

Working documentation for Sorrel & Salt. Everything here supports the code; when
it disagrees with [`DESIGN.md`](DESIGN.md), the design doc wins and the other
file gets fixed.

**The summaries are the working set** — the current shape of each area, and
enough to start a task without opening anything else. They are meant to be
self-sufficient: if you need a transcript or an archived record to understand
how the system works today, that is a defect in the summary, not a research step.

| Path                                | What it holds                                                                                                                            |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `DESIGN.md`                         | The specification. The source of truth for behaviour.                                                                                    |
| `TASKS.md`, `TASKS.csv`             | The frozen original work breakdown. The live list of what to do is the Asana board (see [`CLAUDE.md`](../CLAUDE.md)).                    |
| `<subsystem>.md`                    | **A summary per subsystem** — the current shape of one area, kept short. States decisions, not how they were reached.                    |
| `components/<name>.md`              | **One doc per standalone component.** Required by several tasks; a component that ships without its doc is an incomplete task.           |
| `transcripts/<subsystem>.md`        | **An append-only transcript** — how a subsystem reached its shape. Newest entry last, never rewritten. Current milestone only.           |
| `design-decisions/<mN.n>-<slug>.md` | A decision record — what was decided, why, and what it rules out. Current milestone only.                                                |
| `archive/<mN>/`                     | **Write-once.** Closed milestones' transcripts and decision records, plus text cut from a live doc. See [`archive/`](archive/README.md). |

## What lives where, and what to read

- A **summary** is the page you read first, and the only one you should need. It
  carries the decision and the constraint, not the story of how they were
  reached. Where a constraint would look arbitrary without a reason, give the
  reason in a clause — not a link out.
- A **transcript** is written as work lands: one entry per milestone or session,
  appended, never edited after the fact.
- A **decision record** captures the reasoning behind one contested choice so it
  does not get re-argued.
- At the end of a milestone, its transcripts and decision records **move** into
  `archive/<mN>/`, and the compression pass trims the summaries down to what is
  still true. The live directories then start empty for the next milestone.

## `archive/` is written, not read

Everything under `archive/` is write-once, and **nothing there is required
reading**. It exists so that superseded text stays recoverable without sitting
in the way of the docs every session opens first. Treat it as out of context:

- **Do not read it for context.** Archived files record what was believed when
  they were written and are allowed to be wrong. A live doc that sends you into
  `archive/` to understand the system is a bug in the live doc.
- **Do not edit it to correct something.** Fix the live doc instead.
- **Empty it of anything still true before you fill it.** Moving a transcript or
  decision record in is the last step of a compression pass, not the first: every
  settled decision and binding constraint it holds must already be written into a
  live summary, `CLAUDE.md`, or a component doc. Verify that a line at a time —
  the ones that get lost are the constraints stated once, in passing, years of
  context ago.
- **Check the move mechanically**, by diffing the live doc against `HEAD`.
  Normalise whitespace first: Prettier re-pads a whole Markdown table column when
  one cell changes, and a naive diff reports every row of it as a removal.
- A second pass over a milestone whose filenames are already taken writes a
  dated subdirectory rather than editing what is already there.

## Naming

Lower-kebab-case, matching the component directory names — `theme-toggle.md`,
not `THEME-TOGGLE.md`. A subsystem summary and its transcript share a filename
(`styling.md` ↔ `transcripts/styling.md`).
