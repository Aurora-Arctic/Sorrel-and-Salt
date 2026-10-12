<!-- The approved plan for MB.115's filter-row change: the admin lists' filters apply on change, with a magnifier submit on the search box and a plain Clear link. Approved 2026-10-12 after the owner picked it from three options and settled five follow-up calls, and executed as three lanes. Stored beside the records it touches; this file is how the work was scoped and is not maintained after the PR lands. claude-docs/components/filter-form.md is the live summary. -->

# MB.115: the admin filter row applies on change

## Context

The owner found the admin lists' filter rows awkward. Measured in the workshop (compendium and privilege ledger at 1280, 700 and 375), the causes are: the Filter submit is disabled until something changes and the disabled look is a dashed ghost, so the primary button reads as dead and the quiet Clear outranks it; alone on their line the two buttons stretch to the fields' reach (useActionsLine) and double the row's height; under 28rem only the search, the type-ahead and the buttons go full width, leaving ragged edges; the row ends short of the table and its labels sit 12px left of the column headings; and a switch followed by a submit contradicts Atlassian's and Primer's guidance that a toggle takes effect at once. The three agent reports are in the session scratchpad (`visual-critique.md`, `filter-patterns.md`, `filter-constraints.md`).

The owner chose **option A**: a toolbar that applies on change, no Filter button, Clear a plain link shown only while a filter is applied. Five follow-up calls (2026-10-12): a type-ahead applies on pick, on its clear, or on leaving the box, never on typing alone; the changed field gets its focus back once the new list arrives; a select or switch change carries search text typed but not yet entered; Clear is a plain text link; and **the search box carries its own submit, a magnifier button at its end named Search**, so a first-time user sees where the search applies, Enter submits natively, and the form works before hydration with no separate Filter button.

This reopens four recorded owner calls, each replaced by this plan: Filter offered only when something changed (MB.53); Clear disabled rather than hidden; Filter and Clear half each when alone on their line; UserList, PrivilegeLedger and AdminInvitations filtering by a full page load. Soft navigation is safe for the three: `src/app/admin/layout.tsx` says every page under `/admin` runs the guard itself. Their pagers keep their plain anchors (out of scope).

MB.115's entry says "Behaviour does not change"; this is an owner-called amendment, recorded as the Form filter's was, and this plan is copied to `claude-docs/design-decisions/mb.115-filter-plan.md` in the same PR.

Peer sessions: app-5c runs a DRY pass and holds the filter area until this lands; `src/lib/hydrated.ts` (`useHydrated`) is on the branch at 52952c69 and is imported here, replacing the two in-file `useSyncExternalStore` copies. app-17 merges a pager under the Invitations list, touching `AdminInvitations/filter.tsx` only for the cursor. Run `git log` before every merge into `/app`.

## Design

### FilterForm (`src/components/FilterForm/`)

Props (`types.ts`): keep `label`, `action`, `shown`, `children`. Rename `href` to `searchHref: () => Route` (the filter shown plus the search box's trimmed text, from the first page). Delete `disabled`, `draft`, `onClear`, `navigation` and `FilterNavigation`; `ListNavigationKind` stays in `ListFrame/types.ts` for `Pager/pager-link.tsx`. The search submit is always enabled: a press with the text unchanged re-reads the list, which is harmless, and a disabled primary was the first thing wrong with the old row.

Export a hook beside the component:

```ts
/** Opens the list under a new filter from its first page, softly, through the list's ListFrame. */
export function useApplyFilter(): (href: Route) => void;
```

It wraps `useListNavigation().go(href, 'soft')` and, before going, records the id of `document.activeElement` when it is inside the row, for the focus restore. (A context FilterForm provides cannot serve the filter's own handlers, which render FilterForm; ListFrame's context is already above them.)

Internals: delete `useActionsLine` and `actions-line.ts`, the `emptied` counter, its focus effect and the `<Fragment key>`. Keep `isSet`, `FIELD_CONTROLS`, `PRESSES` and the pending layout effect unchanged. Submission: `onSubmit` prevents default and applies `searchHref()` unless `pending`; the submit is the search field's own magnifier button (below), so Enter in any text box submits natively and before hydration the same button sends the GET. No separate Filter button, no key handler, no `useHydrated` in FilterForm itself. Markup after the fields: `{filtered && <a className="filter-row__clear" href={action} onClick={clear} aria-disabled={pending || undefined}>Clear</a>}`, where `clear` leaves a modified click to the browser and otherwise applies `action`. No placeholder with nothing to clear.

### SearchField (`src/components/Field/search-field.tsx`, new)

The search box every filter draws first: a `FieldShell` whose control is an `.input.search-field` wrapper shaped as `.input.combobox__control` is (`Combobox/index.scss` ~33: the box's edge and fill on a flex row, the ring drawn when the inner input is focused), holding a borderless `input type="search"` (`name`, `placeholder`, controlled `value`/`onChange`) and, at its end, `<button type="submit" className="search-field__submit">` carrying a `MagnifierIcon` (`aria-hidden`, drawn like `Combobox/icons.tsx`'s on a 16-unit box) and visually hidden text "Search" as its name. The button takes the `icon-button` mixin (`_mixins.scss` ~392, `$icon-size` target, sharp radius on the end as `.combobox__entry-remove` does) with the accent on hover and focus. Props: `id`, `label`, `name`, `placeholder`, `value`, `onChange`. All six filters use it, which also moves UserList's and PrivilegeLedger's hand-written `.field` markup onto `FieldShell`. Exported from `Field/index.tsx` and documented in `field.md`.

Focus restore: a mount layout effect in FilterForm refocuses the remembered id if an element with it is inside the row (the lists key the filter by the filter shown, so the new filter mounts fresh; `useId` ids are stable by position, the two hand-written ids fixed). Remembered in a module-level variable in `index.tsx`, cleared once used.

### Fields

- Only the search text keeps `useState`. A plain select is uncontrolled: `defaultValue={shown}` and `onChange` applies the address built from `{ ...current, field: value }`, where `current` is the filter shown with `draftQuery.trim()`. A switch is uncontrolled: `SwitchField` gains `defaultChecked?: boolean`, `checked` becomes optional (`Field/types.ts`, `switch-field.tsx`), and `onChange` applies.
- The type-ahead keeps its draft state and `onChange` as today, and applies through a new optional `onSettle?: (value: string) => void` on `ComboboxTypeahead` (`src/components/Combobox/typeahead.tsx`), called with the value on a pick (`option.key`), on the clear (`''`) and on blur (the choice the text names in full, or `''`); the filter applies when the settled value differs from the one shown. Typing alone never applies.
- Native select before hydration stays for the type-ahead (`defaultValue`, no `onChange`) with its hidden input carrying the draft; `useHydrated()` from `@/lib/hydrated` replaces the in-file copies in CompendiumList and GroupedValueList.
- `UserList/index.tsx` and `PrivilegeLedger/index.tsx` gain the `key=` by the filter shown that the other lists have (they relied on full loads).

### Sass (`src/scss/_variables.scss`, `_primitives.scss`)

- Variables: `$filter-search-basis: 16rem` beside `$filter-choice-width` (the search starts there and grows); `$table-cell-inset: space(3)` after `space()`, the data table's inline cell padding, which `.data-table th, td` then uses.
- `.search-field` (in `_primitives.scss` beside `.filter-row`, or `Field/search-field.scss` imported by the component as `Combobox/index.scss` is): the wrapper's inner input borderless and growing, the submit `flex: none` at the end, the wrapper's ring on `:has(input:focus-visible)`.
- `.filter-row`: add `padding-inline: $table-cell-inset`. `> :first-child { flex: 1 1 $filter-search-basis; min-width: 0 }`. `> :is(.field:has(> .select), .filter-row__typeahead) { flex: 0 1 $filter-choice-width; min-width: 0 }` (a switch is `.field.switch` with no `.select` child, so it keeps its width). `.filter-row__clear { display: inline-flex; align-items: center; justify-content: flex-end; min-height: $control-height; margin-inline-start: auto }` taking the page's link style. Under the 28rem container query every child takes `flex-basis: 100%`, written as one `:is()` so specificity equals the choice rule and stylelint's descending-specificity rule holds. Delete `.filter-row__actions`, `[data-alone]` and `--filter-actions-width`. The busy rule's `> :not(.filter-row__actions)` becomes `> *`, Clear fading with the row.
- `TabbedPage/panel-loading.tsx` and `.tab-skeleton__filter`: drop the skeleton's button shape to match.

### Tests (role and label queries; state, never copy)

Common: `getByRole('button', { name: 'Filter' })` presses become `fireEvent.change` on the select or switch, or a press of `getByRole('button', { name: 'Search' })` / `fireEvent.submit`; `location.assign` stubs become `router.push` assertions; "Clear is disabled" becomes `queryByRole('link', { name: 'Clear' })` null.

- `tests/components/CompendiumList/index.test.tsx` owns the FilterForm behaviour suite: the server-render test (~194) also asserts the Search submit is in the server's markup; the pending-status test (~341) triggers from No Refs and asserts a second change and a submit give one push; add "keeps the focus on the field changed once the list arrives" and "a type-ahead applies on pick, on its clear and on leaving the box, not while typed"; the in-place-empty Clear tests (~478, ~507) go; "Clear is not drawn while the page shows no filter, text typed or not".
- `tests/components/Field/` (if a SearchField test is warranted beyond the lists' use of it: the lists already prove the submit; add none for coverage alone).
- `GroupedValueList` (~154–300), `GroupList` (~55–74), `UserList` (~242–400, the `pageshow` test becomes a soft navigation inside `Navigating`; add a reset-on-rerender test for the new key), `PrivilegeLedger` (hoisted router mock; add reset-on-rerender), `AdminInvitations` (drop the `stubGlobal`; email then switch pushes `?email=…&expiring`).
- e2e: `tests/e2e/admin.spec.ts` ~532–552 presses the Search button (native or soft, either lands the address); `tests/e2e/admin/privilege-changes.spec.ts` ~89–102 fills the search, then `selectOption`, which applies only once hydrated, so the spec waits for `page.waitForLoadState('networkidle')` after the goto (no test id, no copy); URL expectations unchanged.
- Stories: `FilterForm/index.stories.tsx` drops `FilteredWrapped*` and uses `useApplyFilter`; each list's `Filtered`, `Pending` and phone stories redraw without the button.

### Docs

`claude-docs/components/filter-form.md` (props, contracts, styling, stories, testing rewritten), `styling.md` (`.filter-row` table row ~726), `field.md` (`defaultChecked`), `combobox.md` (`onSettle`), `list-frame.md` (~34–37, ~88), `pager.md` (~41–44: the three lists' filters are soft because every `/admin` page guards itself), `user-list.md`, `privilege-ledger.md`, `admin-invitations.md`, `grouped-value-list.md`, `group-list.md`, `compendium-list.md` (each sentence naming the Filter button, Clear Filters, a full load or in-place emptying). `claude-docs/tasks/mb.md` MB.115: a second "Amended during MB.115 (2026-10-12, the owner's call)" paragraph after the first, naming the four reopened calls and linking `design-decisions/mb.115-filter-plan.md`; then `node scripts/task-board.mjs sync MB.115` (auto mode may refuse the gh write; hand the owner the command).

## Lanes

Worktrees under `/home/node/worktrees/<name>`, `node_modules` copied from `/app` with `node_modules/.cache/tsc/tsconfig.tsbuildinfo` deleted, `/app/.env.local` copied in. Pre-commit gates every commit; each lane commits each green step and messages main with the hash; main merges into `/app` as they land (`git log` first). Vitest runs under `flock /tmp/sorrel-vitest.lock`, Playwright under `flock /tmp/sorrel-e2e.lock` with the memory's recipe. British spelling in prose, title case on labels, no Claude attribution, no PR.

1. **Lane 1, core — Opus, first.** `FilterForm/{index.tsx,types.ts,index.stories.tsx}` (delete `actions-line.ts`), `Field/{search-field.tsx,icons.tsx,switch-field.tsx,types.ts,index.tsx}` and a SearchField story, `Combobox/typeahead.tsx` (`onSettle`) and `Combobox/types.ts`, `_variables.scss`, `_primitives.scss`, `TabbedPage/{panel-loading.tsx,index.scss}`, `ListFrame/index.tsx` comments, and the FilterForm prop lines in all six `filter.tsx` so the tree typechecks (rename `href`, delete `disabled`/`draft`/`onClear`/`navigation`). Docs: `filter-form.md`, `styling.md`, `field.md`, `combobox.md`, `list-frame.md`. Verify: `lint`, `lint:css`, `typecheck`, `format:check`, `test:stories`. The list tests may stay red until lanes 2 and 3.
2. **Lane 2, people — Sonnet, from lane 1's commit.** `UserList`, `PrivilegeLedger`, `AdminInvitations`: `filter.tsx`, the `index.tsx` keys, stories; their tests; `tests/e2e/admin/privilege-changes.spec.ts`; docs `user-list.md`, `privilege-ledger.md`, `admin-invitations.md`, `pager.md`. Run its component tests and the one e2e spec.
3. **Lane 3, values — Opus, from lane 1's commit, parallel with lane 2.** `CompendiumList`, `GroupedValueList`, `GroupList`: `filter.tsx`, stories, `useHydrated`; their tests including the FilterForm behaviour suite; `tests/e2e/admin.spec.ts`; docs `compendium-list.md`, `grouped-value-list.md`, `group-list.md`. Lane 3 alone may amend `FilterForm/index.tsx` after lane 1. Run its component tests and the one e2e spec.
4. **Lane 4, main in `/app`.** Merge lanes; `tasks/mb.md` amendment and the design-decisions copy of this plan; the issue sync; tell app-5c the merge hash and app-17 that the filter area is free.

## Verification (lane 4, once)

`npm run pre-commit`; `flock /tmp/sorrel-vitest.lock npm run test:coverage`; `npm run test:stories`; `npm run build` then the two e2e specs under `flock /tmp/sorrel-e2e.lock`; workshop screenshots of the compendium, ledger and users filters at 1280 and 375 in both themes checked against the critique's measures (search fills the line with its magnifier at the end, choice fields one width, labels flush with the column headings, every child full width under 28rem, no Filter button, Clear only when filtered); axe stays clean in the e2e specs. Report any failure with its output.
