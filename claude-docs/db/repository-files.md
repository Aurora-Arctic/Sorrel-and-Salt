## The repository's files (MB.87)

`src/db/repository/` is one file per concern, and callers import only its
`index.ts` — `@/db/repository` resolves to it:

| File                   | Holds                                                                                                                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`             | Named re-exports only — the pinned surface below — and nothing declared                                                                                                                                                               |
| `types.ts`             | The table shapes a finder or writer admits, the options `selectFrom` reads, the `AuditWriter`, and what a finder takes and returns; the index re-exports the last two                                                                 |
| `predicates.ts`        | The `scopedTo`, `inCompendium` and `notSoftDeleted` predicates, each decided by the table's shape, and `containsText`, the admin lists' literal substring match                                                                       |
| `write.ts`             | `withAudit` and the writer it builds, spreading in the named writes of each table marked `namedWrites` from the file beside its finders (MB.198)                                                                                      |
| `select.ts`            | `selectFrom` and `existsIn`, the two places a read query is built; the keyset bounds a page is cut by; the two similarity thresholds                                                                                                  |
| `ingredients.ts`       | The ingredient finders: the fuzzy-duplicate match, the compendium list and its count, one entry, an entry by identity, an ingredient's children, and the hatch reading its substitutes with the ingredients they link, deleted or not |
| `slugs.ts`             | The compendium entry at a slug, and the redirect from a retired one                                                                                                                                                                   |
| `vocabularies.ts`      | `findVocabularySuggestions`, the planet, zodiac, form and deity autofill; `findIngredientFormValues`, `findCategoryPage` and `findCategoryCount`; and `findCuratedRowsByName`, the rows the compendium is held to (MB.162)            |
| `common-names.ts`      | `findCommonNameSuggestions`, the common-name autofill                                                                                                                                                                                 |
| `suggestion-page.ts`   | The keyset page and claimant list the two autofills share                                                                                                                                                                             |
| `finders.ts`           | The generic finders, scoped and unscoped — `findOneBySlug` among them (M5.6) — and the escape hatch                                                                                                                                   |
| `spells.ts`            | The three spell finders, the `readableSpells` predicate they share, and the two hatches that read what a spell holds past a tombstone                                                                                                 |
| `memberships.ts`       | Two of the four reads that take no proof                                                                                                                                                                                              |
| `users.ts`             | The third of them: the live row holding an address; and the admin user list's page and providers, under the `SiteAdmin` proof (MB.52)                                                                                                 |
| `provisional-users.ts` | The provisional-account delete                                                                                                                                                                                                        |
| `admin-invitations.ts` | The live admin invitation a link's token names, the fourth read that takes no proof (MB.69), and the table's named insert, accept and revoke, which `writerFor` spreads into the writer (MB.198)                                      |
| `tokens.ts`            | `hashToken`, the one place a link's token is hashed, so no caller holds a hash (MB.69)                                                                                                                                                |
| `admin-roles.ts`       | The open admin-role-change pause, under the `SiteAdmin` proof (MB.62), and the pause ledger's named pause and resume, which `writerFor` spreads into the writer (MB.198)                                                              |

**The rest of the folder is internal, and that is enforced rather than
conventional.** `selectFrom` and `existsIn` are exported from `select.ts`
because the finders beside them build on them, so the language no longer keeps
them private as it did when the repository was one file. What keeps them inside the folder is a
`no-restricted-imports` group banning `@/db/repository/*` and
`**/db/repository/*` everywhere (restated in each override, which replaces
rather than merges), and `tests/guards/module-boundaries.test.ts`, which
resolves every import in `src/` and fails any edge into the folder that is
not its index — the spellings a glob cannot see included. The index itself
declares nothing and has no `export *`, so what it names _is_ the surface;
`soft-delete-finder-guard.test.ts` asserts both. Import order is not
load-bearing (["The seed module"](seed-module.md)), and
`tests/db/repository/index.test.ts` pins that entering the database layer here
builds `users` with its audit columns.
