# RichTextEditor

`src/components/RichTextEditor/` — markdown edited as rich text, as the public page draws it (`DocumentPage`'s `document-page__body` styles), in a bordered box under a formatting toolbar. The [DocumentEditor](document-editor.md) is built on it.

## Use

- `useRichTextEditor(markdown)` makes the editor, reading `markdown` once. The caller holds it, to read the text (`markdownOf(editor)`) or replace it (`editor.tf.setValue`).
- `<RichTextEditor editor label onMarkdownChange />` draws the box. `label` is the text box's accessible name, and the toolbar is named "<label> Formatting". `onMarkdownChange` receives the markdown after each change.
- `index.tsx` imports the editor library, which is large: a caller loads its own form with `next/dynamic`, with `RichTextEditorSkeleton` (`skeleton.tsx`, the same `label`) standing in at the box's size while it loads.

## The text is markdown

The stored text is markdown, the same text `DocumentPage` renders for a site document or a help entry, so the editor and the page cannot drift apart. `markdown.ts` turns markdown into the editor's value and back (`markdownToEditorValue`, `editorValueToMarkdown`) with Plate's markdown package, `remark-gfm` for tables, strikethrough and footnotes, and fixed output styles (`-` bullets, `_` emphasis, `*` strong, `-` rules). Opening a text and saving it without a change writes back the text it read, so a seeded document or help body is written in those styles; `tests/components/RichTextEditor/markdown.test.ts` proves the round trip for each seeded document and each seeded help body. A URL is written bare, not as a `<…>` autolink, because the round trip does not keep the angle brackets.

`markdown.ts` uses only Plate's base (headless) plugins, so it also runs under Vitest with no DOM. `elements.tsx` holds the React plugins that draw each node (headings `h2` to `h6`, quote, rule, marks, link, lists, tables, footnotes). A list is drawn by a `belowNodes` wrapper around each paragraph the list plugin marks as a list item, since Plate's list plugin is indent based and draws nothing itself.

## The toolbar

`toolbar.tsx` is a `role="toolbar"` above the text box, of quiet icon buttons ([`icons.tsx`](icon-tip.md), "The icons") tipped through `IconTip`. Nine are one for each thing the public page draws that a person can add, and no others; the last two are Undo and Redo. Each button is a Plate transform, not a hand-written edit:

| Button                           | What it calls                                                                                                                                                | Pressed when                                  |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| Heading 2, Heading 3, Pull Quote | `editor.tf.toggleBlock`                                                                                                                                      | the block holding the selection is that block |
| Bold, Italic                     | `editor.tf.toggleMark`                                                                                                                                       | `editor.api.hasMark`                          |
| Link                             | opens an "Add Link" dialog (`Modal`) asking for an Address, then `upsertLink` on the selection kept when it opened                                           | never                                         |
| Bulleted List, Numbered List     | `toggleList` (`disc`, `decimal`)                                                                                                                             | `someList`                                    |
| Table                            | `insertTable`, two columns and two rows with a header row, after the top-level block holding the caret                                                       | never                                         |
| Footnote                         | `editor.tf.insert.footnote`: the next unused number's reference at the caret and its definition, the caret going to the definition                           | never                                         |
| Undo, Redo                       | `editor.tf.undo`, `editor.tf.redo`, from Plate's built-in history; the keys do the same: Ctrl+Z, and Ctrl+Y or Ctrl+Shift+Z (Cmd+Z and Cmd+Shift+Z on a Mac) | never                                         |

- **A press keeps the selection.** Each button cancels `mousedown`, so the focus stays in the text and the button acts on what was selected.
- **The row sticks** (`position: sticky` at `var(--sticky-top)`) while the text box is on screen. No ancestor may set `overflow`, which would stop it.
- **Undo and Redo say when they have nothing to do.** With an empty history stack, the button carries `aria-disabled="true"` and a press does nothing. It is not `disabled`, which would drop it from the arrow-key order.
- **One tab stop,** per the WAI-ARIA toolbar pattern.
- **A link needs a full web address.** `upsertLink` refuses an address the link plugin cannot validate, and the dialog says so and stays open.

## Pasting

A paste is read as markdown or as HTML, by `PasteMarkdownPlugin` in `elements.tsx`:

- **Plain text alone is read as markdown**, as Plate reads it, so a pasted `## Heading` becomes a heading and a `[^1]` a footnote. A lone web address is left to the link plugin.
- **A copy from a code editor is read as markdown too.** A code editor also puts its highlighted rendering of the text on the clipboard as HTML, and Plate would read that HTML and show the markdown's marks as literal text. The paste is taken as a code editor's when the clipboard holds VS Code's own `vscode-editor-data` type, or when its HTML is a single pre-formatted block (a `<pre>`, or an element styled `white-space: pre`), which is how a code editor draws its text.
- **Any other HTML is read as HTML**, so rich text copied from a web page keeps its headings, bold and links, and its plain text is not used.

Plate sets its markdown paste rule in a function extension, so the editor replaces it with one too: a plain-object `parser` is merged beneath Plate's and has no effect.

## Help syntax

A help body carries forms a document does not. A callout (`> **Note:**`, `> **Tip:**`, `> **Take Care:**`) is read as a quote with a bold lead, and a link to a /help address or a glossary anchor as a link; both round-trip as they are. A `[[Term]]` or `[[Term|text]]` mark and a `::widget[name]` line are plain text in the editor, shown with their brackets, and the serialiser would write their `[` as `\[`. `editorValueToMarkdown` puts those brackets back, because the save checks the marks and tags against the raw text (`src/modules/help/services/marks.ts`), and an escaped one would pass unchecked. Without a link definition neither is a link, so the unescaped text reads the same.

## Empty cells and notes

An empty table cell or footnote definition is serialised by the markdown package as a lone zero-width space. `editorValueToMarkdown` removes it, so a table or note the toolbar adds and nobody fills in saves as `|  |` and `[^2]:`.

## Leaving the text box with the keyboard

The indent plugin takes Shift+Tab on a block with no indent and does nothing with it, which would trap a keyboard user in the text. `TabEscapePlugin` in `elements.tsx` lets that key through, so focus returns to the toolbar. A block that is indented, or inside a quote, still outdents or lifts as before.
