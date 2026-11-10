# Testing

Vitest runs as several projects, configured in `vitest.config.mts` (`.mts` because the root `package.json` carries no `"type"` field, so the extension tells Vite's config loader the file is ESM). `db` and `db-mocking` share the Postgres harness through `tests/support/db-project.mts`. The story suite is Playwright, not Vitest. A citation in code names the file below, not this page.

## Files

- `where-tests-live.md`: where each kind of test goes, and the guards that keep it so.
- `layer-ownership.md`: which layer owns which proof, and the file budget.
- `acceptance.md`: the story suite, `npm run test:stories`.
- `e2e.md`: Playwright, its servers, ports and timing.
- `coverage.md`: coverage collection and the 80% threshold.
- `db-harness.md`: the Postgres harness the `db` projects share.
- `fixture-factories.md`: `makeIngredient`, `makeSpell` and the other factories.
- `acting-as-fixture-users.md`: `asUser` and asserting a refusal.
- `debugging.md`: debugging the app and the tests, with the port table.
