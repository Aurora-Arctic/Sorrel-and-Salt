# How stacked pull requests fit `/create-pr` and the task board

Record for M17.33 (issue #1724). It answers the stack questions from GitHub's current documentation and from `gh stack --help`, and lists every place the repo assumes one pull request per task. Nothing was changed: no skill, rule, script or workflow.

**What was not run.** The brief's scratch repo could not be created (the token cannot create a repository; see `verify.md`, checks 6 and 7, and Decision 3 there). Every statement below is therefore from the documentation, from `gh stack --help` (the extension was installed to read it and removed again) or from this repo's files. A claim that needs a real stack is marked "unproved", and the first drafted task is the run that proves it.

Sources, cited by page title, all on `docs.github.com`:

- **Stacked PRs** is "Stacked pull requests" (the reference page).
- **CI** is "Optimizing CI for stacked pull requests".
- **Merging** is "Merging stacked pull requests".
- **CLI** is "Stacked pull requests CLI commands".
- **Webhooks** is "Stacked pull requests APIs and webhooks".

## 1. Which layers get a preview deployment

None, by the repo's own rules, and no change from stacking.

- `vercel.json` lines 3 to 7 turn off Vercel's Git integration (`deploymentEnabled` is `false` for `**`).
- `.github/workflows/deploy.yml` deploys only on a push to `main`, a push to `staging`, and a pull request into `main` whose head branch starts with `hotfix/` (lines 16 to 23 and 40 to 44). A feature PR, stacked or not, never gets a preview today.
- The one exception is a hotfix. Stacked PRs says Actions run "as if each pull request in the stack targets the base of the stack", and CI says a workflow on `pull_request` events targeting `main` "runs for every pull request in the stack". For a stack of `hotfix/*` branches on `main`, `deploy.yml` could therefore start a preview for each layer. Unproved.

I recommend that hotfixes are never stacked. A hotfix is small and goes to two branches already (`.claude/skills/create-pr/reference-hotfix.md`), and a stack on top of that doubles the previews.

## 2. Rebases, force-pushes, worktrees and parallel sessions

What the documentation says:

- `gh stack sync` fetches, fast-forwards the trunk, cascade-rebases each layer onto its updated parent, and pushes every branch atomically "using --force-with-lease after a rebase" (CLI, `gh stack sync --help`). A rebase conflict restores all branches and asks you to run `gh stack rebase` (same page).
- `gh stack push` and `gh stack submit` push atomically by default; `--no-atomic`, or the `GH_STACK_NO_ATOMIC` env var, allows partial updates (CLI, "Environment variables").
- Worktrees (CLI, "Worktree support" and `gh stack modify --help`): branches of one stack may be checked out in different worktrees; rebases and modifications run in the clean owning worktree; a branch checked out nowhere uses the worktree you ran the command from; "Foreign worktrees are never switched to different branches. Changes are never autostashed, and no worktrees are created or removed." Every worktree a command needs must be clean and free of other Git operations (CLI, `gh stack modify`). `gh stack add` on a branch checked out in another worktree adopts it without switching either checkout, and refuses `-m`, `-A` and `-u` in that case.
- Checking out a layer already checked out elsewhere is an error with a path diagnostic; `--print-path` prints that worktree's path instead (CLI, `gh stack checkout`).
- GitHub's own rebase of a stack: "Rebasing the stack generates signed commits", and a rebase that does not change the diff keeps approvals even with "Dismiss stale pull request approvals" on (Stacked PRs, "Rebasing").

What that means for this repo, which works in worktrees and in parallel sessions:

- Every layer is a branch pushed with a lease-checked force-push. A second session that holds an older copy of a layer, or has it checked out dirty, makes `gh stack sync` fail or skip that worktree. The lease protects against overwriting another session's push; it does not merge.
- `/create-pr` forbids both ends of this. Step 5 (`SKILL.md:55`) says "Never a rebase" and merges the target in; `SKILL.md:90` says "Never force-push". A stack that is kept up to date with `gh stack sync` breaks both rules by design. See Decision 2.
- The repo's own convention that one session owns one task and one worktree (`CLAUDE.md`, "One task per PR") fits a stack of one task, if the stack lives in one worktree. I recommend that one session owns a whole stack, and no second session runs `gh stack` commands on it.

Unproved on a real stack: what `gh stack sync` does when a layer's branch is checked out dirty in a second worktree (the documentation says that run needs clean worktrees), and whether a force-pushed layer keeps its review comments.

## 3. Which `gh stack` commands write to GitHub outside `/create-pr` and `task-board.mjs`

From `gh stack --help` and the CLI page. "Writes" means a change on GitHub, not on the local disk.

| Command                                                                                    | Writes to GitHub?                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `init`, `add`, `view`, `up`, `down`, `top`, `bottom`, `trunk`, `switch`, `alias`, `modify` | No for `init`, `add`, `modify` (local branches and local stack tracking; `modify` says "run `gh stack submit` afterward to push changes, update PRs, and recreate the stack on GitHub"). `view` reads. Navigation is local                                        |
| `checkout`                                                                                 | Reads stacks from GitHub (it lists remote-only stacks); pulls branches down. No write                                                                                                                                                                             |
| `submit`                                                                                   | Yes. Pushes all branches, creates PRs (title and body from the editor, or auto-generated with `--auto`; new PRs are drafts with `--auto` unless `--open`), updates base branches, creates or updates the stack. `--open` also marks existing PRs ready for review |
| `push`                                                                                     | Yes. Pushes the active branches atomically with a force-with-lease check; no PR change                                                                                                                                                                            |
| `sync`                                                                                     | Yes. Pushes after a rebase, syncs PR state, and creates or updates the stack on GitHub when two or more PRs exist                                                                                                                                                 |
| `rebase`                                                                                   | Documented as pulling from the remote and rebasing locally (CLI). I could not tell from the page whether it pushes; assume you must push afterwards                                                                                                               |
| `link`                                                                                     | Yes. Pushes branches, creates PRs for branches that have none, and creates or extends the stack                                                                                                                                                                   |
| `unstack` (alias `delete`)                                                                 | Yes. Removes the stack on GitHub through the API; merged, merging or queued PRs stay in it. `--local` only removes local tracking                                                                                                                                 |
| `merge`                                                                                    | Yes. Merges the stack through GitHub's atomic stack merge, or adds it to the merge queue. Bypassing merge requirements is not supported for stacks                                                                                                                |

Two of these write what `/create-pr` and `task-board.mjs` also write: `submit` and `link` create PRs and set their titles and bodies, which is `/create-pr` steps 8 and 9 (`SKILL.md:68` to `SKILL.md:78`). A PR made by `gh stack submit` has no `Closes #N` or `Refs #N` line, no `<ID> — ` title, no tally and no board link unless something adds them.

## 4. How each layer links to its task, and when the task moves to In Review

Facts from the repo:

- A merged PR closes a task only through `.github/workflows/close-task-on-merge.yml`: it runs on `pull_request` `closed`, base `staging` (line 12), `merged == true` (line 20), and reads whole-line `Closes #N` in the body (lines 34 to 37).
- The base the workflow filters on is the PR's own base. When a layer's base is the layer below, the documentation says that once the bottom PR merges "the next pull request is rebased to target the stack base directly" (CI, "Reducing CI usage"). Whether the `closed` event of a layer merged in one atomic stack merge reports `staging` as its base is unproved. If it does not, `Closes #N` on an upper layer closes nothing.
- `Refs #N` closes nothing and is never linked (`SKILL.md:78`).

What I recommend:

- A task is one stack. Every layer's title opens `<ID> — `, as `SKILL.md:69` requires, so the tally still counts the id (`.claude/skills/project-progress/tally.mjs`).
- The **bottom** layer's body opens with `Closes #N`; every layer above it opens with `Refs #N`. Reason: the bottom layer's base is `staging`, so the close workflow fires with certainty, and `gh stack merge` merges the stack as one operation, so the bottom layer does not merge alone in normal use.
- The task moves to `In Review` once, when the first (bottom) PR is opened, with one comment listing every layer's PR number (the same shape as the hotfix comment in `reference-hotfix.md`). Later layers add a comment and leave the status alone, as `SKILL.md:84` already says for an updated PR.
- If a layer is merged alone, the task closes early. The rule would be: merge the whole stack with `gh stack merge`, never a layer on its own.

I need you to choose X or Y: X, the `Closes #N` line goes on the bottom layer (certain to fire, closes the task early if only the bottom layer is merged); or Y, it goes on the top layer (closes only when the whole task has landed, but fires only if the closed event of an upper layer reports `staging` as its base, which is unproved). I recommend X, until the scratch-repo run shows what the event carries.

## 5. Where the repo assumes one pull request per task

Each row is an assumption a stack breaks, with its file and line.

| File and line                                  | Assumption                                                                                                                                                                                             |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `.claude/skills/create-pr/SKILL.md:10`         | The skill opens one PR for the current branch                                                                                                                                                          |
| `SKILL.md:23`                                  | The existing-PR check lists open PRs by one head branch                                                                                                                                                |
| `SKILL.md:25` to `SKILL.md:48`                 | One target branch is chosen; the table and the prefix rules propose `staging` or another `feature/*`, never "the branch below in a stack"; the rest of the skill "assume[s] a single target" (line 36) |
| `SKILL.md:55`                                  | The target is merged in, "Never a rebase"; a stack is kept current by rebasing                                                                                                                         |
| `SKILL.md:60` and `SKILL.md:64`                | "Nothing ahead of the target" and the diff are measured against the target; for an upper layer the useful diff is against the layer below                                                              |
| `SKILL.md:61`                                  | `git push -u origin <source>` pushes one branch                                                                                                                                                        |
| `SKILL.md:65` and `SKILL.md:66`                | One task id from one branch slug, one `find` call                                                                                                                                                      |
| `SKILL.md:69`                                  | The title opens with the task's id, which every layer of one task would repeat                                                                                                                         |
| `SKILL.md:70`                                  | One `Closes #N` per task a PR finishes; no rule for several PRs for one task                                                                                                                           |
| `SKILL.md:72`                                  | One tally per PR body                                                                                                                                                                                  |
| `SKILL.md:76` and `SKILL.md:77`                | `gh pr create --base <target>` creates one PR; `gh stack submit` creates the PRs itself                                                                                                                |
| `SKILL.md:78`                                  | `link-pr` is run once per task on the `Closes` lines; "a PR into `main` needs no call"; nothing for several PRs on one task                                                                            |
| `SKILL.md:83` and `SKILL.md:84`                | One comment "PR opened into <target>", status to `In Review` once; "updated" means one PR                                                                                                              |
| `SKILL.md:90`                                  | "Never force-push", which `gh stack sync` and `push` do                                                                                                                                                |
| `.claude/rules/task-tracking.md:44`            | `In Review` is "The PR is open", singular                                                                                                                                                              |
| `.claude/rules/task-tracking.md:47`            | "A PR closed without merging sends its task back to `In Progress`"; with a stack, one closed layer is not a closed task                                                                                |
| `.claude/rules/task-tracking.md:55`            | "A PR body opens with a single `Closes #N` line" and one `link-pr` call per PR                                                                                                                         |
| `scripts/task-board.mjs:4`, `:994`, `:1035`    | `link-pr <ID> <PR number>` takes one PR                                                                                                                                                                |
| `scripts/task-board.mjs:241`                   | The `Done` refusal says "a PR body naming `Closes #N` closes the issue on merge"                                                                                                                       |
| `scripts/task-board.mjs:246`                   | The step-back message says "A PR closed without merging goes back to `In Progress`"                                                                                                                    |
| `scripts/task-board.mjs:888` to `:892`         | `linkPullRequest` says "feature PRs target `staging`"; an upper layer's base is a `feature/*` branch                                                                                                   |
| `.github/workflows/close-task-on-merge.yml:12` | Only base `staging` closes; the closed event of an upper layer may report another base                                                                                                                 |

Also touching the same assumption, outside the three files named in the brief: `claude-docs/task-tracking.md` (the "Status" section and the `link-pr` row of the command table) and `.claude/skills/create-pr/reference-hotfix.md`.

Not an assumption: `task-board.mjs` has no per-PR state. `find`, `status`, `comment` and `estimate` take only a task id, so the board needs no change to hold several PRs for one task.

## Merge queue

Stacks work with a merge queue: all PRs enter in order, and one that is ejected takes everything above it out (Merging, "Merging using a merge queue"). The repo has no merge queue today: `.github/workflows/gitflow.yml` says `merge-queue.yml` was deleted and returns later, and `claude-docs/ci/aggregating-workflows.md:120` says there is no `merge_group` workflow. Nothing to do now.

## Drafted implementation tasks

Drafts only; nothing is minted until the owner approves. Hours are my estimates, not measurements.

**Draft E — Prove Stacks on a Scratch Repo** · 2h (estimate)

_Story:_ As the owner, I want a real two-layer stack run on a scratch repository, so that the unproved statements in `claude-docs/review-poc/stacks.md` become facts.

_Acceptance criteria:_

- A private scratch repository with `main` and `staging` exists, holding no Sorrel & Salt source, and is deleted at the end
- `gh stack init --base staging` with two layers, `submit`, and `view` run, and the output is recorded
- A workflow prints `base.ref`, `github.base_ref` and the `stack` object for each layer, and a `closed` workflow prints the base of each merged layer in an atomic stack merge
- A second worktree holding a layer's branch, clean and then dirty, is tried against `sync`, and the result is recorded
- Each "unproved" statement in `stacks.md` is changed to the result

**Draft F — Open a Stack of PRs from `/create-pr`** · 6h (estimate)

_Story:_ As a developer with an oversized task, I want `/create-pr` to open the task as a stack of layered PRs that all link to the task, so that each layer is reviewed on its own.

Depends on Decision 2 below and on Draft E.

_Acceptance criteria:_

- `/create-pr` offers a stack only when the owner asks for one, and otherwise opens one PR as today
- Each layer's title opens `<ID> — `; the bottom layer's body opens with `Closes #N` and every other layer's with `Refs #N` (or as the choice in section 4 settles)
- The task moves to `In Review` once, with one comment listing every layer's PR
- `task-board.mjs link-pr` is run for the layer carrying `Closes`, and the existing one-PR flow is unchanged and covered by the skill's own checks
- `SKILL.md:55` and `SKILL.md:90` say what is allowed on a stack branch, and `.claude/rules/task-tracking.md` and `claude-docs/task-tracking.md` are corrected in the same PR

**Draft G — Close a Task Only When Its Whole Stack Has Merged** · 3h (estimate)

_Story:_ As the owner, I want a task to close only when every layer of its stack has merged, so that a layer merged alone does not hide unfinished work.

_Acceptance criteria:_

- `close-task-on-merge.yml` closes the task named by `Closes #N` only when no open PR in the stack still names `Refs #N`, or states why it does not need to
- The workflow keeps reading whole-line `Closes #N` only, and keeps `staging` as its base filter, unless Draft E shows the closed event of an upper layer reports another base
- A test or a scratch run shows a bottom layer merged alone leaving the task open

## Decisions

I need you to choose X or Y for each.

1. **Where `Closes #N` goes on a stack.** Section 4 above: X, the bottom layer; or Y, the top layer. I recommend X.
2. **`/create-pr`'s "never rebase, never force-push" rules.** `gh stack sync` rebases and force-pushes with a lease check. I need you to choose X or Y: X, stack branches are the one exception to `SKILL.md:55` and `SKILL.md:90`, and `gh stack` owns them; or Y, keep both rules, never use `gh stack sync`, and merge the lower layer into the upper by hand. I recommend X, because Y removes the stack's main benefit, which is keeping layers current when a lower layer changes.
3. **Prove it before building.** I need you to choose X or Y: X, run Draft E first and mint Drafts F and G only after it; or Y, mint all three now. I recommend X, because Drafts F and G depend on what Draft E finds.
