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
  `providersByUser` (`identity`, for `User.providers`, MB.52),
  `usersByIdForAdmin` (`identity`, for `PrivilegeChange.subject` and
  `.actor`, MB.199),
  `categoriesByIngredient`, `folkNamesByIngredient`,
  `substitutesByIngredient`, `deitiesByIngredient` and `referencesByIngredient`
  (`ingredients`, for `Ingredient.categories`, `Ingredient.folkNames`,
  `Ingredient.substitutes`, `Ingredient.deities` and `Ingredient.references`),
  and `categoryGroupsById`, `ingredientFormGroupsById`, `deityTraditionsById`
  and `ingredientFormsById` (`vocabulary`, for `Category.group`,
  `IngredientFormValue.group`, `Deity.tradition` and `Ingredient.formChoice`;
  the last two MB.167's); M6.11
  `membersByWorkspace`, MB.9 `ingredientsById` and MB.10 `usersById`, the members' display name, follow. A test that builds a context
  by hand calls `createLoaders(session)` rather than passing `{}`, which the
  `Loaders` type no longer admits. A factory is written in its module's `loaders/`, exported
  through the module's index, and spread into `LOADERS` here
  ([`modules.md`](../modules.md)).
- **A loader keyed by an object** passes `cacheKeyFn`, and `defineLoader`'s
  third type parameter names what it returns. The five ingredient loaders are
  keyed by the parent row's `{ id, workspaceId }` and cached by `id`. They are
  one record in `loaders/ingredient-children.ts`, each exported by name for
  `LOADERS`, and `clearIngredientChildren(loaders, row)` clears a row from
  every one in it, so an ingredient write clears a loader added there without
  naming it (MB.211). The
  service needs the `workspaceId` to know which coven to check without a read
  of its own, and it never trusts it as the scope
  ([`db/ingredient-children.md`](../db/ingredient-children.md),
  "Ingredient children"). The three group loaders are keyed by id, and a group
  that is missing or retired is a `NotFound` in its own slot.
  `ingredientFormsById` is keyed by id too, but answers null for a form no
  longer curated, since a retired pick reads as no pick rather than an error.
- **A null session is not always a refusal.** `membershipsByUser`,
  `providersByUser` and `usersByIdForAdmin` refuse every key signed out, and
  the last two every key to a non-admin. The ingredient loaders answer a compendium entry for
  anyone, since the compendium is the public surface (MB.80), and refuse a
  workspace entry's key with `Forbidden` in its own slot; the group loaders
  and `ingredientFormsById` answer anyone, since a vocabulary is public
  reference data. A refusal is
  per key, never per batch.
- **Only `define-loader.ts` may import `dataloader` at runtime.**
  `.oxlintrc.json` bans the import everywhere else. Its `src/modules/*/services/**`,
  `src/db/**` and access-boundary overrides restate the ban, because an
  override replaces the top-level rule rather than merging with it. `import type` stays legal.
  `define-loader.ts` is exempt by a named `oxlint-disable-next-line`, and
  `tests/guards/lint-loader-boundary.test.ts` pins that exemption set to that
  one file, untracked files included.
