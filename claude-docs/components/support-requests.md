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
- **The filter** is [`FilterForm`](filter-form.md): an Error Number search, and Kind and Status selects.
- **The opened request** shows From, Status, Error Number, Page, the message and the replies. The controls are:
  - **Reply** (a "Your Reply" field; Reply is disabled until there is a body) and **Resolve** (open requests only), for an
    admin or a curator the request is assigned to.
  - **Assigned To**, **Shared With Curators**, the issue panel and the time-out panel, for an admin alone.
- **Create Issue** is a link to GitHub's new-issue page on `Aurora-Arctic/Sorrel-and-Salt` with `?title=` and `?body=`
  filled from the subject, message, redacted path and request id (`issue-link.ts`). No token, no API call, and the
  sender's name and address are never read. The "Issue Address" field takes the issue's address back; one that is not an
  issue on that repository is refused beside the field by the service.
- **Time-outs** sit beside the sender: each one lists its end (or "Ended"), its note and whether it was lifted, and an
  active one has **Lift**. **Time-Out** is disabled until the end is in the future.
- **The page announces itself.** A visually hidden `<output>` in the list gives the result count ("3 Requests") after a filter change, and one in the dialog gives each save's outcome ("Reply sent.", "Request assigned.", "Time-out lifted."). Each row link is named subject plus sender ("Wobbling Cauldron from Ada Wortley"). The Shared With Curators column draws a check or cross with its text, the Subject cell wraps long unbroken text inside a capped width, and the dialog opens with the focus on its title. Dates use `LocalTime` long, as the account page does. The Issue Address and Time-Out forms ask before discarding typed input.
- Every action is a GraphQL mutation (`use-support-action.ts`) and refreshes the page on success; a refusal shows as a
  notice, or beside its field where it names one.
- A curator reaches the page through `requireCuratorSession()` and is shown the admin-only controls by none: the `viewer` prop hides them, the services refuse them regardless, and the page gives a curator no assignee list. A request neither marked nor assigned to the curator shows the same "no support request has that address" notice as an unknown id. `tests/e2e/admin-support-curator.spec.ts` proves it.
