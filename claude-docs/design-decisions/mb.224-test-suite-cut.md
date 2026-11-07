# Cut the test suite to functional requirements

**Status:** decided. Live home: `claude-docs/testing/layer-ownership.md`, "What a test may assert" and "The owning layer"; `.claude/rules/testing.md`, "What a test asserts"; `claude-docs/testing/coverage.md`.

## Decision

A test proves a behaviour a user, admin or operator depends on, by the state it leaves. Ten rules follow from that.

1. Functional requirements only. No tests of the harness, CI YAML, docs, scripts, the Dockerfile or `package.json` wiring, and none for code only Claude agents run (`scripts/task-board.mjs`, the doc and citation tools, the CI summarisers).
2. State, never copy. Assert the status, alert, row or chip, not a heading, label, placeholder, empty-state sentence, email subject or the sentence of an error whose kind (`Forbidden`, `extensions.code`, zod `path`, `reason`) is already asserted. The one exception: the words are the state when nothing else tells two outcomes apart, such as which of two lock reasons won. Locators keep exact names.
3. A regression test needs a bug that reached a PR or production, and cites it. A bug caught while building gets none, and neither does "X stays removed".
4. No presentation in jsdom: no class name, custom property, z-index, compiled-Sass value or faked layout. The workshop story and the Playwright axe scan own presentation. A real browser measuring a layout requirement, and one token-contrast check per theme, are allowed.
5. One row per shared path. A `describe.each` over a component's or module's own config table runs the shared behaviour on one row; every other row gets only what it changes. A fixed list is proven by one accepted value, one refused, and one equality check of the database's list against the code's.
6. Each layer proves only what it adds. A service refusal is asserted once, as one non-keeper fixture with its precondition, when the check reads only the site role. A GraphQL file never re-tests the service, the scope sweep or signed-out callers. A module validation test asserts only what its schema adds over `src/lib/validation.ts`. A page test holds the guard, its search params reaching the service, and its modal close href; Pager owns paging.
7. A migration's data tests retire once the migration is in production's journal; the shape tests of the resulting tables stay.
8. No guard test for a rule lint can carry. Import bans, `server-only`, `'use server'`, route allowlists, slugify and type-only files are oxlint rules (`.oxlintrc.json`, `lint/sorrel-lint.js`). A Vitest sweep stays only where it reads the schema, the catalogue or the module graph.
9. e2e proves what only a real server can: navigation, server render, cookies, mail, cache, the production build's config, one axe scan per page. A spec never re-runs a flow a component or service test proves wholesale; each admin page keeps its 403 and one flow.
10. SQL text appears only as the precondition of an EXPLAIN plan test, and plan tests keep their row counts.

Never deleted, whatever the tables say: one direct-id refusal with its precondition per service rule; soft-delete, scoping, identity and visibility rules; the behavioural test of a DB CHECK or partial unique index (once); `tests/db/audit-columns.test.ts`'s catalogue half; `tests/acceptance/` (loosened, never removed); any locator. Dead code (fixtures, constants, helpers) goes with its last reader. A test whose title names a deleted thing is retitled to the behaviour.

## Why

A copy, class or memorial test adds no coverage of behaviour and costs a CI-minute on every run. The 80% threshold exists partly to keep tests on functional requirements.

## Rules out

- Trimming e2e past duplicates: the owner chose to trim only duplicates.
- A Vitest guard for anything lint can enforce: lint fails at edit time and a guard only at CI.
- Per-role A, B, C and D refusal rows where the check reads only the site role: they pin nothing the one non-keeper row does not.
