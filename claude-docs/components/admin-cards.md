# Admin Cards

`src/components/AdminCards/` — the People page's Cards tab, `/admin/cards`, and Arrivals tab,
`/admin/arrivals` (M15.19). Both are render-only: the page reads one page of the list and its count
through the identity services (`listInvitationCards`, `listCardArrivals` and their counts), and hands
rows down. A row carries no token and no hash; the database holds neither a token nor anything that
yields one. The rules are [`auth/admin-bootstrap.md`](../auth/admin-bootstrap.md), "Invitation cards".

## Contracts

- **Cards** (`index.tsx`): a region named "Invitation Cards". Each card shows its state (Pending,
  Accepted, Expired, Revoked), its batch (the first block of the batch id), its expiry and the account
  that accepted it. **Revoke** shows on a pending card only. Above the table, each batch with a pending
  card on the page has **Revoke Batch**. Both ask first (`ConfirmedAction`).
- **Mint Cards** (`mint-form.tsx`) is a link to `?mint`, which opens a modal: **Number of Cards**
  (1 to 500, `MAX_CARDS_PER_BATCH`) and **Expires On** (a date, sent as midnight UTC). The submit stays
  disabled until both are given. The answer carries each token once; the dialog says the codes cannot
  be shown again, and the tokens live only in that dialog's state.
- **Arrivals** (`arrivals.tsx`): every account that accepted a card, with its email, the date, the
  batch and the covens it owns ("None yet" when none). **Download CSV** reads `cardArrivalsCsv` through
  GraphQL and hands the string to the browser as a file; the service refuses anyone but an admin.
- `limits.ts` repeats the cap because a client file cannot import the service; the service rejects
  anything past it whatever the form allows.
