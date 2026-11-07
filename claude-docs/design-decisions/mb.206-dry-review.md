# Backend DRY review

**Status:** decided. Live home: `CLAUDE.md`, "Non-negotiable architecture rules"; the shared helpers are in `src/lib/validation.ts` and `src/lib/citation.ts`.

## Decision

- **A DRY refactor is pure unless its entry says otherwise.** The service, repository and validation tests are the proof and stay green. A test that has to change is a behaviour change and is named in the PR body.
- **Constraints a refactor keeps:** authorization in services with the `Membership` or `SiteAdmin` proof taken first; only `src/db/repository/` imports the client and only `select.ts` and `write.ts` build queries; no `drizzle-orm` at runtime above the repository; every list through `t.pagedConnection` and `findPage`; loaders through `define-loader.ts`; types in type-only files (`tests/guards/types-in-type-files.test.ts`); modules reach each other through `@/modules/<name>` only; every service opens with `import 'server-only'`. Migrations are forward-only, so no column or index is renamed to tidy a schema.
- **A new helper file inside a module is not re-exported from the module's index** (`group-moves.ts` and `held-entries.ts` are the precedent) unless another module needs it.
- **Mechanism plus guard where a guard is cheap**: the soft-delete finder guard's regex widens for each new predicate name in the same PR, and a lint `no-restricted-syntax` entry keeps the session narrowing out of resolvers once `sessionOf` exists.
- **Coverage must not drop per touched `src/` directory**, compared in `.reports/coverage/coverage-summary.json` before and after.
- **Validation has one of each shared piece.** `src/lib/validation.ts` holds `requiredText(message)`, `optionalText()` and `curatedValueInput(noun)` (the six name-and-description pairs); no validation file declares its own `requiredText` or hex or day regex. Ids use `RowId = z.guid()`, never `z.uuid()`, because a hand-written fixture id fails `z.uuid()`. The link-or-name rule is one `linkOrNameRules(field, idKey, messages)` with `LinkOrName<IdKey>` types in `validation/types.ts`, and the case-folded seen-set loop is written once. `ReferenceTextField` is `Exclude<keyof CitationFields, 'kind'>`, `REFERENCE_TEXT_FIELDS` is exported from `reference-format.ts`'s `FORMAT_OF`, and `ISO_DAY` and the quotation-mark set live in `lib/citation.ts`. `lib/contrast.ts` exports `HEX_COLOR` and `channels`.

## Why

A hidden behaviour change inside a refactor is unreviewable, so the existing tests are the fixed point. `z.uuid()` in the category, deity and form-value validators was a bug: it rejected ids that `RowId` accepts.

## Rules out

- Renaming a column or index to tidy a schema.
- Re-exporting a module-private helper from its index.
- Per-file copies of `requiredText`, hex or day regexes.
