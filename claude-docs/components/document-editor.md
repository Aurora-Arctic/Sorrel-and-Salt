# DocumentEditor

`src/components/DocumentEditor/` — the keeper's editor for one site document, at `/keepers/documents/[key]`. The text is drawn as the public page draws it (`DocumentPage`'s `document-page__body` styles), and a keeper edits it in place in the shared [RichTextEditor](rich-text-editor.md), which holds the markdown conversion, the toolbar and the paste and keyboard rules. Admin only: the route calls `requireAdminSession()`, and the GraphQL mutations end at the same service, which is the guard.

## Contracts

- **The draft saves itself.** The shared `useAutosave` hook (`src/lib/autosave/use-autosave.ts`, `claude-docs/autosave.md`) saves the text 3 seconds after the last change, at its default timing. A stale revision stops it: the explaining failure shows and no more saves are sent.
- **Save Draft** saves at once, and stores the text as the admin's own draft. No reader sees a draft. The button is disabled until the text differs from what was last opened or saved, compared as markdown, so undoing back to it disables Save Draft again (and Publish, when there is no draft). While a save is in flight, the text is compared with the text that save is writing instead, so an edit that puts back the text saved before it still counts as a change: once the save lands, the autosave sends it, and Save Draft is never enabled with nothing for it to save.
- **Publish** is yellow (`.btn--caution`), on the button and its confirm. It opens a confirmation, then publishes the draft as the next version (saving first when there are unsaved changes). It is disabled while any save, autosave or Save Draft, is in flight, so it never publishes a draft that is still being written. The confirmation for the terms says that every account will be asked to agree again; no other document's confirmation says so. Leaving with unsaved text asks first, through the discard question, and a save or publish in flight is not asked about. The page is read again once a publish lands.
- **Restore Published Version** sits beside Save Draft and Publish: a quiet button labelled Restore (its accessible name is the full Restore Published Version) that opens a confirmation whose own button, named Restore Published Version, is red. It is available only when a draft is open or there is unsaved text. Confirming with a draft open soft-deletes the draft at the revision the editor holds (`discardDocumentDraft`); with none open it sends nothing. Either way the editor shows `publishedBody` again, with nothing unsaved and no autosave pending. Readers see no change.
- A save, a publish and a restore send the draft's `revision`. A second keeper's save in between makes the next one fail with an explaining message rather than overwrite it.

## Loading

`index.tsx` loads `editor.tsx` with `next/dynamic`, so the editor's code is fetched only on this page and never reaches a public page's bundle. While it loads, `skeleton.tsx` draws the title, the lede, `RichTextEditorSkeleton` and the buttons.

## Not here

The [Document Mailing Panel](document-mailing-panel.md) is not part of the editor: it has its own page, `/keepers/documents`.
