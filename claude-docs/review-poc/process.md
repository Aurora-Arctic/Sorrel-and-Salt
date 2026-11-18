# The local code review process

This process is for reviewing code that an agent wrote, by hand, on your own machine. No model does the review: you read the code, and the tools only show you what changed, what it reaches and where your notes go. An agent may run the commands and explain the output, but the judgement of the code is yours.

Who does what:

- **The developer** reads, judges and writes the review notes.
- **The coding agent** writes the tests, then the code, in small layers.
- **A helper agent (optional)** runs a step's commands and explains the output when asked. It never reviews the code and never merges.

The loop, in one screen:

1. Acceptance criteria exist in writing before any code.
2. The tests for those criteria come first, in their own layer, and you review them before the implementation is written.
3. The implementation is written as small layers, each reviewable in under 15 minutes.
4. The layers are submitted as pull requests, and you read a layer only when its gate is green.
5. You open the impact graph of the layer, to see which modules it reaches.
6. When a symbol is unfamiliar, you explore it.
7. You read the diff.
8. You annotate, and send the notes back to the agent once per layer.
9. The layers are merged from the bottom up.

Sources: this follows the owner's review brief, corrected for this repo by `verify.md` (the differences table), `stacks.md` and `graphify.md` in this folder. Where a step needs something that does not exist yet, the step says "Not available yet:" and names what unblocks it. Nothing here is an installed fact unless it says it was run.

Corrections that apply to every step:

- Gitflow stays. Feature work and every stack start from `staging`, so the base branch below is `origin/staging`, never `main`.
- The package manager is npm and the source folder is `src/`.
- There is no merge queue today (`gitflow.yml` says `merge-queue.yml` returns with a later task).
- The commands `git dft`, `npm run review:affected` and `npm run depcruise:check` from the brief do not exist in the repo.
- Never push, open a PR or write to the task board by any route other than `/create-pr` and `node scripts/task-board.mjs`.

## Step 1. Acceptance criteria

**What it is for.** To fix, in writing and before any code, what "done" means, so the tests and the review have something to check against.

**By hand.** Find the task's entry and read its criteria:

```
node scripts/task-board.mjs find M17.31
grep -n -A14 "M17.31 — " claude-docs/tasks/v1/*.md
```

A good result: `find` names exactly one issue, and the entry has an `_Acceptance criteria:_` list in which each bullet can be answered yes or no. If a bullet cannot be checked, or a task is over about two hours, change the task before any code is written (`/create-feature-task` or editing the entry, then `node scripts/task-board.mjs sync`).

**With an agent.** Paste, with your task id:

> Look up task M17.31 with `node scripts/task-board.mjs find`, and read its entry under `claude-docs/tasks/`. List its acceptance criteria and, for each, say whether it can be checked yes or no and why. Do not write code, do not edit the entry, and do not comment on the quality of any design. Stop and wait for me.

The agent must not rewrite the criteria unasked, start work, or move the task's status.

**Done when.** Each acceptance criterion is written, checkable, and you have read it.

## Step 2. Tests first, reviewed before the implementation

**What it is for.** To make the first layer hold only the tests for the criteria, so you review what "correct" means before reading code that claims to be correct.

**By hand.** After the coding agent has stopped with only tests committed (the project rule is a failing test first, `CLAUDE.md`, "Testing"):

```
git log --oneline origin/staging..HEAD
git show --stat HEAD
npm test -- tests/path/to/the-file.test.ts
```

Run only the test files the layer touches. A good result: the commit touches only files under `tests/`; every criterion has a test; and the run fails, for the reason the criterion names (a missing function or wrong result), not a syntax error or an unrelated failure. Read each test and ask whether it would still pass with the feature removed; if so, it proves nothing (`CLAUDE.md`, "Testing"). Under Claude Code, Vitest prints nothing unless you run it with `env -u CLAUDECODE npm test -- <file>`.

**With an agent.** Paste:

> Write only the tests for the acceptance criteria of task M17.31, following `.claude/rules/testing.md`. Write no implementation. Run each new test file on its own, show me that each fails and why, commit the tests alone with `git commit`, and stop. Do not write the implementation until I say so.

The agent must not write the implementation in the same layer, and must not run the full suites (`test:coverage`, `test:stories`, the full e2e run) unless you say so.

**Not available yet:** the tests-first layer as its own pull request needs the stack mode of `/create-pr`, which is Draft F in `stacks.md`. Until then it is a local commit that you review before telling the agent to continue, and it ships with the rest of the branch.

**Done when.** You have read the tests, each fails for the right reason, and you have told the agent to continue.

## Step 3. Layer the implementation

**What it is for.** To split the implementation into logical layers small enough to review in under 15 minutes each.

**By hand.** With the `gh-stack` extension installed (`gh extension install github/gh-stack`), start the stack from `staging` and add a layer per logical change:

```
gh stack init --base staging <first-branch-name>
gh stack add <next-branch-name>
gh stack view
```

A good result: `gh stack view` lists every layer in order, and each layer's diff is small (check with `git diff --stat <layer-below>...<layer>`). `gh stack` needs `gh` 2.0 and Git 2.36 or later (the CLI page, "Stacked pull requests CLI commands", on `docs.github.com`).

**With an agent.** Paste:

> Implement task M17.31 so the tests pass, as layers: after each logical change, commit it and run `gh stack add <name>` so the next change starts a new branch. Keep each layer's diff small enough for a 15-minute read, and tell me the line count of each. Do not run `gh stack submit`, `push`, `sync`, `link`, `merge` or `unstack`, do not push, and do not open a PR. Stop when the implementation is finished.

The agent must not run any `gh stack` command that writes to GitHub (`stacks.md`, section 3, lists them), and must not rebase or force-push by hand.

**Not available yet:** the extension is not installed in the dev container, and whether stack branches are exempt from `/create-pr`'s "never rebase, never force-push" rules is open (Decision 2 in `stacks.md`). Whether the layers of a task conflict with "one task per PR" is settled there too. Until then work as a single branch.

**Done when.** `gh stack view` lists the layers, and each layer's diff is small enough that you expect to read it in 15 minutes.

## Step 4. Submit, and read only a green layer

**What it is for.** To push the layers as pull requests, so the gate (types, lint, Vitest, Playwright and the rest) runs on each layer before you spend time on it.

**By hand.** Open the pull request with `/create-pr` (it commits after asking, pushes, opens the PR, and links the board task). Then read the gate result:

```
gh pr checks <pr-number>
```

A good result: every required check is green. Do not read a layer whose gate is red; send it back to the agent.

**With an agent.** Paste:

> Run `/create-pr` for this branch and stop at the link. Then run `gh pr checks` for it and tell me which checks are green, red or pending. Do not merge, do not mark the PR ready, do not edit the board by any route except `/create-pr` and `node scripts/task-board.mjs`, and do not fix a red check without telling me first.

The agent must not call `gh stack submit` or `link` itself: those write PRs without a `Closes`/`Refs` line, a task-id title or a board link (`stacks.md`, section 3).

**Not available yet:** one pull request per layer needs Draft F (`stacks.md`). Whether `pr-gate.yml` and `gitflow.yml` run on an upper layer, and what base they see, is unproved and is the scratch-repo run in Draft E (`stacks.md`; Draft C in `verify.md`). The gate also has no dependency-rules job (Draft B in `verify.md`), and no `oversized` label (Draft D). Until then `/create-pr` opens one PR per branch, and the gate runs as it does today.

**Done when.** The PR is open, linked to its task, and its required checks are green.

## Step 5. The impact graph

**What it is for.** To show which modules the change reaches, so you read the diff knowing what depends on it.

**By hand.** Today the repo has no impact graph command. The nearest working check is the list of changed files grouped by module:

```
git diff --name-only origin/staging...HEAD | cut -d/ -f1-3 | sort | uniq -c
```

A good result: you can name each module under `src/modules/` that the change touches. For who imports a changed file, search by name with `grep -rn "@/modules/<name>" src`.

**With an agent.** Paste:

> List the files changed on this branch against `origin/staging`, grouped by module under `src/modules/`, and for each changed module list the files in `src/` that import it. Use `git diff` and `grep` only. Do not judge whether the change is correct and do not edit anything. Stop and wait for me.

The agent must not offer an opinion on the code. It only lists.

**Not available yet:** the graph from `npm run review:affected` (dependency-cruiser's `--affected` with Mermaid output) is blocked by Decision 1 in `verify.md`: the tool cruises zero modules with the repo's TypeScript. It also needs Draft B (`verify.md`), and `--affected` must be given `origin/staging`, because it defaults to `main`.

**Done when.** You can list the modules the layer reaches.

## Step 6. Explore an unfamiliar symbol

**What it is for.** To look up what a function, type or module connects to, without reading the whole codebase.

**By hand.** Today, search the code:

```
grep -rn "symbolName" src tests | head -30
```

A good result: you find its definition and callers. With Graphify in place, `graphify explain "NAME"` and `graphify path "A" "B"` do this from a local graph, and call no model (`graphify.md`, "Answers from Graphify's current docs").

**With an agent.** Paste:

> Find where `NAME` is defined and list what calls it and what it calls. Report file and line for each. Do not change any file and do not say whether the code is good. Stop and wait for me.

The agent must not offer a review of the symbol. Where the Graphify MCP server is working, it may use `query_graph`, `shortest_path`, `get_node` and `get_neighbors` for this (`graphify.md`).

**Not available yet:** Graphify is not usable today. The sidecar's graph is empty, and no `graphify` command exists in the dev container (`graphify.md`, "Summary"). What changes depends on the owner's choice in `graphify.md`, "Decision":

- **End state A (sidecar):** the agent uses the MCP tools. You have no `graphify` command in the dev container's own terminal. Unblocked by Drafts G1 to G4.
- **End state B (CLI in the image):** you run `graphify explain` and `graphify path` in the dev container terminal. Unblocked by Drafts G5 to G9, and it needs an exception to the "no Python" rule.
- **No Graphify:** skip this step and use `grep`. The record's summary names this as a recommendation, while its "Decision" section offers only A or B, so I could not tell which is final.

**Done when.** You can say what the symbol does and what uses it, or you decided it does not matter for the review.

## Step 7. Read the diff

**What it is for.** To read the change itself, line by line, and form your own view.

**By hand.**

```
git diff --stat origin/staging...HEAD
git diff origin/staging...HEAD -- src
```

For a stack, replace `origin/staging` with the layer below. A good result: you can say, for every hunk, what it does and whether it meets a criterion from step 1. The structural diff `difft` ignores reformatting; it parses TSX (`verify.md`, check 10), but it is not in the dev container image (Draft A), so you can run it only after fetching its binary yourself, or on the host.

**With an agent.** Paste:

> Show me the diff of this layer against `origin/staging` one file at a time, and wait for me after each file. For each file say in one sentence what changed, without saying whether it is correct or good. Do not edit any file.

The agent must not review, approve or summarise the change as "fine". It only shows and describes.

**Not available yet:** `git dft` is not an alias in the repo, and difftastic in the image is Draft A (`verify.md`).

**Done when.** You have read every changed file of the layer.

## Step 8. Annotate and send notes back

**What it is for.** To record what you found, and send it to the coding agent once per layer, because each send uses Claude usage.

**By hand.** Write your notes in the PR as review comments on GitHub, or in a file of your own, each with a file and line, then give them to the coding agent in one message. A good result: every note names a file and line, and says what you want changed.

**With an agent.** Paste:

> Here are my review notes for this layer. Make each change as its own commit, run only the test files it touches, and tell me what you changed per note. Do not argue with a note, do not add changes I did not ask for, and do not push until I say so.

The agent must not push, merge or resolve a review thread on GitHub itself.

**Not available yet:** `/plannotator-review` does not work in this dev container, because the binary does not start on Alpine (Decision 2 in `verify.md`). Until it is decided, annotate on GitHub or in a file.

**Done when.** Each note is resolved or answered, and you have re-read the changes.

## Step 9. Merge from the bottom up

**What it is for.** To land the layers in order, lowest first, so each lands on a base that has already been checked.

**By hand.** You merge, through GitHub, once the layer's checks are green and you have approved it. For a stack, GitHub merges bottom-up, and a middle layer cannot merge alone (the "Merging stacked pull requests" page on `docs.github.com`); `gh stack merge` merges the whole stack atomically. When the PR merges, `close-task-on-merge.yml` closes the task named by `Closes #N`, and the board's `Done` follows (`.claude/rules/task-tracking.md`). Never close a task by hand.

**With an agent.** No prompt. The agent does not merge.

**Not available yet:** the merge queue returns with a later task. Where `Closes #N` goes on a stack is Decision 1 in `stacks.md`, and whether the close workflow fires for an upper layer is unproved (Draft E).

**Done when.** The PR is merged into `staging`, and the task shows `Done` on the board.

## Walking through it with an agent

You can ask an agent to take you through the loop one step at a time from this file. The rule is that the agent stops after each step and waits for you. Paste:

> Read `claude-docs/review-poc/process.md` and walk me through the review of task <ID> one step at a time. For each step, say what it is for, run the "By hand" commands and show me the output, and tell me whether the output matches "a good result". Give me the "Done when" condition and stop. Do not start the next step until I say "next". Do not review the code, do not give an opinion on it, do not commit unless I ask, and do not push, merge or write to GitHub or the board except through `/create-pr` and `node scripts/task-board.mjs`, and when a step says "Not available yet:", tell me and skip to the fallback.

## Where a stack meets `/create-pr` and the task board

`/create-pr` and the board assume one PR per task. `stacks.md` lists each place with file and line (section 5), says how a layer links to its task (section 4), and drafts the changes (Drafts E to G). Until they exist, use one branch and one PR per task.

## Open decisions

Each is held in its record; the owner chooses.

- Dependency-cruiser and the repo's TypeScript: Decision 1 in `verify.md`.
- Plannotator on Alpine: Decision 2 in `verify.md`.
- A scratch repo for `gh stack`: Decision 3 in `verify.md`.
- The container build: Decision 4 in `verify.md`.
- Where `Closes #N` goes on a stack: Decision 1 in `stacks.md`.
- Whether stack branches are exempt from "never rebase, never force-push": Decision 2 in `stacks.md`.
- Prove stacks before building: Decision 3 in `stacks.md`.
- Graphify, sidecar or CLI: "Decision" in `graphify.md`.
