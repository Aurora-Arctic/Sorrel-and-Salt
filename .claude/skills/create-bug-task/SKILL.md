---
name: create-bug-task
model: sonnet
effort: medium
description: Use when the user wants to log a bug as a tracked task (e.g. "create a bug task", "log this bug", "/create-bug-task"). Asks for the bug and its steps to reproduce, drafts a user story, acceptance criteria and a name for review, then on approval files the issue in the Bugfixes milestone of the Sorrel & Salt board and adds its entry to `claude-docs/tasks/mb.md`.
---

# create-bug-task

Turn a bug report into a tracked `MB.*` task: an issue in the **Bugfixes** milestone and its entry in `claude-docs/tasks/mb.md`. Nothing is written until the user approves the draft.

Shared mechanics (drafting rules, the approval gate, minting, the doc edits) are in [`reference-mint.md`](reference-mint.md); this file holds only what is specific to bugs.

## Steps

1. **Get the bug in the user's own words first.** If they passed text with the command, use it. Otherwise send a `PushNotification` (status `proactive`) saying input is needed, then ask in plain chat, in one line and nothing else: "What happened? Describe the bug in your own words, as much as you like." This is the one question that is not an AskUserQuestion, because a dialog cannot take a paragraph. Wait for the reply. Never take it from the IDE selection, an open file such as `claude-docs/backlog.md`, or earlier conversation: those are not the request, so ask even when something looks like a match. Do not add options, examples or follow-up questions to it. Whatever the reply already says (the page, who was signed in, how often, how bad, where it was seen) is settled: never ask it again.
2. **Ask only for what the description left out, with AskUserQuestion**, never as a block of questions in chat. One call of up to four short questions, each with 2–4 options (the automatic "Other" takes free text), skipping any the description answered; if it answered all of them, skip the call. The questions, in this order: where it happens, always with exactly these four options and never reworded or swapped: "Sign-in & Account", "Coven & Grimoire", "Public Facing", "Admin & Compendium"; who they were signed in as, with exactly these options: "Signed out", "Coven owner", "Coven member or viewer", "Site admin"; how bad it is (blocks the user, wrong result, cosmetic); and whether it happens every time (always, sometimes, once). Where it was seen (local, staging, production) is asked only if the description does not say. Never fill an answer in yourself: steps drafted without them are guesses.
3. **Propose the steps to reproduce inside an AskUserQuestion**, built from the description and the answers to steps 1 and 2. Draft numbered steps from a known starting point, then an "Actual:" line and an "Expected:" line. Put the whole draft in the question text itself, one step per line, e.g. "1. Sign in as a coven owner\n2. Open /coven\n…\nActual: …\nExpected: …\n\nAre these steps right?". Do not describe the steps in a separate message or a sentence: the user must see the steps themselves in the dialog. Never leave a step, "Actual:" or "Expected:" blank; where the user hasn't said, infer it from their answers and mark it "(assumed)". Options: "Looks right", "Not yet reproduced" (record that, with no invented steps) and "Needs changes"; corrections come through "Other". Never offer an option that only tells the user to pick "Other".
4. **Draft for review**, following `reference-mint.md` "Drafting": the user story, the acceptance criteria and a suggested name. For a bug, the first acceptance criterion is always a regression test that fails before the fix ([`CLAUDE.md`](../../../CLAUDE.md), Testing). Also propose an estimate in hours and say whether it looks like a `hotfix` (it breaks something already on `main`).
5. **Wait for approval with AskUserQuestion**, per `reference-mint.md` "Approval".
6. **Mint**, following `reference-mint.md` "Minting" with these values:

| Value     | For a bug                                                                                             |
| --------- | ----------------------------------------------------------------------------------------------------- |
| Id        | The next free `MB.<n>`                                                                                |
| Type      | `Bug`                                                                                                 |
| Milestone | `Bugfixes` (not a wave, so there is no id line to update, no wave row and no `reorder`)               |
| Labels    | `tracked`, plus `hotfix` only if the user confirmed it                                                |
| Docs      | A summary-table row (Status column: `Bugfixes`) and a full entry in `claude-docs/tasks/mb.md`         |
| Entry     | A "Found on <date>" paragraph carrying the bug and its steps to reproduce, between story and criteria |
