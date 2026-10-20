# Ingredient Search

`src/components/IngredientSearch/` — the list shell for any page that finds
ingredients by name: a search box that offers matches as you type, the page's
own filter fields beside it, an action, the results and a pager. Added by
M8.10. The compendium list (M8.18) is its first consumer; the workspace
ingredients list (M9.6) and the spell builder follow.

## Exports

`IngredientSearch` (the default, a server component) draws the list. Its props
(`IngredientSearchProps`, `types.ts`):

| Prop                       | What it is                                                                                     |
| -------------------------- | ---------------------------------------------------------------------------------------------- |
| `search`                   | The filter row, normally an `IngredientSearchForm`                                             |
| `action`                   | Optional: the page's Add or Create, drawn beneath the filter row                               |
| `children`                 | The results: a table, cards or an empty state                                                  |
| `shape`                    | Optional: `'table'` (default) or `'cards'`; the shape of the loading skeleton `ListBody` draws |
| `previousHref`, `nextHref` | Optional: the pager's links, as for any paged list                                             |
| `position`                 | Optional: where this page stands among them all                                                |
| `className`                | Optional: the list's own root class, beside `list-frame`                                       |

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
  end: `[magnifier  Search names, forms & descriptions  x]`. There is no chevron (`toggle={false}`),
  since typing opens the dropdown already. This is the owner's call of
  2026-10-16, after a survey of design systems; Nielsen Norman Group's
  [magnifying-glass article](https://www.nngroup.com/articles/magnifying-glass-icon/)
  says a magnifier must submit when clicked. Without JavaScript the box is a
  plain GET form to `action`, sending its text as `query`.
- **The box has no visible label, and its placeholder says what the search reads**
  (the owner, 2026-10-19): "Search names, forms & descriptions", the fields the
  ranked search matches (label, formal name, folk names, forms and descriptions;
  [`compendium-read.md`](../db/compendium-read.md)). The accessible name is still
  "Name": the box is drawn without `FieldShell`, and Combobox draws its own
  visually hidden label, so no second hide mechanism exists. The clear keeps its
  name, "Clear Name", and the status region "Name results".
- **The search row sticks once scrolled to** (the owner, 2026-10-19), holding the
  box, the Filters button and Clear All with it, and the Filters tray, which opens
  inside the form and travels with it. `IngredientSearch` marks its root
  `.ingredient-search`, and its `<search>` is `position: sticky` there (the form
  inside would stop at its own end; the sticky box's parent must span the
  results), opaque through its fill layer (below) and the `sticky-row` layer, above the
  cards and below the bar, tips and dialogs. The offset is one custom property,
  `--sticky-top`, set by the frame: AppShell sets it to the bar's bottom, and
  PublicFrame, whose header scrolls away, to 0. The row has `space(4)` of padding
  above, cancelled at rest by an equal negative margin so the page lays out as
  before, and `space(2)` below, real space between the row and the cards with no
  cancelling margin (changed 2026-10-19, back to what it was). The search sentence
  under the row takes that `space(2)` back from the frame's gap, so it sits a gap
  from the input as the cards sit a gap from it. The tray hangs from the form
  inside, so the padding never moves it from the input. While stuck the row wears `$shadow-floating`, faded in and out
  with `$modal-fade` (none under reduced motion): `StuckMark`, a small client
  child, watches a one-pixel sentinel at the row's resting place with an
  IntersectionObserver (no scroll listener) and sets `data-stuck` on the row.
  Without the API (past the browser floor) the row simply has no shadow.
  The fill is not the row's own background but `.filter-sorrel`, a decorative
  `aria-hidden` child `FilterForm` draws for `IngredientSearchForm` (its `sorrel`
  prop), clipped to the row and holding a copy of the corner sorrel, so the
  sorrel shows through the stuck row while the cards under it stay hidden
  (M12.46; [`backdrop.md`](backdrop.md), "The copy in the search row"). It is
  hidden with the sorrel under `prefers-contrast: more`, and the row stays opaque. The
  root's `scroll-padding-top` leaves room for the stuck row, padding included,
  when a focus or a jump scrolls a control into view. The admin compendium list shares the row, so it
  sticks too. The phone sheet is unchanged.
- **Nothing is asked until the box is focused**, nor while the text is under
  `MIN_QUERY_LENGTH` (2) characters. The floor is the service's own, exported
  by `src/modules/ingredients/validation/compendium-filter.ts`, a zod-only file
  safe to load in the browser; both count composed code points. Under the
  floor the dropdown offers no rows, so stale rows from the last lookup never
  show; once anything is typed it says "Keep typing to search" instead, at once
  and announced by the status region, so one character is not met by silence
  (the owner, 2026-10-16). It is a message rather than a label, so sentence case.
- **Given a `workspaceId`, the type-ahead suggests from the cupboard, not the
  compendium.** `IngredientSearchForm` and the box take it as an optional prop
  (M9.6). The box then asks `workspaceIngredients(workspaceId:, query:, first: 25)`
  (the `IngredientSearchCupboardMatches` document) and never the compendium
  query; without it, the reverse. Both answers become the same
  `IngredientSearchMatch`, and where the coven's cupboard entry sets a label
  (`cupboardEntry(workspaceId:)`), the label is the row's name. Everything
  else about the box, the floor, the 25 rows and See all results., is the same.
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
- **The source is the compendium, or the coven’s cupboard.** Given a `workspaceId` the box reads the cupboard (above); the coven Ingredients page does so.

## The parameter table

A search's whole state is its address (M8.13), and the address is written
and read through one typed table, [`defineSearchParams`](../../src/lib/search-param-table.ts),
so a filter is never listed by hand in five places. Each entry is one
parameter: the name the address carries, a reader that turns what the address
held into a value (a hand-edited value reads as no filter, never an error),
a writer that turns a value back, and the GraphQL variable it becomes. The
compendium's table is
[`CompendiumList/params.ts`](../../src/components/CompendiumList/params.ts);
the helpers `textParam`, `choiceParam`, `listParam`, `slugListParam` and
`textListParam` cover the usual shapes, and `searchParam` takes any other.

The table gives four functions, and every caller uses only these:

- `read(params)`: the filter an address holds. The page calls it.
- `href(path, filter, extra)`: the address of a filter, in table order, then
  `extra` for the cursor and the modal. Every link, the pager and the filter
  form's applies call it, through the list's `compendiumHref`.
- `variables(filter, lookups?)`: the query's variables, a blank as `undefined`. The page
  keys its cached read by them, so adding a filter changes nothing there.
  `lookups` is the optional map a slug list needs to become ids (below).
- `changed(place, change)`: the place with a change applied and the cursor
  dropped.

**Adding a filter is one new entry** and touches none of those callers;
`tests/lib/search-param-table.test.ts` proves it by adding one, and the coven's table is the first real one: `COVEN_PARAMS` ([`IngredientSearch/coven-params.ts`](../../src/components/IngredientSearch/coven-params.ts)) spreads the compendium's entries and adds `source`, `inStock` (M9.7) and `lowStockOnly` (M9.8), with `tests/components/IngredientSearch/coven-params.test.ts` showing the compendium's table unchanged. The pieces
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
(M12.4). A deity's slug is its name with its tradition's, `deitySlug(name,
traditionName)`, because two traditions can share a name (`hecate-greek`,
`hecate-roman`).

**Free text in a list** (`textListParam`) is a repeated parameter whose values
are curated words, not a fixed set: `?forms=Oil&forms=Resin`. Each value is
trimmed, a blank is dropped, and a repeat that differs only in case is dropped
too (the first spelling stays). It is used for forms, zodiac signs and
celestial bodies because those three are admin-curated vocabularies that offer
suggestions rather than a closed list: a form's text is not a foreign key
(CLAUDE.md, ingredient identity), so an uncurated value stays writable and the
address cannot reject it the way `listParam` rejects a word outside its set.

**The compendium's whole table**, in the order the address writes it:

| Address parameter   | Reads as               | GraphQL variable    | Notes                                      |
| ------------------- | ---------------------- | ------------------- | ------------------------------------------ |
| `query`             | text                   | `query`             |                                            |
| `forms`             | text list              | `forms`             | The compendium read folds the case         |
| `withoutReferences` | on or off              | `withoutReferences` | Written `1`                                |
| `withoutForms`      | on or off              | `withoutForms`      | Written `1` (M12.30)                       |
| `elements`          | list of elements       | `elements`          | Dropped when outside `INGREDIENT_ELEMENTS` |
| `categories`        | slug list              | `categoryIds`       | Through the `categories` lookup            |
| `categoryMode`      | `all` or `any`         | `categoryMode`      | Written only for `any`                     |
| `deities`           | slug list              | `deityIds`          | Through the `deities` lookup               |
| `zodiac`            | text list              | `zodiacSigns`       | Sign names                                 |
| `planets`           | text list              | `celestialBodies`   | Celestial body names                       |
| `toxic`             | `toxic` or `not_toxic` | `toxic`             | Absent is any                              |

There is no `nomenclature` entry: the compendium search no longer filters by
classification. The GraphQL query and the service still accept the argument,
and a `?nomenclature=` left in an old link is ignored.

**One variables string reads the list and its counts.** The page builds
`JSON.stringify(COMPENDIUM_PARAMS.variables(filter, lookups))` once, with
`lookups = { categories, deities }` (slug to id), and gives that same string to
the cached list read and the cached facet read (`compendiumFacets`). The counts
beside each facet value are therefore taken under exactly the filter the list is
under. `compendiumFacetCounts` (`CompendiumList/facets.ts`) turns the counts,
which are keyed by id for deities and categories and by text for the rest, into
the props the filter draws: a value, a label and a count, plus a form's icon, a
deity's tradition or a category's group. It drops an id the vocabulary no longer
holds, and sorts forms, deities and categories by count, highest first, then
label.

**The cursor rule.** A cursor names a place in one filter's results, so it
belongs to the filter it was read under. Any change to the filter opens the
first page: the filter's controls build their address from `filter` alone,
never from the cursor, and `changed` drops `after` and `before`. Only the pager
and a modal's way back write a cursor, through `extra`. Reload and Back need
nothing built for them: the address is the state, so a reload reads it again
and Back steps through the filters one change at a time. The e2e spec in
`tests/e2e/admin-compendium.spec.ts` asserts both.

**A slug list** (`slugListParam`) is a repeated parameter whose values the address
spells as slugs and the query takes as ids. `read` drops repeats; `variables`
maps each slug through `lookups[lookupKey]` (a `Map` of slug to id the page
builds), dropping a slug the map does not hold, and gives `undefined` when none
are known. The table holds nothing category-specific. The compendium's
`categories` entry is `slugListParam('categories', 'categoryIds', 'categories')`; its
page reads the cached `listCategories` (every page, through `allPages`) for the
map, and the Categories picker (`CategoryPicker`, M8.11) after Form in the filter
row draws the choice. A pick applies the whole slug list at once. The picker
keeps its own chosen state while the address catches up, and the filter row is
keyed by the other filters only, so a pick does not remount it: its status
region announces the pick once and the list's own status does not. Hidden
inputs repeat the slugs so a native GET submit before hydration keeps them. A
match is the union of an entry's categories and its forms' (MB.215), by the
finder's category arm, ANDed across the categories chosen.

From two categories the filter row also shows a Match radio group, All and Any
(M8.12), which sets `categoryMode`, an enum argument of `compendium` and
`workspaceIngredients` defaulting to `all`; `any` matches an entry holding any
of the categories, filtered in SQL. The table's `categoryMode` entry writes only
`any` (`?categoryMode=any`) and reads anything else as All, so All leaves the
address bare. The mode means nothing below two categories, so removing down to
one drops it from the address and a second pick starts at All. The form holds
the mode as it holds the picks, and the list's key leaves it out, so choosing a
radio keeps focus. The mode alone does not make the list count as filtered.

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
without applying the text, that the clear empties the box and applies the empty search, that Enter
applies the trimmed text, and that the row's sorrel layer is hidden from assistive technology.

## The search sentence

`sentence.ts` exports `buildSearchSentence({ filter, labels, total, noun, admin })`
(M12.4). It is pure: no React, no component imports. It turns the filter as the
address holds it, the display labels of each vocabulary and the total into
`{ fragments, hasFilter }`. A fragment is `{ kind: 'text', text }` or
`{ kind: 'value', text, facet, value }`; the component draws a `value` as a link
to the same filter without that value, and draws Clear All while `hasFilter` is
true. Types are in `types.ts` (`SearchSentenceFilter`, `SearchSentenceFragment`).

It leads with the count (`No ingredients`, `1 ingredient`, `3 ingredients`; `noun`
swaps the pair), then one clause per kind, always in this order whatever order
the address holds them: text query, categories, forms, deities, zodiac, planets,
elements, toxic, then a coven list's source, in stock and low stock (M9.6), then the admin-only nomenclature and No Refs. Clauses are
separated by a comma. An example with every kind:

> 3 ingredients, matching “rue”, in the Protection and Healing categories, in the
> form Oil or Resin, linked to Isis, under Aries, ruled by the Sun or Mars, of
> the Fire element, that are not toxic, classified as botanical, without references

- **Joining.** Values are joined through `Intl.ListFormat` in `en-GB`, which has
  no serial comma: "Oil, Resin or Leaf". Forms, deities, zodiac, planets and
  elements join with "or"; categories join with "and" in all-mode ("in the
  Protection and Healing categories") and "or" in any-mode ("in the Protection or
  Healing category"). `Intl.ListFormat` is Baseline Widely Available, so the
  browser-floor guard needs no line for it.
- **No article before a vocabulary word**, except "the" before Sun and Moon among
  planets, which belongs to the linked value ("the Sun").
- **Toxic** takes the address's own choice, `toxic` or `not_toxic`, and says "that are toxic" or "that are not toxic"; `any` or nothing says nothing. The linked fragment's `value` is that same string.
- **Source, In Stock and Low Stock Only** belong to a coven's list and are named
  whenever the filter holds them. `source` (`local` or `compendium`) reads "from
  the Local source" or "from the Compendium source"; `inStock` reads "in stock";
  `lowStockOnly` reads "low or out of stock", the two badges it keeps. A false flag
  or a null source says nothing. Their fragments carry the facets `source`,
  `inStock` and `lowStockOnly` (`value` `true` for the two flags), so the component's
  link away drops just that one. The coven's list passes `noun` as it likes.
- **Nomenclature, No Refs and No Form** ("without forms") are named only when `admin` is true; otherwise
  they are ignored and do not count as a chosen filter.
- **A value with no label** is named by its raw value, so a stale link still reads.
  Blank values and empty lists are not chosen.

`tests/components/IngredientSearch/sentence.test.ts` asserts these strings. It is
the task's one named exception to the copy rule, since the strings are what the
function makes; the component tests assert only the status region's presence and update.
