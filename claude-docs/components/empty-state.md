# EmptyState

What a list draws when it has nothing in it: one sentence in a status region, an optional explanation under it and an optional single thing to do next. `src/components/EmptyState/index.tsx`, styled by `index.scss`.

## Props

| Prop       | Meaning                                                                                                               |
| ---------- | --------------------------------------------------------------------------------------------------------------------- |
| `children` | The sentence.                                                                                                         |
| `label`    | The region's name, "No Spells" or "No Matches". A compact state inside a table has none.                              |
| `size`     | `page` (default): a whole list that is empty, centred. `compact`: a table or card section, left-aligned at body size. |
| `detail`   | A second paragraph: who can fill the list, or what to try.                                                            |
| `action`   | The one button or link that is the next step.                                                                         |
| `quiet`    | A plain block with no status role, for a page that already announces its own count.                                   |

## Behaviour

- It is `role="status"` (unless `quiet`), so a list that empties after a filter is announced. A test that waits for a status region must wait for its own text, since this one is in the page from the start.
- `StackTable` draws it for an empty table (`empty`, `emptyLabel`, `emptyAction`, `emptyQuiet`). The grimoire, coven and compendium lists, the support list, the stock dialog and the spell builder's side panels draw it directly.
- The ingredient entry page's field absences ("none recorded") stay inline text: they are a field with no value, not a list with no rows.

## Styling

Muted ink at body size. `page` is centred with `space(8)` above and below; `compact` is left-aligned with no extra padding.

## Tests

`tests/components/EmptyState/index.test.tsx`.
