# Admin Cards

`src/components/AdminCards/` — the People page's Invitation Cards tab, `/admin/invitation-cards`, and
Card Sign-Ups tab, `/admin/card-sign-ups` (M15.19). Both are render-only: the page reads one page of the list and its count
through the identity services (`listCardBatches`, `listCardArrivals` and their counts), and hands
rows down. A row carries no token and no hash; the database holds neither a token nor anything that
yields one. The rules are [`auth/admin-bootstrap.md`](../auth/admin-bootstrap.md), "Invitation cards".

## Dates

Expires is a UTC day, `2026-10-30`. Minted On, Refused Opens First and Latest and Card Sign-Ups Accepted On are `2026-10-30 14:05` in the viewer's own zone, through [LocalTime](local-time.md). Above the stacking width each is muted at caption size (`admin-cards__fact`), as the user list's Signed Up is. The Card Sign-Ups CSV keeps its own date format.

## Contracts

- **Invitation Cards** (`index.tsx`): a region named "Invitation Cards" with one row per batch: batch (the
  first block of the batch id, `batchName`), minted on (date and time, local), expires (the date alone: it is
  midnight UTC), cards, **status**, accepted, and **Revoke Batch** while a card of the batch is pending
  (`ConfirmedAction` asks first, naming the batch and its mint date, and says accounts that already accepted
  keep their access). The Revoke column is red like the People table's Impersonate column (`row-action-column`, `.admin-cards__revoke`), with a red row button and a red confirm; the question always comes first.
  Revoking is by batch only. Counts come from SQL. Status is `batchStatus()` in `batches.ts`, read from the
  counts, not from one card's `revokedAt` (the head card may have been accepted): any card pending is Live;
  else every card accepted is Used up; else a passed expiry is Expired; else Revoked. Table cell values are
  sentence case.
- **Invitation Cards filter** (`filter.tsx`, `filter-params.ts`): the shared `FilterForm` ("Filter Invitation Cards"), held in the URL
  and combined, every field optional. Six fields is more than three, so only the **Batch** search stays in the row and
  the rest sit in the [`FacetShell`](facet-panel.md) Filters drawer beside it, which counts them as Filters (n). **Batch**
  matches the start of the batch number (the batch id's first block, hex and case-folded, with `%` and `_` taken
  literally) and applies from the magnifier or Enter. The drawer holds one line, which stacks below the tablet width:
  **Status**, a select-only `ComboboxSelect` (Any, Live, Revoked, Expired or Used Up; the options are labels, so title
  case, while the table's cells keep sentence case), then **Minted** and **Expires**, each a
  [`DateRangeField`](date-range-field.md) with quick picks (Minted: Today, Last 7 Days, Last 30 Days, This Month, Last
  Month; Expires: Today, Next 7 Days, Next 30 Days, This Month, Next Month). Days are UTC days and inclusive at both
  ends (`mintedFrom=2026-10-01&mintedTo=2026-10-31` holds the 1st and the 31st). The Filters count counts the status
  and each range with a day in it, one apiece whether it has one end or both, so it reads Filters (3) at most. The drawer holds
  what is picked in it until Apply Filters, which applies it with the batch typed, or until it shuts another way,
  which applies it under the batch shown when something changed. The URL names are `batch`, `status` (`live`,
  `revoked`, `expired`, `used-up`), `mintedFrom`, `mintedTo`, `expiresFrom` and `expiresTo`. Neither the select nor a
  range field has a form name, so the status is sent by one hidden input and each range by two, and the form works as
  a GET before hydration. A range has its own clear, which empties both its ends. While the URL holds only a batch the row's Clear empties it; once a drawer field is in use the drawer's
  Clear All takes Clear's place and empties every field, so one clear control shows at a time. `invitationCardBatches` takes the same arguments and filters in SQL, status included
  (`batchStatusIs` in `db/repository/invitations.ts` mirrors `batchStatus()`), then pages through `findPage`. A value
  the page cannot read (an unknown status, a day that is not a day) is dropped; the service rejects one sent directly.
- **Refused Opens** (`attempts.tsx`): each batch shows its count of refused opens across all its cards;
  where the count is above zero an eye icon button (tip **View Refused Opens**, right-aligned in the cell) opens a dialog headed by the eyebrow "Refused Opens" over the title "Batch 7c2d0000" (its name, "Refused Opens, Batch 7c2d0000") that reads
  `invitationCardAttempts` for that batch and lists the account (its name links to that account's modal on the People page, and its email sits under it; a removed account is "Removed account" with neither), the **Card** ("Sheet 2, Card 5", from the card's `position`; "Unknown" for a card minted before positions were kept), the reason, how many times, and the **First** and **Latest** times (the row's creation and its last refusal),
  twenty at a time with **Show More**. A plain paragraph under the head says "Every card listed here already admits nobody. Further tries are refused and counted here.": the list is a record, and no card in it can be opened or revoked from here.
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
- **Card Sign-Ups filter** (`arrivals-filter.tsx`): the shared `FilterForm` ("Filter Card Sign-Ups") with one search
  box, **Name, Email or Batch** (`query`, held in the URL, sent by the magnifier or Enter). It keeps a sign-up whose
  account name or email holds the text, or whose batch number starts with it, case-folded; an info tip beside the label
  says so. `cardArrivals` and its count filter in SQL and page through `findPage`; **Download CSV** sends the same
  `query` to `cardArrivalsCsv`, so the file holds the filtered rows.
- `src/lib/invitation-cards/limits.ts` holds `CARDS_PER_SHEET`, `MAX_SHEETS_PER_BATCH` and
  `DEFAULT_EXPIRY_DAYS`, a file with no imports so a client file can read it; the service rejects anything
  past the cap whatever the form allows.
