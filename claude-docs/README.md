# claude-docs

Working documentation for Sorrel & Salt. Everything here supports the code; when
it disagrees with [`DESIGN.md`](DESIGN.md), the design doc wins and the other
file gets fixed.

**The summaries are the working set** — the current shape of each area, and
enough to start a task without opening anything else. They are meant to be
self-sufficient: if you need a transcript or an archived record to understand
how the system works today, that is a defect in the summary, not a research step.

| Path                                | What it holds                                                                                                                                               |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DESIGN.md`                         | The specification. The source of truth for behaviour.                                                                                                       |
| `TASKS.md`                          | The work breakdown and the reasoning behind it, corrected in place. The live list of what to do is the Asana board (see [`CLAUDE.md`](../CLAUDE.md)).       |
| `<subsystem>.md`                    | **A summary per subsystem** — the current shape of one area, kept short. States decisions, not how they were reached.                                       |
| `components/<name>.md`              | **One doc per standalone component.** Required by several tasks; a component that ships without its doc is an incomplete task.                              |
| `transcripts/<subsystem>.md`        | **Frozen as of MB.31** — how a subsystem reached its shape. No longer appended to; a PR body is the record now.                                             |
| `design-decisions/<mN.n>-<slug>.md` | A decision record — what was decided, why, and what it rules out. Live; superseded in place, never archived mid-project.                                    |
| `archive/m0/`, `archive/wave-<n>/`  | **Frozen.** M0's and waves 1–2's transcripts and decision records, plus text cut from a live doc. Nothing new goes in. See [`archive/`](archive/README.md). |

## What lives where, and what to read

- A **summary** is the page you read first, and the only one you should need. It
  carries the decision and the constraint, not the story of how they were
  reached. Where a constraint would look arbitrary without a reason, give the
  reason in a clause — not a link out.
- A **transcript** was written as work landed, one entry per task or session.
  MB.31 stopped that: the five that exist are frozen, and a PR body now carries
  what one would have said.
- A **decision record** captures the reasoning behind one contested choice so it
  does not get re-argued.
- A summary is corrected in the PR that makes it wrong (MB.31) — there is no
  scheduled compression pass. `MW.15`, the v1 close-out, is the one remaining
  pass over the whole set.

## `archive/` is written, not read

Everything under `archive/` is write-once, and **nothing there is required
reading**. It exists so that superseded text stays recoverable without sitting
in the way of the docs every session opens first. Treat it as out of context:

- **Do not read it for context.** Archived files record what was believed when
  they were written and are allowed to be wrong. A live doc that sends you into
  `archive/` to understand the system is a bug in the live doc.
- **Do not edit it to correct something.** Fix the live doc instead.
- **Nothing new goes in.** MB.31 retired the compression pass that filled it, so
  the archive is closed at what waves 1–2 put there. Text that leaves a live doc
  now either moves to another live doc because it still binds, or goes, and git
  history is the record.

## Naming

Lower-kebab-case, matching the component directory names — `theme-toggle.md`,
not `THEME-TOGGLE.md`. A subsystem summary and its transcript share a filename
(`styling.md` ↔ `transcripts/styling.md`).
