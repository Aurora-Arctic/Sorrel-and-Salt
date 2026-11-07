# Plan — cut the test suite to functional requirements (MB.224–MB.230, seven lanes)

**Status:** decided and built. Only the decisions, the reasons and what they rule out are kept here.

## The rules (L1 writes them; every lane applies them)

Written in `claude-docs/testing/layer-ownership.md` as new rows of "The owning layer" and a new section **"What a test may assert"**, one bullet each in `.claude/rules/testing.md` "What a test asserts", and one sentence appended to `CLAUDE.md:93` ("Component tests use role and label queries only. No test ids for anything a user can see. **A test proves a functional requirement by the state it leaves, never by copy, class or layout; a regression test needs a bug that reached a PR.**" — CLAUDE.md is 19,124 B of a 20,000 B guard, so nothing longer). `claude-docs/testing/coverage.md` gains: "The 80% threshold exists partly to prevent test bloat and to keep tests on functional requirements; a copy, class or memorial test adds no coverage of behaviour and is not written."

1. **Functional requirements only.** A test proves a behaviour a user, admin or operator depends on. Tests of the harness, CI YAML, docs, scripts, the Dockerfile, package.json wiring or another test's helper are not written, and **code used only by Claude agents is never tested** (`scripts/task-board.mjs`, the doc-splitting and citation tools, skills tooling, the CI summarizers — a bug there is seen by the agent that runs it, not by a user).
2. **State, never copy.** After an action, assert the `status`/`alert`/`tooltip`/row/chip/description is present or carries the data the action used. Never a heading, label, caption, column heading, placeholder, hint, empty-state sentence, dialog body, page title, email subject or body, or the sentence of an error whose kind (`Forbidden`, `extensions.code`, zod `path`, `reason`) is already asserted. **Exception:** when the copy clearly informs the state and there is no other way to tell — a Yes/No cell that is the only rendering of a flag an action flipped, or which of two lock reasons won (`UserList/index.test.tsx:1206`) — the words are the state and stay. Locators keep exact names.
3. **A regression test needs a shipped bug.** Only a bug that reached a PR or production earns one, citing the PR or incident in its comment. A bug caught while building gets none; neither does "X stays removed" — the exact-column test already fails if a column comes back.
4. **No presentation in jsdom.** No class name, CSS custom property, z-index, compiled-Sass value or faked layout (`getBoundingClientRect` mocks). The workshop story and the Playwright axe scan own presentation. A real browser measuring a layout requirement (375 px scroll width) and a one-assertion token-contrast check per theme are functional and allowed.
5. **One row per shared path.** A `describe.each`/`it.each` over a component's or module's own config table (`KINDS`, `VOCABULARY_COPY`, `VARIANTS`, `UNITS`, the vocabulary registry) runs shared behaviour on one row; every other row gets only what it changes (its mutation name, its path, its param). An env matrix needs an env branch in the source. A fixed list is proven by one accepted value, one refused, and one equality check of the database's list against the code's.
6. **Each layer proves only what it adds** (MB.180, enforced): a service refusal is asserted once as one non-keeper fixture with its precondition, never as A, B, C and D when the check reads only the site role; a GraphQL file never re-tests the service, the scope sweep (`tests/db/graphql-query-scopes.test.ts`) or signed-out callers; a module validation test asserts only what its schema adds over `src/lib/validation.ts`; a module schema test holds the exact-column test plus behaviour particular to that table — no property pins, no catalogue reads, no "no X column", no partial-unique pair (the sweeps own those); a page test holds the guard, its search params reaching the service, `?edit` NotFound against other errors and its modal close href; Pager owns paging, a list asserts only the hrefs it builds; filter spinner and reset are tested once (CompendiumList).
7. **A migration's data tests retire** once the migration is in production's journal; the shape tests of the resulting tables stay.
8. **No guard for a rule lint can carry.** Import bans, `server-only`, `'use server'`, route allowlists, slugify, type-only files are oxlint rules (`.oxlintrc.json`, `lint/sorrel-lint.js`). A Vitest sweep stays only where it reads the schema, the catalogue or the module graph: GraphQL field classification, every finder filters soft-delete, audit columns, `updated_at` trigger, partial unique indexes, the two exemption-count pins, test-location.
9. **e2e proves what only a real server can**: navigation, server render, cookies, mail, cache, the production build's config, one axe scan per page. A spec never re-runs a flow a component or service test proves wholesale; each admin page keeps its 403 and one flow (owner's choice: trim only duplicates).
10. **SQL text appears only as the precondition of an EXPLAIN plan test**; plan tests keep their row counts.

## Rules every lane follows

- **Worktree per lane** under `/home/node/worktrees/<lane>`: `git -C /app fetch origin && git -C /app worktree add /home/node/worktrees/<lane> -b feature/mb.<id>-<slug> origin/staging`; `cp -a /app/node_modules /home/node/worktrees/<lane>/node_modules && rm -f /home/node/worktrees/<lane>/node_modules/.cache/tsc/tsconfig.tsbuildinfo` (a copy, never a symlink; drop `/app`'s tsc cache). Every command runs with `cd /home/node/worktrees/<lane>` — the shell cwd resets to `/app` between calls. L7 also copies `/app/.env.local` in (gitignored; the e2e server reads it).
- **Commit at each `npm run pre-commit`-green step** on the lane branch (a rebuild deletes `/home/node/worktrees`). No push, no PR, until the owner asks in their own message.
- **No test runs mid-lane.** At the lane's end, once: `flock /tmp/sorrel-vitest.lock npm run test:coverage` (and `test:stories` for L4), and for L7 `flock /tmp/sorrel-e2e.lock env ENABLE_IMPERSONATION= BETTER_AUTH_SECRET="$(grep -m1 '^BETTER_AUTH_SECRET=' .env.local | cut -d= -f2-)" npx playwright test` after `npm run build`, with ports 8001+ and 8100 checked free. Never print the secret. Other sessions share Postgres: a single _different_ file failing at setup per run is a collision; re-run it alone before chasing it.
- **PR body:** `Closes #N`; the two-column table _deleted or loosened test_ → _owner (file:line) or the rule number in §3_; per-file coverage of the touched `src/` directories against `.reports/coverage/coverage-summary.json` from the previous run (istanbul; copy it aside before running; any file losing its only test is named); the CI comment's slowest-files block and the two step timings pasted against §2.
- **Docs in the same PR** (MB.31): a doc naming a deleted test or a changed file is corrected in that lane (lists below). L1 copies this plan to `claude-docs/design-decisions/mb.<L1 id>-plan.md`.
- **Never deleted, whatever the tables say:** one direct-id refusal with its precondition per service rule; soft-delete, scoping, identity and visibility rules; a DB CHECK or partial unique index's _behavioural_ test (once, in the sweep or the owning schema file); plan-test row counts; `tests/db/audit-columns.test.ts`'s catalogue half; `tests/acceptance/` (loosened, never removed); any locator.
- **Dead code goes with its last reader:** fixture fields, constants, helpers (`tests/support/types.ts:129,131,165,167,169`; `LISTS[].hint`; `RENAME_NOTE`, `CONFIRM`, `UNVERIFIED_WARNING`, `PRIMARY_REASON`, `NOT_PRIMARY`, `PAUSED_REASON`, `SENTENCE`, `INSTRUCTIONS`; `tests/support/grouped-value-form.tsx`'s refusal strings). `types-in-type-files` is retired, so lint and `tsc` are the catch.
- **Shared-file ownership (collision rule).** A file is edited by one lane only: `claude-docs/testing/e2e.md` → L7 (L6 passes its Mailpit sentence to L7's brief; it is in there); `claude-docs/testing/acting-as-fixture-users.md` → L4 (L1 does not touch it; L4 adds the pointer to the rules); `claude-docs/testing/db-harness.md` → L3 (L2's seed/inserter lines go in `where-tests-live.md` and `fixture-factories.md`); `claude-docs/testing/where-tests-live.md` → L1 edits only its guards section, L2 only its seed section (distinct hunks; second to merge rebases); `claude-docs/modules.md` → L1; `claude-docs/testing/layer-ownership.md` → L1, which also corrects the IngredientForm exemption paragraph itself (the block L5 removes renders only ListField); `tests/db/schema-drift.test.ts` → L3 creates; `tests/modules/ingredients/validation/ingredient-resolver.test.ts` → L5 creates; `tests/support/types.ts` and `grouped-value-form.tsx` → L5; `vitest.config.mts`, `.oxlintrc.json`, `lint/` → L1; `.github/workflows/playwright.yml` → L7, `checks.yml` → L1. Peers: no open PR or remote branch touches tests today (checked 2026-10-11); app-78's MB.116 has our file list and bases on whichever lands first.
- **A test whose title or comment names the deleted thing is retitled.** Titles name the behaviour, not the wording or the bug.
- `node scripts/task-board.mjs sync <ID>` after any entry edit; status `In Progress` when the branch exists.

## L1 — The rules, lint carries the architecture guards, harness tests go · 3.5 h

**Files:** the docs in §3; `.oxlintrc.json`; new `lint/sorrel-lint.js`; `tests/guards/**`; `tests/support/**/*.test.ts(x)`; `tests/scripts/**`; `tests/scss/**`; `tests/graphql/**`; `vitest.config.mts` (`unit` project: drop `globalSetup` if no surviving guard `inject`s the scan — check `tests/support/unit-global-setup.ts` consumers after the deletions); `.github/workflows/checks.yml` only if the codegen diff check is added.

**Lint moves** (`oxlint` 1.86.0 installed; `.oxlintrc.json` has 2 top-level rules, 9 `overrides`, no `jsPlugins`; an override replaces the top-level rule set, so a ban is restated inside each override that applies):

- `no-restricted-imports` paths: `@/lib/slugify` and relative `slugify` (allowed only in `src/lib/slugify.ts`), `next/cache` (allowed only in `src/lib/compendium-cache.ts`), `@apollo/*`, `apollo-*`; a validation override for `src/modules/*/validation/**` and `src/lib/validation.ts` banning `drizzle-orm`, `postgres`, `server-only`, `**/db/**`, `**/services/**`. `import/no-cycle` on (replaces `module-boundaries` "allows no cycle").
- `lint/sorrel-lint.js` under `jsPlugins: ["./lint/sorrel-lint.js"]` (alpha API — first verify `npx oxlint --help` lists js plugins and that `npm run lint` loads the file; if unsupported, keep these four as one Vitest file `tests/guards/code-rules.test.ts`, one case each, and say so in the entry):

```js
export default {
  meta: { name: 'sorrel' },
  rules: {
    'no-use-server': {
      create: (ctx) => ({
        ExpressionStatement(n) {
          if (n.directive === 'use server')
            ctx.report({ node: n, message: 'No server actions (CLAUDE.md rule 1)' });
        },
      }),
    },
    'service-server-only': {
      create: (ctx) => ({
        Program(p) {
          if (!/src\/modules\/[^/]+\/services\//.test(ctx.filename)) return;
          if (
            !p.body.some((s) => s.type === 'ImportDeclaration' && s.source.value === 'server-only')
          )
            ctx.report({ node: p, message: "A service opens with import 'server-only'" });
        },
      }),
    },
    'route-allowlist': {
      create: (ctx) => ({
        Program(p) {
          if (
            /\/route\.[jt]sx?$/.test(ctx.filename) &&
            !/api\/(graphql|auth\/\[\.\.\.all\])\/route/.test(ctx.filename)
          )
            ctx.report({
              node: p,
              message: 'Only /api/graphql and /api/auth/* may be route handlers',
            });
        },
      }),
    },
    'pagination-helper': {
      create: (ctx) => ({
        CallExpression(n) {
          if (
            n.callee.type === 'MemberExpression' &&
            n.callee.property.name === 'connection' &&
            !/src\/graphql\/pagination\.ts$/.test(ctx.filename)
          )
            ctx.report({ node: n, message: 'Lists paginate through t.pagedConnection (M3.6)' });
        },
      }),
    },
  },
};
```

**tests/guards — 43 files → 6.** Keep, each trimmed to the case(s) named: `pagination.test.ts` (`:58`, `:62`), `soft-delete-finder-guard.test.ts` (`:276` every finder filters, `:390`), `lint-db-client-boundary.test.ts` (`:95` exactly six exemptions + one client-ban probe + one drizzle-ban probe), `lint-loader-boundary.test.ts` (`:56` + one probe), `test-location.test.ts` (one case: every test file sits in exactly one project), `migration-order-check.test.ts` (the 6 rule cases `:158-216`; drop `:97`, `:173`, `:183`). `codegen-staleness.test.ts:77` stays as the single case "committed `src/gql` matches codegen", or becomes `npm run codegen && git diff --exit-code src/gql` in `checks.yml` and the file goes. **Delete:** `chip-colour-source` (41 memorials), `ci-secret-environments`, `claude-rules`, `client-safe-validation` (lint override), `compendium-cache` (lint), `compendium-expiry` (behaviour owned by `modules/ingredients/services/compendium-expiry.test.ts` and `e2e/compendium-cache.spec.ts`), `database-probe`, `db-connection-budget`, `db-project-queries`, `db-reset-wiring`, `destructive-ddl-check` (its 7 rules `:158-216` live in the script's `--self-test`, which the CI leg runs; confirm, else keep those 7 as one file), `dev-server-fast-refresh`, `doc-citation`, `e2e-slots`, `email-ornaments`, `graphql-client` (lint), `image-source-layer`, `ingredient-child-loaders` (behaviour in `graphql/workspace-ingredients.test.ts:428,496`), `lint-access-boundary`, `lint-resolver-session`, `lint-service-session-boundary`, `module-boundaries` (`import/no-cycle` + an `ALLOWED`-map rule in sorrel-lint if writable in ~15 lines, else keep `:237` and `:246` as 2 cases), `no-server-actions` (lint), `pr-gate`, `pulled-env-assertion` (its 6 "no secret in logs" cases move into `scripts/assert-pulled-env.ts`'s self-test, else keep those 6 as one file), `reference-seed-wiring`, `route-handlers` (lint), `server-only-services` (lint), `shared-scan`, `slug-rule` (lint), `story-naming`, `tasks-md-sequence`, `types-in-type-files` (retire the guard; `claude-docs/modules.md` "Where types live" becomes a convention), `vercel-pull-git-branch`, `workshop-deploy`, `workshop-guards`, `curated-write-steps` (MB.210; a DRY pin of helper call sites).

**tests/support/\*.test.ts → 1:** keep `tests/support/msw/graphql.test.ts:32` (an unhandled GraphQL request fails loudly). Delete `as-user`, `db/migrations`, `fixtures/{ingredient,merge,spell,workspace}`, `stories`, `story-checklist`, `story-naming`, `story-reporter`, `vitest-setup.test.tsx`, `worker-database`. (`as-user.test.ts:52`'s `@ts-expect-error` moves to a `.ts` file under `tests/support/` with no `it`; `tsconfig` includes `tests/`.)

**tests/scripts → 0.** Delete all seven files. **tests/scss/chip.test.ts → 2** (the 4.5:1 checks at `:113`; drop `:76` memorial and the padding/edge/class cases). **tests/graphql:** `builder` 9 → 2 (DateTime, AuditInfo sweep `:62`), `context` 4 → 3 (drop `:54`), `pagination` 20 → 18 (drop `:219`, `:257`; `:153` → `[new InvalidCursor().message]`); `errors`, `loaders/index`, `schema-snapshot` keep.

**Docs:** §3's docs; `claude-docs/testing/where-tests-live.md` (guards section rewritten to the six that remain and the lint rules); `claude-docs/testing/README.md:68`; `claude-docs/modules.md` "Where types live"; every `claude-docs/` and `.claude/rules/` line naming a deleted guard or `tests/scripts` (grep `tests/guards/`, `tests/scripts/`, `tests/support/` and fix each hit).

_Acceptance criteria:_ the ten rules are in `layer-ownership.md` under the heading above and the six pointer docs name it · `npm run lint` fails on a probe file for each moved rule (shown once in the PR body, then the probe deleted) · `tests/guards/` holds the six files named and nothing else; `tests/scripts/` is gone; `tests/support/` holds one test · `vitest.config.mts`'s `unit` project runs no `globalSetup` nothing reads · every doc that named a deleted guard is corrected · per-file coverage unchanged (these tests cover no `src/`) · `Run vitest` time pasted.

_Estimate:_ −57 files ≈ −42 s worker ≈ **−6 s wall**.

## L4 — Services, GraphQL, loaders, acceptance: one refusal per rule, the transport's half only · 3.5 h

**Files:** `tests/modules/*/services/**`, `tests/modules/*/graphql/**`, `tests/modules/*/loaders/**`, `tests/acceptance/**`, `tests/rsc/**`. Includes the message-wording loosening in these layers (rule 2).

**Services.** Rule 6 A–D collapse: every refusal asserted as A, B, C and D where the check reads only the site role becomes one non-keeper with its precondition (~140 rows → ~35; files: `vocabulary/services/{astrology,categories,deities,ingredient-form-values,...}`, `ingredients/services/{compendium-entries,references}`, `identity/services/{admin-invitations,admin-role-pause,user-role,workspace-creation,privilege-changes}`). Keep every refusal that depends on workspace role. `coven/services/access-control.test.ts` 55 → 5: the 51-row matrix becomes one `toEqual` of the whole permission table. Delete `coven/services/two-transports.test.ts` and `vocabulary/services/suggestions-query.test.ts` (rule 10). `common-names-plan` 5 → 2, `duplicates-plan` 4 → 2 (keep EXPLAIN loops and row counts). Trims: `compendium:63,156`; `name:66` ×3 → 1; `email:67` ×6 → 3; `admin-invitations:133` → 1; `privilege-changes:233,255`; `user-list:136`, `categories:188`, `ingredient-form-values:218` (literal-wildcard reads — `tests/db/repository/vocabularies.test.ts:180` owns it); `deities:138`, `ingredient-form-values:150`. Wording (rule 2): `workspace-creation:136,243,256,309`, `user-role:199,212,292,343,352,377` (delete the local `PRIMARY_REFUSAL:39`; import `PRIMARY_ADMIN_REFUSAL`), `site-admin:24`, `privilege-changes:291`, `invitation-acceptance:227-346` (→ `reason` codes and classes), `admin-invitations:158`, `email:101,114,166,174`, `compendium-entries:219,644,673,691,706,717,739,860,924`, `workspace-ingredients:264,279,303,323,442,934`, `ingredient-references:290,327`, every vocabulary slug/in-use/moveTo sentence → class + `stringContaining(<name or slug>)` only where the title promises the entry is named; `spell-visibility:115` goes, `:114` → `not.toBe(new Forbidden().message)`; `membership:164` gains `not.toBeInstanceOf(Forbidden)`.

**GraphQL** (`tests/support/graphql/run.ts`; `extensions.code` only): drop every scope refusal of an `ADMIN_WRITES` field, every `run(null, …)` signed-out case, every second read of the same page, every service-rule repeat: `identity/privilege-changes` 10 → 6, `user-role` 7 → 5, `users` 7 → 5, `workspace-creation` 10 → 7, `ingredients/common-names` 4 → 3, `compendium-entries` 18 → 11, `compendium` 12 → 9 (the 3 loader N+1 tests stay), `duplicates` 7 → 4, `references` 13 → 10, `workspace-ingredients` 22 → 17, `vocabulary/astrology` 27 → 20, `categories` 16 → 12, `category-groups` 10 → 7, `deities` 16 → 13, `ingredient-form-groups` 10 → 7, `ingredient-form-values` 18 → 13, `deity-suggestions` 5 → 3, `form-suggestions` 5 → 3, `suggestions` 10 → 5. Every `message:` beside a `code:` goes; `fieldErrors` keep `path` only. **If time allows:** one registry-driven file over `curatedVocabularyWrites` (`src/modules/vocabulary/graphql/curated.ts:27`), ~35 rows replacing ~72 per-vocabulary cases; else record it as a follow-up in the entry.

**Loaders:** `ingredients/loaders/ingredient-children.test.ts` `describe.each` ×3 at `:239` → one matrix (every loader shares `admit()`, `src/modules/ingredients/services/ingredient-children.ts:159`).

**Acceptance** (loosen only): `08-email-and-admin.test.ts:226-228,246-248,260,263-264` → `rejects.toThrow(Forbidden)`; `:440` → `invitationStanding` `toMatchObject({ reason })` + `Forbidden`; `:457-469` → reasons `['accepted','revoked','expired']`; `01-accounts.test.ts:27` keeps `existsSync`, drops the `/invite-only/` grep. **rsc:** `membership.test.ts` 5 → 2 (keep `:102`, `:120`).

**Docs:** `claude-docs/graphql/schema.md` per-field sentences; `claude-docs/db/{workspace-ingredients,compendium-writes}.md` READS tables (check counts); `tests/acceptance/README.md`; `claude-docs/testing/acting-as-fixture-users.md` (one non-keeper suffices when the check reads the site role).

_Acceptance criteria:_ for every service rule exactly one direct-id refusal with its precondition remains; the PR body lists `Forbidden` expectations per file before/after with the A–D rows removed · no GraphQL file calls `run(null, …)` or asserts a non-keeper refusal on an `ADMIN_WRITES` field · no `toThrow('<sentence>')` outside the sentinel and constant forms · `npm run test:stories` prints one line per story · per-file coverage of `src/modules/**/services/**` and `src/graphql/**` not below the previous run · `Run vitest` pasted.

_Estimate:_ −2 files, −330 cases, ≈ −6 s summed ≈ **−1.5 s wall**.
