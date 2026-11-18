# Plan: tasks for the local code review POC

This is the plan the three discovery tasks (M17.31, M17.32 and M17.33) lead to. The owner approved it on 2026-11-18 as six tasks. Each entry below is the text of the task's entry in `claude-docs/tasks/v1/m17.md`. Every hour figure is an estimate, not a measurement.

Read `process.md` first. It is the process these tasks build.

## The tasks

| Task   | Title                                               | Estimate (est.) | Depends on       | Unblocks (process step)                                        |
| ------ | --------------------------------------------------- | --------------- | ---------------- | -------------------------------------------------------------- |
| M17.38 | Set Up the Review Tools in the Dev Container        | 7h              | none             | Step 4 (`gh stack`), Step 5 (impact graph), Steps 7 and 8      |
| M17.39 | Make the Gate Fit Stacked Pull Requests             | 8h              | none             | Step 3 (small layers), Step 4 (read a green top layer), Step 9 |
| M17.40 | Open Stacks From `/create-pr` and Close Tasks Whole | 9h              | M17.38           | Steps 3, 4 and 9                                               |
| M17.41 | Set Up the Graphify Sidecar                         | 8h              | none             | Step 6 (explore), and the log field "graph consulted"          |
| M17.42 | Prove the Review Setup and Write Down the Process   | 4h              | M17.38 to M17.41 | Steps 1 to 3 for every coding session                          |
| M17.43 | Run the Two-Week Review Evaluation                  | 2h              | M17.42           | The keep-or-drop decision for each part                        |

Total: 38h (estimate).

## Order

1. **M17.38, M17.39 and M17.41 run in parallel.** They touch different files: the dev container and `package.json`; the workflows; the Graphify sidecar. None needs another.
2. **M17.40 follows M17.38.** It needs `gh stack` installed in the container. Its proof of the atomic merge runs on a throwaway public repository, so it needs nothing else.
3. **M17.42 follows M17.38 to M17.41.** It runs every tool together on one test stack, so every tool must exist first.
4. **M17.43 comes last.** The log needs the written process and the "graph consulted" field before the two weeks start.

## The tasks in full

**M17.38 — Set Up the Review Tools in the Dev Container** · 7h

_Story:_ As the owner, I want the review tools to run inside the dev container, so that the local review loop works the same in every session.

Minted on the owner's call of 2026-11-18. It installs difftastic (a diff that compares code by its structure, not its lines), Plannotator (a browser page for writing line notes on a diff), `gh stack` (the GitHub command for stacked pull requests) and a graph of the modules a change reaches. The decisions are in `claude-docs/review-poc/verify.md`: Plannotator runs from a private glibc prefix and a wrapper, with the host as the fallback, and the graph uses dependency-cruiser with the `swc` parser. The import rules are not in this task: Oxlint already owns them, including cycles (`tests/guards/` proves it), so the graph reports no cycles.

_Acceptance criteria:_

- difftastic is in the dev container image, and `difft --version` runs, with the binary fetched from its release page and checked against its published checksum
- Plannotator is never installed with `install.sh`. The binary is fetched from its release and checked against its `.sha256` file
- The three glibc libraries (`libc6`, `libgcc-s1` and `libstdc++6`, about 26 MB) are fetched at image build with pinned checksums and unpacked into a private prefix outside the system paths
- A `plannotator` wrapper on `PATH` runs the binary through the prefix's loader and sets `PLANNOTATOR_REMOTE=1`, `PLANNOTATOR_PORT=19432` and `PLANNOTATOR_SHARE=disabled`
- Port 19432 is in `forwardPorts` in `.devcontainer/devcontainer.json`
- The image is rebuilt with `docker compose build` on the host, and `plannotator --version` prints a version and port 19432 answers HTTP 200 inside the container; the exact commands are in `claude-docs/`
- `postCreateCommand` sets the git alias `dft` to `-c diff.external=difft diff` and does not set `diff.external` globally; the existing `postCreateCommand` content is kept and the new commands are appended
- `gh extension install github/gh-stack` runs at container create, and its failure does not stop the container from starting
- `bierner.markdown-mermaid` is in the `customizations.vscode.extensions` list
- Nothing is installed with `curl | bash`
- `git dft HEAD~1` on a commit that touches a `.tsx` file prints a structural diff with no parse-failure notice, and `gh stack view` runs, in the rebuilt container
- The two commands that install the Plannotator plugin in Claude Code (`/plugin marketplace add backnotprop/plannotator`, then `/plugin install plannotator@plannotator`) and the command that removes it (`/plugin uninstall plannotator@plannotator`) are written in `claude-docs/`
- `npm run review:affected` calls one script that writes a Mermaid graph of the changed modules and the modules that reach them to `.review/affected.md`, and `.review/` is in `.gitignore`
- The script passes `--affected` the value `origin/staging` (its default is `main`, which does not exist in this flow) and fails if it cruises zero modules
- The graph is advisory: it never fails `pr-gate.yml`
- The `swc` parser is set in the dependency-cruiser config, which excludes `src/modules/documents/jobs/document-mailing.ts` (the one file `swc` rejects) with a comment saying why, and a test fails when a new file breaks the parser
- A mechanical guard for the new mechanism lands in the same commit (`CLAUDE.md`, "The sweep-task rule"), and was seen failing once with a copy put back
- `package.json` gains dependency-cruiser and its `swc` parser packages and no other tool
- Docs corrected: `claude-docs/commands.md` lists the new commands, the alias and the extension

**M17.39 — Make the Gate Fit Stacked Pull Requests** · 8h

_Story:_ As a reviewer of a stacked pull request, I want the top layer's gate to run every job the whole stack's diff needs and the layers below to run only the cheap checks, so that a stack costs one full gate, not one per layer, and I also want a pull request over a size limit labelled, so that I know to ask for a stack.

Minted on the owner's call of 2026-11-18. A stack is a chain of pull requests where each layer targets the one below. The owner chose the top-only gate (decision 3 in `claude-docs/review-poc/stacks.md`) because smaller pull requests multiply gate runs, which costs minutes once the repository is private. GitHub already starts the gate and `gitflow.yml` on every layer, and `gitflow.yml` passes an upper layer, so the trigger needs no change. The change is in the `changes` job of `pr-gate.yml`, which today reads only each layer's own files. The costs the owner accepted: a green lower layer means only the cheap checks passed, a failure is placed by the failing test's name, and a partial merge is unsafe.

_Acceptance criteria:_

- When `github.event.pull_request.stack` is present and `stack.position == stack.size`, `changes` computes its filters from the diff between `stack.base.sha` and the head, so the top layer runs every job the whole stack's files need
- When the stack is present and the layer is below the top, only `format`, lint and types run; the Vitest, Playwright, story, workshop and build jobs report skipped
- A pull request that is not in a stack behaves exactly as today, shown by a run on a single-PR branch that lists the same jobs as before the change
- The aggregate check names stay unchanged, and a skipped job still reports skipped (MB.39)
- Step 4 of `claude-docs/review-poc/process.md` reads "read a layer when the top layer's gate is green; the tests-first layer is read before its tests pass"
- A guard against merging a lower layer alone exists, or the record says plainly that none is possible and the rule stays a process rule. The idea is a check on lower layers that is green only once the top layer's gate is green. Nothing so far proves it works: required checks on `staging` could not be set up with the scratch token (HTTP 403, no repository Administration permission), and a check that depends on another PR's run needs a re-run call back from the top layer. The task builds the guard only if a scratch-repository run shows it works
- A run on a real stack records the number of runs and the billable time for it, in `claude-docs/ci/`, with the figures from a private run once one exists (`gh api repos/<owner>/<repo>/actions/runs/<run id>/timing`)
- The limit for the `oversized` label is stated once, in one file, as 400 changed lines (the brief's figure), excluding lockfiles, `src/gql/` and generated files
- A workflow adds the `oversized` label above the limit and removes it when a later push brings the pull request under; it never fails a pull request for size
- The label workflow runs on `pull_request` and writes only the label, with `pull-requests: write` permission and no other
- A test, or a run on a scratch pull request, shows both the label being added and being removed
- Docs corrected: `claude-docs/ci/` describes the top-only gate on a stack and the `oversized` label

**M17.40 — Open Stacks From `/create-pr` and Close Tasks Whole** · 9h

_Story:_ As a developer with an oversized task, I want `/create-pr` to open the task as a stack of layered pull requests that all link to the task, and the task to close exactly when its last layer merges, so that each layer is reviewed on its own and a stack merged in one call or one layer at a time never leaves a task open or closes it early.

Minted on the owner's call of 2026-11-18. `/create-pr` and the task board assume one pull request per task; `claude-docs/review-poc/stacks.md` lists every place with file and line. Two owner decisions are written into the skill by this task. `Closes #N` goes on the top layer and `Refs #N` on the layers below. Stack branches are the one exception to the skill's never-rebase and never-force-push rules: `gh stack` owns them, and one session owns a whole stack. The atomic merge of a whole stack is unproved: the `closed` event of layers merged together in one call has only been seen one layer at a time.

_Acceptance criteria:_

- `/create-pr` offers a stack only when the owner asks for one, and otherwise opens one pull request as today; the one-PR flow is unchanged and covered by the skill's own checks
- Each layer's title opens `<ID> — `; the top layer's body opens with `Closes #N` and every layer below it opens with `Refs #N`; `gh stack submit --auto` is followed by editing each pull request's title and body, because `submit` writes a commit-subject title and a footer-only body
- Layers are marked ready only when the owner says so (`submit --auto` creates drafts, and `gh stack merge` refuses a draft)
- The task moves to `In Review` once, with one comment listing every layer's pull request
- `task-board.mjs link-pr` is run for the layer carrying `Closes`
- `SKILL.md:55` and `SKILL.md:90` of `/create-pr` state that stack branches are the one exception: `gh stack` owns them and rebases and force-pushes them, one session owns a whole stack, and no other session runs `gh stack` on it; the rules for every other branch are unchanged
- A run on a throwaway public repository, holding no Sorrel & Salt source, merges a three-layer stack in one `gh stack merge` call and records the `closed` event's `base.ref` for each layer
- `close-task-on-merge.yml` closes the task named by `Closes #N` for that run; if an upper layer's closed event reports a base other than `staging`, the base filter is changed and the change is explained in the workflow
- The workflow keeps reading a whole-line `Closes #N` only
- A run shows a lower layer merged alone leaving the task open when `Closes #N` is on the top layer
- Docs corrected: `.claude/rules/task-tracking.md` and `claude-docs/task-tracking.md` describe the stack case

**M17.41 — Set Up the Graphify Sidecar** · 8h

_Story:_ As the owner, I want a real Graphify graph of this repository kept current and reachable by the coding agent, with its cost written down, so that the POC's keep-or-drop rule has data and I can merge the sidecar without changing the app.

Minted on the owner's call of 2026-11-18. Graphify is a tool that builds a graph of the code for an agent to query. The owner chose the sidecar: separate containers beside the dev container, reached through an MCP server (a tool interface the agent calls), with the existing branch `feature/graphify-sidecar` reworked. The survey and the choice are in `claude-docs/review-poc/graphify.md`. Today the branch carries nine unrelated edits under `src/` and `tests/`, the watch service does not resolve by its compose service name, and the graph is empty.

_Acceptance criteria:_

- A new branch off `staging`, or the existing branch reset by the owner, carries the Graphify files and no `src/` or `tests/` file; `unit-converter.tsx` keeps `role="status"`
- `.gitignore` on the branch ignores `graphify-out/`
- `CLAUDE.md`'s "no Python" line says the sidecar image's Python is outside the rule
- The old branch is closed unmerged once the reworked one is on a pull request
- `graphify-watch` is running and resolves by its compose service name
- `graphify-out/graph.json` exists and covers this repository's TypeScript and TSX; the record says how many nodes and files it holds
- `graph_stats` through the MCP server returns counts instead of "graph.json not found"
- The first build time is recorded, and `.graphifyignore` still leaves out `compendium/`
- If the build fails, the record gives the error and stops
- From a dev container session, the agent calls `query_graph`, `shortest_path` and `graph_stats` and gets results; the record notes that no `explain` tool exists and `get_node` and `get_neighbors` are the nearest
- The POC log (task M17.43) has a "graph consulted" column, yes or no, set from the session's tool calls, so the 1-in-4 rule can be applied
- The record states what the host-side session shows for the `graphify` entry
- `.mcp.json` still holds `next-devtools` unchanged
- The owner's `docker images` and `docker stats` output for the sidecar is recorded, with no addresses or tokens
- `.reports/graphify-view.py.old` is deleted, or kept on the owner's say-so, and nothing else is removed
- Docs corrected: `claude-docs/docker.md` describes the sidecar, gives its size and memory figures and the one command that stops its four services, and no other doc is wrong

**M17.42 — Prove the Review Setup and Write Down the Process** · 4h

_Story:_ As the owner, I want the acceptance checks run end to end on a test stack, the review process moved to where every session reads it, and the coding agent told steps 1 to 3, so that the setup is known to work and tests-first and small layers happen by default.

Minted on the owner's call of 2026-11-18. It follows the other four setup tasks, because it exercises all of them together. The review process is written in `claude-docs/review-poc/process.md`; this task moves it to `claude-docs/review-workflow.md` once the tools are in. The checks come from the owner's brief, corrected for the decisions made since.

_Acceptance criteria:_

- A full container rebuild is done first, and the container rows below run inside the container
- Each row below is run on a three-layer test stack, and recorded with pass or fail and the actual output on a fail:

| Where     | Check                                                       | Passes when                                                                                                      |
| --------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Container | `git dft HEAD~1` on a commit that touches a `.tsx` file     | A structural diff with no parse-failure notice                                                                   |
| Container | `BASE=origin/staging npm run review:affected` on a branch   | `.review/affected.md` renders a Mermaid graph of the changed modules and the modules that reach them             |
| GitHub    | Open the three-layer test stack                             | The top layer runs the full gate on the whole stack's diff; the two layers below run only format, lint and types |
| GitHub    | Push a test layer above the size limit                      | The pull request gets the `oversized` label, and loses it when a later push brings it under                      |
| Container | `gh stack view` on the test stack                           | All layers are listed                                                                                            |
| Container | `/plannotator-review` in Claude Code                        | The review opens in the host browser on port 19432                                                               |
| Container | `git status` after a review run                             | Nothing under `.review/` is tracked or listed as untracked                                                       |
| Container | `graph_stats` through the MCP server                        | Counts, not "graph.json not found"                                                                               |
| Container | Commit a small change, then check `graphify-out/graph.json` | The file's modified time is after the commit; the watch service does this, not a git hook                        |

- The brief's rows that are dropped are listed with the reason: `npm run depcruise:check` and "push a layer that adds a circular import" (Oxlint and `tests/guards/` own the import rules, so there is no dependency-cruiser gate rule); "the gate runs on both layers, including the dependency-cruiser step" (replaced by the top-only row); "commit from a host terminal with no hook error" (the sidecar installs no Graphify git hook); `graphify --version` and `graphify explain` (the CLI is not installed)
- A failed row stops the task and is reported; it is not worked around
- The test stack is closed without merging, and its branches are deleted
- `claude-docs/review-workflow.md` holds the nine steps of `process.md`, corrected for what the tasks built, and `claude-docs/review-poc/process.md` keeps a one-line pointer to it, or is archived under `claude-docs/archive/` per the doc rules
- `CLAUDE.md` gains three lines for steps 1 to 3 (acceptance criteria first; tests in their own layer, reviewed before the implementation; the implementation as layers of about 15 minutes of reading each), and no other line changes
- `review-workflow.md` has a rollback table: revert the pull request for `.devcontainer/`, `package.json` scripts, `scripts/` and the `CLAUDE.md` lines; revert a gate change in its own pull request; `gh extension remove gh-stack`; `/plugin uninstall plannotator@plannotator`; and stop the Graphify sidecar with the one command in `claude-docs/docker.md` and revert its pull request
- `review-workflow.md` says `/security-review` is run only when the owner asks, on a risky layer (auth, workspace scoping or a database migration), that it consumes Claude usage, and that no script, hook or workflow runs it
- `review-workflow.md` says the Claude Code GitHub Action and a hosted AI reviewer are not part of the process, and cites no dependency versions
- Docs corrected: `claude-docs/README.md` indexes `review-workflow.md`

**M17.43 — Run the Two-Week Review Evaluation** · 2h

_Story:_ As the owner, I want each part of the review process kept or dropped on its own number after two weeks of normal work, so that I keep only what helped.

Minted on the owner's call of 2026-11-18. The two weeks are normal work and are not in the estimate; the 2h is setting up the log and writing the evaluation. It follows M17.42, which writes the process the log measures.

_Acceptance criteria:_

- `claude-docs/review-poc-log.md` has one row per reviewed pull request with these columns: date, pull request, lines changed, minutes to review, gate failed for a real problem (yes/no), gate failed wrongly (yes/no), tests-first review changed the criteria (yes/no), impact graph changed what was read (yes/no), rebase conflicts in the stack, graph consulted (yes/no, from the session's tool calls), and gate runs for the pull request
- After two weeks, the evaluation is written with each part kept or dropped on its own number, by this table:

| Part                              | Keep if                                                                                                    | Drop if                                                                              |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Top-only gate on a stack          | No more than 1 wrong failure in 10 top-layer gate runs, and gate runs per stack fall against one per layer | It fails correct stacks more often than that, or a lower layer was ever merged alone |
| Tests-first layer                 | Reviewing the tests found a wrong or missing criterion on at least 1 in 4 tasks                            | It never changed anything                                                            |
| Impact graph (dependency-cruiser) | The graph changed what was read on at least 1 in 4 pull requests                                           | It never changed what was read                                                       |
| Stacked PRs                       | Median review time per layer is under 15 minutes                                                           | Rebase conflicts cost more time than the smaller diffs save                          |
| Plannotator                       | Notes were sent back to the agent on at least half of the layers that needed changes                       | Notes ended up typed into chat instead                                               |
| difftastic                        | Used on most reviews                                                                                       | Not used after week one                                                              |
| Graphify                          | The graph was consulted on at least 1 in 4 reviews                                                         | It was not                                                                           |

- If Graphify and the dependency-cruiser graph answer the same question, the evaluation keeps the one used more and drops the other, and says which
- There is no "dependency-cruiser rules in the gate" row: no such gate rule exists
- The evaluation records the gate runs and billable minutes per stack from the log, using the figures from a private run, and states whether the top-only choice saved minutes
- Each part to drop gets a follow-on task with its rollback from `review-workflow.md`; nothing is removed inside this task

## Decided

Every owner decision, one line each.

- `Closes #N` goes on the top layer and `Refs #N` on the layers below: `stacks.md`, Decisions, Decision 1. Written into the skill by M17.40.
- Stack branches are the one exception to the never-rebase and never-force-push rules; `gh stack` owns them and one session owns a whole stack: `stacks.md`, Decision 2. Written into the skill by M17.40.
- The full gate runs on the top layer over the whole stack's diff; the layers below run types, lint and format; a stack merges whole: `stacks.md`, Decision 3. Built by M17.39.
- dependency-cruiser is used with the `swc` parser, for the graph only: `verify.md`, Decisions, Decision 1. Built by M17.38.
- Plannotator runs from a private glibc prefix and a wrapper, with the host as the fallback: `verify.md`, Decision 2. Built by M17.38.
- The stack run was done on a public scratch repository: `verify.md`, Decision 3.
- The file reading of the container build is accepted, and M17.38 rebuilds the image: `verify.md`, Decision 4.
- Graphify ends as the sidecar, MCP only, with the branch reworked: `graphify.md`, Decision. Built by M17.41.
- The six tasks above, with these estimates and this order: the owner's call of 2026-11-18.
- The trunk migration and a merge queue are overridden and are not in this plan.
- Import rules stay with Oxlint and `tests/guards/`; there is no dependency-cruiser gate rule.

## Still unproved

Each line names the task that proves it.

- That the private glibc prefix and wrapper run Plannotator in the real image, and that its page opens in the host browser: M17.38, then M17.42.
- That `swc` cruises the whole repository apart from the one excluded file: M17.38.
- That the top layer's whole-stack filter selects the right jobs, and that a single-PR pull request is unchanged: M17.39.
- That a guard against merging a lower layer alone is possible. A required check on `staging` could not be created with the token used (HTTP 403, no repository Administration permission), so settling it needs a token with that permission: M17.39.
- What a stack costs in runs and billable minutes on a private repository. The one timing call made, on the public scratch repository, returned 0 billable ms: M17.39 records it once a private run exists, and M17.43 reports it again.
- That the `closed` event for each layer of an atomic `gh stack merge` carries base `staging`, so the task closes: M17.40.
- That the agent consults the graph on at least 1 in 4 reviews, and that the MCP tools answer from this repository's graph: M17.41, then M17.43.
- The sidecar's real size and memory: M17.41.
- Whether stacked review, tests-first and Plannotator each pay for themselves: M17.43.
