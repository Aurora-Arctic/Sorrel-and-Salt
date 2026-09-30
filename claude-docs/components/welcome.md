# Welcome

`src/components/Welcome/` — the public entry page at `/`: what Sorrel & Salt
is, that it is invite-only, and the way in. Server component
`src/app/page.tsx` reads the session and hands down one prop, the signed-in
visitor's landing; this component renders the same page for everyone and
changes only the last link.

## The session contract

The page reads the session with **`getSession()`, never `requireSession()`**.
`/` is in the proxy's `PUBLIC_ROUTES` and must stay reachable signed out;
`requireSession()` would redirect exactly the visitors the page exists for.
The session decides one thing: a signed-out visitor is offered **Sign In**
(`/sign-in`), a signed-in one **Continue** to the landing for their role —
`postSignInLanding` (`src/lib/sign-in.ts`), the rule a sign-in with no return
path lands by: `/admin` for an admin (MB.113), and `/coven`, the post-sign-in
landing M2.8 builds, for anyone else. The page computes it and passes it as
`landing`, absent while signed out; the component never sees a role.
Nothing else on the page depends on who is looking, and the page never
redirects. Where the landing lives, and why it is not `/`, is
[`design-decisions/mb.57-post-sign-in-landing.md`](../design-decisions/mb.57-post-sign-in-landing.md).

**The sign-in link is a `next/link`; the landing link is a plain `<a>`.**
`typedRoutes` refuses an `href` for a route the build does not contain, and
`/coven` has no page until M2.8, which switches it to `<Link>` in its own PR.
Until then a signed-in visitor other than an admin who follows _Continue_
reaches a 404 behind the proxy, which the decision record names as the
interim state. In the workshop, `next/link`
is aliased to a plain anchor (`.ladle/UnoptimizedLink.tsx`), as Ladle's
Next.js guide prescribes.

## Copy

The invite-only sentence names an invitation "from someone who already uses
it" and nothing more specific — not a link, not an email — because MB.61
moves invitations from a copied URL to a verified address, and the front door
should not have to change with it. The audience is "a coven or a household",
story 3's own words; the page never says _workspace_, which is the code's
noun (CLAUDE.md, "Vocabulary").

## Styling

Layout only — a `.welcome-page` frame that centers the page without an
AppShell, the same reason `.sign-in-page` exists, and the reading measure, `$measure`.
The heading and paragraphs take `_typography.scss`'s global rules; the link
takes `.btn` (`_primitives.scss`). This is the first `.btn` on an anchor, so
the component restates `.btn`'s own text colour for `:visited` and on hover
(`_typography.scss`'s `a:visited` outranks `.btn` alone) and drops the
underline. Tokens used: `$accent`, `$text-on-color`, `$measure`.

## Stories

[`index.stories.tsx`](../../src/components/Welcome/index.stories.tsx) —
`Default` (signed out) and `SignedIn` (the `/coven` landing). Render-only, no
test ids, no snapshots.

## Testing

`tests/components/Welcome/index.test.tsx` covers: the level-one heading and
what the site is; the invite-only sentence and how to get in; the signed-out
link to `/sign-in` with no "Continue"; the signed-in link to the `landing`
given, with no sign-in offered anywhere on the page; and that the
introduction is the same signed in. Role and label queries only. Runs in the
`dom` (jsdom) Vitest project — `npm run test:coverage`.
`tests/app/page.test.tsx` covers the page's half, with the session mocked:
Sign In signed out, and Continue to `/admin` for an admin and `/coven` for
anyone else.

`tests/e2e/smoke.spec.ts` renders `/` against the built server signed out: no
redirect, the heading and the invite-only text visible, the link reaching
`/sign-in`, and the axe scan. Signed in through `signInAs`, an admin's
Continue reaches the admin area and anyone else's links to `/coven`.
