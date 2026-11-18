# Plan: tasks to mint for the local code review POC

This is the one place you approve tasks for minting. Nothing here is minted. The draft ids (A, B, C and so on) are placeholders, and the main session mints real ids after you approve. Every hour figure is my estimate, not a measurement.

Read `process.md` first. It is the process these tasks build.

## The tasks

| Draft | Title                                                                 | Estimate (est.) | Full entry              | Depends on                   | Unblocks (process step)                               |
| ----- | --------------------------------------------------------------------- | --------------- | ----------------------- | ---------------------------- | ----------------------------------------------------- |
| A     | Make the Dev Container Able to Run the Review Tools                   | 3h              | `verify.md`, Draft A    | none                         | Step 7 (difftastic), Step 8 (Plannotator)             |
| K     | Add the Alias, the Editor Extension and `gh stack` to the Container   | 1h              | this file, Draft K      | A (same `devcontainer.json`) | Step 4 (`gh stack`), Step 5 (Mermaid view), Step 7    |
| B     | Show the Affected Modules in the Review                               | 2h              | `verify.md`, Draft B    | none                         | Step 5 (impact graph)                                 |
| D     | Label Oversized Pull Requests                                         | 2h              | `verify.md`, Draft D    | none                         | Step 3 (small layers)                                 |
| C     | Test the Whole Stack on Its Top Layer                                 | 4h              | `stacks.md`, Draft C    | none                         | Step 4 (read a green top layer), Step 9 (merge whole) |
| F     | Open a Stack of PRs from `/create-pr`                                 | 6h              | `stacks.md`, Draft F    | K (`gh stack` installed)     | Steps 3 and 4 (submit layers)                         |
| G     | Close a Task When Its Whole Stack Merges                              | 3h              | `stacks.md`, Draft G    | K, F                         | Step 9 (merge)                                        |
| G1    | Rework the Graphify Sidecar Branch                                    | 2h              | `graphify.md`, Draft G1 | none                         | Step 6 (explore)                                      |
| G2    | Build the Graph and Get the Watch Service Running                     | 2h              | `graphify.md`, Draft G2 | G1                           | Step 6                                                |
| G3    | Prove the Agent Uses the Graph and Measure It                         | 2h              | `graphify.md`, Draft G3 | G2                           | Step 6, and the log field "graph consulted"           |
| G4    | Record the Sidecar's Cost and Clear the Leftovers                     | 1.5h            | `graphify.md`, Draft G4 | G2                           | none (closes Graphify)                                |
| J     | Run the Acceptance Checks End to End                                  | 2h              | this file, Draft J      | A, K, B, D, C, F, G2         | the two-week evaluation (I)                           |
| H     | Move the Process Into `claude-docs/` and Teach the Agent Steps 1 to 3 | 2h              | this file, Draft H      | J                            | Steps 1 to 3 for every coding session                 |
| I     | Keep the POC Log and Run the Two-Week Evaluation                      | 2h              | this file, Draft I      | H, G3                        | the keep-or-drop decision for each part               |

Total: 34.5h (estimate). The seven drafts already in the records come to 27.5h (A 3, B 2, D 2, C 4, F 6, G 3, G1 to G4 7.5). Drafts K, J, H and I, which I drafted here, add 7h.

## Drafts not in any record

These four cover work in your brief that no earlier draft covers.

**Draft K — Add the Alias, the Editor Extension and `gh stack` to the Container** · 1h (estimate)

_Story:_ As the owner, I want the small review conveniences installed when the container is created, so that every session has `git dft`, the Mermaid preview and `gh stack` without a manual step.

_Acceptance criteria:_

- `postCreateCommand` in `.devcontainer/devcontainer.json` sets the `dft` git alias to `-c diff.external=difft diff`, and does not set `diff.external` globally
- `gh extension install github/gh-stack` runs at container create, and its failure does not stop the container from starting
- `bierner.markdown-mermaid` is in the `customizations.vscode.extensions` list
- Nothing is installed with `curl | bash`; Plannotator is handled by Draft A
- The existing `postCreateCommand` content is kept, and the change is appended
- `git dft HEAD~1` on a commit that touches a `.tsx` file prints a structural diff, and `gh stack view` runs in a rebuilt container
- `claude-docs/commands.md` lists the alias and the extension
- The Plannotator Claude Code plugin (`/plugin marketplace add backnotprop/plannotator`, then `/plugin install plannotator@plannotator`) is a manual step run by you in Claude Code, and the task records the exact two commands and the removal command (`/plugin uninstall plannotator@plannotator`) in `claude-docs/`

**Draft J — Run the Acceptance Checks End to End** · 2h (estimate)

_Story:_ As the owner, I want the brief's acceptance checks run after the installs, on a test stack that is closed without merging, so that I know the setup works before the two-week evaluation starts.

_Acceptance criteria:_

- A full container rebuild is done first, and the container rows run inside the container
- Each row below is run and recorded with pass or fail and the actual output on a fail

| Where     | Check                                                       | Passes when                                                                                                      | Changed from the brief                                                                                          |
| --------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Container | `git dft HEAD~1` on a commit that touches a `.tsx` file     | A structural diff with no parse-failure notice                                                                   | none                                                                                                            |
| Container | `BASE=origin/staging npm run review:affected` on a branch   | `.review/affected.md` renders a Mermaid graph of the changed modules and the modules that reach them             | `origin/staging` replaces `main`, and the script fails on zero modules (Draft B)                                |
| GitHub    | Open a three-layer test stack                               | The top layer runs the full gate on the whole stack's diff; the two layers below run only format, lint and types | The brief expected the gate on both layers; Decision 3 in `stacks.md` changed it                                |
| GitHub    | Push a test layer above the size limit                      | The pull request gets the `oversized` label, and loses it when a later push brings it under                      | The limit is Draft D's, not 400 lines unless Draft D sets 400                                                   |
| Container | `gh stack view` on the test stack                           | All layers are listed                                                                                            | none                                                                                                            |
| Container | `/plannotator-review` in Claude Code                        | The review opens in the host browser on port 19432                                                               | none                                                                                                            |
| Container | `git status` after a review run                             | Nothing under `.review/` is tracked or listed as untracked                                                       | none                                                                                                            |
| Container | `graph_stats` through the MCP server                        | Counts, not "graph.json not found"                                                                               | Replaces `graphify --version` and `graphify explain`, which belong to the CLI that end state A does not install |
| Container | Commit a small change, then check `graphify-out/graph.json` | The file's modified time is after the commit                                                                     | Done by the watch service, not a git hook                                                                       |

- The brief's rows that are dropped are listed with the reason: `npm run depcruise:check` and "push a layer that adds a circular import" (Oxlint and `tests/guards/` own the import rules, so there is no dependency-cruiser gate rule), "the gate runs on both layers including the dependency-cruiser step" (replaced by the top-only row), and "commit from a host terminal with no hook error" (end state A installs no Graphify git hook)
- The test stack is closed without merging, and its branches are deleted
- A failed row stops the task and is reported; it is not worked around

**Draft H — Move the Process Into `claude-docs/` and Teach the Agent Steps 1 to 3** · 2h (estimate)

_Story:_ As the owner, I want the review process to live where every session reads it, and the coding agent to follow steps 1 to 3 without being told, so that tests-first and small layers happen by default.

_Acceptance criteria:_

- `claude-docs/review-workflow.md` holds the nine steps of `process.md`, corrected for what the tasks above actually built, and `claude-docs/README.md` indexes it
- `claude-docs/review-poc/process.md` keeps a one-line pointer to the new file, or is archived under `claude-docs/archive/` per the doc rules
- `CLAUDE.md` gains the three lines for steps 1 to 3 (acceptance criteria first, tests in their own layer reviewed before the implementation, implementation as layers of about 15 minutes of reading each), and no other line changes
- A rollback table is in `review-workflow.md`: revert the pull request for `.devcontainer/`, `package.json` scripts, `scripts/` and the `CLAUDE.md` lines; revert a gate change in its own pull request; `gh extension remove gh-stack`; `/plugin uninstall plannotator@plannotator`; and the Graphify sidecar is stopped with the one command in `claude-docs/docker.md` and its pull request reverted
- The doc says `/security-review` is run only when you ask, on a risky layer (auth, workspace scoping, a database migration), that it consumes Claude usage, and that no script, hook or workflow runs it
- The doc says the Claude Code GitHub Action and a hosted AI reviewer are not part of the process
- The doc cites no dependency versions

**Draft I — Keep the POC Log and Run the Two-Week Evaluation** · 2h (estimate; the two weeks themselves are normal work and are not counted)

_Story:_ As the owner, I want each part of the process kept or dropped on its own number after two weeks, so that I keep only what helped.

_Acceptance criteria:_

- `claude-docs/review-poc-log.md` has one row per reviewed pull request with these columns: date, pull request, lines changed, minutes to review, gate failed for a real problem (yes/no), gate failed wrongly (yes/no), tests-first review changed the criteria (yes/no), impact graph changed what was read (yes/no), rebase conflicts in the stack, graph consulted (yes/no, from the session's tool calls), and gate runs for the pull request
- After two weeks, the evaluation is written with each part kept or dropped on its own number:

| Part                              | Keep if                                                                                                    | Drop if                                                                              |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Top-only gate on a stack          | No more than 1 wrong failure in 10 top-layer gate runs, and gate runs per stack fall against one per layer | It fails correct stacks more often than that, or a lower layer was ever merged alone |
| Tests-first layer                 | Reviewing the tests found a wrong or missing criterion on at least 1 in 4 tasks                            | It never changed anything                                                            |
| Impact graph (dependency-cruiser) | The graph changed what was read on at least 1 in 4 pull requests                                           | It never changed what was read                                                       |
| Stacked PRs                       | Median review time per layer is under 15 minutes                                                           | Rebase conflicts cost more time than the smaller diffs save                          |
| Plannotator                       | Notes were sent back to the agent on at least half of the layers that needed changes                       | Notes ended up typed into chat instead                                               |
| difftastic                        | Used on most reviews                                                                                       | Not used after week one                                                              |
| Graphify                          | The graph was consulted on at least 1 in 4 reviews                                                         | It was not (G3 supplies the field)                                                   |

- If Graphify and the dependency-cruiser graph answer the same question, the one used more is kept and the other dropped, and the evaluation says which
- The "dependency-cruiser rules in the gate" row of the brief is not in the table: there is no such gate rule
- The evaluation records the gate runs and billable minutes per stack from the log, using the figures from a private run, and states whether the top-only choice saved minutes
- Each part to drop gets a follow-on task with its rollback from Draft H; nothing is removed inside this task

## Order

1. **A**, first. Everything that runs in the container needs the image, and `docker compose build` happens on the host.
2. **K**, after A. It edits the same `.devcontainer/devcontainer.json`, and installs `gh stack`, which F and G need.
3. **B, D and C**, in parallel with each other and with step 2. They touch different files (`package.json` and `scripts/`; a new workflow; `pr-gate.yml`) and need nothing installed first. C's guard criterion needs a required check, which my token could not create (HTTP 403, no Administration permission); see "Still unproved".
4. **G1, G2, G3 and G4**, a second lane in parallel with everything above. G1 first (the branch must hold only Graphify), then G2 (a graph must exist), then G3 and G4 in parallel.
5. **F**, after K. It needs `gh stack` in the container and the Decisions from `stacks.md`, which are decided.
6. **G**, after F. It proves the atomic merge on a throwaway public repository, and may change `close-task-on-merge.yml`, which F's `Closes #N` placement relies on.
7. **J**, after A, K, B, D, C, F and G2. It exercises all of them together, on a test stack.
8. **H**, after J. The process doc then records what passed, and the `CLAUDE.md` lines go in once the tools are in.
9. **I**, after H and G3. The log needs the "graph consulted" field and the written process before the two weeks start.

Parallel lanes: (A then K), (B), (D), (C) and (G1 to G4) can all run at once. F and G wait on K. J, H and I run one after another at the end.

## Decided

Every owner decision, one line each.

- `Closes #N` goes on the top layer and `Refs #N` on the layers below: `stacks.md`, Decisions, Decision 1.
- Stack branches are the one exception to the never-rebase and never-force-push rules; `gh stack` owns them and one session owns a whole stack: `stacks.md`, Decision 2.
- The full gate runs on the top layer over the whole stack's diff; the layers below run types, lint and format; a stack merges whole: `stacks.md`, Decision 3.
- dependency-cruiser is used with the `swc` parser, for the graph only: `verify.md`, Decisions, Decision 1.
- Plannotator runs from a private glibc prefix and a wrapper, with the host as the fallback: `verify.md`, Decision 2.
- The stack run was done on a public scratch repository: `verify.md`, Decision 3.
- The file reading of the container build is accepted, and Draft A rebuilds the image: `verify.md`, Decision 4.
- Graphify ends as the sidecar, MCP only, with the branch reworked: `graphify.md`, Decision.
- The trunk migration and a merge queue are overridden and are not in this plan.
- Import rules stay with Oxlint and `tests/guards/`; there is no dependency-cruiser gate rule.

## Still unproved

Each line names the task that proves it.

- That the private glibc prefix and wrapper run Plannotator in the real image, and that its page opens in the host browser: A, then J.
- That `swc` cruises the whole repository apart from the one excluded file: B.
- That the top layer's whole-stack filter selects the right jobs, and that a single-PR pull request is unchanged: C.
- That a guard against merging a lower layer alone is possible. A required check on `staging` could not be created with my token (HTTP 403, no repository Administration permission), so C builds the guard only if a scratch run shows it works, and says plainly if not: C.
- What a stack costs in runs and billable minutes on a private repository. The one timing call I made, on the public scratch repo, returned 0 billable ms: C records it once a private run exists, and I reports it again in the evaluation.
- That the `closed` event for each layer of an atomic `gh stack merge` carries base `staging`, so the task closes: G.
- That the agent consults the graph on at least 1 in 4 reviews, and that the MCP tools answer from this repository's graph: G3, then I.
- The sidecar's real size and memory: G4.
- Whether stacked review, tests-first and Plannotator each pay for themselves: I.

I need you to approve these drafts, or say which to change, before any is minted.
