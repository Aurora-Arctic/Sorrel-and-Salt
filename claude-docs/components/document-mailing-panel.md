# Document Mailing Panel

`src/components/DocumentMailingPanel/` — the Email Updates page, `/keepers/documents`, that emails every account one joint email about
every document changed since the last email (M15.63, made joint in M15.79). The page reads the overview with `readDocumentMailings` and
hands it over; admin only: the service is the guard.

## Contracts

- **Props** (`types.ts`): `overview`, the `DocumentMailingOverview` the page reads: the pending documents, the account count, the days a
  mailing takes at the daily cap, `canSend`, the open mailings and the last sent one. The page refreshes after each action, so the panel
  keeps no copy of the result.
- **Open mailings**: each `sending` or `paused` mailing shows a `progressbar` named after the documents it covers, whose value is accounts
  reached and whose maximum is the recipient count, with a line saying what the state means (`queued`, `sending`, `waiting`, `paused`).
- **Paused**: **Resume Mailing** opens a confirmation of the same name and sends `resumeDocumentMailing` by mailing id.
- **Nothing pending**: a line says no document has changed since the last email, and nothing can be sent.
- **Pending** (`canSend`): one **Summary of the …** textbox for each pending document. **Email Every Account**, red (`btn--destructive`)
  like its **Send Emails** confirm because a mailing reaches every account and cannot be called back, stays disabled until every summary
  is written. It opens a confirmation, via [`ConfirmedAction`](../../src/components/UserList/confirmed-action.tsx), that names the
  documents. The account count and the days the mailing takes sit on a line of their own, as the confirm's `warning`. When the terms, the
  disclaimer or the code of ethics is pending, the question says each account is asked to agree again; when a mailing is open, it says
  that mailing stops. The summaries are sent trimmed, each with its version id.
- **Last Email**: the last sent mailing's progress, under its own heading.
- The labels are Title Case, and the tests ask for them by role and name.

## Tests

`tests/components/DocumentMailingPanel/index.test.tsx` covers each state's controls, the trimmed summaries and the refresh after each
send. The panel has no story file.
