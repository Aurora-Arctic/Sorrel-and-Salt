# Ingredient Search

`src/components/IngredientSearch/` — the list shell for any page that finds
ingredients by name: a search box that offers matches as you type, the page's
own filter fields beside it, an action, the results and a pager. Added by
M8.10. The compendium list (M8.18) is its first consumer; the workspace
ingredients list (M9.6) and the spell builder follow.

## Exports

`IngredientSearch` (the default, a server component) draws the list. Its props
(`IngredientSearchProps`, `types.ts`):

| Prop                       | What it is                                                       |
| -------------------------- | ---------------------------------------------------------------- |
| `search`                   | The filter row, normally an `IngredientSearchForm`               |
| `action`                   | Optional: the page's Add or Create, drawn beneath the filter row |
| `children`                 | The results: a table, cards or an empty state                    |
| `previousHref`, `nextHref` | Optional: the pager's links, as for any paged list               |
| `position`                 | Optional: where this page stands among them all                  |
| `className`                | Optional: the list's own root class, beside `list-frame`         |

`IngredientSearchForm` (a client component, re-exported from `index.tsx`) is
the filter row. Its props (`IngredientSearchFormProps`):

| Prop          | What it is                                                                     |
| ------------- | ------------------------------------------------------------------------------ |
| `label`       | The form's accessible name, title case                                         |
| `action`      | The page itself: the form's GET target, and the unfiltered page Clear opens    |
| `query`       | The text the list shows now, which the box starts from                         |
| `shown`       | Each filter value the page shows; Clear is drawn while any is set              |
| `searchHref`  | The list with the query set to a text, other filters kept, from the first page |
| `pickHref`    | Where a picked match opens                                                     |
| `pickHeading` | Optional: the route modal's heading; given, a pick opens a route modal         |
| `children`    | Optional: the consumer's other fields, after the search box                    |

`useSearchText()` returns the text in the box now, searched or not, for a field
in the filter slot to carry.

## Contracts

- **The shell renders on the server and the form on the client.** The consumer
  builds its `IngredientSearchForm` (it holds the hrefs, which are functions)
  and passes it as `search`, so the list frame stays a server component.
- **The box asks; the list does not.** The text is debounced
  ([`DEBOUNCE_MS`](../../src/lib/debounce.ts)) and feeds the dropdown only.
  The list changes on Enter, the clear, a pick or the last row, and on nothing else.
- **A pick leaves the list as it was** and the typed text stays in the box.
- **The clear (x) empties the box and applies the empty search** (the
  owner's call, reversing "empties the box only"): the list reloads with no
  name, and the other filters the consumer carries in `searchHref` stay.
- **The magnifier Search button is the form's one submit.** It sits inside
  the box at its start (Combobox's `leading` slot), with the clear alone at the
  end: `[magnifier  Search names…  x]`. There is no chevron (`toggle={false}`),
  since typing opens the dropdown already. This is the owner's call of
  2026-10-16, after a survey of design systems; Nielsen Norman Group's
  [magnifying-glass article](https://www.nngroup.com/articles/magnifying-glass-icon/)
  says a magnifier must submit when clicked. Without JavaScript the box is a
  plain GET form to `action`, sending its text as `query`.
- **Nothing is asked until the box is focused**, nor while the text is under
  `MIN_QUERY_LENGTH` (2) characters. The floor is the service's own, exported
  by `src/modules/ingredients/validation/compendium-filter.ts`, a zod-only file
  safe to load in the browser; both count composed code points. Under the
  floor the dropdown offers no rows, so stale rows from the last lookup never
  show; once anything is typed it says "Keep typing to search" instead, at once
  and announced by the status region, so one character is not met by silence
  (the owner, 2026-10-16). It is a message rather than a label, so sentence case.
- **The dropdown shows at most 25 rows, the first page, in the server's
  order.** It never asks for a second. When there is another page, a last row, See all results., ends the
  listbox and applies the debounced text to the list. It is selectable like
  any result (arrow keys, then Enter or a click), set in italics, and
  sentence case with a full stop because it is a message, not a label (the
  owner, 2026-10-16); it is not counted in the status. When nothing matches,
  "No Matches" sits in the dropdown, and Escape closes it without closing the
  modal around the box. They are the combobox's `action` and
  `empty` ([`combobox.md`](combobox.md)).
- **A pick opens the match.** With `pickHeading`, through the route modal
  opener, so the modal shows its heading at once while its page loads, as the
  list's own edit links do. Without it, a plain `router.push`. Neither goes
  through the list frame's transition, which would grey the list and swap it
  for a skeleton. The heading is opt-in so a consumer whose pick is a page
  (M8.18) does not show a loading modal.
- **The source is the compendium only.** M9.6 adds the workspace source.

## The parameter table

A search's whole state is its address (M8.13), and the address is written
and read through one typed table, [`defineSearchParams`](../../src/lib/search-param-table.ts),
so a filter is never listed by hand in five places. Each entry is one
parameter: the name the address carries, a reader that turns what the address
held into a value (a hand-edited value reads as no filter, never an error),
a writer that turns a value back, and the GraphQL variable it becomes. The
compendium's table is
[`CompendiumList/params.ts`](../../src/components/CompendiumList/params.ts);
the helpers `textParam`, `choiceParam` and `listParam` cover the
usual shapes, and `searchParam` takes any other.

The table gives four functions, and every caller uses only these:

- `read(params)`: the filter an address holds. The page calls it.
- `href(path, filter, extra)`: the address of a filter, in table order, then
  `extra` for the cursor and the modal. Every link, the pager and the filter
  form's applies call it, through the list's `compendiumHref`.
- `variables(filter)`: the query's variables, a blank as `undefined`. The page
  keys its cached read by them, so adding a filter changes nothing there.
- `changed(place, change)`: the place with a change applied and the cursor
  dropped.

**Adding a filter is one new entry** and touches none of those callers;
`tests/lib/search-param-table.test.ts` proves it by adding one. The pieces
that do change are the filter's own control, the service and the GraphQL
argument it reaches.

**A list is a repeated parameter**, `?elements=fire&elements=earth`:
`listHref` writes one pair per value and `list`
([`search-params.ts`](../../src/lib/search-params.ts)) reads them back, with
`someOf` dropping any value outside the set. An empty list is left out.
It is repeated rather than comma-joined (`?elements=fire,earth`) because a
GET form's checkboxes write repeated names themselves, so a facet filters
before hydration and without JavaScript, and because a form's free text may
hold a comma. A single-value parameter given twice by hand reads its first.

**The address names a value the way a reader would**, and the table maps it
to whatever the query takes: a deity is its slug, `hecate-greek`, while the
query takes `deityIds`, since an id would outweigh the rest of the address
(M12.4).

**The cursor rule.** A cursor names a place in one filter's results, so it
belongs to the filter it was read under. Any change to the filter opens the
first page: the filter's controls build their address from `filter` alone,
never from the cursor, and `changed` drops `after` and `before`. Only the pager
and a modal's way back write a cursor, through `extra`. Reload and Back need
nothing built for them: the address is the state, so a reload reads it again
and Back steps through the filters one change at a time. The e2e spec in
`tests/e2e/admin-compendium.spec.ts` asserts both.

The `elements` filter is the first list filter: an `elements` argument on
`compendium` and `workspaceIngredients` matching an entry that holds any element
listed on the entry or on any of its live forms, by array overlap in SQL and ANDed with the other filters. It is read
from the address and has no control yet; the facet screen (M12.4) draws one.

## Styling

Tokens only, until the section's design review: the box's submit is drawn
by Combobox inside the box, at its start, and the action sits right-aligned beneath it.

## Stories

[`index.stories.tsx`](../../src/components/IngredientSearch/index.stories.tsx),
under `Lists / Ingredient Search`: `FewMatches`, `ManyMatches` (See all
results.) and `NoMatches`. Each stubs `window.fetch` for `/api/graphql`.

## Testing

`tests/components/IngredientSearch/index.test.tsx` asserts the requests the box
makes (once after the debounce, never before focus or under the floor, first 25
and no cursor), the action row and empty message, that a pick opens the match
without applying the text, that the clear empties the box and applies the empty search, and that Enter
applies the trimmed text.
