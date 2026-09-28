# Task tracking

The issues of `Aurora-Arctic/Sorrel-and-Salt`, with the org Project **Sorrel &
Salt** over them, are the live list of what to work on (MB.89).
[`TASKS.md`](TASKS.md) is the reasoning behind the breakdown and the two are
expected to agree: a task minted as an issue is added to `TASKS.md` in the same
pass. Everything reaches the board through `gh`, and the calls the skills make
are wrapped once in `scripts/task-board.mjs`, so the lookup rule and the
Project's field ids live in one file rather than four skills. The board moved
here from Asana; the argument for the move, and for accepting that a public
repo makes every issue and comment public, is the decision record for MB.89.
The rule that costs is under **Comments**.

## The board

| Object      | Value                                                                                                                                                                                                                                                                                                                                                                |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repo        | `Aurora-Arctic/Sorrel-and-Salt`                                                                                                                                                                                                                                                                                                                                      |
| Project     | Org project **Sorrel & Salt**, number `1`, linked to the repo. `task-board.mjs` carries the number as `PROJECT` and resolves the node id and field ids at runtime from `gh project`.                                                                                                                                                                                 |
| `Status`    | Single-select field: `Not Started` · `In Progress` · `In Review` · `Done`.                                                                                                                                                                                                                                                                                           |
| `Estimate`  | Number field, in hours — the `· Nh` on the task's `TASKS.md` heading.                                                                                                                                                                                                                                                                                                |
| Milestones  | One per wave (`Wave 07 — GraphQL`, two digits because GitHub sorts milestones alphabetically) and one per pre-wave feature grouping (`M0 · Repo bootstrap`), plus a closed `Retired — not done` milestone for the tasks MB.31 retired — every issue has a milestone. The description opens with the wave's task ids in execution order, then the deferral reasoning. |
| Issue types | `Bug` for `MB.*`, `Task` for everything else. The org has to have both types enabled; `gh issue create --type` fails otherwise.                                                                                                                                                                                                                                      |
| Labels      | `tracked` on every task — it is the Project's auto-add filter, and an issue without it is a visitor's until someone triages it. `hotfix` on a task that branches off `main`.                                                                                                                                                                                         |
| Sub-issues  | Only for a genuine parent/child (`M7.A.*` under `M7.A`, or a task split mid-flight). A wave is a milestone, never a parent issue.                                                                                                                                                                                                                                    |

## The title rule

An issue is titled `<Task ID> — <title>`, exactly as `TASKS.md` heads it, with
nothing before the id — no marker, no emoji. Status is a field, so a status
change never rewrites a title. A retired task reads `<ID> — [RETIRED] <title>`
and is closed as `not planned`; a done task is closed as `completed`.

`node scripts/task-board.mjs find M2.6` lists every tracked issue, open and
closed, and keeps the ones whose title starts with `M2.6 — `. The trailing
`—` is what makes the match exact: thirty of the board's ids are a strict
prefix of another (`M2.1` and `M2.10`, `M4.1` and `M4.1a`, `M0.1` and
`M0.30`), and GitHub's issue search tokenises on punctuation, so a `--search`
query cannot tell them apart. Zero matches or more than one is an error, never
a guess.

## Status

| Status        | Set it when                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------ |
| `Not Started` | The default; every task stays there until work actually begins.                                  |
| `In Progress` | The feature branch exists and work has started — not when the task is merely read or planned.    |
| `In Review`   | The PR is open. Set in the same turn the PR is created, beside the comment carrying the PR link. |
| `Done`        | The PR is **merged** — by mechanism, never by hand. A green CI run is not a merge.               |

`node scripts/task-board.mjs status <ID> "<Status>"` moves the field forward;
it refuses a backward step and refuses `Done` outright. `Done` is set through
the issue closing: a PR body opens with `Closes #N`, and on merge the issue is
closed, at which point the Project's built-in workflow moves the item to `Done`.

The closing is what
[`.github/workflows/close-task-on-merge.yml`](../.github/workflows/close-task-on-merge.yml)
exists for. GitHub's own closing keywords fire only on a PR into the default
branch, and feature PRs target `staging`, so on a merge into `staging` the
Action reads the closing keywords out of the PR body itself, checks each named
issue's state, and closes the open ones with a comment naming the PR. A PR into
`main` needs nothing: GitHub does it there. The PR body is passed to the script
as an environment variable rather than interpolated, because it is text anyone
can write.

A closed issue outranks its field: an issue closed as `completed` is done
whatever `Status` says, which is what makes a field left behind by a mistake
harmless. If a PR is closed without merging, the task goes back to
`In Progress` by hand — not `Done`, not `Not Started`.

## Comments

`node scripts/task-board.mjs comment <ID> "<text>"` posts to the issue. The
rule is **names, never values**: a comment may name an env var, a file or a
provider, and never carries a value, a token, a connection string, an address
or a dashboard URL — the repo is public and a comment is indexed before anyone
reads it. The script refuses text that trips one of its `SECRET_PATTERNS`
(connection strings, `vercel.com` and `console.neon.tech` URLs, the common
token prefixes, `Bearer` followed by a token, a long token-like run that is not
a git SHA, an email address) and names the pattern class rather than echoing
the match. `Bearer $ASANA_PAT` passes; the value would not.

A comment carried over from Asana opens with `[YYYY-MM-DD HH:MM UTC]`, and
that bracket is its true date. GitHub stamps a comment with the moment it is
posted and offers no override, so on anything older than the migration the
bracket is the date and the comment's own metadata is not.

Comment as work proceeds. The status field is the at-a-glance summary of those
comments, not a replacement for them.

## `scripts/task-board.mjs`

Node built-ins only, every call an `execFileSync('gh', [...])` with an
argument list — a title or a comment is text a shell string would interpret.
A `gh` failure prints gh's own stderr on one line, never a stack.

| Command                  | Does                                                                                                                                                           |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `find <ID>`              | The one tracked issue titled `<ID> — …`, as JSON: number, title, state, state reason, URL, milestone, labels, and the Project `Status` when the item is on it. |
| `status <ID> "<Status>"` | Adds the issue to the Project if absent and moves `Status` forward; a no-op when already there, a refusal for a step back or for `Done`.                       |
| `estimate <ID> <hours>`  | Sets `Estimate`, adding the item if absent.                                                                                                                    |
| `comment <ID> "<text>"`  | Posts the comment, after the secret scan.                                                                                                                      |
| `list`                   | Every tracked issue, open and closed, as a JSON array.                                                                                                         |

The Project's node id, its field ids and its option ids are read from
`gh project view` and `gh project field-list` on each run rather than
hardcoded: an option recreated in the Project's settings gets a new id, and a
stale constant would set nothing while reporting success. The migration script
imports the same helpers, which is why they are exported.

## Minting a task

Re-check the next free id right before minting — another session may have
taken it — then:

```sh
gh issue create --title "MB.90 — <title>" --type Bug --label tracked --milestone "Wave 07 — GraphQL" --body-file <notes>
node scripts/task-board.mjs estimate MB.90 3
```

The notes are the `TASKS.md` entry's text. The entry, the wave's row in the
execution-order table, the summary table and the milestone's description are
edited in the same pass; a task on the board and not in `TASKS.md` is a task
whose reasoning is nowhere.

## Migration

`scripts/migrate-asana-to-github.mjs` moved the board. It is one-off but every
step is idempotent and resumable: `apply` looks each object up before writing
it, and a run started again picks up where the last one stopped. It has to,
because of the write limits below. The subcommands run in this order, each
taking `--file <path>` for the export JSON (default `/tmp/asana-export.json`;
the scratchpad is where it belongs, since it holds every note and comment the
board ever had):

1. **`export`** — reads the Asana project through its REST API with
   `ASANA_PAT`: the project's tasks, each task's subtasks recursively, and each
   task's stories, keeping the `comment` ones. One JSON tree.
2. **`plan`** — reads the export and `TASKS.md` and prints what `apply` would
   do: counts, the milestone table, unplaced ids, ids whose notes mention a
   hotfix without the name saying so, ids on the board with no `TASKS.md`
   heading. A name that starts with a task id and `—` (or the older `-`,
   normalised) is an issue; any other card is a milestone. An issue's milestone
   is its parent card's name, or failing a parent the wave whose row in
   `TASKS.md`'s execution-order table names it, or none — reported, never
   guessed. Status comes from the Asana marker (`▶ ` → `In Progress`, `◔ ` →
   `In Review`, completed → `Done`), the estimate from the `TASKS.md` heading,
   the type from the id, the `hotfix` label from the name. An id-bearing card
   under an id-bearing card becomes a sub-issue.
3. **`scan`** — every body, comment and milestone description through
   `findSecret`; a hit prints the task id, the pattern class and a 120-character
   snippet and the run exits 1. `apply` runs it first and stops on a hit;
   `--skip-scan` is for text the owner has read and accepted.
4. **`apply --project <number>`** — labels (`tracked`, `hotfix`; `gh issue
create --label` fails on a missing one), milestones (created open, and
   closed only in the final step, because `--milestone <name>` on create may
   not resolve a closed one), issues in `TASKS.md` heading order then the rest,
   close state, comments in `created_at` order (an identical trimmed body is
   skipped), Project item with `Status` and `Estimate`, sub-issue links, then
   the milestone closes. One progress line per object and a summary.
5. **`verify --project <number>`** — export counts against GitHub: issues,
   closed issues, comments, milestones, Project items. Exit 1 on a mismatch.

**Rate limits.** Asana's free plan allows 150 requests a minute, so `export`
spaces requests about 450 ms apart and honours a `429`'s `Retry-After`.
GitHub's secondary limit for content creation is about 80 writes a minute and
500 an hour, so `apply` spaces writes 1.5 s apart, retries once after a
`403`/`429` (waiting `retry-after` or 60 s), and a full run of several hundred
issues plus their comments spans several invocations — which is why every step
is idempotent rather than merely careful.

**Prerequisites.** `gh` authenticated with a fine-grained PAT carrying the
org's Projects permission and the repo's Issues, Contents, Pull requests and
Workflows permissions; `ASANA_PAT` in the environment for `export` only; the
org's issue types `Bug` and `Task` enabled; the Project existing with its two
fields, since the script resolves them and creates neither.

**The Asana project is renamed archived, not deleted.** Older PR bodies carry
an `Asana task:` permalink, and every migrated issue body ends with `Asana:
<permalink>`; both keep resolving only while the workspace exists. Nothing is
written there again.

### What the free Asana plan cost, restored

| On Asana's free plan                                                                | On GitHub                                                                                                   |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Status lived in the task name as a marker (`▶ `, `◔ `), custom fields being premium | `Status` is a Project single-select; a title is never rewritten for a status change.                        |
| The estimate lived only in `TASKS.md`                                               | `Estimate` is a Project number field, summable in a view.                                                   |
| Type lived nowhere after the rebuild                                                | Issue type `Bug` or `Task`.                                                                                 |
| Dependencies were premium                                                           | `gh issue edit --add-blocked-by` is free.                                                                   |
| Rules were premium; every status change was a hand edit                             | The Action closes the issue on merge and the Project's built-in workflows add by label and set `Done`.      |
| Lookup was two API calls per id, over wave cards and their subtasks, with no search | One `gh issue list` and a title-prefix match; the exact-segment rule stays, since search still tokenises.   |
| Writes went through an MCP server that had to be authorised and exposed no tag tool | `gh`, already authenticated in the devcontainer, covers issues, milestones, types, sub-issues and Projects. |
