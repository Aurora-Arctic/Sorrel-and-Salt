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

A **sectioned** comment is shared by several jobs. There are two, each with a table of its sections and, below it, a block for each section that has details or a log:

| Comment    | Marker                   | Sections and the job that writes each                                                                                                  |
| ---------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Vitest     | `<!-- ci-vitest -->`     | `dom`, `node`, `db`: the three part jobs in `vitest.yml`. `result`: the merge job, with the merged result and coverage.                |
| Playwright | `<!-- ci-playwright -->` | `gate`: `playwright.yml` for the gate suite. `stories`: `playwright.yml` with `suite: stories`. `coverage`: `playwright-coverage.yml`. |

A Vitest part's Result is its own counts and duration (`summarize-vitest.mjs` with `VITEST_PART=true`), and its section lists its failing tests, collapsed above the log, as the merged result's does; the coverage table and the slowest files are in the merged result's section alone. A file that failed outside its tests (an import error or a failing hook) is listed too. Vitest's JSON reporter drops errors thrown outside any test file, so a run that failed with no failed test says so in its Result and points to the log.

The Playwright gate section lists its failing tests, and the stories section its failing and flaky stories, each collapsed above the log: a story's `@story-N` tag, its spec file, its test title and the first line of its error, with a flaky story marked flaky, fifteen at most. Both are read from Playwright's JSON report (`PLAYWRIGHT_JSON_OUTPUT_NAME`) by `.github/scripts/lib/playwright-failures.mjs`. The stories section keeps its story checklist below that list.

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
