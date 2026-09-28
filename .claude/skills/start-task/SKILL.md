---
name: start-task
description: Use when the user wants to begin work on an Asana task by its Task ID (e.g. "start M0.31", "start a task", "/start-task"). Looks the task up on the Sorrel & Salt board, runs /create-feature or /create-hotfix depending on whether it's a hotfix, then starts implementing the task on the new branch.
---

# start-task

One entry point for "begin this Asana task": take a `Task ID`, find the task on the **Sorrel & Salt** board, hand off to `/create-feature` or `/create-hotfix` depending on whether it's a hotfix, and then implement the task on the branch that skill creates. The branch skill is passed the task so it isn't asked for twice; steps 1–5 set up the branch and move the task to `In Progress`, and step 6 does the work.

## Which branch skill

The board's `Type` field is gone — custom fields are premium and the workspace is on Asana's free plan. Route on what the task itself says:

| Task looks like                                                           | Branch skill                                      |
| ------------------------------------------------------------------------- | ------------------------------------------------- |
| Anything under a wave card; an `MB.*` task with nothing marking it urgent | `create-feature` (`feature/<slug>` off `staging`) |
| Title or notes call it a hotfix, or it fixes something already on `main`  | `create-hotfix` (`hotfix/<slug>` off `main`)      |

The id prefix does **not** decide this: `MB.*` covers ordinary bugfixes and hotfixes alike, and the board's `Bugfixes` section holds both. The rest of the board's shape, and the status markers step 3 reads, are in [`CLAUDE.md`](../../../CLAUDE.md)'s "Asana task tracking" section.

## Steps

1. **Ask for the Asana Task ID.**
   - Send a `PushNotification` (status `proactive`) saying input is needed, then ask in plain chat for the task's `Task ID` — the `M0.1`-style identifier. Free-text, no multiple-choice options. Wait for the reply.

2. **Find the task.**
   - Use the two-call lookup in [`CLAUDE.md`](../../../CLAUDE.md)'s "Asana task tracking" section: `asana_get_tasks` with `project` = `1218814916390986` and `opt_fields=name,notes,gid,completed` returns the wave cards and the top-level `MB.*` tasks; if the id isn't among them, `asana_get_task` on the wave card whose `notes` name it, with `opt_fields=subtasks.name,subtasks.gid,subtasks.completed`, and match the subtask's id segment exactly — strip the marker, then compare the text up to the `—` that follows it, because thirty of the board's ids are a strict prefix of another (`M2.1` and `M2.10`, `M4.1` and `M4.1a`). There is no text search — `asana_search_tasks` is premium and returns `payment_required`.
   - Zero matches, or more than one exact match: stop, tell the user what you found, and don't guess.

3. **Check the task isn't already underway.**
   - Read the status off the name's leading marker — none is `Not Started`, `▶ ` is `In Progress`, `◔ ` is `In Review` — and off the completed checkbox, which is `Completed`. If it's anything other than `Not Started`, name the current status and use AskUserQuestion to confirm before continuing — the branch skill will try to move it to `In Progress`, and for a task already `In Review`/`Completed` that's a backward step the branch skills won't take on their own.

4. **Pick the branch skill.**
   - Apply the table above, reading the task's title, its notes, and which section or wave card it sits under.
   - If nothing marks it a hotfix, that's `create-feature` — the ordinary case.
   - If it's genuinely ambiguous, don't assume: quote the line you're unsure about and ask (AskUserQuestion) which to run. The two skills branch off different bases, and rebasing commits onto the other one is the expensive way to find out.

5. **Hand off.**
   - Follow the chosen skill's `SKILL.md` from its step 1, with one change: its step 2 asks for both a branch name and the Asana Task ID — both are already known here, so skip that question entirely. The Task ID came from step 1; derive the branch slug automatically from the task name — take the part after the `M0.x — ` prefix, slugify it per the chosen skill's step 3, drop leading filler verbs/articles (`add`, `create`, `stand up`, `the`, `a`), keep at most the first 6 words, and prefix the lowercased milestone id (e.g. `M0.30 — Stand up Ladle as the component workshop` → `m0.30-ladle-component-workshop`). Don't ask the user to confirm or override it; just state the branch name you're using.
   - Everything else in that skill runs unchanged — including its step 7, which moves this task to `In Progress`.

6. **Start the work.**
   - The branch exists and the task is `In Progress`. Pull the full task detail — `asana_get_task` for the complete `notes` (user story, description, acceptance criteria) — and read the `DESIGN.md` §section and `TASKS.md` milestone it references, plus any `claude-docs/design-decisions/` record for a prior task it builds on.
   - Implement it following [`CLAUDE.md`](../../../CLAUDE.md): TDD (write the failing test first, watch it fail, then the minimum), **one task per PR** — do only this task, not adjacent ones — port from `resume-2026` rather than rewriting from memory, and document as you go in `claude-docs/`.
   - Comment progress on the Asana task as work proceeds, per [`CLAUDE.md`](../../../CLAUDE.md)'s Asana section. Do **not** move the status past `In Progress`: `/create-pr` sets `In Review`, and `Completed` is merge-only.
   - Stop when every acceptance criterion is demonstrably met and the checks named in [`CLAUDE.md`](../../../CLAUDE.md) for what you touched pass. Tell the user it's ready; opening the PR is a separate, explicit `/create-pr`.

## Notes

- Branch creation and git are entirely the delegated branch skill's job (steps 1–5). If it stops early (dirty tree, branch-name collision, `fetch` failure), this skill stops with it and step 6 never starts.
- Step 6 is the one place this skill edits the repo. It still never commits or opens the PR — that stays an explicit `/create-pr`.
- The routing table is the only project-specific knowledge here. If the board's layout changes, update the table above and step 4.
- The project GID, the status markers and the lookup are mirrored from [`CLAUDE.md`](../../../CLAUDE.md)'s "Asana task tracking" section — that section is the source of truth if they ever drift.
