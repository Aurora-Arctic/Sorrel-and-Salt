# SupportList

`src/components/SupportList/` — the sender's own requests on `/account/support`, newest first, as a compact list. Each row shows
the request's kind (as the form names it), the page it was about (monospace, or "No page"), the sent date and a status badge. The kind is the row's one link, stretched over the row
(`card-link`), with the subject read out of sight after it so two requests of one kind are told apart. It never draws a link to a bug's issue: the address is staff-only and the sender's reads do not carry it. The page passes only rows the services returned for the signed-in sender;
the component filters nothing. Paged with the shared pager.

## Contracts

- **The status badge** is `statusBadgeClass` from `SupportRequests/status-badge.ts`, the one the admin list and dialog use: `open` is `badge badge--local`, and `waiting_on_sender`, `resolved` and `closed` are `badge badge--muted`. The words are `STATUS_LABELS`.
- **A row opens its request** in a dialog over the list, a `RouteModal` at `?request=<id>` that keeps the page's cursor. The page reads the request through `getMySupportRequest` and `repliesForRequests` (`account/support/reads.ts`, cached), so another sender's id reads as absent and the dialog stays closed. Closing it drops only `request`. The body is [`SupportSenderRequest`](support-sender-request.md).
- **New Request** is the page header's action: a [`SupportLink`](support-link.md) that opens the Support dialog over this page.
- **Spacing.** The list is a column with a gap of 4 between the rows' list and the pager; the rows are 2 apart. Each row is 3 above and below its text and 4 either side. The `ul` default margin, the empty message's paragraph margin and the row's margin are zeroed; no global `section` is used. The dialog is outside the flow.
