# MB.71 — Link a second sign-in method from the account page

**Status:** decided and built. Only the decisions, the reasons and what they rule out are kept here.

## Decision

account is unknown is linked to the row holding its email only if the _provider_
not map, hence the generic sentence. (Its `unable_to_link_account` sentence is
also wrong: that code means "provider did not vouch during a link", not "already
server-side (`api/routes/account.mjs`), not client-supplied;
`allowDifferentEmails`, then creates the `accounts` row. It never writes
`emailVerified`, issues no session (so MB.60's after-hook does not run), and
never consulted again, so nOAuth cannot reach it. `promotePrimaryAdmin`
which during a callback holds the parsed state. `link` is present only for a
unchanged. In the link branch the profile's `emailVerified` feeds only Better
linked provider's profile never rewrites the row.
// Vouched only inside a link flow /link-social began under a session: there the
const vouchOnlyWhenLinking = async () => ({
