# Support decisions

The support form and its review, the jobs and mail behind it, and the public documents, help articles and data-portability work that sit beside it.

## A support request keeps the coven in its page

**Decision (owner, 2026-10-31).** A request's `path` is stored as the address the visitor was on, for example
`/coven/whitethorn-coven/grimoire`, never `/coven/[coven]/grimoire`. A support agent needs the coven to triage.
This reverses the write-time redaction in the section "A support form, reviewed by keepers".

**Who sees the slug (owner, 2026-10-31).** A site keeper and the sender read the page as stored. A curator reads it with the
segment after `/coven/` replaced by `[coven]`, because a coven's existence is private to its members and a curator is not
a keeper. The replacement is done at read, in `src/modules/support/services/staff.ts` (`redactPathForCurator`), on the
staff list, the staff read by id and the rows the staff acts return, so the GraphQL `path` field and the admin dialog
follow without a rule of their own. The sender's own reads (`own.ts`) return the page as stored.

**What still holds.** The query string and fragment are dropped on write, and the segment after `/invite/` is replaced by
`[token]` on write, since a token is a credential. Every other dynamic segment is stored as the address has it.

**Where the page comes from.** The Support dialog and Report This read the address bar, because the router answers
`/_not-found` on a 404. The crash page (`global-error.tsx`) adds the address bar's path as `from` when its link is
pressed. Existing rows keep `[coven]` until they are deleted.

## The support feature, revised after review

The support form, its admin page and the sender's list shipped as M15.26 to
M15.31 (see "A support form, reviewed by keepers"). The owner then
reviewed them in a browser, as a sender and as a keeper, in both themes and
at phone width, and chose what to change. This record lists the decisions;
the sixteen tasks that carry them are in [`tasks/m15.md`](../tasks/m15.md),
"Support revision". The decisions are the owner's, made on 2026-10-31.

- Review page: <https://claude.ai/artifact/WRNYpvcfoFNa1uEP4TrLZN>
- Topic radio layout mock (the chosen layout): <https://claude.ai/artifact/Jr2H8h3oa6gQUwTooeiMAE>
- Research behind the review: (see "Support feature: UX, accessibility and process research"). The browser screenshots are in
  `.reports/support-review/` of the `support-page-field` worktree.

### The form

- **The footer stays.**
- **Topics are radios shown as cards, one per row** (two columns at first; one per row, and compact, with the ring, name and hint on one line, on the owner's review of the PR, 2026-10-31), every hint visible, none
  preselected, so the sender must choose. `kind` is renamed `about`.
- **The Page field is editable.**
- **No captcha.** The signed-out path has a rate limit and a honeypot field.

### Statuses and the thread

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

### The admin page

- **Six views as tabs:** Needs Staff, Mine, Unassigned, Waiting on Sender,
  Resolved, Closed. Needs Staff is sorted by oldest sender activity
  for everyone.
- **A "Sender Replied" text label on the row**, and the Needs Staff count in
  the admin nav link's text.
- **Internal notes are a labelled composer mode**, never the default, never
  emailed, tagged Internal on the thread.
- **Beta testers.** A sender who accepted an invitation with `kind = 'card'`
  is a beta tester: a sprout mark tipped "Beta Tester" after the sender's name and a Beta Testers option in a Sender filter
  on the admin page (the owner, 2026-10-31: the filter is a Sender filter so coven stewards and paying members can join it as further options), with no view of its own and no sort order of its own. The tier is derived, never stored, so paying users can join
  it later.

- **No Create Issue link** (the owner, 2026-10-31): the prefilled GitHub link copied the message, which could hold private
  information. The keeper makes the issue by hand and pastes its address back.
- **The opened request's layout is the owner's call of 2026-10-31:** two columns, a thread of the sender's message and
  the replies, one composer with Resolve opposite Reply, a settings column beside it, and Time-Out folded. The Internal
  note mode and tag, the "Sender Replied" and "Beta Tester" badges and the sender's later messages in the thread are
  drawn in the design but not built; they wait for M15.43 and M15.44.

### What the sender is told

- **The promise is "within 5 working days"**, with a note that a small team
  answers.
- **Four emails:** received, replied (exists), resolved, closing soon.

### Retention and abuse

- **Anonymise 12 months after close, and keep counts.** The topic, dates and
  counts stay; text and sender go. A soft delete would keep the data, so it
  is not the answer.
- **Time-outs stay abuse-only**, with no alternative route for a timed-out
  sender.
- **Signed-out senders** may write with an email address on five topics,
  Accessibility, Bug, Account & Sign-In, Privacy & Data and Question, with a per-address and per-IP rate
  limit, and get replies by email only.

### Open

- **The signed-out sender's place in the table (M15.39).** The sender is
  `created_by` today, which `withAudit` fills from the session; the task
  settles whether the sender account becomes a column of its own.

### Decided: the job mechanism

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

### Decided while building (lane D)

#### The Time-Out Panel (2026-10-31)

The owner approved a redraw on reviewing the PR. The form asks "For" first, with a day-only "Until" for a date. It asks before it acts. A standing time-out is a card with Lift and the setter, and earlier ones are a ledger. The setter is `created_by` from the audit columns, so no migration was needed. The same panel sits in the admin user modal.

#### Open-Ended Time-Outs (M15.64, M15.65)

**Decision (owner, 2026-11-02).** "Allow permanent time outs. But make the note required." A support time-out may have no end date, and every time-out carries a note saying why.

- **The table (M15.64).** `support_timeouts.until` is nullable, and null means no end date, as `user_access_pauses.until` does. `note` is NOT NULL with a CHECK that `btrim(note) <> ''`. The table shipped in v0.11.0, so the migration first fills a null or blank note with the sentence "No note was recorded when this time-out was set.", then adds the constraints. The owner approved that sentence (2026-11-02). The local development database held no row it would change.
- **Standing.** A time-out stands while it is not lifted and `until` is null or in the future. The repository reads that through one predicate, `noEndOrAhead` in `src/db/repository/predicates.ts`. Where several stand, one with no end date is the one shown, else the one ending last.
- **The service (M15.65).** `timeOutSupportSender` takes `until` as optional and `note` as required. Each refusal of a field ("Choose a time in the future", "Write a note saying why", "Keep the note to 500 characters") is its own sentence and the error's message, through `fieldRefusal` in `src/lib/errors.ts`, which the two access-pause services share.
- **The words.** Every place that shows a time-out's end says "with no end date" when it has none: the send and reply refusals ("you are timed out with no end date"), the support page and the Support dialog, the sender's reply box, the staff reply form's notice, the Users table's Time-Out column ("Timed out with no end date") and the panel's card. The email sent when a time-out is set names its end (as UTC), or says it has none, and carries the optional message the admin wrote to the user (`support_timeouts.message`), never the note. It is sent by the `supportTimeoutMail` durable job, started after the write commits (M15.66).
- **The panel.** The time-out panel offers No End Date beside the dated spans and marks Note required, keeping Time Out Sender off until a note is written. It draws its fields, its end and its earlier time-outs from the site access pause panel's parts (`access-pause-parts.tsx`), so the two read alike.
- **The seed.** Fixture I's time-out has no end date, in place of the year-long stand-in.
- **The Terms of Use** say a keeper may stop a person sending support requests "for as long as a keeper decides", in place of "for a time" (the owner's wording, 2026-11-02). `TERMS_VERSION` stays 2026-11-02, by the owner's decision, so an account that has agreed is not asked again.

#### The Footer Row (2026-10-31)

The owner approved a redesign of the site footer: the site name as a link home at the left, the links at the right, Support the only one. There is no small descriptive line until the owner writes one.

#### A Signed-Out Sender Has a System Actor (M15.39)

A request can belong to an email address instead of an account, so a signed-out visitor can write in (M15.40 builds the send).

**Decision (owner, 2026-10-31).** A signed-out send is written as a seeded account, "Support, signed out". The account has no seat and `canCreateWorkspace` false. `withAudit` writes it as `created_by`, and the visitor's address goes in `support_requests.sender_email`.

**Why.** `created_by` stays `NOT NULL` on every table, and `withAudit` takes the audit ids from a session. A nullable sender column beside `created_by` would be a second place for the sender to drift from it.

**The check.** The entry asks that exactly one of the sender account and `sender_email` is set. Because `created_by` is always set, the check reads "the sender account" as an account other than the signed-out one: `(sender_email IS NOT NULL) = (created_by = <signed-out account id>)`. The id is the fixed constant `SIGNED_OUT_SENDER_ID` in `src/lib/support-sender.ts`, so a CHECK can name it. Every existing row passes, since none is created by that account.

**Not built here.** The migration does not insert the account: a seed does (M15.40). M15.48 later kept the signed-out sender as this stand-in account and added a mailed view link (the section "A signed-out sender reaches their request by a mailed link").

#### A Signed-Out Request Is Limited, Trapped and Answered by Email (M15.40)

A visitor with no account may send a request about `accessibility`, `bug`, `account`, `privacy` or `question`: the first and third because their problem can keep them from signing in, the rest because they need no account to ask (widened from the first two on 2026-10-31, the owner's call). It goes through `sendSignedOutSupportRequest`, the one open write besides sign-in, and is stored under the seeded signed-out sender account with the visitor's address in `sender_email` (M15.39).

- **Limits.** Ten sends per address and thirty per client address in 24 hours, counted in `support_send_counts`: one row per kind (`address` or `client`) and key, the key an HMAC of the address and never the address itself (`src/lib/send-count-key.ts`), holding the window start and the count. It has audit columns and its own `updated_at` trigger, and the support repository writes it through `withAudit` as the seeded signed-out sender. No new exemption to rule 3 exists; an advisory lock per key makes sends that race each other all count. The window restarts when a send finds its row older than 24 hours.
- **Refusal.** A send over a limit fails with `RATE_LIMITED`, which the GraphQL layer answers with HTTP 429 and a `Retry-After` header. The header holds the whole window (86,400 seconds), not the time left, because the count is kept per window and not per attempt.
- **Honeypot.** The form carries a hidden `website` input. A request that fills it is dropped before anything is counted or stored, and the caller is told it succeeded.
- **Mail.** A receipt mail confirms the send. A staff reply to a signed-out request is mailed whole to `sender_email`, since the sender has no account to read it in.
- **An address that belongs to an account** is still treated as signed out, so a request cannot reveal which addresses are registered.
- **The sender's id** is one named constant, `SIGNED_OUT_SENDER_ID` in `src/lib/support-sender.ts`. The seed and the schema's CHECK use it, and the CHECK's migration (`0112_support-sender-email`) holds the same literal, since SQL cannot import it. The CHECK tying `created_by` to that id is accepted.
- **Out of scope.** Better Auth's anonymous plugin: M15.48 considered it and dropped it (the section "A signed-out sender reaches their request by a mailed link").

### Decided while building

#### A Curator Is Never Shown a Sender’s Email (the owner’s call of 2026-10-31)

- **Where the address reached a curator.** The stored `sender_email` of a signed-out request on every staff read; the sender’s account email through `usersNamedOnRequests`, which fed the admin page’s From fact; and the dialog’s From fact itself. The list’s Sender column showed only a name. `User.email` in GraphQL was already self-or-admin, and `SupportRequest` exposes no address field.
- **The service decides.** `asRead` in `services/staff.ts` returns `senderEmail` as null for a curator, beside the path redaction, so one place says what a curator sees. `usersNamedOnRequests` blanks other people’s addresses for a curator. The reply flow reads the stored address on its own unredacted read and mails it, so a curator answers without seeing it.
- **Components.** An account sender is named alone; a signed-out request reads "Signed-out sender" with no address, to a curator, and to a keeper with the address beside it.
- **The issue link.** A curator reads the linked issue as a read-only link; only `setSupportRequestIssueUrl`, admin-only in the service, changes it.

#### The Footer Is Drawn Once, by the Root Layout (the owner's call of 2026-10-31)

- **One footer, in `src/app/layout.tsx`.** The footer sits under every page: both frames, the home page and the error screens. The copies in `AppShell`, `PublicFrame` and the home page are gone, and so is the `inShell` flag that chose a link. The cause of the missing footer on `/account/support` was not found by reading the code: no rule hides it there, and the page was one of those the per-frame copy did not reach. Drawing it once removes the class of fault.
- **The home page shows it to everyone.** `/` is crawlable and shows the site name; the footer is added to it for a signed-out visitor too. It carries no data, so MB.84's rule that `/` shows no workspace data still holds.
- **The Support dialog is mounted beside it** in the root layout (`SupportDialog`), so the footer's Support link opens the dialog on every page, including the public frame. It asks what the visitor may do (sign in, confirm an address, wait out a time-out, or write) when it opens. `/support` is unchanged as a page for a shared link; the link falls back to it until the address is known.
- **Cost.** The root layout reads no session and runs no query for the dialog: it fetches its state through `/api/graphql` (`supportDialogState`) when it opens, so a visitor who never opens it costs nothing. The price is one request per open, and a form skeleton until it answers. The owner chose this on 2026-10-31.
- **`/` keeps its footer below the fold.** The home page's frame (`.page-frame.welcome-page`) takes the whole window height, phone included, and does not subtract the footer's room, so the footer follows on scroll after the usual 4rem gap in every window size. The owner's call, 2026-10-31.
- **The footer sits at the foot of a short page.** The layout wraps page and footer in a column at least one window tall, and the footer's top margin is `auto`. A centred page frame is shorter by the footer's height so the two together fit one window.
- **The salt stays above the footer.** The footer declares a scroll view timeline and the salt image rises on it; the opaque fill stays as the fallback (claude-docs/components/site-footer.md).

#### The Sender's Page Is a Compact List with a Dialog (the owner's call of 2026-10-31)

- **A compact list, and the request in a dialog.** `/account/support` lists one two-line row per request (the subject, then status badge, kind, sent day and reply count; no page path) and a row opens the request in a dialog at `?request=<id>`, reusing the staff dialog's facts and thread (`SupportSenderRequest`).
- **"You" and "Staff".** The sender's own messages are tagged "You" and every reply "Staff"; the sender never sees a curator's or admin's name.
- **A faded reply box.** Beneath the thread sits a disabled, faded reply form (a "Your Reply" field and a Reply button, both disabled). It stands in for M15.43 and sends nothing.

- **Staff-only fields on a request (2026-10-31, the owner's call).** The sender never sees or receives the issue address or the error reference (the crash digest). The sender's reads blank both, their GraphQL fields need a curator scope, and the sender's dialog draws the Error fact as the status code alone. The staff dialog keeps both. The reference is shown at the time of the error (the error screens) and sent with the request (Report This), but never shown to the sender afterwards.

#### Internal Notes On Any Readable Request (2026-10-31)

The owner's call: a curator may add an internal note to any request they can read, assigned to them or not; a keeper on any. A reply to the sender and Resolve stay assigned-only. A request outside the curator's scope still reads as absent. The note has its own guard, the staff read by id, in place of `requestToAnswer`.

## Support feature: UX, accessibility and process research

Web research only. No code was read or changed.

How to read this document:

- **fetched** means I read the page. **search** means I saw it only in a search-result summary; treat it as weaker.
- **My inference** marks a conclusion that no source states directly.
- **Gap** marks a question where I found no usable source. I did not fill gaps with invented claims.
- Vendor surveys and vendor blogs are labelled as such.

---

# Part 1: Design and accessibility

### 9. Blocking or timing out a user; what the blocked person sees

- MDN 429 (fetched): a `Retry-After` header "may be included to this response to indicate how long a client should wait". https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/429
- OWASP Authentication cheat sheet (fetched): lockout stops further attempts for a period; tune threshold, window and duration; exponential lockout is an option; lockout can cause denial of service to legitimate users; generic error messages are for login, to avoid account enumeration. https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- Gap: no source on what text a blocked support sender should see.
- My inference:
  - OWASP's generic-message rule is about hiding whether an account exists. A signed-in sender already knows their own account, so a clear message does not leak anything.
  - Say plainly that sending is paused, until when, and how else to reach someone (the accessibility and privacy routes should not be fully blocked; see sections 17 and 19).
  - Use a time-limited block rather than a permanent one, and keep it limited to sending new requests.

### 10. Reply-notification emails

- Gap: I found no authoritative guidance on whether a support-reply email should contain the reply text or only a link.
- GOV.UK Notify and other government teams (search only): lead with the key message; the subject and opening line should say what has happened; keep the subject short; avoid bold, italics and custom fonts. https://github.com/alphagov/notifications-manuals/wiki/Sending-emails-to-our-users ; https://design.homeoffice.gov.uk/design-system/patterns/send-users/email ; https://www.notifications.service.gov.uk/using-notify/formatting
- Help Scout (search): staff can reply by email to notifications. https://docs.helpscout.com/article/67-email-notifications
- My inference:
  - Subject: say what happened and which request ("Reply to your support request: <subject>").
  - Body: because replies may contain personal details, a link-only email avoids putting content into mailboxes, but it forces a sign-in to read. Including the reply text is more useful and is what help desks do. This is a steward decision; I have no source that settles it.
  - Send a plain-text part alongside HTML. No source read states this requirement.

### 11. Accessibility specifics

- Accessible name (fetched): 4.1.2 requires a name; techniques ARIA14 (`aria-label`) and ARIA16 (`aria-labelledby`); failure F89 is an image-only link with no name; F111 is a control with visible label text but no accessible name. https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html
- Required fields (fetched): 3.3.2 Labels or Instructions is satisfied by marking required fields in the label (H90). `aria-required` (ARIA2) is advisory. https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html
- `aria-required` (search): the native `required` attribute is the default for native controls; `aria-required` is for custom widgets; neither draws a visual cue. https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-required ; https://www.deque.com/blog/anatomy-of-accessible-forms-required-form-fields
- Error identification (fetched): 3.3.1 — "it is not sufficient to only re-display the form"; errors must be in text; techniques include ARIA21 (`aria-invalid`), ARIA19 (`role="alert"`). https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html
- Error suggestion (fetched): 3.3.3 — give a correction where one is known. https://www.w3.org/WAI/WCAG22/Understanding/error-suggestion.html
- GOV.UK error summary (fetched): move focus to it; title "There is a problem"; link each message to its field; wording matches the inline messages; show it even for one error; put it at the top of `main`. https://design-system.service.gov.uk/components/error-summary/
- GOV.UK validation (fetched): validate on submit, not on blur; prefix the page title with "Error: "; always validate on the server; use `novalidate`. https://design-system.service.gov.uk/patterns/validation/
- Status messages (fetched): see section 4.
- APG combobox (fetched): Down Arrow moves into the popup; Escape dismisses it; Enter accepts the focused option and closes; Alt+Down opens without moving focus; in select-only comboboxes typing a letter moves to the next option starting with it; Escape returns focus to the combobox. https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
- My inference: the footer "Support" link has visible text, so its accessible name is already correct; the risk is on icon-only links (such as an icon "Report This"), which need a name. If the topic control is a custom dropdown, it must follow the select-only combobox keyboard model above, or use a native select.

---

# Part 2: Support process

### 12. End-to-end process for a small team

- Zendesk lifecycle (fetched): New, Open, Pending (waiting on the requester), On-hold (internal, optional), Solved, Closed. "The default automation setting is that a ticket is closed automatically four days after it has been solved." If those automations are off, tickets close 28 days after solving. A requester reply on a Solved ticket reopens it; a Closed ticket cannot be reopened. https://support.zendesk.com/hc/en-us/articles/8263915942938-About-the-ticket-lifecycle-and-ticket-statuses
- Zendesk follow-up (fetched): "any response to a closed ticket from any channel automatically creates a follow-up ticket" that references the original. https://support.zendesk.com/hc/en-us/articles/4408883882522-Creating-a-follow-up-for-a-closed-ticket
- Atlassian (fetched): reminder rules fire after 3 business days with no status change; a resolved request that waits 3 days (72 hours) is commented on (comment shared with the customer) and moved to Closed. https://support.atlassian.com/jira/kb/implement-automated-issue-inactivity-follow-ups-and-closure-in-jira-service-management-cloud/
- Atlassian community (search): a customer comment on a Resolved issue reopens it only if the reopen transition and a rule are added; a "Thanks" would reopen it too. https://community.atlassian.com/forums/Jira-Service-Management/Auto-close-ticket-if-no-response-in-7-days-and-reopen-if-replied/qaq-p/2845681
- Help Scout (search): three statuses, Active, Pending (waiting on a customer reply) and Closed; a customer reply to Pending or Closed sets it to Active. https://docs.helpscout.com/article/11-understand-conversation-icons-and-colors
- Intercom (search): Submitted, In progress, Waiting on customer, Resolved. https://www.intercom.com/help/ja/articles/8687982-customize-ticket-states
- Triage (search, blog level): tag, route, flag urgent, assign immediately, check the inbox first thing, track first response time. https://make.wordpress.org/community/handbook/community-deputy/resources-and-tools/help-scout/triage-in-help-scout/
- Response-time surveys (vendor surveys, not independent research):
  - HubSpot (fetched): "66% of consumers expect a response from customer service in five minutes or less"; no sample size or year stated. https://blog.hubspot.com/service/customer-responsiveness
  - SuperOffice (fetched): an audit of 1,000 companies, not a survey of expectations; 62% did not respond; the average response took 12 hours 10 minutes; about nine in ten did not acknowledge receipt. Year unstated. https://www.superoffice.com/blog/customer-service-benchmark/
  - Toister Solutions (search): 2018 survey of 1,200 consumers; a one-hour email reply meets 89% of expectations. https://toistersolutions.com/blog/tag/email+response+time
- Gaps: Freshdesk guidance not obtained. The GOV.UK service manual user-support page I tried returned 404; I did not read it (parent: https://www.gov.uk/service-manual/helping-people-to-use-your-service).
- My inference:
  - The common lifecycle across vendors is: new, open (staff working), waiting on sender, resolved, closed. Pending/waiting statuses stop a clock and return to open on a sender reply.
  - A closed request should not reopen; a reply to it should start a linked new request (Zendesk), or the app should refuse and point to the form.
  - For a team of one keeper and a few curators, publish a realistic window (the GOV.UK example is 2 working days) rather than chasing the vendor minute figures.
  - Auto-close resolved requests after a short stated period (Zendesk 4 days, Atlassian 3 days) and tell the sender.

### 13. What the sender is told, and when

- GOV.UK confirmation and contact patterns (fetched, sections 2 and 4): reference, what happens next, reply time.
- SuperOffice (fetched, vendor audit): most companies do not acknowledge receipt, and almost none ask for satisfaction.
- Atlassian (fetched): the pre-close comment is shared with the customer.
- Zendesk CSAT (search): email surveys go out about 24 hours after Solved so the sender can check the fix; a vendor guide says the delay lowers surveys on tickets that reopen. https://www.zendesk.com/blog/customize-csat-surveys/ ; https://www.eesel.ai/blog/zendesk-csat-survey-email-delay
- Gap: no source on a "did this solve it?" prompt versus a satisfaction survey.
- My inference: tell the sender at four moments: on send (acknowledgement with reply window), on staff reply (email), on resolve (email saying it is resolved and that replying reopens it), and before auto-close (one notice). A "did this solve it?" control is optional for a small team; a reopen path ("This did not fix it") gives the same signal with less work.

### 14. Replies and threads; "reply by email"

- Zendesk, Help Scout (fetched/search, section 12): a requester reply to Solved or Pending returns the request to the open state; a reply to Closed creates a linked follow-up.
- Help Scout (search): staff reply to notification emails and the reply is posted to the conversation, with commands such as `@note` for an internal note. https://docs.helpscout.com/article/43-email-commands
- My inference: if the sender can reply in the app, the app needs a rule for replies on resolved and closed requests (reopen or refuse). Accepting replies by email would need inbound mail handling and spam control; a small team can skip it and have the email link back to the request.

### 15. Internal notes versus public replies

- Zendesk (search, vendor blogs): public replies notify the requester; internal notes do not; the composer defaults to a public reply, so internal text posted to the customer by accident is a known risk. https://www.getmacha.com/blog/zendesk-internal-notes-vs-public-replies ; https://www.eesel.ai/blog/zendesk-ticket-internal-vs-public-comment
- My inference: even with one keeper, a place to record internal context is useful once curators are involved, and "share with curators" is already an internal channel. If notes exist, label the composer mode in text ("Reply to sender" versus "Internal note") and never default to the riskier mode. Whether to build separate notes now is a steward decision.

### 16. Categories on support forms

- Search, vendor blogs (no controlled study found): agents tag the same issue inconsistently; coarse required dropdowns push users to wrong choices. https://www.klark.ai/en/post/autocategorisation-support-automatisation ; https://haloagents.ai/blog/support-ticket-categorization-problems ; https://www.supportbench.com/?p=25124
- Gap: no peer-reviewed or controlled evidence on sender-chosen categories and deflection. A "20 to 30% of manually tagged tickets" figure appears in one vendor post; I could not verify it and do not rely on it.
- My inference: because the seven topics route real work (accessibility, privacy, account), asking is justified. Let staff change the topic, and avoid a required topic that blocks sending when the sender is unsure (a "Question" or "Not sure" default covers that).

### 17. Abuse handling

- MDN 429 and OWASP (fetched, section 9): `Retry-After`; thresholds, windows and durations; exponential lockout; lockout can be abused to deny service to others.
- Gap: no source on abuse handling specific to support forms.
- My inference: rate-limit sending by account (not IP alone, per OWASP's account-based counter), time-limit blocks, show the end time, log who blocked and why, and keep an alternative contact route.

### 18. Privacy: what a request record stores

- ICO storage limitation (fetched): no fixed retention period; do not keep data "just in case"; document standard retention periods; review and then erase or anonymise; deletion includes backups; people can ask for erasure. https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/storage-limitation/
- ICO data minimisation (fetched): data must be "adequate, relevant and limited"; "You must not collect personal data on the off-chance that it might be useful in the future." https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/data-minimisation/
- URL tokens (search): OWASP Cornucopia says URL parameters leak through browser history and referrer headers; Tenable adds proxy and server logs. https://cornucopia.owasp.org/edition/webapp/SM9 ; https://tenable.com/plugins/was/112799
- My inference:
  - Store the page path only; strip the query string and fragment (they can hold tokens such as invitation or verification tokens).
  - Store the user agent and IP only if there is a stated purpose (abuse handling) and a retention period.
  - Set a retention period for closed requests, state it in the privacy notice, and handle erasure requests.

### 19. Accessibility-specific channels

- UK sample accessibility statement (fetched): the feedback and contact section tells users how to report problems, gives contact details and states a response time ("We'll consider your request and get back to you in [number] days."). The enforcement wording is legally required. https://www.gov.uk/government/publications/sample-accessibility-statement/sample-accessibility-statement-for-a-fictional-public-sector-website
- EU Web Accessibility Directive FAQ (fetched): the statement must include compliance status, inaccessible content, dates, preparation method, a description of and link to the feedback mechanism, contact details, and the enforcement procedure. The feedback mechanism is "a legal requirement". https://web-directive.eu/statements/index.html
- Search only: the European Commission's web guide uses a feedback form with an accessibility topic https://commission.europa.eu/resources/europa-web-guide/design-content-and-development/accessibility/complaints-and-feedback-mechanism_lv ; W3C's statement generator lists contact for feedback as minimal recommended content https://wai-website.netlify.app/planning/statements/generator
- My inference:
  - An "Accessibility" option on a general form can serve as the feedback mechanism. It does not replace an accessibility statement.
  - The legal duty applies to public sector bodies; I did not establish whether this app is one. The owner should check.
  - Whether or not it is required, state a response time for accessibility reports and make that route usable without sign-in if possible; a signed-out visitor who is blocked by an access barrier cannot reach a sign-in-gated form. This matters here because `/support` shows signed-out visitors only a Sign In prompt.

---

---

# Part 3: Task management in support systems

Same labels as above: fetched, search, My inference, Gap.

### 20. Status lifecycles

- Zendesk (fetched, https://support.zendesk.com/hc/en-us/articles/8263915942938-About-the-ticket-lifecycle-and-ticket-statuses): New, Open, Pending, On-hold (optional), Solved, Closed.
  - Pending means waiting on the requester. On-hold is internal ("waiting on a third party") and the requester sees "Open".
  - Agents set Solved. Closed is set only by automation or trigger: "Tickets can be closed by a trigger or automation, but not by agents." (fetched, https://support.zendesk.com/hc/en-us/articles/4408887712154-What-is-the-difference-between-a-solved-ticket-and-a-closed-ticket)
  - Automatic moves: new to open on assignment/agent action; reply from the requester back to Open; Solved to Closed after 4 days by default (max 28); Closed to Archived after 120 days.
- Help Scout (fetched, https://docs.helpscout.com/article/11-understand-conversation-icons-and-colors): Active ("needs action"; new conversations arrive Active), Pending ("waiting on something, such as a customer's reply"), Closed. Staff set Pending and Closed. A customer reply to Pending or Closed sets Active automatically.
- Jira Service Management (search, community and Atlassian KB; no official spec page found): typical statuses are Waiting for support and Waiting for customer. A comment-driven move is done by automation, not the workflow. A common rule: customer comments while Waiting for customer, move to Waiting for support; agent public reply, move to Waiting for customer. Internal comments do not move it. https://support.atlassian.com/jira/kb/comments-not-updating-status-in-jira-service-management-cloud/ ; https://community.atlassian.com/forums/Jira-Service-Management/Change-status-after-every-customer-reply/qaq-p/1551587
- Freshdesk (search; the official page needed a login, so not fetched): defaults Open, Pending, Resolved, Closed; "Waiting on Customer" and "Waiting on third party" are available, and keepers can add custom statuses. Pending commonly pauses SLA timers. https://support.freshdesk.com/en/support/solutions/articles/37600-customizing-your-ticket-statuses
- Intercom (search): states Open, Snoozed, Closed in the inbox; ticket states Submitted, In progress, Waiting on customer, Resolved. https://www.intercom.com/help/en/articles/8838656-inbox-faqs ; https://www.intercom.com/help/ja/articles/8687982-customize-ticket-states
- Linear (search): status categories Backlog, Unstarted, Started, Completed, Canceled; teams add custom statuses inside a category. https://linear.app/docs/configuring-workflows
- GitHub issues (fetched, partial): open and closed only; closing can carry a reason ("not planned"). The page did not cover reopening. https://docs.github.com/en/issues/tracking-your-work-with-issues/administering-issues/closing-an-issue
- Meaning of the waiting words (my inference, from the above): "Pending" (Zendesk, Help Scout, Freshdesk), "Waiting on customer" (Intercom, Freshdesk, Jira) all mean the ball is with the requester. "On-hold" (Zendesk) means the ball is with someone outside the requester and the team. Everywhere the sender's reply returns the request to the staff side.
- Common shape across all of them (my inference): one "needs staff" state, one "waiting on requester" state, one "done but can reopen" state, and one "finished" state.

### 21. Re-opening on reply

- Zendesk (fetched, https://support.zendesk.com/hc/en-us/articles/11006863625370-Why-is-the-customer-s-reply-not-changing-the-ticket-status-to-open): "When an end user comments on a pending, solved, or on-hold ticket, the ticket status automatically changes to Open." Closed does not change: "Closed tickets cannot be reopened by design," so a reply creates a follow-up ticket (fetched, follow-up article in section 12). Exceptions: a trigger can reset the status; if the requester is an agent the status stays as chosen.
- Help Scout (fetched): reply to Pending or Closed sets Active. No follow-up ticket; the same conversation reopens.
- Freshdesk (search): a customer response moves the ticket back to Open; a reply after the threading window on a closed ticket may create a new ticket. Treat as unverified.
- Jira Service Management (search): a reply to a Resolved issue reopens only if an automation rule and transition exist; a "Thanks" would reopen too (section 12 link).
- Intercom (search): a conversation closed by a workflow can still reopen when the customer replies. Not stated on one page.
- How staff are told:
  - Help Scout (fetched): Active conversations are shown in bold at the top of folders and the sidebar count counts Active only. So a reopened one is a count and a bold row.
  - Zendesk: I found no built-in assignee notification on reopen; vendor blogs say to build a trigger (search, https://www.eesel.ai/blog/zendesk-ticket-views-solved-reopen). Treat as unverified.
  - Gap: no official source for a "customer replied" badge as such.
- My inference (the owner's idea is the standard model): a sender reply sets the request to the "needs staff" status, whatever it was, except for finished/closed ones. The queue shows it because the queue is filtered by status, with no separate flag needed.

### 22. Buckets, views and queues

- Help Scout (fetched, https://docs.helpscout.com/article/1429-about-default-folder-views-in-help-scout): always shown: Unassigned (Active and Pending not assigned to anyone), Mine (Active and Pending assigned to you), Assigned (assigned to others), Closed, Spam. Conditional: Drafts, Chats, and Needs Attention ("only when one or more conversations need manual intervention"). Sidebar counts count Active only.
- Jira Service Management (search): default queues such as All open, Assigned to me, Unassigned; keepers customise, reorder, delete; SLA data is shown in queue columns; a "Waiting for customer" or "Breaching SLA" queue is suggested only by a third-party guide. https://confluence.atlassian.com/servicemanagementserver/using-service-project-queues-939926462.html ; https://community.atlassian.com/learning/lesson/set-up-requests-and-queues
- Zendesk (search): views are saved filters; SLA columns sort by time to breach; no triggers on breach, only time-based automations. I could not fetch the default-views page (the URL I tried was a search reference). https://www.eesel.ai/blog/zendesk-sla-view-column-sort-by-breach
- Intercom (search): inbox filtered by state Open, Snoozed, Closed; views per inbox.
- Gap: no source states a minimum set of views for a small team.
- My inference: the common core across Help Scout and Jira is four: unassigned, mine, others'/all open, closed. Add one more split for a small team: "waiting on sender", so staff can ignore it until it moves.

### 23. Needs-attention signals

- Help Scout (fetched): bold Active rows at top, Pending after, Closed greyed at the bottom; sidebar counts Active only; a Needs Attention folder appears only when something needs manual action.
- Zendesk (search): SLA badge colour shows time left, red once breached; sort the SLA column ascending to put the nearest breach on top.
- WCAG 1.4.1 Use of Color (fetched, https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html): "Color is not used as the only visual means of conveying information". Pair colour with text or another cue. GOV.UK tag (section 7) says the same for status.
- Gap: no accessibility guidance found specific to "unread" or "needs attention" row markers or navigation count badges.
- My inference:
  - Use a text label in the row ("Sender replied") and make the status column text, with bold only as an extra.
  - Put a count in the navigation link text ("Support (3)"), so a screen reader hears it; do not rely on a coloured dot.
  - Sort needs-staff rows first, oldest reply first, so nothing waits behind newer items (an inference from SLA sorting, not a sourced rule).
  - "Stale" is a time-based rule, so it is derived from last activity and a stated threshold, not a stored status.

### 24. Assignment and ownership

- Zendesk (search, https://support.zendesk.com/hc/en-us/articles/4828787357210-Managing-your-omnichannel-routing-configuration): round robin gives work to the agent who has gone longest without work; only new and open tickets are routed; agents set Online, Away or Offline; optional reassignment of up to 50 recent open tickets when an agent's status changes to chosen values.
- Help Scout (fetched): unassigned conversations show in Unassigned for anyone to take; Mine and Assigned split by owner.
- Jira Service Management (search): "Assigned to me" and "Unassigned" queues; SLA timers can start at assignment.
- Gap: nothing found on small-team "away" handling outside Zendesk's feature.
- My inference: for one keeper plus a few curators, "take it" from an Unassigned view is enough; auto-assign adds nothing. For an assignee who is away, the minimum is a keeper action to reassign, plus a visible "assigned to X, last activity N days ago" so a stalled one can be spotted.

### 25. Resolution and the sender's say

- Zendesk (fetched): agents set Solved; only automation closes; a solved ticket reopens on reply; closed does not. CSAT email goes about 24 hours after Solved by default (search, https://www.zendesk.com/blog/customize-csat-surveys/).
- Atlassian (fetched, section 12): auto-close after 3 days resolved, with a comment to the customer.
- Help Scout (fetched): Closed is set by staff; a customer reply reopens.
- Gap: I found no source on a requester-initiated close or "did this solve it?" as a built-in. Section 13's inference stands.
- My inference: "Resolved" is staff saying it is done and the sender may still reply; "Closed" is finished, set by the system after a quiet period. The sender can reopen while Resolved; after Closed they start a new linked request.

### 26. Topic-dependent workflows

- Zendesk (search): the Type field (Question, Incident, Problem, Task) is a system field that cannot be extended; statuses are the same for all types; I found nothing about per-type status sets. A solved Problem solves its linked Incidents. https://support.zendesk.com/hc/en-us/articles/4408881729434-How-can-I-add-additional-ticket-type-options
- Jira (known from section 20): workflows are per issue type, so different types can have different statuses.
- Linear (search): statuses are per team, not per type.
- Gap: I found no help-desk system with per-type statuses by default; common practice from these sources is one lifecycle with type as a field or tag.
- My inference: seven topics do not justify seven workflows. Use one lifecycle with topic as a field. A bug that needs development work is better tracked by the existing GitHub link than by a separate status set.

### 27. A data model (my inference; no source states it)

Fields on a support request:

- `status`: one of `open`, `waiting_on_sender`, `resolved`, `closed`.
- `topic`: the seven options. Changeable by staff.
- `assignee`: nullable user.
- `last_sender_activity_at`, `last_staff_activity_at`: set when each side posts. Derive "stale" and sort from these, so no extra statuses are needed.
- `resolved_at`, `closed_at`: for the auto-close timer and reporting.
- `shared_with_curators`: boolean (internal), `github_url`: nullable (internal).
- Messages: `author_role` (`sender` or `staff`), `visibility` (`public` or `internal`). Only public messages count as replies.

Transitions:

| From                            | Event                                                   | To                                | Who                              |
| ------------------------------- | ------------------------------------------------------- | --------------------------------- | -------------------------------- |
| (none)                          | sender submits                                          | `open`                            | system                           |
| `open`                          | staff posts a public reply, marking "waiting on sender" | `waiting_on_sender`               | staff                            |
| `open`, `waiting_on_sender`     | staff marks done                                        | `resolved`                        | staff                            |
| `waiting_on_sender`, `resolved` | sender posts a message                                  | `open`                            | system                           |
| `resolved`                      | no activity for N days                                  | `closed`                          | system, with a notice sent first |
| `closed`                        | sender posts or submits                                 | new request linked to the old one | system                           |
| any except `closed`             | staff internal note                                     | no change                         | n/a                              |

Re-open rule, stated precisely: a public message from the sender on a request in `waiting_on_sender` or `resolved` sets `status = open`, clears `resolved_at`, sets `last_sender_activity_at`, and returns the request to the "needs staff" view; if assigned, it stays with the assignee. On `closed` it changes nothing and a linked new request is created. A staff message never reopens anything. An internal note never changes status.

Views (buckets): Needs staff (`open`), Mine (`open` or `waiting_on_sender`, assignee is me), Unassigned (`open`, no assignee), Waiting on sender, Resolved, Closed. "Needs staff" is sorted oldest sender activity first.

---

# Checklist

Each check is yes/no; the number is the source section above.

1. Does each topic option show its one-line description before the sender chooses (radios with hints, not a native select)? (1)
2. Is the topic list kept to a number a visitor can scan, with no option preselected unless it is the safe default? (1)
3. Does the form have no more than about five visible fields? (2)
4. Does the form state when the sender can expect a reply? (2, 4, 13)
5. Is the character count hidden until near the limit, with typing never blocked? (2)
6. Does the prefilled Page value contain only the path, with query string and fragment removed? (2, 18)
7. Are only required fields marked, in the label text, with `required` set on native controls? (2, 11)
8. Is the dialog named (`aria-labelledby`), does focus enter it, does Tab stay inside, and does Escape close it? (3)
9. Does focus return to the control that opened the dialog on close? (3)
10. Is there a visible Cancel or Close control in the tab order? (3)
11. Does Escape, outside click or Cancel ask before discarding typed message text? (3)
12. Does a standalone `/support` page offer the same form, for people the modal fails? (3)
13. Does the success notice say what happens next, when, and where the request will be listed? (4)
14. Is the success notice announced (`role="status"`) or given focus? (4, 11)
15. Do 404 and 500 pages use plain headings without "404", "oops" or blame, and say whether work was saved? (5)
16. Do error pages still return real 404 or 500 status codes? (5)
17. Is the footer Support link in the same place on every page, including error pages? (6)
18. Is there a footer link to an accessibility statement, and to privacy? (6, 19)
19. Does the sender's list use text status labels, not colour alone, from a short set? (7)
20. Is the sender's list sorted by latest update, with "waiting on you" visible as text? (7)
21. Do internal states (assigned, shared with curators, GitHub link) stay out of the sender's view? (7, 12)
22. Is the admin queue a native table with a caption and `scope` headers, and is the sorted column marked `aria-sort`? (8)
23. Does every row action have a unique accessible name that includes the request? (8, 11)
24. Is a blocked sender told plainly that sending is paused, until when, and how else to get help? (9, 17)
25. Is every block time-limited, narrow to new requests, and logged? (9, 17)
26. Does the reply email's subject say what happened and which request? (10)
27. Does the email have a plain-text part, and has the owner decided between reply text and link-only? (10)
28. Does form validation run on submit, with an error summary that takes focus and links to each field? (11)
29. Are inline errors text, tied to fields (`aria-invalid`, described by), and worded the same as the summary? (11)
30. Is the lifecycle defined (new, open, waiting on sender, resolved, closed), with what a sender reply does in each state? (12, 14)
31. Do resolved requests auto-close after a stated period, with a notice to the sender first? (12, 13)
32. Does a reply to a closed request create a linked new request or point to the form, never silently vanish? (12, 14)
33. Can staff change the sender's chosen topic? (16)
34. Is there an internal notes mode labelled in text, with the safer mode as default? (15)
35. Is there a stated retention period for closed requests, and is IP or user agent stored only with a stated purpose? (18)
36. Does the accessibility report route work for a signed-out visitor, and is a response time stated? (19)
37. Has the owner confirmed whether the accessibility regulations apply to this site? (19)
38. Is there one "needs staff" status, one "waiting on sender" status, one "resolved" status and one "closed" status, each shown as text? (20, 27)
39. Does a sender message on a waiting or resolved request set it back to the needs-staff status automatically? (21, 27)
40. Does a sender message on a closed request create a linked new request instead of changing the old one? (21)
41. Do staff replies and internal notes never reopen a request? (20, 21, 27)
42. Does the admin queue have at least Needs staff, Mine, Unassigned, Waiting on sender, Resolved and Closed views? (22)
43. Do navigation counts count only requests that need staff, and are they in the link text? (22, 23)
44. Is every needs-attention marker text (for example "Sender replied"), with colour or bold only as an extra? (23)
45. Is the needs-staff view sorted with the oldest sender activity first? (23)
46. Is "stale" derived from last activity and a stated threshold, not a stored status? (23, 27)
47. Can any staff member take an unassigned request, and can a keeper reassign one? (24)
48. Does a reopened request stay with its assignee, and is that assignee visible? (21, 24)
49. Is closing done only by the system after a quiet period, with a notice to the sender first? (25)
50. Is there one lifecycle for all seven topics, with topic as an editable field? (26, 27)

# Gaps and open owner decisions

- Gaps: reply-email content guidance (10); sort order and "staff replied" indicators (7); blocked-sender wording (9); a "did this solve it?" prompt (13); evidence on sender-chosen categories (16); Freshdesk and the GOV.UK service manual user-support page (12); NN/g on dropdown versus radios (1).
- Owner decisions: reply text or link-only in emails (10); separate internal notes (15); whether the accessibility regulations apply (19); retention period (18); the footer label "Support" versus "Contact Us" (6).
- Part 3 gaps: official Freshdesk and Jira Service Management status pages (not fetched; login wall or community-level only); GitHub reopen behaviour; Zendesk default views page; any minimum-views source; accessibility guidance for unread/needs-attention markers beyond WCAG 1.4.1; requester-initiated close.
- Part 3 owner decisions: whether "resolved" lets the sender reopen and for how many days (25, 27); whether a reply to a closed request makes a linked new request or is refused (21); whether to keep an assignee on reopen (24).

## Support requests: "kind" becomes "about"

The owner renamed what a support request is "of" from `kind` to `about`, and widened it from three
values to seven: `accessibility`, `bug`, `account`, `compendium`, `privacy`, `feedback`, `question`.

- The column is `support_requests.about`, the enum type `support_request_about`, the GraphQL enum
  `SupportAbout`, and the `?support=` and `?about=` parameters carry the same values.
- The form's field is labelled "What Is This About?"; a column heading or filter in the support lists is "About".
- `SUPPORT_ABOUTS` in `src/lib/support-path.ts` is the one list of values, labels and descriptions; a
  guard test holds it equal to the database enum.
- The migration renames in one step rather than expanding and contracting, because `support_requests`
  has not reached main or production. Its `.ack.md` sidecar records that.
- Other uses of the word "kind" (Notice, invitations, references, the support panel's state) are unchanged.

## A support form, reviewed by keepers

The site has no way to be contacted. This record says how a person using it
reaches whoever runs it: a form whose submissions are rows in a table, which
a keeper works through on the admin section. It answers each decision the
task listed, with its reason, folds MB.176 (bug reports) into the same design
and mints the build. The decisions are the owner's, made on 2026-10-31.
DESIGN.md §3, §5, §7, §9 and §10 carry the result. The approved plan is
(see "Scope a support form reviewed by keepers (plan)").

### Who can submit

**Only a signed-in account with a verified address.** An observer and an account
in no coven are included, because a request belongs to the account and is not
workspace content. A signed-out visitor sees a Sign In link in the form's
place.

Why: `withAudit` throws when the session has no user (`src/db/repository/write.ts`),
and no system actor exists to write on a visitor's behalf. The app also has no
rate limiter of its own; the only one is Better Auth's, on the sign-in
routes (`src/lib/auth.ts`). A form open to anyone would be an unlimited write
path with no author. A verified address means a reply can be mailed to a
person who has proved they own it.

### The kinds of request

**`accessibility`, `bug` and `question`**, a column the sender picks, with
accessibility listed first. Why a column: the admin list filters on it, and
the code of ethics (M15.4) links to the form with `kind=accessibility` already
chosen. Why accessibility first: the owner added the kind (2026-10-15) so that
an accessibility bug has an obvious route, and the list's order says so.

**Statuses are `open` and `resolved` for every kind.** A bug that becomes a
GitHub issue does not need a status of its own. The link is a separate
nullable column, `issueUrl`, so a question and a bug move through the same two
states.

### Data requests

**Left out for now.** A request under GDPR (the EU's data protection law), such
as a copy of one's data or its deletion, may become a fourth kind, or have a path
of its own. The GDPR scoping task decides. Adding a `data` kind later is a
migration that adds an enum value, so leaving it out costs nothing now, and
choosing it here would pre-empt that task.

### The table

Three tables in a new `support` module (see "Architecture decisions moved").
Each spreads the audit columns. None carries a workspace id: a request is the
account's, not a coven's.

- **`support_requests`** — `id`, `kind` (`accessibility` | `bug` | `question`),
  `subject`, `message`, `path`, `errorCode` (nullable integer), `status`
  (`open` | `resolved`), `assignedTo` (nullable user), `curatorVisible`
  (boolean, default `false`), `issueUrl` (nullable), `resolvedBy` (nullable
  user), `resolvedAt` (nullable), + audit. Soft-deleted. The sender is
  `createdBy`, so there is no second sender column to drift from it.
  `errorCode` is the HTTP status of the error page the request was sent from
  (404, 500), so a keeper can filter on it.
- **`support_replies`** — `id`, `requestId`, `body`, + audit. Soft-deleted. The
  author is `createdBy`.
- **`support_timeouts`** — `id`, `userId`, `until` (nullable: no end date),
  `note` (required), `liftedAt` (nullable), + audit. Kept as history. The
  active time-out is the row with `liftedAt IS NULL` and `until` null or in
  the future. The keeper who set it is `createdBy`. The nullable `until` and the
  required note came later, on the owner's call (M15.64, M15.65;
  (see "The support feature, revised after review"), "Open-Ended Time-Outs").

Why the sender is a signed-in account: that settles the question the task
asked about a signed-out sender. The sender's session is the `withAudit` actor
and `createdBy` is the sender, so rule 3 holds with no exception.

Why replies are rows of their own: a request can take more than one reply, and
the sender reads them on the site. A reply column on the request would hold
one.

Why soft delete and why resolved rows are kept: rule 4 makes every audited row
soft-deleted, and a resolved request is the record that a problem was heard.

**The path was stored with the segment after `/coven/` redacted** (MB.176's
rule); superseded 2026-10-31 by the owner: the slug is stored, and only a curator reads it redacted
(see "A support request keeps the coven in its page").

### The form

**A modal, opened by `?support=<kind>&error=<code>` on shell pages, with
`/support` as the form's own address.** The query parameter follows the `?new=`
pattern the app already uses (`src/components/AppShell/add-href.ts`,
`SpellBuilder/spell-dialog.tsx`), so the modal is a link and works from
anywhere. `/support` exists for a link shared outside the app, for the public
footer, and for a browser without JavaScript. `kind` preselects the kind.

Entry points:

- the account menu;
- a **Support** link in the shared footer, in both shells, beside the privacy
  policy, disclaimer and code of ethics links M15.2 to M15.4 add (the owner's
  addition, 2026-10-31);
- a **Report This** button on M11.10's 404 and 500 pages and its error
  boundary, which opens the modal set to `bug` with the error number and the
  page path filled in and shown to the sender, and stored in `errorCode` and
  `path` (the owner's addition, 2026-10-31). Why: the sender should not have
  to describe where they were or copy a number.

What it asks for: a kind, a subject of 1 to 120 characters and a message of 1
to 4,000. The limits keep a row small and a list readable; they are the same
as the reply's, so one validation schema serves both. It says "received" on
success, and the request then appears on the sender's own list at
`/account/support` with its status and any replies.

A signed-out visitor sees Sign In in the form's place. A sender under a
time-out sees when it ends, or that it has no end date, in place of the form.

### The admin list

**`/admin/support`**, paged through the M3.6 helper (rule 8), newest first with
open requests ahead of resolved ones. Actions:

- **Reply.** Stored as a `support_replies` row and shown on the sender's list.
  The sender is mailed a short notice that a reply is waiting, linking to
  `/account/support`. **The reply text is not mailed.** Why: the text stays on the site, behind the sender's sign-in, and the notice
  needs only the link. The template is `src/emails/support-reply-notice.tsx`, sent
  through `send()` in `src/lib/mail.ts`.
- **Assign** to a curator or a keeper.
- **Mark viewable by curators** (`curatorVisible`).
- **Resolve**, which records who and when.
- **Create Issue**, for a bug (see "MB.176 folded in").
- **Time Out** and **Lift** (see "Abuse").

### The curator view

**The same page, filtered in SQL.** A curator (M11.20) reads requests marked
`curatorVisible` or assigned to them, and nothing else. A curator replies to
and resolves only what is assigned to them, and never reassigns a request or
changes its visibility. Why one page: a second page would duplicate the list,
its paging and its actions, and the filter in the finder (CLAUDE.md rule 7)
means a request the curator may not see never reaches a resolver.

**A curator is refused, by direct id, a request neither marked `curatorVisible`
nor assigned to them**, as well as not seeing it in the list. The test asserts
the precondition that would have let the call succeed (a request that exists,
and a curator who holds the role) so that it fails if the guard is removed.

### Abuse

**Ten requests per account in 24 hours**, counted in SQL on
`support_requests`, and a keeper's **time-out**.

- The limit is counted from the table, not held in memory, because a serverless
  function has no memory that outlives a request. The sender who
  reaches it gets an explaining error, not a bare refusal.
- **A time-out** is a keeper's act (the owner's call, 2026-10-31). It writes a
  `support_timeouts` row with an end, or with no end date, and a note saying
  why. While one is active, `sendSupportRequest` refuses with an explaining
  error that names the end, or says the sender is timed out with no end date. An
  admin can lift it early, which sets `liftedAt`. Rows are kept, so the admin
  page shows a sender's past time-outs beside the sender. **A curator cannot
  time anyone out.** Why admin only: it is a sanction on an account, like the
  privilege ledger, which M11.20 keeps from curators.
- No signed-out submission exists, so there is no held-for-a-check queue to
  design.

### What it is not

- **Not help and FAQ articles.** Those are MB.175: rows a keeper writes and
  anyone reads. A support request is one person's message.
- **Not a notes or moderation system** (§13).
- **Not a way to request a correction to a compendium entry.** The owner
  deferred corrections with compendium suggestions (2026-10-15), so a request
  names no entry and the ingredient detail page carries no link to the form.

### MB.176 folded in

MB.176 (bug reports, #691) decided a `bug_reports` table with a reporter's own
list, a keeper triage page, and a prefilled GitHub Create Issue button. It was
not built. One table and one form serve both, so the owner folded it into this
task and retired it on 2026-10-31. A bug is a `bug` kind of support request.

What survives:

- **The `/coven/` path**, stored with its slug and read redacted by a curator, as above.
- **Create Issue with no token.** The button opens GitHub's new-issue page on
  `Aurora-Arctic/Sorrel-and-Salt` prefilled through `?title=&body=`. There is no
  API call and no stored credential, and the keeper edits the text before
  posting because the repository is public. The prefill carries the subject,
  the message, the redacted path and the request id, **never the sender's name
  or address**.
- **`issueUrl`.** The admin pastes the issue's address back onto the request.
  It is validated as an issue on that repository, so it cannot hold an
  arbitrary link.
- **The sender's own list**, at `/account/support`. The sender's finder ANDs
  `createdBy` itself, and another sender's request is refused by direct id.
- **No mail on a status change.** The status is in the app. Only a reply sends
  the short notice.

What does not survive: a four-value status (`open`, `triaged`, `fixed`,
`closed`), replaced by `open` and `resolved` for every kind; a separate
`/account/bug-reports` and `/admin/bug-reports`; and "story 65". Story 65 was
never applied to `DESIGN.md` or `CLAUDE.md`, and the Wave 13 review gave 76 to
80 to the grimoire stories, so the support story takes **89**. The v1 count is
66 stories (1–34, 47–64, 76–89).

MB.176's two `CLAUDE.md` lines move as described next.

### Architecture decisions moved

Two lines in `CLAUDE.md` are widened. Each was an architecture decision, so
each is recorded here and not routed around.

1. The curation invariant.

   Before: "Admins and curators curate the compendium, global categories, the
   ingredient form vocabulary, the two group vocabularies that organise them,
   the celestial body and zodiac vocabularies, and the deity vocabulary with the
   traditions that group it — and nothing else."

   After: the same list, then "and review support requests, which hold only
   what a sender chose to write", and the sentence still ends "and nothing
   else". Why it costs little: a request holds the sender's own words and the
   page they were on, never workspace content, and a curator reads the path with the coven redacted.

2. The viewer rule.

   Before: "**Observers write nothing.** With notes deferred to v2, there is no
   exception."

   After: "**Observers write nothing to a workspace; an observer may still send a
   support request.** With notes deferred to v2, there is no other exception."
   Why: a request is the account's, not the coven's, and an observer is exactly the
   account that has just signed up and may need to ask a question.

A third change sits beside these. **`support` is a sixth module**, joining
`identity`, `coven`, `vocabulary`, `ingredients` and `grimoire` (`CLAUDE.md`'s
Modules line and `claude-docs/modules.md`). Why: the three tables share no
rule with the accounts, covens or compendium, and `identity` already owns the
privilege ledger and invitations. A module of its own keeps the support services
from growing it, and the first build task does `modules.md`'s five "Adding a
module" steps.

### Build tasks

Six tasks, minted 2026-10-31 as M15.26 to M15.31 in
[`tasks/m15.md`](../tasks/m15.md), "Support build". Each is its own PR, in the
order the table-then-behaviour rule fixes.

| Id     | Name                                                  | Estimate |
| ------ | ----------------------------------------------------- | -------- |
| M15.26 | The `support` module and the `support_requests` table | 2h       |
| M15.27 | The `support_replies` and `support_timeouts` tables   | 1.5h     |
| M15.28 | Support services and GraphQL                          | 5h       |
| M15.29 | The Support modal, `/support` and the sender's list   | 4.5h     |
| M15.30 | The admin Support page                                | 4.5h     |
| M15.31 | The curator view                                      | 2h       |

Placement in Wave 15's row: `M15.1 · M15.2 · M15.26 → M15.31 · M15.3 · M15.4 · …`,
with `MB.176` removed. Why there:

- The modal's footer link needs the footer M15.2 builds, so the build comes
  after M15.2.
- M15.4's code of ethics links to the form, so the build comes before M15.4.
- M11.8's axe sweep and MB.124's design review cover every page, the support
  pages included, so the build comes before both.

## Scope a support form reviewed by keepers (plan)

Issue #946, Wave 15 — Launch, 3h. A scoping task: it writes one decision record, mints the build tasks, edits the docs, and builds nothing. MB.176 (Bug reports, #691) is folded into it and retired, on the owner's call (2026-10-31).

### Context

The site has no way to be contacted. Two Not Started tasks each scoped part of the answer: M15.1 (a support form with question, bug and accessibility-bug kinds, reviewed by keepers, with a curator view) and MB.176 (a `bug_reports` table with a reporter's own list, a keeper triage page and a prefilled GitHub Create Issue button). One table and one form serve both; the owner chose to merge MB.176's mechanisms into M15.1's design and retire #691.

Decisions the owner made in this session (2026-10-31), recorded in the record with their reasons:

| Decision                     | Answer                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Who can submit               | Signed-in, verified accounts only (an observer and an account in no coven included). A signed-out visitor sees a Sign In link in the form's place. Reason: `withAudit` refuses a write with no session, no system actor exists, and the app has no rate limiter outside Better Auth's own.                                                                                                 |
| Kinds                        | `accessibility`, `bug`, `question`, a column the sender picks, accessibility listed first. A `data` kind (GDPR) is left out until the GDPR scoping task chooses.                                                                                                                                                                                                                           |
| Statuses                     | `open` / `resolved` for every kind; a bug's GitHub link is a separate nullable `issueUrl`.                                                                                                                                                                                                                                                                                                 |
| Replies                      | Rows of their own table, shown on the sender's list at `/account/support`; a short mail says a reply is waiting and links there (the reply text is not mailed).                                                                                                                                                                                                                            |
| Curator                      | Reads requests marked `curatorVisible` or assigned to them; replies to and resolves only what is assigned to them; never reassigns or changes visibility. Same `/admin/support` page, filtered in SQL.                                                                                                                                                                                     |
| Module                       | A new sixth module, `support`.                                                                                                                                                                                                                                                                                                                                                             |
| Abuse                        | 10 requests per account per 24h, counted in SQL on the table; subject 1–120 characters, message and reply 1–4,000.                                                                                                                                                                                                                                                                         |
| Deletion                     | Soft (rule 4); resolved rows are kept.                                                                                                                                                                                                                                                                                                                                                     |
| Time-out (owner, 2026-10-31) | A keeper (not a curator) can time a sender out: a `support_timeouts` row with `until` and a note; `sendSupportRequest` refuses while one is active, with an explaining error naming the end; a keeper can lift it early. Rows are kept as history, so the admin page shows past time-outs beside the sender. Admin-only because it is a sanction on an account, like the privilege ledger. |
| Retire MB.176                | Yes, by hand: `gh issue edit` (retitle `MB.176 — [RETIRED] Bug reports`) and `gh issue close --reason "not planned"`, with a comment pointing to the record.                                                                                                                                                                                                                               |

Owner additions on the plan review (2026-10-31): a Support link sits in the shared footer in both shells, beside the privacy policy, disclaimer and code of ethics links M15.2–M15.4 add; and the modal is reachable from every error page (M11.10's 404, 500 and the error boundary) with the error number and page path filled in, stored in `errorCode`.

Defaults I will set in the record (stated, not asked): the form is a modal opened by `?support=<kind>&error=<code>` on shell pages (the `?new=` pattern of `src/components/AppShell/add-href.ts` and `SpellBuilder/spell-dialog.tsx`), with `/support` as the form's own address for shared links and the public footer; the page path is stored with the segment after `/coven/` redacted (MB.176); the sender's session is the `withAudit` actor and `createdBy` is the sender; the sender's finder ANDs `createdBy`; the Create Issue prefill carries subject, message, redacted path and request id, never the sender's name or address, and the pasted-back URL is validated as an issue on `Aurora-Arctic/Sorrel-and-Salt`; a request names no compendium entry and the ingredient page carries no link; the reply mail is a new `src/emails/support-reply-notice.tsx` on `src/lib/mail.ts`'s `send()`.

### Facts the plan rests on

- No app-level rate limiter: only Better Auth's `rateLimit` at `src/lib/auth.ts:305-308`.
- `withAudit` at `src/db/repository/write.ts:259` throws without `session.userId`; no system actor exists.
- Mail: `src/lib/mail.ts:60` `send()`; templates in `src/emails/` with `defineMessage`; table "What is sent" in `claude-docs/email.md:241`.
- Admin gating: `src/app/(shell)/admin/layout.tsx` → `requireCuratorSession()`; People pages add `requireAdminSession()`; nav in `src/components/AdminNav/sections.ts` (`adminOnly` flag, `ADMIN_PAGES`, `ADMIN_SECTIONS`).
- Paged list pattern: `findPrivilegeChangePage` → `listPrivilegeChanges` → `t.pagedConnection` in `src/modules/identity/graphql/privilege-changes.ts:62` → `admin/(people)/privilege-changes/page.tsx`.
- No footer component exists yet; M15.2 builds it in both shells. The account menu is `src/components/AccountMenu/`.
- `claude-docs/DESIGN.md`: §5 Data model line 190 (`### Tables` 239), §7 GraphQL SDL line 683 (the issue says §8, which is Auth at 1327 — §7 is right), §9 Routes line 1365, story list §10 around line 1494.
- `claude-docs/TASKS.md:62` is Wave 15's row; M11.8 and MB.124 sit after `MB.176`.
- Next free ids: M15.23 onward (M15.22 is the highest). Next migration 0100 (build tasks, not this one).
- Story numbers: v1 is 1–34, 47–64, 76–88; MB.176's "story 65" was never applied, so the support story takes **89** and the count reads 66.
- `claude-docs/modules.md` "Adding a module": five steps, done by the first build task.

### Steps

#### 1. Worktree and branch

`git worktree add /home/node/worktrees/m15.1 -b feature/m15.1-support-form staging` after `git fetch origin staging`; copy `/app/node_modules` in, delete `node_modules/.cache/tsc/tsconfig.tsbuildinfo`. `node scripts/task-board.mjs status M15.1 "In Progress"`. All edits below in that worktree.

#### 2. Write `claude-docs/design-decisions/support.md`, "A support form, reviewed by keepers"

One heading per decision in the issue's list (Who can submit · Kinds · Data requests · The table · The form · The admin list · The curator view · Abuse · What it is not), each with the answer and its reason, plus "MB.176 folded in" (what it decided, what survives: redacted path, Create Issue, sender's list, two CLAUDE.md lines) and "Build tasks" (the minted list). Table shapes:

- **`support_requests`** — `id`, `kind` (`accessibility` | `bug` | `question`), `subject`, `message`, `path` (redacted), `errorCode` (nullable integer: the HTTP status of the error page the request was sent from, so a keeper can filter on it), `status` (`open` | `resolved`), `assignedTo` (nullable user), `curatorVisible` (boolean, default false), `issueUrl` (nullable), `resolvedBy` (nullable user), `resolvedAt` (nullable), + audit; soft-deleted; no workspace id; sender is `createdBy`.
- **`support_replies`** — `id`, `requestId`, `body`, + audit; soft-deleted; author is `createdBy`.
- **`support_timeouts`** — `id`, `userId`, `until`, `note` (nullable), `liftedAt` (nullable), + audit; kept as history; the active one is the row with `until > now()` and `liftedAt IS NULL`; the keeper who set it is `createdBy`.

#### 3. Mint six build tasks (order fixed by the table-then-behaviour rule)

Each entry written to `claude-docs/tasks/m15.md` under a new `### Support` sub-heading after M15.1, then `gh issue create --title "<ID> — <name>" --type Task --label tracked --milestone "Wave 15 — Launch" --body-file <scratchpad file>` and `node scripts/task-board.mjs estimate <ID> <h>`. Re-check each id with `find` first.

| ID     | Name                                                  | h   | Criteria highlights                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------ | ----------------------------------------------------- | --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M15.23 | The `support` module and the `support_requests` table | 2   | modules.md's five steps; migration 0100; `CREATE TABLE` only; trigger line; `table-metadata.ts` row                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| M15.24 | The `support_replies` and `support_timeouts` tables   | 1.5 | `CREATE TABLE` only, both tables; FK to requests and users                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| M15.25 | Support services and GraphQL                          | 5   | `sendSupportRequest` (verified session, limit 10/24h and an active time-out each as an explaining error, lengths, path redaction), `mySupportRequests`, `supportRequests` (admin, paged, open first then newest), `replyToSupportRequest`, `assignSupportRequest`, `setSupportRequestCuratorVisible`, `resolveSupportRequest`, `setSupportRequestIssueUrl`, `timeOutSupportSender` and `liftSupportTimeout` (admin only; a curator refused); **a curator refused by direct id a request neither `curatorVisible` nor assigned to them**; a sender refused another's request by direct id; an observer may send; reply mails the notice |
| M15.26 | The Support modal, `/support` and the sender's list   | 4.5 | modal from AccountMenu and from a **Support** link in the shared footer M15.2 builds, in both shells, beside the legal-document links (owner, 2026-10-31); `?support=<kind>&error=<code>`; `/support` page; Sign In in place when signed out; a timed-out sender sees the end time in place of the form; `/account/support` list with replies and status; **a Report This button on M11.10's 404 and 500 pages (and the error boundary) opens the modal set to `bug` with the error number and the page path filled in and shown to the sender**, stored in `errorCode` and `path` (owner, 2026-10-31); stories; story 89 flow         |
| M15.27 | The admin Support page                                | 4.5 | `/admin/support` paged, actions, Create Issue prefill (no token), issue URL paste-back validated, Time Out (with an end and a note) and Lift beside the sender, past time-outs shown; AdminNav entry; story                                                                                                                                                                                                                                                                                                                                                                                                                            |
| M15.28 | The curator view                                      | 2   | same page filtered in SQL; reply/resolve on assigned only; refusal by direct id asserted in the browser and the service; AdminNav shows it to curators                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

Placement in `TASKS.md:62`: `M15.1 · M15.2 · M15.23 → M15.28 · M15.3 · M15.4 · …`, with `MB.176` removed from the row. Reason: the modal's footer link needs M15.2's footer; M15.4's ethics page links to the form so the build precedes it; all precede M11.8 and MB.124.

#### 4. Doc edits (same PR)

- `claude-docs/tasks/m15.md`: head count (`_22 tasks · N hours_` → 28), the "### Support" paragraph, six entries; M15.4's entry names `/support?kind=accessibility` (or the modal param) as the accessibility-bug route.
- `claude-docs/tasks/mb.md`: MB.176's entry marked retired, superseded by M15.1, and its summary-table row updated.
- `claude-docs/waves/wave-15.md`: M15.1's paragraph gains where the build sits and why; MB.176's mention removed or marked retired.
- `claude-docs/TASKS.md`: Wave 15 row; MB.176 struck wherever listed.
- `claude-docs/DESIGN.md`: §5 three tables (in the `**name** — cols, + audit` shape); §7 SDL additions (the queries and mutations above, `SupportRequest`, `SupportReply`, `SupportTimeout`, `SupportKind`, `SupportStatus`); §9 routes `/support`, `/account/support`, `/admin/support`; §10 story 89 "a support request" and the count 66 (1–34, 47–64, 76–89); §3 module tree gains `support`.
- `CLAUDE.md`: story count line → 66 stories; the two lines MB.176 named — "Admins and curators curate … and nothing else" gains "and review support requests, which hold only what a sender chose to write", and "Observers write nothing" gains "to a workspace; an observer may still send a support request" — recorded as architecture decisions in the record. Modules line gains `support`.
- `claude-docs/modules.md` ownership table: a `support` row marked "added by M15.23".
- `claude-docs/email.md` "What is sent": a row for the reply notice, marked "from M15.25".
- Milestone description's first line: `gh api` PATCH with `--input` (per memory) to say the support build sits before M15.3.

#### 5. Board

- `node scripts/task-board.mjs sync M15.1 M15.4` (entries edited); `sync MB.176` is not possible after the retitle, so retire after the sync pass.
- Retire #691: `gh issue edit 691 --title "MB.176 — [RETIRED] Bug reports"`, `node scripts/task-board.mjs comment MB.176 "Superseded by M15.1's record …"` (before the retitle, so `find` still matches), `gh issue close 691 --reason "not planned"`, then move it to the `Retired — not done` milestone with `gh issue edit --milestone`.
- `node scripts/task-board.mjs reorder` dry-run; `--apply` only from this worktree on the row edit (memory: reorder from staging rows — ask first if the worktree is not on staging's row state; it is on a feature branch, so I will show the dry run and ask).
- Progress comments on M15.1 as steps land.

#### 6. Commit as each step goes green (`npm run pre-commit`), without `--no-verify`. No PR until asked.

### Verification

Doc-only PR: `npm run format:check` and `npm run lint` (no coverage run — memory: no tests on doc-only changes). `node scripts/task-board.mjs find M15.23 … M15.28` each print Wave 15 and Not Started; `find MB.176` shows `CLOSED` / `NOT_PLANNED`; `grep -n "MB.176" claude-docs/TASKS.md claude-docs/waves/wave-15.md` shows only the retired note; `node scripts/task-board.mjs reorder` dry-run lists the six where the row places them.

### Acceptance criteria mapped

- Record answers every decision → step 2.
- Build tasks minted, entered, placed ahead of M11.8 and MB.124, milestone and wave say why → steps 3–5.
- DESIGN.md names table, mutation, routes → step 4.
- Build criteria include the curator direct-id refusal → M15.25 and M15.28.
- Nothing built → only `claude-docs/`, `CLAUDE.md` and board changes.

## The privacy policy's working notes

The privacy policy at `/privacy` (`src/app/(public)/privacy/page.tsx`) describes what the code does. This file is where each claim in it points to the file or `DESIGN.md` section it was read from, so the owner can check the text against the code and a later change knows which sentence it makes wrong. The page itself cites nothing: a reader wants the policy, not its footnotes.

The policy's values, set by the owner: say plainly what is kept and why, keep to what the site needs, state people's rights over their data in everyday words, and name honestly what the site does not yet do (a soft delete is not an erasure; there is no delete-account button).

### Claims and their sources

#### The short version

| Claim                                                                      | Source                                                                                                                                                                                                                              |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No advertising, no tracking script, nothing sold                           | `package.json` lists no analytics, advertising or tracking dependency; `src/app/layout.tsx` and `src/app/pre-paint-scripts.tsx` load no third-party script. A statement about the future is the owner's commitment, not a code fact |
| Cookies only for signing in: the session cookie and the last-method cookie | Better Auth's session cookie (`src/lib/e2e-session-cookie.ts`, `tests/e2e/session-cookie.ts`); `lastLoginMethod({ cookieName: LAST_USED_PROVIDER_COOKIE })` in `src/lib/auth.ts`. No `cookies().set` anywhere under `src/`          |
| The theme is kept in the browser, not sent                                 | `localStorage.getItem("theme")` in `src/app/pre-paint-scripts.tsx`                                                                                                                                                                  |
| Deleted means marked, not erased                                           | `CLAUDE.md` rule 4; `claude-docs/db/soft-delete.md`, "Soft-delete filtering and the partial-index convention"                                                                                                                       |

#### What is stored

| Claim                                                                                        | Source                                                                                                                                                                                                                                                                                   |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The account row's fields                                                                     | `src/modules/identity/schema/users.ts`: `name`, `email`, `emailVerified`, `image`, `role`, `canCreateWorkspace`, `verificationSentAt`, `twoFactorEnabled`, `...auditColumns`                                                                                                             |
| An observer seat in the demo coven on sign-up                                                | `DESIGN.md` §5, `workspaces`; the sign-up hook in `src/lib/auth.ts` ("an observer seat in the demo coven")                                                                                                                                                                               |
| The address changes only at verification                                                     | `CLAUDE.md`, "An address changes only at verification"                                                                                                                                                                                                                                   |
| Provider sign-in keeps the provider, your id, tokens and scope                               | `accounts` in `src/modules/identity/schema/auth.ts`: `providerId`, `accountId`, `accessToken`, `refreshToken`, `idToken`, `scope`                                                                                                                                                        |
| The four providers                                                                           | `src/lib/social-providers.ts`: `discord`, `google`, `facebook` (hidden), `microsoft`; `DESIGN.md` §8, "Four ways to sign in"                                                                                                                                                             |
| A password is kept in a locked form (a scrypt hash)                                          | `claude-docs/auth/passwords.md`, "The config" (scrypt); `accounts.password`                                                                                                                                                                                                              |
| Failed password sign-ins are counted, with first, last and lock end                          | `signInFailures` in `src/modules/identity/schema/auth.ts`                                                                                                                                                                                                                                |
| A passkey's stored fields                                                                    | `passkeys` in the same file: `name`, `publicKey`, `deviceType`, `backedUp`, `counter`, `transports`, `aaguid`. That the private half stays on the device is what a passkey is (`DESIGN.md` §8, "a key stored on the person's device")                                                    |
| Authenticator secret and backup codes kept in a locked form (encrypted); wrong codes counted | `twoFactors` in the same file, its header comment ("the plugin's encrypted text"), `failedVerificationCount`, `lockedUntil`                                                                                                                                                              |
| A session row's fields, including IP address and browser details                             | `sessions` in the same file: `token`, `expiresAt`, `ipAddress`, `userAgent`                                                                                                                                                                                                              |
| Impersonation records the admin, and runs outside production only                            | `sessions.impersonatedBy` and its comment; `src/lib/impersonation.ts`; `DESIGN.md` §14's question "Can a keeper sign in as another user?"                                                                                                                                                |
| Verification rows                                                                            | `verifications` in the same file: `identifier`, `value`, `expiresAt`                                                                                                                                                                                                                     |
| Sign-in rate limits by address and route                                                     | `claude-docs/auth/rate-limiting.md`, "Rate limiting", one row per `<address>                                                                                                                                                                                                             | <path>`; `rateLimits` table |
| A signed-out support request is counted by address and by email for 24 hours                 | `src/modules/support/services/signed-out.ts`: `countSignedOutSend(values.email, context.clientIp …)`, `SIGNED_OUT_WINDOW_SECONDS = 24 * 60 * 60`; `src/graphql/context.ts` reads `x-vercel-forwarded-for`                                                                                |
| Four audit stamps, two more on deletion, written from the session                            | `src/db/audit.ts` (`createdAt`, `createdBy`, `updatedAt`, `updatedBy`; `deletedAt`, `deletedBy`); `CLAUDE.md` rule 3 ("takes the audit ids from the session, never a request body")                                                                                                      |
| The privilege ledger cannot be edited and holds who, how, when and a note                    | `DESIGN.md` §5, `user_privilege_changes` ("Append-only by the database: a `forbid_rewrite()` trigger")                                                                                                                                                                                   |
| What a coven holds                                                                           | `DESIGN.md` §5: `workspaces`, `workspace_members`, `invitations` (`email`, `role`, `note`), ingredients, `inventory_items`, `spells`, `spell_steps`, `spell_workings`                                                                                                                    |
| A private spell is stored in the coven and shown only to its author                          | `src/db/repository/spells.ts` ("the coven's shared spells plus this reader's private"); `src/modules/grimoire/services/spells.ts` ("A private spell is its author's alone")                                                                                                              |
| A card is bound to no address; a refused attempt is recorded with its reason                 | `CLAUDE.md`, "Invitation tokens" (`kind = 'card'`); `src/modules/coven/schema/card-invitation-attempts.ts` (`userId`, `reason`, `attempts`)                                                                                                                                              |
| A support request's fields; a signed-out requestor's email; time-outs kept as history        | `src/modules/support/schema/support-requests.ts` (`subject`, `message`, `path`, `errorCode`, `status`, `assignedTo`, `senderEmail`); `DESIGN.md` §5, `support_replies`, `support_timeouts` ("kept as history, never deleted"; its `message` column holds what the time-out's email said) |

#### Who processes it

| Claim                                                                                                                                                                   | Source                                                                                                                                                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vercel hosts and runs the code                                                                                                                                          | `DESIGN.md` §4, "Platform: Vercel Hobby"                                                                                                                                                                                                                                                                                                                            |
| Vercel sees every request, including the address                                                                                                                        | `src/lib/auth.ts` `ipAddressHeaders: ['x-vercel-forwarded-for']`; `src/graphql/context.ts` reads the same header: the address reaches the code from Vercel                                                                                                                                                                                                          |
| The server's logs carry an error reference when a page fails                                                                                                            | `support_requests.errorReference`'s comment: "the digest Next gives an error page, so a request can be matched to the server log line"                                                                                                                                                                                                                              |
| Neon holds the database                                                                                                                                                 | `DESIGN.md` §4 (Neon Postgres) and §8 ("Neon in deployment")                                                                                                                                                                                                                                                                                                        |
| Resend sends production mail; Mailtrap captures preview's                                                                                                               | `src/lib/mail.ts`, `REQUIRED_TRANSPORT`: `production: 'resend'`, `preview: 'mailtrap-sandbox'`; "The captures never deliver"                                                                                                                                                                                                                                        |
| What is mailed: verification links, invitations, notices                                                                                                                | `claude-docs/auth/admin-bootstrap.md`, "The email page"; `CLAUDE.md`, "Invitation tokens" ("the link is mailed to the invited address"); `DESIGN.md` §5, `support_replies` ("a mailed notice says one is waiting")                                                                                                                                                  |
| The providers hand the site your name, address and picture                                                                                                              | `users.name`, `users.email`, `users.image` are what the sign-up hook receives; `src/lib/auth.ts` comment on a provider "that shared no address"                                                                                                                                                                                                                     |
| A support time-out, a site access pause and a coven access pause each keep a record about the user: end date, who set it, the note, and the message written to the user | `support_timeouts` (`src/modules/support/schema/support-timeouts.ts`), `user_access_pauses` (`src/modules/identity/schema/user-access-pauses.ts`) and `workspace_member_pauses` (`src/modules/coven/schema/workspace-member-pauses.ts`): `until`, `note`, `message` (nullable, up to 500 characters, what the email carries), `created_by`; each is kept as history |

#### Time-outs and pauses

| Claim                                                                               | Source                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The user is emailed once when a time-out or pause is set, and not when it is lifted | `timeOutSupportSender` (`src/modules/support/services/timeouts.ts`), `pauseUserAccess` (`src/modules/identity/services/access-pause.ts`) and `pauseMemberAccess` (`src/modules/coven/services/member-pause.ts`) start a durable mail job after the write commits (`startMailJob`, `src/lib/mail-job.ts`); the email carries the row's `message` and end date, never its `note`; the lift services take no notifier; `src/lib/pause-mail.ts` supplies the origin |

#### How long it is kept

| Claim                                                                                      | Source                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Soft delete on covens, memberships, ingredients, spells, support replies                   | `workspaces` and `workspace_members` spread `auditColumns` (`src/modules/coven/schema/workspaces.ts`); `CLAUDE.md` rule 4; `DESIGN.md` §5, `support_replies` ("soft-deleted") |
| Provisional accounts lapse after an hour or three hours, and the next sign-in removes them | `claude-docs/auth/admin-bootstrap.md`, "Provisional accounts" (`hooks.before` on `/callback/:id`; `ON DELETE CASCADE` for `accounts` and `sessions`)                          |
| Two pairing tables are removed outright                                                    | `claude-docs/db/hard-delete-join-tables.md`, "Hard delete on two join tables" (`ingredient_categories`, `spell_categories`)                                                   |
| A removed passkey is removed                                                               | `src/lib/auth.ts`, `removePasskeyKeepingAWayIn` ("The repository checks and deletes under one lock"); `CLAUDE.md` rule 3 names `passkeys.ts` as a writer outside the audit    |
| Sessions carry an expiry; the limiter prunes its own counters                              | `sessions.expiresAt`; `rateLimits`' comment ("Written and pruned by Better Auth's limiter alone")                                                                             |

#### How to ask for removal

| Claim                                                              | Source                                                                                                                                                                      |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No delete-account button, no export                                | No `deleteUser` or account-deletion service exists under `src/`; `DESIGN.md` §13 lists neither                                                                              |
| The support form takes a Privacy & Data request without an account | `src/modules/support/services/signed-out.ts`: the signed-out subjects include Privacy; `/support?support=privacy` is `supportAboutOf`'s reading (`src/lib/support-path.ts`) |
| Leaving a coven and deleting one are soft deletes                  | `src/components/LeaveWorkspaceButton/`; `CLAUDE.md`, "There are no personal workspaces" (a steward deletes); `workspace_members` and `workspaces` carry `deleted_at`        |

#### Who can see what

Each cell names the rule it comes from. The roles are those of `DESIGN.md` §5 and `CLAUDE.md`'s "Admins and curators" invariant.

| Data                             | Owner / Member / Viewer                                                                                                                                                                                | Curator                                                                                                                                 | Admin                                                                                                                               | Developer                                                              |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Name and picture                 | `member: ['read']` is held by `owner` and `member`, not `viewer` (`src/modules/coven/services/access-control.ts`); names through `src/modules/identity/services/display-names.ts`, gated to co-members | `editor-names.ts`: "a curator reads them too … an id and a name and nothing else", under `assertCurator`                                | `user-list.ts` under `assertSiteAdmin`                                                                                              | Reads the table                                                        |
| Email                            | `member: ['readEmail']` is the owner's alone (`access-control.ts`; `members.ts`, `memberEmails`)                                                                                                       | `DESIGN.md` §5, `support_requests`: "a curator is never shown a sender's email"; no curator read of `users.email` exists                | `user-list.ts`; `DESIGN.md` §5, `support_requests`: "an admin is shown both"                                                        | Reads the table                                                        |
| Covens and roles                 | A member sees the roll of their own coven only (`member: ['read']`, ANDed on `workspace_id` by the `Membership` proof, `CLAUDE.md` rule 5)                                                             | No People page (`DESIGN.md` §5, `role`)                                                                                                 | `CLAUDE.md`: "An admin may read which covens a user belongs to, by name and role only (M9.19)"                                      | Reads the table                                                        |
| Sign-in details                  | No service reads `sessions` or `accounts` for a coven role                                                                                                                                             | None                                                                                                                                    | `providersOf` in `user-list.ts` under `assertSiteAdmin`; no service reads `sessions.ipAddress` or `userAgent` for any role          | Reads the table                                                        |
| Password, passkey, authenticator | No service returns them                                                                                                                                                                                | None                                                                                                                                    | None                                                                                                                                | Sees the hash, the public key, the encrypted secret (`auth.ts` schema) |
| Ingredients and stock            | `ingredient: ['read']`, `inventory: ['read']` for all three roles (`access-control.ts`)                                                                                                                | `CLAUDE.md`: "no access to any workspace's ingredients or grimoire, except the demo coven"                                              | The same line: "except the demo coven, where every keeper holds a steward seat"                                                     | Reads the table                                                        |
| Shared spells and workings       | `spell: ['read']`, `working: ['read']` for all three (`access-control.ts`); `src/db/repository/spells.ts` reader rule                                                                                  | As above                                                                                                                                | As above                                                                                                                            | Reads the table                                                        |
| A private spell                  | `spells.ts` reader rule: "this reader's private"                                                                                                                                                       | None                                                                                                                                    | Their own in the demo coven, by the same reader rule as a steward there                                                             | Reads the table                                                        |
| Support requests                 | No coven role reads another requestor's requests; `/account/support` shows the requestor's own (`DESIGN.md` §9)                                                                                        | `DESIGN.md` §9, `/admin/support`: "A curator sees only the requests marked viewable or assigned to them"; requestor's email hidden (§5) | `src/modules/support/services/access.ts`: a keeper under `assertSiteAdmin`; `DESIGN.md` §5: "an admin is shown both"                | Reads the table                                                        |
| Who wrote or changed a row       | `display-names.ts`: "a row's last editor", gated to co-members, every seat                                                                                                                             | `editor-names.ts`: the curated lists' "last edited by"                                                                                  | `user-list.ts` hands whole rows for the privilege ledger (`editor-names.ts` header); the compendium's edit stamps as a curator does | Reads the table                                                        |

### For the owner

Things the draft is unsure of, or that are the owner's call:

1. **Cookies.** The policy says the site sets cookies only for signing in: the session cookie and the last-used-method cookie. Better Auth may also set short-lived cookies during a provider handshake (a state cookie) and a two-factor step. I did not find them named in this codebase, so the policy does not name them. If they exist, the sentence should say "and the short-lived cookies a sign-in handshake needs". Please confirm in a browser's cookie list on staging.
2. **"Sells nothing about you."** This is a commitment, not a code fact. The code has no path that could sell data; whether to promise it for the future is yours.
3. **Erasure by hand.** The policy says a keeper erases data by hand in the database on request, since no delete-account path exists. This describes a manual process the GDPR scoping task will replace. Confirm you are willing to do it, or change the sentence to "will tell you what can be done".
4. **Vercel logs.** The policy says Vercel keeps the server's logs. The code shows log lines exist (the error reference); how long Vercel keeps them is Vercel's setting, which I did not look up and the policy does not state.
5. **Provider list.** Facebook is in the roster but `hidden: true` in `src/lib/social-providers.ts`. The policy names all four. If Facebook sign-in is never offered, drop it from the two places it appears.
6. **Date.** The page shows 1 November 2026 as the day the text last changed. Bump `UPDATED_ON` in `page.tsx` on each edit you make.
7. **Legal review.** Nothing here was checked by a lawyer, and the policy says nothing about a legal basis, a controller's identity or a supervisory authority. Those belong to the GDPR scoping task.
8. **Grouped sections.** On the owner's decision (2 November 2026) the page's sections are grouped under section headings with subsections, and the page menu nests the subsections under each group. "Who Can See What" and "Who Processes It" sit under "Who Sees It", and "How Long It Is Kept" and "How to Ask for Removal" under "Keeping and Removing It"; "Who Can See What" moved up before "Who Processes It".

### Analytics

The policy makes no promise about analytics, because the owner plans to add them (2026-11-02). The owner's conditions: an ethical analytics setup, and one that never runs in the visitor's browser. The policy still says the site runs no tracking script. When analytics land, the policy names the provider in its table of services and says what each visit records.

## The disclaimer's working notes

The disclaimer at `/disclaimer` (`src/app/(public)/disclaimer/page.tsx`) says what the site's information is and is not. This file is where each claim in it points to its source, so the owner can check the text and a later change knows which sentence it makes wrong. The page itself cites only the two examples, in a Sources list at its end, in Chicago form as the compendium's references are.

The disclaimer's stance, set by the owner: honest and protective of the reader. It tells the reader what to rely on instead (a professional, a poison centre, the cited source), and it is not a liability shield written against them.

### Claims and their sources

| Claim                                                                                                      | Source                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The site is folklore and reference, not advice                                                             | `SITE_TAGLINE` in `src/lib/site.ts`: "The compendium is folklore and reference, not advice"                                                                                                                                                                                                                                           |
| The compendium records correspondences, folk names, deities, festivals and what sources say about handling | `DESIGN.md` §5: `ingredients` (elements, celestial bodies, zodiac, colours, `safetyNotes`), `ingredient_folk_names`, `ingredient_deities`, `references`                                                                                                                                                                               |
| Every claim is meant to be cited, and an unsourced entry is marked for the admin                           | `CLAUDE.md`, "What the compendium says, it sources" ("An unsourced entry still saves, and sits on the keeper's to-do list")                                                                                                                                                                                                           |
| A safety note is what a cited source said; a note covers the ingredient as a whole, a form its own         | `DESIGN.md` §5, `ingredients.safetyNotes` and `ingredient_variants.safetyNotes`; `claude-docs/components/safety-note.md`, Props ("The ingredient's own notes, shown first", a form's notes by name)                                                                                                                                   |
| The line under each ingredient's notes and each form's links here                                          | `src/components/IngredientEntry/index.tsx`: `DisclaimerNotice` after each `SafetyNote`; `claude-docs/components/document-page.md`                                                                                                                                                                                                     |
| Bergamot's peel essence flavours Earl Grey tea; its peel is sometimes candied                              | Wikipedia, "Bergamot Orange" (read 2026-11-01): "An essence extracted from the aromatic skin of this sour fruit is used to flavour Earl Grey"; "although its peel is sometimes candied"                                                                                                                                               |
| Bergamot oil on the skin plus ultraviolet light caused blistering burns within 48–72 hours, from bergapten | Kaddu, Kerl and Wolf, _JAAD_ 45, no. 3 (2001): 458–61, abstract: "localized and disseminated bullous phototoxic skin reactions", "developing within 48 to 72 hours after exposure to bergamot aromatherapy oil", "primarily bergapten (5-methoxypsoralen [5-MOP])"                                                                    |
| Bergamot oil's phototoxicity is due to bergapten                                                           | Wikipedia, "Bergamot Orange": "a concentration-dependent phototoxic effect … due to the chemical bergapten"                                                                                                                                                                                                                           |
| Chilli is enjoyed as food; capsaicin oils on skin cause pain and redness; juice in the eye, intense pain   | McDaniel-Price, "Capsaicin: When the Chili Is Too Hot", National Capital Poison Center (read 2026-11-01): "many people enjoy the spicy heat that chili peppers and cayenne peppers add to food"; "if capsaicin-containing oils get on the skin, it can lead to pain and redness with irritation"; "intense pain, tearing and redness" |
| Inhaled capsaicin can trigger an asthma attack or respiratory distress in susceptible people               | The same page: "When inhaled, capsaicin can trigger an asthma attack or respiratory distress in susceptible people."                                                                                                                                                                                                                  |
| Open the windows when preparing or cooking hot peppers                                                     | The same page's prevention tip: "Open the windows or use fresh air if preparing or cooking hot peppers."                                                                                                                                                                                                                              |
| The compendium links to the sources it cites                                                               | `DESIGN.md` §5, `references` (`url`); the entry page's bibliography (`claude-docs/components/ingredient-entry.md`)                                                                                                                                                                                                                    |
| The support form has a Compendium subject                                                                  | `DESIGN.md` §5, `support_requests.about` (`compendium`)                                                                                                                                                                                                                                                                               |

### What the draft did not claim

The task entry's own example, "something safe to eat may give off toxic smoke when burned", is kept in the page only as a general warning ("burn, inhale"). I searched for a sourced case of a named food giving off toxic smoke when burned and found none I could read and cite: the results were studies of incense smoke in general, not of a food. The two examples given instead are a food's oil on the skin (bergamot) and a food's compound in the air and on the skin (chilli), each with a source I read. If the owner knows a sourced burning example, it can be added as a third item.

### For the owner

1. **The examples.** Bergamot's peel is "sometimes candied" and its essence flavours tea, so I call it a food; the Wikipedia article also cites a source saying the fruit itself is not eaten. If "everyday food" overstates it, change "both of everyday foods" to "both of familiar ingredients".
2. **The poison-centre page carries no date**, only a copyright range, so its citation gives an access date and no publication date, as Chicago allows for an undated web page.
3. **No claim about who runs the site or how.** The No Warranty section once said the site is run by volunteers, then "today it is run by people in their spare time". The owner removed it on 2 November 2026: it will not stay true for everyone who runs the site. The section now says only that the site is offered as it is.
4. **No legal review.** A lawyer has not read this. The wording "accept no responsibility" is plain, not a jurisdiction's formula; the terms of use task is where that belongs.
5. **Date.** `UPDATED_ON` in `page.tsx` is 2 November 2026; bump it with each edit.
6. **"An Interpretation, Not an Authority".** Added at the owner's request (2 November 2026): the compendium is its admins' and curators' reading of their sources, not an authority, and spirituality is personal. That keepers and curators curate the compendium and choose its sources is `CLAUDE.md`'s domain invariants ("Admins and curators curate the compendium") and "What the compendium says, it sources"; the rest is the owner's statement of the site's stance.

7. **Grouped sections.** On the owner's decision (2 November 2026) the page's sections are grouped under section headings with subsections, and the page menu nests the subsections under each group. "Information, Not Advice", "An Interpretation, Not an Authority" and "No Warranty" sit under "What the Compendium Is"; the two safety sections sit under "Safety".

## The code of ethics' working notes

The code of ethics at `/code-of-ethics` (`src/app/(public)/code-of-ethics/page.tsx`) says what the site stands for. The task entry has the owner writing the text; the owner then asked for a full draft, and this is it, for the owner's review and rewriting. Each **commitment** in it is the site's own and needs no source. Each **fact** cites a source in the page's Sources list, in Chicago form as the compendium's references are, and this file says which sentence each source carries and where the code facts come from.

The values the owner set for it: ethics first, anti-racism, LGBTQIA+ inclusion, feminism, and democratic, community-run, non-exploitative values, stated as explicit commitments.

### Facts and their sources

| Fact in the page                                                                                                                                                                                                                              | Source                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 40,000–60,000 executions for witchcraft, about 1400–1775, roughly 80% women, in a period that held women less intelligent and more open to sin                                                                                                | Wikipedia, "Witch trials in the early modern period" (read 2026-11-01): "The scholarly consensus on the total number of executions for witchcraft ranges from 40,000 to 60,000"; prosecutions "from about 1400 to 1775"; "Roughly 80% of those convicted were women"; "it was widely believed that women were less intelligent than men and more susceptible to sin"                                                                                                                                                |
| No advertising, no data sale, no charge                                                                                                                                                                                                       | `package.json` holds no analytics, advertising or billing dependency; `DESIGN.md` §4 ("Total: $0/month", "Hobby is personal, non-commercial only"); `CLAUDE.md`, Out of scope ("subscription billing")                                                                                                                                                                                                                                                                                                              |
| Covens are run by their own members                                                                                                                                                                                                           | `CLAUDE.md`, "There are no personal workspaces"; `DESIGN.md` §8 (the steward role; "The Steward role is granted afterwards by an existing steward")                                                                                                                                                                                                                                                                                                                                                                 |
| Smudging is a ceremony of particular Indigenous peoples; particulars and plants vary; one nation's plant is another's taboo                                                                                                                   | Wikipedia, "Smudging": "ceremonies practiced by some Indigenous peoples of the Americas"; "The purposes and particulars of the ceremonies, and the substances used, can vary widely among tribes, bands, and nations"; "The same herbs that are burned by one culture may be taboo to burn in another"                                                                                                                                                                                                              |
| Until 1978 many practices were prohibited by law; the Act's findings on ceremonies                                                                                                                                                            | Wikipedia, "American Indian Religious Freedom Act": "enacted by joint resolution of the Congress in 1978"; "many aspects of Native American religions and cultures had been prohibited by law"; the findings: "intruded upon, interfered with, and in a few instances banned"                                                                                                                                                                                                                                       |
| Smudging kits sold against traditional prohibitions; protested as misappropriation                                                                                                                                                            | Wikipedia, "Smudging": kits sold "despite traditional prohibitions against the sale of spiritual medicines like white sage"; "protested against by Native activists as a form of cultural misappropriation"                                                                                                                                                                                                                                                                                                         |
| Hoodoo's origin, secrecy, resistance, and its appropriation for profit                                                                                                                                                                        | Wikipedia, "Hoodoo (spirituality)": "developed by enslaved African Americans in the Southern United States"; "from various Central and West African ethnic groups"; "practiced under an extensive cover of secrecy due to slave codes prohibiting large gatherings"; "a form of resistance against white supremacy"; "By the twentieth century, white drugstore stewards and mail-order companies owned by white Americans appropriated hoodoo culture"; "a major topic of concern for actual Hoodoo practitioners" |
| White sage: Native use on the Pacific coast; over-harvested for smudging and incense; wild population and range falling; illegal harvest on public land; 2018 arrests over 400 pounds; not on the endangered list; conservationists concerned | Wikipedia, "Salvia apiana": each clause is a sentence quoted in the fetch of 2026-11-01 ("widely used by Native American peoples on the Pacific coast"; "overharvested to sell commercially for smudging, incense sticks and cones"; "negatively affecting the wild population and distribution"; "illegal harvest is occurring on public lands"; "four people were arrested for the illegal harvest of 400 pounds"; "not listed on the Endangered Species List"; "conservationists are still concerned")           |
| Palo santo is two trees; _Bursera graveolens_ Least Concern; traditional in Bolivia, Ecuador and Peru; Peru permits fallen or dead wood only                                                                                                  | Wikipedia, "Bursera graveolens": "Not to be confused with Bulnesia sarmientoi, another tree known as palo santo"; IUCN "Least Concern"; "traditional in South America, especially in Bolivia, Ecuador and Peru"; the 2006 decree permitting "the collection of naturally fallen or dead trees"                                                                                                                                                                                                                      |
| _Bulnesia sarmientoi_ Endangered since the 2018 Red List, CITES Appendix II since 2010, Gran Chaco deforestation and demand for wood, extracts and oils                                                                                       | Wikipedia, "Bulnesia sarmientoi": "listed as endangered in the 2018 publication of the IUCN Red List"; Appendix II "since 2010"; "deforestation of Gran Chaco and a strong global demand for its wood, extracts, and essential oils"                                                                                                                                                                                                                                                                                |
| Indian sandalwood Vulnerable, over-exploited, export banned, sacred in Hinduism, burned as incense                                                                                                                                            | Wikipedia, "Santalum album": "vulnerable"; "over-exploitation, to the point where the wild population is vulnerable to extinction"; export banned "to reduce the threat by over-harvesting"; "sacred in some religions like Hinduism"; "wood for burning incense"                                                                                                                                                                                                                                                   |
| CITES: in force 1 July 1975; over 40,900 species, subspecies and populations; Appendix I and II definitions                                                                                                                                   | Wikipedia, "CITES": "entered into force on 1 July 1975"; "Over 40,900 species, subspecies and populations are protected"; Appendix I "threatened with extinction and to which the highest level of CITES protection is afforded"; Appendix II "not necessarily threatened with extinction, but trade must be controlled … to avoid utilization incompatible with their survival"                                                                                                                                    |
| The National Eagle Repository gives eagle feathers and parts to enrolled members of federally recognised tribes "for spiritual and religious use"                                                                                             | U.S. Fish & Wildlife Service, "National Eagle Repository", fetched 2 November 2026                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Every claim is meant to trace to a source; an unsourced entry saves and sits on the to-do list; formal name a unique identifier, a common name never                                                                                          | `CLAUDE.md`, "What the compendium says, it sources"                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Pages are checked against WCAG by an automated test in the browser suite that runs on every change                                                                                                                                            | `@axe-core/playwright` in `tests/e2e/axe.ts`, called by the specs; `.github/workflows/playwright.yml` runs on the PR gate; `CLAUDE.md`, Testing ("Accessibility is asserted in Playwright via `@axe-core/playwright`")                                                                                                                                                                                                                                                                                              |
| WCAG is the W3C's standard for making web content accessible to people with disabilities                                                                                                                                                      | W3C WAI, "WCAG 2 Overview" (read 2026-11-01): "WCAG documents explain how to make web content more accessible to people with disabilities"; "WCAG 2.2 is an approved International Organization for Standardization (ISO) standard"                                                                                                                                                                                                                                                                                 |
| Both themes keep to the contrast floor                                                                                                                                                                                                        | `claude-docs/styling.md`: "WCAG AA 4.5:1 is the floor for every token, in both themes"                                                                                                                                                                                                                                                                                                                                                                                                                              |
| The support link opens the form with Accessibility chosen, with or without an account                                                                                                                                                         | `src/lib/support-path.ts` (`supportAboutOf`, the `accessibility` value); `src/modules/support/services/signed-out.ts` (`SIGNED_OUT_ABOUTS` includes accessibility); `DESIGN.md` §9, `/support`                                                                                                                                                                                                                                                                                                                      |
| The closed-practice warning and ethical warnings on ingredients are planned, not built                                                                                                                                                        | The task entry (`claude-docs/tasks/m15.md`, M15.4): "It does not build the two fast-follow warnings in the backlog … the page may describe them as planned"                                                                                                                                                                                                                                                                                                                                                         |

### For the owner

1. **The whole text is a draft for you.** The task entry says you write this one. Rewrite freely; the facts and their sources are the part to keep or replace with care.
2. **"Have no place here" and removal.** The draft says bigotry has no place on the site and does not say what happens next, because no mechanism bans an account: a keeper can time out a support sender and revoke coven creation, and a coven's owner can remove a member, and that is all. If you want the page to promise removal, say what you will do and with what.
3. **Commitments not yet built.** Three sentences promise things the compendium does not do: naming a closed practice on an entry, recording IUCN and CITES status, and marking entries that need care in sourcing. Each is worded as a commitment or "planned", never as a fact. Mint tasks for them or cut them.
4. **"We fix accessibility bugs first."** A commitment about priority. Keep it only if you mean it.
5. **Sources are Wikipedia throughout** bar the W3C page, because the primary pages I tried (the IUCN Red List, CITES, Britannica) refused the fetch. Wikipedia is valid under your sourcing rule; where you want a primary citation, the IUCN assessment for each species and the CITES Appendices are the pages to add, with their own dates.
6. **Witch-trial figures.** "Roughly four in five" renders the article's "roughly 80%" and its "75% to 85%"; the article's numbers are for Europe and its colonies in the early modern period, and the page says so.
7. **Hoodoo and "closed".** The Hoodoo article documents appropriation by white businesses and practitioners' concern about it; it does not say in so many words that Hoodoo is a closed practice. The page lists it under closed practices on the strength of its initiatory and community character as the article describes it. If you would rather not make that call, move the paragraph under "where lore comes from" alone.
8. **Date.** `UPDATED_ON` in `page.tsx` is 2 November 2026; bump it with each edit.
9. **The accessibility link, signed out.** `/support?support=accessibility` preselects Accessibility only for a signed-in account: the signed-out support page (`src/app/(public)/support/page.tsx`) builds its state as `{ kind: 'signed-out' }` and does not read the `support` parameter, so a visitor with no account lands on the short form with no subject chosen. The spec proves the signed-in case, which is what the criterion describes. If you want the signed-out form to take the subject too, that is a small change to the support page, and a task of its own.
10. **The four tiers are drafts for your review, every rule of them.** On your decision (2 November 2026) the page now opens with "What Everyone Agrees To", the minimal section the Terms of Use bind every account to, and ends with "For Curators", "For Admins" and "For the Owner and Everyone Who Runs the Site", each adding to the tiers before it and binding whoever holds that role. One page rather than four, so a curator reads the rules everyone keeps before their own. Each staff tier was drawn from what the role can do, not from anything I invented: curators from `CLAUDE.md` "Domain invariants" ("Admins and curators curate the compendium … and review support requests"; "A site keeper or curator has no access to any workspace's ingredients or grimoire") and `SITE_ROLE_ACCESS.curator` (`src/components/UserList/roles.ts`); keepers from `SITE_ROLE_ACCESS.admin`, `CLAUDE.md` ("An admin may read which covens a user belongs to, by name and role only"; "every admin holds a steward seat" in the demo coven; the invitation card is minted by a keeper), `DESIGN.md` §5 `support_timeouts` ("An admin's sanction on a sender … a curator may not set or lift one"), `support_requests` (a curator "is never shown a sender's email … a keeper is shown both") and `user_privilege_changes` (every role change recorded with its actor and note); the owner from `DESIGN.md` §5 "The primary keeper … cannot be revoked or deleted by anyone" and §2's hosting table (Vercel, Neon, Resend). The rules themselves are what I think each role owes, and are yours to rewrite. Two owner-tier sentences are promises about the future, not code facts, each kept on the owner's answer (2 November 2026): the notice before advertising, data sales or training could change now says plainly that it comes by email to every account, and the way for people to take their writing with them is worded as a commitment to a feature that is not built yet (no export exists; the privacy policy says so). M15.61 scopes that export feature.
11. **"What Everyone Agrees To" is the one section the terms bind.** The Terms of Use say the Disclaimer and this page are part of the terms, and name this section as what every account agrees to; the staff sections bind by role. If you want the whole page to bind everyone, the terms' sentence in "How to Treat Each Other" changes.
12. **Closed practices are advice, not a rule.** On your decision (2 November 2026), "Do not claim a closed practice as your own, and do not share what belongs to a people you are not part of" left "What Everyone Agrees To". The site will not enforce it, so it now sits in "Closed Practices and Where Lore Comes From" as advice that says it is not a rule of anyone's account, and the Terms of Use's summary of the binding section no longer names it.
13. **Sourcing and honesty are advice too.** On your decision (2 November 2026), "Take only what can be spared: no endangered plants, no parts of protected animals" and "Be honest about what you know and where you learned it, and say when you are unsure" left "What Everyone Agrees To". The site cannot enforce either, and the sourcing rule has exceptions for Indigenous peoples. Each now sits as advice in its own section ("Ethical and Sustainable Sourcing", "Why the Compendium Cites Its Sources"), saying it is not a rule of anyone's account. The section that binds every account now holds the respect rule and the Disclaimer, and the Terms of Use's summary names only the respect rule.

14. **The Indigenous exception is named.** On your decision (2 November 2026) the animal-parts line stays, and now says the law can make exceptions for Indigenous peoples’ religious and cultural use, with one cited example: the United States’ National Eagle Repository. The rule applies outside such an exception. The page says "can" and gives one country because one source supports one example; other countries’ exceptions are not checked.

15. **The Short Version no longer promises what is not built.** On your decision (2 November 2026), "and does not hand out what is not ours to give" became "A warning on ingredients from closed practices is planned." No ingredient is marked as a closed practice yet: M14.29 gathered the statements into `compendium/ethics/`, which the seed does not read, and the warning is the backlog's "Closed practice warning".

16. **The closed-practices section says what is built today.** On your decision (2 November 2026) the list after the section's advice now opens "Here is what the site does today, and what it commits to". The compendium names its sources, and no entry yet says whether its lore comes from a closed practice. The promise that an entry from a closed practice "will say so, name the people it belongs to, and not describe the ceremony" is gone until the warning is built; `claude-docs/backlog.md`, "V Fast Follow", says to restore it then.

17. **The Short Version names the Indigenous exception.** On your decision (2 November 2026) the sourcing line adds "The law can make exceptions for Indigenous peoples' religious and cultural use", marked to source 11 as the section body is.

18. **The compendium names sources, not traditions.** On your decision (2 November 2026) both closed-practices lines say the compendium names a source for an ingredient's lore but does not yet record which tradition it comes from. Each seed reference names the fields it supports (`categories`, `deities`, `elements` and others), and the entry page lists them (`src/components/IngredientEntry/references.tsx`); no field records a tradition for the lore.

19. **The site will charge.** On your decision (2 November 2026), "charges nothing" in "Community over profit" became "It will charge, fairly: enough to cover its costs and to pay the people who work on it a fair, living wage." Subscription billing is scoped by M17.1.

20. **The advice lines carry no disclaimer.** On your decision (2 November 2026) "This is advice, not a rule of your account, and the site does not enforce it." is gone from all three places it stood: closed practices, sourcing, and citing. The opening paragraph still says only "What Everyone Agrees To" and the role sections bind.

21. **White sage: the ceremony is closed, and many ask that the plant not be used.** On your decision (2 November 2026) the white sage item adds "Smudging with it is one of the closed ceremonies described above, and many Native Americans have asked non-Native people not to use it at all", marked to sources 1 and 2, and its advice opens "If you use it" and asks for an ethical grower. Source: Wikipedia, "Salvia apiana", that many Native Americans have asked non-Natives to refrain from using it because of its sacredness to certain tribes; Wikipedia, "Smudging", for the ceremony. Whether the plant itself is a closed practice is open in `compendium/ethics/botanical/white-sage-salvia-apiana.yaml` and is M17.2's to decide.

22. **The demo coven duty fits who writes there.** On your decision (2 November 2026) the For Keepers item now says everyone who signs in can see what a keeper writes in the demo coven, so it stays suitable for them. The old line treated the demo coven as written by its members, but every keeper holds a steward's seat there and everyone else who signs in an observer's (`src/modules/identity/services/user-role.ts`; `CLAUDE.md`, "The site is invite-gated").

23. **A section for developers.** On your decision (2 November 2026) "For Developers" sits before the owner's section, and the opening paragraph and the Terms name developers among the roles the sections bind. Its sources: checking access before fetching, filtering in the database and testing by direct access are `CLAUDE.md` rules 1, 5 and 7 and its Testing section; the record of every change is rule 3 (`withAudit`); the public code and board are `CLAUDE.md`, "GitHub task tracking". The analytics item follows this policy's notes (the section "Analytics"): analytics are planned, run on the server and never in the visitor's browser. Updating the Privacy Policy with a change, and reporting a security problem at once, are new commitments, not code facts.

24. **Grouped sections.** On the owner's decision (2 November 2026) the page's sections are grouped under section headings with subsections, and the page menu nests the subsections under each group. "For Everyone", "The Compendium" and "Running the Site" group the sections; Accessibility moved up into "For Everyone", the role sections lost their "For" ("Curators", "Admins", "Developers", "The Owner and Everyone Who Runs the Site"), and the Sources numbers now run in order of first appearance in the text.

## Daily jobs start from Vercel Cron, and no job sleeps waiting

### Decision

Work that must happen once a day runs as a job that a Vercel Cron Job starts. The cron entry in `vercel.json` calls one route on the site once a day. The route checks the secret Vercel sends, starts the job and returns. The job does the day's work and ends: it never sleeps, holds no hook token and starts no successor. The owner approved Vercel Cron and set the rule on 2026-11-02: **a job runs only while it has something to process, and never sleeps for days or months waiting.**

There are two such jobs. The support-retention job closes and anonymises support requests (claude-docs/design-decisions/support.md, "A resolved request closes on its own, and a closed one is anonymised"), from `/api/cron/support-retention` at 03:00 UTC. The provisional cleanup deletes the lapsed unverified accounts that the per-sign-up expiry run missed (M15.68; claude-docs/design-decisions/support.md, "Second job: the daily cleanup"), from `/api/cron/provisional-cleanup` at 04:00 UTC.

### Shape

- **The schedule.** `vercel.json` holds one `crons` entry per job, each with its own path. The site is on Vercel Hobby (`DESIGN.md` §4), which runs a cron job at most once a day and fires it within the hour its schedule names; a more frequent schedule fails the deploy. Vercel runs cron jobs on Production deployments only, so staging and the hotfix previews, which deploy as Preview, run none.
- **The route.** `src/app/api/cron/<job>/route.ts`, a `GET` handler. It answers 401 unless the request carries `Authorization: Bearer` followed by the `CRON_SECRET` environment variable, which is how Vercel Cron signs its calls; while `CRON_SECRET` is unset, every call is refused. The check is `cronAuthorised` (`src/lib/cron-request.ts`), which compares digests so the time it takes says nothing of the secret. On success the route calls one service that starts the job, and answers 204 with no body. It takes no session and reads and returns no application data. The support-retention job writes as the seeded System account; the cleanup's delete is the documented hard delete outside `withAudit`.
- **The job.** A coordinator workflow reads the ids due for each stage a page at a time, in id order after the last id of the page before, and starts one batch run for each page. The run arguments are ids, a kind, a number and the site origin, so `assertRunArguments` passes them. Each batch's writes read the row's state again, so a re-run, an overlap of two runs or a retried batch does no harm. The page size is one named constant per job.
- **The guard.** `lint/sorrel-lint.js`'s `route-allowlist` names each cron route. `tests/guards/daily-job-starts.test.ts` pins each job's start to its cron route, so no page visit, sign-up or send starts one.

### Why it is an exception to rule 1

Rule 1 allows no bespoke route handlers, so that no third path reaches application data. A cron route carries no application data in or out: it reads one header, starts a job and answers with a status alone. The job it starts goes through services like any other job (M15.49). The route is listed in CLAUDE.md rule 1 beside the other sessionless routes.

### Alternatives turned down

- **A self-restarting chain** that does the day's work, sleeps a day and starts its successor (the provisional cleanup's design until M15.68, M15.49). It keeps one run always pending, pinned to the deployment that started it, and needs start points on pages and sign-ups to restart a lost chain. The owner turned it down (2026-11-02).
- **One run per row** that sleeps until the row is due, for days or months. The same objection, many times over.
- **A start on a keeper's page visit.** It runs only when a keeper visits.

### Setting it up

`CRON_SECRET` is set in the Vercel project's Production environment, as a random string of at least 16 characters, marked Sensitive (claude-docs/secrets.md). Vercel sends it on every cron call. Nothing else reads it.

## A resolved request closes on its own, and a closed one is anonymised

### Decision

A support request that staff or its sender resolve closes on its own seven days later, after a closing-soon notice on day 5, and every closed request is anonymised twelve calendar months after the close. One daily job does all three, started once a day by Vercel Cron (claude-docs/design-decisions/support.md, "Daily jobs start from Vercel Cron, and no job sleeps waiting"). Nothing starts a run per request. Readers do not wait for the job: a `resolved` row whose seven days have passed reads as `closed`, closed on its seventh day.

### Shape

- **Files.** `src/app/api/cron/support-retention/route.ts` is the route Vercel Cron calls. It calls `startSupportRetention` (`src/modules/support/services/retention-start.ts`), which starts the coordinator, `src/modules/support/jobs/support-retention.ts`. The coordinator's step (`support-retention-steps.ts`) reads the ids due, and it starts one batch run (`support-retention-batch.ts`, its steps in `support-retention-batch-steps.ts`) for each page of them. Both steps call `src/modules/support/services/retention.ts`. The page size, `RETENTION_PAGE_SIZE` (500), and the order of the stages live in `jobs/support-retention-pages.ts`, a file with no database code, so the workflow bundle can read them.
- **Nothing else starts a run.** `resolveSupportRequest` (staff), `resolveMySupportRequest` (the sender) and `closeSupportRequest` only save the move. `resolveMySupportRequest` takes no notifier. The admin Support page starts nothing. `tests/guards/daily-job-starts.test.ts` pins the cron route as the only caller.
- **The coordinator.** It is given the time it started, in milliseconds, and the origin. For each stage in turn (notice, close, anonymise) it reads the ids due a page at a time, in id order after the last id of the page before, and starts a batch run for each page. It never sleeps, holds no hook token and starts no successor: it ends when the last page is read. Reading by id keeps the pages stable while batches change rows.
- **A batch.** It is given its stage, its ids, the coordinator's time and the origin: ids, a kind, a number and the site origin, so `assertRunArguments` passes it. Every batch of one day computes the same cutoffs from that time. Each write reads the status and dates again, so a batch run twice, two batches over the same ids, or a request reopened since its page was read, changes nothing. A batch that fails every retry is logged; its requests stay due, and the next day's run takes them.
- **The notice.** The batch sends each notice in its page, and only while the request is still `resolved`, with `closing_notice_sent_at` null and its seven days not yet over. It builds the mail then, from the row: the address a signed-out sender gave or the account's current address, the subject as it stands, and the time left until `resolved_at` plus 7 days, rounded to hours under a day and to days above it. It stamps the marker only when the transport accepted the mail. When the transport refused any notice of the page, the step throws once it has tried them all, so the SDK retries it (three retries), and the retry sends only the unstamped ones. A notice that misses day 5 is tried again on day 6. A reopen clears the marker.
- **The close.** `closed_at` is set to `resolved_at` plus 7 days, never to the moment the job ran. A late run therefore gives the same date the readers already showed.
- **What anonymising empties.** The subject becomes the fixed `Anonymised support request.` (`ANONYMISED_SUBJECT`, `src/lib/support-sender.ts`), so the row still has a link that opens it. Message and path become empty strings, and `sender_email` becomes null. `created_by` passes to the System account, and `resolved_by` too when the sender resolved it. Every reply's body is emptied, and a sender-authored reply's `created_by` passes to the System account. **What it keeps:** topic, status, error code, the dates, staff ids and the issue link, so the counts per topic and per month do not change. **What staff see.** The admin Support page decides on the server that a request created by the System account is anonymised: it loads no name for the System account and sends `anonymised: true` with a null sender, and the GraphQL `sender` and reply `author` fields return null for it. The list leaves the Sender cell empty (as a narrow card the cell is dropped, label and all) and names the subject link by the subject alone; the opened request has no From fact, and its thread drops the sender's emptied message and follow-ups. Nothing on an anonymised request can be changed: `refuseAnonymised` (`services/staff.ts`), checked on the row as read before the write, refuses a note, a reply, an assignee, curator visibility and an issue link. The dialog shows it to a keeper as it shows a curator: the issue link read-only when there is one, and no Assignee, Shared With Curators or Time-Out settings. In every view and filter of the staff list, anonymised requests come after every other, each group in the view's own order: "is anonymised" (`created_by` is the System account) is the first key of `orderOf` in `src/db/repository/support.ts`, a key of the cursor helper's, so a page that crosses from one group to the other and the page count stay exact. A `created_by` equal to the System account marks a row as done, because no request is otherwise created by it. The audit writer strips `created_by` from an update, so this one statement is written on the transaction directly. One statement changes both the address and `created_by`, so the one-sender CHECK never sees an address without the signed-out sender.
- **The origin.** The cron route reads it from its own request, as Better Auth resolves the host against its allowed hosts (`requestOrigin`), so a forged Host gets Better Auth's fallback, the production site. Vercel Cron runs only on Production deployments, so staging and the hotfix previews, which deploy as Preview, run no retention job: their lapsed requests still read as closed, but nothing anonymises them and no closing-soon notice is sent there.
- **Readers.** In the repository, `asOfNow` maps a lapsed resolved row to `closed`. The status filters and the view arms treat it as closed too, and `moveSupportRequest` refuses to move it. So a sender's message on it opens a linked follow-up, and staff can no longer resolve, close or set waiting on it.
- **The migration.** 0123 adds a nullable `closing_notice_sent_at timestamp`, without a time zone like the table's other timestamps, expand-only.

### Why the step renders the notice itself

The step bundler that the workflow SDK uses (its esbuild step, `jsx: 'preserve'`, with no way to override it) leaves JSX uncompiled, and the Vitest workflow builder then loads that bundle in Node with nothing compiling it. A step that reached a `.tsx` template failed with `SyntaxError: Unexpected token '<'`. A first version of this task worked round that by rendering the notice in the starting service and passing the rendered mail as the run argument. That put the sender’s address and the request subject in the workflow event log, and the owner turned it down (2026-11-02).

**What was done instead:** every template and the shared layout are plain TypeScript (`src/emails/*.ts`), built with `createElement`. A test in `tests/emails/parts/layout.test.tsx` fails on any `.tsx` under `src/emails` other than a story.

**Alternatives turned down:**

- **A JSX transform in the step bundle**, by a custom builder or an esbuild plugin. The SDK exposes no hook for it, so it would mean patching the package.
- **Precompiling the templates to `.js`** in a build step. That adds a generated file and a build step to keep in sync with the source, for a gain plain TypeScript gives without either.
- **Rendering in a route the step calls over HTTP.** A third access path, which CLAUDE.md rule 1 forbids.

The cost is that the templates read less like markup than JSX did. They are short, and the stories still render them for the eye check.

**The origin as a run argument.** The site has more than one origin (production, staging and each hotfix preview) and no setting that names the current one, so a step cannot work out the link on its own. The origin is neither personal data nor a secret, so it stays in the run argument. Storing it on the row instead was the alternative; the owner chose (2026-11-02) to keep it in the run argument.

### Why a daily job (owner's call, 2026-11-02)

A first version gave each resolved or closed request its own run, which slept until day 5, day 7 and the twelfth month after the close, and a keeper's visit to `/admin/support` started a sweep for whatever a lost run left. The owner turned both down (2026-11-02): **a job runs only while it has something to process, and never sleeps for days or months waiting.** A twelve-month sleep is also pinned to the deployment that started it. A second version ran one self-restarting daily chain that slept a day between runs, and the owner turned that down too, approving Vercel Cron instead (2026-11-02).

The work needs nothing finer than a day: a lapsed resolved request already reads as closed, the notice has two days to go out, and the anonymising has a twelve-month window. A daily cron run is enough, and costs one short run a day whatever the traffic.

### Things not done

- Nothing runs more often than daily. Vercel Hobby runs a cron job at most once a day, within the hour its schedule names, so a request lapses up to a day before the job closes it; readers already show it closed.
- A notice that fails every retry on both day 5 and day 6 is not sent. The request still closes on day 7.

### The reply's "sent" marker (owner's call, 2026-11-02)

A staff reply's mail is sent by its own job, `supportReplyNotice(replyId, origin)` (`src/modules/support/jobs/support-reply-notice.ts`), started by `replyToSupportRequest` once the reply is saved. Its step (`services/reply-notice.ts`) reads the reply, the request and the sender's address when it runs, builds the notice for a signed-in sender or the reply in full for a signed-out one, and stamps `support_replies.notice_sent_at` as the System account only once the transport took it. Migration 0124 adds the column, a nullable `timestamp` without a time zone, expand-only. A reply already stamped, an internal note, a sender's own message and a request already anonymised send nothing. When the run cannot be started, the service tries the step once itself, as `send` does for a failed start. The notifier lost its `replyWaiting` and `signedOutReply`, which nothing calls any more.

The run carries the reply id and the origin and nothing else, for the reason the closing-soon notice does: the run's arguments are kept in the job's event log, and a signed-out sender's mail holds the reply text.

### The signed-out send counts hold no address (owner's call, 2026-11-02)

`support_send_counts.key` is an HMAC-SHA256 (a keyed hash) of the address, never the address. `src/lib/send-count-key.ts` builds it: `addressCountKey` hashes the email after `normaliseEmail`, so the limit still counts a change of case or spacing as the same address, and `clientCountKey` hashes the trimmed, lower-cased client address. The client address is hashed as well, though the owner's call named only the email: an IP address is personal data too, and the counter needs only to tell one apart from another.

The key is `BETTER_AUTH_SECRET`, with a fixed development fallback outside production, so no new variable exists. A rotation of that secret starts every count afresh, which loosens the limit for at most one 24-hour window. A plain hash without a key was set aside: an email address is guessable, so an unkeyed hash of one can be reversed by hashing candidates.

Migration 0125 deletes every row, since the rows written before it hold addresses. A count lives 24 hours, so the loss is at most one window's limit. `check:destructive-ddl` does not flag a `DELETE`, so the migration has no sidecar. `tests/modules/support/services/support-signed-out.test.ts` proves no row holds either address, and `tests/db/migrations/0125-support-send-counts-drop-address-keys.test.ts` that the migration leaves none.

### Secret links through a job (owner's call, 2026-11-02)

The owner chose that the six secret-link mails go through a retried job, with a run that holds ids alone and a step that gets the token when it runs, by minting one, re-signing one or reading one Better Auth stored. Three are built; three are not.

**Built.** `secretLinkMail(link)` (`src/modules/identity/jobs/secret-link-mail.ts`) takes a `SecretLink`: the kind, the account id, the request's `/api/auth` base, and for a verification where the account was going, for a lockout its length in minutes. Its step (`services/secret-link-mail.ts`) reads the account's address when it sends.

- **The sign-up and resend verification link** is re-signed in the step with `createEmailVerificationToken`, under `verificationSigningSecret()` (`src/lib/auth-secrets.ts`), which picks the secret as Better Auth picks `ctx.secret`. The link is good for the full lifetime from the moment it is sent. A row verified meanwhile gets nothing.
- **The password reset link** carries the newest unexpired `reset-password:` token Better Auth stored in `verifications` for the account (`findNewestResetToken`). Better Auth already stores that token unhashed, which is why it lasts 15 minutes; nothing new is stored.
- **The lockout mail** still mints its reset token in the hook, as Better Auth's own reset does, and its step reads it back the same way.

`scheduleSecretLinkMail` (`services/secret-link-start.ts`) starts the run. While `MAIL_TRANSPORT` is unset, or when the run cannot be started, it builds the mail in the request and tries it once through `send`.

Tests: `tests/workflows/secret-link-mail.test.ts` (a verification mail refused twice is retried and goes to the address the row holds when the step runs, signed with a token Better Auth's secret verifies; the newest live reset token; the lockout link; every attempt failing logs without the token and returns false; nothing to send). `tests/db/secret-link-start.test.ts` (sign-up, reset and lockout start the run with ids alone, and no address or stored token is in it; a failed start tries the mail once). `tests/db/email-verification.test.ts` holds the signing secret to Better Auth's, and its link-following cases follow a re-signed link. `tests/lib/auth-secrets.test.ts` covers the secret's choice.

**Built afterwards (owner's calls, 2026-11-02).**

- **The change-of-address link.** The address asked for is held in `users.pending_email` (migration and behaviour in [`auth/admin-bootstrap.md`](../auth/admin-bootstrap.md), "The email page"), so the step reads it and signs the change link when it sends. Only the newest change's link is honoured, and the job clears the column once its link has lapsed. Putting the address in the run was turned down because it is personal data in the event log; leaving the mail tried once was turned down because it loses a refused mail.
- **The admin and coven invitations.** The step gives the invitation a fresh token through `rotateInvitationToken`, a named exception to rule 5 ([`auth.md`, "The invitation mail mints its token in the job step"](auth.md#the-invitation-mail-mints-its-token-in-the-job-step)).
- **Every run holds ids alone.** `startJob` refuses a run argument that is not an id, a kind, a site origin, a return path, a number, a boolean or null (`src/lib/jobs/run-arguments.ts`), so an address, subject, body or token cannot enter an event log (see "Mail is sent through a retried job").
- **The notice to the address a completed change left.** The swap holds that address in `users.former_email`, and the account-notice job's step mails it and clears it ((see "Mail is sent through a retried job"), "The notice to the address a change left").

## A signed-out sender reaches their request by a mailed link

Plan: the section "A signed-out sender keeps a provisional session (plan)". This file records what was decided and what was left.

### Decision

A visitor who sends a support request while signed out gets no account and no session. The request is written as the seeded stand-in account (`SIGNED_OUT_SENDER_ID`) with the address they gave in `support_requests.sender_email`, as before this task. Every mail about the request carries a link, and the link is how the sender reads it and replies.

An earlier version of this task gave the sender an anonymous account through Better Auth's `anonymous` plugin. The owner dropped it on 2026-11-06. The visitor never chose to sign in, so on a shared or public computer the next person could read and reply to their requests through the cookie. The mailed link already gives the sender their requests, and only to whoever holds the mail. The plugin stays out of v1, as `design-decisions/auth.md`, "Better Auth's plugin roster: what lands before launch, what waits" and MB.80 decided; try-before-sign-up stays in v2.

- A signed-out send sets no cookie and creates no account. `/` and `/compendium` set none either.
- The sign-up hook, `requireSession()`, the proxy and the GraphQL context are unchanged: nothing treats any session as provisional.
- There is no `users.is_anonymous` column, no anonymous expiry and no linking step.

### The mailed link and the signed-out reply

Each mail about a request carries a view link holding a fresh token (32 random bytes, base64url; only its SHA-256 is stored in `support_requests.view_token_hash`; only the newest mailed link works). The link is `/support/request#<token>`: the token sits in the URL fragment, which a browser never sends to the server or in a Referer header. The client page reads `location.hash`, clears it with `history.replaceState`, and keeps it in that tab's sessionStorage (`support-view-token`) so a reload in the same tab reopens the request and a new tab needs the mail link (a not-found answer removes it, and blocked storage falls back to not-found on reload), and asks the open query `supportRequestByViewToken(token)` for the request. The old path form `/support/request/[token]` is gone and answers 404. The page is served `Cache-Control: no-store` and `Referrer-Policy: no-referrer`. A token lapses 30 days after it is mailed (`support_requests.view_token_expires_at`, one fresh migration). The query is rate limited per client (`SIGNED_OUT_VIEW_LIMIT`, counted under a `view|` key) and answers a closed request with not-found. The page shows the request, and `replyToSupportRequestByViewToken` adds a reply as the stand-in account. Neither is the mailed sign-in link that DESIGN.md §13 defers: the link opens no session and no other data, and the page sets security headers that stop the token leaking through a referrer.

A reply is accepted only while the request is open. A wrong or old token, a closed or anonymised request, and a request a real account has claimed all get the same not-found. The honeypot, the per-client and per-address limits and a cap per request in 24 hours apply.

### Claim by verified email

When an account gains a session with a verified email, or verifies its email, every request whose `sender_email` matches that address (lower-cased) and whose `created_by` is the stand-in account moves to it, with its replies. `sender_email` and `view_token_hash` are cleared in the same write, so an old link never writes as a real account and mail goes to the account's own address. An unverified account claims nothing, and a request owned by another real account never moves.

### Time-outs bind the address

`support_timeouts.address_key` (nullable text, with a partial index `WHERE lifted_at IS NULL`) holds the HMAC key of the address the sender wrote from, from `addressCountKey` in `src/lib/send-count-key.ts`, keyed by `BETTER_AUTH_SECRET` like `support_send_counts`. It is never the address, so the table gives away no address to anyone holding it.

`support_timeouts.user_id` is nullable, and a CHECK requires `user_id` or `address_key`. A keeper's time-out on a signed-out request records the address key alone, since the stand-in account is shared and a time-out on it would bind every signed-out sender. A time-out on a signed-in sender records the account. A time-out standing on a key (not lifted, and no end date or one still ahead) is checked in three places, each reading it from the repository in SQL:

1. The signed-out send, before the limits are counted.
2. The reply through the mailed link, against the request's `sender_email`.
3. The claim by email: it moves the standing time-outs that bind the claimed address to the claiming account, setting `user_id`.

Each refusal uses the signed-in wording. The migration adds columns and relaxes a NOT NULL, so it needs no acknowledgement sidecar.

Send count key: keyed by BETTER_AUTH_SECRET, the one server secret every deploy already sets; a plain hash would let anyone holding the table test a guessed address against it; a new secret starts every count afresh, which costs at most one window of the limit.

### Keeper lift and the form warning

A keeper sees the standing time-outs on a signed-out request's address (read by address key through `timeoutsForAddresses`, keeper only) and can lift them. The Message note on both support forms warns the sender not to include passwords, payment details or other private information.

### Left for a later drop task

`support_requests.sender_email` and the seeded signed-out sender account stay, since the design uses them. Existing time-outs keep their `user_id`.

## A signed-out sender keeps a provisional session (plan)

Approved by the owner on 2026-11-06. The decision record is the section "A signed-out sender reaches their request by a mailed link" (the anonymous design below was dropped, see the last section); this file is the build plan it was made from.

### Owner decisions (2026-11-06)

1. **Migrations ride in this PR.** Add `users.is_anonymous` (Drizzle property `isAnonymous`, Better Auth's field name, `boolean NOT NULL DEFAULT false`). Replace the `support_requests_one_sender` CHECK in its own migration, with a `<tag>.ack.md` sidecar, since dropping a constraint is destructive DDL. No column drop: `sender_email` and the seeded signed-out sender account (`SIGNED_OUT_SENDER_ID`) stay, because existing rows still use them. Their removal is a later drop task.
2. **The signed-out form still asks for an email.** It is stored in `support_requests.sender_email` on the anonymous account's request, and the receipt, closing notice and staff reply are still mailed there, as well as shown at `/account/support`. The address-keyed send limit stays. The new CHECK reads: an address is set only when the sender is anonymous or the seeded signed-out sender.
3. **Expiry rule.** The daily provisional cleanup deletes an anonymous account that never linked once none of its requests is still live, meaning every request it sent is anonymised (12 months after closing), or 7 days after creation if it holds no request at all. Its sessions go with it.
4. **The proxy stays cookie-only.** It cannot tell an anonymous cookie apart without a database read. `requireSession()` refuses an anonymous session on every page except `/account/support`, and a new guard test walks every `(shell)` page to prove each one calls a guard. The decision record corrects the task's wording.

### Mechanism

- **Mint inside the one open mutation.** `sendSignedOutSupportRequest` keeps the honeypot, topic and rate checks, then calls `auth.api.signInAnonymous({ headers, returnHeaders: true })` and writes the request through `withAudit` as the new anonymous account. The Set-Cookie headers are forwarded on the GraphQL response by a small Yoga plugin or a response-header holder on the context (nothing sets headers today). Rule 1 holds: no new route. `/api/auth/sign-in/anonymous` is mounted by the existing handler anyway, so it gets a `rateLimit.customRules` entry in `src/lib/auth.ts`.
- **Plugin:** `anonymous({ onLinkAccount, emailDomainName?, generateName? })` in `src/lib/auth.ts`. Its default deletion of the anonymous user after linking stays on.
- **Sign-up hook** (`databaseHooks.user.create.after`): return early for `user.isAnonymous`, so no demo-coven seat and no provisional-expiry schedule. `canCreateWorkspace` stays at its default, false.
- **Linking:** `onLinkAccount` runs `withAudit({ userId: newUser.user.id }, …)` with a new repository writer in `src/db/repository/support.ts` that moves `support_requests.created_by`, `support_replies.created_by` and the sender's own `updated_by` stamps from the anonymous id to the real one, so the plugin's hard delete is not refused by a foreign key. A test proves nothing references the anonymous id afterwards.
- **Session:** `SessionState.anonymous` / `Session.anonymous?: true`, a distinct mark, not `emailUnverified`. It is treated like the access pause (`src/lib/access-paused.ts`, `src/graphql/paused-operations.ts`): `actingSession` returns null, `getSession()` returns it only on `/support` and `/account/support`, `requireSession()` redirects it to sign-in elsewhere and skips the email and terms redirects on `/account/support`, `createContext` gives it only to support operations, `viewerFor` gets an anonymous branch with no covens. Support's `requireVerified` and own-request readers accept the mark.
- **Pages:** `/support` shows an anonymous session the signed-in form (not the email-page redirect). After a send the form links to `/account/support`. `/` and `/compendium` set no cookie for a visitor who sends nothing.
- **Exclusions:** `isStandInAccount`, the People list (`src/db/repository/users.ts`) and the keepers' support reads exclude or label anonymous accounts.
- **Known limit:** the plugin's link matcher does not cover `/two-factor/verify-*`, so a two-factor sign-in from an anonymous session is not linked; the anonymous account then expires under rule 3. Recorded in the decision file.

### Acceptance tests

| Criterion                                                                                                           | Test                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Signed-out send mints an anonymous account, sets its cookie, writes through `withAudit`                             | `tests/modules/support/services/support-signed-out.test.ts` and a Yoga-level test asserting Set-Cookie                                                                                                                                                                                                                                                                                |
| No demo-coven seat, `canCreateWorkspace` false                                                                      | `tests/lib/auth.test.ts`, "sign-up hook seat"                                                                                                                                                                                                                                                                                                                                         |
| Refused by `requireSession()` on every protected page but `/account/support`; that page shows only its own requests | `tests/lib/request-session.test.ts`, new `tests/guards/` shell-page guard test, own-request service test                                                                                                                                                                                                                                                                              |
| Sign-in from an anonymous session links and the requests follow                                                     | new `tests/db/anonymous-link.test.ts`                                                                                                                                                                                                                                                                                                                                                 |
| `/` and `/compendium` set no cookie                                                                                 | new e2e spec                                                                                                                                                                                                                                                                                                                                                                          |
| Lapsed anonymous account removed with its sessions                                                                  | `tests/modules/identity/services/provisional-cleanup.test.ts`                                                                                                                                                                                                                                                                                                                         |
| Docs corrected                                                                                                      | review: `DESIGN.md` lines on the anonymous plugin, `design-decisions/auth.md`, "Better Auth's plugin roster: what lands before launch, what waits", `claude-docs/auth/plugins.md`, the section "The support feature, revised after review" M15.39/M15.40, CLAUDE.md rule 3 and the `/support` invariant, new the section "A signed-out sender reaches their request by a mailed link" |

### Added 2026-11-06: two ways back after the cookie is gone

The owner asked how a visitor whose anonymous session has expired or been cleared gets back to their requests, and chose to build both answers below in M15.48 itself.

#### Claim by verified email

- When an account that is not anonymous gains a session while its email is verified, or verifies its email, every `support_requests` row whose `sender_email` matches that verified address (compared lower-cased) and whose `created_by` is an anonymous account or `SIGNED_OUT_SENDER_ID` moves to that account. The sender's `support_replies` move with it, and `sender_email` is cleared so the CHECK holds and mail goes to the account's own address.
- It runs through `withAudit` as the claiming account, from a Better Auth hook in `src/lib/auth.ts`, through a repository writer in `src/db/repository/support.ts`.
- An unverified account claims nothing, and an address match never moves a request already owned by another real account.
- An anonymous account left with no request is then collected by the expiry rule above.

#### A link in each mail that opens the request

- Every mail about a signed-out request (receipt, staff reply, closing notice) carries a link to a sessionless, read-only page showing that one request and its replies.
- The token follows the invitation rules: `crypto.randomBytes()`, only its SHA-256 hash stored, on a new nullable `support_requests` column, minted afresh by the mail job's step on every send, so only the newest mailed link works. It is never returned in any response.
- The page is a server component calling a support service with the token, no session, `noindex`, never cached (rule 6). It shows nothing once the request is anonymised. It offers Sign In as the way to reply on the site; it has no write of its own, so no third open mutation is added.
- Amended: a reload in the same tab reopens the request from sessionStorage; a new tab needs the mail link.
- Amended: the link is `/support/request#<token>`, a client page that reads the fragment and calls an open, rate-limited query; the token lapses after 30 days; the page is `no-store`. See the section "A signed-out sender reaches their request by a mailed link".
- A wrong, old or used-up token is a 404, the same as a request that does not exist.
- Docs: this is a second sessionless read of application data beside the public compendium, so CLAUDE.md's public-surface invariant and the invitation-token paragraph name it, and the decision record says why.

#### Added acceptance tests

| Criterion                                                                                                                           | Test                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| A verified sign-in claims requests sent from its address; an unverified one claims none; another real account's request never moves | new `tests/db/support-claim-by-email.test.ts`              |
| The mailed link shows only its request; an older link, a wrong token and an anonymised request are 404; only the hash is stored     | support service test, mail job test, e2e spec for the page |
| Each signed-out mail carries a link, and its token appears in no GraphQL response                                                   | mail job tests, `tests/db/graphql-query-scopes.test.ts`    |

### Added 2026-11-06: signed-out replies, and the rest of the owner's answers

#### A signed-out reply through the mailed link

The owner chose to let a signed-out sender reply from the mailed-link page. It is a second open mutation beside `sendSignedOutSupportRequest`, taking the token and the reply body, with these conditions:

- The service hashes the token and finds the request by that hash in SQL. It writes through `withAudit` as the request's own sender account, the anonymous account or `SIGNED_OUT_SENDER_ID` for older rows, so no new identity bootstrap is added.
- A claim by a real account clears the request's `view_token_hash` in the same write, so an old link never writes as a real account.
- A reply is accepted only while the request is open, under the same status rule as a signed-in reply. A closed or anonymised request, a wrong token and an old token all get the same not-found.
- The honeypot and the per-client and per-address send limits apply, plus a cap per request in 24 hours, and the signed-in reply's body limit.
- The page sends `Referrer-Policy: no-referrer` and links nowhere off the site. A mail scanner's GET cannot reply, since the reply is a POST.
- CLAUDE.md rule 3 names it beside `sendSignedOutSupportRequest`, and the decision record says why it is not the mailed sign-in link §13 rules out: it reaches one request and restores no session.

#### Other answers (owner unless marked)

- **A returning anonymous visitor** gets the signed-out form at `/support`, with the email field and the five topics. The send reuses their anonymous account rather than minting a new one, under the same limits.
- **The resolved mail** also carries the link, since every mail about a signed-out request does (the main session's call, on the plan's wording).
- **The CHECK still refuses `SIGNED_OUT_SENDER_ID` with no address** (the main session's call: an older stand-in row without an address could never be mailed or claimed).
- **The failing-test commit was made with `--no-verify`** because the typecheck fails on names not yet implemented. The owner chose to keep it. Every later commit runs the hook.

### Changed 2026-11-06: anonymous sessions dropped

**Decision.** The owner dropped anonymous sessions from M15.48. A signed-out send sets no cookie and creates no account. It writes the request as `SIGNED_OUT_SENDER_ID` with `sender_email`, as on staging.

**Reason.** The visitor never chose to sign in. On a shared or public computer the next person could read and reply to their requests through the cookie. The mailed link already gives the sender their requests.

**What stays.** The mailed view token, the view page and the reply, the claim by verified email (stand-in rows go to the verifying account), the four reworded mails, and the time-out bound to the address by its HMAC key.

**What goes.** The anonymous plugin, `users.is_anonymous`, the anonymous session and its gates (`requireSession()`, the GraphQL context, the proxy note), the Support tabs, heading and menu cases, linking and adoption, the anonymous expiry, and the `support_requests_one_sender` CHECK replacement. Decisions 1 to 4 above and the sections on the mint, the plugin, the sign-up hook, linking, the session mark, the pages, the exclusions, the two-factor limit and "A returning anonymous visitor" no longer apply.

**Time-out shape.** `support_timeouts.user_id` becomes nullable, with a CHECK requiring `user_id` or `address_key`. A keeper's time-out on a signed-out request records only the address key; a claim moves it to the claimer.

**Migrations.** The migrations 0136 to 0138 are replaced by one fresh migration: `view_token_hash`, `address_key` with its index, `user_id` nullable, and the CHECK. The decision record is now the section "A signed-out sender reaches their request by a mailed link".

## The site has a durable job mechanism

### Decision

The site runs work that must happen on time, or must survive a crash, as durable jobs on Vercel Workflows (the `workflow` npm package). The owner chose it.

### Why a job at all

A date comparison at read time (the answer for slug expiry, MB.80) is right where nothing must happen on time. It cannot send a mail later, retry a failed call, or delete an account an hour after sign-up when nobody visits. The provisional-account sweep (MB.67) ran inside the OAuth callback hook, so it ran only when someone signed in. It now runs as a job.

### Shape

- `src/lib/jobs/index.ts` is the one runtime importer of the SDK's `start`. `src/lib/jobs/runtime.ts` re-exports `createHook` and `sleep` for workflow files. A lint ban plus `tests/guards/lint-job-boundary.test.ts` keep every other file from importing the SDK.
- A workflow file may only sleep and call steps. Its steps live in a sibling file with a file-level `'use step'`, because the SDK bundles everything a workflow file imports for its sandbox and refuses a Node module such as the database client.
- Steps call services. A step acts as the seeded System account (`SYSTEM_ACTOR_ID`): no seat, `canCreateWorkspace` false, and distinct from the signed-out sender.
- Steps are idempotent: a step run again after it succeeded changes nothing.
- `src/proxy.ts` leaves `/.well-known/workflow/` out of its matcher. Every other `/.well-known/` path still passes through the proxy.
- `npm run dev` runs jobs with the SDK's local world, with no Vercel credentials.

### First job

`provisionalAccountExpiry(userId)` starts when an unverified account is created. It sleeps the verification window, then a step deletes the account if it has lapsed, or returns the seconds left so the run sleeps again. This covers a resent verification and the three-hour cap. The run ends when the account is gone, verified, or vouched for by a privilege-ledger row.

### Second job: the daily cleanup

`provisionalCleanup` is the fallback for a lost per-sign-up run (the run was never started, or was lost). Once a day it deletes every unverified account whose window has lapsed, one account at a time through the repository's single-row writer (`deleteLapsedProvisionalUser`), so no new writer exists. A reader, `findLapsedProvisionalUserIds`, lists the candidates a page at a time, in id order.

The Workflow SDK has no native schedule. A Vercel Cron Job starts the cleanup: `vercel.json` calls `/api/cron/provisional-cleanup` once a day, the route refuses a call without the `CRON_SECRET` bearer, and `startProvisionalCleanup` starts one coordinator run (claude-docs/design-decisions/support.md, "Daily jobs start from Vercel Cron, and no job sleeps waiting"). The coordinator reads the lapsed ids `CLEANUP_PAGE_SIZE` (500) at a time and starts a `provisionalCleanupBatch` run for each page, then ends. Each batch deletes its accounts through the single-row writer, which checks the lapse again, so an account verified since the page was read stays, and an account already deleted is skipped: a re-run, an overlap or a retried batch deletes nothing twice and raises no error. A batch that fails every attempt is logged and its accounts stay lapsed for the next day's run. No run sleeps, holds a hook token or starts a successor, and nothing else starts the job: no sign-up and no page load.

Before M15.68 the cleanup was a self-restarting chain: a run swept, slept a day under a hook token held by one run at a time, and started its successor, and the sign-up hook and the admin Users page restarted a lost chain. That was chosen when rule 1 allowed no cron route; the owner replaced it on 2026-11-02, when the cron routes were admitted to rule 1, so that no run is pending between days.

### Compared

| Option                       | For                                                    | Against                                                                                 |
| ---------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Vercel Workflows (chosen)    | Durable sleeps, retries, a local world for development | A new SDK with a large dependency tree; generated routes and build output               |
| Vercel Cron                  | No new dependency                                      | On Hobby it fires within an hour of its time; it polls rather than waking at a due date |
| Vercel Queues                | Reliable delivery                                      | Delivers events, not dates, so a delay needs another mechanism                          |
| Keep the callback-hook sweep | Nothing to add                                         | Runs only when someone signs in                                                         |

### Costs

- A lost run leaves a lapsed account in place, holding its address, until the next daily cleanup removes it. The squat protection at the OAuth callback, sign-up and email change now depends on the job running.
- The email-change `EMAIL_TAKEN` check no longer clears a lapsed squat first.
- The SDK adds many dependencies and a large lockfile change. Its generated routes (`src/app/.well-known/workflow/`, self-ignored) and `/.swc` output are git-ignored.
- The provisional delete is still a hard delete outside `withAudit`, a documented exemption, so no production job writes through `withAudit` yet. A test-only workflow in `tests/workflows/fixtures/` proves a real run's step writes as the System account.
- Real runs are tested with the SDK's Vitest plugin, a dev dependency in a `workflow` project of its own (`tests/workflows/`). It compiles the repo's workflow files into bundles each run, and a step runs from its bundle, so a mock never reaches it.

## Mail is sent through a retried job

### Decision

Every mail goes through a durable job whose run holds ids, a kind and the site origin, never the message. The job's step reads the rows when it runs, builds the mail and calls `deliver` (`src/lib/mail-transport.ts`), which throws when the transport answers with an error or cannot be reached. The Workflow SDK then retries the step with its default policy: the first try and three retries. If every attempt fails, a second step logs the mail's kind and the id it was for, never the address, and the run returns false.

`send(message)` in `src/lib/mail.ts` is one try at the transport, here and now. A job is the only thing that retries; `send` is what a mail falls back to.

### Shape

- **Each module owns its mail jobs.** `identity` has `secretLinkMail` (the verification, reset, lockout and change-of-address links, and the coven and admin invitations) and `accountNoticeMail` (the change-requested and change-completed notices, the account-exists mail and the password-changed notice). `support` has `supportStatusMail` (received and resolved), `supportReplyNotice` (a staff reply) and the closing-soon notice inside `supportRequestLifecycle`. Each job's steps live in the module's `jobs/*-steps.ts` and build the mail with the module's own service.
- **The start.** Each job is started from a `services/*-start.ts` file through `startMailJob(job, args, label, tryOnce)` (`src/lib/mail-job.ts`). While `MAIL_TRANSPORT` is set it starts the run. While it is unset, which has nothing to retry, or when the run cannot be started, it runs `tryOnce`, which builds the mail with the step's own code and tries it once through `send`. So a queue outage costs the retries, not the mail.
- **A refusal is not retried.** A recipient under `.invalid`, a transport the environment may not use, or a missing variable makes `deliver` return false without throwing, because no retry would change the answer. It is logged once.
- **Run arguments are checked.** `startJob` (`src/lib/jobs/index.ts`) calls `assertRunArguments` (`src/lib/jobs/run-arguments.ts`) before it starts any run, and refuses a value that is not an id, a kind under `kind` or `how`, a site origin, a return path, a finite number, a boolean or null. So an address, a subject, a body or a token cannot reach a job's event log, whichever job is started. The check runs at start because the values exist only then: a static check of each call site sees only the names of the values passed.
- **The marker.** A caller that records a mail as sent does it in its own job step, after `deliver` returned true. Two do: the closing-soon notice (`closing_notice_sent_at`) and a staff reply's notice (`support_replies.notice_sent_at`).
- **The origin stays in the run.** The site has more than one origin (production, staging and each hotfix preview) and no setting that names the current one, so a step cannot work out a link on its own. The origin is neither personal data nor a secret. The owner chose (2026-11-02) to keep it in the run argument rather than store it on the row.

### Secret links

A run's arguments are stored in the job's event log for as long as its events are kept, so a run never holds a token or a signed link. The step gets the token when it sends:

- **The verification link** is re-signed in the step under the secret Better Auth signs with.
- **The reset and lockout links** carry the newest unexpired reset token Better Auth stored for the account.
- **The change-of-address link** is signed in the step for the address held in `users.pending_email` ([`auth/admin-bootstrap.md`](../auth/admin-bootstrap.md), "The email page").
- **The coven and admin invitations** get a fresh token in the step through `rotateInvitationToken`, so a retry mints again and only the newest mailed link works ([`auth.md`, "The invitation mail mints its token in the job step"](auth.md#the-invitation-mail-mints-its-token-in-the-job-step)). A printed card is never mailed.

### The notice to the address a change left (owner's call, 2026-11-02)

The notice sent once a change of address completes goes to the address the account left, which after the swap is no longer `users.email`. The owner chose to hold it in a column, `users.former_email` (migration 0127), so the notice goes through `accountNoticeMail` like the others.

- **Filled by the swap.** `/verify-email`'s one write, through Better Auth's update hook, sets `email` to the new address, clears `pending_email` and sets `former_email` to the old one.
- **Cleared once it is done with.** The step clears `former_email` as the System account once the transport took the mail. When every attempt fails, the run's last step logs the notice by kind and account id and clears it too, because nothing sends that notice again and the row has no other use for the address. When no run started, the one try in the request clears it after. So the address is held only while its notice is being sent.
- **A move during the send.** The clear matches the address mailed and the address the account held when the mail was built, so a move made while the notice was going out is not cleared by it, and its own run tells the address left.
- **A second change before the first notice is sent.** The swap keeps a `former_email` that is already set, because that address is the one the account was known by and its notice is still owed; the notice names the address the account holds when it is sent. The address in between, which the same session verified moments before, is not told.
- **No address is blocked.** `former_email` has no unique index. The sign-up and the `EMAIL_TAKEN` gate read `users.email` alone, so another account may sign up with the address left or change to it the moment the change completes.
- **The time in the mail** is when the step builds it, which can be later than the swap by the retries' wait.

Rejected: putting the old address in the run (personal data in the event log, which the run-argument check refuses), and sending it once with no retry (a refused mail is lost).

### Tests

- `tests/lib/jobs/run-arguments.test.ts`: each refused value and each allowed one.
- `tests/workflows/secret-link-mail.test.ts`, `invitation-mail.test.ts`, `account-notice-mail.test.ts`, `support-status-mail.test.ts`, `support-reply-notice.test.ts` and `support-lifecycle.test.ts`: a refused send is retried, the step reads the address from the row when it sends, and a run with nothing to send sends nothing.
- `tests/db/secret-link-start.test.ts`: each start holds ids alone, and a failed start tries the mail once; the swap fills `former_email`, a second change keeps the first address left, a move during the send is not cleared, and another account can sign up with or change to the address left.
- `tests/workflows/account-notice-mail.test.ts`: the address is held through refused attempts and cleared once after the mail is taken; when every attempt fails the notice is logged by kind and account id, nothing is sent, and the address is cleared.

### Compared

| Option                                       | For                                   | Against                                                     |
| -------------------------------------------- | ------------------------------------- | ----------------------------------------------------------- |
| Every mail through the job (task as written) | One path; every mail retried          | Tokens, addresses and bodies copied into the event log      |
| A delivery job whose run holds the message   | One job for every mail                | The same: the message is personal data, and some hold links |
| The step builds the mail from ids (chosen)   | Nothing personal or secret in the log | Each mail needs a stored value the step can rebuild it from |
| Retry inside `send`, in the request          | No job                                | Lost when the function ends; delays the response            |

## The terms of use's working notes

The terms of use at `/terms` (`src/app/(public)/terms/page.tsx`) are the one document every account agrees to. This file is where each claim in them points to the file, `DESIGN.md` section or law it was read from, so the owner can check the text against the code, and a later change knows which sentence it makes wrong. The page cites its two laws in a Sources list at the end; everything else it says about the site it says without a footnote, as the privacy policy does.

The terms' values, set by the owner: fair, plain, protective of members, and taking no right the site has no need of. So the text claims no ownership of and no licence over a member's writing beyond storing it and showing it where the coven's settings allow, names the small set of enforcement tools the code has rather than reserving a general power to ban, and limits what the site promises without limiting what the law gives a member.

**No lawyer has reviewed this text.** It was drafted by Claude from the code and the two laws cited below. Before the site is offered to anyone outside the owner's circle, I recommend a lawyer reads it, with the privacy policy and the disclaimer, and in particular the paragraph "What the Site Promises, and What It Does Not", which is where a limitation of liability would normally be drafted and where this text deliberately stays plain.

The version and date live in `src/lib/terms-version.ts`: `TERMS_VERSION`, a date-form string, and `TERMS_UPDATED_ON`, the `Date` the page prints. The page and the agreement gate both read `TERMS_VERSION`, so bumping it is one edit (M15.57's criteria, "one constant that the page and the gate both read"). M15.59's scoping will move the documents into the database later; until then the constant is the version.

### For the owner

Each item is a decision I took conservatively, or a fact I could not establish. Nothing here blocks the code; every one changes a sentence of the text. Items answered on 2 November 2026 are kept with the answer, so the text can be read against them.

1. **How strong "anything you do after an update is bound by the updated terms" is, and why the click matters.** I could fetch no court opinion at first hand (CourtListener and FindLaw refused), so this rests on three Wikipedia articles and is for M15.62 to confirm. What they report: United States courts have "usually" upheld terms a person accepted by clicking, a **clickwrap** ("Clickwrap": _Feldman v. Google_, E.D. Pa. 2007, a forum clause; _Meyer v. Uber Technologies_, 2d Cir. 2017, "The user is still on inquiry notice" where the terms were linked), while terms a person is meant to accept merely by using a site, a **browsewrap**, turn on "whether a website user has actual or constructive notice" and have failed where the terms sat behind a link nobody was made to see (_Specht v. Netscape_, 2d Cir. 2002: "a consumer's clicking on a download button does not communicate assent to contractual terms"; _Nguyen v. Barnes & Noble_, 9th Cir. 2014, hyperlinked terms gave no reasonable notice; _In re Zappos.com_, D. Nev., no year given) and succeeded where exposure to the terms was "repeated, conspicuous" (_Hubbert v. Dell_, Ill. App. 2005). On changing terms, "Terms of service" reports _In re Zappos.com_ (2012) holding terms "worded to allow unilateral amendment, where one party can change the agreement at any time" unenforceable. So, plainly: on its own, a sentence that binds by continued use is the weak kind of clause, the browsewrap kind, and a clause that lets the site change the terms at will has been struck down. What makes this site's version strong is the gate: an account cannot reach a page that needs an account after an update without being sent to `/account/terms` and clicking to agree to the new version, which the site records with its date. That click is a clickwrap for each version, the kind courts have usually upheld, and the "bound by the updated terms" sentence then describes what the click already did rather than doing the work itself. Two limits, for the lawyer: the API is not gated, so an account that never loads a page could act under an old version with no click, and the sentence is all that covers that; and no Washington opinion was fetched, so whether Washington courts follow the pattern above is unconfirmed.
2. **Five clauses for M15.62, every sentence of them: the governing law, the courts, the arbitration with its cost and hardship terms, and the limitation of liability, with the continued-use sentence above.** The courts clause states only the owner's choice of forum; the owner did not say where they live, and the sentence that said so, with its venue-law citation, was removed (2 November 2026). "Which Law Applies" names the State of Washington and, on the owner's answer (2 November 2026), the state courts of Washington in Spokane County, worded as both sides consenting to that court; "What the Site Is Not Liable For" is the limitation of liability the owner asked for, written to be read: what the site is not liable for, a cap of what you paid, and what no limitation can remove. All of it was drafted by Claude, not a lawyer. The questions to put to a lawyer: does the choice-of-law wording do what it says; should the forum clause be exclusive, and does it bind a reader outside Washington; is "what you paid" an enforceable cap, both while the site charges nothing and once it charges (the owner removed "which is nothing" on 2 November 2026, since the site will not stay free); which categories of liability Washington law does not let a site exclude (I could not fetch the gross-negligence case, see the claims table), so the clause can name them; and whether citing RCW 62A.2-719, a rule for sales of goods, as an example of Washington treating unconscionable limitations as invalid is fair or should go. Nothing in the clause claims more than its sources say. On the arbitration's cost: the clause now says whoever asks for arbitration pays the arbitrator, with a hardship exception that lets a person who meets GR 34's indigency guidelines skip arbitration and go to court, checking themselves against the guidelines with no order first. Ask the lawyer whether claimant-pays plus that exception keeps the clause enforceable, given that Washington courts have struck arbitration terms whose costs block a claim. The coordinator named _Adler v. Fred Lind Manor_ (Washington Supreme Court, 2004) from memory as such a case; Justia refused the fetch (403), so it is **unverified** here and cited nowhere, and the lawyer should check it. Also ask whether the "false claim of hardship" sentence needs more than it says, since GR 34 itself is silent on a false declaration. The terms deliberately carry no loser-pays clause: the frivolous-claim sentence states what RCW 4.84.185 already lets a court do, in either direction, and adds nothing to it. A one-sided attorney-fee clause was left out because RCW 4.84.330 would turn it against the owner as readily as for them: "In any action on a contract … where such contract … specifically provides that attorneys' fees and costs … shall be awarded to one of the parties, the prevailing party, whether he or she is the party specified in the contract or lease or not, shall be entitled to reasonable attorneys' fees", the fees "shall not be subject to waiver", and "Any provision in any such contract or lease which provides for a waiver of attorneys' fees is void" (fetched 2 November 2026). Ask the lawyer to confirm that leaving the clause out is the right call for a free service, and that the frivolous-claim sentence, which names a statute on the page, reads as information rather than as a fee clause RCW 4.84.330 would reach.
3. **Thirteen, from COPPA.** Answered: the United States, Washington state. The age sentence now rests on 15 U.S.C. § 6501(1) and 16 C.F.R. part 312 (the figure, and the parental-consent mechanism), and says the site asks no parent's consent. It makes no claim that COPPA reaches the site: whether it is an "operator" of a "commercial" service is a lawyer's question, and the age is a sensible floor either way. The earlier sentence "the site relies on your consent", a statement about a lawful basis under the GDPR, is gone, and nothing else on the four pages assumed the United Kingdom: I checked `/privacy`, `/disclaimer` and `/code-of-ethics` and their notes, and found no UK law, no "consent" basis and no UK assumption in them. The privacy policy's notes still point the questions of controller, lawful basis and supervisory authority at M15.58, which is right. The owner chose (2 November 2026) to keep the sentence with no age screen: COPPA reaches a general-audience site only once it has "actual knowledge" that a user is under thirteen, and commentary on the FTC's guidance says it does not require a site to ask (https://paulhastings.com/insights/caveat-vendor/blog-ftc-releases-second-set-of-coppa-faqs-here-are-some-highlights, fetched 2 November 2026). If a screen is ever added, it is a neutral date-of-birth field, never an "I am over 13" box, which the FTC does not treat as neutral. An account the site learns belongs to someone under thirteen is erased. A question for a lawyer: is a stated minimum age in the agreed terms enough for COPPA, with no age screen?
4. **Whether the GDPR applies to EU visitors is not settled here.** The terms say nothing about the GDPR, and these notes do not claim it does or does not apply to a site run from Washington with visitors in the EU. That is M15.58's question (`claude-docs/tasks/m15.md`, M15.58: "Lawful basis and retention"), and the terms should be re-read when it answers.
5. **Washington's My Health My Data Act (RCW 19.373): no, on its definitions, and a lawyer should confirm.** The Act regulates "consumer health data", defined in RCW 19.373.010(8)(a) as "personal information that is linked or reasonably linkable to a consumer" that identifies the consumer's past, present or future physical or mental health status, with examples in (8)(b) such as health conditions, treatments, medication, reproductive or sexual health, biometric and genetic data, and health-related inferences drawn from non-health data; a "regulated entity" (19.373.010(23)) is one that conducts business in Washington or targets Washington consumers and "alone or jointly with others, determines the purpose and means of collecting, processing, sharing, or selling" such data. The site stores what a person writes about ingredients, stock and spells, their name, address and sign-in details, and support requests holding what the sender chose to write (the section "The privacy policy's working notes"); none of it identifies a person's health status, and the compendium's safety notes are about the ingredient, not the reader. I did not stretch the Act to the case of a member writing about their own health in a spell or a support request; a lawyer should say whether that edge makes the site a regulated entity. I looked at no other Washington statute, and the terms cite none.
6. **Promises.** Answered: "sells nothing about you" and "never used to train anything" are true. On 2 November 2026 the owner asked that the Short Version not make them a permanent promise, so it states them as the present state; "What Is Yours" still says "We promise that …". The owner also removed "Today the site is run by people in their spare time" from the terms and the disclaimer, since it will not always be true, and the claim that the site is free, since it will not stay free. The owner also removed the claim that creating a coven needs an invitation or a keeper's grant, with no way to buy your way in, since that is changing soon. The owner kept "What Is Yours" as a promise (2 November 2026). A question for a lawyer: does the "never sold, never used to train" promise limit what a later version of the terms can do with writing already on the site? The FTC warned on 13 February 2024 that quietly applying a looser rule to data people gave earlier can be unfair or deceptive (summarised at https://www.consumerfinancemonitor.com/2024/02/28/ftc-warns-quietly-changing-privacy-policies-may-be-an-unfair-or-deceptive-practice/, fetched 2 November 2026), so a change would be told to people first, agreed again, and applied only to writing done after it.
7. **The Disclaimer and the Code of Ethics are "part of these terms".** Answered: kept. The terms state it in their opening paragraph, under the version line; the Disclaimer and the Code of Ethics each open by saying they are part of the terms; and the acceptance page names both beside the Agree button, so the inclusion is stated before anyone agrees. The terms now say which part of the Code of Ethics binds whom: "What Everyone Agrees To" binds every account, and the curator, admin and owner sections bind whoever holds that role. The staff sections are drafts for the owner's review, rule by rule (the section "The code of ethics' working notes", item 10).
8. **Enforcement is named, not reserved.** "How to Treat Each Other" lists the tools the code has (remove from a coven, pause a member in a coven, support time-out, revoke coven creation, pause an account's site access) and says accounts are never closed. It does not reserve a general right to suspend or ban, because no such mechanism exists and the owner's instruction is not to claim what the code does not do. M15.52 named the site access pause in it, and M15.55 the coven access pause.
9. **"Agreeing to These Terms" and "Updates to These Terms" now describe the built gate** at `/account/terms`, from the coordinator's statement of it (2 November 2026), and name the route in plain text rather than as a link, since the route lives in the gate's code. Two things still to check against the code before the PR is ready: that the acceptance page shows the terms or links `/terms`, and whether existing accounts are seeded as agreed (if so, "right after you sign up" is true for new accounts and "whenever the version you last agreed to is not the current one" for the rest, which the text already says).
10. **The version is a date.** `TERMS_VERSION` is `'2026-11-02'`, the day the text was drafted, so a reader can tell versions apart without a counter and so the gate's comparison is a plain string equality. A bump means setting both constants in `src/lib/terms-version.ts` to the day the new text takes effect. If you prefer a counter (`'1'`, `'2'`), it is the one constant. The text was revised on 2 November 2026 before any account agreed to it, so the version was not bumped.
11. **What other people write on the site, for M15.62.** On the owner's decision (2 November 2026) the liability list says "anything other people write on the site, such as the ingredients and spells a coven's members add", replacing "anything a coven's members write to one another": v1 has no messaging, since notes are v2. In the United States, 47 U.S.C. § 230(c)(1) says no provider of an interactive computer service "shall be treated as the publisher or speaker of any information provided by another information content provider" (Sources, 15), so the law gives this protection whatever the terms say. It does not reach federal criminal law, intellectual property law, communications privacy law or sex trafficking law (§ 230(e)), or writing the site itself creates or develops (§ 230(f)(3)), such as the compendium. Questions for the lawyer: does the sentence add anything to § 230 or risk overstating it, and does the intellectual property exception mean the site needs its own process for a copyright complaint? Other countries' law is not checked.

12. **RCW 7.06.050 is off the page.** On your decision (2 November 2026) it left the page's Sources list, since no sentence on the page cites it: it covers arbitration a court orders, not one the parties agree to. It stays in these notes for the claim at "Washington already uses non-binding arbitration with a right to trial afterwards".

13. **Grouped sections.** On the owner's decision (2 November 2026) the page's sections are grouped under section headings with subsections, and the page menu nests the subsections under each group. "Leaving" moved down into "This Agreement", after "Agreeing to These Terms" and "Updates to These Terms".

## What GDPR asks of Sorrel & Salt

Written on 2 November 2026. This is a scope: it says what the law asks, what the site does today, and what is left to build. It builds nothing. It is not legal advice and no lawyer has read it.

"GDPR" here means two texts that are nearly the same: the EU regulation (Regulation (EU) 2016/679) and the UK's copy of it, the UK GDPR, as the Data (Use and Access) Act 2025 changed it. Where they differ, the doc says which one it means. "The plan" is the section "Mint the GDPR build tasks now, build nothing (plan)" beside this file, which the owner approved before the build tasks were minted.

### Decisions for the owner

1. **Nothing is needed from the owner to merge this PR.** It records decisions; it asks for none to be made before then.
2. **The site stays on Vercel Hobby for now** (the owner, 2 November 2026). Vercel offers a data processing agreement only on Pro and Enterprise, not on Hobby (see "Processors and transfers"), so the site has none with its host, and Hobby keeps runtime logs for 1 hour. The privacy policy must not claim a processing agreement with Vercel (M15.74 carries this). Moving to Pro would add the agreement and also settle the non-commercial-use risk already noted in `DESIGN.md` §4; if the owner moves, the policy's Vercel row changes with it.
3. **The last-used sign-in method cookie stays, set only with consent** (the owner, 2 November 2026). M15.76 adds an unticked "Remember my sign-in method on this device" box to the sign-in page, and the cookie is set only when the person ticks it. Consent asked where the cookie is used works under both the EU rule (ePrivacy Directive article 5(3)) and the UK rule (PECR regulation 6), so the site still needs no consent banner. The UK's rules from 5 February 2026 might exempt the cookie anyway (PECR Schedule A1 paragraph 6, if the site says so and gives a way to object), but the EU's have no such exemption.
4. **No EU or UK representative, no ICO fee and no processing register are needed on the facts as they stand** (see "Does GDPR apply?"). This holds only while the site stays invite-gated and does nothing to attract EU or UK users. The owner must tell whoever scopes any change that adds that (a marketing push, an EU language, a `.eu` or `.de` domain, euro prices) to re-read the next section first.

### Does GDPR apply?

**Short answer: probably not by law, and the site should behave as if it did.** I recommend the second half because the Terms and the privacy policy already promise erasure, because invited people may live in the EU or UK, and because the cost is small (M15.73 to M15.76).

#### What decides it

A person running a site from outside the EU or UK is caught by the GDPR in only two ways, both in article 3(2): the site _offers goods or services_ to people in the EU, or it _monitors their behaviour_ there. (Article 3(1), having an establishment in the EU, does not apply: there is none.) The UK GDPR has the same two tests for the UK.

On "offers", the regulation's recital 23 says that a website being reachable from the EU, listing an email address, or using a language common in the operator's own country is "insufficient" on its own. The European Data Protection Board (EDPB) lists signs that do show intent, such as naming an EU country, paying for EU-aimed search advertising, an EU phone number, a top-level domain like `.de` or `.eu`, a language or currency of an EU state, and describing EU customers. It adds that where service is "inadvertently or incidentally" given to a person in the EU, the GDPR does not apply. [EDPB 3/2018, pp. 17–18]

#### What the site shows

- The operator is one person in Washington State, USA. The Terms say the site is "run from the United States" and governed by Washington law (`src/app/(public)/terms/page.tsx`, lines 61 and 172).
- The site is in English only. I found no EU country named, no EU phone number, no currency and no paid advertising anywhere in the code or docs. I did **not** check what domain name will be used in production; a `.eu` or country-code domain for an EU state is one of the EDPB's signs.
- The site is invite-gated (`CLAUDE.md`, "Domain invariants"): signing in earns an account and an observer seat in the demo coven and nothing else.
- The site has no analytics, advertising, tracking script or fingerprinting. `package.json` has none, and the content security policy allows connections only to the site itself (`src/lib/security-headers.ts`, `connect-src 'self'`). So the "monitors behaviour" test (article 3(2)(b)) has nothing to find.

On these facts neither test is met, so the site is outside article 3(2), and also outside the UK GDPR's equivalent. **This is my reading of the EDPB's guidance applied to the facts above, not a ruling.** A regulator looks at the whole picture and the EDPB says the factors work "in combination".

#### What follows from that

| Obligation                                                     | Applies by law?                                                                                                                                                                                                                                                                                                                                                                                         | What I recommend                                                                                    |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Appoint a representative in the EU or UK (article 27)          | Only if article 3(2) applies. The article also exempts processing that is occasional, low risk and not large scale (27(2)(a)); the EDPB reads "occasional" as outside the regular course of business, which a site's accounts are not [EDPB 3/2018]. So the exemption would not help.                                                                                                                   | Do not appoint one. Re-check if the site starts to target the EU or UK.                             |
| Pay the UK data protection fee                                 | The fee regulations say a "data controller" must pay unless all its processing is exempt (Data Protection (Charges and Information) Regulations 2018, reg. 2). The smallest charge is £52 a year (reg. 3). Whether the duty reaches a controller the UK GDPR does not cover is **my inference** from the UK GDPR's reach; I could not read the ICO's own statement (its site refused automated access). | Do not pay now. Check the ICO's fee page before launch if the owner has any UK-resident members.    |
| Keep a record of processing (article 30)                       | Only if the GDPR applies. Its small-organisation exemption (30(5)) does not cover processing that is not occasional.                                                                                                                                                                                                                                                                                    | Keep the table in "What the site holds" below up to date. It serves as the record at no extra cost. |
| Answer requests for access, erasure and portability            | Only if the GDPR applies.                                                                                                                                                                                                                                                                                                                                                                               | Answer them anyway, as set out below.                                                               |
| Tell people the lawful basis, their rights and how to complain | Only if the GDPR applies.                                                                                                                                                                                                                                                                                                                                                                               | Add it to the privacy policy (M15.74).                                                              |

#### Transfers from the EU or UK

If the GDPR did apply, the site would be a controller outside the EU. The EDPB says the rules on transfers to third countries (Chapter V) apply to a non-EU controller caught by article 3(2) when it passes data to a processor. The test has three parts: the sender is subject to the GDPR for that processing, it hands data to another party, and that party is in a third country [EDPB 05/2021, section 2]. The EDPB's examples include a third-country controller that targets the EU market and uses a non-EEA processor. So each US provider below would count as a transfer, **if** article 3(2) applied. It does not on the present facts, so the agreements in "Processors and transfers" are good practice and not yet a legal duty.

### What the site holds

This table is the record of processing for the purposes of this scope. "Basis" is explained in the next section. "Erased" is what M15.74 does to the row when a keeper erases an account.

| Data                                                                                           | Where                                                               | Why it is held                               | Basis                                                           | How long                                                                                                                           | Erased by M15.74                                                  |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Name, email address, avatar, role, terms version and acceptance time                           | `users` (`src/modules/identity/schema/users.ts`)                    | The account                                  | Contract                                                        | While the account exists                                                                                                           | Name, avatar and address blanked; the row stays                   |
| Password hash, provider tokens                                                                 | `accounts` (`schema/auth.ts`)                                       | Signing in                                   | Contract                                                        | While the account exists                                                                                                           | Deleted                                                           |
| Sign-in sessions: IP address, browser description, impersonation marker                        | `sessions`                                                          | Keeping a person signed in; spotting misuse  | Contract; legitimate interests                                  | 7 days from last use (Better Auth default; `claude-docs/auth/README.md`, line 21). Rows are not swept today; M15.75 adds the sweep | Deleted                                                           |
| Passkeys, two-factor secrets                                                                   | `passkeys`, `two_factors`                                           | Signing in                                   | Contract                                                        | While the account exists                                                                                                           | Deleted                                                           |
| Pending verification and reset tokens                                                          | `verifications`                                                     | Verifying an address or resetting a password | Contract                                                        | Token lives 15 minutes (reset), 1 hour (verification); rows are not swept today; M15.75 adds the sweep                             | Deleted                                                           |
| Failed sign-in counts                                                                          | `sign_in_failures`                                                  | Slowing password guessing                    | Legitimate interests                                            | Short, until cleared                                                                                                               | Deleted                                                           |
| Request counters keyed by IP address                                                           | `rate_limits`                                                       | Slowing abuse                                | Legitimate interests                                            | Not swept today; M15.75 adds the sweep                                                                                             | Not linked to an account                                          |
| Requests for a copy of a person’s data, with the built zip parts, a hashed link token and code | `privacy_requests` (M18.1)                                          | Giving a person their copy                   | Contract; legitimate interests                                  | Parts, code and grant cleared 7 days after the build; the row stays (M15.61)                                                       |
| Who wrote or changed each row                                                                  | The `*_by` audit columns, all with a foreign key to `users`         | The audit trail                              | Legitimate interests                                            | Permanent                                                                                                                          | Kept, credited to no name once the row is blanked                 |
| Pauses, role changes (the privilege ledger), coven memberships                                 | `user_access_pauses`, `user_privilege_changes`, `workspace_members` | Running the site and its covens              | Contract; legitimate interests                                  | Permanent (the ledger is append-only)                                                                                              | Kept; they hold ids, and the account row they point at is blanked |
| Coven invitations: address, note                                                               | `invitations`                                                       | Inviting a person                            | Contract (steps at the invitee's request); legitimate interests | 7 days to accept; the row stays                                                                                                    | The address is cleared                                            |
| Support requests and replies: subject, message, page, sender address (signed-out senders only) | `support_requests`, `support_replies`                               | Answering the sender                         | Legitimate interests; contract for account users                | Anonymised 12 months after closing (M15.46)                                                                                        | Anonymised with the same anonymiser                               |
| Support send counters and time-out keys                                                        | `support_send_counts`, `support_timeouts`                           | Rate limiting                                | Legitimate interests                                            | Hashed (M15.46)                                                                                                                    | Deleted with the account (they cascade)                           |
| Spell working names and notes                                                                  | `spell_working_participants.name`, `spell_workings.note`            | The coven's own record                       | Contract                                                        | Until the coven or spell is deleted                                                                                                | A participant name that is the account's is cleared               |
| What a person writes into a coven (ingredients, spells)                                        | Coven tables                                                        | The service itself                           | Contract                                                        | Until deleted; deletes are soft                                                                                                    | Stays with the coven, credited to no name                         |

Three more points about the holding:

- **Soft delete is not erasure.** The site marks rows deleted and keeps them (`claude-docs/db/soft-delete.md`). The ICO's erasure guidance says nothing that treats a deleted flag as erasure, and I read none in the regulation; the conclusion that it is not is my own, because the data stays readable to anyone with database access. So the privacy policy must keep saying that a person's own deletes are "marked deleted rather than erased", and that erasure is a separate request.
- **Hard deletes exist only** for the lapsed provisional account sweep (`src/db/repository/provisional-users.ts`), the failed-sign-in counter, passkey removal, the sessions removed when a pause is set, and the category join tables. M15.75 adds the expired-row sweep as a further named exception.
- **The breached-password check** sends only the first five characters of the password's SHA-1 hash to `api.pwnedpasswords.com` (`src/lib/breached-password.ts`, lines 13 and 32 to 36). It sends no address or account id. I did not read the provider's own terms, so I do not call it a processor; I call it a recipient of a hash prefix that cannot identify a person.

### Lawful basis for each kind of data

The GDPR (article 6) requires one of six grounds for each use of personal data. The two that fit this site:

- **Contract (6(1)(b)):** the use is necessary to give the person the service they signed up for. The account, sign-in, coven membership, the person's own writing and the mail the service sends all fit.
- **Legitimate interests (6(1)(f)):** the use is needed for a real interest of the operator, and the person's rights do not outweigh it. Security data (IP addresses in sessions and rate limits, failed-sign-in counts, the audit trail) and answering support fit. The operator must be able to show that balance if asked. The policy should state the interest in one sentence per use.

The site never relies on **consent** for anything. That is deliberate: consent can be withdrawn, and then the use must stop. The terms acceptance recorded in `users.terms_accepted_at` is acceptance of a contract, not GDPR consent, and the policy must not call it consent.

The Data (Use and Access) Act 2025 added "recognised legitimate interests" to the UK GDPR. I did not read its list, and none of the site's uses depends on it.

Sign-in providers (Discord, Google, Microsoft, and Facebook, which is hidden today): when a person signs in with one, the provider holds its own account and decides for itself why it holds it. That makes the provider a separate controller of the data it already had, and the site a controller of what the provider hands over (name, address, avatar). **This is my inference. I did not read any provider's terms.** The policy should say that the site receives only name, address and avatar from the provider and that the provider's own policy covers its side.

### What a person may ask for

Each right below needs the site to act within **one month** of the request. The EU text allows two more months when requests are many or complex, but the person must be told of the delay within the first month (article 12(3)) [EUR-Lex was blocked, so I read the adopted text on legislation.gov.uk]. The request is free unless it is manifestly unfounded or excessive (12(5)). A request may come in any form; it need not mention the GDPR.

| Right                                                                                                      | Source                  | What the site does                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Be told what is held, and get a copy (access)                                                              | Article 15              | Today a keeper gathers it by hand. M15.61 scoped a machine-readable copy of everything that names the person, built by M18.3 to M18.6 (see "A way for people to take their own writing with them"). Article 15(4) says the copy must not harm other people's rights, so rows that name other people (a coven's other members) are left out or reduced to what is the requester's. |
| Take their own data elsewhere (portability)                                                                | Article 20              | Applies to data the person _provided_, held on the basis of contract or consent, processed automatically. It covers their own writing but not the audit trail or security data. The format must be structured, commonly used and machine-readable. M15.61 scoped it, and M18.3 to M18.6 build it.                                                                                 |
| Have their data erased                                                                                     | Article 17              | M15.74 builds it (see below). Article 17(3) lists exceptions, among them legal claims and freedom of expression. The site needs none today.                                                                                                                                                                                                                                       |
| Correct wrong data (rectification), restrict use, object to use, not be judged by automated decision alone | Articles 16, 18, 21, 22 | **I did not read these articles for this scope.** The site's account page already lets a person change their name and, with verification, their address. Nothing on the site makes automated decisions about people. Whoever writes M15.74's policy text must read articles 16, 18, 21 and 22 first and list them honestly.                                                       |

#### How the site knows who is asking

The plan's rule stands: **a request counts as verified when the account sends it while signed in.** The account's own sign-in is the identity check.

- A signed-in request through `/support?support=privacy` records the sender's account (`src/modules/support/schema/support-requests.ts`). A paused account can still sign in and reach support (`src/graphql/paused-operations.ts`), so a pause never stops anyone asking.
- A signed-out request carries only an address the sender typed, which proves nothing. The admin replies asking the person to sign in and send it from the account. If the person can no longer sign in, the admin writes to the address held on the _account_, never the typed one, and acts once that mailbox replies.
- The site never asks for a passport or other identity document. The regulation lets the operator ask for more information only where there are "reasonable doubts" about identity (article 12(6)), and any check should be proportionate. An identity document would collect more than the account itself holds.

**When the clock starts.** This differs between the two texts, and I did not take the plan's wording as settled.

- **UK:** since 5 February 2026, article 12A of the UK GDPR (inserted by the 2025 Act, section 76) says the one-month period starts when the controller has received the information it reasonably needs to confirm identity. [read on legislation.gov.uk]
- **EU:** article 12(3) says "within one month of receipt of the request", and article 12(6) lets the controller ask for more information on reasonable doubt. The adopted text I read has no sentence that starts the clock later.

**Decision for M15.74: act as if the clock runs from receipt in both.** A signed-in request is verified on arrival, so the later start rarely matters, and a signed-out request gets its first reply (asking the person to sign in) well inside the month. This costs nothing and does not rely on the UK reading.

#### Erasure and "an account is never closed"

The owner's rule is that an account is paused, never closed (`DESIGN.md` line 1451; Terms line 117). The rule exists because every audited row has a non-null foreign key to the user, and the privilege ledger is append-only by trigger (`claude-docs/design-decisions/auth.md`, "One privilege ledger, written by the database"), so a real user row cannot be deleted. The two fit together like this:

- **Erasure is the removal of everything that identifies the person, not the removal of the row.** M15.74 blanks name, avatar and address (the address becomes `erased-<id>@invalid`), deletes sessions, provider links, passkeys, two-factor secrets and failed-sign-in counts, anonymises the account's support threads, clears invitation addresses and working names, sets `erased_at` (M15.73), and sets an open-ended pause no one can lift. What is left is an id and the audit trail's credit to that id, which no longer leads to a person.
- **Whether a blanked row is "erased" in the law's sense** turns on whether the remaining data can still be linked to the person. The ids in audit columns can be linked back only by someone who holds the old name, and the site no longer does. **This is my reading; no regulator has said so.** Recital 26 of the GDPR (which I did not read for this scope) is the place to check.
- **Content the person wrote in shared covens stays with each coven, credited to no name.** The coven's other members have an interest in their own records. The policy must say so.
- **Backups.** The ICO's erasure guidance (read only from a search excerpt) says backups that cannot be overwritten at once may be kept "beyond use" and the person told. The site relies on Neon's own backups and restore window. **I did not look up Neon's backup retention**, so the policy must not state a period until someone does.
- **The person can sign up again with the same address** and gets a new, empty account.
- **Refusals.** M15.74 refuses to erase a keeper, a curator, the System account, the signed-out sender account, or the sole steward of a coven. A keeper or curator must have the role removed first so the ledger records it; a sole steward must hand the coven on or delete it.
- **Both the privacy policy and the Terms of Use must say this** (M15.74 carries both edits). The Terms' "Leaving" section (lines 242 to 247) and the policy's "How to Ask for Removal" (lines 352 to 363) currently promise that a keeper erases on request, by hand, and say nothing about the pause.

### Retention

The principle (article 5(1)(e)) is to keep personal data no longer than needed. The ICO expects a schedule; for occasional, low-risk processing a regular review is the lowest bar (ICO, read from a search excerpt only). The table above is the schedule. Two gaps:

- Expired sessions, verification rows and rate-limit counters are never deleted. **M15.75** adds a daily sweep (the job system is M15.49) and the policy states each period exactly as coded.
- Vercel keeps the server's runtime logs for **1 hour on Hobby** and 1 day on Pro, and keeps build logs "indefinitely" (Vercel's limits page, fetched 2 November 2026). The code has no logger library; `auth.ts` logs refusals by user id and never by address. The policy states these two periods. The 1-hour figure is Vercel's, and it changes if the owner moves to Pro.

### Cookies and browser storage

The UK rule (PECR regulation 6) and the EU rule (ePrivacy Directive article 5(3)) both ask for consent before storing or reading information on a person's device, unless it is strictly necessary for a service the person asked for. The ePrivacy text says "strictly necessary in order for the provider of an information society service explicitly requested by the subscriber or user to provide the service". The ePrivacy Directive's rule covers any information on the device, so it covers local storage as well as cookies.

Since 5 February 2026 the UK list of exemptions sits in PECR Schedule A1: paragraph 4 for strictly necessary storage, paragraph 5 for statistics with an objection route, and paragraph 6 for preferences and appearance, also with an objection route. (Earlier research cited regulation 6(4); that text is gone.)

| Item                                                                                                                                    | What it is                            | Exempt?                                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Session cookie                                                                                                                          | Keeps a person signed in              | Strictly necessary                                                                                                                                                 |
| Short-lived handshake and two-factor cookies, and the two-factor "trust this device" cookie (30 days; `claude-docs/auth/two-factor.md`) | Sign-in security                      | Strictly necessary. The trust cookie is a closer call: a person turns it on themselves.                                                                            |
| `admin_session`                                                                                                                         | A keeper's impersonation              | Strictly necessary for that admin's own task                                                                                                                       |
| `better-auth.last_used_login_method` (`src/lib/sign-in.ts`)                                                                             | A hint on the sign-in page            | Not strictly necessary. UK paragraph 6 might cover it. EU: needs consent. M15.76 sets it only with consent.                                                        |
| `autosave:*` in local storage, 24 hours (`src/lib/autosave/mirror.ts`)                                                                  | Keeps an unsaved draft after a reload | Arguably strictly necessary: it protects work the person is doing.                                                                                                 |
| `theme`, `card-density` in local storage                                                                                                | Remembers display settings            | Not strictly necessary. UK paragraph 6 covers it if the policy says so and a way to object is offered. EU: needs consent, or is arguably the person's own request. |

**Finding the research did not have:** the `theme` and `card-density` entries are the same class as the last-used cookie, which M15.76 puts behind consent, and M15.76 does not touch them. I recommend leaving them and stating them in the policy under paragraph 6, because no consent banner is needed for them under the UK rule and the site does not target the EU. I did not find a source that settles whether the EU treats a theme preference as "strictly necessary", so I have not claimed that it does. The owner may overrule this.

The ICO's own "storage and access technologies" guidance is not cited here: its site refused automated access, and the legislation is the authority.

### Processors and transfers

A **processor** is a company that handles personal data only on the site's instructions. The GDPR (article 28(3)) requires a written contract with each, covering what it may do with the data, confidentiality, security, sub-processors, helping with rights requests, deletion at the end, and audits. Good practice is the same even where the law does not demand it.

| Provider                                           | Role                                         | Agreement                                                                                     | Transfer tool                                                                                                                                                   | Source status                                                                                                                          |
| -------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Vercel**                                         | Hosts the site; holds runtime and build logs | A data processing addendum, **Pro and Enterprise only**. Hobby has none.                      | EU standard contractual clauses plus the UK addendum; certified under the EU–US Data Privacy Framework since 4 June 2024 (so the UK–US data bridge applies too) | Addendum read at vercel.com/legal/dpa, updated 17 March 2026; certification read on Vercel's changelog                                 |
| **Neon**                                           | Holds the database                           | A data processing schedule, last updated 14 October 2026, issued under its parent, Databricks | **Not read**: I saw that a schedule exists but did not read the transfer clauses. Do not state a transfer tool in the policy until someone does.                | neon.com/dpa fetched; clauses unread. Region and backup period not looked up                                                           |
| **Resend**                                         | Sends production mail                        | A data processing addendum, updated 31 December 2025, part of its terms                       | EU standard contractual clauses and the UK addendum; clause text read                                                                                           | Read at resend.com/legal/dpa                                                                                                           |
| **Mailtrap**                                       | Receives Preview-environment mail only       | **Not found.** The two addresses I tried returned "not found".                                | Not known                                                                                                                                                       | Unverified. Mailtrap sees no production data, so this does not block launch, but the policy must not name it as a production processor |
| **Sign-in providers** (Discord, Google, Microsoft) | Their own controllers (see above)            | None needed                                                                                   | Not applicable                                                                                                                                                  | Inference                                                                                                                              |

The transfers matter most for the Vercel gap: the owner needs Pro to have the agreement. Until the owner chooses, the policy's "Who Processes It" must describe what exists. The policy's current page names the providers but not any agreement. The three sentences it needs: that each is bound by a written agreement (true for Resend now, for Vercel on Pro, for Neon once someone reads the schedule), where they are, and how to see their terms.

### Who runs the site, and how to complain

The privacy policy must name the controller (the person responsible). That is the site's single operator in Washington State. The policy must give a way to reach them: the support form, which already works signed out (`/support?support=privacy`). The owner decides how much more to print (a name, a postal address). I did not research whether any US state law requires either.

A person in the EU or UK has the right to complain to their national supervisory authority (GDPR article 77; I read only its first line). For the UK that is the Information Commissioner's Office, now named the Information Commission in the fee regulations on legislation.gov.uk. I did not read the law that renamed it or confirm the date from the ICO, so the policy should check the current name when it is written. The policy should say a person may complain to their national authority and name the UK and EU lists, linked from a source the owner checks at the time of writing. I did not research US complaint routes.

### The privacy policy: corrections and additions

These belong to M15.74. The policy is `src/app/(public)/privacy/page.tsx`. This scope does not edit it.

**Wrong or missing today**

1. **Cookies (section "How You Sign In").** It names the session and last-used-method cookies only. The cookie table above adds the handshake and two-factor cookies, the 30-day trust cookie, `admin_session`, and the three local-storage items. M15.76 sets the last-used cookie only with consent; the policy must say so in the same release.
2. **Erasure by hand.** It says a keeper erases "by hand in the database" in the owner's words; M15.74 replaces that with the new button and the identity rule.
3. **Vercel logs.** It states no period. Add 1 hour for runtime logs on Hobby (1 day on Pro).
4. **Retention of sessions, verification rows and counters.** M15.75 supplies the periods.
5. **Facebook** appears in the provider list though the sign-in screens hide it. Drop it, or keep it with "when offered".
6. **"The site sells nothing about you."** This is a promise about the future, and the owner's. Keep it only if the owner is willing to hold to it.
7. **Content in shared covens after erasure** is not mentioned. Add it.
8. **`UPDATED_ON`** (line 15) must move on each edit.

**Sections the policy lacks**

- Who runs the site and how to reach them.
- The lawful basis for each kind of data (the table in this scope is the draft).
- A person's rights and how to use them, including the identity rule and the one-month period.
- Transfers to the United States and the agreements covering them, with the Vercel plan decision applied.
- The right to complain, and to whom.

### Not decided here

- Whether to buy Vercel Pro (the owner decides).
- The site's production domain name, which affects the targeting analysis.
- US privacy law, including children's rules beyond the Terms' age line. I did not research it.

### What I could not read

- **EUR-Lex** refused every automated request. The EU articles cited (2, 3, 5, 6, 12, 15, 17, 20, 27, 28, 30, and the first line of 77) were read on legislation.gov.uk, which holds the adopted EU text. Any later amendment to the EU text would not appear there; I know of none. The citation below gives the EUR-Lex address as the official location.
- **Every ICO page** refused automated access (HTTP 403). Statements attributed to the ICO come from search-result excerpts and are marked "excerpt only" below. I did not read the ICO's current subject-access guide (reportedly revised in July 2026), so the UK clock rule rests on the legislation (article 12A), not the ICO's reading.
- **Neon's schedule** was fetched but its transfer clauses were not read. **Mailtrap's agreement** could not be found.
- **No lawyer** has reviewed any of this.

### Build tasks that came out of this scope

| Task   | What it builds                                                                                                         |
| ------ | ---------------------------------------------------------------------------------------------------------------------- |
| M15.73 | The `erased_at` column and its check.                                                                                  |
| M15.74 | `eraseAccount`, the admin button, the identity rule, and the privacy policy and Terms edits listed above.              |
| M15.75 | The daily sweep of expired sessions, verifications and counters.                                                       |
| M15.76 | Consent for the last-used sign-in cookie.                                                                              |
| M15.61 | Scopes the article 15 copy and the article 20 export; its builds are M18.1 to M18.9 in Wave 18, with M15.73 to M15.76. |

### Sources

Access date for every web page: 2 November 2026. "Fetched" means I read the page text itself. "Excerpt only" means I read a search-result excerpt, not the page.

#### Legislation (fetched)

- European Parliament and Council. Regulation (EU) 2016/679 (General Data Protection Regulation), articles 2, 3, 5, 6, 12, 15, 17, 20, 27, 28, 30, and the first line of 77. Official text: https://eur-lex.europa.eu/eli/reg/2016/679/oj (not fetchable by automation). Read as adopted on https://www.legislation.gov.uk/eur/2016/679.
- UK General Data Protection Regulation, articles 3, 12 and 17, as amended. https://www.legislation.gov.uk/eur/2016/679 (revised UK version).
- Data (Use and Access) Act 2025, section 76 (inserting UK GDPR article 12A, in force 5 February 2026). https://www.legislation.gov.uk/ukpga/2025/18
- Privacy and Electronic Communications (EC Directive) Regulations 2003, SI 2003/2426, regulation 6 and Schedule A1. https://www.legislation.gov.uk/uksi/2003/2426
- Directive 2002/58/EC (ePrivacy), article 5(3), as amended by Directive 2009/136/EC. https://www.legislation.gov.uk/eudr/2002/58/article/5
- Data Protection (Charges and Information) Regulations 2018, SI 2018/480, regulations 2 and 3. https://www.legislation.gov.uk/uksi/2018/480

#### Guidance (fetched)

- European Data Protection Board. _Guidelines 3/2018 on the Territorial Scope of the GDPR (Article 3)_, version 2.0, adopted 12 November 2019. https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-32018-territorial-scope-gdpr-article-3-version_en. The PDF text was read.
- European Data Protection Board. _Guidelines 05/2021 on the Interplay between the Application of Article 3 and the Provisions on International Transfers as per Chapter V of the GDPR_. https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-052021-interplay-between-application-article-3_en. The PDF text was read.

#### Provider documents

- Vercel Inc. "Data Processing Addendum." Updated 17 March 2026. https://vercel.com/legal/dpa. Fetched.
- Vercel Inc. "Vercel Is Now Certified under the EU-US Data Privacy Framework (DPF)." Changelog, 4 June 2024. https://vercel.com/changelog/vercel-is-now-certified-under-the-eu-us-data-privacy-framework-dpf. Fetched.
- Vercel Inc. "Limits." https://vercel.com/docs/limits. Fetched; the log periods are in its logs section.
- Resend. "Data Processing Addendum." Updated 31 December 2025. https://resend.com/legal/dpa. Fetched.
- Neon. "Data Processing Addendum." Last updated 14 October 2026. https://neon.com/dpa. Fetched; transfer clauses not read.

#### Excerpt only

- Information Commissioner's Office. "Right to Erasure." https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-erasure/. Excerpt only (backups kept "beyond use").
- Information Commissioner's Office. "Principle (e): Storage Limitation." https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/storage-limitation/. Excerpt only.
- Information Commissioner's Office. "A Guide to Subject Access." https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/subject-access-requests/a-guide-to-subject-access/. Excerpt only; not used for any decision above.
- The EU's one-month and two-month periods in article 12(3) were also checked against secondary summaries; the legislation.gov.uk text of the adopted regulation is the authority used.

#### Repository

- `DESIGN.md` §4, §5 and line 1451; `claude-docs/auth/README.md`; `claude-docs/auth/two-factor.md`; `claude-docs/auth/impersonation.md`; `claude-docs/db/soft-delete.md`.
- `claude-docs/design-decisions/`: `design-decisions/auth.md`, "One privilege ledger, written by the database", `design-decisions/auth.md`, "What the site access pause closes, and what it decides along the way", `design-decisions/auth.md`, "How the coven access pause refuses a member, and what it decides along the way", the section "A support form, reviewed by keepers", the section "The privacy policy's working notes", the section "The terms of use's working notes", the section "Support feature: UX, accessibility and process research".
- `src/app/(public)/privacy/page.tsx`, `src/app/(public)/terms/page.tsx`, `src/lib/breached-password.ts`, `src/lib/security-headers.ts`, `src/lib/social-providers.ts`, `src/modules/identity/schema/`, `src/modules/support/schema/support-requests.ts`.

<!-- The approved plan for M15.58. The scope beside it, the section "What GDPR asks of Sorrel & Salt", is the decision; this plan is not maintained after the PR lands. -->

## Mint the GDPR build tasks now, build nothing (plan)

### Context

The owner's decision of 2 November 2026: the build tasks that came out of the M15.58 research are minted now, and nothing else is done. M15.58 stays `Not Started`, and no branch or worktree is created. The scope document (the section "What GDPR asks of Sorrel & Salt") and the privacy-policy changes wait for M15.58 itself, which waits for #1479 to merge. If writing the scope later shows a task here is wrong, that task is corrected in place.

**Ids.** The highest M15 id in any branch's git log is M15.72, so the new tasks are numbered from **M15.73**. I recheck the board and `git log --all` immediately before minting, because other sessions mint ids in parallel.

### Your question: how a person's identity is checked

**I recommend this: a request counts as verified when the account sends it while signed in.** The account's existing sign-in (password, passkey or a provider, plus two-factor where it is on) is the identity check.

1. **A signed-in request is already verified.** The `privacy` subject on `/support?support=privacy` records the sender as `created_by` (`src/modules/support/schema/support-requests.ts`). A paused account can still sign in and reach support (`src/graphql/paused-operations.ts`), so pausing never stops anyone from asking.
2. **A signed-out request is not acted on directly.**
   - It carries only an address the sender typed (`sender_email`), which proves nothing.
   - The admin replies asking the person to sign in and send the request from their account.
   - If the person cannot sign in any more, the admin mails the address held on the account (never the typed address) and acts once that mailbox replies. The address on the account was verified at sign-up, so a reply from it proves the person controls it.
3. **The site never asks for an identity document.** The ICO says a check should be proportionate, and asking for a passport here would collect more data than the account itself holds.
4. **The one-month clock (Art. 12(3)) starts once identity is confirmed.** This is the ICO's reading. The writer confirms it against the ICO's subject-access guidance, which changed in July 2026 under the Data (Use and Access) Act 2025, before the scope cites it.

This needs no extra task. It becomes criteria on M15.74 below and a paragraph in the privacy policy.

### Tasks to mint (Wave 15 — Launch, `claude-docs/tasks/m15.md`)

**M15.73 — Mark an Account as Erased** · 1h _(the schema half; the behaviour follows in M15.74)_
_Story:_ As the site, I want an erased account marked as erased, so that nothing can lift the pause on it or show it as a person.

- `users` gains a nullable `erased_at` timestamp, added in an expand-only migration with no destructive DDL.
- A CHECK ensures an erased row's email is the placeholder form `erased-<id>@invalid`.
- No service writes the column yet. The migration test covers both the column and the check.

**M15.74 — Erase an Account in Place When Its Holder Asks** · 6h
_Story:_ As a keeper answering a privacy request, I want to erase everything that identifies the person behind an account while keeping the account, so that the site honours erasure under the rule that an account is paused, never closed.

- An admin-only `eraseAccount(userId, supportRequestId, note)` runs through `assertSiteAdmin`. A curator or member is refused, by direct id as well, and the test shows what the refusal stops.
- It is refused, each with an explaining error, when:
  - the request was not sent while signed in by that same account (the identity rule above);
  - the account is the System account or the signed-out sender account;
  - the account holds a keeper or curator role, which must be removed first so the ledger records it;
  - the account owns a coven where it is the only steward.
- In one `withAudit` transaction it:
  - sets `name`, `image`, `former_email` and `pending_email` to null or a placeholder;
  - sets the email to `erased-<id>@invalid` and sets `erased_at`;
  - hard-deletes the account's `sessions`, `accounts`, `passkeys`, `two_factors`, `sign_in_failures` and outstanding `verifications`;
  - sets an open-ended site pause whose note names the request;
  - anonymises the account's own support threads with M15.46's anonymiser;
  - clears the address on any open invitation to it;
  - clears a working-participant name that is the account's.
- A pause on an erased account cannot be lifted, and the refusal explains why.
- Content the account wrote in shared covens stays with each coven, credited to no name. The privacy policy says so.
- The person can sign up again with the same address, and gets a new, empty account.
- An Erase Account button with a confirmation dialog sits in the People page's user modal, admin only.
- The privacy policy's "How to Ask for Removal" and the Terms of Use's "Leaving" section are updated to describe exactly this. The policy also gains the identity paragraph.
- Proved by a browser story: a keeper erases an account from its signed-in request, the person can no longer sign in, and nothing shows the old name.

**M15.75 — Sweep Expired Sign-In Rows** · 2h
_Story:_ As the person running the site, I want expired sessions, verifications and rate-limit counters removed on a schedule, so that the site keeps security data no longer than it needs.

- The existing daily job (`src/lib/jobs`, M15.49) hard-deletes:
  - `sessions` past `expires_at`;
  - `verifications` past `expires_at`;
  - `rate_limits` rows older than their longest window.
- These deletes are named exceptions in `.claude/rules/database.md`. They run as the System account.
- A test seeds rows on both sides of each cut-off.
- The privacy policy states each period: sessions 7 days, plus each other period exactly as coded.

**M15.76 — Drop the Last-Used Sign-In Method Cookie** · 1h
_Story:_ As a visitor, I want the site to set only the cookies it strictly needs, so that it never needs a consent banner.

- The `better-auth.last_used_login_method` cookie (`src/lib/sign-in.ts:78`) and the "last used" hint on the sign-in page are removed.
- The privacy policy's cookie list loses it.
- A test asserts that signing in sets no cookie outside the authentication set.
- Why remove rather than keep it: under PECR reg. 6 and ePrivacy Art. 5(3) a convenience cookie needs consent, and the hint is too small to justify a consent banner.

**Edit to M15.61 (not a new task):** M15.61's criteria gain the Art. 15 copy. A person can get every row that names them, as well as their own writing, in a machine-readable file. Its estimate is rechecked.

### Not tasks: decisions for you, recorded later in the scope

- **The Vercel plan.** Hobby has no data processing agreement, and Pro has one. Pro also settles the existing non-commercial-use risk in `DESIGN.md` §4.
- **An Art. 27 EU representative.** This applies only if Art. 3(2) reaches the site. The scope weighs it.

### Steps after approval

1. Recheck the ids against the board and `git log --all`.
2. In a worktree `/home/node/worktrees/m15.58-tasks` on `feature/m15.58-mint-gdpr-tasks` off `origin/staging` (never `/app`):
   - add the four entries and the M15.61 edit to `claude-docs/tasks/m15.md`, after the Done items;
   - add the four entries to `TASKS.md`'s index and execution order.
3. File each issue through the create-feature-task flow (`node scripts/task-board.mjs`), with the drafts above as the approved text, then run `task-board.mjs sync` from the worktree.
4. Run `npm run format:check` and `npm run lint` only. No tests, because the change is prose.
5. Commit in the worktree. No push and no PR unless you ask.

## A keeper editor for the site's documents

The privacy policy, the disclaimer, the code of ethics and the terms of use
are written into their pages' code (`src/app/(public)/privacy/page.tsx` and
its three siblings). Each page holds its own "last updated" date as a
constant, and the terms also hold their version, `TERMS_VERSION` in
`src/lib/terms-version.ts`. Changing a word in any of them needs a developer,
a PR and a deploy.

This record says how a site keeper edits and publishes them from the admin
section instead. It answers each decision the task listed, with its reason and
the alternatives weighed, and names the build tasks. The owner made the
decisions marked as theirs on 2026-11-02; the rest follow from them and from
the rules in `CLAUDE.md`. `DESIGN.md` is not changed by this record: the
builds change it as they land (see "DESIGN.md sections the builds change").
On the owner's call, the builds and M15.63 (emailing every account about a
change) are built in the same group PR as this record.

### The tables

**Two tables: `documents` and `document_versions`.**

- **`documents`** holds one row per document: `id`, `key` (`privacy`,
  `disclaimer`, `code-of-ethics` or `terms`), `title`, `lede`, `seedKey`, plus
  the audit columns (`...auditColumns`). A partial unique index on `key`
  (`WHERE deleted_at IS NULL`). The set of documents is fixed by the seed: an
  admin edits a document and never creates or deletes one, because each
  document has its own public route and footer link in code.
- **`document_versions`** holds one row per version: `id`, `documentId`,
  `number`, `body` (markdown text), `status` (`draft` or `published`),
  `publishedAt` (null on a draft), `revisionColumn()`, plus the audit columns.
  - A partial unique index on `(documentId, number)` `WHERE deleted_at IS NULL`.
  - A partial unique index on `(documentId)` `WHERE status = 'draft' AND deleted_at IS NULL`,
    so a document has at most one open draft.
  - A CHECK: `publishedAt` is set exactly when `status = 'published'`.
  - A published row is never edited again. A change starts a new draft,
    copied from the latest published body, with the next `number`.
    Publishing turns the draft into the next published version.

Why two tables: the document's identity (its key, its route, its title) does
not change between versions, and a version is what a user agrees to and what
the history pages show, so each version is a row that can be cited by its
number.

Alternatives weighed:

- **One `documents` row with a JSON history column.** Rejected: a version
  could not be referenced by key from `users`, and the history list could not
  page through the M3.6 cursor helper (rule 8).
- **Draft and published bodies as two columns on `documents`.** Rejected: it
  keeps no history, which the history pages need.

### Who may edit and who may publish

**Site Keepers only, for both** (the owner's decision). Every service function
that writes calls `assertSiteAdmin(session)`, and the admin nav entry is
`adminOnly: true` in `src/components/AdminNav/sections.ts`, so a curator does
not see it.

Why: these are legal texts. Publishing the terms sends every account back
through the acceptance page, and the privacy policy states what the site
promises about personal data. Neither is compendium curation.

Alternatives weighed:

- **Curators edit and publish** (`assertCurator`, as the vocabularies do).
  Rejected: a curator could force every user to agree to the terms again.
- **Curators draft, keepers publish.** Rejected: it adds a second permission and
  a hand-off state for a team that is one keeper today.

The `CLAUDE.md` line "Admins and curators curate the compendium, …" gains the
site's documents, as an admin-only resource, when the editor lands.

### The text format, and how the page shows it

**The body is GitHub-flavoured markdown (GFM).** Sources are GFM footnotes
(the owner's decision): a sentence ends with `[^3]`, and the citation is
written once as `[^3]: <Chicago-form citation>`. Footnotes are text inside the
body, so they need no column or table of their own.

Why footnotes: every source on a legal page is marked from the sentence it
supports, with a link down to the Sources list and a link back. Today that is
the hand-matched `SourceMarks` and `SourceItem` components in
`src/components/DocumentPage/`. GFM footnotes are the standard markdown form
of the same thing, and remark-gfm already numbers them and builds both links.

Alternative weighed: **a separate sources field**, a structured list edited
beside the body, with `[3]` marks in the text. Rejected by the owner: more
editor screens and more validation, for something the markdown already
expresses.

**Rendering is on the server, with unified:** `remark-parse` and `remark-gfm`
read the markdown, `remark-rehype` turns it into HTML nodes, and `rehype-react`
turns those into React elements, with `h2`, `h3`, `a`, the footnote marks and
the footnote list mapped to the site's own components.

- **No raw HTML.** HTML inside the markdown is never turned on (no
  `rehype-raw`), so an HTML tag in a body is printed as text, not run.
  This is why no separate sanitiser is needed. Alternative weighed:
  `rehype-sanitize` over allowed HTML. Not needed while nothing allows HTML.
- **Links:** only relative paths, `https:` and `mailto:` are rendered as
  links; any other scheme is rendered as plain text. Links to other pages on
  the site use `next/link`.
- **"On This Page":** the headings are read from the markdown syntax tree,
  each `##` an entry and each `###` under it a sub-entry, and given the same
  `slugify` ids as today. This replaces `withSections()`'s walk over the JSX
  children, which only works on hand-written elements.
- **The shared document page stays.** `DocumentPage` (M15.2) keeps its title,
  lede, "Last updated" line, layout and styles; its body comes from the
  renderer instead of children.
- **What the page code embeds today becomes markdown:** `SupportLink` becomes
  a relative link such as `?support=privacy`, which opens the support dialog on
  the same page (a link to `/support` would leave the document), and the privacy policy's `AccessCards` table
  becomes a GFM table.

### Editing on the page

**The keeper edits formatted text in place** (the owner's decision), at
`/keepers/documents/<key>`. The edit page uses the same `DocumentPage` layout
and styles as the public page, so the keeper edits what the reader will see.
A small toolbar offers only what the renderer can draw: second- and
third-level headings, bold, italic, a link, a list, a table and a footnote.

Why a separate admin route and not editing at `/terms` itself: to show the
edit controls only to a keeper, the public page would have to read the
session on every visit, and it could no longer be cached or stay sessionless.

Alternatives weighed:

- **Markdown in a text area beside a live preview.** Rejected by the owner,
  who wanted to edit the formatted page.
- **Click a section to turn it into a markdown text area in place.** Offered,
  and the owner chose formatted editing over it.

#### The editor library: Plate, with Milkdown as the fallback

Plate (`platejs`, `@platejs/markdown` and `@platejs/footnote`) is the only
candidate that reads and writes GFM footnotes without parsing code we would
write ourselves, and it does so through remark-gfm, the same parser as the
server renderer. It is MIT-licensed. The owner approved Plate with the plan.

The research, 2026-11-02 (npm figures are weekly downloads; sizes are
minified and gzipped, with dependencies, from bundlephobia):

| Library   | Footnotes                                                                                                                                                                                  | Markdown parser             | Licence                                   | Latest release, downloads              | Gzip size                          |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- | ----------------------------------------- | -------------------------------------- | ---------------------------------- |
| Plate     | Yes: `@platejs/footnote` reads and writes GFM footnotes                                                                                                                                    | remark-gfm                  | MIT                                       | 2026-10-30; 218k (`@platejs/markdown`) | about 104 kB core, 141 kB markdown |
| Milkdown  | No; the request is open ([#2008](https://github.com/Milkdown/milkdown/issues/2008))                                                                                                        | remark-gfm                  | MIT                                       | 2026-10-27; 387k                       | core not measured                  |
| TipTap    | No free one; the paid footnote extension is an unpublished alpha ([changelog](https://tiptap.dev/docs/resources/changelog/pro-extension-footnotes)), and the community one has no markdown | MarkedJS                    | MIT core; Pro extensions paid             | 2026-10-30; 2.28M (`@tiptap/markdown`) | about 37 kB core, 19 kB markdown   |
| Lexical   | A third-party package pinned to an older Lexical; `@lexical/mdast` is experimental ([docs](https://lexical.dev/docs/packages/lexical-mdast))                                               | its own; mdast experimental | MIT                                       | 2026-10-28; 3.2M (`@lexical/markdown`) | about 69 kB core, 83 kB markdown   |
| MDXEditor | No ([#194](https://github.com/mdx-editor/editor/issues/194))                                                                                                                               | mdast                       | MIT                                       | 2026-11-02; 769k                       | about 583 kB                       |
| BlockNote | No; its own docs call markdown export lossy ([docs](https://www.blocknotejs.org/docs/features/export/markdown))                                                                            | its own                     | MPL-2.0; some packages GPL or proprietary | 2026-10-30; 473k                       | about 190 kB core                  |
| Remirror  | No                                                                                                                                                                                         | not checked                 | MIT                                       | 2025-08-02; 42k                        | about 48 kB                        |

Plate's footnotes are described in its package README
(<https://github.com/udecode/plate/tree/main/packages/footnote>).

No library keeps the markdown byte for byte: each parses it and writes it
back, which can change spacing or list markers. So the editor saves only when
the keeper has changed something, and the seed stores each document as the
editor writes it, so an unchanged load and save produces no change.

**The editor build opens with a spike** that loads one real document in Plate
and checks that it builds on this repo's React and Next.js, that a footnoted
document loads and saves unchanged, that axe passes on the editable area and
the toolbar, and that the route bundle stays reasonable. If Plate fails, the
build uses Milkdown with a footnote node of our own, over
`mdast-util-gfm-footnote`. The editor is loaded with a dynamic import on the
admin route only, so the public pages never ship it.

### Publishing the terms

**A newly published version of the terms, the disclaimer or the code of
ethics is part of the version the gate checks.** The terms include the other
two, so an account agrees to all three at once
(see "Agreeing to the terms covers the disclaimer and the code of ethics").
`getSessionState()` in `src/lib/request-session.ts` compares the account's
three agreed numbers with the three published ones, so every account is sent
to `/account/terms` at its next request after any of the three is published.

- The editor's publish confirmation for each of the three says so in plain
  words: that every account will be asked to agree again before it can use
  the site.
- `agreeToTerms` takes the three version numbers the account was shown and
  refuses any combination that is no longer current, with an explaining
  error. Otherwise an account reading the old text while a keeper publishes
  would be recorded as agreeing to text it never saw.
- The privacy policy has no gate: publishing it changes the page and nothing
  else.

### The version identifier

**A version is a whole number per document: 1, 2, 3** (the owner's decision).
The date a reader sees is the version's own `publishedAt`, a separate column,
so a document can be published twice in a day and each version still has its
own identifier.

Why: today's bare date (`'2026-11-02'`) allows one version a day, and it ties
the identifier to the shown date.

Alternatives weighed:

- **The publish timestamp as the identifier.** Unique, but the identifier
  and the shown date are then the same value, which the task asked to keep
  apart.
- **A date with a suffix for a second same-day version** (`2026-11-02.2`).
  Keeps today's stored value valid, but is a format of our own invention.

**The change to `users` is expand and contract** (rule 10):

1. **Expand:** add `users.agreed_terms_version`, an integer, and backfill it
   with 1 wherever `terms_version = '2026-11-02'`, so every account that agreed
   to today's terms has agreed to version 1. The code switches to the new
   column.
2. **Contract**, in its own later PR: drop `users.terms_version` and
   `src/lib/terms-version.ts`.

The seeded accounts in `src/db/seed/standard.ts` agree to version 1.

### History

**Every published version stays readable by everyone** (the owner's
decision), at `/<document>/versions/<number>`, linked from the document page
as a list of earlier versions with their dates. A draft is never public.

Why: an account can always read the exact terms it agreed to, and the privacy
policy's earlier promises stay on record.

Alternatives weighed: **history for keepers only**, and **no readable
history**. Both were offered; the owner chose public history.

**What is kept on record:** every published version, forever (a published row
is never edited or soft-deleted); and on each account, `agreed_terms_version`
and `terms_accepted_at`, which together say which terms it agreed to and when.
The privacy policy still records no per-account acceptance, as today.

### Caching

**The published documents are cached under their own tag, `documents`,
cleared on every publish.** They are not workspace-scoped and are the same for
every viewer, so rule 6 allows it.

- A helper beside `src/lib/compendium-cache.ts` wraps `unstable_cache` the
  same way, with the tag `documents`, and `publishDocumentVersion` calls
  `revalidateTag('documents', { expire: 0 })`.
- Drafts and the admin edit page are never cached.
- `CLAUDE.md` rule 6's list of cacheable things gains the site's published
  documents when this lands.

Alternative weighed: **sharing the `compendium` tag.** Rejected: publishing a
document would empty the compendium's cache for nothing.

### Moving the four documents into rows

**Each document becomes a markdown file under a repo-root `documents/`
folder** (`documents/terms.md` and so on), with YAML front matter for the
title and lede, and is seeded idempotently as published version 1, the same
way the compendium seed reads `compendium/` (`src/db/seed/compendium/load.ts`,
`src/db/seed/idempotent.ts`).

- Version 1's `publishedAt` is each page's current `UPDATED_ON`, so the shown
  dates do not change.
- The seed writes a document only when it has no version yet: once a keeper
  has published a version, the seed never overwrites it.
- The page code's text and its date constants are removed in the same task.

### M15.63: emailing every account

M15.63 builds the "Email Every Account" button. It was first built on each
document's edit page, one mailing per document; M15.79 replaced that with one
joint email from `/keepers/documents` about every document changed since the
last email (claude-docs/design-decisions/support.md, "One joint email about every changed document").
Where this section and that record differ, that record holds. The tables
came first, in the tables task, so M15.63 itself is behaviour only:

- **`document_mailings`**: `id`, `documentVersionId`, `summary` (the short
  line the admin writes about what changed), `status` (`sending`, `paused`,
  `sent` or `replaced`),
  `recipientCount`, `finishedAt`, plus the audit columns. A partial unique
  index on `documentVersionId`, so a version is mailed at most once. Since
  M15.79 the two columns are nullable and empty in a new mailing, and the
  documents a mailing covers are its `document_mailing_items`.
- **`document_mailing_recipients`**: `mailingId`, `userId`, `sentAt` (null
  until sent), with a unique index on `(mailingId, userId)`, so a retried
  batch never mails an account twice.

The sending runs on the durable job routes (M15.49), paced so that one
mailing never loads the server or the mail provider. Each step mails at most
25 accounts, one after another. The job then sleeps 60 seconds with the
durable `sleep`, which holds no request open, before the next batch. Only
one mailing sends at a time. A new mailing replaces every mailing still
sending or paused: the old mailing is marked `replaced` and stops before its
next batch, since the new one covers everything it did with newer text, and
the new one mails every account. Refusing the second mailing was weighed and
rejected: the admin wants the newer text to go out, not to wait for an
outdated mailing to end. At 25 accounts a minute, 1,000 accounts take
about 40 minutes. Two faster options were weighed and rejected: sending
every email in one step would hold one function open for the whole list, and
sending in parallel would hit the provider's rate limit. The two numbers are
named constants, so they can be changed in one place.

Production sends through Resend's free plan, which allows 10 requests a
second and 100 emails a day, reset at midnight UTC
([resend.com/docs/api-reference/rate-limit](https://resend.com/docs/api-reference/rate-limit);
[resend.com/pricing](https://resend.com/pricing)). The pace above is well
under the rate limit, but the daily quota is shared with every other email
the site sends, and email verification failing would lock new accounts out.
So a mailing sends at most 60 emails in a UTC day, leaving 40 for the rest.
At the cap, the run ends instead of sleeping overnight, and a daily Vercel
Cron call (`/api/cron/document-mailing`, 05:00 UTC) starts it again the next
day. A `daily_quota_exceeded` refusal ends the run the same way. A
`monthly_quota_exceeded` refusal sets the mailing to `paused` and ends the
run, since the next day will not help: the panel shows Resume Mailing, and an
admin resumes it once the allowance renews. When a run ends, it starts the
run for the oldest mailing still sending, so a mailing left waiting follows. At 60 a day,
1,000 accounts take 17 days. Moving to a paid plan, which has no daily
limit, needs only the cap constant changed.

### Not in scope

**Reusing the editor on ingredient and spell pages.** An ingredient page is
mostly structured fields (names, categories, deities, vocabularies, variants,
references) that a text editor cannot edit. Its free-text fields
(`description` and `safety_notes` on `ingredients`, `ingredient_variants` and
`workspace_compendium_entries`) are plain text today, and its sources are
`references` rows, not footnotes. M17.5 scopes a better editing experience for
ingredients and spells, and decides there whether those fields become
markdown edited with this editor.

### DESIGN.md sections the builds change

- **§5 Data model:** the four new tables and `users.agreed_terms_version`.
- **§7, "Caching — three layers in v1":** the `documents` tag.
- **§9 Routes and components:** `/keepers/documents` and
  `/keepers/documents/<key>`, `/<document>/versions/<number>`, and the rows for
  `/privacy`, `/disclaimer`, `/code-of-ethics`, `/terms` and `/account/terms`,
  which now read from the database.
- **§14 Decision log:** keepers curate an eleventh resource, the site's
  documents.

### Build tasks

Minted 2026-11-02 in [`tasks/m15.md`](../tasks/m15.md), "Legal", and built in
one group PR with this record and M15.63, bar the contract.

| Id     | Name                                                        | Estimate |
| ------ | ----------------------------------------------------------- | -------- |
| M15.69 | The site documents' tables (table)                          | 3h       |
| M15.70 | The site's documents are read from the database             | 8h       |
| M15.71 | A keeper edits and publishes the site's documents           | 10h      |
| M15.72 | Drop the old terms version column and constant              | 1h       |
| M15.63 | (existing) Email every account when a site document changes | 6h       |

Placement in Wave 15's row: `M15.59 · M15.69 → M15.71 · M15.63`, then the
rest as before, with M15.72 after M15.67. Why there: each build needs the one
before it, M15.63's button sits on M15.71's edit page, and M15.72 drops a
column only after the expand has been deployed.

### Why the tables get their own module

The existing modules own accounts and access (`identity`), covens, vocabularies,
ingredients, the grimoire and support requests. The privacy policy, the
disclaimer, the code of ethics and the terms belong to none of them: they are
not a coven's data, not a curated vocabulary, and not a message from a user.
Putting them in `identity` because the terms are agreed to at sign-in would make
that module own the text of three documents that have nothing to do with
accounts. So the four tables live in a `documents` module, which reaches only
`identity` (for `SiteAdmin`, the audit users and the `users` foreign key).

## Scope a keeper editor for the site's documents (plan)

### Context

The privacy policy, disclaimer, code of ethics and terms of use are written into page code (`src/app/(public)/{privacy,disclaimer,code-of-ethics,terms}/page.tsx`). Each page holds its own `UPDATED_ON` date. The terms also have `TERMS_VERSION = '2026-11-02'` in `src/lib/terms-version.ts`, and that string is what `users.terms_version` stores and what the gate in `src/lib/request-session.ts:67` compares. Changing a document needs a developer, a PR and a deploy.

M15.59 is a scoping task. It writes `claude-docs/design-decisions/support.md`, "A keeper editor for the site's documents", proposes the build tasks, and mints them only once you approve them. It builds nothing, and `DESIGN.md` does not change in this task.

This PR also mints one extra scoping task that you asked for: a better editing experience for ingredients and spells, in Wave 17.

### Decisions you made (2026-11-02)

- **Who edits and publishes:** site keepers only (`assertSiteAdmin`). The admin nav entry is `adminOnly: true`.
- **Version identifier:** a number per document (1, 2, 3, ...). The shown "Last updated" date comes from the version's own `published_at` column. The current terms (`2026-11-02`) become version 1, and users who agreed to them are carried over.
- **Source marks:** standard GFM footnotes (`[^1]`), rendered into the existing `SourceMarks` / `SourceItem` look, with return links. They are text inside the markdown body, so they need no extra column or table.
- **History:** every published version stays publicly readable at its own URL, linked from the document page.
- **Editing view:** formatted text, edited in place, at `/admin/documents/<document>`, laid out with the same `DocumentPage` layout and styles as the public page. The public pages stay sessionless and cached.
- **Fewer build tasks:** four tasks.
- **Ingredients and spells:** a separate Wave 17 scoping task, not part of these builds.

### Editor library: Plate, with Milkdown as the fallback

You have not chosen a library: your answer to that question came through as "Other" with no text. **Approving this plan approves Plate.** If you want a different library, reject the plan and name it.

The reason for Plate: `@platejs/footnote` and `@platejs/markdown` read and write GFM footnotes through remark-gfm, the same parser as the server renderer. It is MIT-licensed and was last released 2026-10-30. No other candidate supports footnotes without hand-written parsing.

The record keeps the research table that compares TipTap, Milkdown, Lexical, MDXEditor, BlockNote, Plate, Remirror and plain ProseMirror, with its sources.

The editor build task opens with a spike (a short trial build), loading one real document in Plate to check four things:

1. it builds on React 19.3.1 and Next 16.4.3;
2. a footnoted document loads and saves without breaking;
3. axe passes on the editable area and the toolbar;
4. the route bundle stays reasonable.

If Plate fails the spike, the task switches to Milkdown with a hand-written footnote node.

### What the record will decide (the parts I settle, each with its reason and the alternatives weighed)

1. **The tables.**
   - `documents` holds one row per document: a fixed `key` (`privacy`, `disclaimer`, `code-of-ethics`, `terms`), the title, the lede, `seedKeyColumn()` and `...auditColumns`.
   - `document_versions` holds `document_id`, `number`, `body` (markdown text), `status` (`draft` or `published`), `published_at`, `revisionColumn()` and `...auditColumns`.
   - Two partial unique indexes, both `WHERE deleted_at IS NULL`: one on `(document_id, number)`, and one on `(document_id) WHERE status = 'draft'`, which allows one open draft per document.
   - A published row is never edited; a change starts a new draft.
2. **Rendering.**
   - Rendering is on the server with unified (`remark-parse`, `remark-gfm`, `remark-rehype`, `rehype-react`). Raw HTML is never enabled, so there is no separate sanitiser; `rehype-sanitize` is the alternative weighed.
   - Link URLs are limited to relative paths, `https:` and `mailto:`.
   - The "On This Page" headings are taken from the markdown syntax tree, replacing `withSections()`'s walk over JSX children.
   - `SupportLink` becomes a plain `/support` link, and the privacy page's `AccessCards` becomes a GFM table.
   - The editor saves only when the keeper has actually changed something, because every editor rewrites markdown slightly when it saves.
3. **Publishing the terms.**
   - A newly published terms version becomes the version the gate checks.
   - The publish confirmation for the terms says that every user will be sent to the acceptance page.
   - `agreeToTerms` takes the version number the user was shown and refuses one that is no longer current.
4. **Version mechanics (expand and contract).**
   - First, add `users.agreed_terms_version integer`, backfilled to 1 where `terms_version = '2026-11-02'`.
   - Later, in its own PR, drop `terms_version` and `src/lib/terms-version.ts` (rule 10: a column drop is two PRs).
5. **History and records.**
   - Published versions are readable at `/<document>/versions/<n>`.
   - `terms_accepted_at` plus `agreed_terms_version` record what each user agreed to and when.
   - The privacy policy still records no acceptance.
6. **Caching.** A new tag, `documents`, has its own helper beside `src/lib/compendium-cache.ts`, uses the same pattern, and is cleared on every publish. The record names the CLAUDE.md rule 6 line the build will amend.
7. **Moving the documents into rows.** Each document becomes a markdown file under a repo-root `documents/` folder, seeded idempotently as published version 1, like the `compendium/` seed (`src/db/seed/compendium/load.ts`, `src/db/seed/idempotent.ts`).
8. **DESIGN.md sections the builds will change:**
   - §5, the schema;
   - the §9 route table (`/privacy` … `/account/terms`);
   - "Caching — three layers in v1";
   - "Compendium and admin".

   I check the section numbers before writing them down.

9. **Reuse on ingredient and spell pages (out of scope).**
   - The free-text fields (`description` and `safety_notes` on `ingredients`, `ingredient_variants` and `workspace_compendium_entries`) are plain text today.
   - Everything else on an ingredient page is structured fields that a text editor cannot edit.
   - Sources there are `references` rows, not footnotes.
   - The record points to the Wave 17 scoping task below.

### Proposed build tasks for the document editor

Each task gets a story, acceptance criteria and an estimate in the record, and is minted after you approve it. The ids are the next free M15.x (M15.69 onward, rechecked at minting).

| #   | Task                                                                                                                                                                                                                                                                                                                                                                | Estimate |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| A   | **Tables:** `documents`, `document_versions`, and `users.agreed_terms_version` backfilled to 1 (the expand step), with the migration and repository finders                                                                                                                                                                                                         | 3h       |
| B   | **Documents from rows:** the four documents as seeded markdown files; the markdown renderer in `DocumentPage` (footnotes, heading nav, link allow-list); the public pages read the cached published version; the public `/versions/<n>` pages (depends on A)                                                                                                        | 8h       |
| C   | **Admin editor and publishing:** the Plate spike, then `/admin/documents` (`adminOnly`) with in-place editing, save draft, and publish with confirmation and the terms warning; services under `assertSiteAdmin`; GraphQL mutations; clearing the cache tag; the terms gate and `agreeToTerms` switch to the published number and refuse a stale one (depends on B) | 10h      |
| D   | **Contract:** drop `users.terms_version` and `src/lib/terms-version.ts` (depends on C, in a later PR)                                                                                                                                                                                                                                                               | 1h       |

### New Wave 17 scoping task (minted in this PR)

The id is the next free M17.x: M17.5, since M17.4 is #1482. I recheck it at minting.

**M17.5 — Scope a Better Editing Experience for Ingredients and Spells** · 2h

- _Story:_ As a coven member or a curator, I want to edit an ingredient or a spell more easily, so that changing an entry does not mean working through a long modal form.
- _Description:_ A scoping task. It writes `design-decisions/m17.5-ingredient-and-spell-editing-scope.md` and mints the build tasks it finds, each with the owner's approval. It builds nothing. It decides:
  - **What is awkward today:** the ingredient edit modal (M8.17), the Add Ingredient modal (M8.16) and the spell builder (M10.12–M10.16), listed screen by screen.
  - **In-place editing of structured fields:** whether names, categories, deities, vocabularies, variants and references can be edited on the page itself, and with which existing controls (Combobox).
  - **Rich text for the free-text fields:** whether `description` and `safety_notes` on ingredients, variants and coven annotations, and the spells' free text, become markdown, edited with M15.59's editor (Plate). It also decides what happens to existing text, and how the compendium seed files carry the format.
  - **Permissions:** each page keeps its own service check (curators for the compendium, members for a coven), so the shared editor takes no permission of its own.
  - **Autosave and conflicts:** how it fits the spell autosave and leave guard (M13.14–M13.19) and the revision column (M13.15).
- _Acceptance criteria:_
  - Each decision above is recorded with its reason and the alternatives weighed.
  - The follow-up builds are proposed with stories, criteria and estimates, a table task before every behaviour task that needs it, and are minted only after the owner approves them.
  - `DESIGN.md` is not changed until the builds land; the record names the sections they will change.
  - `npm run format:check` and `npm run lint` pass; no test run is needed for a prose diff.

### Steps

1. **Branch.** In a worktree, since your memory says never to work in /app: run `git fetch origin staging` and the collision checks, then `git worktree add -b feature/m15.59-scope-admin-editor-for-sites-documents --no-track /home/node/worktrees/m15.59 origin/staging`. Comment on #1458 and move it to `In Progress`.
2. **Write the record.** Write `claude-docs/design-decisions/support.md`, "A keeper editor for the site's documents" from the main session, which already holds every fact it needs. It follows the section "A support form, reviewed by keepers"'s shape: title, status and date line, an intro, one `##` per decision with its reasons and alternatives, the library research table with sources, `## DESIGN.md sections the builds change`, and `## Build tasks`. Copy this plan to `claude-docs/design-decisions/support.md`, "Scope a keeper editor for the site's documents (plan)".
3. **Mint the tasks.** Recheck the ids, then mint build tasks A–D and M17.5:
   - add each entry to `claude-docs/tasks/m15.md` or `claude-docs/tasks/m17.md`, after the Done items;
   - place each in `claude-docs/waves/wave-15.md` or `claude-docs/waves/wave-17.md`;
   - mint each through `node scripts/task-board.mjs`;
   - run `task-board sync` from the worktree.

   The task ids go in the commit's subject line, the way `65854bac3` did.

4. **Verify.** Run `npm run format:check` and `npm run lint` in the worktree. This is a prose diff, so no tests run.
5. **Stop.** I tell you it is ready. Committing and opening the PR wait for `/create-pr`.

### Verification

- `format:check` and `lint` pass, with the exit codes logged to `.reports/`.
- Every decision bullet in #1458 has a section in the record, with its reasons and alternatives.
- `git diff origin/staging --stat` shows no change to `claude-docs/DESIGN.md`.
- The board shows the four M15 build tasks and M17.5 with the right milestones, and nothing else new.

### Changed after approval (2026-11-02)

The owner then asked to add M15.63 and build everything in one group PR: this record, build tasks M15.69 to M15.71 and M15.63. M15.72, the column drop, stays its own later PR (rule 10). M15.63's two tables move into M15.69, so that M15.63 is behaviour only.

## A way for people to take their own writing with them

The code of ethics promises "a way for people to take their own writing with
them" and says it "does not exist yet" (`documents/code-of-ethics.md`).
(see "What GDPR asks of Sorrel & Salt") gave this task two more jobs: a
machine-readable copy of every row that names the person (GDPR article 15,
the right of access) and a copy of the person's own writing in a structured
format (article 20, portability).

This record says what the copy holds, how it is built, stored and delivered,
and which tasks build it. It builds nothing. The plan the owner approved is
(see "Scope a way for people to take their own writing with them (plan)"), which is not maintained; this record is.
It is not legal advice and no lawyer has read it.

The privacy work moves to a new wave, **Wave 18 — Privacy**, run after launch.
It takes M15.61 and M15.73 to M15.76 from Wave 15 and adds M18.1 to M18.9.

### Decisions for the owner

The owner decided these on 3 November 2026. Nothing is left for the owner to
decide before this PR merges.

1. Staff notes about a person go in the copy, and every staff note field gets
   a hint saying so.
2. Deleted rows go in, marked deleted.
3. A coven the person has left gives membership and counts only. The leave
   dialog points to the copy first.
4. A whole-coven export for coven stewards is part of this set.
5. A low-priority job builds the copy and mails a link to it. Requests are
   rate limited. A keeper can queue a copy for an account that cannot sign in.
6. Copies are built in the once-a-day batch.
7. The GDPR work goes in its own wave.
8. Changes to the live documents are written as exact text, to publish in the
   admin editor.
9. A second request inside the week is queued, not refused.
10. The download page asks for an emailed code first.
11. The code-of-ethics change goes live when the person's export lands
    (M18.5). This scope edits only the seed file.
12. Only keepers may send a copy to an account that cannot sign in. A
    curator's own copy and their own coven's export work like anyone's.
13. The data-copy code is built so erasure (M15.74) can reuse its pieces.
14. The copies stay in Postgres, not Vercel Blob (see "Storage").

### What the person's copy holds

**Part 1, "Your writing" (article 20).** Rows the person created
(`created_by`) in their current covens:

- spells, their own private ones included, with steps, assigned categories and
  workings;
- coven ingredients with variants, substitutes, folk names, deities and
  references;
- stock rows;
- the coven's annotations on compendium entries;
- their own support requests and messages.

`updated_by` holds only the last editor, and the site keeps no edit history.
So a row someone else created and this person later changed is not "theirs" in
part 1. It appears in part 2 by kind, title and date.

**Part 2, "Everything that names you" (article 15).**

- The account: the account row, sessions, providers by name, and passkeys by
  label and date.
- Covens: memberships, coven pauses, invitations, and card attempts.
- Staff records: site pauses, support time-outs, and the privilege ledger (the
  record of role changes).
- Sign-in and mail: sign-in failure counts and document mailings.
- Workings that name them.
- Rows they last changed but did not create, by kind, title and date.
- Rows where they were only the actor, by kind, id and date.
- An "about" section linking the privacy policy.

**A coven the person has left contributes only its membership row and counts.**
That holds in every section: the workings, "last changed" and "only the actor"
lists carry no titles and no ids.

**A deleted coven counts as current, with its rows marked deleted, only if the
person was still a member when it was deleted.** The site still holds those
rows (decision 2). If the person had left before the coven was deleted, the
left-coven rule applies. The leak test has a fixture for each of the three
cases: left, deleted while a member, and left and then deleted.

**Left out:** secrets (the password hash, provider tokens, two-factor
material, passkey keys, every token and token hash), `rate_limits` rows, and
other people's details.

Alternatives weighed:

- _A single full dump of every row._ Rejected: it would carry other people's
  details and secrets, which article 15(4) forbids harming.
- _Only the person's own writing._ Rejected: it meets article 20 but not
  article 15, which covers everything that names the person.

### Guards against sending other people's details

Another person appears by name only where the app already shows that name to
the requester: co-members of a current coven, and staff on support replies the
person can see. Three places take a role label such as "a site keeper" or "a
former member" instead of a name:

- the authors of internal support replies, which the person never sees;
- the keeper named in `sessions.impersonated_by`;
- every name in a left coven.

The guards, in layers:

1. **SQL filters, under a named rule 5 exception.** The batch runs as the
   System account with no session, so it holds no `Membership` proof (the
   branded value a coven finder normally requires). The copy's finders become
   a named exception to CLAUDE.md rule 5:
   - each takes the subject's id and filters on it in SQL;
   - the private-spell finder also requires `created_by` to be the subject;
   - a guard test, shaped like
     `tests/guards/invitation-token-rotation.test.ts`, proves these finders
     are reachable only from the copy service;
   - the exception is written into `.claude/rules/database.md` beside the
     soft-delete exceptions, and into CLAUDE.md rule 5.
2. **A classification map with a catalogue test.** Every table and every
   column that refers to a user is marked: the subject's own, another person
   (name or label), secret, or not personal. A catalogue test fails on any
   table or column missing from the map. `sessions.impersonated_by` is listed
   explicitly.
3. **A leak test over the finished file.** Fixtures fill every table for every
   fixture user. They include a coven the subject has left, a deleted coven,
   an internal support reply and an impersonated session. The copies for
   fixture users B and D are searched for other users' ids, email addresses,
   IP addresses, private spell titles and foreign row ids.
4. **Direct-id tests.** The service refuses any subject but the caller's own,
   or the named account on the admin path. Each refusal is asserted together
   with the precondition that could have let it through.
5. **The coven export** gets its own map entries and its own leak test.

That a test fails without its filter is a line in each build PR's body, not an
automated criterion.

### Format: a zip of JSON plus readable markdown

The download is a `.zip` holding:

- `data.json`, the structured copy article 20 asks for;
- `spells/<slug>.md`, one readable file per spell;
- `INDEX.md`, explaining the files and linking `data-copy.md`.

Article 20 asks for a "structured, commonly used and machine-readable format"
(Regulation (EU) 2016/679, art. 20(1)); JSON meets that, and the markdown
files are for people. The zip is made with `fflate`, a runtime dependency
under the MIT licence with no dependencies of its own. Writing the zip is
about 1h of work and the markdown renderer about 3h (my estimates).

Alternatives weighed:

- _CSV files._ Rejected: spells nest (steps, workings, variants) and CSV
  flattens them.
- _JSON only._ Rejected: a person cannot read a spell from it without tooling.
- _A PDF._ Rejected: it is not machine-readable.

### Delivery

1. **Asking works while paused.**
   - "Your Data" is its own account tab, `/account/data`, added to
     `PAUSED_VIEW_PAGES` (`src/lib/access-paused.ts`). Without that, a paused
     person has no screen to ask from.
   - `requestDataCopy` and the read that shows the request (`myDataCopy`) both
     join the paused-session allowlist (`src/graphql/paused-operations.ts`),
     because an operation passes only when every field in it is listed.
   - A coven steward asks with `requestCovenCopy` from the coven page.
2. **The rate limit queues.** Each person, and each coven, has at most one
   waiting request. `not_before` is set to a week after the last build, and
   the screen shows that date. A second request inside the week is queued, not
   refused (decision 9).
3. **The batch runs from the daily cron.** For each due request it builds the
   copy, stores the zip parts, mints the link token and mails the link to the
   held address. It skips an erased account.
4. **The cron limit.** Vercel's Hobby plan allows 100 cron jobs per project,
   each running at most once a day, and the time is only accurate to the hour
   (Vercel, "Usage & Pricing for Cron Jobs"). The site has three cron routes
   in `vercel.json`, so a fourth daily route is allowed. M18.5 adds its own
   route, and no task to merge the routes is needed.
5. **The download page, `/data-copy/[token]`, with an emailed code.**
   - **Sending the code is limited.** Each copy has one live code at a time,
     and pressing the button again before it expires mails nothing new. A copy
     gets at most 5 code mails in the link's 7 days. Sends also share the IP
     window that `src/modules/support/services/signed-out.ts` uses.
   - **The code is hashed with HMAC,** a hash keyed with a server secret, as
     `src/lib/cron-request.ts` hashes, because a plain SHA-256 of six digits is
     guessed in milliseconds by anyone who reads the database. The code lasts
     15 minutes and allows 5 tries.
   - **The download is tied to the code.** Checking the code mints a
     short-lived download grant and stores its hash on the row.
     `dataCopyPart(token, grant, n)` returns a part only for a valid grant. A
     test fetches a part with the token alone and gets nothing.
   - **Rule 3 is amended.** The send-code and check-code mutations are
     sessionless writes. They write through `withAudit` as the seeded
     signed-out sender account, as `sendSignedOutSupportRequest` does. The
     sentence in CLAUDE.md rule 3 that names the one mutation open to a
     signed-out caller, and the "one public surface of data" line under the
     domain invariants, are both amended in M18.6. The case for the exception:
     the page carries no application data until the emailed code is checked,
     and what it then returns is the one copy that belongs to the mailbox that
     received the link.
   - The page sets `noindex`, `Cache-Control: no-store` and
     `Referrer-Policy: no-referrer`. The code grants no session, so DESIGN.md
     §13's ban on a mailed sign-in link or code is untouched.
6. **Lists.** `myDataCopy` returns one object with `parts: [DataCopyPart!]!`
   nested in it, so it is not a list on `Query` and
   `tests/guards/pagination.test.ts` has nothing to fail.
7. **Expiry and erasure.** After 7 days the daily job clears the parts, the
   code and the grant, and keeps the row. M15.74's erasure transaction gains
   "clear any `privacy_requests` parts and waiting requests for the account".
   M15.58's "What the site holds" table gains a `privacy_requests` row with
   its 7-day retention, and the privacy policy text names it.

Alternatives weighed:

- _Build the copy on request, in the web request._ Rejected: a large coven
  would hold a request open, and the owner chose a low-priority batch
  (decisions 5 and 6).
- _Refuse a second request inside the week._ Rejected by the owner: queued
  instead (decision 9).
- _A link alone, with no code._ Rejected by the owner (decision 10): mail
  forwarded or read by a third party would hand over the copy.

### Storage: Postgres, not Vercel Blob

The copies stay in Postgres, in `bytea` columns of `privacy_requests`.

- **Size.** Every column is text, numbers or dates. A very large coven, about
  2,000 spells and 2,000 ingredients, comes to about 16 MB of JSON, roughly
  2 MB zipped. Both figures are my estimates, from the size of one row of each
  kind and a compression of about tenfold on JSON; M18.4 measures them.
- **The limit that matters** is the 4.5 MB cap on a Vercel Function's request
  or response body (Vercel, "Limits"). Parts travel base64-encoded, a third
  larger than their raw size. So the batch splits at **2.5 MB**: 2.5 MB × 4/3
  is about 3.3 MB, which leaves room for the response envelope under the cap.
- **The database.** Neon's Free plan allows 1 GB per project (Neon, "Plans"),
  and a copy lives for 7 days, so a handful of copies at about 2 MB each is
  not near it.
- **The column.** Drizzle has no `bytea` column builder, so M18.1 declares one
  with `customType`.

**Why not Vercel Blob.** Private Blob storage exists on every plan, Hobby
included (Vercel, "Private Storage"), so cost and access control are not the
reasons. Blob is rejected because:

1. Serving a private file needs a bespoke route handler. That is a new
   exception to CLAUDE.md rule 1, and Postgres avoids it: the parts go out
   through `/api/graphql` like everything else the browser asks for.
2. It adds a dependency and a second store of personal data, which the privacy
   policy would have to name.
3. Copies are small: about 2 MB zipped for a very large coven (an estimate,
   above), under the 4.5 MB cap with the 2.5 MB split.

**The trigger for switching:** the site starting to store uploaded files. Then
Blob is already in the stack, the second store is already named, and the route
handler already exists; the copies can move there at the cost of one task.

### A person who cannot sign in

A keeper, from the People page's user dialog, queues a copy and names the
support request that asked for it (M18.7).

- The mail goes only to a verified, non-placeholder held address, with the
  same refusal as `src/modules/identity/services/secret-link-mail.ts`.
- The action is refused for an erased account and refused to curators. The
  keeper never sees the contents.
- This fits M15.74's rule that erasure "acts once that mailbox replies":
  mailing the link and the code to the held address is itself the proof of the
  mailbox, because only its owner can finish the download.

Only keepers may do this (decision 12). A curator's own copy and their own
coven's export work like anyone's.

### Staff-note comments that become wrong

`src/emails/access-paused.ts` and `src/emails/support-timed-out.ts` carry a
comment saying the keeper's note is never shown to the person. With the copy,
the note reaches the person. M18.2 corrects those comments and the M15.52 and
M15.46 records, and puts a hint on every staff note field.

### Built for reuse by erasure

Erasure (M15.74) is decided in its own task. This set builds each shared piece
in a shape erasure can use and holds nothing erasure-specific.

| Piece                                  | Built in | Shape that allows reuse                                                                                                                                                                                                                                                      | What M15.74 can do with it                                                                                |
| -------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Classification map                     | M18.3    | One module in `src/modules/identity/services/`, with one entry per table and per column that refers to a user. Each entry is an object, so a field can be added. The catalogue test checks the entries, not one particular field.                                            | Add an erasure action to each entry. The same catalogue test then fails when a new table escapes erasure. |
| Subject-scoped finders                 | M18.3    | Each finds the rows that name one account. They return ids as well as content, and sit behind the named rule 5 exception.                                                                                                                                                    | Find the rows to blank or delete, through the same exception.                                             |
| "Fill every table" fixtures            | M18.3    | A shared test helper under `tests/`, not inside the leak test.                                                                                                                                                                                                               | Prove that nothing identifies an erased person.                                                           |
| Request table                          | M18.1    | Named `privacy_requests`, not a name tied to copies. Its `kind` is checked text (person copy, coven copy), so a new kind is an expand-only migration (one that adds and never drops). The part, token, code and grant columns are nullable, so a kind may leave them unused. | Add an `erasure` kind.                                                                                    |
| Link-and-code confirmation             | M18.6    | A service that proves control of an account's held mailbox, separate from downloading. It mints the link, mails and checks the code, and issues the grant. The download page is its first user.                                                                              | Confirm an erasure for a person who cannot sign in.                                                       |
| Keeper action naming a support request | M18.7    | A helper that checks the request and the held address, shared by any keeper action taken on a person's behalf.                                                                                                                                                               | Run its Erase Account button through the same checks.                                                     |

**Order.** M15.73 and M15.74 move after the M18 tasks they may reuse. M15.74's
entry gains a paragraph pointing at these pieces and leaving the choice to that
task. It also gains the criterion that erasure clears the account's
`privacy_requests` rows and stored parts.

### Proposed stories

The specs in M18.5, M18.6, M18.7 and M18.9 walk user flows, so they are
stories (CLAUDE.md, Testing). I propose these for DESIGN.md's list, numbered
from 92 because 35 to 46 are never reused and 91 is the last in use:

| Story | Flow                                                                  | Built in |
| ----- | --------------------------------------------------------------------- | -------- |
| 92    | A member asks for a copy of their data and receives the link by mail. | M18.5    |
| 93    | A person opens the link, asks for a code, and downloads the copy.     | M18.6    |
| 94    | A keeper sends a copy to an account that cannot sign in.              | M18.7    |
| 95    | A coven steward exports the whole coven.                              | M18.9    |

Each build adds its story to DESIGN.md and moves CLAUDE.md's count line ("v1 is
74 stories…") in its own PR.

### Text to publish

Nothing is to be published now. The seed sentence in
`documents/code-of-ethics.md` changes in this PR to say the export is planned
as M18.5; the live document changes only when M18.5 ships. Each task delivers
its exact text, in its PR, for the owner to publish in the admin editor:

| Document              | Change                                                                                        | Delivered by |
| --------------------- | --------------------------------------------------------------------------------------------- | ------------ |
| Code of ethics        | The sentence about taking writing away says the export exists, and where.                     | M18.5        |
| Privacy policy        | The data copy, what it holds, the mailed link, and the 7-day retention of `privacy_requests`. | M18.5        |
| Terms of use          | A "Leaving" paragraph pointing to Your Data.                                                  | M18.5        |
| Privacy policy        | The emailed code and the sessionless download.                                                | M18.6        |
| Privacy policy        | The coven export.                                                                             | M18.9        |
| Privacy policy, Terms | Erasure and its interaction with copies.                                                      | M15.74       |

### DESIGN.md sections the builds change

- **§5 Data model:** `privacy_requests`.
- **§7 and §9 API and routes:** `/account/data`, `/data-copy/[token]`, and the
  operations `requestDataCopy`, `myDataCopy`, `requestCovenCopy`,
  `sendDataCopyCode`, `checkDataCopyCode` and `dataCopyPart`.
- **§13 Out of scope:** the note that no mailed code signs anyone in stays
  true; a line records that the download code grants no session.
- **§14 Decision log:** the copy lives in Postgres; the named rule 5 and
  rule 3 exceptions.
- **User stories:** 92 to 95, and the v1 count in CLAUDE.md.

CLAUDE.md changes in M18.3 (rule 5 exception), M18.6 (rule 3 and the public
surface line) and each story-adding build (the count).

### Build tasks

Minted 2026-11-03 in [`tasks/m18.md`](../tasks/m18.md), in
[Wave 18](../waves/wave-18.md). Estimates are mine.

| Id    | Name                                                         | Estimate |
| ----- | ------------------------------------------------------------ | -------- |
| M18.1 | Add the Privacy Requests Table                               | 4h       |
| M18.2 | Tell Staff Their Notes Can Reach the Person They Describe    | 3h       |
| M18.3 | Assemble a Person's Copy of Their Data                       | 18h      |
| M18.4 | Package a Copy as a Zip With Readable Spells                 | 5h       |
| M18.5 | Ask for a Copy of Your Data and Receive a Link               | 8h       |
| M18.6 | Download a Copy With an Emailed Code                         | 8h       |
| M18.7 | An Admin Sends a Data Copy to an Account That Cannot Sign In | 4h       |
| M18.8 | Remind a Member to Ask for Their Data Before Leaving a Coven | 1h       |
| M18.9 | A Coven Owner Downloads the Whole Coven                      | 7h       |

Total 58h. Row order in Wave 18:
`M15.61 · M15.75 · M15.76 · M18.1 → M18.9 · M15.73 · M15.74`. Why there:
M18.1 is a table task and goes first (CLAUDE.md, "A table task, then a
behaviour task"); M18.3 and M18.4 build the copy before M18.5 and M18.6 deliver
it; M18.9 reuses all of them; erasure comes last so it can reuse the pieces.

### What I could not read

- **EUR-Lex** was not used. The EU articles cited (12, 15, 20) were read on
  legislation.gov.uk, which holds the adopted EU text, and recital 63 on
  gdpr-info.eu.
- **Schedule 2 of the Data Protection Act 2018** was read to 100,000 of its
  135,268 characters. Paragraph 16, on other people's information, was within
  what I read.
- **WP242 rev.01** (Article 29 Working Party, guidelines on the right to data
  portability) and **Nowak (C-434/16)** were not read in full. WP242 rests on
  search-result summaries; Nowak rests on an excerpt of the judgment.
- **The EDPB guidelines** were read as extracted text, so tables and layout are
  lost; I used only the passages on the form of the copy and on the rights of
  others.
- **Vercel's and Neon's pages** state their limits as of 3 November 2026.
  Both providers change limits, and none of the figures was tested against a
  real deployment.
- **No lawyer** has reviewed any of this.

### Sources

Accessed 3 November 2026.

#### Legislation (fetched)

- Regulation (EU) 2016/679 (General Data Protection Regulation), article 12, as it stands in UK law. https://www.legislation.gov.uk/eur/2016/679/article/12
- Regulation (EU) 2016/679, article 15. https://www.legislation.gov.uk/eur/2016/679/article/15
- Regulation (EU) 2016/679, article 20. https://www.legislation.gov.uk/eur/2016/679/article/20
- Regulation (EU) 2016/679, recital 63. https://gdpr-info.eu/recitals/no-63/
- Data Protection Act 2018, Schedule 2, Part 3, paragraph 16. https://www.legislation.gov.uk/ukpga/2018/12/schedule/2

#### Guidance (fetched)

- European Data Protection Board. _Guidelines 01/2022 on Data Subject Rights: Right of Access_, version 2.1, adopted 28 March 2023. https://www.edpb.europa.eu/system/files/2023-04/edpb_guidelines_202201_data_subject_rights_access_v2_en.pdf

#### Provider documents

- Vercel Inc. "Usage & Pricing for Cron Jobs." https://vercel.com/docs/cron-jobs/usage-and-pricing. Fetched; the Hobby limit of 100 jobs per project, once a day, hourly precision.
- Vercel Inc. "Limits" (Functions). https://vercel.com/docs/functions/limitations. Fetched; the 4.5 MB body cap.
- Vercel Inc. "Private Storage" (Vercel Blob). https://vercel.com/docs/vercel-blob/private-storage. Fetched; private storage on every plan.
- Neon. "Plans." https://neon.com/docs/introduction/plans. Fetched; 1 GB per project on the Free plan.
- 101arrowz. "fflate" licence. https://github.com/101arrowz/fflate/blob/master/LICENSE. Fetched; MIT.

#### Excerpt only

- Article 29 Data Protection Working Party. _Guidelines on the Right to Data Portability_, WP 242 rev.01, adopted 5 April 2017. https://dataprotection.ro/servlet/ViewDocument?id=1333. Search summary only.
- Court of Justice of the European Union. _Peter Nowak v Data Protection Commissioner_, C-434/16, judgment of 20 December 2017. https://www.dataprotection.ie/sites/default/files/uploads/2018-11/20_12_17%20CJEU%20Nowak%20Judgment.pdf. Excerpt only; used for the point that article 15 reaches data that names the person, not only data they supplied.

#### Repository

- `DESIGN.md` §5, §9, §13; `CLAUDE.md` rules 1, 3, 5 and 10.
- `claude-docs/design-decisions/`: the section "What GDPR asks of Sorrel & Salt", the section "A keeper editor for the site's documents", the section "Daily jobs start from Vercel Cron, and no job sleeps waiting", `design-decisions/auth.md`, "The invitation mail mints its token in the job step", `design-decisions/auth.md`, "What the site access pause closes, and what it decides along the way".
- `vercel.json`, `src/lib/access-paused.ts`, `src/graphql/paused-operations.ts`, `src/lib/cron-request.ts`, `src/modules/identity/services/secret-link-mail.ts`, `src/modules/support/services/signed-out.ts`, `tests/guards/invitation-token-rotation.test.ts`, `tests/guards/pagination.test.ts`.

> This is the plan the owner approved on 3 November 2026. It is not maintained; the decision record beside it is.

## Scope a way for people to take their own writing with them (plan)

### Context

The code of ethics promises "a way for people to take their own writing with them; it does not exist yet" (`documents/code-of-ethics.md:121`). M15.58's GDPR scope gave this task two more jobs:

- **the article 15 copy:** a machine-readable copy of every row that names the person;
- **article 20 portability:** a copy of the person's own writing in a structured format.

This is a scoping task. It writes a decision record, sets up a new wave for the privacy work, and mints the build tasks. It builds no code.

Everything happens in the worktree `/home/node/worktrees/m15.61`, and nothing in `/app` changes.

Fable reviewed the previous version of this plan. All of its must-fix and should-fix findings are applied below and marked **(review)**.

### Decisions you made (2026-11-03)

1. **Staff notes about a person go in the copy**, and every staff note field gets a hint saying so.
2. **Deleted rows go in, marked deleted.**
3. **A coven the person has left gives membership and counts only.** The leave dialog points to the copy first.
4. **A whole-coven export for coven stewards is part of this set.**
5. **A low-priority job builds the copy and mails a link to it. Requests are rate limited.** A keeper can queue a copy for an account that cannot sign in.
6. **Copies are built in the once-a-day batch.**
7. **The GDPR work goes in its own wave, Wave 18 — Privacy, run after launch.** It takes M15.61 and M15.73 to M15.76 from Wave 15.
8. **You get changes to the live documents as exact text** to publish in the admin editor.
9. **A second request inside the week is queued, not refused.**
10. **The download page asks for an emailed code first.**
11. **The code-of-ethics change goes live when the person's export lands (M18.5).** This scope edits only the seed file.
12. **Only keepers may send a copy to an account that cannot sign in.** A curator's own copy and their own coven's export work like anyone's.
13. **The data-copy code is structured so erasure (M15.74) can reuse it.** The shared pieces are the classification map, the "fill every table" test fixtures, the request table, and the link-and-code confirmation. This set builds those pieces in a shape erasure can use and decides nothing about erasure. M15.74 decides how it uses them.

### What the record decides (each with its reason and the alternatives weighed)

#### What the person's copy holds

- **Part 1, "Your writing" (article 20).** These are rows the person created (`created_by`) in their current covens:
  - spells, their own private ones included, with steps, assigned categories and workings;
  - coven ingredients with variants, substitutes, folk names, deities and references;
  - stock rows;
  - the coven's annotations on compendium entries;
  - their own support requests and messages.

  `updated_by` holds only the last editor, and there is no edit history. The record states this limit.

- **Part 2, "Everything that names you" (article 15).**
  - **The account:** the account row, sessions, providers by name, and passkeys by label and date.
  - **Covens:** memberships, coven pauses, invitations, and card attempts.
  - **Staff records:** site pauses, support time-outs, and the privilege ledger (the record of role changes).
  - **Sign-in and mail:** sign-in failure counts and document mailings.
  - **Workings** that name them.
  - **Rows they last changed but did not create,** by kind, title and date.
  - **Rows where they were only the actor,** by kind, id and date.
  - **An "about" section** linking the privacy policy.
- **The left-coven rule covers every section (review).** A coven the person has left contributes only its membership row and counts. That includes the workings, "last changed" and "only the actor" lists: no titles, no ids.
- **A deleted coven counts as current, its rows marked deleted, only if the person was still a member when it was deleted (review; owner, 2026-11-03).** The site still holds those rows (decision 2). If the person had left before the coven was deleted, the left-coven rule applies: membership and counts only. The leak test has a fixture for each of the three cases: left, deleted while a member, and left and then deleted.
- **Left out:** secrets (password hash, provider tokens, two-factor material, passkey keys, every token or token hash), `rate_limits` rows, and other people's details.

#### Guards against sending other people's details

Another person appears by name only where the app already shows that name to the requester:

- co-members of a current coven;
- staff on support replies the person can see.

**Gaps closed (review).** These three places take a role label such as "a site keeper" or "a former member" instead of a name:

- the authors of internal support replies, which the person never sees;
- the keeper named in `sessions.impersonated_by`;
- every name in a left coven.

The guards, in layers:

1. **SQL filters, with a named rule 5 exception (review).** The batch runs as the System account with no session, so it holds no `Membership` proof (the branded value a coven finder normally requires). The copy's finders therefore become a named rule 5 exception:
   - each takes the subject's id and filters on it in SQL;
   - the private-spell finder also requires `created_by` = the subject;
   - a guard test, shaped like `tests/guards/invitation-token-rotation.test.ts`, proves these finders are reachable only from the copy service;
   - the exception is added to `.claude/rules/database.md` beside the soft-delete exception.
2. **A classification map with a catalogue test.** Every table and user-referencing column is marked: the subject's own, another person (name or label), secret, or not personal. A catalogue test fails on any table or column missing from the map. `sessions.impersonated_by` is listed explicitly.
3. **A leak test over the finished file.** Fixtures fill every table for every fixture user. They include a coven the subject has left, a deleted coven, an internal support reply and an impersonated session. The copies for B and D are searched for other users' ids, email addresses, IP addresses, private spell titles and foreign row ids.
4. **Direct-id tests.** The service refuses any subject but the caller's own, or the admin path's named account, and each refusal is asserted with its precondition.
5. **The coven export** gets its own map entries and leak test.

Showing that a test fails without its filter is a line in each build PR's body, not an automated criterion **(review)**.

#### Format: a zip of JSON plus readable markdown

The download is a `.zip` holding:

- `data.json`, the structured copy article 20 asks for;
- `spells/<slug>.md`, one readable file per spell;
- `INDEX.md`, explaining the files and linking `data-copy.md`.

It uses `fflate` (MIT licence, no dependencies), added as a runtime dependency. The zip itself is about 1h and the markdown renderer about 3h. Compression of about tenfold keeps copies under the size cap.

#### Delivery

1. **Asking: the new "Your Data" account tab works while paused (review).**
   - "Your Data" is its own tab, `/account/data`, added to `PAUSED_VIEW_PAGES` (`src/lib/access-paused.ts:16`). Without that, a paused person has no screen to ask from.
   - `requestDataCopy` and the read that shows the request (`myDataCopy`) both join the paused-session allowlist (`src/graphql/paused-operations.ts`), because an operation passes only when every field in it is listed.
   - A coven steward asks with `requestCovenCopy` from the coven page.
2. **The rate limit queues.**
   - Each person, and each coven, has at most one waiting request.
   - `not_before` is set to a week after the last build, and the screen shows that date.
3. **The batch runs from the daily cron.** For each due request it builds the copy, stores the zip parts, mints the link token, and mails the link to the held address.
   - **It skips an erased account (review).**
   - **The cron count (review).** The record checks Vercel Hobby's limit from source. If a fourth daily cron route is refused, the batch does not borrow another task's route. A small task, "Start Every Daily Job From One Cron Route", is minted before M18.5 instead.
4. **The download page, `/data-copy/[token]`, with an emailed code.**
   - **Send Code is limited (review).** Each copy has one live code at a time, and pressing again before it expires mails nothing new. A copy gets at most 5 code mails in the link's 7 days. Sends also share the IP window that `src/modules/support/services/signed-out.ts:21-23` uses.
   - **The code is hashed with HMAC (review),** a hash keyed with a server secret, as `cron-request.ts` hashes, because a plain SHA-256 of 6 digits is guessed in milliseconds by anyone who reads the database. The code lasts 15 minutes and allows 5 tries.
   - **The download is tied to the code (review).** Checking the code mints a short-lived download grant and stores its hash on the row. `dataCopyPart(token, grant, n)` returns a part only for a valid grant. A test fetches a part with the token alone and gets nothing.
   - **Rule 3 is amended too (review).** The send-code and check-code mutations are sessionless writes. They write through `withAudit` as the seeded signed-out sender account, as `sendSignedOutSupportRequest` does. CLAUDE.md rule 3's "the one mutation open to a signed-out caller" sentence and the "one public surface" line are both amended, and the record argues the exception.
   - The page sets `noindex`, `Cache-Control: no-store` and `Referrer-Policy: no-referrer`. The code grants no session, so §13's ban on a mailed sign-in code is untouched.
5. **Lists (review).** `myDataCopy` returns a single object with `parts: [DataCopyPart!]!` nested in it, so it is not a list on `Query`, and `tests/guards/pagination.test.ts` has nothing to fail.
6. **Expiry and erasure (review).**
   - After 7 days the daily job clears the parts, the code and the grant, and keeps the row.
   - M15.74's erasure transaction gains "clear any `data_copies` parts and waiting requests for the account".
   - M15.58's "What the site holds" table gains a `data_copies` row with its 7-day retention, and the privacy policy text names it.

#### Storage: Postgres, not Vercel Blob

- **Size.** Every column is text, numbers or dates. A very large coven, about 2,000 spells and 2,000 ingredients, comes to about 16 MB of JSON, roughly 2 MB zipped.
- **The real limit is Vercel's response cap,** about 4.5 MB; the record cites its source. Parts travel base64-encoded, a third larger than their raw size. So the batch splits at **2.5 MB (review)**: 2.5 MB × 4/3 is about 3.3 MB, which leaves room for the response envelope.
- **The column.** Drizzle has no `bytea` column builder, so M18.1 declares one with `customType` **(review)**.
- **Why not Blob.** Blob adds a dependency and a second store of personal data, and public Blob URLs would bypass the code. The record names the trigger for switching: the site starting to store uploaded files.

#### A person who cannot sign in

A keeper, from the People page's user dialog, queues a copy naming the support request.

- **The mail goes only to a verified, non-placeholder held address,** with the same refusal as `src/modules/identity/services/secret-link-mail.ts:46-59` **(review)**.
- The action is refused for an erased account and refused to curators. The keeper never sees the contents.
- The record says in one sentence why this fits M15.74's "acts once that mailbox replies" rule: mailing the link and the code to the held address is itself the proof of the mailbox.

#### Staff-note comments that become wrong (review)

`src/emails/access-paused.ts:10` and `support-timed-out.ts:11` say "never the keeper's note". M18.2 corrects those comments, and the M15.52 and M15.46 records, because the note now reaches the person through the copy.

#### Stories (review)

The specs in M18.5, M18.6, M18.7 and M18.9 walk user flows, so they are stories. The record proposes new stories 92 and up for DESIGN.md's list, one per flow:

- ask for and receive a copy;
- download with the code;
- a keeper sends a copy;
- a coven steward exports the coven.

Each build adds its story to DESIGN.md and moves CLAUDE.md's count line ("v1 is 74 stories…") in its own PR.

#### Built for reuse by erasure (decision 13)

Each shared piece is built in a shape erasure can use, and holds nothing erasure-specific.

| Piece                                  | Built in | Shape that allows reuse                                                                                                                                                                                                                                                         | What M15.74 can do with it                                                                                |
| -------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Classification map                     | M18.3    | One module, `src/modules/identity/services/personal-data-map.ts` or wherever the record places it. One entry per table and per column that refers to a user. Each entry is an object, so a field can be added. The catalogue test checks the entries, not one particular field. | Add an erasure action to each entry. The same catalogue test then fails when a new table escapes erasure. |
| Subject-scoped finders                 | M18.3    | Each finds the rows that name one account. They return ids as well as content, and sit behind the named rule 5 exception.                                                                                                                                                       | Find the rows to blank or delete, through the same exception.                                             |
| "Fill every table" fixtures            | M18.3    | A shared test helper under `tests/`, not inside the leak test.                                                                                                                                                                                                                  | Prove that nothing identifies an erased person.                                                           |
| Request table                          | M18.1    | Named `privacy_requests`, not `data_copies`. Its `kind` is checked text (person copy, coven copy), so a new kind is an expand-only migration (one that adds and never drops). The part, token, code and grant columns are nullable, so a kind may leave them unused.            | Add an `erasure` kind.                                                                                    |
| Link-and-code confirmation             | M18.6    | A service that proves control of an account's held mailbox, separate from downloading. It mints the link, mails and checks the code, and issues the grant. The download page is its first user.                                                                                 | Confirm an erasure for a person who cannot sign in.                                                       |
| Keeper action naming a support request | M18.7    | A helper that checks the request and the held address. It is shared by any keeper action taken on a person's behalf.                                                                                                                                                            | Run its Erase Account button through the same checks.                                                     |

**Order.** M15.73 and M15.74 move after the M18 tasks they may reuse. M15.74's entry gains a paragraph pointing at these pieces and leaving the choice to that task. It also gains the criterion that erasure clears the account's `privacy_requests` rows and stored parts. The entry is synced to its issue.

#### Text for the live documents

There is nothing to publish now. The seed sentence names M18.5. M18.5 delivers the exact text for the code of ethics, the privacy policy (export, and `data_copies` retention) and the Terms ("Leaving"). M18.6, M18.9 and M15.74 deliver theirs where their changes touch the documents.

### Wave 18 — Privacy

- **Placement.** A new `TASKS.md` row after Wave 15, a new `waves/wave-18.md`, and a milestone "Wave 18 — Privacy".
- **Moved tasks.** M15.61 and M15.73 to M15.76 keep their ids and entries but move milestone, and leave Wave 15's row, Wave 15's milestone description and `wave-15.md`. M15.74's entry gains the `data_copies` criterion, synced with `task-board.mjs sync`.
- **New tasks.** M18.n, in a new `claude-docs/tasks/m18.md`.
- **Row order.** M15.61 · M15.75 · M15.76 · M18.1 → M18.9 · M15.73 · M15.74. Erasure comes last, after the pieces it may reuse.
- **The table's name.** Below, "`data_copies`" means the table named `privacy_requests` (decision 13).

| Id    | Title                                                        | Est. | Outline of the criteria                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----- | ------------------------------------------------------------ | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M18.1 | Add the Privacy Requests Table                               | 4h   | A table task only. `privacy_requests` holds, with `kind` as checked text open to later kinds: <ul><li>kind, subject, coven, status;</li><li>parts as `bytea` through `customType`;</li><li>link token hash; HMAC code hash, code expiry, tries and send count; grant hash and grant expiry;</li><li>`not_before` and the lifecycle times;</li><li>`auditColumns`.</li></ul>Checks tie the coven to the coven kind. A partial unique index allows one waiting request per subject. Forward-only migration, with a catalogue test. |
| M18.2 | Tell Staff Their Notes Can Reach the Person They Describe    | 3h   | A hint on every staff note field. Corrects the two "never the keeper's note" comments and the M15.52 and M15.46 records. Component tests find each hint by its label.                                                                                                                                                                                                                                                                                                                                                            |
| M18.3 | Assemble a Person's Copy of Their Data                       | 18h  | The copy service across the modules, with: <ul><li>the named soft-delete and rule 5 exceptions, and the reachability guard;</li><li>the name and label rule, including the three closed gaps;</li><li>the left-coven and deleted-coven rules;</li><li>the classification map with its catalogue test;</li><li>the leak test and the direct-id tests;</li><li>`data-copy.md`.</li></ul>                                                                                                                                           |
| M18.4 | Package a Copy as a Zip With Readable Spells                 | 5h   | Adds `fflate`. Renders `data.json`, the spell markdown and `INDEX.md`, and splits at 2.5 MB. Tests unzip and parse the result, and cover the split.                                                                                                                                                                                                                                                                                                                                                                              |
| M18.5 | Ask for a Copy of Your Data and Receive a Link               | 8h   | <ul><li>The `/account/data` tab, added to `PAUSED_VIEW_PAGES`.</li><li>`requestDataCopy` and `myDataCopy`, both on the paused allowlist.</li><li>The queued weekly limit, with the date shown.</li><li>The daily batch: skip erased accounts, build, store, mint, mail.</li><li>Expiry clearing.</li><li>Its story spec, with mailpit (the test mail inbox).</li><li>"Text to publish" for the code of ethics, privacy policy and Terms.</li></ul>                                                                               |
| M18.6 | Download a Copy With an Emailed Code                         | 8h   | <ul><li>The `/data-copy/[token]` page and the send-code and check-code mutations, written as the signed-out sender.</li><li>Send limits, HMAC codes and tries, and the grant-gated `dataCopyPart`.</li><li>The headers, and the CLAUDE.md rule 3 and public-surface amendments with their record.</li><li>Tests that the token alone fetches nothing, that sends are capped and that tries run out.</li><li>Its story spec, with axe checks.</li></ul>                                                                           |
| M18.7 | An Admin Sends a Data Copy to an Account That Cannot Sign In | 4h   | Admin only, naming the support request. Mails only a verified, non-placeholder held address and refuses an erased account. Authorization tests show a curator and a member are refused, each with its precondition. Its story spec.                                                                                                                                                                                                                                                                                              |
| M18.8 | Remind a Member to Ask for Their Data Before Leaving a Coven | 1h   | The leave dialog's text and link to "Your Data". A component test.                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| M18.9 | A Coven Owner Downloads the Whole Coven                      | 7h   | `requestCovenCopy`, owner-only through a new per-role statement in `access-control.ts` (code, no migration). Same table, batch, zip and code. Its own map entries and leak test, and direct-id refusals for a member, a viewer and D. Its story spec.                                                                                                                                                                                                                                                                            |

Total: 58h, plus 2h if the daily-cron task has to be minted.

### Steps after approval

The main session coordinates. One Sonnet agent does the edits, briefed with these paths, told never to touch `/app`, and told to give each Bash call a one-sentence description.

1. **Set up the worktree.** Run `git fetch origin staging`. Create the worktree `/home/node/worktrees/m15.61` on `feature/m15.61-scope-a-way-for-people-to`, using `--no-track` and branching from `origin/staging`. Copy `node_modules` in and delete its tsc cache. Comment on the task and set it to `In Progress`.
2. **Read and cite the sources** in Chicago form, with a "What I could not read" section:
   - GDPR articles 12(5), 15 and 20, and recital 63;
   - EDPB Guidelines 01/2022 v2.1 (the PDF text is extracted with node);
   - WP242;
   - _Nowak_, C-434/16;
   - the UK Data Protection Act 2018, Schedule 2;
   - Vercel's response cap, its Hobby cron count and frequency, and Blob's private access;
   - Neon's storage limit;
   - `fflate`'s licence.

   If a source contradicts a decision, the agent stops and I bring it to you.

3. **Write the record**, `claude-docs/design-decisions/support.md`, "A way for people to take their own writing with them", in M15.59's shape. It includes "Alternatives weighed" for every decision, the proposed stories, "DESIGN.md sections the builds change", "Text to publish", "Build tasks", "What I could not read" and "Sources".
4. **Copy the plan** to `claude-docs/design-decisions/support.md`, "Scope a way for people to take their own writing with them (plan)", under a one-line note that it is not maintained.
5. **Set up the wave.** Write `waves/wave-18.md` and add the `TASKS.md` row. Take the moved tasks out of Wave 15. Add the M15.74 criterion and sync it. Create the milestone as `claude-docs/task-tracking.md` sets out.
6. **Mint the tasks.**
   1. Re-check that M18.1 is free.
   2. Write `tasks/m18.md`.
   3. For each task, run `gh issue create --type Task --label tracked --milestone "Wave 18 — Privacy"`, then `estimate`.
   4. Move the five existing issues to the new milestone.
   5. Update both milestones' first lines.
   6. Run `reorder` as a dry run, then with `--apply`.

   If the cron source shows the count is capped at three, mint the daily-cron task before M18.5.

7. **Update the documents.** Point M15.58's rows and its build table at the new tasks, and add the `data_copies` row to its "What the site holds" table. Edit the code-of-ethics seed sentence.
8. **Check.** Run `npm run format:check` and `npm run lint`; this is a prose diff, so no tests. Comment progress on the task, then stop at ready. No commit or PR until you ask.

### Verification

- `npm run format:check` and `npm run lint` pass in the worktree.
- `task-board.mjs find` prints one issue in "Wave 18 — Privacy", with an estimate, for M18.1 to M18.9 and for M15.61 and M15.73 to M15.76.
- `reorder` prints no moves.
- Wave 15 no longer lists the moved tasks.
- The record meets every M15.61 criterion, and the code-of-ethics seed sentence names M18.5.

## Agreeing to the terms covers the disclaimer and the code of ethics

### The decision

The terms of use include the disclaimer and the code of ethics (the owner's
decision, 3 November 2026). So agreeing to the terms is agreeing to all three
documents, and publishing a new version of any of the three asks every
account to agree again. Publishing the privacy policy asks nothing: an
account does not agree to it.

Until this decision, an account recorded only the terms version it agreed to,
and a new disclaimer or code of ethics changed its page and nothing else
((see "A keeper editor for the site's documents"),
"Publishing the terms", as it was first written).

### The joint version

An account's agreement is shown as one joint version made of the three
documents' version numbers, in a fixed order: `terms.disclaimer.ethics`. For
example, `1.4.2` is terms version 1, disclaimer version 4 and code of ethics
version 2. A document with nothing published counts as 0.

- `formatAgreementVersion` (`src/lib/agreement-version.ts`) builds the string.
  The acceptance page, the keepers' user list and the user modal all use it,
  so the format has one definition.
- `currentAgreementVersion` (`src/lib/current-agreement-version.ts`) reads the
  three numbers in force, cached under the `documents` tag that every publish
  clears.
- `agreementIsCurrent` is the gate's test: all three stored numbers must equal
  the three in force. A stored null counts as 0, so a document with nothing
  published asks nothing of anyone.
- `documentsChangedSince` names the documents whose number moved, so the
  acceptance page can link each one. A new account has stored nothing, so it
  sees all three.

### Three columns

**`users` holds the three numbers in three nullable integer columns:**
`agreed_terms_version` (already there), `agreed_disclaimer_version` and
`agreed_ethics_version`, beside `terms_accepted_at`. `agreeToTerms` writes all
four at once through `withAudit`, and refuses any combination of numbers that
is not the one in force.

Alternatives weighed:

- **One text column holding the joint string, such as `1.4.2`.** Rejected:
  the gate would have to parse a string to compare one number, the database
  could not check that each part is a whole number, and the format would be
  fixed in stored data. As three columns, the format is only how the numbers
  are shown, and can change without a migration.
- **A table of agreements, one row per account and document.** Rejected: it
  is a second table to keep in step with `users`, and the gate would need a
  query on every request. Better Auth carries `users` columns in the session
  (`additionalFields` in `src/lib/auth.ts`), so three columns reach the gate
  with no query. The set of agreed documents is fixed at three, so a table
  buys no flexibility that is used.
- **One summed number, such as the total of the three versions.** Rejected: a
  sum loses which document changed, so the acceptance page could not name
  it, and two different combinations can give the same sum (terms 2 and
  disclaimer 1 against terms 1 and disclaimer 2), so the gate could pass an
  account that agreed to a different set of texts.

### The backfill

Migration `0134_agreed-document-versions` adds the two columns and fills them
once, for existing accounts:

- An account whose `agreed_terms_version` is the terms version in force gets,
  for each of the disclaimer and the code of ethics, the highest version that
  was live and published when it agreed (`published_at` no later than
  `terms_accepted_at`). The account read the terms on the site at that moment,
  and those were the versions the site then showed beside them.
- A document with no version published by then stays null, which counts as 0.
  If that document has a version now, the account is asked to agree again.
- An account that agreed to older terms, or to none, keeps both columns null:
  it is asked to agree again anyway.

The migration test is `tests/db/migrations/0134-agreed-document-versions.test.ts`.

## One joint email about every changed document

### Decision

A keeper emails every account one email that lists every site document changed since the last email, from the Email Updates page at `/keepers/documents`. It replaces the one-mailing-per-document button that M15.63 put on each document's edit page (claude-docs/design-decisions/support.md, "M15.63: emailing every account"). The owner approved each point below. It ships in the M15.79 pull request.

### What is decided, and why

- **A mailing is a set of items.** A new table, `document_mailing_items` (`mailingId`, `documentVersionId`, `summary`, audit columns), holds one row for each document a mailing covers, with a partial unique index on `(mailingId, documentVersionId)`. A mailing that names one version cannot say "these three documents changed"; a row per document can, and keeps each document's own summary beside its own version.
- **The legacy columns stay, nullable, and nothing is dropped.** `document_mailings.documentVersionId` and `summary` lose their `NOT NULL` and are left empty in a new mailing. Their partial unique index on `documentVersionId` stays too: it ignores nulls, so it constrains only the old rows. Dropping a column is two pull requests under rule 10, and nothing yet needs the drop, so it is not scheduled. A later task may drop them once no code reads them.
- **Every existing mailing becomes one item.** Migration `0135_joint-document-mailing` copies each mailing's version and summary into an item, with the mailing's own audit stamps and deletion, so the send job, the progress and the history read only items. The copy skips a mailing that already has an item, so running it twice adds nothing.
- **All four documents join one email.** The terms, the disclaimer, the code of ethics and the privacy policy are each listed with their summary and a link. The email asks the reader to agree again only when the terms, the disclaimer or the code of ethics is among them, since those three are what an account agrees to; the privacy policy is not agreed to. The list is `AGREEMENT_DOCUMENTS` in `src/lib/agreement-version.ts`, the one the agreement gate reads, and the email and the panel ask it through `asksAgreement`.
- **A keeper sends; a publish never does.** Publishing a typo fix must not reach every account, so nothing mails until a keeper presses Email Every Account and confirms.
- **What is pending.** For each document: its newest live published version, when that version is past version 1 and is no item of a `sent` mailing. Version 1 is the text the site launched with, so there is no change to announce. A version that an unfinished mailing holds is still pending, because the replacement below must cover it again.
- **One email covers everything pending, and each pending document needs its own summary.** The keeper writes a required, non-blank summary for each, and the service refuses a send whose summaries do not name exactly the pending versions. Sending a part of what is pending would leave a changed document unannounced with no sign on the page that it was skipped.
- **A new mailing replaces every open one.** Every `sending` or `paused` mailing is marked `replaced`, and the new one goes to every mailable account, including those an old one already reached. The new email covers everything the old one did, with the keeper's newest text, so finishing the old one first would only send outdated words. The send is refused when every pending version is already in an open mailing, since a replacement would say nothing new.
- **A lock stops two concurrent sends.** The service takes a transaction-scoped advisory lock (`pg_advisory_xact_lock` on a fixed key) inside `withAudit`, then reads pending again under it. Without it, two keepers pressing the button together would each read the same pending set and start two mailings; the second now waits, finds the first's mailing open, and is refused.
- **The send job, the progress and resume read the items.** The job's step mails each account one notice built from the mailing's items; a mailing whose items are all gone is marked `replaced`. The progress lines name the documents from the items. Resume finds nothing by version any more: it resumes the paused mailing by its id.
- **One panel on its own page.** `/keepers/documents`, which was a 404, becomes the Email Updates tab beside the documents' tabs. The panel reads `readDocumentMailings(session)`, an overview under `assertSiteAdmin`: the pending documents, the account count, the days the mailing takes at the daily cap, whether a send is possible, the open mailings and the last sent one. The per-document panels are removed from `/keepers/documents/[key]`, and with them `DocumentEditor`'s `mailing` prop, which drew a panel under the lede. The labels are Title Case, and Email Every Account is red, because a mailing cannot be called back.
- **No DataLoader.** The overview reads the items of every mailing it shows in one `findDocumentMailingItems(ids)` call, joined to their documents and versions in the same query, so no read runs once per mailing or per item.

### What was left as it was

- The panel has no story file, as it had none before.

<!-- The approved plan for M17.2, copied here on 2026-11-06 as the record of what was agreed. It is not maintained: the decision records beside it are. -->

## Scope the Closed-Practice Warning (plan)

Issue #1467, Wave 17, `Not Started`. A docs-and-data task: it writes a decision record, answers the seven open questions in `compendium/ethics/`, and mints the build tasks. No code under `src/` changes.

### Context

M14.29 gathered closed-practice statements into `compendium/ethics/` (the seed never reads it). One file records a closed practice (stacte, from Wikipedia, `needs-review`) and six carry open questions (white sage, peyote, yopo, cowrie shell, lava stone, onycha; an eighth, Strychnos icaja, asks about Bwiti). No column records a tradition or a closed practice. The Code of Ethics (`documents/code-of-ethics.md`, a keeper-edited site document since M15.71) says the warning is planned (line 13, Short Version; lines 54–55 under "Closed Practices and Where Lore Comes From") and promises to record which tradition each piece of lore comes from. `claude-docs/backlog.md` line 38 holds the item.

The owner answered every question on 2026-11-06 (this session); the answers are below and go into the record and the files.

### Research findings (online authorities, cited in the record)

**Who may say a practice is closed: the people themselves.** The UN Declaration on the Rights of Indigenous Peoples (A/RES/61/295, 2007) Art. 11(1), 12(1) and 31(1): the rights to practise their cultural traditions, to manifest and teach their ceremonies, and to "maintain, control, protect and develop their cultural heritage, traditional knowledge and traditional cultural expressions" (31(1) as quoted by Vancouver Community College's policy appendix, https://www.vcc.ca/media/vancouver-community-college/content-assets/documents/policies/appendices/510-Appendix-A-UNDRIP-Article-31.pdf; the UN PDF and HTML refused the fetch tool, so the lane verifies the wording in a browser against the UN text before the record cites it). The Lakota Summit V "Declaration of War Against Exploiters of Lakota Spirituality" (10 June 1993; copies at http://www.thepeoplespaths.net/articles/ladecwar.htm and http://www.sterneck.net/ritual/lakota-spirituality/index.php, the aics.org original refused the fetch) is the model of a people's own statement: "We hereby and henceforth declare war against all persons who persist in exploiting, abusing, and misrepresenting the sacred traditions and spiritual practices of the Lakota, Dakota and Nakota people."

**Per question:**

| Entry                                                       | What the authorities say                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Owner's answer                                                                                               |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| White sage `botanical/white-sage-salvia-apiana`             | No tribal government or religious body says the plant is closed. High Country News, "Sage advice", Taylar Dawn Stagner (Arapaho and Shoshone), 1 Oct 2020, https://www.hcn.org/issues/52-10/indigenous-affairs-sage-advice/ : Weshoyot Alvitre (Tongva), medicinal plants "are not to be sold: period"; the author: burning white sage "has become an accepted form of cultural appropriation". Wikipedia "Salvia apiana": many Native Americans have asked non-Natives to refrain from using it. Tongva Taraxat Paxaavxa Conservancy runs Protect White Sage (poaching), https://www.guidestar.org/profile/87-1422866.                                                                                                                                                                                                                                                                                                                                                                                                                                             | **Mark it, kind `asked-not-to-use`**, naming the Indigenous peoples of California and the wider Americas.    |
| Peyote `botanical/peyote-lophophora-williamsii`             | National Council of Native American Churches statement, 13 Feb 2016 (signed by the presidents of NAC of North America, Azee' Bee Nahagha of Diné Nation, NAC of Oklahoma, NAC of South Dakota, Consejo Regional Wixárika), reported by NARF https://narf.org/national-council-of-native-american-churches-speak-out-against-illegitimate-organizations/ and ICT https://ictnews.org/archive/national-council-does-not-condone-faux-native-american-churches-or-marijuana-use/ : "We oppose the attempts of non-Natives to come in and misuse government protection of traditional Native American religion"; "We reject the attempts to grasp onto our indigenous ways and deceive the public by claiming them as their own". NCNAC and IPCI statements of 20 Feb 2020 and the 2021 open letter (https://www.ipci.life/media-and-public-statements, https://chacruna.net/ipci_open_letter_psychedelic_movement_peyote_decriminalization/) ask decriminalisation efforts to leave peyote out. The federal exemption (21 CFR 1307.31) is a legal fact, not a closure. | **Mark it closed**, naming the Native American Church and the Wixárika. The legal restriction goes to M17.3. |
| Stacte `unknown/stacte`, onycha `unknown/onycha`            | Exodus 30:34–38 (Sefaria, JPS 2023, https://www.sefaria.org/Exodus.30.34?lang=bi): the compound "in the same proportions" is forbidden "for yourselves". Keritot 6a (Hadran, https://hadran.org.il/daf/keritot-6/): blending "to teach himself" or "to transfer it to the community" is exempt. Maimonides, Temple Vessels ch. 2 (Sefaria): liability is for the eleven-spice compound; omitting a spice makes it "foreign incense". Wikipedia "Incense offering in rabbinic literature" oldid 1374047559: burning "part of the same components" to scent clothes or a house "was permitted". Temple Institute https://templeinstitute.org/temple-incense/ forbids preparing the ketoret for any use, says nothing of one spice. No source restricts the single ingredient; the rule binds Jews and is not a people's claim against outsiders.                                                                                                                                                                                                                      | **No mark.** Stacte's `closedPractice` row is removed and the answer recorded; both files `approved`.        |
| Yopo `botanical/yopo-anadenanthera-peregrina`               | Rodd & Sumabila 2011, J. Psychoactive Drugs 43(1):36–45, doi 10.1080/02791072.2011.566499: use restricted to Piaroa shamans within the community; nothing on outsiders.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | **No mark**, `approved`.                                                                                     |
| Cowrie shell `zoological/cowrie-shell-cypraeidae`           | Canadian Encyclopedia "Midewiwin", Gadacz/Filice, Historica Canada, https://www.thecanadianencyclopedia.ca/en/article/midewiwin : the society "does offer services to the public"; settlers called it secret from not understanding it; miigis shells are sacred in its ceremonies, not restricted.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | **No mark**, `approved`.                                                                                     |
| Lava stone `unknown/lava-stone`                             | NPS Superintendent's Compendium (removal illegal) and the Pele page (custom asks permission): a sourcing rule, not a closure.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | **No mark**, `approved`; the park rule is passed to M17.3 as a sourcing concern.                             |
| Strychnos icaja `botanical/strychnos-icaja-strychnos-icaja` | Bwiti initiates foreigners (Samorini, https://samorini.it/doc1/sam/sam-bwiti%20initiation.pdf ; AFP reporting), so it is not closed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | **No mark**, `approved`.                                                                                     |

**Which sources may establish a closed practice (the record's rule):**

1. `closed`: a statement by the people's own representative body (tribal government, intertribal council, a nation's summit, the religious body itself, e.g. NCNAC). Required for the `closed` kind.
2. `asked-not-to-use`: a documented request by members of the people, in their own words, carried by their organisation or by a reputable outlet naming them (HCN's named Tongva and Chumash voices).
3. Academic ethnography may establish restriction inside a community; it establishes closure to outsiders only when it says so.
4. Wikipedia alone: may point to the statement, and the record cites the statement it summarises. It suffices on its own only when it quotes the people's own statement that cannot be reached, and then the file stays `needs-review`.
5. A legal restriction is never a closed practice (it goes to M17.3). A practice is never inferred from a tradition's name (M14.29's rule stands).

**Design decisions (the owner's, 2026-11-06):**

- Shape: a table keyed to the traditions vocabulary (`deity_traditions`, "a people or a religion", already a `reference_links` target).
- Who: a curator or keeper may set, change and clear (`assertCurator`, like every compendium mutation).
- Shows: entry page Notice (kind `warn`, `block`) under the badges, titled by kind, naming the people, the statement and its sources, linking to the help page; a "Closed Practice" mark in `EntryMarks` on each card and a filter facet; a help page on closed practices.
- Help page: the owner chose a help document. **Assumption, flagged for review:** it is built as a help article under MB.175's `help_articles` system (`/help/closed-practices`), not a fifth entry in the legal-documents system (`DocumentKey` in `src/modules/documents/types.ts`, versioned and agreed-to). Until MB.175's build tasks land, the notice links the Code of Ethics section.

### Controlled substances leave the compendium (the owner's rule, 2026-11-06)

**The rule.** The compendium holds no entry whose plant, fungus or substance is itself unlawful to grow or possess under United States federal law or Washington State law, and no alcohol, cannabis or tobacco. A plant that is lawful to grow stays, even where a preparation of it would be a controlled substance (the owner's call, 2026-11-06). The governing law is the federal Controlled Substances Act schedules (21 U.S.C. § 812; 21 CFR Part 1308, which names peyote and marihuana in Schedule I and opium poppy and poppy straw and coca leaves in Schedule II: https://www.govinfo.gov/content/pkg/USCODE-2011-title21/html/USCODE-2011-title21-chap13-subchapI-partB-sec812.htm, current text to be checked at law.cornell.edu) and Washington's Uniform Controlled Substances Act (RCW 69.50.204 Schedule I names psilocybin, psilocyn and tetrahydrocannabinols "naturally contained in a plant of the genera Cannabis": https://lawfilesext.leg.wa.gov/Law/RCWPDF/RCW%20%2069%20%20TITLE/RCW%20%2069%20.%2050%20%20CHAPTER/RCW%20%2069%20.%2050%20.204.pdf), with alcohol under RCW Title 66 and cannabis under RCW 69.50 even where Washington licenses adult sale. International control is not the test: the INCB holds that no plant is controlled under the 1971 Convention (E/INCB/2010/1 para. 287, as reported by Tupper and Labate 2012), so a treaty rule would remove only the opium poppy, coca and cannabis. A coven may still add any of these as its own ingredient; the rule is about what the site publishes. **The reason, in the record's words:** the owner's caution about carrying that information on a public site. The record also says, labelled as the lane's understanding and not legal advice, that the Act controls possession, manufacture and supply and not description, so the rule is a choice, not a found requirement.

**The test, per entry:** a source read says the plant, fungus or substance itself is named in 21 CFR 1308 or RCW 69.50 (peyote, marihuana, opium poppy, coca leaves), or that growing or possessing it is unlawful there (a fungus containing psilocybin is treated as the substance), or it is an alcoholic drink, cannabis or tobacco. A plant lawful to grow stays, whatever a preparation of it would be. Its entry says nothing that instructs preparation or dosing, but it errs on the side of safety: where a source says a person without the knowledge could harm themselves with the ingredient, the entry's safety note says what the harm is (the owner's call, 2026-11-06). M19.1 checks every kept candidate for both: it removes any instructing sentence, and adds a sourced `safetyNotes` line (and `toxic` where the source says so) to a kept entry that lacks one, on the pattern yopo's and peyote's already use. Peyote's dosing sentence goes with its entry. Each removal is recorded in an ethics file with the citation, as the endangered removals were (`compendium/ethics/endangered-removals.md`, `claude-docs/design-decisions/ingredients.md`, "No endangered species in the compendium"), and listed in `compendium/left-out.md`.

**Candidates today** (from the file names, unverified until the content task reads each entry's sources). Removed under the test: peyote (Schedule I by name), hemp (`botanical/hemp-cannabis-sativa`, cannabis), opium poppy (Schedule II by name; growing it is manufacture under the Act), coca (Schedule II by name), the two Psilocybe entries (`fungal/psilocybe-mushrooms-psilocybe`, `fungal/koae-ea-lekhoaba-psilocybe-maluti`), tobacco (`botanical/tobacco-nicotiana`, the owner's call), and the alcohol entries `whiskey`, `rum` and `palm-wine`. Kept, as plants lawful to grow, pending the check: San Pedro cactus, chacruna, yopo, iboga, ololiuqui and morning glory, Salvia divinorum, ayahuasca vine, Syrian rue, kava, fly agaric, datura, belladonna, henbane, mandrake, nutmeg, areca and betel, ephedra. Iboga is the doubtful one (ibogaine is Schedule I and the plant's status is unsettled): M19.1 decides it from a source and records why.

**Where it lands:** a second record, `claude-docs/design-decisions/ingredients.md`, "No controlled substances in the compendium"; a "No controlled substances" section in the seed README beside "No endangered species"; the Code of Ethics' sourcing section gains the rule in the content task's PR; two build tasks open Wave 19 (table below). M17.2 itself deletes no entry.

**The build is a new wave (the owner's call, 2026-11-06), not Wave 17.** M17.2's entry and issue say "minted as `M17.n` tasks on Wave 17"; that line is corrected in place in `claude-docs/tasks/m17.md`, synced to #1467, and the record says why: the build is eight tasks with its own trigger (M17.2 done), the size of Wave 18, and Wave 17 is a holding wave for scoping and audits. Proposed name **Wave 19 — Compendium ethics**, after Wave 18 (Privacy); the tasks are `M19.1 → M19.10` in a new `claude-docs/tasks/m19.md` and `claude-docs/waves/wave-19.md`, registered in `scripts/tasks-md.mjs` (one added path line, as Wave 18's commit `78a55cc7b` did; the "only Markdown" criterion is amended to allow it, as M17.1's already does). The milestone `Wave 19 — Compendium ethics` is created on GitHub (`gh api -X POST repos/Aurora-Arctic/Sorrel-and-Salt/milestones`) with its first line the id list and the wave-file link, before minting. M17.3's ethical warnings may join this wave when M17.3 runs; that is M17.3's decision, named in the wave file.

### Deliverables (all Markdown, `compendium/ethics/`, `scripts/tasks-md.mjs`, and the board)

0. **`claude-docs/design-decisions/ingredients.md`, "No controlled substances in the compendium"**: the rule, jurisdiction, citations, test, candidate list, reason, and the two tasks; plus the seed README section and a line in `compendium/ethics/checked.md`'s heading rules if the format changes (it does not; removals use ethics files as before).
1. **`claude-docs/design-decisions/ingredients.md`, "The closed-practice warning"** with sections: the data today (stacte on Wikipedia; after the decisions, peyote and white sage) with file and source per entry; which sources may establish a closed practice and why Wikipedia alone may not (rule above, with the authorities); how an entry records the tradition of each piece of lore (nullable `tradition_id` on `reference_links`, the later pair of tasks); the data model (table below); what the warning shows and who sets it; the owner's answers per file; the build tasks and their order. Written plainly per `.claude/rules/writing.md`, British spelling, no versions.
2. **`compendium/ethics/` updates:** README table in `claude-docs/compendium/compendium-seed/README.md` gains `closedPractice[].kind` (`closed` | `asked-not-to-use`). White sage and peyote get `closedPractice` rows with new source files under `compendium/ethics/sources/` (`hcn-sage-advice`, `narf-ncnac-2016`, `ict-ncnac-2016`, `ipci-public-statements`, Chicago form, accessed dates) and go `approved`. Stacte loses its row and records the answer; stacte, onycha, yopo, cowrie, lava stone, Strychnos icaja each get "Answered by the owner 2026-11-06: …" under their question (costus's pattern) and go `approved`.
3. **Task entries** in a new `claude-docs/tasks/m19.md` (header, sequencing paragraph, ten entries with estimates and "Tests are written first" lines), a new `claude-docs/waves/wave-19.md` (why the wave exists, its row, its trigger), a new **TASKS.md** row `| **19 — Compendium ethics** | M19.1 → M19.10 |`; MB.175's entry in `tasks/mb.md` amended so a help article may have a parent article (sub pages), synced to #690; after Wave 18 and the wave count where TASKS.md states it, `claude-docs/tasks/m17.md` M17.2's corrected criterion and wave-17.md's M17.2 paragraph saying the build went to Wave 19, and **`claude-docs/backlog.md`** line 38 naming the tasks.
4. **Board minting** per `.claude/rules/task-tracking.md`: create the milestone, re-check that no `M19.n` issue exists, `gh issue create --type Task --label tracked --milestone "Wave 19 — Compendium ethics"`, `estimate`, the milestone description's first line, then `reorder` dry-run and `--apply` from the branch holding the row; `sync M17.2` and `sync MB.175` for the corrected entries.
5. Progress comments on #1467 via `task-board.mjs comment` (names, never values).

### The build tasks, Wave 19 (order as listed)

| Id     | Title                                                                                             | Est. | Depends on                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------ | ------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M19.1  | Remove the entries unlawful to grow, and the alcohol, cannabis and tobacco entries, from the seed | 3h   | — Checks each candidate against 21 CFR 1308 and RCW 69.50 by its sources, keeps every plant lawful to grow and gives each kept candidate a sourced safety note where a source names a harm, with no preparation or dosing sentence left, writes the ethics file per removal, deletes the entry files and the sources only they cite, lists each in `compendium/left-out.md`, updates the Code of Ethics' sourcing section in the same PR. |
| M19.2  | Retire the removed entries from seeded databases                                                  | 2h   | M19.1. A forward-only data migration on the M14.30 pattern (`0090_retire-endangered-entries.sql`): soft-deletes by seed key, keeps variants a coven holds; `tests/db/` test; later seed runs report `retired`.                                                                                                                                                                                                                            |
| M19.3  | Call the deity traditions "Traditions" on screen, as the vocabulary of peoples and religions      | 1h   | — (`GroupList/kinds.ts`, the curator tab, docs; the table name stays)                                                                                                                                                                                                                                                                                                                                                                     |
| M19.4  | `ingredient_closed_practices` table                                                               | 1h   | M19.3. One migration: `id`, `ingredient_id`, `tradition_id` → `deity_traditions`, `kind` enum (`closed`, `asked-not-to-use`), `statement` text, `seed_key`, audit columns, partial unique on (`ingredient_id`, `tradition_id`); `reference_links.ingredient_closed_practice_id` as a seventh sourced target (the `reference_links_one_row` CHECK widened). Catalogue test in `tests/db/`. No service uses it yet.                         |
| M19.5  | A curator sets, changes and clears an entry's closed-practice mark                                | 3h   | M19.4. Service in `src/modules/ingredients/services/compendium.ts` (`assertCurator`, `withAudit`, `expireCompendium`), GraphQL mutations, a section in `IngredientForm` with tradition pick, kind, statement (length-limited, no ceremony description by rule) and sources.                                                                                                                                                               |
| M19.6  | The warning shows on the entry page and the compendium list, and the Code of Ethics says so       | 4h   | M19.5. Notice + `EntryMarks` mark + facet; a story spec. Criterion: edit `documents/code-of-ethics.md` lines 13, 54 and 55 in the same PR, restoring the promise that an entry from a closed practice says so, names the people and does not describe the ceremony, and a keeper republishes it.                                                                                                                                          |
| M19.7  | Seed the closed-practice marks from `compendium/closed-practices/`                                | 2h   | M19.5. Files per marked entry (white sage; peyote only if it survives M19.1, which it will not under the rule, so the record says the peyote mark is written to its ethics file as the finding and seeded for no entry) with `seedKey`, sources copied into `compendium/sources/`; the seed never revives a cleared mark.                                                                                                                 |
| M19.8  | Help pages on closed practices: one general, one per marked practice                              | 3h   | M19.6 and MB.175's build tasks (the parent article MB.175's amended entry adds). `/help/closed-practices` and `/help/closed-practices/<practice>` seeded, written in the people's words with sources; each entry's notice links its practice's page.                                                                                                                                                                                      |
| M19.9  | `reference_links.tradition_id` column                                                             | 1h   | M19.3. Nullable, → `deity_traditions`; catalogue test.                                                                                                                                                                                                                                                                                                                                                                                    |
| M19.10 | A citation says which tradition its lore comes from                                               | 3h   | M19.9. Source panel pick; references list shows it; the Code of Ethics line 54 updated in the same PR.                                                                                                                                                                                                                                                                                                                                    |

Total 23h. The wave's row: `M19.1 → M19.10`. Trigger: M17.2 done; it runs after Wave 18 in board order. M19.1 and M19.2 lead because the removal is the owner's priority.

### Steps

1. `/create-feature` flow via start-task: branch `feature/m17.2-closed-practice-warning` off fresh `staging`; set #1467 `In Progress`.
2. Write the record; update the ethics files, README table, backlog, m17.md, wave-17.md, TASKS.md.
3. Create the Wave 19 milestone; mint M19.1–M19.10 (ids re-checked), estimates, milestone first line, `reorder --apply`, `task-board.mjs sync` for each and for M17.2 and MB.175, from the branch.
4. Comment progress on #1467. Stop before any commit; `/create-pr` is the owner's call.

### Verification

- `npm run format:check` and `npm run lint` (doc-only diff plus one path line in `scripts/tasks-md.mjs`: no tests; `node scripts/tasks-md.mjs` runs clean so the new file is read).
- `node scripts/task-board.mjs find M19.1` … `M19.10` each print one issue; `reorder` prints no moves after `--apply`.
- `git diff --stat` shows only `claude-docs/`, `compendium/ethics/`, `scripts/tasks-md.mjs`; nothing under `src/` or `documents/`.
- Every URL in the record opened once in a browser by the lane, and the UNDRIP quote checked against the UN text.

### Owner action needed

Nothing beyond approving this plan, unless one of these assumptions is wrong, in which case say so:

- The wave is named **Wave 19 — Compendium ethics** and sits after Wave 18, with the two removal tasks first.
- The help pages are MB.175 help articles (a general one and one per practice), not legal documents.
- The removal test is "the plant, fungus or substance itself is unlawful to grow or possess under US federal or Washington law, or is alcohol, cannabis or tobacco"; plants lawful to grow stay; each entry is decided from its sources in M19.1, not in M17.2.

Plan file: /home/node/.claude/plans/m17-2-do-thorough-research-logical-haven.md (the `code` command is not installed in this container, so I could not open it in the editor).

The owner approved this plan for M17.3 on 2026-11-06.

## Scope the ethical warnings on ingredients (plan)

### Context

M17.3 (#1468) is scoping only. It decides:

- which listings and animal parts raise an ethical warning;
- what the warning shows and who sets it;
- the tasks that build the warning;
- the tasks that answer the `needs-review` questions in `compendium/ethics/`.

M17.3 itself builds nothing and answers none of those questions. Nothing under `src/` or `compendium/` changes. The survey of the data is at `/tmp/claude-1000/-app/045c87f1-b107-4a13-b673-ddb0d319bdfa/scratchpad/m17.3-survey.md`.

The work happens in `/home/node/worktrees/m17.3`, on branch `feature/m17.3-ethical-warnings-on-ingredients-which-listings`. That branch already carries the MB.175 retitle commit (`5bfc4273f`), which you want in this PR.

### Your decisions (2026-11-06)

1. **What raises a warning:**
   - an IUCN assessment of Critically Endangered, Endangered, Vulnerable or Extinct in the Wild;
   - or a CITES Appendix I or II listing.

   National and state lists, Least Concern and prose claims raise none. Today this marks 32 live entries.

2. **Animal parts:** a notice quoting the gathered statement with its source, plus an "Animal Part" card mark and filter. Nothing is inferred beyond the statement.
3. **Exceptions for Indigenous peoples' religious and cultural use:** a field on the warning row, holding an exception statement with its own sources. The entry-page notice shows it.
4. **Where the tasks go:** their own wave, **Wave 20 — Ethical warnings**, numbered M20.n.
5. **The needs-review questions:** they come out of M17.3 and become their own tasks, one per group, plus a task to re-review the 22 the survey marked already decided. When each of those tasks runs, it puts its questions to you on a review page, one question at a time. The page has a Copy Table button.

A default I am taking without asking, because it matches M17.2: a curator or keeper sets, changes and clears a warning, through `assertCurator`.

### Corrections to M17.3's own entry

Two acceptance criteria in `claude-docs/tasks/m17.md` conflict with these decisions. I rewrite them and sync the issue:

- "Each `needs-review` question … is put to the owner, and the owner's answer is recorded" becomes "Each `needs-review` question is assigned to a Wave 20 question task, named in the record."
- "minted as `M17.n` tasks on Wave 17" becomes "minted as `M20.n` tasks on Wave 20."

The record lists the entries the data marks **as it stands today**. It also says that the question tasks may change that list.

### Steps

1. **Write the record**, `claude-docs/design-decisions/ingredients.md`, "The ethical warnings on ingredients" (agent). It holds:
   - the threshold and the reason for it;
   - the animal-part display;
   - the exception field;
   - every entry the data marks today, with its file and source, taken from the survey's `rowsB.tsv`, live entries only;
   - what the notice shows on the entry page, and what the mark and filter show in the compendium list;
   - who sets a warning;
   - the Wave 20 task list.

   The shape mirrors M17.2's `ingredient_closed_practices`:
   - one table;
   - sources through `reference_links`, as a further kind of row;
   - a seed keyed on `seed_key` that never revives a mark someone cleared.

2. **Mint Wave 20** with estimates. Each task names its prerequisite.
   - **Question tasks.** Each one asks you its questions on a one-at-a-time review page, then records each answer and `status` in its files.
     - A: a Wikipedia rating whose assessment was not found (25 questions).
     - B: an assessment of another name or taxon (10).
     - C: a CITES listing wider or narrower than the entry (25).
     - D: a prose claim with no assessor named (18).
     - E: a prose status whose scope is unknown (7).
     - F: a listing scoped to Hawaii (2).
     - G: a United Plant Savers genus-level listing (4).
     - H: whether something counts as an animal part (5).
     - I: a re-review of the 22 the survey marked already decided.
     - J: the 21 needs-review files that hold no question, each to approve or to give a question. You did not name this one; tell me if it should join I instead.
   - **Build tasks.** This is a draft; the record fixes the final list.
     - The table, `ingredient_ethical_warnings`, holding the scheme, category, scope, quoted statement, exception statement and seed key, with its `reference_links` column.
     - The services and GraphQL, curator-gated.
     - The curator's controls.
     - The entry-page notice, and the card marks and filter. This task carries the criterion to update the Code of Ethics in the same PR: the "planned" item in "Closed Practices and Where Lore Comes From", and the IUCN and CITES paragraph in "Ethical and Sustainable Sourcing".
     - The seed from `compendium/ethics/`, placed after every question task.
     - The help page, which waits on MB.175's build tasks.
   - **Files:**
     - new: `claude-docs/waves/wave-20.md` and `claude-docs/tasks/m20.md`;
     - updated: the Execution order row in `claude-docs/TASKS.md`, the "Ethical warnings around ingredients" item in `claude-docs/backlog.md` (it names the tasks), and `claude-docs/tasks/m17.md` and `claude-docs/waves/wave-17.md`, which point to Wave 20.
   - **Board:** create the milestone and the issues as `.claude/rules/task-tracking.md` says, then run `node scripts/task-board.mjs sync` from the worktree.
3. **Copy this plan** to `claude-docs/design-decisions/support.md`, "Scope the ethical warnings on ingredients (plan)".
4. **Commit each green step** in the worktree. I do not push or open a PR until you run `/create-pr`. The PR body will name the MB.175 retitle.

### Verification

The diff is prose only, so the checks are `npm run format:check` and `npm run lint` in the worktree, with no tests. Also:

- `git diff --stat origin/staging` shows only Markdown files.
- Every needs-review file in the survey is assigned to exactly one question task. I check this with a count script against the survey's lists.
- `task-board.mjs find` returns exactly one issue for each new M20.n id.

## Help and FAQ articles, and a glossary, as rows a keeper edits

Visitors and members need somewhere to learn how the site is used and what its
words mean. This record says what that is, how it is stored, who writes it and
who reads it. It records the model only: nothing is built here. The approved plan is
(see "Scope Help and FAQ articles (plan)"), and the model itself is written into
`DESIGN.md` §5, §7, §9 and §10 ("Help and FAQ articles").

The owner decided on 2026-11-03 to add the glossary, and on 2026-11-06 to add
sub pages (from M17.2) and to move the work from Wave 15 (Launch) to Wave 17
(Fast follow).

### Rows a keeper edits, or Markdown files in the repo

A help page could be a Markdown file in the repository, rendered at build
time, or a row in the database that a keeper edits.

|                           | Files in the repo                        | Rows a keeper edits                                                        |
| ------------------------- | ---------------------------------------- | -------------------------------------------------------------------------- |
| Changing a word           | A developer, a PR, a review and a deploy | A keeper saves the page and it is live (after the cache tag is refreshed)  |
| Review                    | A PR gives a reviewer a diff             | The audit columns say who changed a row and when; there is no review step  |
| Who can write             | Anyone with repository access            | A keeper only, through the same checks as the site documents               |
| Fits the existing pattern | No: nothing else the site says is a file | Yes: the site documents (M15.59) and the compendium are keeper-edited rows |
| Cost                      | No table, no admin page                  | A table, services, an admin page and a cache                               |
| First content             | Already in the diff                      | Needs a seed, keyed on `seed_key` (MB.171)                                 |

**Decision: rows.** The point of help text is to answer questions as they arrive. If every
fix to a sentence needs a deploy, wrong or missing answers stay wrong for
days. The site documents already took this route for the same reason
(the section "A keeper editor for the site's documents"), so the admin page, the Markdown renderer
and the cache pattern are known. The cost is the five build tasks, and the
loss of review on a keeper's edit, which the audit columns partly cover. A file
stays the better choice for text that must change only with the code it
describes; none of the help text is that.

### The table

One table, `help_articles`, with a `kind` of `faq`, `article` or `term`. Three
tables would repeat the same columns, the same admin page and the same
public finders. `position` orders the FAQ and is unused by a term. The slug is
unique across all three kinds among live rows, so an article's address and a
term's anchor never clash. Columns are in `DESIGN.md` §5.

### Audiences, staff routes and search

Decided by the owner on 2026-11-07. These decisions amend the sections around them; where one conflicts with an older sentence, this section stands.

**Audiences.**

- `audience` is an enum `help_audience`: `public` (anyone, signed in or not), `staff` (site keepers and curators, the `assertCurator` check) or `keeper` (site keepers only, `assertSiteAdmin`). It is not null and defaults to `public`. A CHECK keeps every `term` `public`, since the glossary is one public page.
- A child's audience is equal to its parent's or narrower, in the order public, staff, keeper. A parent made narrower than any live child is refused with an explaining error. There is no cascade. The database holds neither rule; the service (M17.14) does, because each needs a look at a second row.
- An article's list of children is filtered by the reader's audience in SQL: the public finder returns public children only, and the staff finder applies the same rules as for any row.

**Staff routes.**

- `/help/staff`, `/help/staff/[slug]` and `/help/staff/[parent]/[slug]` serve the `staff` and `keeper` rows. They live under `src/app/(shell)/help/staff/`, not under `(public)`: pages under `(public)` have no guard test and `PUBLIC_ROUTES`' `/help/*` would admit `/help/staff` past the proxy, whereas `tests/guards/shell-page-guards.test.ts` covers every page under `(shell)`. Each page still calls `requireSession()` and the curator check.
- A signed-out visitor is sent to sign in. A signed-in user who is neither keeper nor curator gets the styled not-authorized page, as `/curator` does. A curator asking for a `keeper` row gets 404. A public article is never served under `/help/staff/…`, and a staff article is never served under `/help/[slug]` (404). A staff child requested at `/help/staff/[slug]` is answered like the public rule: 308 to the nested address.
- The pages are dynamic, uncached and `noindex`, and are kept out of `PUBLIC_ROUTES` and the sitemap. `/curator` and `/keepers` link to `/help/staff`.
- The staff reads take the session, run the check and filter by audience in SQL. They are never cached, because their result depends on the viewer (CLAUDE.md rule 6). Only the public finder is cached, under the tag `help`.
- The slugs `glossary`, `staff` and `search` are reserved for every kind, refused on create and rename: `staff` and `search` would collide with `/help/[slug]`.

**Search.**

- `search_vector` is a generated `tsvector` column (`english`; title weight A, summary B, body C, the summary coalesced to an empty string) with a GIN index (M17.13). `searchHelp` (M17.14) matches through `websearch_to_tsquery` and ranks with `ts_rank`.
- Help search uses `tsvector` rather than the compendium's trigram match because trigram similarity is poor over long Markdown bodies.
- When the full-text search finds nothing, it falls back to a trigram match on the title, reusing the compendium's `word_similarity` mechanism (`src/db/repository/predicates.ts`, with `unaccent_immutable`), so a typo still finds a page.
- Results page by score through the M3.6 cursor helper, as `findPageInTiers` does with `carry: { score }` in `src/db/repository/ingredients.ts`.
- The audience scope is applied in SQL by the rules above, so a staff row's words never surface for a signed-out visitor or a practitioner. An empty or whitespace-only query returns an empty result.
- Search has its own page, `/help/search?q=…`, dynamic, uncached and `noindex`, and not in the sitemap. It is in the proxy's public routes, since signed-out visitors search the public rows. A search box sits on `/help` and on every article page, the staff pages included, and a submit goes to the page. There are no as-you-type suggestions for now.

**Widgets and screenshots (later tasks).**

- A widget is placed in a Markdown body by a tag, `::widget[name]`, from a fixed list in code. The syntax is fixed now so later tasks know the form. The renderer does nothing with the tag yet and the seeded prose carries none.
- Screenshots will be captured by a Playwright script into the repo. Both are separate tasks; a re-seed carries them into each row no keeper has edited.

### The glossary

A glossary term is a third `kind`, `term`, rather than a separate table: its
`title` is the term and its `body` is a short Markdown definition, so a keeper adds
or edits a term as they would an article. `/help/glossary` lists every term from
A to Z, with an anchor from each slug, so any page can link to one term as
`/help/glossary#steward`. The slug `glossary` is reserved so that no article
can take the glossary page's address. The seed ships at least Compendium,
Ingredients, Grimoire, Coven, Steward, Practitioner, Observer, Keeper, Curator,
Spell, Working, Variant and Form, each defined the way `CLAUDE.md` uses it (its
Vocabulary and domain invariants). The screens' role names are Steward,
Practitioner and Observer, and Keeper for the site role; the glossary uses
those, and says the code's name (`owner`, `member`, `viewer`, `admin`) only
where a definition needs it.

### The parent article

An `article` may have a parent `article` through a nullable `parent_id`,
one level deep, and its page sits under its parent's address:
`/help/closed-practices/<practice>`. M19.8's closed-practice pages need this:
one general page and one per practice.

- **One level, not a tree.** A tree needs breadcrumbs, a depth limit and
  recursive reads, and nothing asks for them. A child has no children.
- **Only an `article` has a parent, and only an `article` is one.** A CHECK
  holds the first half; the rest need a look at a second row, so the service
  enforces them and a test asserts them.
- **A slug is unique within its kind**, children included (owner, 2026-11-07).
  The article "Ingredients" and the term "Ingredients" both slugify to
  `ingredients`, and each keeps it. The unique index is on `(kind, slug)` among
  live rows. The addresses are an article `/help/[slug]`, an FAQ entry
  `/help#[slug]` and a term `/help/glossary#[slug]`. A page lookup by slug
  reads kind `article` only. A child's page is identified by its own slug and
  its parent's, and `/help/[slug]` for a child's slug answers 308 to the nested
  address, so the child has one canonical address.
- **A parent with live children cannot be deleted** until they are moved or
  deleted, and the error says so.
- **A child's audience** is equal to its parent's or narrower, and the
  parent's page lists only the children the reader may see ("Audiences, staff
  routes and search").

### The help seed

`src/db/seed/help.ts` writes the entries listed under
`src/db/seed/help-content/`, finding each row by its `seed_key`, deleted rows
included, in one transaction.

- **A listed entry** is inserted when no row has its key, and restated to the
  list's text while only the seed has written the row (`touched()` is false).
  A row a person edited is left as they wrote it. A row a person deleted is
  never written again.
- **An entry the list no longer holds** is retired: its row is soft-deleted,
  stamped as the bootstrap user, and the run prints `RETIRED <seed_key>`,
  which `migrate.yml` copies into the job summary. Retiring runs before any
  insert, so an entry moved to a new key under the same title can take the old
  row's slug.
- **A dropped row stays live** when a person edited it, printing
  `KEPT <seed_key>: edited by a person`, or when a live sub page that is not
  itself retired hangs beneath it, printing
  `KEPT <seed_key>: has live sub pages`. Sub pages are retired before their
  parents, so a dropped guide and its dropped sub pages go together.
- **A row the seed retired comes back** when its entry returns to the list: it
  is revived and restated. Only a row a person deleted (`deleted_by` not the
  bootstrap user) stays deleted.
- **`--dry-run`** runs all of this, prints the same lines and rolls back.

### The module: `help`

The table gets a module of its own, `src/modules/help/`, rather than a place
in `identity`. The articles have no tie to accounts, sessions or
workspaces beyond the `SiteAdmin` proof every keeper write takes, and
`identity` already owns the sign-in tables; adding unrelated public content
there would make it the module everything else imports for the wrong reason.
`documents` is the precedent: a table of keeper-edited public text, in a module
of its own that imports `identity` only. `help` takes the same edge,
`help: ['identity']` in `lint/sorrel-lint.js`.
The steps in `modules.md`, "Adding a module", are done by the table task
(M17.13), except the documentation rows, which this record adds.

### The two invariants it widens

Both are lines in `CLAUDE.md`, amended in the same PR as this record.

1. **Who curates.** "Keepers and curators curate the compendium, …" gains the
   help articles: a keeper alone (admin only, like the site documents)
   writes the help articles and the glossary. A curator cannot, because the
   articles are the site's own voice, as the documents are, and not
   reference data. What it gives up: a curator who spots a wrong answer must
   ask a keeper.
2. **What is public.** "The compendium is the one public surface of data" gains
   `/help` and its sub pages for `public` rows, open and indexable, carrying no
   workspace data. `staff` and `keeper` rows are not public: they sit behind
   `/help/staff`.
   That is no new kind of exposure, since the pages hold only text a keeper
   chose to publish, and the public finders take no session and cannot reach a
   workspace row.

### The move from Wave 15 to Wave 17

MB.175 and its five build tasks were first Wave 15 (Launch) work, "v1 scope"
by the decision of 2026-11-03. On 2026-11-06 the owner moved them to Wave 17
(Fast follow), before M17.6. The help pages therefore ship after launch.
Two things follow. Wave 15's axe sweep (M11.16, M11.8) no longer scans these
pages, and the Wave 17 accessibility audit (M17.9) does. And the links from
`Welcome`, the public frame, `AppShell` and M11.10's 404 page land with the
public pages (M17.16), not before.

### The build

| Task                                                       | What it builds                                                                            |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| M17.13 — Add the Help Articles Table                       | The table, with nullable `parent_id`, `audience` and `search_vector`; prerequisite MB.175 |
| M17.14 — Help Article Services and GraphQL                 | The services, the keeper's GraphQL and the cache; after M17.13                            |
| M17.15 — The Keepers' Help Page                            | `/keepers/help`; after M17.14                                                             |
| M17.16 — The Public Help Pages, the Glossary and Sub Pages | `/help`, `/help/glossary`, `/help/[slug]`, `/help/[parent]/[slug]`; after M17.14          |
| M17.17 — Seed the Help Articles and the Glossary           | The `help` seed target and the terms; after M17.13                                        |

### Glossary marks

A writer marks a term in Markdown; nothing is matched by itself, so a common word is never linked by accident. The mark is `[[Term]]` or `[[Term|shown text]]`, matched to a term row by title in any case or by slug. A mark is drawn as a link to the glossary anchor with a tooltip, so the link works without script and a touch reader still reaches the definition. The definitions come from the cached public finder with the rest of the page, not one read per term. A save that marks a term with no row is refused, so a dead mark cannot be published; a term deleted later leaves its marks showing as plain text. The cost is that a Keeper adds a term before the prose that marks it.

### Callouts

A help body marks a callout as a blockquote whose first words are one of three bold labels: `> **Note:** …`, `> **Tip:** …` or `> **Take Care:** …`. It is drawn as a notice named by its label, so a reader of the source sees an ordinary blockquote and a reader of the page sees the label above the text. A blockquote opening with any other words stays a blockquote. Word labels rather than icons, so the kind does not rest on a picture or a colour. Only help bodies read callouts: the site documents and the keeper's preview keep their blockquotes, as they do their glossary marks (claude-docs/components/help-pages.md, "Callouts").

### Widgets and screenshots

Some help text describes a rule the code holds: the units that convert, the reasons an invitation is refused, what each role may do, the save line's states. Written as prose, such a list goes stale the day the rule changes. A body therefore places a widget by name, `::widget[name]`, from a fixed list in code, and each widget imports the rule it shows, never a copy, so the page changes with the code. A save naming an unknown widget is refused, as a mark naming an unknown term is, so a broken tag cannot be published. The cost is that a new widget is a code change, not a keeper's edit.

A screenshot is a committed picture in `public/help/screens/`, shown as a figure with alt text and a caption. A Playwright script on demand writes it from a seeded slot database, so a picture can be retaken after a page changes rather than drawn by hand (claude-docs/components/help-pages.md, "Widgets" and "Screenshots").

### What it rules out

- Help text kept in the repository, for the reasons above.
- A cache of anything staff or keeper rows can reach: only the public finder is cached.
- A staff page under `(public)`, where no guard test reaches it.
- A tree of articles deeper than one level, or a child with a glossary term
  beneath it.
- A curator writing help text. A keeper-only rule is easy to widen later; a wide one is
  harder to narrow.
- Any help content carrying workspace data. The public pages read only
  `help_articles`.

This is MB.175's approved plan.

## Scope Help and FAQ articles (plan)

### Context

MB.175 (#690, Not Started, milestone Wave 15) is a scoping task: it records the help-article model, the glossary and sub pages in the docs and mints the five build tasks. Nothing is built.

You asked for two things this session:

- **Placement:** move MB.175 out of Wave 15 and into Wave 17, **before M17.6**.
- **Order with M17.3:** MB.175 runs before M17.3 finishes. M17.3's branch (`/home/node/worktrees/m17.3`, unpushed) already holds a copy of MB.175's retitle commit (`5bfc4273f`). Its M20.15 (the help page for the warnings) depends on "MB.175's build tasks", which do not have ids yet. MB.175 mints those ids first. Then M17.3 rebases onto staging, the duplicate retitle commit drops out, and M20.15 names the new ids.

M17.2 is merged (#1554). The `parent_id` amendment it asked for is already in #690's body.

### Where the work happens

- Worktree `/home/node/worktrees/mb.175-scope`, branch `feature/mb.175-scope-help-and-faq-articles`. It holds one commit, the retitle (`6113047d4`), and is not pushed. Rebase it onto `origin/staging` and reuse it. I do not create a new branch.
- `/home/node/worktrees/mb.175-glossary` is clean, sits at staging and holds no commits. I leave it alone. If you want it removed, tell me.
- Step 1: `node scripts/task-board.mjs status MB.175 "In Progress"`.

### Changes (docs only)

1. **Placement**
   - `claude-docs/TASKS.md`: remove MB.175 from Wave 15's row. Wave 17's row becomes `M17.1 → M17.3 · M17.5 · M17.4 · MB.175 · M17.13 → M17.17 · M17.6 → M17.12 · MB.163`. Correct the "Unscheduled by design" paragraph (line 66).
   - `claude-docs/waves/wave-15.md` line 27: say MB.175 moved to Wave 17.
   - `claude-docs/waves/wave-17.md` line 21: replace the "stay on Wave 15" paragraph with the move. It gives the date (the owner's call of 2026-11-06) and says MB.175 and its five tasks sit after M17.4 and before the M17.6 audits, so the accessibility audit (M17.9) scans the help pages. MB.78 stays on Wave 15.
   - **What the move changes, stated in the docs:** the help pages ship after launch, not in v1. Wave 15's axe sweep (M11.16, M11.8) no longer covers them; M17.9 does. "v1 scope" becomes "fast follow" in the mb.md entry, the waves and DESIGN.md.
   - Move the issue's milestone to Wave 17 by the method `claude-docs/task-tracking.md` gives (sync, or the script's milestone command).
2. **The model**, as #690's body sets it out, recorded in DESIGN.md §5 (the `help_articles` table: `kind` `faq`/`article`/`term`, nullable `parent_id`, one level deep, pointing at an `article`; `slug` unique among live rows; `glossary` reserved), §7 (services: `assertSiteAdmin` writes, a sessionless finder cached under tag `help`), §9 (`/keepers/help`, `/help`, `/help/glossary`, `/help/[slug]`, `/help/[parent]/[slug]`, PUBLIC_ROUTES, sitemap, links) and §10 ("Help and FAQ articles").
3. **The record:** `claude-docs/design-decisions/support.md`, "Help and FAQ articles, and a glossary, as rows a keeper edits". It weighs rows against files in the repo and names the two invariants it widens. **Module: I recommend a sixth module, `help`.** The articles have no tie to identity, and `claude-docs/modules.md` "Adding a module" gives the steps. Copy this plan in as `design-decisions/support.md`, "Scope Help and FAQ articles (plan)".
4. **CLAUDE.md:** amend the two lines. "Keepers and curators curate …" gains the help articles (writes are admin only). "The compendium is the one public surface" gains `/help`, which carries no workspace data.
5. **Mint the five build tasks** in `claude-docs/tasks/m17.md`. Ids M17.13–M17.17 are free on every branch and on the board (checked today). Recheck just before minting. Each task gets an estimate and names its prerequisite:
   - M17.13 the table, with `parent_id` (after MB.175)
   - M17.14 services and GraphQL (after M17.13)
   - M17.15 the `/keepers/help` admin page (after M17.14)
   - M17.16 the public pages: `/help`, `/help/glossary`, the nested child route and the children list, plus the story numbered next free (after M17.14)
   - M17.17 the `help` seed with the glossary terms, `migrate.yml` and `deploy.yml` (after M17.13)

   Then run `task-board.mjs sync` from the worktree.

6. **Bring the `mb.md` entry (line 5220) up to date** with #690's body: both amendments and the new placement.

### Who does it

One Sonnet agent in the worktree, briefed with these paths. Its brief tells it to describe every Bash call in one short sentence, to commit each step, and not to push. I review its work and comment on the board.

### Verification

This diff is prose only, so I run `npm run format:check` and `npm run lint`, and no tests. I check that every acceptance criterion in #690 maps to a line in the diff. After the merge, `reorder` is run from a staging checkout, dry run first.

### After MB.175

M17.3 rebases onto staging and names M17.16 (the public pages) as M20.15's prerequisite. Nothing in this PR edits the M17.3 branch.

## Promotional email needs recorded consent, withdrawn in one click

The site sends no promotional mail; every template is transactional. This decides how consent is gathered and recorded before the first one. The law, the provider rules and the class of every template are in [`../email/promotional-consent.md`](../email/promotional-consent.md); the build work is Wave 22 ([`../waves/wave-22.md`](../waves/wave-22.md)).

### The decision

- **One global standard.** Every user gets the strictest combination of the US, UK, EU and Canadian rules, because the site holds no location: a separate unticked box, a request naming the sender, the purpose and the right to withdraw, a stored record, an unsubscribe in every promotional mail, and the sender's identity and postal address in every one.
- **Consent counts at once.** Ticking the box and pressing Save is the consent; no confirmation mail follows. No statute read requires double opt-in, and the user is signed in with a verified address. This departs from M3AAWG's best practice, and the record then proves a signed-in account ticked a box, not that the address's holder read a mail.
- **Asked once, kept in `/account`.** After sign-in the site asks once, with an unticked box and Save and No Thanks buttons. The same choice lives permanently in `/account`. Consent is never part of sign-up or the terms.
- **The wording is versioned in code.** A grant records the version the user saw.
- **The record** is one live row per grant in its own audited table, written only through `withAudit`: who, when, the wording version and the source (`prompt`, `account`, `link` or `one-click`), plus when, by whom and by which source it was withdrawn.
- **Three ways to withdraw, each at once:** the RFC 8058 one-click route, a link in the mail body, and `/account`. The token lasts at least 60 days.
- **`POST /api/unsubscribe` is a sessionless route and a named exception to rule 1.** RFC 8058 forbids cookies, authorisation headers and redirects, so it cannot use `/api/graphql`. A hashed token authorises it (32 random bytes, only the SHA-256 hash stored), it is rate limited, and it is written as a seeded system account through `withAudit`.
- **A paused account gets no promotional mail.** Its consent row is kept, and mail resumes when the pause lifts.
- **The postal address is an environment variable.** A promotional send is refused with a named error while it is unset. The value is never written into the repository.
- **The four support mails can be switched off from `/account`:** received, resolved, closing soon and the reply notice. Each is on by default, and turning the reply notice off shows a warning. A signed-out sender has no account, so their support mails always send.
- **Every other mail always sends:** verification, address change, account exists, password, lock, invitation, pause, time-out and document update.
- **Consent is not refreshed at intervals.** The EDPB only recommends it, and no law read sets a lifetime.

### Why

GDPR Article 7 and EDPB guidelines 05/2020 require the controller to demonstrate consent and withdrawal as easy as giving it; CASL section 13 puts the proof on the sender; a box bundled with the terms is presumed not freely given (EDPB paragraph 13). Gmail requires RFC 8058 one-click for bulk promotional mail. Withdrawing at once is inside every deadline read (CAN-SPAM and CASL 10 business days, Yahoo 2 days). CAN-SPAM and CASL's request both require a postal address, and refusing the send is a mechanical guard where a reminder is only a hope. The security and account-standing mails fall in FTC categories 2 and 3 (16 CFR 316.3(c)). The support switches are an owner's courtesy, not a legal requirement. The sources, with the claims that rest on a search summary, are in the findings document.

### Rules out

- A standard per country: it would need a location the site does not hold.
- The US opt-out standard alone, or the UK soft opt-in: the UK, EU and Canada need prior consent, and a free invited account has no sale or negotiation.
- Double opt-in: one more mail and step for every consenting user, and no law read requires it. Revisit if a complaint rate or a provider rule demands it.
- A box at sign-up, a prompt on every sign-in, or the `/account` setting alone.
- A column on `users` for consent: it keeps no history.
- A `mailto:` header only, a link that needs sign-in, a GraphQL mutation or a server action for unsubscribe.
- A keeper-edited setting or a hard-coded address for the postal address.
- Switching off security, pause or document mail.
