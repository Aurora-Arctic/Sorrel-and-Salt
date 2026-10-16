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
  The list changes on Enter, a pick or See All Results, and on nothing else.
- **A pick leaves the list as it was** and the typed text stays in the box.
- **The clear (x) empties the box only.** It does not apply anything.
- **The magnifier Search button is the form's one submit.** Without
  JavaScript the box is a plain GET form to `action`, sending its text as
  `query`.
- **Nothing is asked until the box is focused**, nor while the text is under
  `MIN_QUERY_LENGTH` (2) characters. The floor is the service's own, exported
  by `src/modules/ingredients/validation/compendium-filter.ts`, a zod-only file
  safe to load in the browser; both count composed code points. Under the
  floor the dropdown offers no rows and no empty message, so stale rows from
  the last lookup never show.
- **The dropdown shows at most 25 rows, the first page, in the server's
  order.** It never asks for a second. When there is another page, See All
  Results sits beneath the rows and applies the debounced text to the list;
  when nothing matches, "No Matches" sits in the dropdown. Both are the
  combobox's `empty` and `footer` ([`combobox.md`](combobox.md)).
- **A pick opens the match.** With `pickHeading`, through the route modal
  opener, so the modal shows its heading at once while its page loads, as the
  list's own edit links do. Without it, a plain `router.push`. Neither goes
  through the list frame's transition, which would grey the list and swap it
  for a skeleton. The heading is opt-in so a consumer whose pick is a page
  (M8.18) does not show a loading modal.
- **The source is the compendium only.** M9.6 adds the workspace source.

## Styling

Tokens only, until the section's design review: a flex row for the box and its
submit, and the action right-aligned beneath it.

## Stories

[`index.stories.tsx`](../../src/components/IngredientSearch/index.stories.tsx),
under `Lists / Ingredient Search`: `FewMatches`, `ManyMatches` (See All
Results) and `NoMatches`. Each stubs `window.fetch` for `/api/graphql`.

## Testing

`tests/components/IngredientSearch/index.test.tsx` asserts the requests the box
makes (once after the debounce, never before focus or under the floor, first 25
and no cursor), the footer and empty message, that a pick opens the match
without applying the text, that the clear changes nothing else, and that Enter
applies the trimmed text.
