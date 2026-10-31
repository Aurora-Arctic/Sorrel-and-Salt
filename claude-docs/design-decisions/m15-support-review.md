# Support Review Decisions

## A Signed-Out Sender Has a System Actor (M15.39)

A request can belong to an email address instead of an account, so a signed-out visitor can write in (M15.40 builds the send).

**Decision (owner, 2026-10-31).** A signed-out send is written as a seeded account, "Support, signed out". The account has no seat and `canCreateWorkspace` false. `withAudit` writes it as `created_by`, and the visitor's address goes in `support_requests.sender_email`.

**Why.** `created_by` stays `NOT NULL` on every table, and `withAudit` takes the audit ids from a session. A nullable sender column beside `created_by` would be a second place for the sender to drift from it.

**The check.** The entry asks that exactly one of the sender account and `sender_email` is set. Because `created_by` is always set, the check reads "the sender account" as an account other than the signed-out one: `(sender_email IS NOT NULL) = (created_by = <signed-out account id>)`. The id is the fixed constant `SIGNED_OUT_SENDER_ID` in `src/lib/support-sender.ts`, so a CHECK can name it. Every existing row passes, since none is created by that account.

**Not built here.** The migration does not insert the account: a seed does (M15.40). Better Auth's anonymous plugin is a separate task (M15.48) and nothing here builds toward it.

## A Signed-Out Request Is Limited, Trapped and Answered by Email (M15.40)

A visitor with no account may send a request about `accessibility` or `account`, the two topics whose problem can keep them from signing in. It goes through `sendSignedOutSupportRequest`, the one open write besides sign-in, and is stored under the seeded signed-out sender account with the visitor's address in `sender_email` (M15.39).

- **Limits.** Ten sends per address and thirty per client address in 24 hours, counted in `support_send_counts`: one row per kind (`address` or `client`) and key, holding the window start and the count. It has audit columns and its own `updated_at` trigger, and the support repository writes it through `withAudit` as the seeded signed-out sender. No new exemption to rule 3 exists; an advisory lock per key makes sends that race each other all count. The window restarts when a send finds its row older than 24 hours.
- **Refusal.** A send over a limit fails with `RATE_LIMITED`, which the GraphQL layer answers with HTTP 429 and a `Retry-After` header. The header holds the whole window (86,400 seconds), not the time left, because the count is kept per window and not per attempt.
- **Honeypot.** The form carries a hidden `website` input. A request that fills it is dropped before anything is counted or stored, and the caller is told it succeeded.
- **Mail.** A receipt mail confirms the send. A staff reply to a signed-out request is mailed whole to `sender_email`, since the sender has no account to read it in.
- **An address that belongs to an account** is still treated as signed out, so a request cannot reveal which addresses are registered.
- **The sender's id** is one named constant, `SIGNED_OUT_SENDER_ID` in `src/lib/support-sender.ts`. The seed and the schema's CHECK use it, and the CHECK's migration (`0110_support-sender-email`) holds the same literal, since SQL cannot import it. The CHECK tying `created_by` to that id is accepted.
- **Out of scope.** Better Auth's anonymous plugin (M15.48) is not built toward.
