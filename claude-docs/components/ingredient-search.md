# Ingredient Search

`src/components/IngredientSearch/` is the list shell for any page that finds ingredients by name: a search box that offers matches as you type, the page's own filter fields, an action, the results and a pager. The compendium list, the coven Ingredients list and the Grimoire list use it. `useSearchText()` returns the text in the box now, searched or not, for a field in the filter slot to carry.

## Contracts

- **The shell renders on the server.** The consumer builds `IngredientSearchForm` (a client component, re-exported from `index.tsx`) because it holds function hrefs, and passes it as `search`.
- **The box asks and the list does not.** The text is debounced (`DEBOUNCE_MS`, `src/lib/debounce.ts`) and feeds the dropdown only. The list changes on Enter, the clear, a pick or the last row. A pick leaves the list as it was and the typed text stays. The clear empties the box and applies the empty search; the other filters in `searchHref` stay.
- **The magnifier is the one submit**, so without JavaScript the box is a plain GET form to `action` sending `query`. Following the NN/g magnifying-glass advice, there is no chevron.
- **Nothing is asked** until the box is focused or while the text is under `MIN_QUERY_LENGTH` (2, from `src/modules/ingredients/validation/compendium-filter.ts`, a zod-only file), counted in composed code points. Under the floor the service returns the unranked browse list, so the box offers no rows and says "Keep typing to search" (announced, sentence case, a message not a label).
- **`source` is a `SearchSource`**: `{kind:'compendium'}` (default), `{kind:'cupboard', workspaceId}` or `{kind:'grimoire', workspaceId, status}`. The box asks one document for its source only. The compendium pages omit it, the coven Ingredients page passes the cupboard, and the coven Grimoire page passes the grimoire with its tab's status, so each tab suggests its own status.
  - A cupboard answer and a compendium answer become the same `IngredientSearchMatch`; the cupboard entry's label is the row's name. The ranked fields are in `../db/compendium-read.md`.
  - A grimoire answer is ranked over title and intent (`../graphql/schema.md`). A spell has no slug, so its match holds the spell id as both `id` and `slug`, and an untitled draft reads "Untitled Spell". With `pickHref` a pick opens the Grimoire list's Quick Look; without it a pick applies the row's title (or the typed text) as the search.
- **The dropdown shows the first 25 rows**, in server order, never a second page. If there is another page, a last row "See All Results" (selectable, not counted in status) applies the debounced text. These are the combobox's `action` and `empty` (`combobox.md`).
- **A pick opens the match** when `pickHref` is given: through the route modal opener if `pickHeading` is given (the heading shows at once), else `router.push`. Neither goes through the list frame's transition, which would swap the list for its skeleton. On every ingredient list with a Quick Look, the list gives `pickHeading={detailsHeading}` and `pickPlace={DETAILS_PLACE}`, and the href is the `?entry=` address (`ingredient-entry.md`, "The details modal").
- **The search row sticks once scrolled to**, with the Filters button, Clear All and the tray. The admin compendium list shares the row; the phone sheet is unchanged.

## The parameter table

A search's whole state is its address, and the address is written and read through one typed table, [`defineSearchParams`](../../src/lib/search-param-table.ts), so a filter is never listed by hand in five places. Each entry is the name the address carries, a reader that turns what the address held into a value (a hand-edited value reads as no filter, never an error), a writer that turns a value back, and the GraphQL variable it becomes. The compendium's table is [`CompendiumList/params.ts`](../../src/components/CompendiumList/params.ts); `COVEN_PARAMS` ([`coven-params.ts`](../../src/components/IngredientSearch/coven-params.ts)) spreads it without `reviewed`, `hidden`, `sort` and `order` (curator-only) and adds `source`, `inStock` and `lowStockOnly`.

Every caller uses only the table's four functions:

- `read(params)`: the filter an address holds. The page calls it.
- `href(path, filter, extra)`: the address of a filter, in table order, then `extra` for the cursor and the modal. Every link, the pager and the filter form's applies call it, through the list's `compendiumHref`.
- `variables(filter, lookups?)`: the query's variables, a blank as `undefined`. The page keys its cached read by them, so adding a filter changes nothing there. `lookups` is the map a slug list needs to become ids.
- `changed(place, change)`: the place with a change applied and the cursor dropped.

**Adding a filter is one new entry** and touches none of those callers; `tests/lib/search-param-table.test.ts` proves it by adding one. What changes is the filter's own control, the service and the GraphQL argument it reaches.

**A list is a repeated parameter**, `?elements=fire&elements=earth`, never comma-joined: a GET form's checkboxes write repeated names themselves, so a facet filters before hydration and without JavaScript, and a form's free text may hold a comma. `listHref` writes one pair per value and `list` ([`search-params.ts`](../../src/lib/search-params.ts)) reads them back, with `someOf` dropping any value outside the set. An empty list is left out. A single-value parameter given twice by hand reads its first.

**The address names a value the way a reader would**, and the table maps it to what the query takes. A deity is its slug, `deitySlug(name, traditionName)` (`hecate-greek`, `hecate-roman`), because two traditions can share a name; the query takes `deityIds`, since an id would outweigh the rest of the address. A slug follows a keeper's rename of the deity or its tradition, and a category's slug follows its name. A slug that names no live value, such as one in a link saved before a rename, is dropped from its filter, and a filter left with none is not applied, so the list widens rather than failing.

**Free text in a list** (`textListParam`) holds curated words, not a fixed set: forms, zodiac signs and celestial bodies are keeper-curated vocabularies that offer suggestions, and a form's text is not a foreign key (CLAUDE.md, ingredient identity), so an uncurated value stays writable and the address cannot reject it the way `listParam` rejects a word outside its set. Each value is trimmed, a blank is dropped, and a repeat that differs only in case is dropped (the first spelling stays).

**A slug list** (`slugListParam`) spells its values as slugs and the query takes ids. `variables` maps each slug through `lookups[lookupKey]` (a `Map` of slug to id the page builds), drops a slug the map does not hold, and gives `undefined` when none are known. The table holds nothing category-specific.

- The compendium's page reads the cached `listCategories` (every page, through `allPages`) for the map, and the Categories picker (`CategoryPicker`) after Form in the filter row draws the choice. A pick applies the whole slug list at once. The picker keeps its own chosen state while the address catches up, and the filter row is keyed by the other filters only, so a pick does not remount it: its status region announces the pick once and the list's own status does not. Hidden inputs repeat the slugs so a native GET submit before hydration keeps them.
- A match is the union of an entry's categories and its forms', by the finder's category arm, ANDed across the categories chosen.
- From two categories the filter row also shows a Match radio group, All and Any, which sets `categoryMode` (an enum argument of `compendium` and `workspaceIngredients`, default `all`); `any` matches an entry holding any of the categories, filtered in SQL. It means nothing below two categories, so removing down to one drops it from the address and a second pick starts at All. The form holds the mode as it holds the picks, and the list's key leaves it out, so choosing a radio keeps focus. The mode alone does not make the list count as filtered.

`elements` matches an entry holding any element listed on the entry or on any of its live forms, by array overlap in SQL, ANDed with the other filters.

`reviewed` reads `1` as `'reviewed'` and `0` as `'needs_review'`, and anything else as no filter; the query sends `true` or `false`. Only a curator or a keeper may send it, and the service refuses anyone else, so the public page strips `?reviewed=` before it reads.

There is no `nomenclature` entry: the compendium search does not filter by classification. The GraphQL query and the service still accept the argument, and a `?nomenclature=` left in an old link is ignored.

**One variables string reads the list and its counts.** The page builds `JSON.stringify(COMPENDIUM_PARAMS.variables(filter, lookups))` once, with `lookups = { categories, deities }`, and gives that same string to the cached list read and the cached facet read (`compendiumFacets`), so the counts beside each facet value are taken under exactly the filter the list is under. The page sends those counts as the service returns them, keyed by id for deities and categories and by text for the rest, so each category and deity name reaches the browser once, in the `categories` and `vocabulary` props. In the browser, `facetChoices` (`CompendiumList/facets.ts`) turns them, through `compendiumFacetCounts` or a coven's `covenFacetCounts`, into the choices the filter draws. It drops an id the vocabulary no longer holds, and sorts forms, deities and categories by count, highest first, then label.

**The cursor rule.** A cursor names a place in one filter's results, so it belongs to the filter it was read under. Any change to the filter opens the first page: the filter's controls build their address from `filter` alone, never from the cursor, and `changed` drops `after` and `before`. Only the pager and a modal's way back write a cursor, through `extra`. Reload and Back need nothing built for them: the address is the state, so a reload reads it again and Back steps through the filters one change at a time. `tests/e2e/admin-compendium.spec.ts` asserts both.

**What the page sends for each card.** Each result card reaches React's data as its props, not as drawn markup, with its safety notes only as a stand-in and its categories by id ([`ingredient-card.md`](ingredient-card.md), "What the page sends").

## The search sentence

`buildSearchSentence({ filter, labels, total, noun, admin })` in `sentence.ts` is pure: no React, no component imports. It turns the filter as the address holds it, the display labels of each vocabulary and the total into `{ fragments, hasFilter }`. The component draws a `value` fragment as a quiet boxed mark and a `join` as a loud word, and draws Clear All while `hasFilter` is true. A join is never a link and carries no facet.

Clauses come in a fixed order, whatever order the address holds them: text query, the viewer's covens (the public compendium only), categories, the grimoire's four (moon phases, days, visibility, makers), forms, deities, zodiac, celestial bodies, elements, toxic, then a coven list's source, in stock and low stock, then the admin-only nomenclature, No Refs, No Form, Hidden and Reviewed. An example with every ingredient kind:

> 3 ingredients, matching rue, in the protection and healing categories, in the form oil or resin, linked to Isis, under Aries, ruled by the Sun or Mars, of the fire element, that are not toxic, classified as botanical, without references

- **Joining.** Values join through `Intl.ListFormat` in `en-US`, which puts the Oxford comma before the last word ("oil, resin, or leaf"; `en-GB` leaves it out). `Intl.ListFormat` is Baseline Widely Available, so the browser-floor guard needs no line for it. Forms, deities, zodiac, celestial bodies and elements join with "or"; categories join with "and" in all-mode ("in the protection and healing categories") and "or" in any-mode ("in the protection or healing category").
- **Casing.** A value shows in lower case (categories, forms, elements, source, nomenclature); deities, zodiac signs and celestial bodies keep their capitals as proper names. The text query shows as typed. The lowering is of the display text only: the fragment's `value` keeps its own spelling. No article goes before a vocabulary word, except "the" before Sun and Moon.
- **The viewer's covens** read "held in Hearthside or Moonwell", each by name with its capitals. They remove nothing: a coven is removed in the panel, and no value in the sentence is a link. Only an id with a label is named: the page labels the viewer's own covens alone, so a foreign or malformed id in the address filters nothing and says nothing. Under Not In (`covensNot`) the list reads "not held in Hearthside or Moonwell"; with Not In and no coven in the address, for an observer with covens to name, it reads "not held in any of my covens" ("any of my covens" is the one value, facet `covensNot`). If the address names covens and none has a label, the clause is absent, under In or Not In, as the read applies nothing.
- **Source, In Stock and Low Stock Only** belong to a coven's list and are named whenever the filter holds them: "from the local source", "from the compendium source", "in stock", "low or out of stock" (the two badges it keeps). A false flag or a null source says nothing. They remove nothing. The coven's list passes `noun` as it likes.
- **Admin-only clauses** (nomenclature, No Refs, No Form, Hidden, Reviewed) are named only when `admin` is true; otherwise they are ignored and do not count as a chosen filter. `reviewed` reads "reviewed by a curator" and `needs_review` "needing review".
- **A value with no label** is named by its raw value, so a stale link still reads. Blank values and empty lists are not chosen.

`tests/components/IngredientSearch/sentence.test.ts` asserts these strings. It is the one named exception to the copy rule, since the strings are what the function makes; the component tests assert only the status region's presence and update.

## The sticky box

The sticky box is the `<search>`, whose parent `.list-frame` spans the results (the form inside would stop at its own end), so the tray, which opens inside the form, travels with it. `--sticky-top` is set by the frame: AppShell uses the bar's bottom, PublicFrame uses 0. The box is opaque through the fill layer and the `sticky-row` layer, so the cards do not show through, and sits above the cards and below the bar, tips and dialogs.

`space(4)` of padding above is the row's own air when stuck, and a negative margin of the same size cancels it at rest, so the page lays out as without it. The search sentence takes back the `space(2)` under the row from the frame's gap.

The stuck shadow needs `IntersectionObserver`; without it the row has no shadow (a pure enhancement past the browser floor). **Forced colours** drop the shadow, so the row's full-bleed fill takes a 1px `CanvasText` rule along its foot instead, which runs the width of the page and moves nothing in the row.

## The space under the row

While the tray is shut the row's box ends at the controls, and the `space(2)` between the row and the cards is a margin outside it. Opening the tray rolls that space into the box as padding (the margin shrinks by as much, so the page does not move), and closing rolls it back, so the stuck row never shows an empty strip under its controls. The tray is anchored to the form inside, not to this box, so none of this moves the tray from the input.

The 8px follows the tray's edge, not its clock: the tray (`FacetPanel`'s `.facet-panel__clip`; `--slide-ms` is set on the clip inside and so unreadable here) slides 350ms on `ease`, and its edge covers hundreds of px, so 8px rolling over all 350ms looked slow beside it. On `ease` a roughly 400px tray's edge has moved 8px by 12ms (250 to 550px: 10 to 17ms), so the space opens in 12ms. Closing, the edge is within 8px of the row for the last roughly 64ms (55 to 79ms over the same heights), so the space waits 350 - 64 = 286ms and rolls up then, in 64ms on `ease-out`. The closed-state rule times the way back to closed and the open rule the way out of it, since a transition takes the timing of the state it ends in. `--open` is on the clip from just after the tray starts to open until it starts to close, the same two moments its rows grow and shrink in (`useSlide`). Before the script the tray is in the flow with the class, so the space is already inside the box.

## The sorrel layer

The fill is `.filter-sorrel`, a decorative `aria-hidden` child that `FilterForm` draws (its `sorrel` prop). It holds a copy of the corner sorrel (`backdrop.md`, "The copy in the search row"), because a sticky box is its own stacking context, so no `z-index` can put the real sorrel between the fill and the controls. The layer is a direct child of the `<search>`, not of the form, whose `container-type` would become the containing block of the fixed copies.

A solid `mask-image` cuts the fixed copies to the row and makes the layer a stacking context, so they blend with its page colour, as the real one does with the page's. It is a mask, not a `clip-path`, because a clip's edge is anti-aliased at a half pixel (an odd-width window centres the page on one), and there the copies drew a lighter one-pixel line over the real sorrel. The mask is on this layer and never on the `<search>`, which would cut off the stuck shadow and the tray.

The layer reaches a gutter past the row on either side, so a card under the row (its hover shadow carries 20px) shows no shadow beside it. The page gutter is the same from a phone up and in the shell and the public frame, and no wider, or the page would scroll sideways.

## The phone row

Under `$narrow-column` (the filter row's container width) the row is two lines and both stick: the search box on the first, and the Filters button and Clear All sharing the second. The `<search>` stays the one sticky box. The primitive's narrow-row rule (`_primitives.scss`, "On a phone's narrow row") gives the first child and each choice a whole line; it is scoped to this row, so the other filter rows are unchanged, and the container query is that rule's own, so the two agree on what narrow means.

## Scroll margin

A focus or a jump that scrolls a control into view lands it below the stuck row, not under it. The root's `scroll-padding-top` is the bar, the row's own height, and a step of air; the root is the scroll container, which cannot read the frames' `--sticky-top`, set below it. The first `space(2)` is the gap under the row, a margin when the tray is shut and padding when it is open, so a jump lands in the same place either way. Under the narrow column the row is two controls tall plus the row's gap, so the root leaves one more control height plus `space(3)`. That query is the container query's width on the window: the column (`$narrow-column`) plus the page's two gutters.

## Low-priority suggestions

The box shows each keystroke at once. The dropdown's rows go through `useDeferredValue`, so React draws them after the box on a slow device, and the dropdown shows its pending state until they have caught up. Clear, Next Page and Previous Page already navigate in a transition, so their lists draw at low priority too.

A keystroke makes no change in the card list, so the list is not deferred. The cost per key is browser style, layout and paint, the dropdown and React's own work. Two selectors are candidates for the style and layout cost and neither has been tried: `html:has(... .ingredient-search)` (the scroll margin) and the dropdown's `position: fixed` list changing size per key. Measure with a rule removed before changing either.

## Testing

`tests/components/IngredientSearch/` asserts the requests the box makes (once after the debounce, never before focus or under the floor, first 25 and no cursor), the action row and empty message, that a pick opens the match without applying the text, that the clear empties the box and applies the empty search, that Enter applies the trimmed text, and that the sorrel layer is hidden from assistive technology.
