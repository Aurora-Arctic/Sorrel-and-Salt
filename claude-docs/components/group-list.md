# GroupList

`src/components/GroupList/` is a group page's table and pager (M5.6b), for every group vocabulary, MB.132's deity traditions included. It is render-only: the page reads one page of groups through the service and hands it here. A category group's name is drawn in a `.chip` wearing its own pair (`chipColors`), which is how a reader meets the colours. A form group's name, and a tradition's, is plain text. Each row's Edit is an address, from `groupsHref` (`href.ts`), that opens the page's modal.

There is no filter. A vocabulary of eight sections, or six, needs none, where the categories' 63 rows needed MB.178's. The thirty-five seeded traditions run to a second page and take none either: the pager carries them.

## Props

`GroupListProps` (`types.ts`):

| Prop                       | What it is                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `kind`                     | `'category'`, `'form'` or `'tradition'`                                                                             |
| `groups`                   | The page's groups: `{ id, name, slug, description, editHref }`, plus `colorDark`, `colorLight` for a category group |
| `previousHref`, `nextHref` | The pager's links, none at either end                                                                               |
| `position`                 | Where this page stands, `{ page, pages }`, for the pager's "Page X of Y"; none says nothing of it                   |

`groupsHref(kind, place, dialog?)` builds `/admin/category-groups`, `/admin/form-groups` or `/admin/deity-traditions` with the page's cursor, and `?new` or `?edit=<slug>` for a modal, through the shared `listHref` (`src/lib/list-href.ts`): `/admin/form-groups?after=c&new`.

## Contracts

- **Each Edit is a soft link**, the pencil [`EditLink`](icon-tip.md) with its "Edit" tooltip, named "Edit <name>" for a screen reader, so the page renders again with the modal open and Back closes it.
- **The pager is soft**, as every admin list's is, and says "Page X of Y" when the page passes `position`, as each of the three group pages does, counted through `countCategoryGroups`, `countIngredientFormGroups` or `countDeityTraditions` from the page's first row (MB.132). The traditions run to two pages; the category and form groups to one, which the pager still names.
- **The table is named for its page**, "Category Groups", "Form Groups" or "Deity Traditions", the full name its tab's short label, Groups or Traditions, stands for on the tabbed page (MB.115).
- **An empty list says what to do**, naming the tab's Add: "There are no groups yet. Add one with Add Group.", and for the traditions "There are no traditions yet. Add one with Add Tradition."

## Styling

The list is built from the list primitives ([`../styling.md`](../styling.md), "Tables at phone width"): its root is a `.list-frame`, and its table a `.data-table.data-table--stack` in a `.data-table-frame`, banded at desktop width as every admin table is (MB.115's sign-off kept the bands over a hairline rule). Under 40rem of the frame's width each row becomes a card, led by "Name" and "Description" from each cell's `data-label`, with the Edit pencil at the card's top right beside the name (`.data-table__card-action`, MB.115, the owner's call). The table writes out its roles by spreading `tableRole` and `stackCell` (`src/lib/table-roles.ts`) onto each part, since WebKit drops a table's meaning once its parts change `display`; every admin table spreads the same helper.

Its own stylesheet adds two things. The description takes the measure. While it is a table, its cells take `space(3)` above and below and centre their contents: a chip and the Edit pencil stand taller than a line of text, so on the primitive's baseline they met the band's top edge while the text met its bottom (the owner's call). As cards, the stack primitive spaces the cells instead.

## Stories

[`index.stories.tsx`](../../src/components/GroupList/index.stories.tsx) has seven stories: `CategoryGroups` (three invented groups in seeded pairs), `PhoneDark` and `PhoneLight` (the same in the admin column at 375px, each row a card), `FormGroups` with a next page, `Traditions` (two invented traditions), `Empty`, and `TraditionsEmpty` with the traditions' own message.

## Testing

`tests/components/GroupList/index.test.tsx` covers the rows and their Edit links, no table when there is no group, and `groupsHref`, `/admin/deity-traditions` included. The chip's colours and the cards are presentation, owned by the stories, and paging is Pager's. The pages' half is `tests/app/admin/group-page.test.tsx` ([`group-form.md`](group-form.md), "Testing").
