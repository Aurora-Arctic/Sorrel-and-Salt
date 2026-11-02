# claude-docs

Working documentation for Sorrel & Salt. Everything here supports the code; when
it disagrees with [`DESIGN.md`](DESIGN.md), the design doc wins and the other
file gets fixed.

**The summaries are the working set** — the current shape of each area, and
enough to start a task without opening anything else. They are meant to be
self-sufficient: if you need a transcript or an archived record to understand
how the system works today, that is a defect in the summary, not a research step.

**The agent guidance sits beside this directory**, not in it: `CLAUDE.md` at the
root is loaded on every turn, and its long forms are `.claude/rules/<area>.md`,
each loaded only once a file in its area is read ([`agent-skills.md`](agent-skills.md),
"Rule files"). The full command table is [`commands.md`](commands.md).

| Path                                | What it holds                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DESIGN.md`                         | The specification. The source of truth for behaviour.                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `TASKS.md`                          | The work breakdown's index: the deferrals, the execution-order table and the list of milestone files, corrected in place. The rules every task follows are `CLAUDE.md`'s. The live list of what to do is the GitHub issue tracker (see [`CLAUDE.md`](../CLAUDE.md)).                                                                                                                                                                                                                            |
| `tasks/<milestone>.md`              | One milestone section of the breakdown each (`m0` … `m11`, `m7a`, `mb`, `mw`), read as one document in the order `scripts/tasks-md.mjs` declares. A task is read by its `**<ID> — ` heading, never the file.                                                                                                                                                                                                                                                                                    |
| `waves/wave-NN.md`                  | Why a wave's tasks sit where they do — the reasoning column of `TASKS.md`'s execution-order table, one file per wave, linked from its row.                                                                                                                                                                                                                                                                                                                                                      |
| `backlog.md`                        | The owner's running list of what comes after v1 — fonts, design, v2's billing, V3, and the public launch's WAF and RLS. Not a task list: a task is minted when it is scheduled.                                                                                                                                                                                                                                                                                                                 |
| `task-tracking.md`                  | The issue tracker and Project board: title and status rules, `scripts/task-board.mjs`, the close-on-merge Action, and the one-off Asana migration script.                                                                                                                                                                                                                                                                                                                                       |
| `<subsystem>.md`                    | **A summary per subsystem** — the current shape of one area, kept short. States decisions, not how they were reached. [`modules.md`](modules.md) is the one that says where code lives: the five domain modules, what each owns, and the boundary between them.                                                                                                                                                                                                                                 |
| `loading.md`                        | The loading standard (M12.33): the three parts of a wait (control, region, page), the reduced-motion pulse, the coven switch, why there is no `loading.tsx`, how to adopt it, and the sourced research behind it.                                                                                                                                                                                                                                                                               |
| `dependencies.md`                   | What is behind, blocked or unfixable among the direct dependencies, how to rerun the audit, and when to look again.                                                                                                                                                                                                                                                                                                                                                                             |
| `security-headers.md`               | The headers every page carries (content security policy, referrer policy, `nosniff`), why HSTS is left to Vercel, and how to allow a new third-party source.                                                                                                                                                                                                                                                                                                                                    |
| `<summary>/<section>.md`            | **A summary too large to read whole, one `## ` section a file** — `db/`, `auth/`, `ci/`, `testing/` and `graphql/` — moved as is, and a `### ` subsection too when it is large enough to read alone. `<summary>.md` is their index: it keeps every `## ` and `### ` heading with a link, and a sentence for each section. Code cites the file, and a reader opens it, rather than the index. `scripts/split-doc.mjs` makes the split and `scripts/repoint-doc-citations.mjs` points code at it. |
| `components/<name>.md`              | **One doc per standalone component.** Required by several tasks; a component that ships without its doc is an incomplete task.                                                                                                                                                                                                                                                                                                                                                                  |
| `transcripts/<subsystem>.md`        | **Frozen as of MB.31** — how a subsystem reached its shape. No longer appended to; a PR body is the record now.                                                                                                                                                                                                                                                                                                                                                                                 |
| `design-decisions/<mN.n>-<slug>.md` | A decision record — what was decided, why, and what it rules out. Live; superseded in place, never archived mid-project.                                                                                                                                                                                                                                                                                                                                                                        |
| `archive/m0/`, `archive/wave-<n>/`  | **Frozen.** M0's and waves 1–2's transcripts and decision records, plus text cut from a live doc. Nothing new goes in. See [`archive/`](archive/README.md).                                                                                                                                                                                                                                                                                                                                     |

## What lives where, and what to read

- A **summary** is the page you read first, and the only one you should need. It
  carries the decision and the constraint, not the story of how they were
  reached. Where a constraint would look arbitrary without a reason, give the
  reason in a clause; the argument at length is its decision record's, cited
  ("One home per fact" below).
- A **code comment** is the other half of that rule, pointing the other way. The
  comment says what the code is and why it is not the obvious alternative; the
  argument for the choice lives here, in the docs. So a doc that defers
  outward is a defect, and a comment that re-argues a decision at length is
  duplication — the doc is the copy that can be corrected in one place, where the
  comment is the copy that gets pasted into sixteen files and drifts. The rule
  in full is "Comments in code" below. Prose that leaves a comment lands in the
  summary for its subsystem, never in `archive/`.
- A **transcript** was written as work landed, one entry per task or session.
  MB.31 stopped that: the five that exist are frozen, and a PR body now carries
  what one would have said.
- A **decision record** captures the reasoning behind one contested choice so it
  does not get re-argued.
- A summary is corrected in the PR that makes it wrong — "Correcting a doc"
  below.

## One home per fact

A summary stands on its own for the **current shape**, and cites for the
**argument**. Each fact has one home, and every other mention is a clause and a
citation, so that a correction is one edit and a read is one page (MB.147):

| Fact                                | Home                                                       |
| ----------------------------------- | ---------------------------------------------------------- |
| A binding rule                      | `CLAUDE.md`, or its long form in `.claude/rules/<area>.md` |
| Specified behaviour and data model  | `DESIGN.md`, cited by §                                    |
| A subsystem's current shape         | its summary, `<subsystem>.md` or `<summary>/<section>.md`  |
| The argument for a contested choice | its decision record in `design-decisions/`                 |
| A task's scope                      | its entry in `tasks/<milestone>.md`                        |
| Ordering reasoning                  | its wave's `waves/wave-NN.md`                              |

- A **task entry** keeps its story, scope and acceptance criteria, and cites the
  §, summary or rule it implements. Its "Decided while building" keeps the
  decision in a sentence and cites the record for the argument, unless no
  record holds it, in which case the entry is its home.
- A **plan record** keeps the context and argument behind what was approved;
  the tasks it minted are their entries, not a draft beside them.
- A **summary** keeps the reason for a constraint in a clause and drops the
  history of how it got there, which is its tasks' and records'.
- A **rule file** loads beside `CLAUDE.md`, so it adds to `CLAUDE.md`'s line
  rather than repeating it.
- A **wave's GitHub milestone** carries its task ids and a link to its wave
  file; the reasoning is the wave file's alone.

`node scripts/doc-overlap.mjs` measures what is left: the runs of eight words
that two or more live docs and skills share, and the pairs sharing most, while
`node scripts/doc-overlap.mjs <a.md> <b.md>` prints the passages one shares
with the other. It is a report, not a guard, because a citation's clause
legitimately repeats a few words of what it cites and no threshold tells that
from a copy. MB.147's pass took it from 7,536 runs to 3,937, working pair
by pair from the largest and stopping where a pair shares under about 60.

## Comments in code

A comment describes the code as it is. It says what this is and, where the
obvious alternative would be wrong, why it is built this way instead, in one
present-tense clause. Everything else about the code lives here, under
`claude-docs/`: when it was built, which task built it, who decided, what was
tried first, and what will replace it. A reader should get through a file with
nothing but the code open (`CLAUDE.md`, Conventions; the record is
`design-decisions/m14.32-comment-guidelines.md`).

- **History never appears in a comment.** No task id (`M10.5`, `MB.115`,
  `MW.15`), no `Story 14` or `Wave 11`, no "the owner's call", no date, no
  "added by", "until X lands" or "not built yet". A constraint that would look
  arbitrary without its history gets a doc pointer in citation form,
  `(claude-docs/db/keyset-pages.md, "Keyset pages")`, and the doc carries the
  provenance and the argument. The doc is the copy that can be corrected in
  one place; the comment is the copy that would be duplicated across files.
- **One to three lines.** A field or prop doc is one line. A file header is one
  or two sentences saying what the file holds. More than three lines is a
  defect in the docs, not a reason for a longer comment: write the section
  here and cite it. The rule bounds explanation, not facts: a comment is never
  cut below the facts the reader cannot recover from the code.
- **These stay whatever their length.** Behaviour not visible from the code
  (`slugify` returns `''` for `'...'`); hard-won tool and runtime facts
  (`VITEST_POOL_ID` counts workers where `VITEST_WORKER_ID` counts files); the
  reasoning the Testing rules mandate about why an authorization test could
  have passed; and every comment a tool reads, such as `oxlint-disable`,
  `@ts-expect-error` and its message, `eslint-disable` in a generated file,
  and the `@supports` and Baseline notes the browser-floor rule asks for.
- **Say a thing once.** A sentence that would be pasted into a second file
  belongs on the shared helper, the type, or the doc it describes, and the
  copies become a pointer or nothing. A `@throws` line, a stories-file note or
  a framework fact repeated across files is the sign.
- **Plain writing applies**: everyday words, the thing described before it is
  named, one idea per sentence (`.claude/rules/writing.md`, "Code comments").
- **Review holds this rule**, with no mechanical guard on density or on history
  markers, by the owner's decision of 2026-10-29: a density guard cannot be
  written without penalising the comments the third bullet protects, and a
  marker guard was declined. Citation is held by review too, since MB.224
  retired its guard with the rest of the agent-only tooling's tests: a
  `claude-docs/` path resolves and never points into `archive/`, in code, in
  `CLAUDE.md` and in the markdown under `.claude/`, and a section is cited in
  the file it lives in, not through a split summary's index —
  `claude-docs/db/keyset-pages.md, "Keyset pages"`, never `db.md`'s heading
  for it.

## Correcting a doc

A doc is corrected in the PR that makes it wrong (MB.31). There is no scheduled
compression pass: a statement goes stale in a particular diff, and that diff is
where it is cheapest to fix and hardest to forget. `MW.15`, the v1 close-out,
is the one remaining pass over the whole set. Decision records stay live and
are superseded in place.

- **The test is "is this statement out of date?", not "is this narrative?"**
  Two things are never cut for being old: a forward-looking rule that still
  binds later work, and history that is still true. Trimming a rule because it
  reads like background is how a rule gets lost.
- **A summary must stand on its own.** If understanding how the system works
  today means opening a decision record or an archived file, that is a defect
  in the summary, not a research step.
- **When a doc and the code disagree, establish which one is wrong before
  reconciling them.** Editing the doc to match the code launders a bug into
  documented behaviour. A documentary asymmetry — one change argued at length,
  its reversal recorded nowhere — is evidence of intent, not proof of it. Ask.

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
(`styling.md` ↔ `transcripts/styling.md`). A section file is named for its
heading, shortened and without the task id — `db/keyset-pages.md` for "Keyset
pages (M3.6)".
