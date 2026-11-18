# How stacked pull requests fit `/create-pr` and the task board

Record for M17.33 (issue #1724). It answers the stack questions from GitHub's current documentation, from `gh stack --help` and from a run on a scratch repository, and lists every place the repo assumes one pull request per task. Nothing in the repo was changed: no skill, rule, script or workflow.

**What was run.** On 2026-11-18 I ran `gh stack` on a public scratch repository, `Aurora-Arctic/stack-scratch-m17-31`, which the owner created. It held throwaway files and stand-in workflows (`gate`, `gitflow`, `close-on-merge`, `probe`, `meta`) that copy the trigger shapes of `pr-gate.yml`, `gitflow.yml` and `close-task-on-merge.yml`: `pull_request` types `opened`, `synchronize`, `reopened`, `edited`, `closed`, and `branches: [main, staging, 'release/**']`. The token was read from a file for each command and never stored. "Proved" below means seen in that run. The scratch repository is public, as the real repository is until the organisation moves to a paid plan, so the private-repository case was not run (`verify.md`, checks 6 and 7). The run used stand-ins, so nothing below says how the real gate's slow jobs behave on a stack; section 6 says exactly what that leaves open.

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
- The one exception is a hotfix. The run proved that a workflow on `pull_request` with `branches: [staging]` ran for upper layers whose own base was another branch, and that `github.base_ref` was `staging` for every layer (section 6). For a stack of `hotfix/*` branches on `main`, `deploy.yml` would therefore start a preview for each layer. I did not copy `deploy.yml`'s head-branch condition into the scratch repository, so the preview itself is inferred, not run.

I recommend that hotfixes are never stacked. A hotfix is small and goes to two branches already (`.claude/skills/create-pr/reference-hotfix.md`), and a stack on top of that doubles the previews.

## 2. Rebases, force-pushes, worktrees and parallel sessions

What the documentation says:

- `gh stack sync` fetches, fast-forwards the trunk, cascade-rebases each layer onto its updated parent, and pushes every branch atomically "using --force-with-lease after a rebase" (CLI, `gh stack sync --help`). A rebase conflict restores all branches and asks you to run `gh stack rebase` (same page).
- `gh stack push` and `gh stack submit` push atomically by default; `--no-atomic`, or the `GH_STACK_NO_ATOMIC` env var, allows partial updates (CLI, "Environment variables").
- Worktrees (CLI, "Worktree support" and `gh stack modify --help`): branches of one stack may be checked out in different worktrees; "Foreign worktrees are never switched to different branches. Changes are never autostashed, and no worktrees are created or removed." Every worktree a command needs must be clean.
- GitHub's own rebase of a stack: "Rebasing the stack generates signed commits", and a rebase that does not change the diff keeps approvals even with "Dismiss stale pull request approvals" on (Stacked PRs, "Rebasing").

What the run proved, with a three-layer stack and a second worktree holding the middle layer's branch:

- **Dirty foreign worktree.** With uncommitted changes in the second worktree, `gh stack rebase` and `gh stack sync` both stopped with "uncommitted changes in worktree <path>; commit or stash them before continuing", exit code 1. Nothing changed locally or on GitHub.
- **Clean foreign worktree.** After the second worktree was committed clean, `gh stack sync` rebased the middle and top layers (the worktree's branch was rebased in place, not switched), pushed all three branches and reported "Stack on GitHub is up to date with 3 PRs".
- **`gh stack rebase`** rebases every layer onto the one below it and onto the updated `staging`, locally only. It prints "To push up your changes, run `gh stack push`". GitHub did not change.
- **`gh stack push`** force-pushes every layer with a lease check in one atomic push, after the local rebase. It changes no PR.
- **A bottom-layer amend**, then `rebase` and `push`, produced a new head commit on every layer, and GitHub started one gate run per layer (three runs, section 6).
- **Review comment.** A review comment added to a layer before the force-push was still on the PR afterwards.

What that means for this repo, which works in worktrees and in parallel sessions:

- Every layer is a branch pushed with a lease-checked force-push. A second session with a dirty checkout of a layer makes `rebase` and `sync` refuse without changing anything, which is a safe failure. The lease protects against overwriting another session's push; it does not merge.
- `/create-pr` forbids both ends of this. Step 5 (`SKILL.md:55`) says "Never a rebase" and merges the target in; `SKILL.md:90` says "Never force-push". A stack kept up to date with `gh stack sync` breaks both rules by design. See Decision 2.
- The repo's own convention that one session owns one task and one worktree (`CLAUDE.md`, "One task per PR") fits a stack of one task, if the stack lives in one worktree. I recommend that one session owns a whole stack, and no second session runs `gh stack` commands on it.

Not proved: a conflict during `gh stack rebase` (the run had no conflicting layers), and a second session's push racing the lease.

## 3. Which `gh stack` commands write to GitHub outside `/create-pr` and `task-board.mjs`

"Writes" means a change on GitHub, not on the local disk. The `rebase`, `push`, `sync`, `submit` and `merge` rows are from the run; the others are from `gh stack --help` and the CLI page.

| Command                                                                                    | Writes to GitHub?                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `init`, `add`, `view`, `up`, `down`, `top`, `bottom`, `trunk`, `switch`, `alias`, `modify` | No for `init`, `add`, `modify` (local branches and local stack tracking; `modify` says "run `gh stack submit` afterward to push changes, update PRs, and recreate the stack on GitHub"). `view` reads. Navigation is local                                                                                                         |
| `checkout`                                                                                 | Reads stacks from GitHub (it lists remote-only stacks); pulls branches down. No write                                                                                                                                                                                                                                              |
| `submit`                                                                                   | Yes. Pushes all branches, creates PRs, updates base branches, creates or updates the stack. With `--auto` it is non-interactive: each PR is a draft (unless `--open`), its title is the layer's commit subject, and its body holds only a stack footer. No `Closes`, no `Refs`, no task id. `--open` also marks existing PRs ready |
| `push`                                                                                     | Yes. Force-pushes every layer with a lease check, atomically; no PR change                                                                                                                                                                                                                                                         |
| `sync`                                                                                     | Yes. Fetches, rebases, force-pushes every layer, and syncs PR state; reports "Stack on GitHub is up to date"                                                                                                                                                                                                                       |
| `rebase`                                                                                   | No. Local only, and it says to run `gh stack push` next                                                                                                                                                                                                                                                                            |
| `link`                                                                                     | Yes (documentation only; not run). Pushes branches, creates PRs for branches that have none, and creates or extends the stack                                                                                                                                                                                                      |
| `unstack` (alias `delete`)                                                                 | Yes (documentation only; not run). Removes the stack on GitHub through the API; merged, merging or queued PRs stay in it. `--local` only removes local tracking                                                                                                                                                                    |
| `merge`                                                                                    | Yes. `gh stack merge <PR number> --yes --merge` merged that PR and every PR below it, and no PR above it. It says "Merging #N into staging via merge" and prints the merge commit. It checks only that a PR is open and not a draft, so a draft PR must be marked ready first. Bypassing merge requirements is not supported       |

Two of these write what `/create-pr` and `task-board.mjs` also write: `submit` and `link` create PRs and set their titles and bodies, which is `/create-pr` steps 8 and 9 (`SKILL.md:68` to `SKILL.md:78`). A PR made by `gh stack submit` has no `Closes #N` or `Refs #N` line, no `<ID> — ` title, no tally and no board link unless something adds them (proved: the body was the footer alone).

## 4. How each layer links to its task, and when the task moves to In Review

Facts from the repo:

- A merged PR closes a task only through `.github/workflows/close-task-on-merge.yml`: it runs on `pull_request` `closed`, base `staging` (line 12), `merged == true` (line 20), and reads whole-line `Closes #N` in the body (lines 34 to 37).
- `Refs #N` closes nothing and is never linked (`SKILL.md:78`).

What the run proved, with the stand-in `close-on-merge` (the real one's filter and whole-line regex) and the `probe` workflow that prints the closed event's bases:

- **Closes on the bottom layer, `Refs` on the others.** `gh stack merge` of the bottom PR merged only that PR. The stand-in then closed the task ("Closed by stand-in for PR #2"). The other two layers were still open, so the task closed with two layers unmerged.
- **Closes on the top layer, `Refs` on the others.** Merging the middle layer left the second task open. After the middle layer merged, the top layer's base was already `staging`. Merging the top layer then closed the task, by the stand-in.
- **The closed event's bases.** For a layer merged when it was the lowest unmerged one, `pull_request.base.ref` and `github.base_ref` were both `staging`.
- **After the bottom layer merges, GitHub retargets the layer above it to `staging`** (the pull request list showed base `staging` for it at once). The layer two above stayed on the retargeted layer's branch until that layer merged. The retarget starts a gate run on the retargeted PR (`edited`).
- **GitHub's own keyword did not fire.** The task's event list holds one close, by the Actions bot, with no commit. `staging` is not the default branch, so `Closes #N` in a PR into `staging` closes nothing by itself, and `close-task-on-merge.yml` stays the only closer.

Not proved: the `closed` event of layers merged together in one atomic call. I merged one PR at a time, bottom-up, so every layer was already the lowest unmerged one. Draft G includes that run.

What I recommend:

- A task is one stack. Every layer's title opens `<ID> — `, as `SKILL.md:69` requires, so the tally still counts the id (`.claude/skills/project-progress/tally.mjs`).
- The **top** layer's body opens with `Closes #N`; every layer below it opens with `Refs #N`. Reason: the task closes only when the last layer lands, and the run showed the top layer reports base `staging` when it is merged last.
- The task moves to `In Review` once, when the first (bottom) PR is opened, with one comment listing every layer's PR number (the same shape as the hotfix comment in `reference-hotfix.md`). Later layers add a comment and leave the status alone, as `SKILL.md:84` already says for an updated PR.

I need you to choose X or Y: X, the `Closes #N` line goes on the bottom layer (fires at the first merge; the run showed it closes the task while two layers are unmerged); or Y, it goes on the top layer (closes only when the whole task has landed; the run showed it fires when layers merge one at a time, bottom-up; layers merged in one atomic call are unproved). I recommend Y, with the atomic-merge run in Draft G done before the first real stack is merged.

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
| `.github/workflows/close-task-on-merge.yml:12` | Only base `staging` closes; a layer merged when it is the lowest unmerged one reports `staging` (section 4), so this holds for bottom-up merges one at a time                                          |

Also touching the same assumption, outside the three files named in the brief: `claude-docs/task-tracking.md` (the "Status" section and the `link-pr` row of the command table) and `.claude/skills/create-pr/reference-hotfix.md`.

Not an assumption: `task-board.mjs` has no per-PR state. `find`, `status`, `comment` and `estimate` take only a task id, so the board needs no change to hold several PRs for one task.

## 6. What the run showed about workflows, and what the workflows need for stacks

### What a run on a layer can know

Quotes are from CI ("Optimizing CI for stacked pull requests"); values are from the `meta` and `probe` stand-ins on a three-layer stack whose base is `staging`.

| Expression                                                                          | Docs say                                                                                                                                             | Value in the run                                                                                                                       |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `github.base_ref`                                                                   | "GitHub Actions workflows trigger as if each pull request in the stack targets the base of the stack."                                               | `staging` on every layer and every event                                                                                               |
| `github.event.pull_request.base.ref`                                                | Not stated                                                                                                                                           | The layer below (`feature/<lower>`), `staging` for the bottom layer                                                                    |
| `github.ref`                                                                        | Not stated                                                                                                                                           | `refs/pull/<N>/merge` on every layer                                                                                                   |
| `github.event.pull_request.stack.number`, `.size`, `.position`, `.base.ref`, `.sha` | "Stack metadata is available in workflow expressions via `github.event.pull_request.stack`", "present only when the pull request belongs to a stack" | `{base: {ref: staging, sha}, id, number, position, size}` for position 2 and 3 of 3. `null` on the bottom layer's first `opened` event |

How a workflow tells the layers apart, from the same page: the lowest unmerged layer is where `stack.base.ref` equals `pull_request.base.ref`; the top layer is where `stack.position` equals `stack.size`; the original bottom is `stack.position == 1`. In the run, the stack object was present on `opened` for the top layer, on `synchronize` for the top and on `edited` for the middle, and `null` on the bottom layer's `opened`, which fired before the stack existed. A workflow must test `stack != null` before reading a field, as the page says.

### What gets checked out, and what the merge ref is merged against

`pull_request` checks out `refs/pull/<N>/merge`. For an upper layer it is the layer's head merged into the layer below's head (the log showed `Merge <top> into <middle head>` for the top layer, `Merge <middle> into <bottom head>` for the middle one). The bottom layer merges into the current `staging`. So the top layer's run holds the code of the whole stack (the log listed all three layer commits and `staging`'s history), a middle layer's run holds the layers up to it, and no run holds `staging` merged with the whole stack as one change.

### What started a run, per event

One "run" is one run of one workflow on one PR; the gate and gitflow stand-ins each started once per layer, so the counts below are per workflow.

| Event                                                           | Runs started                                                                                                                               |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `gh stack submit`, first stack (two layers, then a third added) | One per layer for the first two; none for the third's `opened`                                                                             |
| `gh stack submit`, second stack (three layers)                  | Bottom and top: one each. Middle: none                                                                                                     |
| A push to the top layer only                                    | 1 (the top)                                                                                                                                |
| A bottom-layer amend, `rebase`, `push`                          | 3 (one per layer)                                                                                                                          |
| A second amend, then `sync`                                     | 3                                                                                                                                          |
| A title edit of the middle PR                                   | 1 (that PR)                                                                                                                                |
| Two bottom amends pushed 8 seconds apart (a 60-second job)      | 6 started: the first push's 3 were cancelled, the second's 3 finished                                                                      |
| `gh stack merge` of the bottom layer                            | The closed-event workflows on the bottom PR; a gate and gitflow run on the retargeted layer above (and one on the top layer, 2 and 1 runs) |

An `opened` event of an upper layer did not always start a run: in the second stack the middle layer got none, and in the first stack the third layer got none. I do not know why. Every later event on a layer (push, edit, `sync`) did start its run, so an upper layer is checked from its first push after submit, not from its `opened`. My reading, not proved: `opened` fires before the stack exists, when the layer's own base does not match the `branches` filter.

### The real gate, and what its concurrency does

`pr-gate.yml` has `concurrency.group: ${{ github.workflow }}-${{ github.event.pull_request.number }}` and `cancel-in-progress: ${{ github.event.action != 'edited' }}`. The key is the PR number, so each layer is its own group: a push to one layer cancels only that layer's earlier run, and nothing cancels across layers. The run proved that on the `meta` stand-in, which has the same group shape: after a cascade of two force-pushes, the first cascade's three runs were cancelled and the second's three finished. `checks` and `gitflow` carry their own per-PR groups, so the same holds inside a run.

Its jobs, from the file: `changes` (path filter), `build-image`, `checks` (lint, typecheck, build, destructive DDL, migration order), `build-db-image`, `vitest`, `build-e2e-image`, `playwright`, `stories`, `playwright-coverage`, `workshop`, `pr-comments`, and `gitflow`. `format` and `audit` are named in the header as always running. The slow ones are the Vitest and Playwright jobs, the story suite and the builds. `claude-docs/ci/aggregating-workflows.md` says the gate "takes ten minutes", and `claude-docs/ci/runner-budget.md` sets a test step's budget at 7 minutes and says runs "cost nothing" on a public repo, so the count matters only for how long a developer waits. No per-job duration table exists in the CI docs; I give none.

Two facts about the real gate that the run measured on the stand-ins:

- **The real `gitflow.yml` reads `github.event.pull_request.base.ref`**, which is the layer below for an upper layer. Its `case` has an empty pattern for any base that is not `main`, `staging` or `release/*`, and an empty pattern passes. An upper layer therefore passes gitflow with no change, and only the bottom layer is checked against `staging`'s rule.
- **`pr-gate.yml` line 299 passes `github.base_ref`** to the migration-order check, which is `staging` for every layer, so each layer's migrations are compared with `staging`.
- **`changes` lists the PR's files through the API** (`dorny/paths-filter`), and the PR files API returned only each layer's own file (one file per layer in the run). The real gate therefore already runs, on each layer, the jobs whose paths that layer's own diff touches, though the top layer's checkout holds the whole stack's code.

### What the workflows need

GitHub already triggers the gate on every layer, with `github.base_ref` equal to `staging`, so no trigger change is needed. The open question is cost against assurance. Costs for a three-layer stack, counted in gate runs (the real gate's own jobs inside each run follow the path filter):

| Option                                                                   | Runs for a submit, then a bottom amend (cascade)                         | A layer's gate red                                                                            | Bottom-up merging                                                            | Required-check names                                                                                                         |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| (1) Full gate on every layer, every push                                 | 3 full gates, then 3 more                                                | Means that layer's code, with the layers below it, failed in full                             | Each layer merges after its own full gate                                    | Unchanged                                                                                                                    |
| (2) Full gate on the top layer only; types, lint and format below        | 1 full and 2 cheap, then 1 full and 2 cheap                              | A lower layer's green means only the cheap checks passed; the full result is on the top layer | A lower layer merges having passed the full checks only as part of the whole | Unchanged if the skipped jobs report skipped (the repo's `if:` design already does, MB.39); the rule is written with `stack` |
| (3) Full gate on every layer, only the jobs the layer's own diff touches | Today's behaviour: each layer runs what its own files need               | Means the layer's own paths passed, with lower layers as context                              | A layer merges after the checks its own change needs                         | Unchanged                                                                                                                    |
| (4) No change                                                            | Same as (3), because the path filter already uses each layer's own files | Same as (3)                                                                                   | Same as (3)                                                                  | Unchanged                                                                                                                    |

Gate runs start in parallel on separate runners (the runs in the cascade started in the same second), so a cascade over three layers waits one gate, about ten minutes by the CI docs, not three. Runner capacity under three parallel gates was not measured.

The gap in (3) and (4): a top layer whose own diff touches no test path skips the Vitest and Playwright jobs, although its checkout holds the layers below. The layers below ran their own jobs, so only a defect that appears from the layers together, with none of them touching the path, goes unchecked. That is the same gap a single PR has for code it does not touch.

I recommend (4), no change to the workflows. The reasons: GitHub already starts the gate on every layer with the base the gate expects, the real gitflow passes an upper layer, the concurrency group cancels superseded runs per layer, runs cost nothing and run in parallel, and (2) makes a lower layer's green mean less, which breaks the rule in `process.md`, Step 4, "do not read a layer whose gate is red". If you want the whole stack tested together on its top layer, the change is to run `changes`' filters against the stack's whole diff when `stack.position == stack.size`; that is Draft C.

The run did not show how the real gate's slow jobs behave on a stack (a stack of one real task), whether `pr-comments` writes one comment per layer without collision, or the first-`opened` gap on a real repository. Draft C's first criterion is to record those on the first real stack.

## Merge queue

Stacks work with a merge queue: all PRs enter in order, and one that is ejected takes everything above it out (Merging, "Merging using a merge queue"). The repo has no merge queue today: `.github/workflows/gitflow.yml` says `merge-queue.yml` was deleted and returns later, and `claude-docs/ci/aggregating-workflows.md:120` says there is no `merge_group` workflow. Nothing to do now.

## Required checks on `staging`

I tried to mark the `gate` stand-in as a required check on `staging`, through a branch protection rule and through a repository ruleset. GitHub refused both with HTTP 403, "Resource not accessible by personal access token". The token lacks the repository permission for branch rules, so how a required check behaves on a stack's upper layers, and whether `gh stack merge` is blocked by a red required check, is not proved. The documentation says required checks are evaluated as if each PR targets the stack base (Stacked PRs), and `gh stack merge` says "GitHub evaluates branch protection and repository rules when the merge runs".

## Drafted implementation tasks

Drafts only; nothing is minted until the owner approves. Hours are my estimates, not measurements. The earlier Draft E (prove stacks on a scratch repository) is done by the run above and is dropped.

**Draft F — Open a Stack of PRs from `/create-pr`** · 6h (estimate)

_Story:_ As a developer with an oversized task, I want `/create-pr` to open the task as a stack of layered PRs that all link to the task, so that each layer is reviewed on its own.

Depends on Decisions 1 and 2 below.

_Acceptance criteria:_

- `/create-pr` offers a stack only when the owner asks for one, and otherwise opens one PR as today
- Each layer's title opens `<ID> — `; the `Closes #N` line goes on the layer Decision 1 names and every other layer's body opens with `Refs #N`; `gh stack submit --auto` is followed by editing each PR's title and body, because `submit` writes a commit-subject title and a footer-only body
- Layers are marked ready only when the owner says so (`submit --auto` creates drafts, and `gh stack merge` refuses a draft)
- The task moves to `In Review` once, with one comment listing every layer's PR
- `task-board.mjs link-pr` is run for the layer carrying `Closes`, and the existing one-PR flow is unchanged and covered by the skill's own checks
- `SKILL.md:55` and `SKILL.md:90` say what is allowed on a stack branch, and `.claude/rules/task-tracking.md` and `claude-docs/task-tracking.md` are corrected in the same PR

**Draft G — Close a Task When Its Whole Stack Merges** · 3h (estimate)

_Story:_ As the owner, I want a task to close exactly when its last layer merges, so that a stack merged in one call or one layer at a time never leaves a task open or closes it early.

_Acceptance criteria:_

- A run on a throwaway public repository merges a three-layer stack in one `gh stack merge` call and records the `closed` event's `base.ref` for each layer
- `close-task-on-merge.yml` closes the task named by `Closes #N` for that run; if an upper layer's closed event reports a base other than `staging`, the base filter is changed and the change is explained in the workflow
- The workflow keeps reading whole-line `Closes #N` only
- A run shows a lower layer merged alone leaving the task open when `Closes #N` is on the top layer

**Draft C — Test the Whole Stack on Its Top Layer** · 3h (estimate; minted only if you choose option (2) or the whole-diff variant of option (4) in Decision 3; see also `verify.md`, Draft C)

See `verify.md`, Draft C, for the acceptance criteria.

## Decisions

I need you to choose for each.

1. **Where `Closes #N` goes on a stack.** Section 4: X, the bottom layer (fires at the first merge, closing the task with layers unmerged, proved); or Y, the top layer (closes when the whole task has landed; proved for layers merged one at a time, bottom-up; layers merged in one atomic call are unproved and Draft G tests them). I need you to choose X or Y. I recommend Y.
2. **`/create-pr`'s "never rebase, never force-push" rules.** `gh stack rebase` rebases locally, and `gh stack push` and `sync` force-push every layer with a lease check; a dirty foreign worktree makes `rebase` and `sync` refuse and change nothing, and a review comment survived a force-push (section 2). I need you to choose X or Y: X, stack branches are the one exception to `SKILL.md:55` and `SKILL.md:90`, and `gh stack` owns them; or Y, keep both rules, never use `gh stack sync` or `push`, and merge the lower layer into the upper by hand. I recommend X, because Y removes the stack's main benefit, which is keeping layers current when a lower layer changes, and the run showed the failure mode of X (a dirty worktree) is a refusal and not damage.
3. **What the workflows do on a stack.** Section 6, options (1) to (4). I need you to choose (1), (2), (3) or (4). I recommend (4), no change: GitHub already runs the gate on every layer against `staging`, `gitflow.yml` passes an upper layer, and the concurrency group cancels per layer. Choosing (2) or a whole-diff top-layer filter mints Draft C.
