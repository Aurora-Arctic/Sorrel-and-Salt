# Document Mailing Panel

`src/components/DocumentMailingPanel/` — the block under the editor's lede, above the text, at `/keepers/documents/[key]` that emails every account about the
published version (M15.63). The page hands it to `DocumentEditor` as `mailing`, only when the document has a published version, because
`readDocumentMailing` has nothing to read without one. Admin only: the service is the guard.

## Contracts

- **Props** (`types.ts`): `documentId`, `documentKey`, `title` and `overview`, the `DocumentMailingOverview` the page reads. The page
  refreshes after each action, so the panel keeps no copy of the result.
- **Before the version is emailed** (`current` is empty): an **Email Every Account** button, red (`btn--destructive`) like its **Send Emails** confirm because a mailing reaches every account and cannot be called back, opens a confirmation, via
  [`ConfirmedAction`](../../src/components/UserList/confirmed-action.tsx), that names the document and the version number. The account count
  and the days a mailing takes at the daily cap sit on a line of their own, as the confirm's `warning` (the ochre warning notice). It has a **Summary** textbox, and **Send Emails** stays disabled until the trimmed summary
  is not empty. The summary is sent trimmed. When another mailing is `inProgress`, the question says how many accounts it reached and that
  it stops. For the terms the question also says each account is asked to agree.
- **After**: a `progressbar` whose value is accounts reached and whose maximum is the recipient count, with a line saying what the state
  means (`queued`, `sending`, `waiting`, `paused`, `sent`, `replaced`). No second Email button is offered; a version is mailed once.
- **Paused**: **Resume Mailing** opens a confirmation of the same name and sends `resumeDocumentMailing` by mailing id.
- The labels are Title Case, and the tests ask for them by role and name.

## Tests

`tests/components/DocumentMailingPanel/index.test.tsx` covers each state's controls, the trimmed summary and the refresh after each send.
