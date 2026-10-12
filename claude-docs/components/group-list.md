# GroupList

`src/components/GroupList/` is a group page's filter, table and pager (M5.6b), for every group vocabulary, MB.132's deity traditions included. It is render-only: the page reads one page of groups through the service and hands it here. A category group's name is drawn in a `.chip` wearing its own pair ([`GroupChip`](data-table.md)), which is how a reader meets the colours. A form group's name, and a tradition's, is plain text. Each row's Edit is an address, from `groupsHref` (`href.ts`), that opens the page's modal.

The traditions' list has a name search; the category and form groups' have none. The owner asked for the search on the traditions at MB.115's review: the thirty-five seeded traditions run to a second page, where a reader looking for one has to page to it. The list draws the search only when the page hands it a `filter`, and `group-page.tsx` hands one only to a kind whose `search` is on. Turning it on for the category or form groups is that flag, plus a filter on their two services as `listDeityTraditions` takes one. A vocabulary of eight sections, or six, fits on one page, so neither needs it yet.

## Props

`GroupListProps` (`types.ts`):

| Prop                       | What it is                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `kind`                     | `'category'`, `'form'` or `'tradition'`                                                                             |
| `groups`                   | The page's groups: `{ id, name, slug, description, editHref }`, plus `colorDark`, `colorLight` for a category group |
| `previousHref`, `nextHref` | The pager's links, none at either end                                                                               |
| `position`                 | Where this page stands, `{ page, pages }`, for the pager's "Page X of Y"; none says nothing of it                   |
| `filter`                   | `{ query }`, the name search the page shows, `''` for none; absent, the list draws no search at all                 |

`groupsHref(kind, place, dialog?)` builds `/admin/category-groups`, `/admin/form-groups` or `/admin/deity-traditions` with the page's search and cursor, and `?new` or `?edit=<slug>` for a modal, through the shared `listHref` (`src/lib/list-href.ts`): `/admin/deity-traditions?query=wort&after=c&new`. A blank search is written as none. `groupsPath(kind)` is the bare page, which the search submits to and Clear opens. Each kind's address, table name, row nouns, Add label and the value kind it holds are `kinds.ts`'s `KINDS`, the one table the form, the page and the nav's tabs read too (`GroupForm` takes its nouns from it and from the held kind's in [`grouped-value-list.md`](grouped-value-list.md)).

## Contracts

- **The search is a GET form to the page itself**, as a value list's name search is ([`grouped-value-list.md`](grouped-value-list.md)): a Name field, `type="search"` under the name `query`, placeholder "Search names", in a form named "Filter Deity Traditions" inside a `<search>` landmark. It is `filter.tsx`, holding the field and what counts as a change; the shared [`FilterForm`](filter-form.md) holds the form, Filter, Clear and the soft navigation, through the list's `ListFrame`. Filtering starts again from the first page, since the form carries no cursor. The list keys the form by the search shown, so Back to another starts it again from that one.
- **The search matches in SQL**: `listDeityTraditions(page, { query })` reaches `findGroupPage`, which narrows by a case-insensitive fragment of the name, `%` and `_` read literally, through the same `containsText` the value lists use. It does not fold accents, as theirs does not. The count behind the pager reads the same search. The move picker in the edit modal still reads every tradition.
- **Every link keeps the search**: each Edit, the header's Add, the pager's two ends and the modal's way back, so closing a modal lands on the searched page it opened over.
- **Each Edit is a soft link**, the pencil [`EditLink`](icon-tip.md) with its "Edit" tooltip, named "Edit <name>" for a screen reader, so the page renders again with the modal open and Back closes it.
- **The pager is soft**, as every admin list's is, and says "Page X of Y" when the page passes `position`, as each of the three group pages does, counted through `countCategoryGroups`, `countIngredientFormGroups` or `countDeityTraditions` from the page's first row (MB.132). The traditions run to two pages; the category and form groups to one, which the pager still names.
- **The table is named for its page**, "Category Groups", "Form Groups" or "Deity Traditions", the full name its tab's short label, Groups or Traditions, stands for on the tabbed page (MB.115).
- **An empty list says what to do**, naming the tab's Add: "There are no groups yet. Add one with Add Group.", and for the traditions "There are no traditions yet. Add one with Add Tradition." A search that matches nothing names the search and what to do, in the one wording every admin list uses (`noMatchText`, `src/lib/text.ts`): "No traditions match “fixtur”. Change or clear the filter to see more."

## Styling

The list is built from the list primitives ([`../styling.md`](../styling.md), "Tables at phone width"): its root is a `.list-frame`, and its table is [`StackTable`](data-table.md), a `.data-table.data-table--stack` in a `.data-table-frame`, banded at desktop width as every admin table is (MB.115's sign-off kept the bands over a hairline rule). Under 40rem of the frame's width each row becomes a card, led by "Name" and "Description" from each cell's `data-label`, with the Edit pencil at the card's top right beside the name (a `'corner'` action column, MB.115, the owner's call). StackTable writes out the table's roles, since WebKit drops a table's meaning once its parts change `display`.

The search is the shared `.filter-row`, whose one field takes the row's whole width on a narrow column, with Filter and Clear on a line of their own beneath it, as every filter row stacks ([`filter-form.md`](filter-form.md), "Styling").

The table takes the `data-table--roomy` modifier: while it is a table, its cells take `space(3)` above and below and centre their contents, since a chip and the Edit pencil stand taller than a line of text, so on the primitive's baseline they met the band's top edge while the text met its bottom (the owner's call). As cards, the stack primitive spaces the cells instead. Its own stylesheet adds one thing: the description takes the measure.

## Stories

[`index.stories.tsx`](../../src/components/GroupList/index.stories.tsx) has eleven stories: `CategoryGroups` (three invented groups in seeded pairs), `PhoneDark` and `PhoneLight` (the same in the admin column at 375px, each row a card), `FormGroups` with a next page and no search, `Traditions` (three invented traditions under an empty search), `TraditionsSearched` (searched by a fragment, Clear offered), `TraditionsSearchedPhoneDark` and `TraditionsSearchedPhoneLight` (the same at 375px, the field across the row and Filter and Clear beneath it), `TraditionsNoMatch` with the no-match message, `Empty`, and `TraditionsEmpty` with the traditions' own message.

## Testing

`tests/components/GroupList/index.test.tsx` covers the rows and their Edit links, no table when there is no group, the search opening its first page with the query in the address and Clear opening the bare page, no search for a kind not handed one, and `groupsHref`, the search ahead of the cursor and a blank one written as none. What the search matches is `findGroupPage`'s, in `tests/db/repository/vocabularies.test.ts`. The chip's colours and the cards are presentation, owned by the stories, and paging is Pager's. The pages' half is `tests/app/admin/group-page.test.tsx` ([`group-form.md`](group-form.md), "Testing").
