---
name: start-task
description: Use when the user wants to begin work on a tracked task by its Task ID (e.g. "start M0.31", "start a task", "/start-task"). Looks the task's issue up on the Sorrel & Salt board with `scripts/task-board.mjs find`, runs /create-feature or /create-hotfix depending on whether it's a hotfix, then starts implementing the task on the new branch.
---

# start-task

One entry point for "begin this task": take a `Task ID`, find its issue on the **Sorrel & Salt** board, hand off to `/create-feature` or `/create-hotfix` depending on whether it's a hotfix, and then implement the task on the branch that skill creates. The branch skill is passed the task so it isn't asked for twice; steps 1–5 set up the branch and move the task to `In Progress`, and step 6 does the work.

## Which branch skill

Route on the `hotfix` label first, then on what the issue itself says:

| Task looks like                                                                                             | Branch skill                                      |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| No `hotfix` label, and nothing in the title or body marks it urgent                                         | `create-feature` (`feature/<slug>` off `staging`) |
| Carries the `hotfix` label; or the title or body calls it a hotfix, or it fixes something already on `main` | `create-hotfix` (`hotfix/<slug>` off `main`)      |

The id prefix does **not** decide this: an `MB.*` id, and the `Bug` issue type, hold ordinary bugfixes and hotfixes alike. The status values step 3 reads are in [`CLAUDE.md`](../../../CLAUDE.md)'s "GitHub task tracking" section, and the rest of the board's shape in [`claude-docs/task-tracking.md`](../../../claude-docs/task-tracking.md).

## Steps

1. **Ask for the Task ID.**
   - Send a `PushNotification` (status `proactive`) saying input is needed, then ask in plain chat for the task's `Task ID` — the `M0.1`-style identifier. Free-text, no multiple-choice options. Wait for the reply.

2. **Find the task.**
   - `node scripts/task-board.mjs find <ID>` — prints one JSON object (`number`, `title`, `state`, `stateReason`, `url`, `milestone`, `labels`, `status`) on exactly one match and exits non-zero otherwise. It matches the title on `<ID> — ` exactly, so `M2.1` never finds `M2.10`; look a task up through it and nothing else ([`claude-docs/task-tracking.md`](../../../claude-docs/task-tracking.md), "The title rule", says why).
   - Zero matches, or more than one: stop, tell the user what you found, and don't guess.

3. **Check the task isn't already underway.**
   - Read `status` off the `find` output — `Not Started`, `In Progress` or `In Review` — and `state`: a closed issue is `Done` (`stateReason` `COMPLETED`) or retired (`NOT_PLANNED`) whatever the field says. If it's anything other than `Not Started`, name the current status and use AskUserQuestion to confirm before continuing — the branch skill will try to move it to `In Progress`, and for a task already `In Review`/`Done` that's a backward step the branch skills won't take on their own.

4. **Pick the branch skill.**
   - Apply the table above, reading the issue's labels, its title, its body, and its milestone.
   - If nothing marks it a hotfix, that's `create-feature` — the ordinary case.
   - If it's genuinely ambiguous, don't assume: quote the line you're unsure about and ask (AskUserQuestion) which to run. The two skills branch off different bases, and rebasing commits onto the other one is the expensive way to find out.

5. **Hand off.**
   - Follow the chosen skill from step 1 of the shared [`create-feature/reference-branch.md`](../create-feature/reference-branch.md), with the base and prefix its `SKILL.md` passes, and one change: step 2 there asks for both a branch name and the Task ID — both are already known here, so skip that question entirely. The Task ID came from step 1; derive the branch slug automatically from the issue title — take the part after the `M0.x — ` prefix, slugify it per that reference's step 3, drop leading filler verbs/articles (`add`, `create`, `stand up`, `the`, `a`), keep at most the first 6 words, and prefix the lowercased milestone id (e.g. `M0.30 — Stand up Ladle as the component workshop` → `m0.30-ladle-component-workshop`). Don't ask the user to confirm or override it; just state the branch name you're using.
   - Everything else in that skill runs unchanged — including its step 7, which moves this task to `In Progress`.

6. **Start the work.**
   - The branch exists and the task is `In Progress`. Pull the full issue — `gh issue view <number> --json body,title,milestone,labels` for the complete body (user story, description, acceptance criteria) — and read the `DESIGN.md` §section it references, the task's entry — from its `**<ID> — ` heading to the next — in `claude-docs/tasks/<milestone>.md` (`m0` … `m11`, `m7a`, `mb` or `mw`), and its wave's `claude-docs/waves/wave-<NN>.md`, plus any `claude-docs/design-decisions/` record for a prior task it builds on. Never the whole milestone file: `mb.md` alone is 400 KB.
   - Implement it following [`CLAUDE.md`](../../../CLAUDE.md): TDD (write the failing test first, watch it fail, then the minimum), **one task per PR** — do only this task, not adjacent ones — and document as you go in `claude-docs/`.
   - Comment progress as work proceeds: `node scripts/task-board.mjs comment <ID> "<text>"`. **Names, never values**, as [`CLAUDE.md`](../../../CLAUDE.md) spells out: a comment may name an env var, a file or a provider, never what it holds. Do **not** move the status past `In Progress`: `/create-pr` sets `In Review`, and `Done` is the merge's.
   - Stop when every acceptance criterion is demonstrably met and the checks named in [`CLAUDE.md`](../../../CLAUDE.md) for what you touched pass. Tell the user it's ready; opening the PR is a separate, explicit `/create-pr`.

## Notes

- Branch creation and git are entirely the delegated branch skill's job (steps 1–5). If it stops early (dirty tree, branch-name collision, `fetch` failure), this skill stops with it and step 6 never starts.
- Step 6 is the one place this skill edits the repo. It still never commits or opens the PR — that stays an explicit `/create-pr`.
- The routing table is the only project-specific knowledge here. If the board's layout changes, update the table above and step 4.
- The lookup, the status values and the comment rule are mirrored from [`CLAUDE.md`](../../../CLAUDE.md)'s "GitHub task tracking" section and its long form, [`.claude/rules/task-tracking.md`](../../rules/task-tracking.md) — those are the source of truth if they ever drift.
