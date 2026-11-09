# Task tracking

The issues of `Aurora-Arctic/Sorrel-and-Salt`, with the org Projects **Sorrel &
Salt** and **Sorrel & Salt V1.Next** over them, are the live list of what to work on (MB.89), and
[`TASKS.md`](TASKS.md) is the reasoning behind them. This page is the board's
shape and its mechanics. The rules for working it are
[`.claude/rules/task-tracking.md`](../.claude/rules/task-tracking.md)'s, the
long form of `CLAUDE.md`'s GitHub task tracking section, and are not restated
here. Everything reaches the board through `gh`, and the calls the skills
make are wrapped once in
`scripts/task-board.mjs`, so the lookup rule and the Project's field ids live
in one file rather than four skills. The repo is public, so every issue and
comment is public too; the rule that costs is under **Comments**.

## The board

| Object      | Value                                                                                                                                                                                                                                                                                                                                                     |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repo        | `Aurora-Arctic/Sorrel-and-Salt`                                                                                                                                                                                                                                                                                                                           |
| Projects    | Two org projects, linked to the repo: **Sorrel & Salt** (number `1`, ids `M…`, `MB.…`, `MW.…`) and **Sorrel & Salt V1.Next** (number `4`, ids `N…`). `scripts/task-projects.mjs` is the one place a Project number is written (**Projects**, below); the scripts read each Project's node id and field ids at runtime, off the issue's own Project item.  |
| `Status`    | Single-select field: `Not Started` · `In Progress` · `In Review` · `Done`.                                                                                                                                                                                                                                                                                |
| `Estimate`  | Number field, in hours — the `· Nh` on the task's heading in `tasks/<milestone>.md`.                                                                                                                                                                                                                                                                      |
| Milestones  | One per wave (`Wave 07 — GraphQL`, `N · Wave 01 — Privacy`) and per pre-wave grouping, plus a closed `Retired — not done`, so every issue has one. A wave's description is its id list on the first line, then a link to its [`waves/<slug>/wave-NN.md`](waves/) on `staging`, the one home of its reasoning; `reorder` reads the first line (**Order**). |
| Issue types | `Bug` for a task that fixes a bug, a failure that reached a PR, staging or production; `Task` for everything else, whatever its id. The org has to have both types enabled; `gh issue create --type` fails otherwise.                                                                                                                                     |
| Labels      | `tracked` on every task, Project 1's auto-add filter; `v1-next` on every Sorrel & Salt V1.Next task, which that filter excludes; `hotfix` on a task that branches off `main`.                                                                                                                                                                             |
| Sub-issues  | Only for a genuine parent/child; a wave is a milestone, never a parent issue.                                                                                                                                                                                                                                                                             |

The rules for naming, labelling and keeping each object are in `.claude/rules/task-tracking.md`, under "Board layout".

## Projects

`scripts/task-projects.mjs` lists the Projects, and nothing else names a Project number. Each entry carries:

| Field             | Meaning                                                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `number`, `title` | The org Project.                                                                                                                                  |
| `slug`            | The directory under `claude-docs/tasks/` and `claude-docs/waves/` holding its entries and wave files: `v1`, `v1-next`.                            |
| `prefix`          | The letter its task ids start with: `M` (with `MB` and `MW`), `N`. The tally and the branch patterns route an id by it.                           |
| `milestonePrefix` | What starts each of its milestone titles: nothing for Project 1, `N · ` for Project 4. A milestone belongs to the Project whose prefix starts it. |
| `bugfixes`        | Its bug milestone: `Z. Bugfixes`, `N · Z. Bugfixes`.                                                                                              |
| `default`         | The one Project a milestone, wave row or id belongs to when no other prefix matches.                                                              |
| `label`           | The label its issues carry, so another Project's auto-add filter can exclude them.                                                                |
| `autoAdd`         | Whether the Project's own auto-add workflow places an issue; when false, `place` adds it.                                                         |

A command finds its Project from the issue: `find`, `status`, `estimate`, `comment` and `sync` read the issue's own Project item; `move`, `milestone` and `place` take the Project of the issue's milestone; `reorder` runs once per Project, each over its own wave rows (a row `**N · 01 — …**` is Project 4's) and its own item order, or over one with `--project N`. An issue on two Projects is refused until `place <ID> --apply` leaves it on its milestone's alone.

**Adding a Project.** Create it in the org and link it to the repo; add an entry with a new `number`, `slug`, `prefix` letter, `milestonePrefix`, `bugfixes` and `label`; create the label and the bug milestone; make the auto-add filter of every Project with `autoAdd: true` exclude the new label; and create `claude-docs/tasks/<slug>/` and `claude-docs/waves/<slug>/`. Its wave rows go in their own table in `TASKS.md`, labelled `**<prefix> · NN — <name>**`.

## The title rule

An issue is titled `<Task ID> — <title>`, nothing before the id. The rule, with
its retired and done variants, is
[`.claude/rules/task-tracking.md`](../.claude/rules/task-tracking.md)'s "Board
layout"; what it buys is an exact lookup.

`node scripts/task-board.mjs find M2.6` lists every tracked issue, open and
closed, through the REST issues endpoint, and keeps the ones whose title
starts with `M2.6 — `. The trailing
`—` is what makes the match exact: thirty of the board's ids are a strict
prefix of another (`M2.1` and `M2.10`, `M4.1` and `M4.1a`, `M0.1` and
`M0.30`), and GitHub's issue search tokenises on punctuation, so a `--search`
query cannot tell them apart. Zero matches or more than one is an error, never
a guess.

## Status

When each status is set is
[`.claude/rules/task-tracking.md`](../.claude/rules/task-tracking.md)'s
"Status"; this section is the machinery that sets it.

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
issue's state, and closes the open ones with a comment naming the PR. A
keyword counts only when it is the whole line, `Closes #N` and nothing else, so
a sentence naming an issue ("this PR does not close #N") closes nothing. A PR into
`main` needs nothing: GitHub does it there. The PR body is passed to the script
as an environment variable rather than interpolated, because it is text anyone
can write.

A closed issue outranks its field: an issue closed as `completed` is done
whatever `Status` says, which is what makes a field left behind by a mistake
harmless.

## Order

The Project's manual item order follows the wave table in
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

**A milestone with no wave row is placed by hand, one task at a time.**
`reorder` orders only the milestones the wave table names, so a task on
`Z. Bugfixes`, `Z. Deferred` or `Z. Outside the Website` is placed with
`node scripts/task-board.mjs move <ID> --after <ID>` or `--last`. It makes
the same `updateProjectV2ItemPosition` mutation, once, with no dry run, and
places a task only among its own milestone's items.

## Comments

`node scripts/task-board.mjs comment <ID> "<text>"` posts to the issue, under
the rule a public repo costs: **names, never values**, which `CLAUDE.md` and
[`.claude/rules/task-tracking.md`](../.claude/rules/task-tracking.md)'s "PR
bodies and comments" state. The script enforces what a
pattern can catch: it refuses text that trips one of its `SECRET_PATTERNS`
(connection strings, `vercel.com` and `console.neon.tech` URLs, the common
token prefixes, `Bearer` followed by a token, a long token-like run that is not
a git SHA, an email address) and names the pattern class rather than echoing
the match. `Bearer $TOKEN` passes; the value would not.

A comment that records an earlier event opens with `[YYYY-MM-DD HH:MM UTC]`, and
that bracket is its true date. GitHub stamps a comment with the moment it is
posted and offers no override, so for such a comment the bracket is the date
and the comment's own metadata is not.

## `scripts/task-board.mjs`

Node built-ins only, every call an `execFileSync('gh', [...])` with an
argument list — a title or a comment is text a shell string would interpret.
A `gh` failure prints gh's own stderr on one line, never a stack.

| Command                                        | Does                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `find <ID>`                                    | The one tracked issue titled `<ID> — …`, as JSON: number, title, state, state reason, URL, milestone, labels, and the Project `Status` when the item is on it.                                                                                                                                                    |
| `status <ID> "<Status>"`                       | Moves `Status` forward; a no-op when already there, a refusal for a step back, for `Done`, or for an issue the auto-add has not placed on the Project yet.                                                                                                                                                        |
| `estimate <ID> <hours>`                        | Sets `Estimate`; the same refusal for an issue not yet on the Project.                                                                                                                                                                                                                                            |
| `comment <ID> "<text>"`                        | Posts the comment, after the secret scan.                                                                                                                                                                                                                                                                         |
| `sync <ID> [<ID> …]`                           | Brings each issue's title, body and `Estimate` to its entry (**Sync**), editing only what differs; refused for an entry that looks like it carries a value.                                                                                                                                                       |
| `list`                                         | Every tracked issue, open and closed, as a JSON array.                                                                                                                                                                                                                                                            |
| `reorder [--project N] [--apply] [--limit N]`  | The moves that put each Project's open waves in execution order, as a dry run, one Project after another; `--project` picks one; `--apply` makes them and prints the recomputed plan; `--limit` caps a run (**Order**).                                                                                           |
| `move <ID> --after <ID>` or `move <ID> --last` | Places the task directly after the named task, which must share its milestone, or with `--last` places it after the last item, open or closed, on its own milestone. One move, a no-op when it already sits there (**Order**).                                                                                    |
| `milestone <ID> "<title>"`                     | Moves the issue to the open milestone titled exactly so, such as `Z. Bugfixes`; a refusal when no open milestone, or several, carry the title. When the new milestone is on another Project, it then moves the issue there as `place` does.                                                                       |
| `retire <ID>`                                  | Closes the issue as not planned on the closed `Retired — not done` milestone, in one edit; a refusal for an issue closed as completed. The `[RETIRED]` heading stays a hand edit, synced to the issue with `sync` before `retire` closes it, since `sync` never runs on a closed id.                              |
| `place <ID> [<ID> …]` or `place --all`         | Lists each issue that is not on its milestone's Project alone, with the Status and Estimate it would carry; `--apply` labels it, adds it to that Project, sets the same Status and Estimate, reads them back, and only then removes it from the other. A run that stops part-way is finished by running it again. |
| `renumber <OLD> <NEW> [<OLD> <NEW> …]`         | Retitles each open issue from its old id to the new one, whose entry must already be headed by it, then syncs it; refused for a closed issue, which keeps its id.                                                                                                                                                 |

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
per move; `move` makes the issue list, the item listing and one mutation;
`milestone` and `retire` make the issue list, one milestones page and one
REST edit of the issue. The previous shape — `gh issue list`, a GraphQL query carrying every
issue's labels, then `gh project item-list` over every item to find one —
was a burst that tripped GitHub's _secondary_ rate limit twice in one sitting
with the hourly budget almost untouched. The refusal reads
`GraphQL: API rate limit exceeded`; when it shows up, the cause is a burst,
not the budget, and the fix is fewer calls per command rather than waiting an
hour.

## Sync

A closed task's entry is its heading line only; its body is in `claude-docs/archive/tasks-closed-waves.tar.gz`. Never run `task-board.mjs sync` on a closed id: it would blank the issue body.

**An issue mirrors its entry, and stays mirrored.** Its title is the entry's
heading, `<ID> — <title>`, a retired one's struck-through title written
`<ID> — [RETIRED] <title>` as the title rule has it; its body is the entry's text, from the line after
the heading to the next task or section heading; its `Estimate` is the
heading's hours. Minting writes all three, and an entry corrected afterwards —
a task re-scoped by the one before it, an estimate revised, a criterion
settled while building — is synced in the same pass, in the turn the entry is
edited, not when its PR merges:

```sh
node scripts/task-board.mjs sync MB.128 MB.129
```

`sync` reads the entries from `scripts/tasks-md.mjs`'s files on disk, so it
publishes the branch's text: an issue says what the task is now, and the
merge only makes the breakdown say it too. It edits only what differs, so a
re-run is a no-op. A relative link in an entry resolves against
`claude-docs/tasks/`, and an issue page resolves it against nothing, so the
body points it at the doc on `staging`, as a milestone description's link
does; a link to a doc the PR adds works once it merges. A retired entry
carries no hours, so its `Estimate` is left alone. The body passes the
comment scan first: an issue is as public as a comment.

Issues minted before MB.127 hold the entry as it was then. They are synced
when their entries are next edited, not swept: an unread issue being stale
costs nothing, and a sweep of every issue is the burst MB.102 removed.

## Minting a task

Minting is `gh issue create`, then `estimate`, then `reorder --apply`
(on a Project with no auto-add, `place <ID> --apply` before `estimate`), with
the docs edited in the same pass and the new id added to the first line of
its milestone's description; the commands and the list of edits are
[`.claude/rules/task-tracking.md`](../.claude/rules/task-tracking.md)'s
"Minting a task". A task on the board and not in `tasks/` is a task
whose reasoning is nowhere. The auto-add (or `place`) appends the new item at the bottom of
its Project and `reorder --apply` moves it to its row's place (**Order**),
which is why the row is edited first. `--milestone <name>` on create does not
resolve a closed milestone; an issue minted into one for the record takes it
afterwards, by number, through `gh api -X PATCH repos/…/issues/<n> -F milestone=<m>`,
and is closed before `reorder` runs.

## Progress tally

`.claude/skills/project-progress/tally.mjs` counts a task as done from git, with no board calls, and reports each Project apart: `--project N` or `--task <ID>` picks one, and with neither it prints every Project. A task counts toward the Project whose directory holds its entry at the ref, or, for an id with no entry there, the Project its prefix letter names. A merge commit names a task in three places, and an id mentioned mid-sentence counts in none:

- **The branch** in `Merge pull request #N from org/feature/<id>-…`.
- **The id-first form** at the start of the subject, or of the first line of the commit's body, which is where GitHub writes the PR's title: `M15.32/M15.33/M15.49 — Support revision`.
- **A single trailing id** in the subject, `(MB.13)`, when it has a heading in the breakdown.

GitHub never writes a PR body into git, so a PR that finishes several tasks names them in its title, which `create-pr` writes id-first. This is a convention, not a CI check. `scripts/task-ids.mjs` holds the forms the tally reads.

The tally's hand-kept list of ids stays for work done outside git: dashboard or console work, or a merge made before the title rule.

### scripts/task-board.mjs

task-board REST read: one request per hundred against the core budget; the GraphQL listing carried every issue's labels and two lookups a minute tripped the secondary rate limit. tasks-md range is not a numeric span.
