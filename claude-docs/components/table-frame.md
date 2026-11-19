# TableFrame

`src/components/TableFrame/` — the frame a table scrolls sideways in. It draws the `.data-table-frame`
primitive ([`styling.md`](../styling.md), "Tables at phone width"), which clips the table, scrolls it sideways
and is the container the stacked layout measures against.

`<TableFrame label>` takes the table as its children and a `label`, the name a screen reader announces.

## Contracts

- **The frame is a named region with a Tab stop** (`role="region"`, `aria-label`, `tabIndex={0}`). A scrolling
  box a keyboard cannot reach cannot be scrolled by one, and a focusable box with no role or name fails the
  accessibility scan. The component sets all three, so a caller cannot leave one out.
- **Every table frame is this component.** `StackTable`, the help outline's order table, the role permission
  table, the rich text editor's table, a document's tables (named from the heading above them, or "Table"; a second under one heading adds ", Table 2") and
  the list story all use it. A hand-written `.data-table-frame` in `src/` fails `tests/guards/table-frame.test.ts`.
- **The name says what the table is**, not that it is a table: `TableFrame`'s `label` and `StackTable`'s
  `aria-label` are required, so no caller can leave a table named only by a fallback. Only a document's table under
  no heading, and the editor's, have no name to give, and they take "Table". **No two frames on a page share a
  name**, nor share one with a region round them (a list's `<section>`): two regions of one name are one landmark
  too many in a screen reader's list (axe `landmark-unique`, `tests/e2e/table-frame-names.spec.ts`). The editor
  numbers its tables by place ("Table 1", "Table 2").

Stories: `index.stories.tsx`. Tests: `tests/components/TableFrame/index.test.tsx`, and the guard above.
