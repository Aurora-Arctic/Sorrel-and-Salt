# SupportList

`src/components/SupportList/` — the sender's own requests on `/account/support`, newest first, as two-line rows paged with the shared pager. Line 1 is the subject, the row's one link (stretched, `card-link`). Line 2 is the status badge, kind, sent day and reply count ("1 reply", "2 replies", "No reply yet"). The row shows no page path and never links a bug's issue: the address is staff-only and the sender's reads do not carry it.

The page passes only rows the services returned for the signed-in sender, each row's count read from `repliesForRequests`; the component filters nothing.

## Contracts

- **A waiting row wears a wax dot** (`role="img"`, named "Waiting on you"), which goes when the status leaves waiting on sender.
- **Status words.** The badge class is `statusBadgeClass` from `SupportRequests/status-badge.ts`, shared with the admin list and dialog; the words are `senderStatusLabel` from `SupportSenderRequest/status.ts`.
- **A row opens its request in a dialog**: a `RouteModal` at `?request=<id>` that keeps the page's cursor, with the staff dialog's `listed` size and phone sheet. The page reads the request through `getMySupportRequest` and `repliesForRequests` (`account/support/reads.ts`, cached), so another sender's id reads as absent and the dialog stays closed. Closing drops only `request`. The body is [`SupportSenderRequest`](support-sender-request.md).
- **The page is the Support Requests tab** of the account page (last in `ACCOUNT_TABS`), inside the tab layout, so it has no heading or frame of its own.
- **The head line** has a muted count at the left (`<n> Open Requests / <n> Closed Requests`, `No Requests Yet` with none) and **New Request** at the right, a [`SupportLink`](support-form.md#support-link) styled `btn btn--quiet btn--small` with `min-block-size: $control-height-compact`. Open counts open and waiting on sender; closed counts resolved and closed; both over all the sender's requests, not the page, from `countMySupportRequestsByStatus` (`findOwnSupportStatusCounts` ANDs `created_by`). The count wraps beneath the button only when they cannot share the line.
- **A row is lit like an ingredient card** on hover (pointers that can hover) and focus: `$surface-card-hover` and `$shadow-lifted`.
- **Spacing.** Rows sit `space(3)` apart, the list's gap the one contributor, so the `ul` default margin, the empty message's paragraph margin and the row margin are zeroed and the row's `::before` (the site's list marker) is emptied. The list is a column with a gap of 4 above the pager. The dialog is outside the flow.

## Loading

The tab's wait is the [`Skeleton`](skeleton.md) `requests` shape, set by the tab's `shape` in `ACCOUNT_TABS`: the head line, then three two-line rows at the list's padding and gap, so nothing moves when the list arrives.
