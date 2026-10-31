# MB.123: Design review: the grimoire (plan as run)

This is the plan as it ran, stored beside the decision record so the method is not lost. The record, [`mb.123-design-review-the-grimoire.md`](mb.123-design-review-the-grimoire.md), wins wherever the two differ. Dates are 2026-10-29 and 2026-10-30; times are UTC.

## Setup

- Worktree `/home/node/worktrees/mb123`, branch `feature/mb.123-design-review-the-grimoire`, off 73be5de4c (`feature/spell-tasks`). Board issue #580.
- Working notes (audits, research, camera log, mocks) live in `/app/.reports/mb.123-review/` and are not committed.
- Around 07:04 on 2026-10-30 every worktree was deleted from outside the session. They were recreated from the lane branches.

## Phase 1: read-only audit lanes (Opus)

No lane changed code. Each wrote one file of numbered findings.

- **L, list:** `audit-list.md`, L1 to L45.
- **B, builder:** `audit-builder.md`, B1 to B60.
- **R, recipe:** `audit-recipe.md`, R1 to R68.
- **S, sweep:** `audit-sweep.md`, S1 to S75 and a removal list of dead code.
- **U, research:** `research.md`, 14 topics, each source in Chicago form.
- **C, camera:** 188 screenshots and 2 print PDFs from an isolated database (`sorrel_mb123_review`) on port 8200; 50 axe pairs, 0 violations.
- **W, stories:** `audit-stories.md`, W1 to W23. Added after the owner asked whether Storybook was current.

## Phase 2: mocks, sign-off page, build lanes

- A mocks lane drew 32 fragments, one per open question.
- The main session published the private sign-off page at 08:20 with 30 items.
- Four build lanes, each in its own worktree and branch, sharing the brief `build-common.md`:
  - `mb123-list` (`lane/mb123-list`): the card list.
  - `mb123-builder`: the spell builder and step editor.
  - `mb123-recipe`: the recipe page, workings and print.
  - `mb123-site`: the removal list, axe, tab titles and the shared pieces.
- Lane heads merged into `mb123`: list d318e39a9, builder 39d88e339, recipe 004fcb0d6, site 1bb239833.

## Phase 3: follow-up and the owner's picks

- Follow-up lane `mb123-followup` (head 89d69c557) built items that fit no single area, for example D29.
- The page grew as lanes found questions: 41 items, then 43 (D41, D42 added).
- The owner's picks arrived around 12:50. Each lane built its own: builder (head 6fb2a5e81), list (4f3793bba, then 0c048999b), site (9a13a790d, then 610e4fbd6), recipe (55a188827).
- The recipe merge conflicted in five files and was resolved at 825b98ec0.
- A read-only lane swept every destructive control (`destructive-sweep.md`, A15 / B12 / C1 / D7). That gave D37 to D40.
- The site lane built D41 and D42 (head c22daca27).

## Stories rounds

- **Round 1:** lane `mb123-stories` (head a7504cd7b), a separate agent from the reviewers, updated every affected Storybook story.
- **Round 2:** the same lane after the picks (head 5980adac4).
- Final head ce1a5b4f8: typecheck, lint, `lint:css` and `format:check` pass; `workshop:build` and `workshop:check` pass (390 of 390 story loads clean).
- The owner runs `/design-sync` at the end.

## Rules every lane had

- Individual tests only: single Vitest files and single specs. No full suite.
- One run per spec. No repeat runs or soaks.
- `npm run pre-commit` before each commit, and a commit per green step.
- No pushes, no PR, no `gh` and no board commands. The main session merges and updates the board.

## The sign-off page

- A private claude.ai artifact: https://claude.ai/artifact/BBn96FkV8yMCDS4zEZbyd7
- Each item showed its question, a mock under every option, a radio group and a note box, with a light and dark toggle.
- Picks saved to the artifact's database, collection `picks`, one document per item (id = item id) holding `{option, note, at}`. The main session read them with `ArtifactData`.
- A text block the owner could paste back was the fallback, and was used for the main round of picks.
- Versions: v1 had 30 items, v6 had 41, v8 had 43, and v9 recorded the answers.
- Later answers replaced earlier ones: D1, D2, D11, D14, D16, D19, D25, D32, D41 and D42 each changed after the first pick.
