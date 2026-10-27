## Loaders: one set per request, never at module level

A DataLoader caches for as long as its instance lives. One built at module
level would outlive the request and serve one viewer's answers to the next
(CLAUDE.md rules 6 and 9), so the construction is made impossible rather than
merely absent:

- **`defineLoader(batch)`** in `src/graphql/loaders/define-loader.ts` returns a
  _factory_, `(session) => DataLoader`, not an instance; its type,
  `LoaderFactory`, is in `loaders/types.ts`, which imports `dataloader` as a
  type only. `batch` receives the
  request's session first, because the service it batches takes one too: a
  loader batches a service call and never bypasses one.
- **`src/graphql/loaders/index.ts`** registers each factory in `LOADERS`, under
  the name a resolver reads it by. `createLoaders(session)` calls every factory
  and is called only by `createContext`. Each loader arrives with the schema it
  loads: `membershipsByUser` (`coven`, for `User.memberships`),
  `memberEmailsByMember` (`coven`, for the owner-only `WorkspaceMember.email`,
  M11.19: keyed `{ workspaceId, userId }`, one check and one read per coven a
  batch names, a `Forbidden` per key to anyone but an owner),
  `providersByUser` (`identity`, for `User.providers`, MB.52),
  `usersByIdForAdmin` (`identity`, for `PrivilegeChange.subject` and
  `.actor`, MB.199), `usersById` (`identity`, a co-member's display name, MB.10,
  landed ahead of the fields that read it, M6.11's `WorkspaceMember.user` and
  M6.18's last editor; [`auth/display-names.md`](../auth/display-names.md)),
  `ingredientsById` (`ingredients`, an ingredient by id for the row that names
  it, MB.9: keyed `{ id, workspaceId }`, cached by the id, null for a missing,
  soft-deleted or other-coven id; read by M9.4's `InventoryItem.ingredient`
  and M10's `SpellIngredient.ingredient`),
  `categoriesByIngredient`, `folkNamesByIngredient`,
  `substitutesByIngredient`, `deitiesByIngredient`, `referencesByIngredient`
  and `variantsByIngredient` (`ingredients`, for `Ingredient.categories`,
  `Ingredient.folkNames` (each a `FolkName`, an id and a name), `Ingredient.substitutes`, `Ingredient.deities`,
  `Ingredient.references` and `Ingredient.variants`, the last MB.218's),
  `categoriesByVariant`, `substitutesByVariant` and `referencesByVariant`
  (`ingredients`, for `IngredientVariant`'s three, MB.218),
  and `categoryGroupsById`, `ingredientFormGroupsById`, `deityTraditionsById`
  and `ingredientFormsById` (`vocabulary`, for `Category.group`,
  `IngredientFormValue.group`, `Deity.tradition` and `IngredientVariant.formChoice`;
  the last two MB.167's), `otherNamesByDeity` (`vocabulary`, for
  `Deity.otherNames`, M14.23), and `stockByIngredient` (`ingredients`, for
  `Ingredient.stock`, M9.4: keyed `{ ingredientId, workspaceId }`, cached by
  `workspaceId:ingredientId`, a refused coven a `Forbidden` in its own slots;
  `clearStock` drops one key after an add or update, and `deleteStock` clears
  it whole), and `cupboardEntryByIngredient` (`ingredients`, for
  `Ingredient.cupboardEntry`, M12.14: keyed and cached as `stockByIngredient`
  is, a refused coven a `Forbidden` in its own slots, and nothing clears it,
  since no write answers a cupboard entry yet), and `stepsBySpell`, `assignedCategoriesBySpell` and `derivedCategoriesBySpell` (`grimoire`, for `Spell.steps`, `Spell.categories` and `Spell.derivedCategories`, with `Spell.categoryGaps` worked out from the last two, M10.9: keyed `{ id, workspaceId }`, cached by the spell id, a refused coven a `Forbidden` in its own slots, and a spell the reader may not see answering empty). M6.11 adds no
  `membersByWorkspace`: `Workspace.members` reads a coven at a time
  ([`m6.11-members-without-a-loader.md`](../design-decisions/m6.11-members-without-a-loader.md)). A test that builds a context
  by hand calls `createLoaders(session)` rather than passing `{}`, which the
  `Loaders` type no longer admits. A factory is written in its module's `loaders/`, exported
  through the module's index, and spread into `LOADERS` here
  ([`modules.md`](../modules.md)).
- **A loader keyed by an object** passes `cacheKeyFn`, and `defineLoader`'s
  third type parameter names what it returns. The six ingredient loaders are
  keyed by the parent row's `{ id, workspaceId }` and cached by `id`. They are
  one record in `loaders/ingredient-children.ts`, each exported by name for
  `LOADERS`, and `clearIngredientChildren(loaders, row)` clears a row from
  every one in it, so an ingredient write clears a loader added there without
  naming it (MB.211). A variant's three child loaders are keyed by the variant
  row's `{ id, ingredientId, workspaceId }` in a record of their own, which
  `clearIngredientChildren` empties whole: a write knows its ingredient, not
  which of its variants the request has loaded (MB.218). The
  service needs the `workspaceId` to know which coven to check without a read
  of its own, and it never trusts it as the scope
  ([`db/ingredient-children.md`](../db/ingredient-children.md),
  "Ingredient children"). The three group loaders are keyed by id, and a group
  that is missing or retired is a `NotFound` in its own slot.
  `ingredientFormsById` is keyed by id too, but answers null for a form no
  longer curated, since a retired pick reads as no pick rather than an error.
- **A null session is not always a refusal.** `membershipsByUser`,
  `providersByUser`, `usersByIdForAdmin` and `usersById` refuse every key
  signed out, and `providersByUser` and `usersByIdForAdmin` every key to a
  non-admin: each is `defineSignedInLoader(batch)`, which answers `Forbidden`
  in every slot without a session and hands `batch` a `Session` otherwise, so
  the four services never see a null (MB.212). `usersById` refuses nobody
  signed in: a stranger's id answers `null` in its own slot. The ingredient loaders answer a compendium entry for
  anyone, since the compendium is the public surface (MB.80), and refuse a
  workspace entry's key with `Forbidden` in its own slot; the group loaders
  and `ingredientFormsById` answer anyone, since a vocabulary is public
  reference data: each is `definePublicLoader(batch)`, whose `batch` takes the
  keys alone, as their services take no session. The ingredient loaders take
  `Session | null` themselves, so they stay `defineLoader`'s. A refusal is
  per key, never per batch.
- **Only `define-loader.ts` may import `dataloader` at runtime.**
  `.oxlintrc.json` bans the import everywhere else. Its `src/modules/*/services/**`,
  `src/db/**`, access-boundary and module-resolver overrides restate the ban, because an
  override replaces the top-level rule rather than merging with it. `import type` stays legal.
  `define-loader.ts` is exempt by a named `oxlint-disable-next-line`, and
  `tests/guards/lint-loader-boundary.test.ts` pins that exemption set to that
  one file, untracked files included.
