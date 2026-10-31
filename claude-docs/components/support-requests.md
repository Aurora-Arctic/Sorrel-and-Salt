# Support Requests

`src/components/SupportRequests/` — the support page, `/admin/support`, for an admin (M15.30) and, narrowed, a curator (M15.31).
A page of the requests people have sent, open ahead of resolved and newest first, with a filter, the shared
[`Pager`](pager.md), and one request opened to its message in a modal at `?request=<id>`. Render-only: the page reads the
filter and cursor off its address (`support/filter.ts`), one page and its count through `listSupportRequests` and
`countSupportRequests`, the people named on them through `usersNamedOnRequests`, and the opened request with its replies
and its sender's time-outs (`support/reads.ts`). The support services are the guard; the page and GraphQL end at the
same ones.

## Contracts

- **A row shows** what it is about, subject (a link that opens the request), status, sender, who it is assigned to, whether
  curators can see it, and the error number. `href.ts`'s `supportHref(filter, cursor, request?)` builds every address,
  carrying `?about=`, `?status=`, `?error=`, one cursor and `?request=`.
- **The sender's name** (the Sender column and the From fact) is, for an admin, a link to the Users list with that user's modal open, `/admin/users?user=<id>` (M9.19), so the browser's back returns to the request. A curator reaches nothing on the People pages, so for them it stays text, and a deleted account stays "Deleted account". The email beside it stays muted text.
- **The filter** is [`FilterForm`](filter-form.md): an Error Number search, and Kind and Status selects.
- **The opened request** is a wide dialog of two columns, stacked on a phone with the settings after the reply. Its head is
  an eyebrow ("Support · " and the kind), the subject and a status badge. The left column holds the facts (From, Sent, Page,
  and one Error line with the reference in monospace and an icon-only copy button, when the request has one), then the
  thread (the sender's message first, tagged Sender, then each reply, tagged Staff) and the reply form. The controls are:
  - **Reply** (a "Your Reply" field; Reply is disabled until there is a body) with **Resolve** opposite it (open requests
    only), for an admin or a curator the request is assigned to.
  - A right column for an admin alone: **Assigned To**, **Shared With Curators**, the Issue section (the linked issue as
    repository and number, preceded by a pencil icon button named "Change Issue Address", or the address field at once while none is linked) and **Time-Out**, a
    fold closed by default that says "none" or "until" the end of the standing time-out.
- **There is no Create Issue link.** The admin makes the GitHub issue by hand, so nothing from the request is copied
  into GitHub: the message could hold private information (the owner, 2026-10-31). The "GitHub Issue" field takes either of two
  shapes and stores both as the plain issue link, `https://github.com/Aurora-Arctic/Sorrel-and-Salt/issues/<number>`: that link itself, or a link from any project board of the `Aurora-Arctic` organisation (`github.com/orgs/Aurora-Arctic/projects/<n>/...`), such as
  `https://github.com/orgs/Aurora-Arctic/projects/1/views/1?pane=issue&itemId=…&issue=Aurora-Arctic%7CSorrel-and-Salt%7C<number>`, whose `issue` parameter is `owner|repo|number`, URL-encoded. `normaliseIssueLink` in `src/lib/support-path.ts` does it, for the form and the service alike; anything else, or an issue of another repository, is refused beside the field with "Paste a GitHub issue link, like github.com/Aurora-Arctic/Sorrel-and-Salt/issues/1409, or a link opened from the project board."
- **Time-outs** (2026-10-31, the owner's call on reviewing the PR) have no heading of their own beyond the fold. While one stands, the form is hidden and a card shows a "Timed Out" badge, "until {end}", the note in muted text, "Set by {name}, {date}" and **Lift** beneath, which asks first ("Lift the Time-Out?", a red "Lift Time-Out" confirm like Time Out Sender's). Otherwise the form asks **For** first (1 Day, 1 Week, 1 Month or Until a Date; only Until a Date shows an **Until** day field, and the end is the end of that day in the admin's own zone), then **Note** ("Seen by staff only."). **Time Out Sender** is a quiet button that asks first (heading "Time Out {name}?", body "They cannot send a support request until {end}. You can lift it sooner."), with a red confirm. The request dialog keeps no ledger: when the sender has earlier time-outs it draws a history icon link beside the Time-Out heading (the fold's `info` slot), named "Earlier Time-Outs", to the sender's user modal, where the ledger is (the owner, 2026-10-31). The panel (`timeout-panel.tsx`) is shared with the user modal, keyed by the user.
- **The page announces itself.** A visually hidden `<output>` in the list gives the result count ("3 Requests") after a filter change, and one in the dialog gives each save's outcome ("Reply sent.", "Request assigned.", "Time-out lifted."). Each row link is named subject plus sender ("Wobbling Cauldron from Ada Wortley"). The Shared With Curators column draws a check or cross with its text, the Subject cell wraps long unbroken text inside a capped width, and the dialog opens with the focus on its title. Dates use `LocalTime` long, as the account page does. The GitHub Issue and Time-Out forms ask before discarding typed input.
- Every action is a GraphQL mutation (`use-support-action.ts`) and refreshes the page on success; a refusal shows as a
  notice, or beside its field where it names one.
- A curator reaches the page through `requireCuratorSession()` and is shown the admin-only controls by none: the `viewer` prop hides them, the services refuse them regardless, and the page gives a curator no assignee list. A request neither marked nor assigned to the curator shows the same "no support request has that address" notice as an unknown id. `tests/e2e/admin-support-curator.spec.ts` proves it.
