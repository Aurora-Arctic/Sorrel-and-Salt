# Admin Cards

`src/components/AdminCards/` — the People page's Invitation Cards tab, `/admin/invitation-cards`, and
Card Sign-Ups tab, `/admin/card-sign-ups` (M15.19). Both are render-only: the page reads one page of the list and its count
through the identity services (`listCardBatches`, `listCardArrivals` and their counts), and hands
rows down. A row carries no token and no hash; the database holds neither a token nor anything that
yields one. The rules are [`auth/admin-bootstrap.md`](../auth/admin-bootstrap.md), "Invitation cards".

## Contracts

- **Invitation Cards** (`index.tsx`): a region named "Invitation Cards" with one row per batch: batch (the
  first block of the batch id, `batchName`), minted on (date and time, UTC), expires (the date alone: it is
  midnight UTC), cards, **status**, accepted, and **Revoke Batch** while a card of the batch is pending
  (`ConfirmedAction` asks first, naming the batch and its mint date, and says accounts that already accepted
  keep their access). The Revoke column is red like the People table's Impersonate column (`row-action-column`, `.admin-cards__revoke`), with a red row button and a red confirm; the question always comes first.
  Revoking is by batch only. Counts come from SQL. Status is `batchStatus()` in `batches.ts`, read from the
  counts, not from one card's `revokedAt` (the head card may have been accepted): any card pending is Live;
  else every card accepted is Used up; else a passed expiry is Expired; else Revoked. Table cell values are
  sentence case.
- **Invitation Cards filter** (`filter.tsx`, `filter-params.ts`): the shared `FilterForm` ("Filter Invitation Cards"), held in the URL
  and combined, every field optional. **Batch** matches the start of the batch number (the batch id's first block, hex
  and case-folded, with `%` and `_` taken literally); **Status** is All Statuses, Live, Revoked, Expired or Used up;
  **Minted From**, **Minted To**, **Expires From** and **Expires To** are `DateField`s, UTC days and inclusive at both
  ends (`mintedFrom=2026-10-01&mintedTo=2026-10-31` holds the 1st and the 31st). The URL names are `batch`, `status`
  (`live`, `revoked`, `expired`, `used-up`), `mintedFrom`, `mintedTo`, `expiresFrom` and `expiresTo`. A `DateField` has no name, so each day is
  also sent by a hidden input and the form works as a GET before hydration. A day has no clear of its own: Clear
  empties every field. `invitationCardBatches` takes the same arguments and filters in SQL, status included
  (`batchStatusIs` in `db/repository/invitations.ts` mirrors `batchStatus()`), then pages through `findPage`. A value
  the page cannot read (an unknown status, a day that is not a day) is dropped; the service rejects one sent directly.
- **Refused Opens** (`attempts.tsx`): each batch shows its count of refused opens across all its cards;
  where the count is above zero an eye icon button (tip **View Refused Opens**, right-aligned in the cell) opens a "Refused Opens, Batch 7c2d0000" dialog that reads
  `invitationCardAttempts` for that batch and lists the account (its name links to that account's modal on the People page, and its email sits under it; a removed account is "Removed account" with neither), the **Card** ("Sheet 2, Card 5", from the card's `position`; "Unknown" for a card minted before positions were kept), the reason, how many times, and the **First** and **Latest** times (the row's creation and its last refusal),
  twenty at a time with **Show More**.
- **Mint Cards** (`mint-form.tsx`) is a link to `?mint`, which opens a modal: **Number of Sheets** (1 to
  55; a Letter sheet holds nine cards) with the total shown as typed ("3 sheets: 27 cards"), and
  **Expires On** (a `DateField` whose earliest day is tomorrow in UTC, sent as midnight UTC; with no `max`
  it ends at the end of next year). Expires On opens on today plus 90 days (`DEFAULT_EXPIRY_DAYS`), a
  calendar day. The submit stays disabled until both are given. The answer carries each token once, and the
  tokens live only in that dialog's state. The sheet hint ("A Letter sheet holds 9 cards.") is the field's hint, so it joins the input's description;
  only the live total sits below it. After minting, the dialog recaps "27 cards on 3 sheets, batch
  7c2d0000, expiring 29 January 2027." with **Download PDF** (solid) and **Done** (quiet) in the modal's
  action row, and nothing per card. A warn notice says the PDF is the only copy; once a download has been
  made it becomes a success notice in a polite live region ("Saved as cards-<batch>.pdf. Keep that
  file: it is the only copy of these cards.") and the button reads **Download Again**. `save-file.ts` is the
  one helper that hands a file to the browser; it releases the object URL after a minute. Until the PDF is downloaded, Close, Escape and the backdrop ask "You haven't
  downloaded the PDF. These cards can't be printed later.", adding that the cards stay minted and the batch can
  be revoked from the list (Close Anyway, Keep Open); after it, Close is quiet.
- **Card Sign-Ups** (`arrivals.tsx`): every account that accepted a card, with its email under its name, the
  date (**Accepted On**), the batch and the covens it owns (**Covens Owned**; "None yet" when none). An account
  that can no longer be read keeps its row as plain "Removed account" text. The name opens that account's user modal over the page, through the Users list's own `UserLink`. **Download CSV** reads `cardArrivalsCsv` through
  GraphQL and hands the string to the browser as `card-sign-ups.csv`; a failure shows as the button's click feedback; the service refuses anyone but an admin.
- `src/lib/invitation-cards/limits.ts` holds `CARDS_PER_SHEET`, `MAX_SHEETS_PER_BATCH` and
  `DEFAULT_EXPIRY_DAYS`, a file with no imports so a client file can read it; the service rejects anything
  past the cap whatever the form allows.
