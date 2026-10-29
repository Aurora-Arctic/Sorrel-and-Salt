# Story suite — one browser flow per user story

A user story is proved by a flow a user could walk in the browser: sign in,
click, read the page. It is never proved by calling a service or a GraphQL
query (DESIGN.md §11, "Acceptance tests — story traceability";
`claude-docs/design-decisions/m9.1-stories-are-browser-flows.md`).

`npm run test:stories` (or `make test-stories`) runs only this directory, with
`playwright.stories.config.ts`, and prints a checklist of the 61 v1 stories.
A story with no test reads "no test yet". CI runs it as the `stories` job of
`.github/workflows/pr-gate.yml`, never a required check, so a red scaffold is
never on the merge path.
`npm run e2e` (the gate suite) skips this directory.
`npm run test:stories:audit` runs the same stories in WebKit, Firefox and as a phone (claude-docs/testing/e2e.md, "The audit"); a story passes only if it passes in all.

## Naming a story

A test names its story by Playwright's tag, and by nothing else:

```ts
test('a member leaves the coven', { tag: '@story-10' }, async ({ page }) => {});
test('…', { tag: ['@story-4', '@story-5'] }, async ({ page }) => {});
```

The checklist reads the tag. A test in this directory with no `@story-N` tag
fails the run. A tag naming a number DESIGN.md §10 does not list is reported as
"Not a v1 story" and does not fail it (35–46 belong to v2 and are not reused;
76, 78 and 79 wait for M13.4 to add them; 81 has no scaffold until M13.17 adds its flows). A story passes when every test tagged
with it passes. A test that passes only on its retry counts as failing: CI
retries once so the run finishes, and the checklist lists the story as flaky,
its box unticked: `FLAKY (failed, then passed on retry)`.

## Red scaffolds

A story whose page does not exist is a `test.fixme` whose body is the flow
as the finished page will allow it. The annotation names the task that builds
the page; that task unskips the story in its own pull request.

```ts
test.fixme(
  'the member sees their ingredients',
  {
    tag: '@story-20',
    annotation: { type: 'fixme', description: 'M9.6 builds /coven/[slug]/ingredients' },
  },
  async ({ page }) => {},
);
```

Going green is `test.fixme` → `test` and deleting the annotation.

## Files

| File                         | Stories      | Built or unskipped by                     |
| ---------------------------- | ------------ | ----------------------------------------- |
| `01-accounts.spec.ts`        | 1, 2, 3, 8   | M9.1                                      |
| `01-members.spec.ts`         | 9, 10, 11    | M9.1                                      |
| `01-invitations.spec.ts`     | 4–7          | M9.1                                      |
| `01-viewer.spec.ts`          | 12, 13       | fixme: M9.6, M10.11, M9.9, M6.18          |
| `02-compendium.spec.ts`      | 14–16, 64    | 14 M9.12, 15, 16 M8.16                    |
| `03-ingredients.spec.ts`     | 20–27        | M9.1 (scaffold); 25 M9.10                 |
| `04-modals.spec.ts`          | 28–34        | M8.9 (scaffold); 28–32 M8.16, 33–34 M8.17 |
| `06-grimoire.spec.ts`        | 47–57, 76–80 | fixme: M10.11–M10.20, M13.3, M13.7, M13.8 |
| `07-admin.spec.ts`           | 17–19        | M9.1                                      |
| `08-email-and-admin.spec.ts` | 58–62        | M9.1                                      |
| `09-public.spec.ts`          | 63           | MB.83, MB.85                              |

In `06-grimoire.spec.ts`, each story waits on: 47 M10.12, 48 M10.14, 49 M10.15, 50 M10.15, 51 M10.16, 52 M10.17, 53 M10.18, 54 M10.19, 55 M10.20, 56 M10.11, 57 M10.15, 76 M13.7, 77 M10.15, 78 M13.7, 79 M13.8, 80 M13.3, 83 M13.21, 84 M13.22.

Which old acceptance test each file replaces, and which gate e2e tests it made
obsolete, is tabled in the decision record's "Mapping" section
(`claude-docs/design-decisions/m9.1-stories-are-browser-flows.md`).

Story 19 (an admin has no access to a coven's ingredients or grimoire) is
walked here by URL, as far as the pages exist. The per-entity sweep of the
services behind it stays in the workspace-isolation suite (M6.6),
`tests/db/workspace-isolation.test.ts`, with the refusal the same for a real id
and a made-up one (MB.187).

## Writing a flow

Set up with `signInAs` and raw SQL (MB.101); walk the step the story is about
in the UI. Use role and label locators and assert state, never copy
(`claude-docs/testing/layer-ownership.md`). A refusal is proved by the control
being absent and by the direct URL or action being refused. See
[`claude-docs/testing/acceptance.md`](../../../claude-docs/testing/acceptance.md)
and [`claude-docs/testing/e2e.md`](../../../claude-docs/testing/e2e.md).
