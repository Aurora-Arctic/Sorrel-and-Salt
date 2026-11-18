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
  table, the rich text editor's table, a document's tables (named from the heading above them, or "Table") and
  the list story all use it. A hand-written `.data-table-frame` in `src/` fails `tests/guards/table-frame.test.ts`.
- **The name says what the table is**, not that it is a table, where the caller has one: a heading, a `label`
  prop. "Table" is the fallback.

Stories: `index.stories.tsx`. Tests: `tests/components/TableFrame/index.test.tsx`, and the guard above.
