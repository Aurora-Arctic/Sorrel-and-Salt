# Minting a task from a draft

Shared by `create-bug-task` and `create-feature-task`. The rules behind it are [`.claude/rules/task-tracking.md`](../../rules/task-tracking.md) ("Minting a task") and [`claude-docs/task-tracking.md`](../../../claude-docs/task-tracking.md); those win if this drifts.

The repo is public, so every issue and comment is too: **names, never values** (an env var, a file, a provider; never what it holds). Write plainly ([`.claude/rules/writing.md`](../../rules/writing.md)): say what a thing does before naming it, and spell out a term on first use.

## Drafting

Show the whole draft in one message so the user reviews it in one pass:

1. **Name.** Short, in title case, naming the outcome and not the cause ("An unverified account loops on the email page", not "Fix redirect"). Offer one suggestion and, if useful, one alternative.
2. **Story.** `As a <who>, I want <what>, so that <why>.`
3. **Description.** A few sentences. Reference code by path, never paste secrets, tokens or addresses.
4. **Acceptance criteria.** A bullet list where every line is checkable by the state it leaves, not by copy or layout. Tests prove authorization by direct-id access ([`CLAUDE.md`](../../../CLAUDE.md), Testing). End with the docs the change must correct, if any.
5. **Estimate** in hours, labelled as an estimate.

Use the British spelling in prose ("colour"), title case for any label, and the vocabulary in `CLAUDE.md` (Compendium, Ingredients, Grimoire; never "catalog").

## Approval

Show the draft as text, then ask with AskUserQuestion, never a free-text "is this ok?". One call, up to four questions, each answered by a click:

- **Draft:** "Approve", "Change the name", "Change the story or criteria", "Change the estimate"
- **Name** (when a rename was asked for): the suggestion, the alternative, and "Other" for the user's own

An answer other than "Approve" means: apply it, show the changed part, and ask again. Create nothing until "Approve" is chosen.

## Minting

Run these only after the user has approved the draft (and, for a feature, the milestone).

1. **Find the next free id.** Take the highest existing id in the series from the entry files (`grep -ho '^\*\*MB\.[0-9]* — ' claude-docs/tasks/*.md | sort -t. -k2 -n | tail -1`, and the same for `M<wave>.`), then confirm it is free on the board with `node scripts/task-board.mjs find <ID>`; zero matches means free. Another session may have taken it, so re-check immediately before creating the issue. Retired ids stay taken.
2. **Write the body** to a file in the scratchpad: the story, description and acceptance criteria exactly as they will appear in the docs entry (a bug's entry also carries the steps to reproduce).
3. **Create the issue:**

   ```sh
   gh issue create --title "<ID> — <name>" --type <Bug|Task> --label tracked --milestone "<milestone>" --body-file <file>
   ```

   The title is `<ID> — <name>` with a spaced em dash and nothing before the id. Never hand-compose other `gh issue` calls. A rate-limit error waits for the reset and retries once, then reports.

4. **Set the estimate:** `node scripts/task-board.mjs estimate <ID> <hours>`.
5. **Add the entry** in the same pass; a task on the board and not in `claude-docs/tasks/` is a task whose reasoning is nowhere. Copy the shape of the newest entry in the target file (read the tail of the file, not all of it):

   ```md
   **<ID> — <name>** · <hours>h

   _Story:_ As a …

   <Description. A bug adds "Found on <date> …" and its steps to reproduce.>

   _Acceptance criteria:_

   - …
   ```

   Then add the matching summary-table row where the target file has one (`mb.md` does), and run `npx prettier --write` on each file touched so the table stays aligned.

6. **Verify:** `node scripts/task-board.mjs find <ID>` prints the issue with the right milestone, and `status` is `Not Started` (or `null` for a few seconds while the Project's auto-add runs; don't set it by hand). If the entry was edited after the issue was created, run `node scripts/task-board.mjs sync <ID>`.
7. **Report** the id, the issue link, the files edited and the estimate. Leave the doc edits uncommitted: committing and PRs are a separate, explicit request.

If any step fails, stop and say which step and what already exists (an issue with no entry is the one to flag loudly), and don't retry blindly.
