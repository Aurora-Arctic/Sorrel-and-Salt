# PR comments

Every comment CI posts on a pull request comes from one renderer, `.github/scripts/lib/pr-comment.cjs`, through the `pr-comment` composite action or, for the audit, `.github/scripts/audit-comment.cjs`.

## The layout

Each comment has the same parts, in this order:

1. A hidden marker, `<!-- ci-<slug> -->`, which is how a job finds its comment again. A merge-queue run adds `-mergequeue` to the slug, so it keeps a thread of its own.
2. A heading: `### <mark> <Title> · <Status>`.
3. The summary line, then any details (a table or a list), then the log, collapsed under **Output**, cut to its last 100 lines.
4. A footer in small type: the short commit, the duration, any notes (the audit adds Non-Blocking), and a **View Run** link. The commit is the PR's head commit, not the merge commit the run checked out.

| Status  | Mark | Used for                                                  |
| ------- | ---- | --------------------------------------------------------- |
| Passed  | ✅   | The check succeeded.                                      |
| Failed  | ❌   | Any outcome but success; a skipped section shows Skipped. |
| Running | ⏳   | A section whose job has not written yet.                  |
| Skipped | ⏭️   | A section the path filter, or a failed gitflow, left out. |
| Warning | ⚠️   | A non-blocking finding on a step that passed (the audit). |

GitHub refuses a comment over 65,536 characters. Details over 40,000 characters, or 12,000 in a section, are replaced by a note pointing to the job summary, and a log keeps at most 20,000 characters, or 6,000 in a section. A log fence uses more backticks than the log holds, so the log cannot close it early.

## Single-result and sectioned comments

A **single-result** comment reports one check: each `checks.yml` leg, gitflow, the migrate and deploy steps, and the audit. `success-mode: minimize` resolves an earlier failure comment when the check passes and otherwise posts nothing; `comment` always posts. A merge-queue caller posts only failures.

A **sectioned** comment is shared by several jobs. There are two, each with a table of its sections and, below it, a block for each section that has details or a log. Each comment's last section (Coverage, or Coverage and Slowest Files) is a **final** section (`final: true` in the layout, `LAYOUTS` in `pr-comment.cjs`): it has no row in the table, its summary line heads its own block, and that block comes after every other section's, whichever job writes first. Until its job writes, it is the one line "<label> has not run yet." (or "<label> was skipped."), because with no row nothing else would show that it is still to come. Its status still counts toward the heading's.

Any section's write may also carry two things outside its own status, through the `pr-comment` action. A **heading note** (`heading-note`) is added to the comment's heading after the status, as `### ✅ Vitest · Passed · 2,800 tests`; a reset clears it, so the heading shows no note until a section writes one again. An **alert** (`alert`) is one plain line at the top of the section's block, shown with the log; it counts as Failed in the heading's status, whatever the section's own status. It is for a failure of the job writing the section that no section's status reports.

| Comment    | Marker                   | Sections and the job that writes each                                                                                                            |
| ---------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Vitest     | `<!-- ci-vitest -->`     | `dom`, `node`, `db`: the three part jobs in `vitest.yml`. The final `coverage` (Coverage and Slowest Files): the merge job.                      |
| Playwright | `<!-- ci-playwright -->` | `gate`: `playwright.yml` for the gate suite. `stories`: `playwright.yml` with `suite: stories`. The final `coverage`: `playwright-coverage.yml`. |

A Vitest part's Result is its own counts and duration (`summarize-vitest.mjs` with `VITEST_PART=true`), and its section lists its failing tests, collapsed above the log, and a file that failed outside its tests (an import error or a failing hook) is listed too. Vitest's JSON reporter drops errors thrown outside any test file, so a part that failed with no failed test says so in its Result and points to the log.

The merge job has no row. It writes the final Coverage and Slowest Files section in one step (`summarize-vitest.mjs` merged mode, `final_*` outputs), with the merged run's total test count as the heading note. The section has the merged coverage figure and threshold verdict (each metric below its threshold, read from the run's log, which is the only place Vitest reports one), the per-file table, then the slowest files. Its status is the coverage verdict alone, since the parts' rows report the tests: when a test failed it shows Skipped, "Not measured, because a test failed.", because Vitest writes no coverage report for a failing run. A failure of the merge job itself comes as the section's alert, so it fails the heading:

- A part left no blob, so the merged run did not run (the run step's `blobs-missing` output): "The merged run did not run, because a part left no results: see that part's row." There is no heading note.
- The merged run failed with no failed test and no missed threshold: "The merged run failed with no failed test and no missed threshold: see the log."
- The merged run found a failed test while every part job passed: "The merged run found N failed tests that no part's row shows: see the log.", with the failing tests listed above the coverage table.
- The summarise step itself failed: "The merged run could not be summarised, so see the merge job."

The Playwright gate section lists its failing tests, and the stories section its failing and flaky stories, each collapsed above the log: a story's `@story-N` tag, its spec file, its test title and the first line of its error, with a flaky story marked flaky, fifteen at most. Both are read from Playwright's JSON report (`PLAYWRIGHT_JSON_OUTPUT_NAME`) by `.github/scripts/lib/playwright-failures.mjs`. The failing-test block, the ANSI stripping of every failure message and the flaky note are `.github/scripts/lib/failure-list.mjs`, which the Vitest summariser uses too. The stories section keeps its story checklist below that list. Neither suite's section carries a coverage figure: the Coverage section holds the two suites' merged figure alone.

The heading's status is the worst of the sections: Failed, then Running, then Warning, then Passed; Skipped only when every section is.

pr-gate's `pr-comments` job (`.github/workflows/pr-comments.yml`) starts both comments for the run: every section shows Running, except those the path filter skipped, which show Skipped. A new commit's run therefore resets both comments. It needs `changes` and `gitflow` and nothing needs it, so it fails without skipping a required check; the suites need `gitflow` too, so it starts as early as they can. When gitflow fails, every section shows Skipped, because no suite runs. A job writes its section under `!cancelled()`, so a cancelled job leaves its section as it was.

The comments these replaced (`<!-- ci-stories -->` and `<!-- ci-playwright-coverage -->`) are left where they are on older pull requests.

## Concurrent writes

GitHub's comment API has no conditional update, so two jobs that read the comment, change it and write it back at the same moment lose one of the two changes. The design keeps each change small and checks it landed:

- **Each job writes only its own section.** The comment carries its state as hidden JSON (`<!-- ci-state … -->`): the run id, the attempt, and each section's status, summary and a random token for the write that set it. A job reads the comment, replaces its own section, and writes the whole comment back.
- **Then it checks.** It waits 3 seconds plus up to 2 seconds of random jitter, re-reads the comment, and looks for its own token. If another job's write replaced it, it writes again, up to five attempts. The jitter keeps two jobs that collided from colliding again.
- **A duplicate comment is removed.** Two jobs that both find no comment both create one. Each lists every comment (paginated: a busy pull request has more than one page), keeps the oldest marked one, and deletes a duplicate it created itself, then writes its section into the one kept.
- **An older run never overwrites a newer one.** A write from a run id lower than the comment's is dropped. A write from a higher run id starts the comment over for that run. A reset from a re-run (a later attempt of the same run) clears every section; a reset that arrives late in the same attempt keeps the sections already written.

A write can still be lost when another job's write lands after the verification re-read: GitHub gives no way to rule it out, so the section then shows its earlier value until the next run. A job whose section is still missing after five attempts logs a warning.

Two alternatives were rejected. One updater job that every suite hands its result to, serialised by a concurrency group, loses results: GitHub keeps only one pending job per group and cancels the rest, which shows as a cancelled check. Making the suites `need` the reset job would skip every required check whenever that job failed, and a skipped required check passes.

## A section left Running

A section stays Running when its job never starts, for example when `build-image` fails and every suite after it is skipped. The job summary and the checks list show what happened.
