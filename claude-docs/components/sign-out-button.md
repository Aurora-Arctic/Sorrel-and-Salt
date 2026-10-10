# SignOutButton

`src/components/SignOutButton/` — Sign Out, beside the account page's
"Your Account" heading in its `.page-header` (added in MB.63's PR, on the
owner's call, since no task builds a way to sign out). A client component
with no props.

## Contracts

- **Better Auth's own sign-out.** It calls `src/lib/auth-client.ts`'s
  `signOut`, which posts to `/api/auth/sign-out`: the one path outside
  GraphQL, carrying the session and no application data
  ([`auth/graphql-only-exception.md`](../auth/graphql-only-exception.md)), so
  CLAUDE.md rule 1 holds.
- **A success is a full load of `/`**, so nothing the signed-in page held
  survives it, and a protected page asked for next sends the visitor to sign
  in.
- **While it runs** the button is disabled, `aria-busy`, with a spinner and
  "Signing Out".
- **A failure**, a refusal or a connection that drops, says "That didn't
  work. Please try again." in a `.notice--error` `role="alert"` beside the
  button, which is offered again.
- **A plain full-size `.btn`**, its label in title case, "Sign Out".

## Styling

Layout only: the button and the failure on one wrapping line, a `space(3)`
gap, the notice compounded as `.notice.sign-out-button__failure` past the
`body .notice` primitive.

## Stories

[`index.stories.tsx`](../../src/components/SignOutButton/index.stories.tsx) —
`Default`, inside a `.page-header` beside "Your Account". In the workshop the
call reaches no auth server, so a click shows the failure.

## Testing

`tests/components/SignOutButton/index.test.tsx` covers the busy state and the
full load of `/`, and the failure said beside it for a refusal and for a
dropped connection. `tests/db/sign-out.test.ts` signs out through Better
Auth's real endpoint: the session row goes, and the same cookie then reads as
no one. `tests/e2e/account.spec.ts` finds the button beside the heading, with
axe, and its refusal said beside it: the served build cannot complete a sign-out,
since Better Auth refuses the plain-http origin the remote browser reaches it
on, as it would any `/api/auth` POST there.
