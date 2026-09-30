# Move type declarations into type-only files

## Context

Types are declared inline beside the code that uses them: 139 `type`/`interface`
declarations across 66 files under `src/`, about 137 in 86 files under `tests/`,
and 17 under `scripts/` (11 already in hand-written `.d.mts` files). The only
type-only file today is `src/lib/session.ts`; `src/db/repository/shapes.ts` is
mostly types plus three runtime predicates. No doc, lint rule or guard names a
convention for where a type lives, so nothing stops the next one landing inline.

The user wants types in their own type files wherever possible. Decisions taken
with the user:

1. **Exceptions that stay in place**: the two branded proofs `Membership` and
   `SiteAdmin`, beside the check that mints them (CLAUDE.md rule 5); any type
   derived from a value declared in the same file (the Zod schema/type name
   pairs, `UnitDimension`/`Unit`, `NomenclatureKind`, `Loaders`, `SeedScenario`,
   `Corner`, `WorkspacePermission`); `Executor` and `Transaction`, which are
   `typeof db` and would need a seventh pinned client-import exemption; and the
   two `declare global`/`declare module` augmentations, which stay beside the
   runtime they type.
2. **Scope**: `src/`, `scripts/` and all of `tests/`, test files included.
3. **Local single-use types move too** (component props, page props, seed Picks).
4. **A mechanical guard** enforces the rule, per CLAUDE.md's sweep-task rule.

Outcome: one `types.ts` per directory that declares types, the guard
`tests/guards/types-in-type-files.test.ts`, the rule written into CLAUDE.md and
`claude-docs/modules.md`, and a decision record carrying the argument.

## The convention

- **A type lives in a type-only file**, by default `types.ts` in the directory
  of the code that uses it. A directory may hold a second type-only file where
  the import graph demands it (`src/lib/session.ts`, below). The guard accepts
  any type-only file, not only the name.
- **A type stays inline only if** its right-hand side reads `typeof` a value
  declared in the same file, it carries a `[brand]` member, or it is on the
  guard's pinned `ALLOWED` list (`select.ts:Executor`, `write.ts:Transaction`).
  Interfaces inside `declare global`/`declare module` are indented, so the
  column-0 scan never sees them.
- **A types file inherits the import reach of everything that imports it.**
  `tests/guards/client-safe-validation.test.ts` follows `import type` edges from
  `src/modules/*/validation/*.ts` and `src/lib/validation.ts` and fails on any
  package but `zod`. So `src/lib/types.ts` imports nothing, `src/lib/session.ts`
  keeps the types that reach the `users` table, and the ingredients validation
  file's helper types go to `validation/types.ts`, not the module's `types.ts`.
- **Module types** live at `src/modules/<m>/types.ts` (module root, not under
  `services/`, so no `import 'server-only'`). The file is internal per
  `isPublic` in `tests/guards/module-boundaries.test.ts:143`; the index adds a
  _named_ `export type { … } from './types'` line so module-internal types stay
  off the surface. Intra-module files import `../types`. `.oxlintrc.json`'s
  deep-import group gains `@/modules/*/types` in all four places it is stated.
- **Repository types** live in `src/db/repository/types.ts` (replacing
  `shapes.ts`); its three predicates move to `predicates.ts`. The index
  re-exports types only as `export type { … }`. No `.select(` or `db.query.`
  text anywhere in `types.ts`, comments included; the leading chunk must not
  match `TIER_READ` (`module-boundaries.test.ts:84`). Already checked: the
  moving doc comments are clean.
- **Scripts** import `import type { … } from './types.ts'` (extension and
  `import type` both required under Node's type stripping).

## Two tasks, two PRs

| Task   | Scope                                                                                      | Size |
| ------ | ------------------------------------------------------------------------------------------ | ---- |
| MB.108 | `src/` + `scripts/` + guard (`ROOTS = ['src', 'scripts']`) + lint + docs + decision record | 7–9h |
| MB.109 | `tests/` + widen `ROOTS` to include `tests`                                                | 4–5h |

Both entries state their size (well over the 1–2h norm). Re-check the next free
id right before minting: MB.106 and MB.107 went to MB.82's own mints. Branch each off
`origin/staging` in a worktree under `/home/node/worktrees`: M5.2 has merged, and
`/app` is on `feature/mb.82-…` with uncommitted work from another session.

**In-flight work.** MB.82's uncommitted diff (22 modified files plus the new
`src/db/repository/slugs.ts` and its test) adds four declarations, folded into
the maps below: `IngredientRow` (a third private copy) and `SlugRedirect` in
`slugs.ts`, and `CompendiumWrite` (replacing `CompendiumValues`) and
`CompendiumAddress` in `services/compendium.ts`. It also edits the repository
index, `write.ts`, `workspace-ingredients.ts`, `module-boundaries.test.ts` and
`soft-delete-finder-guard.test.ts`, all of which PR 1 rewrites, and the
ingredients schema tests PR 2 moves. **Both PRs land after MB.82 merges.** The
file maps below are today's inventory: the guard's red run at step 1 of each
PR re-inventories whatever has landed by then, and that list, not this plan,
is the checklist.

Minting (the auto-mode classifier refuses `gh` writes, so the user runs these):

```sh
gh issue create --title "MB.108 — Move type declarations into type-only files" --type Bug --label tracked --milestone "<wave>" --body-file <notes>
node scripts/task-board.mjs estimate MB.108 8
node scripts/task-board.mjs reorder --apply
```

Same for MB.109, estimate 5. `TASKS.md` entry, execution-order row, summary
table and milestone description edited in the same pass.

## File map: `src/` and `scripts/` (PR 1)

| New file                                           | Holds (from)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/types.ts` (imports nothing)               | `ConnectionArgs`, `Cursor`, `PageRequest`, `PageEntry`, `PageCount`, `Page` (pagination.ts); `ProviderId`, `SocialProvider`, `LinkedAccount` (social-providers.ts); `ValidationIssue` (errors.ts); `VariablesArg` (graphql-client.ts); `Fields` → renamed `ErrorChainFields` (unique-violation.ts); `Message`, `Outgoing` (mail.ts)                                                                                                                                                                                                                                                                                 |
| `src/lib/session.ts` (exists, grows)               | keeps `UserRole`, `Session`; gains `SessionState` (request-session.ts) and `HookContext` (auth.ts, needs `import type { createAuthMiddleware } from 'better-auth/api'`)                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `src/db/types.ts`                                  | `UsersIdReference`, `AuditOperation`, `AuditSession`, `AuditFields`, `WithoutAuditFields` (audit.ts)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `src/db/repository/types.ts`                       | the 14 from `shapes.ts`; `SortColumn`, `SortPart`, `KeyOrder`, `Keyset`, `KeysetCount`, `Similarity`, `Derived` (select.ts); `AuditWriter` (write.ts); `SimilarityScore`, `IngredientFilter`, `CompendiumScore`, `IngredientIdentity` (ingredients.ts); `SuggestingVocabulary`, `VocabularySuggestion`, `FormSuggestion` (vocabularies.ts); `Claimant`, `SuggestionRow` (suggestion-page.ts); `CommonNameSuggestion` (common-names.ts); `SlugRedirect` and the one `IngredientRow` (slugs.ts, MB.82) — the single `typeof ingredients.$inferSelect`, which the ingredients module re-exports rather than redeclares |
| `src/db/repository/predicates.ts`                  | `scopedTo`, `inCompendium`, `notSoftDeleted` (shapes.ts). `inCompendium` keeps its own chunk, so `TIER_SEAM` still holds. Nine `./shapes` importers to split (`slugs.ts` included)                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `src/db/seed/types.ts`                             | 21 types: `SeedUser` deduped (minimal.ts + bootstrap-admin.ts identical; standard.ts's variant → `FixtureUser`), `SeedDatabase`, `SeedTransaction`, the `Seed*` Picks from standard.ts/demo.ts/categories.ts/forms.ts/astrology.ts, `GroupTable`, `ItemTable`, `TwoTierVocabulary`, `FlatTable`, `InsertStamps`. `SeedScenario` stays                                                                                                                                                                                                                                                                               |
| `src/graphql/types.ts`                             | `Context` (context.ts), `SchemaTypes` (builder.ts), `ErrorCode`, `ErrorExtensions` (errors.ts), `PagedConnectionOptions`, `Counted` (pagination.ts). Pothos's own `SchemaTypes` is imported as `CoreSchemaTypes` to avoid the collision                                                                                                                                                                                                                                                                                                                                                                             |
| `src/graphql/loaders/types.ts`                     | `LoaderFactory` (define-loader.ts), `Built` (index.ts). `Loaders` stays                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `src/graphql/schema/types.ts`                      | `Stamps` (schema/audit.ts)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `src/emails/types.ts`, `src/emails/parts/types.ts` | `EmailTheme`, `VerifyEmailPurpose`, `VerifyEmailProps`; `EmailLayoutProps`, `Part`. `Corner` stays. Repoint `.ladle/EmailPreview.tsx` and the email story                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `src/components/<Name>/types.ts` ×4                | `EmailFormProps` + `Failure`, `WelcomeProps`, `SignInMethodsProps`, `SignInPanelProps`. Stories import `from './types'`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `src/app/{sign-in,account,account/email}/types.ts` | the three page props interfaces                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `src/modules/identity/types.ts`                    | `EmailVerificationSender`, `UserRow`, `SignInProfile`, `PrimaryAdminOutcome`; index re-exports all four. `SiteAdmin` stays                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `src/modules/coven/types.ts`                       | `WorkspaceRole`, `WorkspaceRow`, `MembershipWithWorkspace`; index re-exports all three. `Membership`, `WorkspacePermission` stay                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `src/modules/vocabulary/types.ts`                  | `IngredientFormValueRow`, `CategoryGroupRow`, `IngredientFormGroupRow`; index re-exports all three                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `src/modules/ingredients/types.ts`                 | `export type { IngredientRow } from '@/db/repository'` (replacing the copies in compendium.ts and workspace-ingredients.ts); `CompendiumWrite`, `CompendiumAddress` (compendium.ts, MB.82), `IngredientValues`, `IngredientFields`, `IngredientKey`, `CategoryRow`; index re-exports `IngredientRow`, `CompendiumAddress` (what `resolveCompendiumSlug` returns to the public route), `IngredientKey`, `CategoryRow`                                                                                                                                                                                                |
| `src/modules/ingredients/validation/types.ts`      | `Lists`, `Parsed` (validation/ingredient.ts); imports only `type { NomenclatureKind }` from `../schema/ingredient-enums`, which has no imports                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `src/modules/grimoire/types.ts`                    | `SpellVisibility`; index re-exports it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `scripts/types.ts`                                 | `Finding` (check-destructive-ddl.ts); `Classification`, `Verdict`, `Failure`, `AssertionResult` (assert-pulled-env.ts); `ProbeResult` (probe-database.ts)                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

No `schema/types.ts` anywhere: the only types under `schema/` are value-bound.
`src/gql/` is generated and untouched.

## File map: `tests/` (PR 2)

23 `types.ts` files, about 130 declarations, about 30 renames where a name was
reused for a different shape (`Node`/`Connection` in the GraphQL tests, `Row`,
`UserRow`, `Probe`). Representative entries:

- `tests/support/types.ts`, `tests/support/db/types.ts` (adds the one `Logged`,
  deduped from four tests), `tests/support/fixtures/types.ts` (schema tables
  stay `import type`; the folder may not import `drizzle-orm` at runtime),
  `tests/support/msw/types.ts`. `tests/support/oauth.ts`'s `ProviderId`
  duplicates src: import it from `@/lib/types` instead.
- `tests/guards/types.ts`: `Diagnostic` ×4, `Step` ×4, `Job` ×3 deduped to one
  superset each; `Workflow` ×3 → `Workflow` plus a `GateWorkflow` narrowing;
  the new guard's own interfaces (it must obey itself).
- `tests/db/**`, `tests/modules/**`, `tests/graphql`, `tests/lib`,
  `tests/emails`, `tests/components/EmailForm`, `tests/rsc/modules/coven`,
  `tests/e2e`, `tests/acceptance`: one `types.ts` each where the directory has
  column-0 declarations. `Visibility` ×2 → `SpellVisibility` from
  `@/modules/grimoire`. `Leaf` in `tests/db/pagination.test.ts` stays (bound to
  a table declared in the file).
- Eight declarations nested inside function or `describe` bodies stay: the guard
  scans column 0 only.

## The guard: `tests/guards/types-in-type-files.test.ts`

- **Scan**: `git ls-files --cached --others --exclude-standard` over `ROOTS`
  (`src`, `scripts`; PR 2 adds `tests`), as `module-boundaries.test.ts:92-99`
  does. Skip `src/gql/`, `*.d.ts`/`*.d.mts`, `__lint-probe*` directories, and
  files gone from the tree.
- **Type-only file**: every non-blank column-0 line starts with `import `,
  `export type `, `export interface `, `type `, `interface `, `declare `,
  `export declare `, a closer (`}`, `>`, `)`, `]`) or a comment opener. Such a
  file is exempt whatever its name.
- **Head**: `/^(?:export )?(?:type|interface) ([A-Za-z_$][\w$]*)/gm`. The
  identifier excludes `export type { X } from` and `export type * from`.
- **Extent**: walk from the head tracking `{ ( [` depth, skipping string
  literals and comments; a `type` ends at the first `;` at depth 0, an
  `interface` at the `}` returning to depth 0. Model on the brace matcher in
  `soft-delete-finder-guard.test.ts:113-128`.
- **Exempt if**: the extent (comments stripped) matches `typeof <ident>` and the
  file declares `<ident>` at column 0 as `const|let|function|class`; or the
  extent contains `[brand]`; or `file:Name` is in `ALLOWED`.
- **Honesty checks**, in the repo's usual shape: each `ALLOWED` entry must still
  exist as a column-0 declaration (like `TIER_SEAM`'s stale check); a
  precondition that the scan classified `membership.ts:Membership` and
  `site-admin.ts:SiteAdmin` as brand exemptions and
  `validation/ingredient.ts:CompendiumIngredientInput` as a `typeof` exemption,
  so an empty scan cannot pass.
- Written first and run red: its failure list is the checklist for the moves.

## Existing guards, lint and tests to update (PR 1)

- `.oxlintrc.json`: add `"@/modules/*/types"` to the deep-import group in all
  four places (top level and the three overrides), and "types" to its message.
- `tests/guards/lint-access-boundary.test.ts`: add `'@/db/types'` to
  `DB_SPECIFIERS` (line 85); repoint the `@/db/audit` probe (114) to
  `@/db/types` and the `@/db/repository/select` probe (217) to
  `@/db/repository/types`; add a `types` case to the deep probes (160-176) so
  the new lint entry is pinned in every override.
- `src/db/repository/index.ts`: `withAudit` alone from `./write`; the two
  slug finders alone from `./slugs`; one
  `export type { AuditWriter, Claimant, CommonNameSuggestion, CompendiumScore, FormSuggestion, IngredientFilter, IngredientIdentity, IngredientRow, SimilarityScore, SlugRedirect, SortPart, SuggestingVocabulary, VocabularySuggestion } from './types'`.
  `Keyset`, `KeyOrder`, `Similarity`, `Derived`, `SuggestionRow` stay internal.
- Test imports that must move in PR 1 or typecheck fails: six
  `import type { Context } from '@/graphql/context'` lines, `tests/support/msw/graphql.ts`'s
  `ErrorCode`, `tests/support/as-user.test.ts`'s `AuditSession`.
- Unchanged and verified still true: `server-only-services` (no new file under
  `services/`), `soft-delete-finder-guard` (index reads only `export {` lines),
  `tests/db/repository/index.test.ts` (types absent from `Object.keys`),
  `workshop-guards` (extra `.ts` in a component folder is fine),
  `lint-service-session-boundary` (`Session` stays at `@/lib/session`).

## Docs to update (PR 1)

- `CLAUDE.md`: one Conventions bullet stating the rule, the four exception
  categories and the guard; the Modules bullet adds `types.ts` as internal,
  reached through the index.
- `claude-docs/modules.md`: layout block (line 15-21) adds `types.ts`; "The
  public surface" names it internal (98-99); line 188 `shapes.ts` → `predicates.ts`.
- `claude-docs/db.md`: "The repository's files" table (1633-1635) gets
  `types.ts` and `predicates.ts` rows and loses `shapes.ts`, keeping the
  `slugs.ts` row MB.82 owes it; lines 1986 and 3377 follow the moves.
- `claude-docs/validation.md`: table at 18-20 adds `validation/types.ts`.
- `claude-docs/components/sign-in-methods.md:15`: `LinkedAccount` now in `src/lib/types.ts`.
- `claude-docs/testing.md:100`: `src/vitest-env.d.ts` → `tests/vitest-env.d.ts`
  (stale already; rides along, named in the PR body).
- `src/lib/pagination.ts:8-10` comment: its types now live in `lib/types.ts`.
- New `claude-docs/design-decisions/mb.108-types-in-type-files.md`: the
  exception set and why, the lib split forced by the client-safe reach, why
  module types sit at the module root rather than under `services/`.
- Copy of this plan to `claude-docs/design-decisions/mb.108-plan.md`.
- Left as history: `mb.87-plan.md`, `m4.8-plan.md`, `m8.5-plan.md` mentions of
  `shapes.ts`; a one-line "superseded by MB.108" pointer atop `mb.87-plan.md`.

## Steps

**PR 1 (MB.108)**, each step followed by `npm run typecheck && npm run lint`:

1. Write the guard with `ROOTS = ['src', 'scripts']`; run it, expect ~115
   failures.
2. `src/lib/types.ts` and the `session.ts` additions; repoint every lib
   importer, `src/graphql/{errors,pagination}.ts`, the repository finders,
   emails, components, stories, `.ladle/EmailPreview.tsx`.
3. `src/db/types.ts`; repoint five importers and the lint probe string.
4. Repository: `shapes.ts` → `types.ts` + `predicates.ts`; absorb the six files'
   types; rewrite the eight `./shapes` importers and the index; update `db.md`
   and `modules.md:188`. Run `soft-delete-finder-guard`, `module-boundaries`,
   `tests/db/repository/index.test.ts`.
5. `src/db/seed/types.ts`; repoint the seed files. Run `SEED_SCENARIO=standard npm run db:seed`
   against local Postgres to prove the `tsx` path.
6. `src/graphql/{types,loaders/types,schema/types}.ts`; repoint the host files
   and the seven test imports. Run `tests/graphql` and `lint-loader-boundary`.
7. Five module `types.ts` plus `ingredients/validation/types.ts`; named
   `export type` line in each index; repoint intra-module importers. Run
   `client-safe-validation`, `module-boundaries`, `server-only-services`.
   Update `modules.md`, `validation.md`, `CLAUDE.md`.
8. `.oxlintrc.json` ×4 and the `lint-access-boundary` probes.
9. `scripts/types.ts` with `import type … from './types.ts'`; run
   `npm run check:destructive-ddl` and `node --check scripts/probe-database.ts`
   to prove Node's stripping accepts it; run the three script guard tests.
10. Guard green. Remaining docs, decision record, plan copy;
    run `doc-citation`.
11. Full pass (Verification below).

**PR 2 (MB.109)**:

1. Add `'tests'` to `ROOTS`; run the guard, expect ~130 failures.
2. `tests/support/**` first (everything else imports it). Typecheck.
3. `tests/guards/types.ts` with the dedupes and the guard's own interfaces.
   Run `tests/guards`.
4. `tests/db/**` (renames per table, `Visibility` → `SpellVisibility`).
   Run the `db` project over `tests/db`.
5. `tests/modules/**`. Run the `db` project over `tests/modules`.
6. `tests/graphql`, `tests/lib`, `tests/emails`, `tests/components/EmailForm`,
   `tests/rsc`, `tests/e2e`, `tests/acceptance`.
7. Full pass.

## Verification

```sh
npm run typecheck && npm run lint && npm run format:check
npm run test:coverage        # 80% threshold; type-only files add no statements (session.ts is the precedent)
npm run build                # RSC graph: Vitest green is not build green
npm run test:stories         # acceptance suite (PR 2 touches it)
npm run workshop:build       # stories import ./types
npm run check:destructive-ddl && node --check scripts/probe-database.ts   # PR 1 step 9
```

The guard's own red-then-green run is the end-to-end check: red on the
untouched tree listing every inline declaration, green once the moves are done,
and its precondition tests prove the exemptions are being classified rather than
the scan coming back empty.

## Rejected alternatives

- **Per-file sidecars** (`select.types.ts`): doubles the file count and each
  under `services/` would need `import 'server-only'`.
- **Moving the brands** with their `declare const brand`: compiles, but
  rewrites rule 5's wording and both proof sections in `db.md`.
- **Exporting `LOADERS`** to move `Loaders`: widens a composition point's
  surface for one type.
- **Folding `session.ts` into `lib/types.ts`**: impossible while
  `lib/validation.ts` reaches `lib/types.ts` through `errors.ts`, because
  `UserRole` reaches the `users` table and so `drizzle-orm`.
- **Inlining the three page props** in the function signature: no declaration
  and no file, but an anonymous type in a code file is what the rule is
  against, and the user chose to move them.
