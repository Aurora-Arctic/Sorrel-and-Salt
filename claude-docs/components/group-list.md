# GroupList

`src/components/GroupList/` is a group page's table and pager (M5.6b), for both group vocabularies. It is render-only: the page reads one page of groups through the service and hands it here. A category group's name is drawn in a `.chip` wearing its own pair (`chipColors`), which is how a reader meets the colours. A form group's name is plain text. Each row's Edit is an address, from `groupsHref` (`href.ts`), that opens the page's modal.

There is no filter. A vocabulary of eight sections, or six, needs none, where the categories' 63 rows needed MB.178's.

## Props

`GroupListProps` (`types.ts`):

| Prop                       | What it is                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `kind`                     | `'category'` or `'form'`                                                                                            |
| `groups`                   | The page's groups: `{ id, name, slug, description, editHref }`, plus `colorDark`, `colorLight` for a category group |
| `previousHref`, `nextHref` | The pager's links, none at either end                                                                               |

`groupsHref(kind, place, dialog?)` builds `/admin/category-groups` or `/admin/form-groups` with the page's cursor, and `?new` or `?edit=<slug>` for a modal.

## Contracts

- **Each Edit is a soft link**, named "Edit <name>" for a screen reader, so the page renders again with the modal open and Back closes it.
- **The pager is soft**, as every admin list's is. No "Page X of Y": the groups have no count reader, and the list rarely runs past one page.
- **No groups reads "No groups yet."**

## Styling

Layout only, until MB.115: CategoryList's column without its filter row. Its cells take more room than the primitive's, `space(3)` above and below, and centre their contents: a chip and the small Edit button stand taller than a line of text, so on the primitive's baseline they met the band's top edge while the text met its bottom (the owner's call). The description takes the measure.

## Stories

[`index.stories.tsx`](../../src/components/GroupList/index.stories.tsx) has three stories: `CategoryGroups` (three invented groups in seeded pairs), `FormGroups` with a next page, and `Empty`.

## Testing

`tests/components/GroupList/index.test.tsx` covers the rows and their Edit links, a category group's chip carrying its pair, a form group's plain name, the empty list, the pager's link, and `groupsHref`.
