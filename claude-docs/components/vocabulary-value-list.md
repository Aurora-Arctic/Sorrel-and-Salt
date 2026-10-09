# VocabularyValueList

`src/components/VocabularyValueList/` — a flat curated vocabulary's filter,
table and pager (MB.95): `/admin/planets`' and `/admin/zodiac-signs`'. It is
render-only and a server component: the page reads one page of the
vocabulary under the address's query through `listAstrologyValues` and hands
it over, each value with the address that opens it to edit. It is
[`GroupedValueList`](grouped-value-list.md) without the group:
a planet or a sign is filed under nothing.

One component for both vocabularies, keyed by `vocabulary`, since the two
pages differ only in their address and their nouns. `vocabularies.ts`'s
`VOCABULARY_COPY` holds both, and `VocabularyValueForm` and the page read it
too: `/admin/planets` says "planet" and Add Planet, `/admin/zodiac-signs`
says "sign" and Add Sign under the heading "Zodiac signs". A third flat
vocabulary is a row there and a key on `FlatVocabulary`.

## Props

`VocabularyValueListProps` (`types.ts`):

| Prop           | What it is                                                |
| -------------- | --------------------------------------------------------- |
| `vocabulary`   | `'planets'` or `'zodiacSigns'`: the address and the nouns |
| `values`       | This page's `VocabularyValueListEntry`s                   |
| `query`        | The name query as asked, blank for none                   |
| `previousHref` | The page before this one, absent on the first             |
| `nextHref`     | The page after this one, absent on the last               |
| `position`     | `{ page, pages }`, the pager's "Page X of Y"              |

A `VocabularyValueListEntry` is the value's id, name, slug and description,
plus `editHref`.

## Contracts

- **Live rows, by name**, as the service reads them. One tier: nothing else
  decides what is curated.
- **The filter is a GET form to the page itself**, the forms' without the
  Group: named "Filter planets" or "Filter signs" inside a `<search>`
  landmark, a search box labelled "Name" (`query`), and a Filter button.
  Filter is `disabled` while the trimmed query matches the one the page
  shows, and a submit pushes `vocabularyHref(vocabulary, { query })` as a
  soft navigation inside a transition, Filter busy as "Filtering" until the
  list arrives. The list keys the form by the query shown, so Back to an
  older one starts it again from that. It is `filter.tsx`, the one client
  file here.
- **Every action is an address.** `href.ts`'s
  `vocabularyHref(vocabulary, place, dialog)` builds each Edit, the page's
  Add, the pager's links and the filter's submit: `place` is
  `{ query, after, before }`, in that order before the modal, a blank one
  left out, and `new` is a bare flag. Every link keeps the query, and every
  one but the pager's the cursor, so closing a modal lands where it opened.
- **`next/link`**, so opening the modal is a soft navigation and the page's
  admin guard runs on every render.
- **Each Edit is named for its value**, "Edit Mars", the name in a
  `visually-hidden` span.
- **None reads "No planets yet."** or "No signs yet.", with no table; a
  query with no rows reads "No planet matches." or "No sign matches.".

## Styling

GroupedValueList's: a wrapping filter row,
`.vocabulary-value-list__search`, on the `.field`, `.input` and `.btn`
primitives; the `.data-table` in its `.data-table-frame`; a description kept
to `$measure`; each Edit `.btn--small.btn--quiet`; and `Pager`, soft
([`pager.md`](pager.md)). Nothing goes further before MB.115's design review.

## Stories

[`index.stories.tsx`](../../src/components/VocabularyValueList/index.stories.tsx)
— `OnePageOfSeveral`, `Signs`, `Filtered`, `NoMatch` and `Empty`. The filter
reaches the admin pages, which the workshop does not serve. Render-only, no
test ids, no snapshots.

## Testing

`tests/components/VocabularyValueList/index.test.tsx` runs every case on
both vocabularies: the columns and rows, the Edit links, the pager and its
position, both empty messages, the filter form's action, method and kept
query, the Filter button's disabled, enabled and busy states, the address it
opens, and `vocabularyHref`. `tests/app/admin/vocabulary-page.test.tsx`
covers both pages. `tests/e2e/admin.spec.ts` lists the seeded planets and
filters the signs by part of a name.
