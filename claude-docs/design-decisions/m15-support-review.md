# Support Review Decisions

## A Signed-Out Sender Has a System Actor (M15.39)

A request can belong to an email address instead of an account, so a signed-out visitor can write in (M15.40 builds the send).

**Decision (owner, 2026-10-31).** A signed-out send is written as a seeded account, "Support, signed out". The account has no seat and `canCreateWorkspace` false. `withAudit` writes it as `created_by`, and the visitor's address goes in `support_requests.sender_email`.

**Why.** `created_by` stays `NOT NULL` on every table, and `withAudit` takes the audit ids from a session. A nullable sender column beside `created_by` would be a second place for the sender to drift from it.

**The check.** The entry asks that exactly one of the sender account and `sender_email` is set. Because `created_by` is always set, the check reads "the sender account" as an account other than the signed-out one: `(sender_email IS NOT NULL) = (created_by = <signed-out account id>)`. The id is the fixed constant `SIGNED_OUT_SENDER_ID` in `src/lib/support-sender.ts`, so a CHECK can name it. Every existing row passes, since none is created by that account.

**Not built here.** The migration does not insert the account: a seed does (M15.40). Better Auth's anonymous plugin is a separate task (M15.48) and nothing here builds toward it.
