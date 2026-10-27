# CompendiumList

`src/components/CompendiumList/` — `/admin/compendium`'s filter, table and
pager (M5.5), built as the category list's is
([`grouped-value-list.md`](grouped-value-list.md)). It is render-only and a server
component: the page reads one page of the compendium under the address's
filter through `listCompendium` and hands it over, each entry with its
formal name, its classification, its live forms and the address that opens
it to edit, with the filter as asked and the curated forms the filter
offers. The table's columns are Name, Formal Name, Classification, Form and Updated (MB.260; `updatedColumn`, [data-table.md](data-table.md)):
the formal name sits beside the label because it is the entry's identity
(MB.215), the owner's call in MB.115. The page reads each page's forms in
one batch through `variantsOf(null, refs)`, the read `Ingredient.variants`
resolves through, rather than one read per row.

**The Categories column** (after Form, before Updated) draws the card's chips through the shared `CategoryChips` ([`category-chips.md`](category-chips.md)) at its `compact` size: the first two and a +N button, an entry with none showing a dash. The admin page reads them in one batch for the page (`readCardCategories`), and `CompendiumListEntry` carries them as `categories`. The +N panel is fixed-position, so the table frame's scrolling neither clips it nor grows the row; `tests/e2e/admin-compendium.spec.ts` measures both, on a desktop table and a phone card.

## Props

`CompendiumListProps` (`types.ts`):

| Prop           | What it is                                                                                                                                                                                                     |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `entries`      | This page's `CompendiumListEntry` rows, in the service's order                                                                                                                                                 |
| `filter`       | `{ query, forms, withoutReferences, withoutForms, elements, categories, categoryMode, deities, zodiac, celestialBodies, toxic, reviewed }`, as asked; `reviewed` (M14.8) on the admin list only                |
| `categories`   | Every live category the Categories picker offers, `{ id, slug, name, group }` each                                                                                                                             |
| `facets`       | `CompendiumFacetCounts`: each facet's choices as `{ value, label, count }`, under the filter shown (`facets.ts`)                                                                                               |
| `vocabulary`   | `{ deities, formIcons }`: every live deity with its id, slug, name and tradition, and each curated form's group icon by folded name. The open panel needs them to turn a live answer back into labelled counts |
| `previousHref` | The page before this one, absent on the first                                                                                                                                                                  |
| `nextHref`     | The page after this one, absent on the last                                                                                                                                                                    |
| `position`     | `{ page, pages }`, the pager's "Page X of Y"                                                                                                                                                                   |

A `CompendiumListEntry` is the entry's id, name and slug, its
`canonicalName`, `null` for none, its `forms` (`CompendiumListForm[]`, `{ name, icon }` for each of the entry's live
forms in form order, `[]` for none; `icon` is the form's group's icon name, `null` for a form with none, and the Form column draws each as `<FormIcon name={icon} />` before its name, M12.7), and `editHref`. In the
filter, `query` is blank for none and `forms`, `zodiac` and `planets` are lists of
curated text, `[]` for none. `deities` and `categories` hold slugs. The table is
[`ingredient-search.md`](ingredient-search.md#the-parameter-table)'s.

The page reads the Form box's choices as `facets.forms`, each with its count, from
`compendiumFacets`, and each form's icon from the vocabulary module's
`listIngredientFormValues`, every page of it through `allPages`
(`src/lib/pagination.ts`), not one page of the maximum as the curated lists
read their groups: 84 forms are seeded against `MAX_PAGE_SIZE`'s 100, and an
admin adds more as the compendium grows. Two live forms may share a name in
different groups, so the page offers each name once, whatever its case.

## Contracts

- **The public page shares the filter.** `CompendiumListFilter` takes `audience` (`'admin'`, the default, or `'public'`). The public audience filters at `/compendium`, draws no No Refs control and no Classification facet, and words its empty sentence through the exported `emptyText(..., whenEmpty)`. The cards that page draws are [`compendium-cards.md`](compendium-cards.md).
- **In My Covens, on the public page alone (M12.55).** `CompendiumListFilter` takes `covens`, the viewer’s covens as `{ id, name }`, every membership a viewer’s included, and hands them to [`FacetPanel`](facet-panel.md), which draws In My Covens on the line with Forms and Toxic, after both, with its In / Not In choice beside it (the owner's call, 2026-10-23; Forms and Toxic one half and In My Covens and the choice the other from the tablet width, stacked Forms, Toxic, In My Covens below it, as every line of the panel is), as a combobox of the covens by name with no counts. Picked, the list holds only the entries a cupboard of any one of them holds (a live `workspace_compendium_entries` row); none picked filters nothing. The address carries the ids as a repeated `covens` parameter (`COMPENDIUM_PARAMS.covens`, `textListParam('covens', 'covenIds')`), which counts as a filter, so the page is `noindex`. Beside the field a Covens choice chip turns it to Not In, kept in the address as `covensNot=1` (`COMPENDIUM_PARAMS.covensNot`) and absent for In: with covens picked the list holds only the entries none of them holds, and with none picked only the entries none of the viewer's covens holds, every membership counted. Removing the last picked coven switches the choice back to In (the owner's call, 2026-10-23), so the address drops `covensNot` with it; only Not In chosen with none picked reads "not held in any of my covens". The live counts ask `compendiumFacets` with `covensNot` too. The sentence names them "held in A or B", or under Not In "not held in A or B", or "not held in any of my covens" with none picked ([`ingredient-search.md`](ingredient-search.md), "The search sentence"). The page passes no `covens` for a visitor or an account in no coven, and the admin and coven lists pass none, so the field is not drawn there. How the page reads the narrowed list is [`compendium-cards.md`](compendium-cards.md), "In My Covens".
- **A coven’s Ingredients page shares it too (M9.6).** `audience="coven"`, with `covenSlug` and `workspaceId`, filters at `/coven/<slug>/ingredients` (`covenIngredientsHref`, `href.ts`), is labelled Filter Ingredients, and draws no No Refs control and no Classification facet. The filter it is given also carries `source`, `inStock` and `lowStockOnly`, so the panel draws Source, In Stock and Low Stock Only. The name search suggests from the coven’s cupboard and a pick opens `/coven/<slug>/ingredients/<id>`. The live counts ask `workspaceIngredientFacets` (the `CovenFacetCounts` document) with `workspaceId`, and the sentence names the three choices. The cards are [`coven-cards.md`](coven-cards.md).

- **The filter is a GET form to `/admin/compendium`** (`COMPENDIUM_PATH`, `href.ts`; MB.178),
  named "Filter the Compendium" inside a `<search>` landmark and `position: relative`
  (`.compendium-list__row`), because the panel opens just under it. In order: the Name
  type-ahead (`query`, [`ingredient-search.md`](ingredient-search.md)) with its own Search
  submit, then [`FacetPanel`](facet-panel.md) (M12.4) with `admin` on: the Filters (n)
  button, a quiet Clear All link beside it while any facet is in use, and the dialog of
  facets (categories with Match, No Refs, No Form, forms, toxic, celestial bodies, zodiac, deities,
  elements). Above the results, outside the form, sits [`SearchSentence`](search-sentence.md).
  The compendium search has no Classification filter (the column stays in the table); the
  `FilterForm` Clear link is turned off (`clear={false}`), since the panel carries Clear
  All, a plain link to `/admin/compendium`.
  A filtered page is an address, and filtering starts again from the first page, since the
  form carries no cursor. `filter.tsx` is the one client file; its fields sit inside the
  shared `FilterForm` ([`filter-form.md`](filter-form.md)), which holds the form, the
  loading state and the soft navigation.
- **Every address carries the whole filter.** Apply Filters, a panel close or the Search submit
  builds the address from the filter shown with the name typed (trimmed) and every facet
  set over it (`hrefFor`, through `COMPENDIUM_PARAMS.changed`, which drops the cursor).
  The lists are repeated parameters, categories and deities are slugs, No Refs is
  `withoutReferences=1`, No Form (M12.30, the entries with no live form) is `withoutForms=1`, Reviewed (M14.8, the admin's) is `reviewed=1` or `reviewed=0`, and `categoryMode` is written only from two categories up.
  Picking a name in the dropdown instead opens that entry's `?edit=` modal over the filter
  as shown, the text typed not applied (the owner's call, M8.10).
- **Before hydration** the dialog is drawn open inside the form, each facet a native
  control under the name the parameter table reads (forms and the other lists as
  `<select multiple>`, categories as the native `Categories` select, Match and Toxic as
  radios, No Refs as a checkbox sent as `1`), and Apply Filters or Enter in the search box
  submits them all. Once hydrated, a change in the panel is held, since the panel covers the results, and
  Apply Filters, Escape or any other close applies every held change in one soft
  navigation (the owner's call, 2026-10-17). Back steps through those and a reload
  restores the last. A close with nothing changed pushes nothing. Clear All beside the
  Filters button applies at once; the one at the panel's foot clears what is held, then
  applies and closes. The typed name applies only through Apply Filters or Enter.
- **The panel is held ahead of the page.** `CompendiumListFilterRow` keeps the panel's
  filter in state, the held changes, and takes the page's filter again whenever
  it changes (Back, Clear All). The row is keyed by the name searched only, so a facet
  change does not draw it afresh and the open panel and the focus inside survive. The
  cost is that a new text search does draw it afresh, which closes the panel. While a
  list is on its way, `FilterForm` marks the controls `aria-disabled` and refuses
  presses, so a second change goes nowhere.
- **The sentence** is `buildSearchSentence` over the filter, the total
  (`resolveNumberedPage` returns `totalCount`, which the page passes down as `total`), and
  the labels the facets give: a category by its name, a deity by its name with its
  tradition added when another deity shares the name, an element by its label. It takes
  `searching` from the list's navigation, so it types itself out while a new search loads and stays still when a pager end changes the page.
- **Every action is an address.** Each row's Edit is its `editHref`, and the
  page's Add Ingredient is `?new`. `href.ts`'s `compendiumHref(place, dialog)`
  builds both, the pager's links and the filter's submit too, a typed wrapper
  on the shared `listHref` (`src/lib/list-href.ts`). `place` is
  every entry of `COMPENDIUM_PARAMS`, then `after` and `before`, written in the
  table's order before the modal, a blank one left out and No Refs as
  `withoutReferences=1`. `dialog` is `'new'`, a bare flag, or
  `{ edit: slug }`.
- **`next/link`, not a plain anchor**, as the category list's Edit: opening
  the modal is a soft navigation, and the page calls the admin guard on every
  render.
- **The Form column lists the entry's forms with a dot between them** (2026-10-19; commas before), the card's mechanism (`dotted-row`, [`styling.md`](../styling.md), "Dotted lists"), a spoken comma in each item for a screen reader. Each form is one unit, its icon then its name, held on one line (`.compendium-list__form`): the icon sits a quarter of an em from its own name, and the forms sit in a flex row (`.compendium-list__forms`, wrapping only as a card) with a wider gap, `space(4)` with the dot at its middle, between them, so an icon never reads as the previous form's (the owner's call, 2026-10-16). The gap is the row's, not a margin on each form, so a form that wraps onto a new line starts at the cell's edge like the first (the owner's call, 2026-10-17). The row is `vertical-align: top`: an inline-flex box takes its baseline from its first item, and the icon's svg has none, so left to that the names sit 4px above the row's other text (measured in Chromium: -4px, now 0). Top puts the first line level with the row's other text and lets a wrapped form hang below it.
- **Each name links to its entry's own page**, `/compendium/ingredients/<slug>` by the entry's stored slug (M8.19), the public route, which offers a curator Edit over the page. The link (`.compendium-list__name`, drawn by the shared `icon-link` mixin in `scss/_mixins.scss`, which the entry page's Compendium Entry link uses too) is in the body ink with no underline at rest, followed by a chain icon (`LinkIcon`, in `IconTip/icons.tsx`, decorative) so it does not rest on colour alone, which is `LinkIconHint` ([`link-hint.md`](link-hint.md)): while the link is pending the chain turns into the loading ring in the same space, so this link has no dot. Pointed at or keyboard-focused, the whole name fades to the link colour (`$accent`) and the icon alone grows to 1.2 times (a transform from its inline start, so nothing reflows; the owner's call, 2026-10-17); reduced motion snaps both. To the name's left, before its link, the Quick Look eye (`DetailsLink`, named "Quick Look" and the entry's name) opens the entry's details modal over the list at `?entry=<slug>` (M12.5; left of the name, the owner's call, 2026-10-20); the name's link and its accessible name are unchanged. The pencil still opens the edit modal from the list. The link is in the Name cell, so the wide table and the stacked card draw it alike.
- **None is an em dash.** A null formal name, or an entry with no form, shows
  "—" rather than an empty cell: the Unknown list tells an entry with an
  unconfirmed formal name from one with none by this column.
- **Each Edit is a pencil, [`EditLink`](icon-tip.md), opening the modal at once (M9.18) under the entry's `editHeading` ([`modal.md`](modal.md), "Opening at once"), named for its entry
  and its formal name**: "Edit", the label and, when there is one, the
  formal name in `visually-hidden` text, with the tooltip "Edit" on hover
  or focus, so a screen reader hears "Edit Testwort, Fixtura
  testalis", or the label alone without a formal name. The formal name is
  there because it is the entry's identity: two rows can share a label,
  never a formal name.
- **An empty list says why, with no table.** With no filter the compendium
  itself is empty, and the paragraph says how to begin it: "The compendium is
  empty. Add the first entry with Add Ingredient." A filtered list with no
  rows names each filter in use, so an admin sees what to change, then says
  to change or clear it: "No entries match “wort”, the form “Oil”, the
  classification Botanical and No Refs. Change or clear the
  filter to see more." The query and the form are quoted, the
  classification is its label, and Without
  References is the switch's (MB.115, the owner's call). The sentence is
  built from the same two pieces as `noMatchText` (`noMatchLead` and `NO_MATCH_ADVICE`, `src/lib/text.ts`), one wording for every admin list. It is a node, not a
  string: each filter value is bold (700) (the search sentence above boxes its
  values instead), while "the form", "the category", the joining words and the closing
  advice stay regular, and the whole sentence is muted (`$text-muted`) through
  `.compendium-list__empty`. The public cards share it.

**MB.215: the Form column lists the entry's forms.** Once an entry's forms are its variants (DESIGN.md §5), MB.222 made the Form column list its live forms, "Herb, Oil", with the em dash for an entry with none, and its rows carry their forms rather than one. Each Edit is named for the entry's label and formal name rather than its form, since identity is the formal name alone. An entry with no form is flagged on the admin's to-do list (M8.18; [`../design-decisions/mb.215-ingredient-variants.md`](../design-decisions/mb.215-ingredient-variants.md)).

## The Reviewed filter (M14.8)

The admin list filters by a curator's review mark: the panel's Reviewed chip ([`facet-panel.md`](facet-panel.md)) writes `?reviewed=1` for the entries a curator has reviewed and `?reviewed=0` for the ones still needing review, and the sentence names it ("reviewed by a curator", "needing review"). The admin page passes the curator's session to `listCompendium`, `countCompendium` and `compendiumFacets`, since the service refuses the filter, and leaves out the counts, for anyone who does not curate ([`../db/compendium-read.md`](../db/compendium-read.md)). The public list and a coven's list carry no `reviewed`. The entry's own mark and the switch that sets it are in its details ([`ingredient-entry.md`](ingredient-entry.md), "The details modal").

## The panel's counts

While something is held, the options, segments and chips show what the filter as held
would list, not what the page drew. `useLiveFacets` (`live-facets.ts`) asks the
public `compendiumFacets` query through `/api/graphql` (no session), with the held filter
as variables, built through `COMPENDIUM_PARAMS.variables` from the `categories` and
`vocabulary.deities` slug-to-id maps. The ask waits for the clicking to settle
(`DEBOUNCE_MS`), is keyed by the variables so an answer for a filter since replaced is
never shown, and keeps the previous answer on screen while the next comes. The chips show
their placeholder while the ask is out. `compendiumFacetCounts` turns the answer into the
same labelled counts the page draws, using `vocabulary` for deity names and form icons.
With covens held, the variables carry `covenIds`, and the service proves each id against the session the request carries, so the counts are of the entries those covens hold; with none, the answer is the cached, public one.
The ask is off while the held filter equals the applied one, so the page's own counts
show then. A failed ask leaves the page's counts in place. No resolver needed a
DataLoader: the query is one request per ask.

## Styling

None of its own; the stylesheet went in MB.115. The list's root is
`.list-frame`, its filter the `.filter-row` `FilterForm` draws, on the
`.field`, `.input`, `.select` and `.switch` primitives and
the Name box's Combobox ([`styling.md`](../styling.md), "Form fields"). The table is
[`StackTable`](data-table.md): the `.data-table` primitive with the
`--stack` modifier, banded on `$surface-card` with a 1px `$text-muted`
hairline under the header row at desktop width, and each row a card once
its frame is under `$table-stack-width`, as on a phone ("Tables at phone
width" there). StackTable writes out every part's role and names each cell's
column in `data-label`; Edit is a `'corner'` action column, its heading
hidden, its cell unlabelled at the card's top right. Each row's Edit is the larger green
pencil ([`icon-tip.md`](icon-tip.md)), and the pager is `Pager` ([`pager.md`](pager.md)),
soft. The formal name is plain, not italic: a binomial is italicised, a
mineral's or a chemical's name is not, and the row does not carry its kind.

## Stories

[`index.stories.tsx`](../../src/components/CompendiumList/index.stories.tsx), `Ingredients / Compendium List`: one story, `States`, with a control that chooses Default (a middle page), First Page, Filtered, Chosen Values Counted, No Matches, Empty, Zodiac And Bodies Chosen, Without Forms, Match All Categories, Last Page, Single Page and Filter Panel Open. At 375px, from the toolbar viewport menu, every row is a card and Filtered shows the Filters button and Clear All. The filter shows a deity, categories, forms and elements. Every state is the page as `/admin/compendium` draws it: the admin layout's frame with the Compendium page current in its nav, then a `main` holding the page header with Add Ingredient, then the list. The filter reaches `/admin/compendium`, which the workshop does not serve. Render-only, no test ids, no snapshots.

## Testing

`tests/components/CompendiumList/index.test.tsx` covers the rows, the Edit links and their names, no table when there are none, `compendiumHref`, and what the list does while a filter or a page is on its way: the loading state (list gone, row `aria-busy`, controls `aria-disabled`, a second change refused), the list left in place while a name is typed, and the sentence typed for a filter but left settled for a pager press. `tests/components/CompendiumList/filter.test.tsx` renders the filter row and its sentence without the table, through `IngredientSearch` as the list does, and covers the rest: the form the server drew sending the name and every facet (categories included), the address a panel change or the Search submit pushes (name typed and every facet carried, No Refs and No Form as `1`, Match left out below two categories), a picked name opening its modal over the filter shown, a change held until Apply Filters applies them all in one push, a close with no change pushing nothing, a count in the panel updating after a change before Apply, Clear All applying at once, the form kept through a facet change and drawn afresh for a new name, the panel following the address, In My Covens, and the sentence naming deities (with the tradition only for a shared name) and categories. The Filters count and when Clear All is drawn are FacetPanel's (`tests/components/FacetPanel/index.test.tsx`). The fixtures and the row's controls both files use are `tests/support/compendium-list.tsx`. The browser flows are `tests/e2e/admin-compendium.spec.ts`. `tests/app/(shell)/admin/compendium/page.test.tsx`
covers the page's side: `?forms=` read trimmed into the list and its count,
blank as none, the facet read under the same variables as the list, deities mapped from slugs to ids, zodiac, celestial bodies and toxic, kept on every Edit, the pager, Add Ingredient and the
redirect, and the forms read past their first page, each name once. The Categories picker (M8.11) is covered in the component test (entries shown, an unknown slug not shown, hidden inputs, repeated slugs applied and removed, the typed name carried, other controls keeping the categories, one announcement, focus kept) and, on the page, by slugs mapped to ids, an unknown slug dropped, and the categories read past their first page.

## The pinned Edit column and the Categories floor (2026-10-19)

- **The Edit column stays at the table's right edge** while the others scroll beneath it, in the neutral `sticky-action-column` mixin ([`styling.md`](../styling.md)): the page's or a banded row's own ground and a `$hairline` rule down its left, where the People table's Impersonate wears the same pinning in red. It is given to the column as `className` and `headingClassName` (`.compendium-list__edit`), and as a card it is static again. Layers: the column is `$sticky-column-layer` (1, `_layers.scss`); the +N panel is `layer('floating')`, so it passes over the pinned pencils of the rows beneath. The pencil's tip opens inside the cell's stacking context, to its left, so no later pinned cell reaches it.
- **The Categories column has a floor where the table is wide.** At a frame of 75rem or more the column is at least 16.75rem of content (plus the cell inset), measured against the widest row of chips any of the 313 seeded entries shows with the final compact, dot-less chips: Aspen's Ancestor Work and Communication with its +8 button, 266px (16.625rem), rounded up to the next 0.25rem. Narrower, the floor does not apply and the table scrolls instead of wrapping the chips; as a card the rule never applies.
- **A row stays on one line while the table is a table** (2026-10-19, the owner's call). The table takes `data-table--nowrap`, so no cell wraps and the table scrolls sideways in its frame. That class alone does not hold the two flex rows, so the Form column's `.compendium-list__forms` and the Categories cell's chip row are set to `flex-wrap: nowrap` too (the chip rule is scoped to the Categories cell, so cards elsewhere still wrap). As a card (the frame under `$table-stack-width`) the cells, the forms and the chips all wrap again.
- **The dot between forms is centred on the form's own box** (`inset-block: 0; margin-block: auto`), and the table's form wrapper is a flex box so that box is as tall as the form. Measured in Chromium: the dot's centre equals the icon's centre on the card and in the table; the lowercase x-height centre sits 0.5px (card) and 1.5px (table) lower.
