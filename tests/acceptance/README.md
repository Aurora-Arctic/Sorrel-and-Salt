# Acceptance tests — story traceability

One file per story group, one `describe` per story, named `Story <id>: …`
(DESIGN.md §11 — "Acceptance tests — story traceability"). `make test-stories`
runs only this directory and prints a checklist of the 45 v1 stories with
each one's status; a story with no `describe` naming it reads "no test yet".

Files arrive with each wave's scaffold task, deliberately red:

| File                     | Stories | Scaffold |
| ------------------------ | ------- | -------- |
| `01-accounts.test.ts`    | 1–13    | M2.1     |
| `02-compendium.test.ts`  | 14–16   | M8.1     |
| `03-ingredients.test.ts` | 20–27   | M8.A.1   |
| `04-modals.test.tsx`     | 28–34   | M9.1     |
| `06-grimoire.test.ts`    | 47–57   | M10.1    |
| `07-admin.test.ts`       | 17–18   | M5.1     |

Story 19 is covered by the workspace-isolation suite (M6.6). Numbers 35–46
belong to v2 and are not reused; `tests/guards/story-naming.test.ts` rejects a
top-level `describe` that names one of them, or none at all.

These files run under the `acceptance` project in `vitest.stories.config.mts`
— node, against the seeded per-worker database, the same harness as
`tests/db/`. They are not part of `npm run test` or `npm run test:coverage`,
so a red story never moves the 80% line threshold. See
[`claude-docs/testing.md`](../../claude-docs/testing.md).
