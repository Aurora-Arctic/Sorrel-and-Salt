## Acceptance — `npm run test:stories` (M9.1)

A user story is proved by a browser flow a user could walk, never by a service
call or a GraphQL response (M9.1; `design-decisions/m9.1-stories-are-browser-flows.md`).
The story suite lives in `tests/e2e/stories/`, and `npm run test:stories`
(`make test-stories`) runs it with `playwright.stories.config.ts` and prints a
checklist of the v1 user stories, one line each:

```
[x] Story 1: Sign in with an account I already have, so I don't manage another password.
[ ] Story 2: As a newly signed-in user, be told plainly what I can do next, … — FAILING
[ ] Story 3: Create a workspace once I hold creation rights, … — FLAKY (failed, then passed on retry)
[-] Story 12: View my stock … — skipped
[ ] Story 28: … — no test yet

1 of 55 stories passing · 2 failing · 1 skipped · 51 without a test
```

That is DESIGN.md §11's "live progress report against §10 rather than a
coverage percentage": a count of stories, never a percentage of lines. These
decisions make it hold:

- **A story is named by a tag, nothing else.** A test walks a story with
  Playwright's own option, `test('…', { tag: '@story-6' }, …)`, or an array of
  tags when one flow proves several. The title and the file name carry no
  meaning to the checklist. `tests/e2e/stories/README.md` has the file table.
- **The story list is read out of DESIGN.md §10, not copied.**
  `tests/support/stories.ts` parses the numbered list between
  "## 10. User stories" and the next section (55 today, 1–34, 47–64, 77, 80 and 81), so a
  story added to §10 joins the checklist without a harness edit. The harness
  has no tests of its own (MB.224): a broken checklist is seen by whoever runs
  it.
- **Each story has a section: the part of the site it walks.**
  `tests/support/story-sections.ts` maps a story number to a name such as
  `Coven - Spells - Ingredients`, and the checklist (terminal and CI) groups the
  stories under those names, in name order. The map is separate from §10 so the
  spec stays plain prose. Nothing checks the map since M14.27 deleted its
  guard: a story in §10 with no section is listed under "Other", so a new
  story still wants a line there.
- **A story's status is the state of every test tagged with it.** Any failure
  is _failing_; otherwise any skip is _skipped_; otherwise _passing_. An
  interrupted test reads as failing, so it can never look green.
- **A flaky story is not a passing story.** Retries stay on in CI (one) so the
  run completes, but a test that passed only on its retry counts as failed: its
  box stays unticked, the tally counts it among the failing, and its line ends
  ` — FLAKY (failed, then passed on retry)`, or in the PR comment
  ` — **flaky** (failed, then passed on retry)`. A flake is a bug to fix, not
  to tolerate.
- **A test with no tag fails the run.** A test under `stories/` without an
  `@story-N` tag is listed under "No story tag" and the reporter makes the
  run fail. This replaces review of `describe` names. A tag naming a number
  §10 does not list is set aside under "Not a v1 story" and not counted.
- **A scaffold is a `test.fixme`.** A story whose page does not exist yet is
  written as `test.fixme('…', { tag: '@story-20', annotation: { type: 'fixme', description: 'M9.6 builds /coven/[slug]/ingredients' } }, async ({ page }) => { … })`.
  The body typechecks (it uses role and label locators) and never runs; the
  checklist reads it as _skipped_ and the annotation names the task that builds
  the page. That task unskips its story in its own PR: `fixme` becomes `test`
  and the annotation goes. The scaffold lands red-free on purpose, because a
  skip is not a failure.
- **Setup follows the gate specs.** `signInAs` for users, the raw `postgres`
  client for covens and rows (MB.101), the Mailpit inbox for mail. The UI is
  used for the step the story is about. A refusal is proved by the control
  being absent and by the direct URL or action being refused, since "no rows"
  alone proves nothing.

## The reporter

`tests/support/story-playwright-reporter.ts` is a Playwright reporter named in
`playwright.stories.config.ts` by path. It collects each test in `onTestEnd`
and decides in `onEnd` from `test.outcome()` (`expected`, `unexpected`,
`flaky` or `skipped`), folds the states per tag with
`tests/support/story-checklist.ts`, prints the checklist, and returns
`{ status: 'failed' }` when a test has no tag. With `STORIES_JSON=<path>` it
also writes the checklist as JSON, which is how CI gets it. The config shares
the gate config's `baseConfig` (`tests/e2e/base-config.ts`, which the workshop
config also reads, so that one loads with no database setting) and
`slotServers` (`tests/e2e/servers.ts`), so a story runs against the
same per-worker database and production server as a gate spec, on ports 8001
and up. It takes the same lock, `/tmp/sorrel-e2e.lock`, so the two suites
never run at once on one machine. Under Claude Code (`CLAUDECODE` set, `CI` not) the
config prints `dot` where it otherwise prints `list`, so only the checklist and any
failure show; `PW_REPORTER=list` restores the per-test lines (M12.37). `npm run e2e` ignores `tests/e2e/stories/`.

## In CI

The PR gate, `.github/workflows/pr-gate.yml`, runs the suite as its `stories`
job on every pull request whose files match the job's path filter. The job
needs the same image jobs as `playwright`, so the two suites share one e2e
image and one database image, and it runs beside the other jobs rather than
after them. It calls `playwright.yml` with
`suite: stories`, which switches the run command, the summariser
(`.github/scripts/summarize-stories.mjs`), the check name and the comment
thread (marker `stories`). Its comment carries the story suite's own coverage
figure and per-file table (M14.28), and the coverage artifact is named
`playwright-coverage-stories`. It is never a
required check, and the run step carries `continue-on-error: true` (a job that
calls a workflow cannot carry it), so a red scaffold or an unfinished story
shows in the PR's Stories comment, read from `steps.run.outcome`, without
blocking a merge. Nothing in the gate waits on it, so the gate's time does not
grow with the suite. It runs on pull requests only; `npm run test:stories`
gives the checklist for any branch.

## The two suites

| Suite                      | Lives in              | Proves                                               | Gate |
| -------------------------- | --------------------- | ---------------------------------------------------- | ---- |
| Story suite                | `tests/e2e/stories/`  | A v1 story, by a flow a user could walk              | No   |
| Gate suite (`npm run e2e`) | `tests/e2e/*.spec.ts` | What no story walks and only a real server can prove | Yes  |

A gate spec that a story flow now proves is deleted, not kept as a duplicate
(`layer-ownership.md`, rule 9).
