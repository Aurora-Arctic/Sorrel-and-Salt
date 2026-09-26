# MB.57 — Where the post-sign-in landing lives

**Decided:** `/` is the public entry page, for everyone. The post-sign-in
landing — into their workspace, the create form, or the invite-only
explanation (M2.8) — is its own route, **`/coven`**, protected like every
other page. `/sign-in`'s default `next`, and so `safeReturnPath`'s fallback,
is `/coven`.

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
`/sign-in`) or "Continue" (to `/coven`). Everything else on the page is the
same for both. `/` stays in `PUBLIC_ROUTES`.

## What this rules out

- `/` redirecting anyone, anywhere, for any session state.
- A third route for any part of the landing. The create form and the
  explanation are `/coven`'s states, not siblings of it; M2.8 decides their
  shape.
- Reading `/` in an acceptance test for anything about a signed-in user.

## Until M2.8 lands

`/coven` has no page: a signed-in visitor who follows "Continue" reaches a
404 behind the proxy, and a signed-out one is redirected to `/sign-in` as for
any protected route. That is the state of the product rather than of this
task — there is no signed-in page of any kind before Wave 8 — and story 2's
test stays red on the route's absence until M2.8 builds it.
