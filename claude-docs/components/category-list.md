# CategoryList

`src/components/CategoryList/` — `/admin/categories`' table and pager (M5.6).
It is render-only and a server component: the page reads one page of the
vocabulary through `listCategories` and hands it over, each category with its
group's name and the address that opens it to edit.

## Props

`CategoryListProps` (`types.ts`):

| Prop           | What it is                                    |
| -------------- | --------------------------------------------- |
| `categories`   | This page's `CategoryListEntry` rows, by name |
| `previousHref` | The page before this one, absent on the first |
| `nextHref`     | The page after this one, absent on the last   |
| `position`     | `{ page, pages }`, the pager's "Page X of Y"  |

A `CategoryListEntry` is the category's id, name, slug and description, plus
`groupName` and `editHref`.

## Contracts

- **Every action is an address.** Each row's Edit is its `editHref`, and the
  page's Add Category, on the heading's line in `.page-header` and so the
  page's rather than this component's, is `?new`. `href.ts`'s
  `categoriesHref(cursor, dialog)` builds both, and the pager's links too. It keeps the page's cursor, so closing a
  modal lands where it was opened. `new` is a bare flag, read by its presence,
  as the user list's `awaiting` is.
- **`next/link`, not a plain anchor.** Opening the modal is a soft navigation:
  the page renders again with the modal open, and the page itself calls the
  admin guard on every render. AdminNav keeps plain anchors for its own
  reason, which is that typed routes refuse a route not built yet.
- **Each Edit is named for its category**: the visible "Edit", then the name
  in a `visually-hidden` span, so a screen reader hears "Edit Testcraft"
  rather than a column of "Edit".
- **No categories reads "No categories yet."**, with no table.

## Styling

The user list's table: it scrolls inside its frame on a narrow screen, and a
description keeps to `$measure`. A 1px `$text-muted` hairline runs under the
header row (`thead th`), the muted ink every hairline here uses. Add Category
is `.btn--solid`, the page's one primary action, and each row's Edit is
`.btn--small.btn--quiet`: a row action that changes nothing, small enough to
keep the row short. The rows are banded, and the pager is
`Pager` ([`pager.md`](pager.md)), soft: Prev and Next, centred, full-size
quiet buttons with large chevrons, an end with no page disabled.

## Testing

`tests/components/CategoryList/index.test.tsx`, which covers `categoriesHref`
too.
