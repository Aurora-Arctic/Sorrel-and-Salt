# DocumentEditor

`src/components/DocumentEditor/` — the admin's editor for one site document, at `/keepers/documents/[key]`. The text is drawn as the public page draws it (`DocumentPage`'s `document-page__body` styles), and an admin edits it in place as rich text. Admin only: the route calls `requireAdminSession()`, and the GraphQL mutations end at the same service, which is the guard.

## What it does

- **Save Draft** stores the text as the admin's own draft. No reader sees a draft. The button is disabled until the text differs from what was last opened or saved, compared as markdown, so undoing back to it disables Save Draft again (and Publish, when there is no draft).
- **Publish** opens a confirmation, then publishes the draft as the next version (saving first when there are unsaved changes). The confirmation for the terms says that every account will be asked to agree again; no other document's confirmation says so.
- A save and a publish send the draft's `revision`. A second admin's save in between makes the next one fail with an explaining message rather than overwrite it.

## The text is markdown

The stored text is markdown, the same text `DocumentPage` renders, so the editor and the page cannot drift apart. `markdown.ts` turns markdown into the editor's value and back (`markdownToEditorValue`, `editorValueToMarkdown`) with Plate's markdown package, `remark-gfm` for tables, strikethrough and footnotes, and fixed output styles (`-` bullets, `_` emphasis, `*` strong, `-` rules). Opening a document and saving it without a change writes back the text it read, so a seeded document is written in those styles; `tests/components/DocumentEditor/markdown.test.ts` proves the round trip for each seeded document. A URL is written bare, not as a `<…>` autolink, because the round trip does not keep the angle brackets.

`markdown.ts` uses only Plate's base (headless) plugins, so it also runs under Vitest with no DOM. `elements.tsx` holds the React plugins that draw each node (headings `h2` to `h6`, quote, rule, marks, link, lists, tables, footnotes). A list is drawn by a `belowNodes` wrapper around each paragraph the list plugin marks as a list item, since Plate's list plugin is indent based and draws nothing itself.

## The toolbar

`toolbar.tsx` is a `role="toolbar"` named "Document Text Formatting", above the text box. It has eleven quiet icon buttons (`btn btn--quiet btn--icon`, 2.25rem square, marks from [`icons.tsx`](icon-tip.md), "The icons"), each named by `aria-label` and tipped below with its name through `IconTip`. Nine are one for each thing the public page draws that a person can add, and no others; the last two are Undo and Redo. They sit in five `role="group"` rows, each named, with a hairline between groups, 0.5rem from the buttons on each side, and 0.25rem between the buttons in a group:

| Group    | Buttons                      |
| -------- | ---------------------------- |
| Headings | Heading 2, Heading 3         |
| Text     | Bold, Italic, Link           |
| Lists    | Bulleted List, Numbered List |
| Insert   | Table, Footnote              |
| History  | Undo, Redo                   |

The groups sit centred in the row, in that order. Each button is a Plate transform, not a hand-written edit:

| Button                       | What it calls                                                                                                                                                | Pressed when                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| Heading 2, Heading 3         | `editor.tf.toggleBlock`                                                                                                                                      | the block holding the selection is that heading |
| Bold, Italic                 | `editor.tf.toggleMark`                                                                                                                                       | `editor.api.hasMark`                            |
| Link                         | opens an "Add Link" dialog (`Modal`) asking for an Address, then `upsertLink` on the selection kept when it opened                                           | never                                           |
| Bulleted List, Numbered List | `toggleList` (`disc`, `decimal`)                                                                                                                             | `someList`                                      |
| Table                        | `insertTable`, two columns and two rows with a header row, after the top-level block holding the caret                                                       | never                                           |
| Footnote                     | `editor.tf.insert.footnote`: the next unused number's reference at the caret and its definition, the caret going to the definition                           | never                                           |
| Undo, Redo                   | `editor.tf.undo`, `editor.tf.redo`, from Plate's built-in history; the keys do the same: Ctrl+Z, and Ctrl+Y or Ctrl+Shift+Z (Cmd+Z and Cmd+Shift+Z on a Mac) | never                                           |

- **A press keeps the selection.** Each button cancels `mousedown`, so the focus stays in the text and the button acts on what was selected.
- **The row sticks.** `.document-editor__toolbar` is `position: sticky` at `var(--sticky-top)`, just under the site bar, on `$surface-page` so the text scrolls under it. It stays while the text box is on screen, as its parent `.document-editor__text` ends with the box. No ancestor sets `overflow`, which would stop it.
- **Undo and Redo say when they have nothing to do.** With an empty history stack, the button carries `aria-disabled="true"` and a press does nothing. It is not `disabled`, which would drop it from the arrow-key order.
- **One tab stop.** The toolbar follows the WAI-ARIA toolbar pattern: only the last-focused button is in the tab order, and the arrow keys, Home and End move focus between the buttons.
- **A link needs a full web address.** `upsertLink` refuses an address the link plugin cannot validate, and the dialog says so and stays open.

## Empty cells and notes

An empty table cell or footnote definition is serialised by the markdown package as a lone zero-width space. `editorValueToMarkdown` removes it, so a table or note the toolbar adds and nobody fills in saves as `|  |` and `[^2]:`.

## Loading

`index.tsx` loads `editor.tsx` with `next/dynamic`, so the editor's code is fetched only on this page and never reaches a public page's bundle.

## Props

`DocumentEditorProps` (`types.ts`): `documentId`, `documentKey`, `title`, `lede`, `body` (the draft's text, else the published text, else empty), `revision` (the draft's revision, or `null` when there is no draft) and `nextNumber` (the number the next publish will take).

## Leaving the text box with the keyboard

The indent plugin takes Shift+Tab on a block with no indent and does nothing with it, which would trap a keyboard user in the text. `TabEscapePlugin` in `elements.tsx` lets that key through, so focus returns to the toolbar. A block that is indented, or inside a quote, still outdents or lifts as before.
