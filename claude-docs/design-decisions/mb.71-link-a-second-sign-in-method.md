# Linking a second sign-in method

**Status:** decided. Live home: `claude-docs/auth/admin-bootstrap.md`.

## Decision

- **A second provider is added by an explicit link** that `/link-social` began under a session. At sign-in, an unknown provider account is linked to the row holding its email only if the provider vouches for the address, which Microsoft and Facebook never do, so for them the explicit link is the only way. Inside a link `vouchWhenLinking` (`src/lib/auth.ts`) makes every provider vouch, and that value feeds only Better Auth's link decision.
- **The link flow's state is server-side** (Better Auth's `api/routes/account.mjs`), not client-supplied, and uses `allowDifferentEmails`; it then creates the `accounts` row.
- **It never writes `emailVerified`**, issues no session (so the after-hook does not run), and a linked provider's profile never rewrites the row. The link is never consulted again at sign-in, so an email-takeover attack on the provider cannot reach it.
- **Better Auth's `unable_to_link_account` sentence is wrong** for what the code means ("provider did not vouch during a link"), so the page shows a generic sentence instead.

## Why

Linking by email at sign-in lets a provider that does not verify addresses take over an account, so the vouch is lent only inside a flow a session started.

## Rules out

- Linking by an unvouched email at sign-in.
