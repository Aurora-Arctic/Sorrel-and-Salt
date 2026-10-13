# SignOutButton

`src/components/SignOutButton/` — Sign Out, held in the shell's account menu
(`AccountMenu`; it sat beside the account page's heading until MB.7) (added in MB.63's PR, on the
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
  "Signing Out": a `BusyButton` ([`busy-button.md`](busy-button.md)).
- **A failure**, a refusal or a connection that drops, says "That didn't
  work. Please try again." (`GENERIC_FAILURE`, `src/lib/graphql-failure.ts`)
  in an error `Notice` beside the button, which is offered again. The call
  is Better Auth's, not GraphQL's, but it has no more to say about why than a
  lost request does, so it takes the same sentence.
- **A plain full-size `.btn`**, its label in title case, "Sign Out".
- **SignInMethods' Sign In Again makes the same call** in the same shape,
  a refusal or a dropped connection said in `GENERIC_FAILURE`, but lands on
  `/sign-in?next=%2Faccount` rather than `/`, so a stale session comes back
  to the account page fresh
  ([`sign-in-methods.md`](sign-in-methods.md), "A stale session signs in
  again").

## Styling

Layout only: the button and the failure on one wrapping line, a `space(3)`
gap. The notice needs no rule of its own, since the `.notice` primitive
already sets no margin.

## Stories

[`index.stories.tsx`](../../src/components/SignOutButton/index.stories.tsx) —
`Default`, the button alone, as it sits at the foot of the account menu (the
menu's own stories, under "Shell / Account Menu", show it there). In the
workshop the call reaches no auth server, so a click shows the failure.

## Testing

`tests/components/SignOutButton/index.test.tsx` covers the busy state and the
full load of `/`, and the failure said beside it for a refusal and for a
dropped connection. `tests/db/sign-out.test.ts` signs out through Better
Auth's real endpoint: the session row goes, and the same cookie then reads as
no one. `tests/e2e/shell.spec.ts` opens the account menu, routes a refusal of the
sign-out call, and finds it said beside the button, with axe. The refusal is
routed rather than waited for from Better Auth, since whether the served build
refuses it depends on the origin the browser reaches it on (Better Auth refuses
a plain-http origin, as it would any `/api/auth` POST there).
