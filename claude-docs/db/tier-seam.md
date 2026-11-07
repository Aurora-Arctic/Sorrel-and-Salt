# The tier seam

The compendium's future extraction unit is the compendium tier of
`ingredients` plus `vocabulary`. What would make that extraction a rewrite is
an uncounted set of reads that cross from a workspace's rows into the
compendium's. So the set is counted, here: **this section names every top-level function in
`src/db/repository/` whose SQL reads the compendium tier**, exported or not —
anything calling `inCompendium(…)`, the predicate's one spelling,
or one of the builders that read both tiers through it — `inTiers`,
`readableInTiers`, `readableIngredientParent` and `findPageInTiers` with its
count, each the one spelling of its read — or writing
`workspace_id is null` or `isNull(workspaceId)` out by hand, and anything
that reads both tiers in one statement. A predicate is named by the
declaration it is written in, and a private helper under its own name rather
than credited to whichever export happens to sit above it. Review holds the
list; no guard pins it.

The list follows, by file. Nothing checks it, so it states no total that
could go stale: review compares it with the code. "Compendium" in the last column means
the read touches the compendium tier alone; "both" means it reads the
compendium and a coven's rows in one statement.

**The predicate and the builders over it.** Every other entry reads the tier
through one of these.

| Name                       | File                   | What it is                                                                                   | Reads      |
| -------------------------- | ---------------------- | -------------------------------------------------------------------------------------------- | ---------- |
| `inCompendium`             | `predicates.ts`        | The predicate itself, `workspace_id IS NULL`                                                 | compendium |
| `inTiers`                  | `predicates.ts`        | The compendium or the proofs' covens                                                         | both       |
| `readableInTiers`          | `predicates.ts`        | `inTiers`, live rows only                                                                    | both       |
| `readableIngredientParent` | `ingredient-parent.ts` | A child row's ingredient is readable                                                         | both       |
| `inUseIngredientParent`    | `ingredient-parent.ts` | `readableIngredientParent`, or a retired compendium entry the reading coven's cupboard names | both       |
| `inUseVariantParent`       | `ingredient-parent.ts` | The same, through a form                                                                     | both       |
| `findPageInTiers`          | `finders.ts`           | A cursor page (one that resumes from the last row) over `readableInTiers`                    | both       |
| `findPageCountInTiers`     | `finders.ts`           | Its count                                                                                    | both       |

**The functions.**

| Name                                          | File                   | What it reads                                                                                                                                  | Reads      |
| --------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `findSimilarIngredients`                      | `ingredients.ts`       | The fuzzy duplicate match                                                                                                                      | both       |
| `findManyIngredients`                         | `ingredients.ts`       | A loader's batch of ingredients by id                                                                                                          | both       |
| `findOneIngredient`                           | `ingredients.ts`       | One row in the compendium or a proof's coven                                                                                                   | both       |
| `findReadableVariant`                         | `ingredients.ts`       | The form a jar may name; never a retired entry's                                                                                               | both       |
| `findManyOfIngredients`                       | `ingredients.ts`       | An ingredient's folk names and category links                                                                                                  | both       |
| `findManyOfVariants`                          | `ingredients.ts`       | The rows one form of an ingredient owns                                                                                                        | both       |
| `findDeitiesOfIngredients`                    | `ingredients.ts`       | An ingredient's deities                                                                                                                        | both       |
| `findSubstitutesIncludingSoftDeleted`         | `ingredients.ts`       | An ingredient's or a form's substitutes and the ingredients they link, deleted or not                                                          | both       |
| `findIngredientSuggestions`                   | `ingredients.ts`       | The substitute picker's search                                                                                                                 | both       |
| `findCompendiumPage`                          | `ingredients.ts`       | The public list                                                                                                                                | compendium |
| `findCompendiumCount`                         | `ingredients.ts`       | Its count                                                                                                                                      | compendium |
| `findCompendiumEntryByIdentity`               | `ingredients.ts`       | The entry a colliding compendium write names                                                                                                   | compendium |
| `workspaceListScopeIncludingSoftDeleted`      | `ingredients.ts`       | Which rows a coven's ingredient list holds, a retired entry its cupboard names included; the coven's page, count and filter counts all read it | both       |
| `listColumns`                                 | `ingredients.ts`       | The cupboard row joined beside a compendium entry, so a coven's overrides sort and filter                                                      | both       |
| `findCompendiumFacets`                        | `ingredient-facets.ts` | The public list's filter counts                                                                                                                | compendium |
| `inCupboard`                                  | `cupboard-entries.ts`  | The private filter under `findCupboardEntry` and `findCupboardEntriesOf`: a cupboard row only while its entry is live                          | both       |
| `findCupboardEntryIncludingSoftDeleted`       | `cupboard-entries.ts`  | The escape hatch that reads a retired entry for a coven whose live cupboard row names it                                                       | both       |
| `compendiumNamed`                             | `cupboard-entries.ts`  | The private match on a typed name or formal name under `findCompendiumMatchesByName` and `findCompendiumMatchPage`                             | compendium |
| `findCompendiumMatchPage`                     | `cupboard-entries.ts`  | Those exact matches as a page, for the Add flow                                                                                                | compendium |
| `countCovensUsing`                            | `cupboard-entries.ts`  | How many covens' cupboards name an entry, a number and never a name                                                                            | both       |
| `findCompendiumEntryBySlug`                   | `slugs.ts`             | The entry at an address                                                                                                                        | compendium |
| `findCompendiumSlugRedirect`                  | `slugs.ts`             | The entry a retired address redirects to                                                                                                       | compendium |
| `findCompendiumSlugs`                         | `slugs.ts`             | Every live entry's address, for the sitemap and `llms.txt`                                                                                     | compendium |
| `findManyStock`                               | `stock.ts`             | The private read under a coven's jar finders: jars of a readable form, or of a retired entry the coven uses                                    | both       |
| `findIngredientsInSpellsIncludingSoftDeleted` | `spells.ts`            | What a readable spell holds, deleted or not                                                                                                    | both       |
| `findVocabularySuggestions`                   | `vocabularies.ts`      | The celestial body, zodiac and form autofill                                                                                                   | both       |
| `findCompendiumFormRenameClashes`             | `vocabularies.ts`      | The entries a curated form's rename would give two forms of one name                                                                           | compendium |
| `findCommonNameSuggestions`                   | `common-names.ts`      | The common-name autofill                                                                                                                       | both       |
| `findReferencesOf`                            | `references.ts`        | A sourced row's references, each where its readers may look                                                                                    | both       |
| `findManyReferences`                          | `references.ts`        | What a row written under the proofs may cite                                                                                                   | both       |
| `findReferenceSuggestions`                    | `references.ts`        | The reference picker's search                                                                                                                  | both       |
| `cites`                                       | `references.ts`        | A sourced row citing a live compendium reference                                                                                               | compendium |
| `writerFor`                                   | `write.ts`             | The private builder of `withAudit`'s writer (below)                                                                                            | compendium |

Three kinds of caller are deliberately left off, because they reach the tier
only through an entry above. That is the rule for a private helper, applied
the other way round:

- `findCompendiumMatchesByName` reads it through `compendiumNamed`.
- `citesNothing` (the keeper's to-do filter) and `citesNowhere` in
  `ingredients.ts` are `cites` negated.
- `findWorkspaceIngredientPage`, `findWorkspaceIngredientCount` and
  `findWorkspaceIngredientFacets` read it through
  `workspaceListScopeIncludingSoftDeleted`, as `findCupboardEntry` and
  `findCupboardEntriesOf` read it through `inCupboard`.

`writerFor`'s compendium-tier methods update and soft-delete a row only under
`workspace_id IS NULL`, clear the tier's lapsed slug retirements, and carry a
curated form's rename onto the compendium variants picking it
(`carryFormRename`).

A later task that adds such a function adds its row to the tables above in
its own PR. The list is then the scope of the extraction task, read from one
file.

One entry is not the compendium's: `onSiteTier`, `invitations`'
site tier, `workspace_id IS NULL` spelled for that table alone so that no
invitation read calls `inCompendium`. It is listed because it spells the
tier's predicate, and the extraction task leaves it behind.

**Ingredient variants.** The table of an ingredient's forms, `ingredient_variants`, is `ingredients`' own, beside its other children, and `vocabulary` keeps `ingredient_forms`, the names a variant's form is picked from (DESIGN.md §5). The vocabulary reaches variants as it reaches ingredients: `IN_USE.ingredient_forms` and the `formId` filter point at variants through the `TWO_TIER` registry, and a form's rename carries onto the compendium variants picking it, through the writer above. `inUseVariantParent` and `findManyOfVariants` each read both tiers and are in the tables above ([`design-decisions/mb.215-ingredient-variants.md`](../design-decisions/mb.215-ingredient-variants.md)).
