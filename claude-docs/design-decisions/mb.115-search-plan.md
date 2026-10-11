<!-- The approved plan for three MB.115 changes to the admin compendium list: the weighted search rank, the Form filter, and Formal Name before Classification. Approved 2026-10-11 and executed as two lanes. Stored beside the records it touches; this file is how the work was scoped and is not maintained after the PR lands. claude-docs/db/compendium-read.md and claude-docs/components/compendium-list.md are the live summaries. One item changed hands after approval: the owner gave the type-ahead width rule to the MB.115 session that owns the Group filter, so Lane B added none, and its Form field keeps the Group filter's markup so that rule applies to both. -->

# Compendium search: weighted ranking, a Form filter, Formal Name before Classification

Task **MB.115** (the admin design review), the owner's call: all three changes land on `feature/mb.115-design-review-admin`. Another session (the MB.115 agent) works on that branch in `/app` — its tree is dirty (`src/components/UserList/index.scss`) and it merges lane branches (`feature/mb.115-compendium`, `-people`, `-shared`, `-values`) into it. So this work runs as **two Opus lanes in worktrees** on lane branches off that branch's head, and is merged back at the end.

## Context

The admin compendium list (`/admin/compendium`) searches by word similarity and already orders best match first, but every matched field counts the same: a word found in a folk name or a variant's prose description scores 1.0, the same as the entry's own name. That is why _Storax_ brings up _Sweet Gum_: its seeded folk names include _American Storax_ and its Resin variant's description says "liquid storax". Not fuzziness — an exact-word tie, broken alphabetically.

The owner wants:

1. **A weighted rank.** Each arm's `word_similarity` times a weight for the field it matched; the row's rank is the best weighted value. Weights (owner: "a 1.0 formal name beats a 0.7 name match; descriptions very low"): **name 1.0 · formal name 0.9 · folk name 0.8 · variant form 0.6 · variant description 0.2**.
2. **A Form filter on the admin list** as a **closed-set type-ahead over the curated forms**, the pattern the MB.115 agent landed today for the Group filter (`ComboboxTypeahead` in `src/components/Combobox/typeahead.tsx`, used by `src/components/GroupedValueList/filter.tsx`: the page renders every choice, a native `<select>` before hydration, typing narrows, a clear on the right, a hidden input carries the parameter once hydrated). Field order: **Name, Form, Classification, Without References**. The repository (`formArm`, `src/db/repository/ingredients.ts` ≈470) and service (`CompendiumFilter.form`, text) already take it; only the UI, address and page plumbing are missing.
3. **Formal Name before Classification** in the table's columns.

Settled design points (verified in code):

- The keyset cast in `src/db/repository/select.ts:306` (`expressionOf` → `cast(… as real)`) keeps the cursor `real`, but the carried `score` on the edge is not cast, so each weight is written with a `::real` cast (`real * numeric` promotes to `double precision`). Bound parameter with a cast, never `sql.raw`.
- Each arm guards its weighted term with `case when <query> <% field then …` so a field that did **not** pass the 0.5 threshold never supplies the rank (unweighted that was harmless; weighted, a 0.45×0.6 form could outrank a 0.2 description-only entry). The `where` is unchanged, so the trigram indexes are still reached (`tests/db/repository/compendium-search-query.test.ts` proves it).
- The Form filter's value is the form's **text** (`?form=Oil`), folded by `formArm`, so the address reads plainly and an uncurated form on a seeded entry is still reachable by hand. Choices are the live curated forms, read server-side through `listIngredientFormValues` (`@/modules/vocabulary`), every page (84 seeded, `MAX_PAGE_SIZE` 100), `cache()`d in the page as `allGroups` does in `src/app/admin/value-kinds.ts:47`.

Not in scope: the "Add buttons to the right of the filters" message (another session's). No e2e flow is added (`tests/e2e/admin-compendium.spec.ts` has no filter flow under MB.224's one-flow-per-page rule; the component and page tests own the filter — said in the PR body). No push, no PR: MB.115 is a design-review task whose PR waits for the owner's sign-off.

## Execution: two Opus lanes in worktrees

Base: the current head of `feature/mb.115-design-review-admin` (`git rev-parse` it at launch; do not depend on `/app`'s checkout afterwards).

| Lane                 | Worktree                                   | Branch                         | Owns                                                                                                                                                                                                                                                                                                                  |
| -------------------- | ------------------------------------------ | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A — rank             | `/home/node/worktrees/mb115-search-rank`   | `feature/mb.115-search-rank`   | `src/db/repository/ingredients.ts`, `src/db/repository/types.ts`, `src/modules/ingredients/graphql/compendium.ts`, SDL snapshot + `src/gql/`, `tests/db/repository/ingredients.test.ts`, `tests/modules/ingredients/graphql/compendium.test.ts`, `claude-docs/db/compendium-read.md`, `claude-docs/graphql/schema.md` |
| B — filter + columns | `/home/node/worktrees/mb115-search-filter` | `feature/mb.115-search-filter` | `src/components/CompendiumList/**`, `src/app/admin/compendium/{page,types}.tsx`, their tests and story, `claude-docs/components/compendium-list.md`, `claude-docs/tasks/mb.md` (MB.115 amendment, covering both lanes — Lane A does not touch `tasks/`), `claude-docs/tasks/m8.md`                                    |

Worktree recipe (from the devcontainer notes): `git worktree add <path> -b <branch> <base>`; `cp -a /app/node_modules <path>/node_modules` then delete `node_modules/.cache/tsc/tsconfig.tsbuildinfo`; copy `/app/.env.local` in (gitignored). Every command runs with `cd <worktree>`. Vitest runs wrapped: `flock /tmp/sorrel-vitest.lock npx vitest run …`; e2e: `npm run build` first, ports 8001+/8100 free, `flock /tmp/sorrel-e2e.lock env ENABLE_IMPERSONATION= BETTER_AUTH_SECRET="$(grep -m1 '^BETTER_AUTH_SECRET=' .env.local | cut -d= -f2-)" npx playwright test tests/e2e/admin-compendium.spec.ts`, never printing the secret, never installing browsers. Each lane commits every `npm run pre-commit`-green step (test + code, doc) on its branch; British spelling in prose; tests assert state, never copy; invented fixture names only. Briefs tell lanes to fan mechanical test/doc rewrites out to helper agents early and to commit before ~300k tokens.

End of each lane: `git merge feature/mb.115-design-review-admin` (its head at that time) into the lane branch, resolve conflicts there, then `flock … npm run test:coverage`, `npm run build`, and (Lane B) the e2e spec above. Then I merge both lane branches into `feature/mb.115-design-review-admin` from `/app` — only if `git status` there shows no uncommitted change on a path the merge touches; otherwise stop and give the owner the two `git merge` commands. After the merge: `node scripts/task-board.mjs sync MB.115` (if auto mode refuses the board write, hand the owner the command). Worktrees are left in place until the owner says to remove them.

## Lane A — weighted ranking (TDD, one commit per green step)

**A1. Repository tests first** — `tests/db/repository/ingredients.test.ts`

- Rewrite the independent answer key `rankedOrder` (≈289–307) as the weighted key: per field `case when ws(field) >= 0.5 then ws(field) * <w>::real end`, folk names and variants as `max(...)` subqueries over live rows, `greatest` across, `order by score desc, name, id`. Weights restated in the test on purpose — never import the finder's constant.
- Update: "scores a folk-name match by the folk name" → `0.8`; "answers one row, at its best score, for an entry two of whose variants match" → `0.6` (form 1.0×0.6 beats description 1.0×0.2).
- Add `describe('weighted ranking')`, query `quandle`, invented fixtures via `add()`/`makeVariant` (`tests/support/fixtures`): `Fixture Quandle` (name, 1.0) · `Fixture Kwandle` with `canonicalName 'Fixtura quandle'`, `nomenclature 'botanical'` (formal, 0.9) · `Fixture Wimble` with folk name `Quandle` (0.8) · `Fixture Quandles` (name ≈0.7) · `Fixture Thrum` with variant form `Quandle` (0.6) · `Fixture Sprocket` with variant description "Steeped with quandle" (0.2). Assert the order by names and the rank on each edge (`expect.closeTo` for the ≈0.7; the others are exact in float4); state the preconditions in SQL (`word_similarity('quandle','Fixture Quandles')` in [0.5, 0.9); against `'Fixture Kwandle'` under 0.5, so Kwandle is found by its formal name alone); walk the order across a cursor with `first: 2`.

**A2. SQL** — `src/db/repository/ingredients.ts` `searchMatch` (≈361–411)

- `const SEARCH_WEIGHTS = { name: 1, canonicalName: 0.9, folkName: 0.8, form: 0.6, description: 0.2 } as const;` beside `searchMatch`; the comment says what it is and why not a boost on the label alone; the argument lives in the doc.
- Inside `searchMatch`: `weighted(text, weight)` = `case when ${matches(text)} then ${similarity(text)} * ${weight}::real end`.
- Arm (a): `greatest(weighted(candidate.name, W.name), weighted(candidate.canonicalName, W.canonicalName))`; arm (b): `weighted(folkNames.name, W.folkName)`; arm (c): `greatest(weighted(variants.form, W.form), weighted(variants.description, W.description))`. The `where`, the `UNION ALL` and `max … group by id` stay.
- Update comments: `searchMatch`, `compendiumList` ("keys `[-rank, name]`"), `CompendiumScore` in `src/db/repository/types.ts:532`.
- Run `compendium-search-query.test.ts`: three indexes reached, no SubPlan.

**A3. Transport** — `tests/modules/ingredients/graphql/compendium.test.ts:135–149` expectations become weighted (label matches 0.75; Rosemary ≈0.675 via formal name; Mugwort/Selenite ≈0.4 via folk names — verified against the run, not arithmetic). `src/modules/ingredients/graphql/compendium.ts:29–34` `score` description → the search's weighted rank, 0 to 1: each matched field's word similarity times that field's weight, best kept; null without a query. Then `npx vitest run tests/graphql/schema-snapshot.test.ts -u` and `npm run codegen`; commit both outputs. `tests/modules/ingredients/services/ingredient-suggestions.test.ts:81–86` stays green (the substitute picker inherits the rank through `compendiumList`).

**A4. Docs** — `claude-docs/db/compendium-read.md` "The compendium read": the `query` bullet (each arm scores similarity × weight), the "The score is…" bullet (the best _weighted_ similarity; the five weights and why — identity is the formal name (MB.215), a folk name is still a name, a form word is shared by every entry in that form, a description is prose; the rank can sit under 0.5 while the match is at 0.5; the `case when <%` guard), the keyset bullet (`::real` casts), the MB.215 paragraph, "The ingredient picker's search". `claude-docs/graphql/schema.md` ≈419, 443–445 → the weighted rank. `fuzzy-matching.md` unchanged (`findSimilarIngredients` stays unweighted).

Commit title: "MB.115: The compendium search ranks a match by the field it hit — label, formal name, folk name, form, description — each weighted, the rank on the edge".

## Lane B — Form filter and column order

**B1. Component tests first** — `tests/components/CompendiumList/index.test.tsx` (role/label queries only; follow `tests/components/GroupedValueList/index.test.tsx`'s group-filter cases, added in commit `11c0497d`)

- `NO_FILTER` gains `form: ''`; renders pass `forms` (invented: `Fixture Oil`, `Fixture Powder`).
- `compendiumHref` writes `form=` after `query=`, blank as none.
- The Form box: a combobox named Form showing the filter's form; typing narrows the choices (`listbox` named "Form choices", options by name); a pick enables Filter and `router.push` carries `?form=Fixture+Oil`; the clear ("Clear Form") empties it and Filter disables again when the draft equals the shown filter; the hidden `form` input carries the value; the `key` restart covers `form`.
- `emptyText` is copy — not asserted; the no-table state is already covered.

**B2. Implement** — `src/components/CompendiumList/`

- `types.ts`: `CompendiumListFilter.form: string`; `CompendiumPlace.form?: string`; `CompendiumListProps.forms: readonly CompendiumFormChoice[]` (`{ name: string }` — value and label are the same text); `CompendiumListFilterProps` picks `filter` and `forms`.
- `href.ts`: `form` second in `listHref(...)`.
- `filter.tsx`: `draftForm` state in `changed` and `compendiumHref`; the Form field between Name and Classification, shaped exactly as `GroupedValueList/filter.tsx`'s group field — `hydrated` via `useSyncExternalStore`, `ComboboxTypeahead` with `choices` `{ value: name, label: name }`, `placeholder="All Forms"`, `clearable`, plus `<input type="hidden" name="form">`; a native `<select name="form">` with `<option value="">All Forms</option>` before hydration. `FieldShell`/`fieldDescription` from `../Field` for every field (the Name and Classification markup moves onto them too, as the group filter's did). Header comment: the native submit is now `query=&form=&nomenclature=`.
- `index.tsx`: filter `key` adds `form`; pass `forms` through; `emptyText` names the form after the query ("…matches “wort”, the form “Oil” and the classification Botanical…"); swap the Classification and Formal Name `<th>`s and `<td>`s (**change 3** — its own commit; column order is layout, tests query cells by name, so no test change).
- **Width (the owner: "the group type-ahead needs to be wider").** One rule in `.filter-row` (`src/scss/_primitives.scss` ≈354–366) gives a type-ahead field a wider basis than a select — from the spacing scale, no raw size — and both the Group filter and the Form filter take it, so the two read alike. Lane B owns the rule; if the MB.115 agent lands one for the Group filter first, Lane B adopts it at merge instead of adding a second. Checked in the story at desktop and 375px (the Name box keeps the whole line there), and named in the PR.

**B3. Page test, then page** — `tests/app/admin/compendium/page.test.tsx`: mock `listIngredientFormValues` from `@/modules/vocabulary` (the file already mocks `@/modules/ingredients`); `FILTERED` gains `form: 'Fixture Oil'`, `FILTERED_HREF` carries `form=Fixture+Oil` so Edit/pager/Add/redirect keep it; `' Oil '` reads as `Oil`; blank reads as none; the Form box lists the mocked forms. `src/app/admin/compendium/types.ts`: `form?: string | string[]`. `page.tsx`: `single(params.form)?.trim() ?? ''` into `readCompendium`'s primitive key, the service filter (`form || undefined`) and the list's `filter`; a `cache()`d `readForms` reading every page of `listIngredientFormValues({}, …)` through `resolvePage` (`src/lib/pagination.ts`), handing `[{ name }]` to the list.

**B4. Story, docs, task entries** — `index.stories.tsx` (`forms` and `form` on each story). `claude-docs/components/compendium-list.md`: Props (`filter`, `forms`), Contracts (the Form type-ahead, the native select before hydration, the address, the empty state), Testing. `claude-docs/tasks/mb.md` MB.115: an "Amended during MB.115 (2026-10-11, the owner's call)" paragraph before the criteria covering all three changes — the weighted rank and its five weights (Lane A's), the Form filter on the Group filter's type-ahead over the `compendium` query's existing `form` argument, Formal Name before Classification (the identity column beside the label it belongs to, MB.215). `claude-docs/tasks/m8.md` M8.13 (≈248–262): one sentence that the admin list gained its own Form filter during MB.115 over the same argument; M8.13's public filter and URL-state mechanism unchanged in scope.

Commit titles: "MB.115: The compendium list filters by form, a type-ahead over the curated forms like the Group filter, kept on every address" and "MB.115: The compendium list's Formal Name column sits before Classification".

## Verification

- Per commit: `npm run pre-commit`. Per lane end: `flock /tmp/sorrel-vitest.lock npm run test:coverage` (80% threshold), `npm run build`; Lane B also the e2e spec (its axe scan now covers the Form box).
- After the merge, in the running app (`npm run dev`, signed in as a site admin): search `storax` — Storax first at 1.0, Sweet Gum below at 0.8; search `oil` — form matches at 0.6 below any name match; Form → Oil narrows the list and the address reads `?form=Oil`; the table reads Name, Formal Name, Classification, Form; the filter reads Name, Form, Classification, Without References.
