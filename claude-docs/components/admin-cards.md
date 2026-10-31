# Admin Cards

`src/components/AdminCards/` — the People page's Invitation Cards tab, `/admin/invitation-cards`, and
Card Sign-Ups tab, `/admin/card-sign-ups` (M15.19). Both are render-only: the page reads one page of the list and its count
through the identity services (`listCardBatches`, `listCardArrivals` and their counts), and hands
rows down. A row carries no token and no hash; the database holds neither a token nor anything that
yields one. The rules are [`auth/admin-bootstrap.md`](../auth/admin-bootstrap.md), "Invitation cards".

## Dates

Expires is a UTC day, `2026-10-30`. Minted On, Refused Opens First and Latest and Card Sign-Ups Accepted On are `2026-10-30 2:05 pm` in the viewer's own zone, through [LocalTime](local-time.md). Above the stacking width each is muted at caption size (`admin-cards__fact`), as the user list's Signed Up is. The Card Sign-Ups CSV keeps its own date format.

## Contracts

- **Invitation Cards** (`index.tsx`): a region named "Invitation Cards" with one row per batch: batch (the
  first block of the batch id, `batchName`), **status**, cards, accepted, refused opens, minted on (date and
  time, local), expires (the date alone: it is midnight UTC), and **Revoke Batch** while a card of the batch is pending
  (`ConfirmedAction` asks first, naming the batch and its mint date, and says accounts that already accepted
  keep their access). The Revoke column is red like the People table's Impersonate column (`row-action-column`, `.admin-cards__revoke`), with a red row button and a red confirm; the question always comes first.
  Revoking is by batch only. Counts come from SQL. Status is `batchStatus()` in `batches.ts`, read from the
  counts, not from one card's `revokedAt` (the head card may have been accepted): any card pending is Live;
  else every card accepted is Used up; else a passed expiry is Expired; else Revoked. Table cell values are
  sentence case.
- **Refused Opens** (`attempts.tsx`): each batch shows its count of refused opens across all its cards;
  where the count is above zero an eye icon button (tip **View Refused Opens**, right-aligned in the cell) opens a dialog headed by the eyebrow "Refused Opens" over the title "Batch 7c2d0000" (its name, "Refused Opens, Batch 7c2d0000") that reads
  `invitationCardAttempts` for that batch and lists the account (its name is the Users list's own `UserLink`, which opens that account's user modal at `/admin/users?user=<id>&from=invitation-cards` at once, headed "User" over the name with the email beneath; the press leaves the Invitation Cards tab, so the Refused Opens dialog goes with it, and closing the user modal returns to the Invitation Cards tab (the `from` parameter); its email sits under the name; a removed account is "Removed account" with neither), the **Card** ("Sheet 2, Card 5", from the card's `position`; "Unknown" for a card minted before positions were kept), the reason, how many times, and the **First** and **Latest** times (the row's creation and its last refusal),
  twenty at a time with **Show More**. A plain paragraph under the head says "Every card listed here already admits nobody. Further tries are refused and counted here.": the list is a record, and no card in it can be opened or revoked from here.
- **Mint Cards** (`mint-form.tsx`) is a link to `?mint`, which opens a modal: **Number of Sheets** (1 to
  55; a Letter sheet holds nine cards) with the total shown as typed ("27 cards"), and
  **Expires On** (a `DateField` whose earliest day is tomorrow in UTC, sent as midnight UTC; with no `max`
  it ends at the end of next year). Expires On opens on today plus 90 days (`DEFAULT_EXPIRY_DAYS`), a
  calendar day. The submit stays disabled until both are given. The answer carries each token once, and the
  tokens live only in that dialog's state. The sheet hint ("A Letter sheet holds 9 cards.") is the field's hint, so it joins the input's description;
  only the live total sits below it, in the field's `after` slot, directly under the input and beneath any error, with one line reserved. After minting, the dialog recaps "27 cards on 3 sheets, batch
  7c2d0000, expiring 29 January 2027." with **Download PDF** (solid) and **Done** (quiet) in the modal's
  action row, and nothing per card. A warn notice says the PDF is the only copy; once a download has been
  made it becomes a success notice in a polite live region ("Saved as cards-<batch>.pdf. Keep that
  file: it is the only copy of these cards.") and the button reads **Download Again**. `save-file.ts` is the
  one helper that hands a file to the browser; it releases the object URL after a minute. Until the PDF is downloaded, Close, Escape and the backdrop ask "You haven't
  downloaded the PDF. These cards can't be printed later.", adding that the cards stay minted and the batch can
  be revoked from the list (Close Anyway, Keep Open); after it, Close is quiet.
- **Card Sign-Ups** (`arrivals.tsx`): every account that accepted a card, with its email under its name, the
  date (**Accepted On**), the batch and the covens it owns (**Covens Owned**; "None yet" when none). An account
  that can no longer be read keeps its row as plain "Removed account" text. The name opens that account's user modal over the page, through the Users list's own `UserLink`, and closing the modal returns to this tab (`from=card-sign-ups`). **Download CSV** reads `cardArrivalsCsv` through
  GraphQL and hands the string to the browser as `card-sign-ups.csv`; a failure shows as the button's click feedback; the service refuses anyone but an admin.
- `src/lib/invitation-cards/limits.ts` holds `CARDS_PER_SHEET`, `MAX_SHEETS_PER_BATCH` and
  `DEFAULT_EXPIRY_DAYS`, a file with no imports so a client file can read it; the service rejects anything
  past the cap whatever the form allows.
