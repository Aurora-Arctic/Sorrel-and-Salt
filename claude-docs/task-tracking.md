# Task tracking

The issues of `Aurora-Arctic/Sorrel-and-Salt`, with the org Project **Sorrel &
Salt** over them, are the live list of what to work on (MB.89).
[`TASKS.md`](TASKS.md) is the reasoning behind the breakdown and the two are
expected to agree: a task minted as an issue gets its entry in
`tasks/<milestone>.md` in the same pass. Everything reaches the board through
`gh`, and the calls the skills make are wrapped once in
`scripts/task-board.mjs`, so the lookup rule and the Project's field ids live
in one file rather than four skills. The board moved
here from Asana; the argument for the move, and for accepting that a public
repo makes every issue and comment public, is the decision record for MB.89.
The rule that costs is under **Comments**.

## The board

| Object      | Value                                                                                                                                                                                                                                                                                                                                                                |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repo        | `Aurora-Arctic/Sorrel-and-Salt`                                                                                                                                                                                                                                                                                                                                      |
| Project     | Org project **Sorrel & Salt**, number `1`, linked to the repo. `task-board.mjs` carries the number as `PROJECT` and reads the node id and field ids at runtime, off the issue's own Project item.                                                                                                                                                                    |
| `Status`    | Single-select field: `Not Started` · `In Progress` · `In Review` · `Done`.                                                                                                                                                                                                                                                                                           |
| `Estimate`  | Number field, in hours — the `· Nh` on the task's heading in `tasks/<milestone>.md`.                                                                                                                                                                                                                                                                                 |
| Milestones  | One per wave (`Wave 07 — GraphQL`, two digits because GitHub sorts milestones alphabetically) and one per pre-wave feature grouping (`M0 · Repo bootstrap`), plus a closed `Retired — not done` milestone for the tasks MB.31 retired — every issue has a milestone. The description opens with the wave's task ids in execution order, then the deferral reasoning. |
| Issue types | `Bug` for `MB.*`, `Task` for everything else. The org has to have both types enabled; `gh issue create --type` fails otherwise.                                                                                                                                                                                                                                      |
| Labels      | `tracked` on every task — it is the Project's auto-add filter, and an issue without it is a visitor's until someone triages it. `hotfix` on a task that branches off `main`.                                                                                                                                                                                         |
| Sub-issues  | Only for a genuine parent/child (`M7.A.*` under `M7.A`, or a task split mid-flight). A wave is a milestone, never a parent issue.                                                                                                                                                                                                                                    |

## The title rule

An issue is titled `<Task ID> — <title>`, exactly as its `tasks/` entry heads it, with
nothing before the id — no marker, no emoji. Status is a field, so a status
change never rewrites a title. A retired task reads `<ID> — [RETIRED] <title>`
and is closed as `not planned`; a done task is closed as `completed`.

`node scripts/task-board.mjs find M2.6` lists every tracked issue, open and
closed, through the REST issues endpoint, and keeps the ones whose title
starts with `M2.6 — `. The trailing
`—` is what makes the match exact: thirty of the board's ids are a strict
prefix of another (`M2.1` and `M2.10`, `M4.1` and `M4.1a`, `M0.1` and
`M0.30`), and GitHub's issue search tokenises on punctuation, so a `--search`
query cannot tell them apart. Zero matches or more than one is an error, never
a guess.

## Status

| Status        | Set it when                                                                                                                                                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Not Started` | The Project's **Item added to project** workflow sets it the moment the auto-add places the issue — seconds after `gh issue create --label tracked`. Never set by hand: `find` printing `status: null` means the auto-add has not run yet. |
| `In Progress` | The feature branch exists and work has started — not when the task is merely read or planned. The script's.                                                                                                                                |
| `In Review`   | The PR is open. Set in the same turn the PR is created, beside the comment carrying the PR link. The script's.                                                                                                                             |
| `Done`        | The PR is **merged** — by mechanism, never by hand. A green CI run is not a merge.                                                                                                                                                         |

`node scripts/task-board.mjs status <ID> "<Status>"` moves the field forward;
it refuses a backward step and refuses `Done` outright. `Done` is set through
the issue closing: a PR body opens with `Closes #N`, and on merge the issue is
closed, at which point the Project's built-in workflow moves the item to `Done`.

**The Project's workflows own the ends and the script owns the middle.** Eight
built-in workflows are on. _Auto-add to project_ (filtered on the `tracked`
label) and _Auto-add sub-issues to project_ place every task, so the script
never adds an item: `status` and `estimate` on an issue the auto-add has not
placed yet refuse and say to retry, and an item the script added would be one
the triage filter never saw. _Item added to project_ sets `Not Started`.
_Item closed_ sets `Done`, and _Auto-close issue_ closes an issue whose Status
is set to `Done` by hand — the one direction the script refuses anyway.
_Item reopened_ acts on a closed issue that is reopened, which no skill does.
_Pull request linked to issue_ and _Pull request merged_ are on but cannot act
on a task: GitHub links a `Closes #N` only on a pull request into the default
branch, so a feature PR into `staging` links nothing — #294 and #295, both
merged there, carry no linked PR — and pull requests are not on the Project.
`In Progress` and `In Review` are therefore the script's, and stay so (MB.102).

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

## Order

The Project's manual item order is execution order: the wave table in
[`TASKS.md`](TASKS.md)'s Execution order section, wave by wave, each wave's
row in its order. The row names the ids and links the wave's reasoning,
[`waves/wave-NN.md`](waves/); a range in it (`M3.3 → M3.10`) is the headings
between its ends across `TASKS.md` and the milestone files in [`tasks/`](tasks/),
read in the order `scripts/tasks-md.mjs`'s `TASKS_FILES` declares.
`node scripts/task-board.mjs reorder` is what keeps the board so.
Without an argument it is a dry run: it prints every way the rows and the
board disagree, then the moves, and writes nothing. `--apply` makes the
moves one at a time and ends by reading the order again and printing the
recomputed plan — `0 moves needed` is the success line. `--limit N` caps a
run at its first N moves, which is how a run on a board is probed before the
rest of it.

**A wave with no open task is left where it sits**, whatever its milestone's
state: the M0 and M1 groupings, Waves 01 to 07 and the retired ids are done,
and a board nobody reads that way is not worth the writes. The count is read
live, so an issue minted open into a done wave makes that wave an open one
until it is closed — mint such an issue, close it, and only then run
`reorder`. Of the waves still open, the first item in target order is the
anchor and never moves; behind it the longest run already in order stays, and
each other item is moved after its predecessor in target order. Processing in
that order makes a predecessor final before its follower is placed, and no
move is ever "to the top", so nothing climbs above the done waves. An issue
on a wave's milestone that the row does not name is appended to the wave in
heading order and reported; a row id with no issue, or whose issue sits on
another milestone, is reported; a milestone description whose first line
differs from the row is reported. Every report line is a doc fix or a board
fix, under the rule minting already follows: the row, the milestone
description and the board agree.

**Every run is cheap by design — the MB.102 rule, applied to the one listing
there is.** The reads are the REST issue list `find` already makes, one
milestones page, and one GraphQL listing of the Project's items that asks each
for its id and its issue number and nests no connection, which the cost
formula prices at a page's minimum — four pages for this board. There is no
per-item position read, so a listing is the only way to observe order; the one
that tripped the secondary limit, `gh project item-list`, asked every item for
every field value. The writes are `updateProjectV2ItemPosition`, one a
request with the ids as variables and only the mutation id selected, 1.5 s
apart, retried once after a rate-limit refusal and then stopped: a run that
stops is simply re-run, since the plan is recomputed from the live order.
Batching the mutations under aliases would cut the requests further and was
not needed at the board's size, and an `Order` field sorted by the view would
have been a write per item rather than per move, and the end of dragging an
item where it belongs.

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

| Command                         | Does                                                                                                                                                              |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `find <ID>`                     | The one tracked issue titled `<ID> — …`, as JSON: number, title, state, state reason, URL, milestone, labels, and the Project `Status` when the item is on it.    |
| `status <ID> "<Status>"`        | Moves `Status` forward; a no-op when already there, a refusal for a step back, for `Done`, or for an issue the auto-add has not placed on the Project yet.        |
| `estimate <ID> <hours>`         | Sets `Estimate`; the same refusal for an issue not yet on the Project.                                                                                            |
| `comment <ID> "<text>"`         | Posts the comment, after the secret scan.                                                                                                                         |
| `list`                          | Every tracked issue, open and closed, as a JSON array.                                                                                                            |
| `reorder [--apply] [--limit N]` | The moves that put the open waves' items in execution order, as a dry run; `--apply` makes them and prints the recomputed plan; `--limit` caps a run (**Order**). |

The Project's node id, its field ids and its option ids are read on each run
rather than hardcoded — an option recreated in the Project's settings gets a
new id, and a stale constant would set nothing while reporting success — and
they are read off the issue's own item, through one `issue.projectItems`
query, never by listing every item on the Project. The migration script
imports the same helpers, which is why they are exported, and both read
the breakdown through `scripts/tasks-md.mjs`, the one parser of its headings
and its wave table and the one place its files are named in reading order.

**Every command is cheap by design (MB.102).** The issue list is REST —
`gh api --paginate --slurp`, one request per hundred issues against the core
budget, pull requests filtered out since the endpoint lists them among issues
— and the Project read costs one GraphQL point. `find` and `comment` make
one small query at most; `status` and `estimate` make that query and one
mutation; `reorder` makes the three reads under **Order** and one mutation
per move. The previous shape — `gh issue list`, a GraphQL query carrying every
issue's labels, then `gh project item-list` over every item to find one —
was a burst that tripped GitHub's _secondary_ rate limit twice in one sitting
with the hourly budget almost untouched. The refusal reads
`GraphQL: API rate limit exceeded`; when it shows up, the cause is a burst,
not the budget, and the fix is fewer calls per command rather than waiting an
hour.

## Minting a task

Re-check the next free id right before minting — another session may have
taken it — then:

```sh
gh issue create --title "MB.90 — <title>" --type Bug --label tracked --milestone "Wave 07 — GraphQL" --body-file <notes>
node scripts/task-board.mjs estimate MB.90 3
node scripts/task-board.mjs reorder --apply
```

The notes are the entry's text in `tasks/<milestone>.md`. The entry, the wave's
row in `TASKS.md`'s execution-order table, its `waves/wave-NN.md` where the
reasoning changes, `tasks/mb.md`'s summary table and the milestone's
description are edited in the same pass; a task on the board and not in
`tasks/` is a task whose reasoning is nowhere. The auto-add appends the new
item at the bottom of the Project, and `reorder --apply` moves it to the row's
place (**Order**), so the row is edited before it runs. `--milestone <name>` on create does not
resolve a closed milestone; an issue minted into one for the record takes it
afterwards, by number, through `gh api -X PATCH repos/…/issues/<n> -F milestone=<m>`,
and is closed before `reorder` runs.

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
2. **`plan`** — reads the export and the breakdown and prints what `apply` would
   do: counts, the milestone table, unplaced ids, ids whose notes mention a
   hotfix without the name saying so, ids on the board with no task
   heading. A name that starts with a task id and `—` (or the older `-`,
   normalised) is an issue; any other card is a milestone. An issue's milestone
   is its parent card's name, or failing a parent the wave whose row in
   `TASKS.md`'s execution-order table names it, or none — reported, never
   guessed. Status comes from the Asana marker (`▶ ` → `In Progress`, `◔ ` →
   `In Review`, completed → `Done`), the estimate from the task's heading,
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
`403`/`429` (waiting `retry-after` or, since the hourly cap sends none and a minute never
clears it, 300 s — `task-board.mjs`'s `pacedWrite`, which `reorder` shares), and a full run of several hundred
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

| On Asana's free plan                                                                | On GitHub                                                                                                                    |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Status lived in the task name as a marker (`▶ `, `◔ `), custom fields being premium | `Status` is a Project single-select; a title is never rewritten for a status change.                                         |
| The estimate lived only in `TASKS.md`                                               | `Estimate` is a Project number field, summable in a view.                                                                    |
| Type lived nowhere after the rebuild                                                | Issue type `Bug` or `Task`.                                                                                                  |
| Dependencies were premium                                                           | `gh issue edit --add-blocked-by` is free.                                                                                    |
| Rules were premium; every status change was a hand edit                             | The Action closes the issue on merge and the Project's built-in workflows add by label and set `Done`.                       |
| Lookup was two API calls per id, over wave cards and their subtasks, with no search | One REST listing of the tracked issues and a title-prefix match; the exact-segment rule stays, since search still tokenises. |
| Writes went through an MCP server that had to be authorised and exposed no tag tool | `gh`, already authenticated in the devcontainer, covers issues, milestones, types, sub-issues and Projects.                  |
