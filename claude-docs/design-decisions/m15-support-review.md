# M15.32 → M15.47 — The support feature, revised after review

**Status:** decided · **Date:** 2026-10-31

The support form, its admin page and the sender's list shipped as M15.26 to
M15.31 ([`m15.1-support-form.md`](m15.1-support-form.md)). The owner then
reviewed them in a browser, as a sender and as an admin, in both themes and
at phone width, and chose what to change. This record lists the decisions;
the sixteen tasks that carry them are in [`tasks/m15.md`](../tasks/m15.md),
"Support revision". The decisions are the owner's, made on 2026-10-31.

- Review page: <https://claude.ai/artifact/WRNYpvcfoFNa1uEP4TrLZN>
- Topic radio layout mock (the chosen layout): <https://claude.ai/artifact/Jr2H8h3oa6gQUwTooeiMAE>
- Research behind the review: [`m15-support-review-research.md`](m15-support-review-research.md). The browser screenshots are in
  `.reports/support-review/` of the `support-page-field` worktree.

## The form

- **The footer stays.**
- **Topics are radios shown as cards, one per row** (two columns at first; one per row on the owner's review of the PR, 2026-10-31), every hint visible, none
  preselected, so the sender must choose. `kind` is renamed `about`.
- **The Page field is editable.**
- **No captcha.** The signed-out path has a rate limit and a honeypot field.

## Statuses and the thread

- **Four statuses, one lifecycle:** `open`, `waiting_on_sender`, `resolved`,
  `closed`. The topic stays a field and does not change the lifecycle.
- **A request is a thread** of sender messages, staff replies and internal
  notes.
- **A sender message on `waiting_on_sender` or `resolved` sets `open`** and
  keeps the assignee.
- **A resolved request closes itself 7 days after resolving**, with a
  closing-soon email first.
- **A reply to a closed request creates a new request linked to it**,
  carrying the topic and the assignee.
- **Staff replies and internal notes never change status.**

## The admin page

- **Six views as tabs:** Needs Staff, Mine, Unassigned, Waiting on Sender,
  Resolved, Closed. Needs Staff is sorted by tier, then by oldest sender
  activity.
- **A "Sender Replied" text label on the row**, and the Needs Staff count in
  the admin nav link's text.
- **Internal notes are a labelled composer mode**, never the default, never
  emailed, tagged Internal on the thread.
- **Beta testers.** A sender who accepted an invitation with `kind = 'card'`
  is a beta tester: a "Beta Tester" row label and tier-first sort, with no
  view of its own. The tier is derived, never stored, so paying users can join
  it later.

## What the sender is told

- **The promise is "within 5 working days"**, with a note that a small team
  answers.
- **Four emails:** received, replied (exists), resolved, closing soon.

## Retention and abuse

- **Anonymise 12 months after close, and keep counts.** The topic, dates and
  counts stay; text and sender go. A soft delete would keep the data, so it
  is not the answer.
- **Time-outs stay abuse-only**, with no alternative route for a timed-out
  sender.
- **Signed-out senders** may write with an email address on two topics,
  Accessibility and Account & Sign-In, with a per-address and per-IP rate
  limit, and get replies by email only.

## Open

- **The signed-out sender's place in the table (M15.39).** The sender is
  `created_by` today, which `withAudit` fills from the session; the task
  settles whether the sender account becomes a column of its own.

## Decided: the job mechanism

The owner chose Vercel Workflows on 2026-10-31, for M15.46 and every later job. The repo had no job queue; its only scheduled thing was a GitHub Actions cron, and its precedent for expiry was a SQL predicate plus cleanup on the next write.

| Option              | Status and limits                                            | Route of ours needed          | Retries and event work        |
| ------------------- | ------------------------------------------------------------ | ----------------------------- | ----------------------------- |
| Vercel Cron         | General availability; once a day on Hobby                    | Yes, a public protected route | None; the route does the work |
| Vercel Queues       | Beta; delay capped at 7 days                                 | Yes, a consumer route         | Retries yes                   |
| GitHub Actions cron | No route needed, but cannot run in-app code                  | No                            | None, and no event work       |
| Workflows (chosen)  | Beta; sleep has no limit; `start()` is called from a service | Only the generated route      | Retries and sleeps built in   |

- **Money:** nil at this scale. Hobby includes 50,000 events a month, and extra events cost $0.02 per 1,000.
- **Hours:** Workflows would cost about 6h for M15.46 alone against about 5h for the crons. The work is split into M15.49 (the mechanism) and M15.46 (its use), so the mechanism is paid once.
- **Reused by:** M15.46, M15.48, MB.163 and the M17 billing webhooks and timers.
- **Kept as predicates:** invitations, retired slugs, lockouts and Better Auth's own expiries. A date check is enough where nothing must happen on time.
- **Moved onto jobs:** the MB.67 provisional-account sweep (to M15.49) and mail retries (to M15.50).
- **Day 5** is when the closing-soon notice goes out; the close is day 7.

Sources: <https://vercel.com/docs/workflow>, <https://vercel.com/docs/workflows/pricing>, <https://vercel.com/docs/queues/concepts>, <https://vercel.com/docs/cron-jobs/usage-and-pricing>.

## Decided while building (lane D)

### A Signed-Out Sender Has a System Actor (M15.39)

A request can belong to an email address instead of an account, so a signed-out visitor can write in (M15.40 builds the send).

**Decision (owner, 2026-10-31).** A signed-out send is written as a seeded account, "Support, signed out". The account has no seat and `canCreateWorkspace` false. `withAudit` writes it as `created_by`, and the visitor's address goes in `support_requests.sender_email`.

**Why.** `created_by` stays `NOT NULL` on every table, and `withAudit` takes the audit ids from a session. A nullable sender column beside `created_by` would be a second place for the sender to drift from it.

**The check.** The entry asks that exactly one of the sender account and `sender_email` is set. Because `created_by` is always set, the check reads "the sender account" as an account other than the signed-out one: `(sender_email IS NOT NULL) = (created_by = <signed-out account id>)`. The id is the fixed constant `SIGNED_OUT_SENDER_ID` in `src/lib/support-sender.ts`, so a CHECK can name it. Every existing row passes, since none is created by that account.

**Not built here.** The migration does not insert the account: a seed does (M15.40). Better Auth's anonymous plugin is a separate task (M15.48) and nothing here builds toward it.

### A Signed-Out Request Is Limited, Trapped and Answered by Email (M15.40)

A visitor with no account may send a request about `accessibility` or `account`, the two topics whose problem can keep them from signing in. It goes through `sendSignedOutSupportRequest`, the one open write besides sign-in, and is stored under the seeded signed-out sender account with the visitor's address in `sender_email` (M15.39).

- **Limits.** Ten sends per address and thirty per client address in 24 hours, counted in `support_send_counts`: one row per kind (`address` or `client`) and key, holding the window start and the count. It has audit columns and its own `updated_at` trigger, and the support repository writes it through `withAudit` as the seeded signed-out sender. No new exemption to rule 3 exists; an advisory lock per key makes sends that race each other all count. The window restarts when a send finds its row older than 24 hours.
- **Refusal.** A send over a limit fails with `RATE_LIMITED`, which the GraphQL layer answers with HTTP 429 and a `Retry-After` header. The header holds the whole window (86,400 seconds), not the time left, because the count is kept per window and not per attempt.
- **Honeypot.** The form carries a hidden `website` input. A request that fills it is dropped before anything is counted or stored, and the caller is told it succeeded.
- **Mail.** A receipt mail confirms the send. A staff reply to a signed-out request is mailed whole to `sender_email`, since the sender has no account to read it in.
- **An address that belongs to an account** is still treated as signed out, so a request cannot reveal which addresses are registered.
- **The sender's id** is one named constant, `SIGNED_OUT_SENDER_ID` in `src/lib/support-sender.ts`. The seed and the schema's CHECK use it, and the CHECK's migration (`0112_support-sender-email`) holds the same literal, since SQL cannot import it. The CHECK tying `created_by` to that id is accepted.
- **Out of scope.** Better Auth's anonymous plugin (M15.48) is not built toward.
