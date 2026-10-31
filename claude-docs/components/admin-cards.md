# Admin Cards

`src/components/AdminCards/` — the People page's Invitation Cards tab, `/admin/invitation-cards`, and
Card Sign-Ups tab, `/admin/card-sign-ups` (M15.19). Both are render-only: the page reads one page of the list and its count
through the identity services (`listCardBatches`, `listCardArrivals` and their counts), and hands
rows down. A row carries no token and no hash; the database holds neither a token nor anything that
yields one. The rules are [`auth/admin-bootstrap.md`](../auth/admin-bootstrap.md), "Invitation cards".

## Dates

Expires is the day the card was chosen to last through, `2026-10-30`, read back from the stored instant by `printedDayOf`. Minted On, the Refused Opens dates and Card Sign-Ups Accepted On are `2026-10-30 2:05 pm` in the viewer's own zone, through [LocalTime](local-time.md). Above the stacking width each is muted at caption size (`admin-cards__fact`), as the user list's Signed Up is. The Card Sign-Ups CSV keeps its own date format, and has the table's headings (Account, Email, Accepted On, Batch, Covens Owned) with the same short batch name. Covens Owned lists the covens the account owns, joined with "; ". The coven module's resolver supplies them from one batched memberships read for every account on the list, as `identity` may import no module.

## Contracts

- **Invitation Cards** (`index.tsx`): a region named "Invitation Cards" with one row per batch: batch (the
  first block of the batch id, `batchName`), **status**, cards, accepted, refused opens, minted on (date and
  time, local), expires (the chosen day alone, never a time), and **Revoke Batch** while a card of the batch is pending
  (`ConfirmedAction` asks first, naming the batch and its mint date, and says accounts that already accepted
  keep their access). The Revoke column is red like the People table's Impersonate column (`row-action-column`, `.admin-cards__revoke`), with a red row button and a red confirm; the question always comes first.
  Revoking is by batch only. Counts come from SQL. Status is `batchStatus()` in `batches.ts`, read from the
  counts, not from one card's `revokedAt` (the head card may have been accepted): any card pending is Live;
  else every card accepted is Used up; else a passed expiry is Expired; else Revoked. Table cell values are
  sentence case.
- **Invitation Cards filter** (`filter.tsx`, `filter-params.ts`): the shared `FilterForm` ("Filter Invitation Cards"), held in the URL
  and combined, every field optional. Six fields is more than three, so only the **Batch** search stays in the row and
  the rest sit in the [`FacetShell`](facet-panel.md) Filters drawer beside it, which counts them as Filters (n). **Batch**
  matches the start of the batch number (the batch id's first block, hex and case-folded) or text anywhere in the batch's note (case-folded), with `%` and `_` taken
  literally in both; the table shows a batch's note beneath its name, clamped to two lines (`admin-cards__note`) and applies from the magnifier or Enter. In the drawer, **Status** is a choice chip (Any, Live, Revoked,
  Expired or Used up), and **Minted From**, **Minted To**, **Expires From** and **Expires To** are `DateField`s, UTC days
  and inclusive at both ends (`mintedFrom=2026-10-01&mintedTo=2026-10-31` holds the 1st and the 31st). The drawer holds
  what is picked in it until Apply Filters, which applies it with the batch typed, or until it shuts another way,
  which applies it under the batch shown when something changed. The URL names are `batch`, `status` (`live`,
  `revoked`, `expired`, `used-up`), `mintedFrom`, `mintedTo`, `expiresFrom` and `expiresTo`. A `DateField` has no
  name, so each day is also sent by a hidden input and the form works as a GET before hydration. A day has no clear of
  its own. While the URL holds only a batch the row's Clear empties it; once a drawer field is in use the drawer's
  Clear All takes Clear's place and empties every field, so one clear control shows at a time. `invitationCardBatches` takes the same arguments and filters in SQL, status included
  (`batchStatusIs` in `db/repository/invitations.ts` mirrors `batchStatus()`), then pages through `findPage`. A value
  the page cannot read (an unknown status, a day that is not a day) is dropped; the service rejects one sent directly.
- **Refused Opens** (`attempts.tsx`): each batch shows its count of refused opens across all its cards;
  where the count is above zero an eye icon button (tip **View Refused Opens**, right-aligned in the cell) opens a dialog headed by the eyebrow "Refused Opens" over the title "Batch 7c2d0000" (its name, "Refused Opens, Batch 7c2d0000") that reads
  `invitationCardAttempts` for that batch and lists the account in two columns, **Name** and **Email** (the name is the Users list's own `UserLink`, which opens that account's user modal at `/admin/users?user=<id>&from=invitation-cards` at once, headed "User" over the name with the email beneath; the press leaves the Invitation Cards tab, so the Refused Opens dialog goes with it, and closing the user modal returns to the Invitation Cards tab (the `from` parameter); the Email cell holds the address; a removed account is "Removed account" with an empty Email cell), the **Card** ("Sheet 2, Card 5", from the card's `position`; "Unknown" for a card minted before positions were kept), and the **Refusal**: the reason in full on the first line, and under it, muted at caption size (`admin-cards__refusal-when`), "3 times, <first> to <latest>" or "Once, <first>" (the row's creation and its last refusal, each a `LocalTime` kept on one line; the reason may wrap). The dialog is `size="listed"` (49rem), so four columns show as a table above the stacking width and stack as cards below it. Above that width the table (`admin-cards__refused`) takes a narrower side inset on each cell (0.5rem, not the shared 0.75rem) so less wraps, and the Card cell never wraps; the stacked cards keep the shared padding. The Email cell has a `<wbr />` before the @ and each dot, so a long address breaks only between its parts. The batches table is `data-table--nowrap`, and the `data-table-nowrap` mixin reaches only that table's own cells (`> thead > tr > th`, `> tbody > tr > td`), so this dialog's table, opened from one of its cells, wraps as normal,
  twenty at a time with **Show More**. While the first page is read the table is the standard [Skeleton](skeleton.md) (`shape="table"`, three rows, announced once as "Loading"), shown at once; while a later page is read the rows stay and Show More is a `BusyButton` reading "Showing More" (claude-docs/loading.md). A plain paragraph under the head says "Every card listed here already admits nobody. Further tries are refused and counted here.": the list is a record, and no card in it can be opened or revoked from here.
- **Mint Cards** (`mint-form.tsx`) is a link to `?mint`, which opens a modal: **Number of Sheets** (1 to
  55; a Letter sheet holds nine cards) with the total shown as typed ("27 cards"), and
  **Expires On** (a `DateField` whose earliest day is tomorrow in UTC, sent as the end of that day in UTC-12 (`expiryOfDay`: the next day at 12:00 UTC), so a card works through its printed day in every zone; with no `max`
  it ends at the end of next year). Expires On opens on today plus 90 days (`DEFAULT_EXPIRY_DAYS`), a
  calendar day. Number of Sheets (12rem, wide enough for its label and info tip), Expires On and a **Print Backs** toggle (`SwitchField`), on, share one row (`admin-cards__when`), top-aligned with their label rows set to one height so the three controls start on one line and the switch's track starts at its label's left edge; the row wraps when the dialog is too narrow. The live total sits in the sheets field's own column under its input, one line always reserved, so it never moves another field: off, the PDF holds the fronts alone (`backs: false` in `CardSheetsInput`, a choice of the build and not stored, as the PDF is built once, in the dialog). The sheet count counts sheets of nine cards, which the choice does not change. A **Note** textarea (at most 500 characters, `MAX_NOTE_LENGTH`; trimmed, blank stored as nothing) records what the batch is for. It is set at minting and cannot be edited afterwards, and the Batch search finds it. The submit stays disabled until both dates are given. The answer carries each token once, and the
  tokens live only in that dialog's state. The sheet hint ("A Letter sheet holds 9 cards.") is the field's hint, so it joins the input's description;
  only the live total sits below it, in the field's `after` slot, directly under the input and beneath any error, with one line reserved. After minting, the dialog (`minted.tsx`) shows the notice, then one block (`admin-cards__result`) holding the bold sentence "Batch 7c2d0000: 27 cards minted." and, a small gap under it in muted text, the sheets and expiry, then the buttons. Focus moves to that sentence
  (the form that minted has gone, so focus would otherwise fall to the page), then "3 sheets, expiring 29 January 2027.". The PDF prints the batch name small on each back and,
  in each sheet's margin outside the trim, "Batch 7c2d0000, sheet 2 of 3, fronts" (or "backs"). The dialog offers **Download PDF** (solid) and **Done** (quiet) in the modal's
  action row, and nothing per card. A warn notice says the PDF is the only copy; once a download has been
  made it becomes a success notice in a polite live region ("Saved as cards-<batch>.pdf. Keep that
  file: it is the only copy of these cards.") and the button reads **Download Again**. `save-file.ts` is the
  one helper that hands a file to the browser; it releases the object URL after a minute. Until the PDF is downloaded, Close, Escape and the backdrop ask "You haven't
  downloaded the PDF. These cards can't be printed later.", adding that the cards stay minted and the batch can
  be revoked from the list (Close Anyway, Keep Open); after it, Close is quiet.
- **Card Sign-Ups** (`arrivals.tsx`): every account that accepted a card, as a **Name** and an **Email** column (empty for a removed account), the
  date (**Accepted On**), the batch and the covens it owns (**Covens Owned**; "None yet" when none). An account
  that can no longer be read keeps its row as plain "Removed account" text. The name opens that account's user modal on this page (`/admin/card-sign-ups?user=<id>`, the page's own `UserDialog`, read by the shared `readOpenedUser`); closing it returns to the list at the same cursor. **Download CSV** reads `cardArrivalsCsv` through
  GraphQL and hands the string to the browser as `card-sign-ups.csv`; a failure shows as the button's click feedback; the service refuses anyone but an admin.
- **Card Sign-Ups filter** (`arrivals-filter.tsx`): the shared `FilterForm` ("Filter Card Sign-Ups") with one search
  box, **Name, Email or Batch** (`query`, held in the URL, sent by the magnifier or Enter). It keeps a sign-up whose
  account name or email holds the text, or whose batch number starts with it, case-folded; an info tip beside the label
  says so. `cardArrivals` and its count filter in SQL and page through `findPage`; **Download CSV** sends the same
  `query` to `cardArrivalsCsv`, so the file holds the filtered rows.
- `src/lib/invitation-cards/limits.ts` holds `CARDS_PER_SHEET`, `MAX_SHEETS_PER_BATCH` and
  `DEFAULT_EXPIRY_DAYS`, a file with no imports so a client file can read it; the service rejects anything
  past the cap whatever the form allows.
