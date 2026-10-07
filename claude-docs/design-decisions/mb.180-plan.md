# MB.180 plan — consolidate the test suite (MB.180–MB.189)

**Status:** approved by the owner · **Date:** 2026-10-07

## Context

CI's Vitest job has grown from ~2,200 to ~3,400 test cases in a week (204 → 257 files on `staging`, 1–7 Oct). The latest green run (`37642953381`): Vitest job 145 s wall, vitest itself 114 s on 7 workers, 248 files, 4,570 tests, **215 s of summed worker time**. The breakdown says where it goes, and it is not evenly spread:

| Area                                                                   | Files | Tests | Summed ms  |
| ---------------------------------------------------------------------- | ----- | ----- | ---------- |
| `tests/components/IngredientForm/index.test.tsx`                       | 1     | 257   | **82,686** |
| `tests/components/IngredientForm/references.test.tsx`                  | 1     | 39    | 16,435     |
| `tests/db/seed/`                                                       | 9     | 199   | 20,958     |
| `tests/db/*.test.ts` (top level)                                       | 23    | 365   | 17,251     |
| `tests/modules/ingredients/services/` (two EXPLAIN-plan files = 7.9 s) | 14    | 341   | 16,459     |
| `tests/guards/` (`codegen-staleness` = 3.0 s)                          | 36    | 581   | 5,625      |
| everything else                                                        | 164   | 2,788 | ~56,000    |

One dom file is 38 % of the suite and, being a single worker's job, is the wall-clock critical path: no worker count brings the run under ~83 s while it exists. Playwright is 26 s of tests inside a 110–120 s job (the rest is pull, build, boot) and is **out of scope** by the owner's decision.

Beyond the hot spots, three explorations found the same rule asserted at several layers: 75 of 119 ingredients GraphQL tests re-run a service, repository or validation test; seed scenarios are re-seeded per test when the clone already holds `standard`; identity integration files re-import `@/lib/auth` per test; module schema tests and `tests/db/audit-columns.test.ts` pin the same columns; guards spawn `git ls-files` ten times and oxlint four times.

**Decisions taken by the owner (this session):** one MB task per cluster, one PR each · a per-file time budget that **warns in the PR comment, never fails** · the GraphQL doctrine amendment is accepted, with both backstops (field sweep over Query _and_ Mutation; the six class-asserting resolver files move onto the Yoga harness) · Playwright untouched · all ten tasks contiguous in the execution order, straight after MB.179.

**Target after all ten:** summed worker time ≈ 130 s, no file over 10 s, vitest wall ≈ 35–45 s, job ≈ 75–90 s.

## Rules every task follows

- **Deleted → owner table in the PR body.** Two columns, _deleted test_ → _owning test (file:line)_. A row with no owner is a test that stays. This is how a reviewer checks nothing was merely dropped, and the ownership doc (MB.180) is what the owner column cites.
- **Never deleted:** any service-layer authorization test (direct-id, precondition-asserting — CLAUDE.md Testing); DB CHECK/index tests (the deliberate second gate behind zod); the acceptance suite (`tests/acceptance/`, a separate deliverable per `.claude/rules/testing.md`); plan-test row counts (load-bearing per `claude-docs/db/fuzzy-matching.md:76-85`, `member-autofill.md:148-163`); `tests/db/audit-columns.test.ts`'s `information_schema` half (the only check that catches a spread deleted from a schema file — `tableFacts` in `tests/support/db/table-metadata.ts` reads `getTableConfig`, i.e. the code side).
- **Coverage must not drop per file**, not just at the 80 % threshold: compare `.reports/coverage/coverage-summary.json` for the touched `src/` directories before and after.
- **Docs in the same PR** (MB.31): a doc that names a deleted test, or a harness that changed, is corrected in that task.
- **Verification** for every task: `npm run test:coverage` (threshold), `npm run pre-commit`, the summarizer's slowest-files block from the CI run pasted into the PR body against the previous run's, then `node scripts/task-board.mjs sync <ID>` after the entry is edited. No commit, push or PR unless the owner asks in their own message.

## Minting (first step, before MB.180's branch)

Per `.claude/rules/task-tracking.md` "Minting a task": re-check the next free id (board + `tasks/mb.md`; another session may have minted past MB.179), then in one pass: the ten entries in `claude-docs/tasks/mb.md` (format as MB.179's: `**MB.n — title** · Nh`, `_Story:_`, rationale paragraph, `_Acceptance criteria:_`), `tasks/mb.md`'s summary table, Wave 8's row in `claude-docs/TASKS.md:52` (insert `MB.180 · … · MB.189` after `MB.179`), a paragraph in `claude-docs/waves/wave-08.md` after the MB.179 one (line 33) giving the reasoning, the milestone description's first line, then `task-board.mjs reorder --apply`. Auto mode blocks `gh` writes: hand the owner the board commands to run. This plan is copied to `claude-docs/design-decisions/mb.180-plan.md` in MB.180's PR.

## MB.180 — Test-layer ownership, and a per-file time budget in the PR comment · 1.5 h — lands first

The mechanism + guard of the sweep-task rule; every later task cites it.

- **`claude-docs/testing/layer-ownership.md` (new).** A table: assertion kind → owning layer. Zod rules in `tests/modules/*/validation/`; service rules, every refusal direct-id with precondition, in `tests/modules/*/services/`; the transport's half in `tests/modules/*/graphql/`: one refusal per error code per field with its precondition, SDL-level refusals, auth-scope refusals, loader cache clearing, one read per page, edge fields, and any mode no service test reaches; the repository's mechanism (the `Membership` proof ANDing `workspace_id`) once per finder family in `tests/db/repository/`; a table's own columns, constraints and exact audit set in its module schema test, cross-table invariants once by catalogue sweep in `tests/db/`; a component behaviour in the smallest component that has it, a page test holding search-params → service call, the guard and NotFound; seed content in `tests/db/seeded-template.test.ts`, seed-shape invariants once in `tests/db/seed/index.test.ts`; one filesystem scan shared by the guards. Linked from `claude-docs/testing.md` and one line in `.claude/rules/testing.md` (CLAUDE.md stays under its 20 KB guard).
- **`claude-docs/design-decisions/mb.180-graphql-transport-half.md` (new).** Records the doctrine change: `claude-docs/graphql/schema.md:528-530, 567, 610` "each refusal is asserted as the browser receives it" → "one refusal per error code per field, with its precondition; the service owns the rules", plus the two backstops. `schema.md` gets the pointer here; its per-field sentences are rewritten in MB.185/186.
- **`claude-docs/design-decisions/mb.180-plan.md`**: this plan.
- **The budget, warn-only.** `.github/scripts/summarize-vitest.mjs` gains a `<details><summary>Slowest files</summary>` block from `testResults[].endTime - startTime` (the ten slowest, and every file over `BUDGET_MS = 10_000` marked ⚠ with "over the 10 s budget — claude-docs/testing/layer-ownership.md"), appended to `details` so `job-summary` and `pr-comment` carry it. A unit test under `tests/scripts/` feeds the script fixture JSON (precondition: the fixture contains an over-budget file, and the block names it). `claude-docs/ci/reusable-checks.md` describes the block.

_Acceptance criteria:_ the PR comment and job summary of this PR's own CI run list the slowest files, with the two IngredientForm files marked over budget · `layer-ownership.md` names an owner for every assertion kind the ten tasks cite · the decision record states the doctrine change and both backstops · nothing under `tests/` changes but `tests/scripts/` · coverage threshold holds.

## MB.181 — `IngredientForm`'s list field and closed sets tested as components · 3 h

The lever. `tests/components/IngredientForm/index.test.tsx` is 82.7 s / 258 tests; ~240 go through `renderForm` (`:132`: nine MSW handlers + the 25-field form + a categories fetch per render).

- **New `tests/components/IngredientForm/list-field.test.tsx`** renders `ListField` alone (harness shape: `renderGivenList`, `index:266`). `describe.each(LISTS)` (`:1245`, 19 × 6 = 114) becomes ~14 list-independent behaviours × the _variants_ `ListField` actually branches on (plain / ordered / folk-name / pick-only: 4 rows), plus the ≤ 5 list-specific ones (hint text, sent shape for deities/substitutes, order kept) × 6 on the small harness. 'moving an entry' (`:1524`, 3 × 4) → 3 on the ordered variant + "has a handle" per ordered list. 'a repeat at the $legend box' (`:1622`, 3 × 6) → 3 × 2 (lookup-backed, pick-only) + the folk-name own-name rule (`:1671`).
- **Owned by Combobox, deleted:** the 24 'a long entry' tests (`Combobox/index.test.tsx:855, 870`), chips / Backspace / Enter / handle / move (`:118, 650, 548, 563, 1010, 1042, 1057, 1223`), the Element/Classification closed-set repeats (`index:1062, 1136, 1151, 1179, 1194, 2885`). **`index:1206` moves** into Combobox's file: it is the only keyboard test of `ComboboxSelect`.
- Debounce "asks once the typing settles" × 8 (`:1717, 2002, 2018, 2410×4`) → one "the form wires the hook"; `tests/lib/debounce.test.tsx` owns timing. Error placement/clearing ~14 (`:532, 566, 684, 875, 1034, 1048, 547, 638, 667, 848, 2592, 2902, 3010`) → 5 (field, list entry, nested reference, server `fieldErrors`, cleared on edit). 'the categories' (`:776`): `:812, 848, 923, 826` are `CategoryPicker`'s (`:93, 227, 247, 148`).
- Keep in the form's file only what needs the form: save payload, lookups wired, kind↔name coupling, mode. `tests/support/sortable.ts:78`'s 60 ms real waits stay (0.7 s total; fake timers would couple to the dnd sensor).
- Docs: `claude-docs/components/ingredient-form.md` (the section naming what the test file answers), `claude-docs/components/combobox.md`.

_Estimate:_ index 258 → ~110 tests, 82.7 s → ≤ 12 s; `list-field` ~45 tests, ≤ 4 s; summed −65 s; vitest wall 114 → ~45 s.

_Acceptance criteria:_ every behaviour independent of which list it is renders `ListField` alone · every deleted test names its owner in the PR table; `index:1206` is in Combobox's file · `index.test.tsx` is under 12 s in the CI slowest-files block · per-file coverage of `src/components/IngredientForm/**` and `src/components/Combobox/**` not below the previous run · the two component docs describe the files as they now are.

(3 h exceeds the 1–2 h norm; it stays one PR because the two halves edit the same `describe` blocks. Split only if review asks.)

## MB.182 — The reference panel and compendium mode on their own harness · 1.5 h

`references.test.tsx` (16.4 s / 39) and `compendium.test.tsx` (22) render the whole form for everything.

- **New `tests/components/IngredientForm/reference-panel.test.tsx`** renders `ReferencePanel` (`src/components/IngredientForm/reference-panel.tsx:256`) alone for the ~23 panel tests; the form keeps "open from the list, save, chip appears" and the to-do filter.
- Delete, with owners: `formats %s` × 4 (`:767`) → `tests/modules/ingredients/validation/reference-format.test.ts`; `:620, 637, 783` → `validation/reference.test.ts:102, 117`; `:293` (debounce) and `:486` (error placement) → MB.181's owners; `:514` Save & Add Another → `index:425`.
- `compendium.test.tsx` keeps only what is about the mode (choose-only boxes, required marks, `workspaceId: null` lookups): ~22 → ~10.
- Doc: `claude-docs/components/ingredient-form.md`.

_Estimate:_ references 39 → ~20, 16.4 → ~5 s; compendium −2 s. Largest dom file afterwards: Combobox, 5 s.

_Acceptance criteria:_ as MB.181's first, second and fourth for these files · no dom file over 8 s in the slowest-files block.

## MB.183 — Seeds: one reseed per file, the shared shape once · 2 h

`tests/db/seed/` runs the five vocabulary seeds, ~278 references and the compendium ~130 times; the clone already holds `standard` (`tests/support/db-setup.ts:9-11`).

- `tests/db/seeded-template.test.ts` becomes the owner of the standard seed's _content_ (`where-tests-live.md` already calls it the baseline). `standard.test.ts` loses the rows it repeats (`:95/120/152/213-225/276/231/252/359` ↔ template `:55-93`) and keeps what is about _running_ `seedStandard` (idempotency `:398`, re-run `:398-467`, stamping `:142`, routing `:471`, the acting-user probe `:388`) under its `beforeEach` truncate (`:83`): ~29 seed calls → ~8.
- `demo.test.ts`: one `seed(demo)` in `beforeAll` for the ~12 read-only tests (`:101-284`); the layer-integrity re-runs (`:313-402`) keep their own. `sources.test.ts`: 1 `seedAll` instead of 10.
- The copied shape — "publishes bootstrap user as `app.current_user_id`" × 8, "stamps every row" × 6, idempotent × 8, "does not resurrect what an admin deleted" × all — joins `index.test.ts:190-210`'s `it.each(SEED_ENTRIES)`, with its precondition (table empty before the run). The per-seed files (astrology, categories, deities, forms) keep their data-vs-doc parsing, admin-edit (`seed_key`) and slug re-derive (`forms:320-366`) tests.
- Vocabulary counts asserted once (template), not three times (`standard:213`, each file's "starts from two empty tables").
- Docs: `claude-docs/db/{category-seed,astrology-vocabulary-seed,deity-vocabulary-seed,demo-scenario}.md` where they name a per-seed test; `claude-docs/testing/db-harness.md`; `where-tests-live.md`.

_Estimate:_ 199 → ~130 tests, 21 → ~6 s.

_Acceptance criteria:_ each seed-shape invariant asserted in `index.test.ts` over every `SEED_ENTRIES` row and in no per-seed file · a read-only seed test reads the template or one `beforeAll` seed; a test that writes truncates first · no seed file holds a row `seeded-template` asserts · `tests/db/seed/` sums under 7 s on CI · the seed docs name the tests that exist.

## MB.184 — Guards share one scan; plan tests share one seed · 1.5 h

- **`tests/support/unit-global-setup.ts`** (unit-project `globalSetup` in `vitest.config.mts`) runs `git ls-files --cached --others --exclude-standard` once and `provide`s the list (precedent: `seeded-template.test.ts`'s `inject`); the guards at `no-server-actions:17, module-boundaries:110, slug-rule:35, types-in-type-files:40, chip-colour-source:26, route-handlers:18, pagination:51, test-location:27, lint-db-client-boundary:232, lint-loader-boundary:101` `inject` it. The same setup runs oxlint once over the probe files with the shared config and provides its JSON; `lint-access-boundary:254, lint-db-client-boundary:170, lint-loader-boundary:64, lint-service-session-boundary:88` read their rule's diagnostics from it. Each guard still asserts first that it found what it scans.
- `codegen-staleness.test.ts`: `generate()` once in `beforeAll` for the same-input runs (`:45, :104, :116, :125`); only `:76` is the staleness check.
- Guard-vs-guard owners: `pulled-env-assertion:284-320` keeps, `vercel-pull-git-branch:60-100` drops the overlap; `ci-secret-environments:33-80` keeps, `database-probe:133-213` drops; `soft-delete-finder-guard:231` keeps, `tests/db/repository/index.test.ts:8` drops.
- Plans: `common-names-plan`, `duplicates-plan`, `compendium-search-query` seed in `beforeAll` (row counts unchanged); `compendium-search-query:199` (asserts only `ms > 0`) goes; `ingredients-trigram:153/159/194` and `ingredients-unaccent:168/176/184` (hand-written predicates) go in favour of the plan tests on the real service SQL, their 2,000-decoy `beforeEach` → `beforeAll`; negative controls `trigram:170/181` stay.
- Docs: `where-tests-live.md` (guards section), `claude-docs/db/fuzzy-matching.md` if it names the benchmark.

_Estimate:_ guards 5.6 → ~3 s, codegen 3.0 → ~1.2 s, plans 10.9 → ~5 s; ~10 s summed.

_Acceptance criteria:_ one `git ls-files` and one oxlint per full run, asserted by a test on the setup's provided values; each guard still fails on an empty scan · plan tests' row counts byte-identical · no benchmark asserting only `ms > 0` remains · deleted-test table names each owner.

## MB.185 — The ingredients GraphQL files hold the transport's half · 2.5 h

Of 119 tests, ~75 repeat a service, repository or validation test, against the files' own headers (`workspace-ingredients.test.ts:24-25`).

- **Shared harness `tests/support/graphql/run.ts`** (Yoga + the route's `maskedErrors`, asserting `extensions.code`); `ingredient, duplicates, common-names, ingredient-suggestions, compendium` move onto it from bare `graphql()` + `originalError instanceof`.
- **Keep** (per the ownership table): SDL refusals (`WI:219, 401, 415, 473, 490`; `CE:216, 270, 285`), loader cache clearing (`WI:569, 649`; `CE:318`; `references:129, 249`), one read per page (`compendium:249, 296, 331, 398`), edge fields (`duplicates:96, 110`), compendium-only `workspaceId: null` (`duplicates:279, 296`; `common-names:106, 131` — no service twin until MB.187 adds it), one non-admin refusal per admin mutation in `compendium-entries` (`authScopes: { admin: true }` is a separate gate), and **one refusal per error code per field with its precondition**.
- **Delete** with owners: the service mirrors (`WI:275/516/708` → `SVC-WI:154/491/669`; `WI:537/549/729/736` → `SVC-WI:356/502/681/698`; `ingredient:101/111/122` → `services/compendium:235/241/251`; `duplicates:124/132/162/227/243/255`; `common-names:80`; `ingredient-suggestions:84/98`; `references:100/165/338/216/274/387`; `CE:377/495`), repository search re-runs (`compendium:146/161/176/194/204/216` → `tests/db/repository/ingredients.test.ts`), validation re-runs (`references:112`, `WI:455, 503` → `validation/*.test.ts`), pagination default (`duplicates:197` → `tests/graphql/pagination.test.ts:85`), per-field signed-out tests (`common-names:72`, `duplicates:233`) → the sweep.
- **Backstop 1:** `tests/db/graphql-query-scopes.test.ts:91-98` (`a null session at every Query field`) gains a sibling loop over `schema.getMutationType()` and, for every Query field taking a workspace, the null-workspace variant, with `PROBES` classified for each.
- `claude-docs/graphql/schema.md:528-530, 567, 610` rewritten to the doctrine MB.180 recorded.

_Estimate:_ 119 → ~50 tests; ~6 s summed.

_Acceptance criteria:_ every kept refusal asserts `extensions.code` through the shared harness with the precondition that would have let it succeed; no test asserts `originalError instanceof` · for every mutation one test per error code the SDL can return · every Query and Mutation field is probed signed-out, and every workspace-taking Query field with a null workspace, by the sweep, which asserts its field list non-empty and equal to the schema's · the loader, SDL, page and mode tests listed stay · `schema.md` says what the GraphQL file holds.

## MB.186 — The vocabulary, identity and coven GraphQL files, the same way · 1.5 h

Same rule and harness over `tests/modules/vocabulary/graphql/{categories,deity-suggestions,form-suggestions,ingredient-form-values,suggestions}.test.ts`, `tests/modules/identity/graphql/{me,set-email,users,user-private-fields}.test.ts`, and `tests/modules/coven/`'s. Known pairs: `users.test.ts:112` → `identity/services/user-list.test.ts:163`; `me.test.ts:73` → the sweep (`route.test.ts:181` also checks it); `vocabulary suggestions:100`, `deity-suggestions:107`, `form-suggestions:113` → the sweep; `form-suggestions:213` (soft-delete one-off) → MB.187's READS row. Per-field `schema.md` sections amended. Same acceptance criteria as MB.185. ~3–4 s summed.

## MB.187 — Services own the rules; repositories own the mechanism · 2 h

- Repository ↔ service pairs, with the owner: `tests/db/repository/vocabularies.test.ts:94-121` (mechanism) ↔ `vocabulary/services/ingredient-form-values:165-193` (rule): both stay, the service rows lose only SQL-shape assertions · `slugs.test.ts:173-250` owns the rename's cases, `ingredient-form-values:533-650` keeps one "a rename follows the rule" · `slugs:75-148` ↔ `compendium-entries:873-909` likewise · `repository/ingredients:462-599` ↔ `services/compendium:143-270`: service keeps every refusal, repository keeps the proof-ANDs-workspace mechanism once · `finders:264-320` ↔ `tests/db/workspace-isolation:117-198` ↔ `workspace-ingredients:339-365, 502, 681`: service tests stay whole; `workspace-isolation.test.ts` **stays** as Story 19's per-entity sweep (`tests/acceptance/README.md` names it) with `:179` (same Forbidden for a real and a fake id, unique), its stale header (`:18-24, :56, :106`) rewritten and its `attemptIngredientUpdate` helper (`:105`) replaced by the real `updateWorkspaceIngredient`; `finders` keeps one per finder family · `repository/spells:135-166` ↔ `spell-visibility:99-214`: same split. E's no-admin-bypass: once per service plus the Story 19 sweep (not ~8 places).
- Soft-delete one-offs `services/compendium:265`, `workspace-ingredients:373`, `duplicates:112`, `common-name-suggestions:139` join the documented READS tables (`workspace-ingredients:804`, `compendium-entries:468`); `suggestIngredients` is added to the table, then `ingredient-suggestions:82` goes. **A service test for compendium-only mode (`workspaceId: null`) is added** as MB.185's twin.
- Validation re-run through services: `references:106` (8 rows → 1), `ingredient-substitutes:153`, `ingredient-deities:255` keep one "the service parses its input and no constraint name leaks" row each.
- `two-transports.test.ts:13-16` header corrected (production fields now read a workspace).
- Docs: `claude-docs/db/workspace-ingredients.md`, `compendium-writes.md` (the READS tables), `tests/acceptance/README.md`.

_Estimate:_ ~40 tests fewer, ~4 s summed.

_Acceptance criteria:_ every service authorization test is direct-id and asserts its precondition; none deleted — the count of `Forbidden` expectations per service file is not lower · each READS table lists every exported reader of its service, `suggestIngredients` included, and no per-reader soft-delete one-off remains · repository tests prove the `Membership` mechanism once per finder family and no service rule · `workspace-isolation` and `two-transports` headers describe the files as they are.

## MB.188 — Catalogue sweeps once, and the auth module imported once per file · 2 h

- `tests/db/audit-columns.test.ts` (112): the `information_schema` half **stays**; the `getTableConfig` per-table presence checks go, subsumed by the exact `[...OWN, ...AUDIT_COLUMNS]` sets in 15 audited + 2 stamped module schema tests (`admin-invitations:41`, `workspace-invitations:39`, `spells:36`, `spell-ingredients:61`, `reference-links:51`, `references:60`, `inventory-items:62`, `ingredient-folk-names:23`, `ingredient-substitutes:45`, `ingredient-deities:45`, `ingredients-schema:51`, `astrology:39`, `deities-schema:25/65`, `ingredient-categories:24`, `spell-categories:29`). `claude-docs/testing/db-harness.md:86` is corrected (module tests assert the exact full set, not "own columns only"). `updated-at-trigger:119/127` go (→ `audit-columns:112/147/190/215`). The per-table "second live row refused / slot freed by soft delete" pairs (`astrology:168/179`, `categories-schema:191/202, 296/305`, `ingredient-forms-schema:242/253, 335/344`, `deities-schema:288/299, 375/384`) become one catalogue sweep over every partial unique index, in `seed-keys.test.ts:98-136`'s shape (the sweep-over-database-objects rule).
- **`tests/support/auth-module.ts`** exporting `importAuth(env)` (`vi.resetModules()` + `import('@/lib/auth')`), called once in `beforeAll` per constant-env file: `tests/db/{account-linking:57, email-change:62, email-verification:54, sign-in-landing:56, last-login-method:55, oauth-token-encryption:49, impersonation:31}`, `identity/services/admin-role:240`; per test only where `ADMIN_BOOTSTRAP_EMAIL` or the impersonation flags vary (`sign-in-landing:55`, `email-verification:323, 401`, `admin-role:239, 266`).
- `tests/lib/auth.test.ts` drops config pins with a behavioural twin (`:507` → `oauth-token-encryption:86`; `:465, 469` → `rate-limiting:69-117`; `:531` → `last-login-method:80`; `:364/368/342` → `account-linking:140/254/180`; `:417/389` → `email-verification:255/108/144`; `:81` duplicates `:417`); keeps `:14, 274, 457 (off outside production), 491, 537` and the session lifetimes. `tests/lib/impersonation.test.ts:117` → `tests/db/impersonation:92`.
- Cross-file owners: `email-change:262` → `identity/services/email.test.ts:156`; `:288` → `provisional-accounts:307`; `:221/423` → `provisional-accounts:174/131`; `email-verification:316-409` → `admin-role:348-400`; `sign-in-landing:118/150` → `admin-role:247/276`; `impersonation:145` → `repository/write.test.ts:185`; `test-database-isolation:19/26` → `seeded-template:39/45`.
- `tests/lib/sign-in.test.ts`'s second `describe('signInPath')` (`:241`) merges into `:65`; `account-email.test.ts:59` imports the unsafe-path strings.
- Docs: `db-harness.md:86`, `claude-docs/db/audit-columns.md`, `claude-docs/auth/*.md` where a pin or file is named.

_Estimate:_ audit-columns 112 → ~45; 8 pair tests → 1 sweep; `tests/db` top level 17 → ~10 s; ~9 s summed.

_Acceptance criteria:_ `audit-columns.test.ts` reads the catalogue for every audited table and asserts `UNAUDITED_TABLES` carry none of the ids; it reads `getTableConfig` nowhere · one test proves, for every partial unique index in the catalogue, that a second live row is refused and the slot freed by soft delete, the index set asserted non-empty first · `@/lib/auth` is imported once per constant-env file, the env stated in its `beforeAll` · each dropped pin's twin is named in the PR table · `db-harness.md` says what module schema tests assert.

## MB.189 — Config moves, the admin pages' half, and the closing measurement · 1.5 h

- **Database-free files out of the `db` project** (14 pay the clone for nothing): `vitest.config.mts`'s `db` include gains excludes for `tests/modules/**/validation/**` and the named pure files (`tests/db/audit.test.ts`, `bootstrap.test.ts`, `repository/index.test.ts` [if it survives MB.184], `coven/schema/workspaces-schema.test.ts`, `coven/services/access-control.test.ts`, `identity/services/{site-admin,workshop-access}.test.ts`, `ingredients/schema/units.test.ts`), and `unit`'s exclude list (`NOT_UNIT`) is narrowed to match; `tests/guards/test-location.test.ts` already reads the config and holds each file to one project.
- `EmailForm`'s two real 1 s waits (`:145, :245`) → `vi.useFakeTimers({ shouldAdvanceTime: true })` as the IngredientForm files already do with MSW (−2 s). `setup-dom.ts` clears `localStorage` after each test (latent: `vitest-setup.test.tsx:40` passes only by its predecessor's `clear()`).
- Admin page tests keep the page's half (search params → service call, guard, NotFound vs other): forms 18 → ~13 (`:323, 155, 113, 301` → `IngredientFormValueList`; `:184, 193` → `IngredientFormValueForm`), categories 16 → ~12 (`:284, 134, 259` → `CategoryList`; `:155, 162` → `CategoryForm`). `CategoryForm` and `IngredientFormValueForm` are duplicated components, so their nine identically-titled tests stay; they share one `it.each` table in `tests/support/` so the next copy is a row, not a file.
- **Closing measurement** in the PR body: the slowest-files block, summed worker time and wall from the job summary, against this plan's baseline.
- Docs: `claude-docs/testing/where-tests-live.md` (which files the `db` project excludes and why), the two admin page docs.

_Acceptance criteria:_ no `db`-project file runs without a database query (asserted by a guard that greps each `db` file for the harness client or a service import) · no file over 10 s in CI's slowest-files block · summed worker time under 140 s and vitest wall under 45 s, recorded in the PR body · the page docs name what each page test keeps.

## Not consolidated, and why

- `tests/acceptance/` — separate deliverable; `ACC-02:77 ≈ SVC-WI:154` stays.
- Service-layer authorization tests — the constraint; repeats are removed only below (repository) and above (GraphQL).
- `audit-columns`'s catalogue half; DB CHECK tests; plan-test row counts; `workspace-isolation.test.ts` (Story 19); `seed-keys` and `graphql-query-scopes` sweeps (they grow, never shrink); `sortable.ts`'s 60 ms waits; `auth.test.ts` pins with no twin; the `CategoryForm`/`IngredientFormValueForm` twins (duplicated code, coverage needs both).
- Playwright — 26 s of tests in a 110–120 s job; owner's decision.

## Verification, end to end

1. Before MB.181: record the baseline block from MB.180's CI run.
2. Per task: `npm run test:coverage` green at the threshold; per-file `coverage-summary.json` for touched `src/` directories not lower; `npm run pre-commit`; the deleted → owner table and the slowest-files block in the PR body; `task-board.mjs sync <ID>`.
3. After MB.189: vitest wall ≤ 45 s, summed ≤ 140 s, no file over 10 s, 80 % threshold held, `npm run test:stories` unchanged (52 lines), `npm run e2e` unchanged (45 tests).
