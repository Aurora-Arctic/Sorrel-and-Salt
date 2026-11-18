# The local code review workflow

This is how code that an agent wrote is reviewed by hand, on your own machine. No model does the review: you read the code, and the tools only show you what changed, what it reaches, and where your notes go. An agent may run the commands and explain the output, and a guide may put the diff in a reading order (step 7), but the judgement of the code is yours.

Who does what:

- **The developer** reads, judges, and writes the review notes.
- **The coding agent** writes the tests, then the code, in small layers.
- **A helper agent (optional)** runs a step's commands and explains the output when asked. It never reviews the code and never merges.

The loop, in one screen:

1. Acceptance criteria exist in writing before any code.
2. The tests for those criteria come first, in their own layer, and you review them before the implementation is written.
3. The implementation is written as small layers, each reviewable in under 15 minutes.
4. The layers are submitted as pull requests, and you read a layer when the top layer's gate is green.
5. You open the impact graph of the layer, to see which modules it reaches.
6. When a symbol is unfamiliar, you explore it.
7. You read the diff.
8. You annotate, and send the notes back to the agent once per layer.
9. The stack is merged whole, lowest layer first.

Rules that apply to every step:

- Gitflow stays. Feature work and every stack start from `staging`, so the base branch below is `origin/staging`, never `main`.
- The package manager is npm and the source folder is `src/`.
- Never push, open a pull request, or write to the task board by any route other than `/create-pr` and `node scripts/task-board.mjs`.
- `/security-review` is run only when the owner asks, on a risky layer: authentication, workspace scoping, or a database migration. It consumes Claude usage. No script, hook, or workflow runs it.
- The Claude Code GitHub Action and a hosted AI reviewer are not part of this process. Nor are Plannotator's Review Agents, which post a model's review comments on the diff: they are switched on by the same setting as guides, and are not used.
- Plannotator shows one page at a time, on port 19432: a plan review, a code review, or an annotation. A second one started while the first is open fails on the port, so finish the open one in its page first.

The records behind the choices (what was checked, what stacks change, what Graphify offers) are in `claude-docs/review-poc/`.

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

**Done when.** Each acceptance criterion is written and checkable, and you have read it.

**When the agent plans first.** An agent asked to plan a task writes the plan in plan mode. When it leaves plan mode, the plan opens in Plannotator, in the host browser on port 19432. Write notes on the lines you want changed, then approve the plan or request changes; the decision goes back to the agent's session as a message. A revised plan opens in the same page with a diff against the version before it. The agent does not open the plan in the editor as well.

## Step 2. Tests first, reviewed before the implementation

**What it is for.** To make the first layer hold only the tests for the criteria, so you review what "correct" means before reading code that claims to be correct.

**By hand.** After the coding agent has stopped with only tests committed (the project rule is a failing test first, `CLAUDE.md`, "Testing"):

```
git log --oneline origin/staging..HEAD
git show --stat HEAD
npm test -- tests/path/to/the-file.test.ts
```

Run only the test files the layer touches. A good result: the commit touches only files under `tests/`; every criterion has a test; and the run fails for the reason the criterion names (a missing function or a wrong result), not a syntax error or an unrelated failure. Read each test and ask whether it would still pass with the feature removed. If so, it proves nothing (`CLAUDE.md`, "Testing"). Under Claude Code, Vitest prints nothing unless you run it with `env -u CLAUDECODE npm test -- <file>`.

**With an agent.** Paste:

> Write only the tests for the acceptance criteria of task M17.31, following `.claude/rules/testing.md`. Write no implementation. Run each new test file on its own, show me that each fails and why, commit the tests alone with `git commit`, and stop. Do not write the implementation until I say so.

The agent must not write the implementation in the same layer, and must not run the full suites (`test:coverage`, `test:stories`, the full e2e run) unless you say so.

The tests-first layer is its own pull request in a stack. It fails by design until the implementation layers land, so it is read before its tests pass and is never merged alone.

**Done when.** You have read the tests, each fails for the right reason, and you have told the agent to continue.

## Step 3. Layer the implementation

**What it is for.** To split the implementation into logical layers small enough to review in under 15 minutes each.

**By hand.** `gh stack` is the GitHub command for stacked pull requests, where each layer targets the one below. It is installed in the dev container. Start the stack from `staging` and add a layer per logical change:

```
gh stack init --base staging <first-branch-name>
gh stack add <next-branch-name>
gh stack view
```

A good result: `gh stack view` lists every layer in order, and each layer's diff is small (check with `git diff --stat <layer-below>...<layer>`).

**With an agent.** Paste:

> Implement task M17.31 so the tests pass, as layers: after each logical change, commit it and run `gh stack add <name>` so the next change starts a new branch. Keep each layer's diff small enough for a 15-minute read, and tell me the line count of each. Do not run `gh stack submit`, `push`, `sync`, `link`, `merge` or `unstack`, do not push, and do not open a PR. Stop when the implementation is finished.

The agent must not run any `gh stack` command that writes to GitHub, and must not rebase or force-push by hand.

Stack branches are the one exception to `/create-pr`'s "never rebase, never force-push" rules: `gh stack` owns them, and one session owns a whole stack.

**Done when.** `gh stack view` lists the layers, and each layer's diff is small enough that you expect to read it in 15 minutes.

## Step 4. Submit, and read once the top layer is green

**What it is for.** To push the layers as pull requests, so the gate (types, lint, Vitest, Playwright, and the rest) runs before you spend time on a layer.

**By hand.** Ask `/create-pr` for a stack (it offers one only when you ask, and otherwise opens one pull request). It commits after asking, pushes, opens each pull request, and links the board task. Then read the gate result:

```
gh pr checks <pr-number>
```

A good result: every required check is green on the top layer. Read a layer when the top layer's gate is green; the tests-first layer is read before its tests pass.

The gate on a stack:

- The top layer runs every job the whole stack's diff needs.
- A layer below the top runs only format, lint, and types, so a green lower layer means only those passed. A failure is placed by the failing test's name.
- A pull request over 400 changed lines gets the `oversized` label, which is a sign to ask for a stack. The label never fails a pull request.

**With an agent.** Paste:

> Run `/create-pr` for this branch and stop at the link. Then run `gh pr checks` for it and tell me which checks are green, red or pending. Do not merge, do not mark the PR ready, do not edit the board by any route except `/create-pr` and `node scripts/task-board.mjs`, and do not fix a red check without telling me first.

The agent must not call `gh stack submit` or `link` itself: those write pull requests without a `Closes` or `Refs` line, a task-id title, or a board link. Layers are marked ready only when you say so.

**Done when.** The pull requests are open, linked to their task, and the top layer's required checks are green.

## Step 5. The impact graph

**What it is for.** To show which modules the change reaches, so you read the diff knowing what depends on it.

**By hand.**

```
BASE=origin/staging npm run review:affected
```

It writes `.review/affected.md`, a Mermaid graph (a diagram written as text) of the changed modules and the modules that reach them. Open the file in the editor's Markdown preview. `.review/` is ignored by git. The graph is advisory: it never fails the gate, and it does not check import rules (Oxlint and `tests/guards/` do). A good result: you can name each module under `src/modules/` that the change touches.

**With an agent.** Paste:

> Run `BASE=origin/staging npm run review:affected` and read `.review/affected.md`. List the modules the change touches and the modules that reach them. Do not judge whether the change is correct and do not edit anything. Stop and wait for me.

The agent must not offer an opinion on the code. It only lists.

**Done when.** You can list the modules the layer reaches.

## Step 6. Explore an unfamiliar symbol

**What it is for.** To look up what a function, type, or module connects to, without reading the whole codebase.

**By hand.** Search the code:

```
grep -rn "symbolName" src tests | head -30
```

A good result: you find its definition and callers.

**With an agent.** Paste:

> Find where `NAME` is defined and list what calls it and what it calls. Report file and line for each. Do not change any file and do not say whether the code is good. Stop and wait for me.

The agent uses the Graphify MCP tools (`query_graph`, `shortest_path`, `get_node`, `get_neighbors`, `graph_stats`) for this, and for any question of the same shape outside a review ("How an agent uses the tools", below). Graphify builds a graph of the code and calls no model. It runs as a sidecar, beside the dev container, so there is no `graphify` command in the dev container's terminal. The sidecar is described in `claude-docs/docker.md`. The agent must not offer a review of the symbol.

**Done when.** You can say what the symbol does and what uses it, or you decided it does not matter for the review.

## Step 7. Read the diff

**What it is for.** To read the change itself, line by line, and form your own view.

**By hand.**

```
git diff --stat origin/staging...HEAD
git dft origin/staging...HEAD
```

`git dft` is a git alias for a structural diff (difftastic), which compares code by its syntax tree and ignores reformatting. For a stack, replace `origin/staging` with the layer below. A good result: you can say, for every hunk, what it does and whether it meets a criterion from step 1.

**With an agent.** Paste:

> Show me the diff of this layer against `origin/staging` one file at a time, and wait for me after each file. For each file say in one sentence what changed, without saying whether it is correct or good. Do not edit any file.

The agent must not review, approve, or summarise the change as "fine". It only shows and describes.

**Done when.** You have read every changed file of the layer.

**A guide, as a reading aid.** In the Plannotator review page (step 8), **Guide** has a model sort the diff into chapters, the heart of the change first, each with a short overview beside the real diff. Use it to choose the order you read in, on a layer too large to hold in your head. It does not replace reading every changed file, and its overview is not a finding. It consumes Claude usage, at least the size of the diff, so open the review against the layer's base first: a guide on a review opened against `main` reads everything `staging` has as well.

## Step 8. Annotate and send notes back

**What it is for.** To record what you found, and send it to the coding agent once per layer, because each send uses Claude usage.

**By hand.** Run `/plannotator-review --base origin/staging` in the coding agent's Claude Code session; for a stack, name the layer below in place of `origin/staging`. Without `--base` the page compares against `main`. Plannotator is a browser page for writing line notes on a diff; it opens on the host at port 19432. Write each note on its line, then press Send Feedback once: the notes arrive in that session as one message, each with its file and line. A good result: every note says what you want changed. You can also write the notes as review comments on GitHub, or in a file of your own.

**With an agent.** Paste:

> Here are my review notes for this layer. Make each change as its own commit, run only the test files it touches, and tell me what you changed per note. Do not argue with a note, do not add changes I did not ask for, and do not push until I say so.

The agent must not push, merge, or resolve a review thread on GitHub itself.

**Done when.** Each note is resolved or answered, and you have re-read the changes.

## Step 9. Merge the whole stack

**What it is for.** To land the layers in order, lowest first, so each lands on a base that has already been checked.

**By hand.** You merge, through GitHub, once the top layer's gate is green and you have approved every layer. Never merge a lower layer alone, because a green lower layer means only the cheap checks passed. `gh stack merge` on the top layer merges the whole stack. `Closes #N` is on the top layer and `Refs #N` on the layers below, so the task closes only when the top layer merges. When it does, `close-task-on-merge.yml` closes the task and the board's `Done` follows (`.claude/rules/task-tracking.md`). Never close a task by hand.

**With an agent.** No prompt. The agent does not merge.

There is no merge queue today.

**Done when.** The pull requests are merged into `staging`, and the task shows `Done` on the board.

## How an agent uses the tools

What an agent does without being asked, in any task, not only in a review:

| When                                                                                      | The agent                                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| It needs to know what calls a function, what a module reaches, or how two symbols connect | Asks the code graph first (`query_graph`, `get_neighbors`, `shortest_path`), then reads the files it names. The graph is rebuilt after each change to the code, so a symbol written minutes ago may not be in it yet.             |
| It needs a piece of text: a string, a class name, a config key                            | Searches with `grep`. The graph holds code structure, not text.                                                                                                                                                                   |
| It finishes a plan                                                                        | Leaves plan mode, which opens the plan in Plannotator (step 1).                                                                                                                                                                   |
| It has a question that does not stop the rest of the work                                 | Posts it to the Plannotator Inbox, a standing page where questions from every session wait for you, and carries on. The answer arrives in its session as a message. A question that blocks everything is still asked in the chat. |
| It is told to open something for review                                                   | Opens it in Plannotator: a diff with `plannotator review --base <ref>`, a document with `plannotator annotate <file>`.                                                                                                            |
| It wants the shape of a change before reading it                                          | Runs `BASE=<ref> npm run review:affected` and reads `.review/affected.md` (step 5), and `git dft <ref>...HEAD` for the diff itself (step 7).                                                                                      |

The agent never starts a guide, Ask AI, or a Review Agent in Plannotator: those spend usage on the reviewer's behalf, and only the reviewer presses them. The Inbox is at `http://localhost:43501` on the host; `/plannotator-inbox` starts it and prints its address (`claude-docs/commands.md`, "The local review").

## Walking through it with an agent

You can ask an agent to take you through the loop one step at a time. The agent stops after each step and waits for you. Paste:

> Read `claude-docs/review-workflow.md` and walk me through the review of task <ID> one step at a time. For each step, say what it is for, run the "By hand" commands and show me the output, and tell me whether the output matches "a good result". Give me the "Done when" condition and stop. Do not start the next step until I say "next". Do not review the code, do not give an opinion on it, do not commit unless I ask, and do not push, merge or write to GitHub or the board except through `/create-pr` and `node scripts/task-board.mjs`.

## Rollback

Each tool comes out on its own, with no effect on the app.

| What to remove                                                                  | How                                                                                                  |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `.devcontainer/`, `package.json` scripts, `scripts/`, and the `CLAUDE.md` lines | Revert the pull request that added them.                                                             |
| A change to the gate (`pr-gate.yml`, the `oversized` label workflow)            | Revert that change in its own pull request.                                                          |
| `gh stack`                                                                      | `gh extension remove gh-stack`                                                                       |
| Plannotator in Claude Code                                                      | `/plugin uninstall plannotator@plannotator`                                                          |
| The Graphify sidecar                                                            | Stop it with the one command in `claude-docs/docker.md`, then revert the pull request that added it. |

## Acceptance checks

These checks prove the setup works. The container rows were run after a full container rebuild; **the GitHub rows, and `gh stack view`, have not been run**, because they need a stack of three test layers. Each row records pass or fail in the last column, with the actual output on a fail. A failed row stops the run and is reported, not worked around. The test stack is closed without merging, and its branches are deleted.

| Where     | Check                                                       | Passes when                                                                                                      | Result                                                                                                                           |
| --------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Container | `git dft HEAD~1` on a commit that touches a `.tsx` file     | A structural diff with no parse-failure notice                                                                   | Pass                                                                                                                             |
| Container | `BASE=origin/staging npm run review:affected` on a branch   | `.review/affected.md` renders a Mermaid graph of the changed modules and the modules that reach them             | Pass, against `origin/main`; this branch changes nothing under `src/`, so against `origin/staging` the command stops and says so |
| GitHub    | Open the three-layer test stack                             | The top layer runs the full gate on the whole stack's diff; the two layers below run only format, lint and types |                                                                                                                                  |
| GitHub    | Push a test layer above the size limit                      | The pull request gets the `oversized` label, and loses it when a later push brings it under                      |                                                                                                                                  |
| Container | `gh stack view` on the test stack                           | All layers are listed                                                                                            |                                                                                                                                  |
| Container | `/plannotator-review` in Claude Code                        | The review opens in the host browser on port 19432                                                               | Pass                                                                                                                             |
| Container | `git status` after a review run                             | Nothing under `.review/` is tracked or listed as untracked                                                       | Pass                                                                                                                             |
| Container | `graph_stats` through the MCP server                        | Counts, not "graph.json not found"                                                                               | Pass                                                                                                                             |
| Container | Commit a small change, then check `graphify-out/graph.json` | The file's modified time is after the commit; the watch service does this, not a git hook                        | Pass: rebuilt 36 seconds after a source file was added                                                                           |

Rows from the original brief that are not run, and why:

- `npm run depcruise:check`, and "push a layer that adds a circular import": Oxlint and `tests/guards/` own the import rules, so the gate has no dependency-cruiser rule.
- "The gate runs on both layers, including the dependency-cruiser step": replaced by the row that runs the full gate on the top layer only.
- "Commit from a host terminal with no hook error": the sidecar installs no Graphify git hook.
- `graphify --version` and `graphify explain`: the Graphify command line is not installed, and no `explain` tool exists in the MCP server.
