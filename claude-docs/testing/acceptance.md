## Acceptance — `make test-stories` (M1.28)

`npm run test:stories` (`make test-stories`) runs `tests/acceptance/` alone —
`vitest run --config vitest.stories.config.mts` — and prints a checklist of
the v1 user stories, one line each:

```
[x] Story 1: Sign in with an account I already have, so I don't manage another password.
[ ] Story 2: As a newly signed-in user, be told plainly what I can do next, … — FAILING
[ ] Story 3: Create a workspace once I hold creation rights, … — skipped
[ ] Story 4: Generate an invitation link with a chosen role … — no test yet

1 of 51 stories passing · 1 failing · 1 skipped · 48 without a test
```

That is DESIGN.md §11's "live progress report against §10 rather than a
coverage percentage", and it is the whole of what "acceptance coverage"
means here — a count of stories, never a percentage of lines. Four decisions
make it hold:

- **A config of its own, not a third project.** `npm run test` and
  `npm run test:coverage` never see `tests/acceptance/` — `unit` and `dom`
  exclude it, and `vitest.stories.config.mts` is the only include —
  so a scaffold that lands deliberately red (M2.1 is the first) cannot fail
  the unit run, and a story that passes cannot lift the 80% threshold. The
  stories run carries no `--coverage` at all.
- **The story list is read out of DESIGN.md §10, not copied.**
  `tests/support/stories.ts` parses the numbered list between
  "## 10. User stories" and the next section — 52 today, 1–34 and 47–64 — so
  the spec is the one place a story is written down and a story added to §10
  joins the checklist without a harness edit. `stories.test.ts` pins the
  rules rather than the list: ids unique and ascending, none in 35–46, and the
  count equal to the one §10 states for itself in prose.
- **A story's status is the state of every suite naming it.** A suite names
  its story in its describe — `describe('Story 12: …')`, at any depth, from
  any file — and `tests/support/story-checklist.ts` folds those states: any
  failure is _failing_; otherwise any skip is _skipped_ (M2.1's
  skipped-with-reason option); otherwise _passing_. `pending`, what an
  interrupted run leaves, reads as failing so it can never look green. A
  suite naming a number §10 does not list is set aside under "Not a v1
  story" rather than counted.
- **Naming is guarded, not hoped for.** `tests/guards/story-naming.test.ts`
  reads every `tests/acceptance/*.test.ts(x)` — tracked and untracked, as
  `slug-rule.test.ts` does, since the file it exists to catch was just
  written — and fails on a top-level `describe` that names no story or a
  non-v1 number, or a top-level `it`. A story with a test that names it
  wrongly would otherwise show as "no test yet" while that test failed.

**A scaffold names only what typechecks.** A scaffold lands before the thing
it tests exists, and `npm run typecheck` runs over `tests/` too, so an import
of a page or a service that is not there yet would fail `tsc` rather than the
story. `01-accounts.test.ts` (M2.1) therefore reads an unbuilt page's source
with `existsSync` and `readFileSync` instead of rendering it, and
`07-admin.test.ts` (M5.1) looks each unbuilt service up on its module's
surface at runtime — `await import('@/modules/ingredients')` cast to an
interface stating the signature the story expects, each name checked with
`toBeTypeOf('function')` so the failure names the task it waits on. The task
that builds the page or the service replaces the workaround with the import
and drops the stated signature; the story's `describe` and its assertions
stay.

The suite runs on the same harness as `tests/db/` — node, one seeded
`sorrel_test_<slot>` clone per worker, re-cloned before every file — because
an acceptance test calls a service against the seeded world. A file that
needs a DOM (`04-modals.test.tsx`, M9.1) declares
`// @vitest-environment jsdom` in its own docblock. `passWithNoTests` is on:
the directory holds only its README until M2.1, and 51 stories with no test
is a true report rather than an error.

`tests/support/story-reporter.ts` is the Vitest reporter behind it, listed
by path after `default` in the config — so a failing story still prints its
assertion — and given by path rather than imported, since a config's imports
run at config-load time. With `--outputFile=<path>` (or
`--outputFile.stories=<path>`, the way the built-in `json` reporter is
addressed) it also writes the checklist as JSON, which is how CI gets it.

**Wired into CI (M1.28).** `vitest.yml` runs `npm run test:stories` as a
second step of the same job, after the coverage run and with `always()` so
the checklist is written even when that run is red;
`.github/scripts/summarize-stories.mjs` turns the JSON into a "3 of 45
stories passing" stat and a collapsible markdown checklist for its own job
summary section and its own PR comment thread (marker `stories`). The step
fails the job when a story fails — except across M2 (M2.1): that step carries
`continue-on-error: true` so a story still red while the rest of Wave 6 lands
cannot block a PR, while `steps.stories.outcome` (read by the summarize and
comment steps below it) still carries the real pass/fail, unaffected by
`continue-on-error`. Revert once every M2 story is green.
