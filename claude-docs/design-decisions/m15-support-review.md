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
- **Topics are radios shown as two-column cards**, every hint visible, none
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

- **The scheduled-job mechanism (M15.46).** The repo has no job queue. Its
  only scheduled thing is a GitHub Actions cron, and its precedent for expiry
  is a SQL predicate plus cleanup on the next write. The owner wants a queued
  job; the task opens with a proposal to the owner.
- **The signed-out sender's place in the table (M15.39).** The sender is
  `created_by` today, which `withAudit` fills from the session; the task
  settles whether the sender account becomes a column of its own.
