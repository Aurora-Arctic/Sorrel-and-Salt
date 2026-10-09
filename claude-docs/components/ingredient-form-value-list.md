# IngredientFormValueList

`src/components/IngredientFormValueList/` — `/admin/forms`' filter, table and
pager (M5.6a). It is render-only and a server component: the page reads one
page of the curated form vocabulary under the address's filter through
`listIngredientFormValues` and hands it over, each form with its group's name
and the address that opens it to edit, with the filter as asked and the
groups it can narrow to. It is [`CategoryList`](category-list.md) with the
nouns changed, its filter MB.178's.

## Props

`IngredientFormValueListProps` (`types.ts`):

| Prop           | What it is                                                          |
| -------------- | ------------------------------------------------------------------- |
| `forms`        | This page's `IngredientFormValueListEntry`s                         |
| `filter`       | `{ query, group }`, the filter as asked, each blank for none        |
| `groups`       | Every live group as `{ slug, name }`, alphabetical: Group's choices |
| `previousHref` | The page before this one, absent on the first                       |
| `nextHref`     | The page after this one, absent on the last                         |
| `position`     | `{ page, pages }`, the pager's "Page X of Y"                        |

An `IngredientFormValueListEntry` is the form's id, name, slug and
description, plus `groupName` and `editHref`.

## Contracts

- **Live forms under live groups, by name**, as the service reads them: a
  form under a deleted group is no longer curated, so it is not listed.
- **The filter is a GET form to `/admin/forms`**, as the categories' is:
  named "Filter forms" inside a `<search>` landmark, a search box labelled
  "Name" (`query`), a native `<select>` labelled "Group" (`group`), and a
  Filter button. A filtered page is an address, and filtering starts again
  from the first page, since the form carries no cursor. It is `filter.tsx`,
  the one client file here, and CategoryList's `filter.tsx` but for its
  nouns.
- **`?query=` is part of the name; `?group=` is a group's slug**, as
  `?edit=` is a form's. The page trims the query, reads a blank one as none,
  and resolves the slug against the groups it reads for its modal; a slug no
  group holds is ignored, so the list is every form and the slug leaves every
  link, as a hand-edited cursor gets the first page. The services take
  `{ query, groupId }`, and the count behind the pager reads the same filter
  as the list.
- **Group is a native `<select>`, not `ComboboxSelect`**, so the form
  submits before hydration. Its first option is "All groups", valued `""`,
  then each group by slug, alphabetical as read. A native submit sends
  `query=&group=`, which the page reads as no filter.
- **Filter is offered only when there is a new filter to apply**: `disabled`
  while the trimmed query and the group match the filter the page shows,
  enabled once either differs. With JavaScript, a submit builds the address
  with `formsHref({ query, group })` and pushes it as a soft navigation,
  inside a transition: Filter wears the shared `.spinner`, `aria-busy` and the
  label "Filtering" until the filtered list arrives. The list keys the form by
  the filter shown, so a page showing another — Back to an older filter, say
  — starts it again from that one rather than keeping a stale draft. In the
  workshop, `next/navigation` is stubbed ([`workshop.md`](../workshop.md),
  "`.ladle/`").
- **Every action is an address.** Each row's Edit is its `editHref`, and the
  page's Add Form, on the heading's line in `.page-header` and so the page's
  rather than this component's, is `?new`. `href.ts`'s
  `formsHref(place, dialog)` builds both, the pager's links and the filter's
  submit too. `place` is `{ query, group, after, before }`, written in that
  order before the modal, a blank one left out. Every link keeps the page's
  filter, and every one but the pager's keeps its cursor too, so closing a
  modal, and a save, lands where it was opened. `new` is a bare flag, read by
  its presence.
- **`next/link`, not a plain anchor**, so opening the modal is a soft
  navigation and the page's admin guard runs on every render, as the
  categories list's links are.
- **Each Edit is named for its form**: the visible "Edit", then the name in
  a `visually-hidden` span, so a screen reader hears "Edit Wax" rather than
  a column of "Edit". Two live forms may share a name under different
  groups; the Group column beside it tells them apart.
- **No forms reads "No forms yet."**, with no table; a filtered list with no
  rows reads "No form matches." instead.

## Styling

The filter is the categories': a wrapping row of the fields and the button,
`.ingredient-form-value-list__search`, on the `.field`, `.input`, `.select`
and `.btn` primitives, Filter `.btn--solid`. The table is the `.data-table`
primitive in its `.data-table-frame`, as CategoryList's is: it scrolls inside
its frame on a narrow screen, a 1px `$text-muted` hairline runs under the
header row, and the rows are banded on `$surface-card`
([`styling.md`](../styling.md)). A description keeps to `$measure`. Add Form
is `.btn--solid`, each row's Edit `.btn--small.btn--quiet`, and the pager is
`Pager` ([`pager.md`](pager.md)), soft. Nothing goes further before MB.115's
design review.

## Stories

[`index.stories.tsx`](../../src/components/IngredientFormValueList/index.stories.tsx)
— `OnePageOfSeveral`, `FirstPage`, `Filtered`, `NoMatch` and `Empty`. The
filter reaches `/admin/forms`, which the workshop does not serve.
Render-only, no test ids, no snapshots.

## Testing

`tests/components/IngredientFormValueList/index.test.tsx` covers the rows,
the Edit links, the pager and its position, both empty messages, the filter
form's action, method, names, kept values and group options, the Filter
button's disabled, enabled and busy states, the address it opens, and
`formsHref`. `tests/app/admin/forms/page.test.tsx` keeps the page's half
([`layer-ownership.md`](../testing/layer-ownership.md), "The owning layer"): the guard refusing before any read; the page
and group reads, an unreadable cursor read as the first page; the filter
read from `?query=` and `?group=` into the list and its count, a blank one
as none and an unknown group slug ignored; the position counted from the
page's first row, or from none when the filter leaves it empty; each group's name joined onto its rows; Add Form on the
heading's line; the filter and cursor kept on the pager, each Edit, Add Form
and the modal's way back; and the modal the address opens. How the list
shows what it is given — the empty messages included — is this component's
test's alone.
`tests/e2e/admin.spec.ts` lists the seeded vocabulary's first page, and
filters it by part of a name and by a group.
