---
name: start-task
description: Use when the user wants to begin work on a tracked task by its Task ID (e.g. "start M0.31", "start a task", "/start-task"). Looks the task's issue up on the Sorrel & Salt board with `scripts/task-board.mjs find`, runs /create-feature or /create-hotfix depending on whether it's a hotfix, then starts implementing the task on the new branch.
---

# start-task

Take a `Task ID`, find its issue on the **Sorrel & Salt** board, hand off to `/create-feature` or `/create-hotfix`, and then implement the task on the branch that skill creates. Steps 1–5 set up the branch and move the task to `In Progress`; step 6 does the work.

## Which branch skill

Route on the `hotfix` label first, then on what the issue itself says:

| Task looks like                                                                                             | Branch skill                                      |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| No `hotfix` label, and nothing in the title or body marks it urgent                                         | `create-feature` (`feature/<slug>` off `staging`) |
| Carries the `hotfix` label; or the title or body calls it a hotfix, or it fixes something already on `main` | `create-hotfix` (`hotfix/<slug>` off `main`)      |

The id prefix does **not** decide this: an `MB.*` id holds new work, ordinary bugfixes and hotfixes alike. The status values are in [`CLAUDE.md`](../../../CLAUDE.md), "GitHub task tracking", and the board's shape in [`claude-docs/task-tracking.md`](../../../claude-docs/task-tracking.md).

## Steps

1. **Ask for the Task ID.**
   - Send a `PushNotification` (status `proactive`) saying input is needed, then ask in plain chat for the `Task ID` (the `M0.1`-style identifier), free text. Wait for the reply.

2. **Find the task.**
   - `node scripts/task-board.mjs find <ID>` prints one JSON object (`number`, `title`, `state`, `stateReason`, `url`, `milestone`, `labels`, `status`) on exactly one match and exits non-zero otherwise. It matches the title on `<ID> — ` exactly ([`claude-docs/task-tracking.md`](../../../claude-docs/task-tracking.md), "The title rule"); look a task up through it and nothing else.
   - Zero matches, or more than one: stop, tell the user what you found, and don't guess.

3. **Check the task isn't already underway.**
   - Read `status` (`Not Started`, `In Progress` or `In Review`) and `state`: a closed issue is `Done` (`stateReason` `COMPLETED`) or retired (`NOT_PLANNED`) whatever the field says. If it isn't `Not Started`, name the status and use AskUserQuestion to confirm before continuing, since moving it to `In Progress` would be a backward step the branch skills won't take on their own.

4. **Pick the branch skill.**
   - Apply the table above to the issue's labels, title, body and milestone. If nothing marks it a hotfix, run `create-feature`.
   - If it's genuinely ambiguous, quote the line you're unsure about and ask (AskUserQuestion) which to run. The two skills branch off different bases.

5. **Hand off.**
   - Follow the chosen skill from step 1 of the shared [`create-feature/reference-branch.md`](../create-feature/reference-branch.md), with the base and prefix its `SKILL.md` passes. Skip that reference's step 2 question: the Task ID is known from step 1, and you derive the slug from the issue title. Take the part after the `M0.x — ` prefix, slugify it per that reference's step 3, drop leading filler words (`add`, `create`, `stand up`, `the`, `a`), keep at most six words, and prefix the lowercased id (`M0.99 — Stand up the example service` → `m0.99-example-service`). State the branch name; don't ask.
   - Everything else in that skill runs unchanged, including its step 7, which moves this task to `In Progress`.

6. **Start the work.**
   - Pull the full issue (`gh issue view <number> --json body,title,milestone,labels`). Read the `DESIGN.md` section it references, the task's entry (from its `**<ID> — ` heading to the next) in `claude-docs/tasks/<slug>/<milestone>.md`, its wave's `claude-docs/waves/<slug>/wave-<NN>.md` (`<slug>` is the directory of the task's Project in `scripts/task-projects.mjs`: `v1` or `v1-next`; `find` prints the Project), and any section of the `claude-docs/design-decisions/` area docs for a prior task it builds on (find it in `INDEX.md`). Never a whole milestone file: `v1/mb.md` alone is about 975 KB.
   - Implement it following [`CLAUDE.md`](../../../CLAUDE.md): TDD, **one task per PR**, and document as you go in `claude-docs/`.
   - Comment progress with `node scripts/task-board.mjs comment <ID> "<text>"`, naming things and never carrying values. Do **not** move the status past `In Progress`: `/create-pr` sets `In Review`, and the merge sets `Done`.
   - Stop when every acceptance criterion is demonstrably met and the tests you touched pass. Full suites wait until the owner says so. Tell the user it's ready; opening the PR is a separate, explicit `/create-pr`.

## Notes

- Git is the delegated branch skill's job (steps 1–5). If it stops early, this skill stops with it and step 6 never starts.
- Step 6 is the one place this skill edits the repo. It never commits or opens the PR.
- If the board's layout changes, update the routing table and step 4.
- The lookup, the status values and the comment rule come from [`CLAUDE.md`](../../../CLAUDE.md), "GitHub task tracking", and [`.claude/rules/task-tracking.md`](../../rules/task-tracking.md), which win if they drift.
