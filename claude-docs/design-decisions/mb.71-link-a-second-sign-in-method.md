# Linking a second sign-in method

**Status:** decided. Live home: `claude-docs/auth/admin-bootstrap.md`.

## Decision

- **A provider account is linked to an existing row only inside a link flow** that `/link-social` began under a session. There the provider's profile `emailVerified` feeds only Better Auth's link decision, and the check is a `vouchOnlyWhenLinking` hook. Outside a link flow nothing is linked by email.
- **The link flow's state is server-side** (`api/routes/account.mjs`), not client-supplied, and uses `allowDifferentEmails`; it then creates the `accounts` row.
- **It never writes `emailVerified`**, issues no session (so the after-hook does not run), and a linked provider's profile never rewrites the row. The link is never consulted again at sign-in, so an email-takeover attack on the provider cannot reach it.
- **Better Auth's `unable_to_link_account` sentence is wrong** for what the code means ("provider did not vouch during a link"), so the page shows a generic sentence instead.

## Why

Linking by email at sign-in lets a provider that does not verify addresses take over an account.

## Rules out

- Linking by unverified email at sign-in.
