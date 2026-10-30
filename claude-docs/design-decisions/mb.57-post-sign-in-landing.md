# MB.57 — Where the post-sign-in landing lives

**Decided:** `/` is the public entry page, for everyone. (Since MB.80 the
compendium pages are public as well; `/` stays the entry page and the
post-sign-in landing stays `/coven`.) The post-sign-in
landing — into their workspace, the create form, or the invite-only
explanation (M2.8) — is its own route, **`/coven`**, protected like every
other page. A sign-in with no `next` lands there — an admin's, since MB.113,
on `/admin` instead, and `safeReturnPath` now has no fallback, since which
landing applies is the role's ([`auth.md`](../auth.md), "Route protection").

## The question

DESIGN.md §9 originally made `/` the post-sign-in landing, and M2.7's route
protection first built it that way: a signed-out visit to `/` redirected to
`/sign-in`. It was then directed to leave `/` public as the site's general
entry page, which left two pages claiming one path. Either `/` renders the
entry content signed out and M2.8's three states signed in, or the landing
moves.

## Why the landing moves

- **Two audiences, one file.** The front door is a page of prose that is the
  same for everyone. The landing is per-user routing — a redirect for the
  common case, a form for the second, an explanation for the third. Folded
  into `/`, the most common visitor (signed in, with a workspace) could never
  read the front door at all, because their visit is a redirect.
- **One guard, not two.** `/coven` is protected by the proxy and calls
  `requireSession()` like every other protected page. A combined `/` would
  have to read `getSession()` and then hand-write the three-way branch plus
  the signed-out case, which is `requireSession()`'s redirect rebuilt by hand
  on the one page that must not redirect.
- **The acceptance test stays honest.** Story 2's test reads the landing's
  source for "invite-only". The front door says "invite-only" to everyone, so
  if the landing were `/`, this task's own copy would turn story 2 green a
  wave and a half before M2.8 builds the state the story is about.
- **Nobody lands back on the door they came in by.** After the OAuth round
  trip, a visitor who signed in from the front door arrives at the landing,
  which routes them; with `next` defaulting to `/` they would arrive at the
  same page with one link changed.

## Why `/coven`, not `/home`

The three states are all statements about workspace membership: go into
yours, make one, or here is how one gets in. That is the index of the
workspaces the visitor belongs to, and it sits above `/coven/[slug]`, where
those workspaces live — the only place the site's URL vocabulary already has
a word for it. A generic `/home` would exist only to redirect into
`/coven/[slug]`. The URL segment says _coven_ by §5's rule; code, schema and
prose still say _workspace_.

## What `/` does with the session

It reads `getSession()` — never `requireSession()`, which would protect it
again — for exactly one decision: whether the way in is "Sign in" (to
`/sign-in`) or "Continue" (to `/coven`, or since MB.113 `/admin` for an
admin, the landing a sign-in with no return path gets; since MB.257 the callback and
Continue send a member of a coven straight into it, so `/coven` is only the stop for someone
in none). For an account whose address is unverified, Continue goes straight to
`/account/email?next=<that landing>` (from `sessionIsVerified()`, built by `emailPagePath`), since
every page it could lead to would send the account there; the landing is its `next`, so it goes on
there once verified. Everything else on
the page is the same for both. `/` stays in `PUBLIC_ROUTES`.

## What this rules out

- `/` redirecting anyone, anywhere, for any session state.
- A third route for any part of the landing. The create form and the
  explanation are `/coven`'s states, not siblings of it; M2.8 decides their
  shape.
- Reading `/` in an acceptance test for anything about a signed-in user.

## Since M2.8

`/coven` has its page (`src/app/(shell)/coven/page.tsx`). A member is
redirected into the first coven the switcher lists; someone with none who may
create one is offered the create page; anyone else reads that the site is
invite-only and how to get in. "Continue" on the front door and on the email
page are `<Link>`s, typed by `postSignInLanding` returning Next's `Route`
(since MB.257, `signedInLanding`, which also sends a member into their coven).

Since M10.32, both non-member states tell the account, in a notice, how many
pending coven invitations wait for its verified email and link to the account
page's Invitations section, where they are listed and accepted; a member is
still redirected. The first build listed them on the landing itself, and the
owner moved the list to the account page on 2026-10-13
([`m10.32-accept-from-the-landing.md`](m10.32-accept-from-the-landing.md),
"Where the list lives").
