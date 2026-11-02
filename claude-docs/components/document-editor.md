# DocumentEditor

`src/components/DocumentEditor/` — the admin's editor for one site document, at `/admin/documents/[key]`. The text is drawn as the public page draws it (`DocumentPage`'s `document-page__body` styles), and an admin edits it in place as rich text. Admin only: the route calls `requireAdminSession()`, and the GraphQL mutations end at the same service, which is the guard.

## What it does

- **Save Draft** stores the text as the admin's own draft. No reader sees a draft. The button is disabled until the text changes, and again after a save.
- **Publish** opens a confirmation, then publishes the draft as the next version (saving first when there are unsaved changes). The confirmation for the terms says that every account will be asked to agree again; no other document's confirmation says so.
- A save and a publish send the draft's `revision`. A second admin's save in between makes the next one fail with an explaining message rather than overwrite it.

## The text is markdown

The stored text is markdown, the same text `DocumentPage` renders, so the editor and the page cannot drift apart. `markdown.ts` turns markdown into the editor's value and back (`markdownToEditorValue`, `editorValueToMarkdown`) with Plate's markdown package, `remark-gfm` for tables, strikethrough and footnotes, and fixed output styles (`-` bullets, `_` emphasis, `*` strong, `-` rules). Opening a document and saving it without a change writes back the text it read, so a seeded document is written in those styles; `tests/components/DocumentEditor/markdown.test.ts` proves the round trip for each seeded document. A URL is written bare, not as a `<…>` autolink, because the round trip does not keep the angle brackets.

`markdown.ts` uses only Plate's base (headless) plugins, so it also runs under Vitest with no DOM. `elements.tsx` holds the React plugins that draw each node (headings `h2` to `h6`, quote, rule, marks, link, lists, tables, footnotes). A list is drawn by a `belowNodes` wrapper around each paragraph the list plugin marks as a list item, since Plate's list plugin is indent based and draws nothing itself.

## Loading

`index.tsx` loads `editor.tsx` with `next/dynamic`, so the editor's code is fetched only on this page and never reaches a public page's bundle.

## Props

`DocumentEditorProps` (`types.ts`): `documentId`, `documentKey`, `title`, `lede`, `body` (the draft's text, else the published text, else empty), `revision` (the draft's revision, or `null` when there is no draft) and `nextNumber` (the number the next publish will take).
