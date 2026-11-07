# Admin Cards

`src/components/AdminCards/` is the People page's Invitation Cards tab, `/keepers/invitation-cards`, and Card Sign-Ups tab, `/keepers/card-sign-ups`. Both are render-only. The page reads one page of the list and its count through the identity services (`listCardBatches`, `listCardArrivals` and their counts) and hands rows down. A row carries no token and no hash, because the database holds neither a token nor anything that yields one. The rules are [`auth/admin-bootstrap.md`](../auth/admin-bootstrap.md), "Invitation cards".

## Contracts

### Dates

- **Expires** is the day the card was chosen to last through (`2026-10-30`), read back from the stored instant by `printedDayOf`, never a time.
- **Minted On, the Refused Opens dates and Card Sign-Ups Accepted On** are `2026-10-30 2:05 pm` in the viewer's own zone, through [`LocalTime`](local-time.md). Above the stacking width each is muted at caption size (`admin-cards__fact`), as the user list's Signed Up is.
- **The Card Sign-Ups CSV keeps its own date format** and has the table's headings (Account, Email, Accepted On, Batch, Beta, Covens Owned) with the same short batch name; Beta is Yes or No, as a CSV cell cannot draw a mark. Covens Owned joins the covens the account owns with "; ". The coven module's resolver supplies them from one batched memberships read for every account on the list, because `identity` may import no module.

### Invitation Cards (`index.tsx`)

- **A region named "Invitation Cards" with one row per batch**: batch (the first block of the batch id, `batchName`), status, **Beta** (a check for a batch minted for beta testers, a cross otherwise, with "Yes" or "No" as hidden text), cards, accepted, refused opens, minted on, expires, and Revoke Batch. Counts come from SQL. Table cell values are sentence case.
- **Status is `batchStatus()` in `batches.ts`, read from the counts**, not from one card's `revokedAt`, since the head card may have been accepted. Any card pending is Live. Otherwise, every card accepted is Used up. Otherwise, a passed expiry is Expired. Otherwise Revoked.
- **Revoke Batch shows while a card of the batch is pending.** Revoking is by batch only. `ConfirmedAction` asks first, naming the batch and its mint date, and says accounts that already accepted keep their access. The Revoke column is red like the People table's Impersonate column.

### Invitation Cards filter (`filter.tsx`, `filter-params.ts`)

The shared `FilterForm` ("Filter Invitation Cards"), held in the URL and combined, every field optional. Six fields is more than three, so only **Batch** stays in the row and the rest sit in the [`FacetShell`](facet-panel.md) Filters drawer beside it, which counts them as Filters (n).

- **Batch** matches the start of the batch number (the batch id's first block, hex and case-folded) or text anywhere in the batch's note (case-folded), with `%` and `_` taken literally in both. The table shows a batch's note beneath its name, clamped to two lines (`admin-cards__note`). It applies from the magnifier or Enter.
- **The drawer holds one line**, which stacks below the tablet width: **Status**, a select-only `ComboboxSelect` (Any, Live, Revoked, Expired or Used Up; the options are labels, so Title Case, while the table's cells keep sentence case), then **Minted** and **Expires**, each a [`DateRangeField`](date-field.md#date-range-field) with quick picks. Minted's quick picks look back; Expires' look ahead.
- **Days are UTC days, inclusive at both ends** (`mintedFrom=2026-10-01&mintedTo=2026-10-31` holds the 1st and the 31st).
- **The Filters count** counts the status and each range with a day in it, one apiece whether it has one end or both, so it reads Filters (3) at most.
- **The drawer holds what is picked in it** until Apply Filters, which applies it with the batch typed, or until it shuts another way, which applies it under the batch shown when something changed.
- **The URL names** are `batch`, `status` (`live`, `revoked`, `expired`, `used-up`), `mintedFrom`, `mintedTo`, `expiresFrom` and `expiresTo`. Neither the select nor a range field has a form name, so the status is sent by one hidden input and each range by two, and the form works as a GET before hydration.
- **Clearing.** A range has its own clear, which empties both its ends. While the URL holds only a batch, the row's Clear empties it. Once a drawer field is in use, the drawer's Clear All takes Clear's place and empties every field, so one clear control shows at a time.
- **Filtering is in SQL.** `invitationCardBatches` takes the same arguments and filters in SQL, status included (`batchStatusIs` in `db/repository/invitations.ts` mirrors `batchStatus()`), then pages through `findPage`. A value the page cannot read (an unknown status, a day that is not a day) is dropped. The service rejects one sent directly.

### Refused Opens (`attempts.tsx`)

Each batch shows its count of refused opens across all its cards. Above zero, an eye icon button (tip **View Refused Opens**, right-aligned in the cell) opens a dialog headed by the eyebrow "Refused Opens" over the title "Batch 7c2d0000". It reads `invitationCardAttempts` for that batch, twenty at a time with **Show More**.

- **Columns.** **Name** and **Email** for the account, the **Card** ("Sheet 2, Card 5", from the card's `position`; "Unknown" for a card minted before positions were kept), and the **Refusal**. A removed account is "Removed account" with an empty Email cell.
  - The name is the Users list's own `UserLink`. It opens that account's user modal at `/keepers/users?user=<id>&from=invitation-cards`, headed "User" over the name with the email beneath. The press leaves the Invitation Cards tab, so the dialog goes with it, and closing the user modal returns to the tab through `from`.
  - The Refusal is the reason in full, with the count and the first and latest times beneath it, each a `LocalTime` kept on one line.
- **The dialog is `size="listed"` (49rem)**, so the four columns show as a table above the stacking width and stack as cards below it. The Email cell has a `<wbr />` before the @ and each dot, so a long address breaks only between its parts.
- **The batches table is `data-table--nowrap`**, and the `data-table-nowrap` mixin reaches only that table's own cells (`> thead > tr > th`, `> tbody > tr > td`), so this dialog's table, opened from one of its cells, wraps as normal.
- **Loading.** The first page shows the standard [`Skeleton`](skeleton.md) at once. A later page keeps the rows and Show More is a `BusyButton` ([`loading.md`](../loading.md)).
- **A paragraph under the head says** every card listed already admits nobody, because the list is a record and no card in it can be opened or revoked from here.

### Mint Cards (`mint-form.tsx`)

A link to `?mint`, which opens a modal.

- **Number of Sheets**, 1 to 50 (`MAX_SHEETS_PER_BATCH`; a Letter sheet holds ten cards), with the total shown as typed ("30 cards"). The sheet hint is the field's hint, so it joins the input's description.
  - The live total sits in the field's `after` slot, directly under the input and beneath any error, with one line always reserved so it never moves another field.
  - An out-of-range typed count shows "A batch is from 1 to 50 sheets" in the total line's place, so the row keeps its height. Mint Cards stays enabled, and a press refuses the count and focuses the field.
- **Expires On** is a `DateField` whose earliest day is tomorrow in UTC, with no `max` (so it ends at the end of next year). It opens on today plus 90 days (`DEFAULT_EXPIRY_DAYS`), a calendar day. It is sent as the end of that day in UTC-12 (`expiryOfDay`: the next day at 12:00 UTC), so a card works through its printed day in every zone. The submit stays disabled until both dates are given.
- **Print Backs** is a `SwitchField`, on by default. Off, the PDF holds the fronts alone (`backs: false` in `CardSheetsInput`). It is a choice of the build and is not stored, since the PDF is built once, in the dialog. The sheet count counts sheets of ten cards, which the choice does not change.
- **Layout.** Number of Sheets and Expires On share one row (`admin-cards__when`), top-aligned with their label rows set to one height. Below the Note field, a row of its own (`admin-cards__switches`) holds the two toggles side by side from the form's left edge, each track starting at its label's left edge.
- **Beta Testers** is a `SwitchField`, off by default. On, it marks every card of the batch as minted for beta testers and is sent as `beta`. It is set at minting and cannot be changed afterwards, and ticking it counts as a change for the discard question.
- **Note** is a textarea of at most 500 characters (`MAX_NOTE_LENGTH`), trimmed, a blank stored as nothing. It records what the batch is for. It is set at minting, cannot be edited afterwards, and the Batch search finds it.
- **After minting**, the dialog (`minted.tsx`) shows the notice, then a result block naming the batch, card count, sheets and expiry, then the buttons. Focus moves to that block, since the form that minted has gone and focus would otherwise fall to the page.
  - The answer carries each token once, and the tokens live only in that dialog's state. The PDF prints the batch name small on each back and, in each sheet's margin outside the trim, "Batch 7c2d0000, sheet 2 of 3, fronts" (or "backs").
  - The modal offers **Download PDF** and **Done**, and nothing per card.
  - A warn notice says the PDF is the only copy. Once a download has been made it becomes a success notice in a polite live region ("Saved as cards-<batch>.pdf. Keep that file: it is the only copy of these cards."), and the button reads **Download Again**. `save-file.ts` is the one helper that hands a file to the browser; it releases the object URL after a minute.
  - Until the PDF is downloaded, Close, Escape and the backdrop ask "You haven't downloaded the PDF. These cards can't be printed later.", adding that the cards stay minted and the batch can be revoked from the list (Close Anyway, Keep Open). After it, Close is quiet.
- **`src/lib/invitation-cards/limits.ts`** holds `CARDS_PER_SHEET`, `MAX_SHEETS_PER_BATCH` and `DEFAULT_EXPIRY_DAYS`, in a file with no imports so a client file can read it. The service rejects anything past the cap whatever the form allows.

### Card Sign-Ups (`arrivals.tsx`)

- **Every account that accepted a card**, as a **Name** and an **Email** column (empty for a removed account), **Accepted On**, the batch, **Beta** (the batch's flag, a check or a cross), and **Covens Owned** ("None yet" when none). An account that can no longer be read keeps its row as plain "Removed account" text.
- **The name opens that account's user modal on this page** (`/keepers/card-sign-ups?user=<id>`, the page's own `UserDialog`, read by the shared `readOpenedUser`). Closing it returns to the list at the same cursor.
- **Download CSV** reads `cardArrivalsCsv` through GraphQL and hands the string to the browser as `card-sign-ups.csv`. A failure shows as the button's click feedback. The service refuses anyone but a keeper.
- **The filter** (`arrivals-filter.tsx`) is the shared `FilterForm` ("Filter Card Sign-Ups") with one search box, **Name, Email or Batch** (`query`, held in the URL, sent by the magnifier or Enter). It keeps a sign-up whose account name or email holds the text, or whose batch number starts with it, case-folded. An info tip beside the label says so. `cardArrivals` and its count filter in SQL and page through `findPage`. Download CSV sends the same `query` to `cardArrivalsCsv`, so the file holds the filtered rows.
