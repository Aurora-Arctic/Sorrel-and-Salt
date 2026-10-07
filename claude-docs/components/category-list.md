# CategoryList

`src/components/CategoryList/` — `/admin/categories`' filter, table and pager
(M5.6, MB.178). It is render-only and a server component: the page reads one
page of the vocabulary under the address's filter through `listCategories`
and hands it over, each category with its group's name and the address that
opens it to edit, with the filter as asked and the groups it can narrow to.

## Props

`CategoryListProps` (`types.ts`):

| Prop           | What it is                                                          |
| -------------- | ------------------------------------------------------------------- |
| `categories`   | This page's `CategoryListEntry` rows, by group then name (MB.126)   |
| `filter`       | `{ query, group }`, the filter as asked, each blank for none        |
| `groups`       | Every live group as `{ slug, name }`, alphabetical: Group's choices |
| `previousHref` | The page before this one, absent on the first                       |
| `nextHref`     | The page after this one, absent on the last                         |
| `position`     | `{ page, pages }`, the pager's "Page X of Y"                        |

A `CategoryListEntry` is the category's id, name, slug and description, plus
`groupName` and `editHref`.

## Contracts

- **The group is drawn in its own chip**, the owner's call: `groupColors`, the group's pair from the page's read of the groups, through `chipColors`, as the category picker draws it; an entry without one shows the name plain. The rows take more room than the table primitive gives and centre their contents, as the group list's do, since a chip stands taller than a line of text.

- **The filter is a GET form to `/admin/categories`** (MB.178), as the user
  list's is ([`user-list.md`](user-list.md)): named "Filter categories"
  inside a `<search>` landmark, a search box labelled "Name" (`query`), a
  native `<select>` labelled "Group" (`group`), and a Filter button. A
  filtered page is an address, and filtering starts again from the first
  page, since the form carries no cursor. It is `filter.tsx`, the one client
  file here.
- **`?query=` is part of the name; `?group=` is a group's slug**, as
  `?edit=` is a category's. The page trims the query, reads a blank one as
  none, and resolves the slug against the groups it reads for its modal; a
  slug no group holds is ignored, so the list is every category and the slug
  leaves every link, as a hand-edited cursor gets the first page. The
  services take `{ query, groupId }`, and the count behind the pager reads
  the same filter as the list.
- **Group is a native `<select>`, not `ComboboxSelect`**, so the form
  submits before hydration. Its first option is "All groups", valued `""`,
  then each group by slug, alphabetical as read. A native submit sends
  `query=&group=`, which the page reads as no filter.
- **Filter is offered only when there is a new filter to apply**, as the user
  list's is: `disabled` while the trimmed query and the group match the
  filter the page shows, enabled once either differs. With JavaScript, a
  submit builds the address with `categoriesHref({ query, group })` and
  pushes it as a soft navigation, as the pager's links are, inside a
  transition: Filter wears the shared `.spinner`, `aria-busy` and the label
  "Filtering" until the filtered list arrives, the owner's rule for a submit
  (the user list's full load shows nothing until the page goes). The list
  keys the form by the filter shown, so a page showing another — Back to an
  older filter, say — starts it again from that one rather than keeping a
  stale draft. In the workshop, `next/navigation` is stubbed
  ([`workshop.md`](../workshop.md), "`.ladle/`").
- **Every action is an address.** Each row's Edit is its `editHref`, and the
  page's Add Category, on the heading's line in `.page-header` and so the
  page's rather than this component's, is `?new`. `href.ts`'s
  `categoriesHref(place, dialog)` builds both, the pager's links and the
  filter's submit too. `place` is `{ query, group, after, before }`, written
  in that order before the modal, a blank one left out. Every link keeps the
  page's filter, and every one but the pager's keeps its cursor too, so
  closing a modal, and a save, lands where it was opened. `new` is a bare
  flag, read by its presence, as the user list's `awaiting` is.
- **`next/link`, not a plain anchor.** Opening the modal is a soft navigation:
  the page renders again with the modal open, and the page itself calls the
  admin guard on every render. AdminNav keeps plain anchors for its own
  reason, which is that typed routes refuse a route not built yet.
- **Each Edit is named for its category**: the visible "Edit", then the name
  in a `visually-hidden` span, so a screen reader hears "Edit Testcraft"
  rather than a column of "Edit".
- **No categories reads "No categories yet."**, with no table; a filtered list
  with no rows reads "No category matches." instead.

## Styling

The filter is the user list's: a wrapping row of the fields and the button,
`.category-list__search`, on the `.field`, `.input`, `.select` and `.btn`
primitives, Filter `.btn--solid`. The table is the `.data-table` primitive (M5.6a): it scrolls inside its
`.data-table-frame` on a narrow screen, and a 1px `$text-muted` hairline runs
under the header row, the muted ink every hairline here uses. A description
keeps to `$measure`. Add Category
is `.btn--solid`, the page's one primary action, and each row's Edit is
`.btn--small.btn--quiet`: a row action that changes nothing, small enough to
keep the row short. The rows are banded, and the pager is
`Pager` ([`pager.md`](pager.md)), soft: Prev and Next, centred, full-size
quiet buttons with large chevrons, an end with no page disabled.

## Stories

[`index.stories.tsx`](../../src/components/CategoryList/index.stories.tsx) —
`OnePageOfSeveral`, `FirstPage`, `Filtered`, `NoMatch` and `Empty`. The
filter reaches `/admin/categories`, which the workshop does not serve.
Render-only, no test ids, no snapshots.

## Testing

`tests/components/CategoryList/index.test.tsx` covers the rows, the Edit
links, the pager, both empty messages, the filter form's action, method,
names, kept values and group options, the Filter button's disabled and
enabled states, the address it opens, and `categoriesHref`.
`tests/app/admin/categories/page.test.tsx` covers the filter the services
are called with, an unknown group slug ignored, and the filter kept on the
pager, each Edit, Add Category and the modal's way back.
`tests/e2e/admin.spec.ts` filters the seeded list by part of a name and by a
group.
