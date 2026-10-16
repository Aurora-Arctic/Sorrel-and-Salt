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
(`/sign-in`), a signed-in one **Continue** to where they belong —
`signedInLanding(session)` (`src/lib/landing.ts`), the rule a sign-in with no
return path lands by: `/admin` for an admin (MB.113), the first coven the
switcher lists for a member, and `/coven`, the post-sign-in landing (M2.8),
for someone in none. A member goes into the coven directly rather than via
`/coven`, whose redirect would leave the browser a stop with nothing on it
(MB.257). The page computes it and passes it as
`landing`, absent while signed out; the component never sees a role.
Nothing else on the page depends on who is looking, and the page never
redirects. Where the landing lives, and why it is not `/`, is
[`design-decisions/mb.57-post-sign-in-landing.md`](../design-decisions/mb.57-post-sign-in-landing.md).

**Both links are `next/link`.** `landing` is typed as Next's `Route`
(`signedInLanding` returns one), so `typedRoutes` checks it, now that
`/coven` has a page. In the workshop, `next/link`
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

The page draws the frame: `src/app/page.tsx`'s `main` is
`page-frame welcome-page`. `.page-frame` centres the column without an
AppShell and stops it at the reading measure, `$measure`
([`styling.md`](../styling.md), "The page frame"). `welcome-page` styles
nothing; it stays only as the hook `Backdrop` reads,
`body:has(.welcome-page)`, to draw its art larger on the front door.

The component's own column is a flex column with a `space(5)` gap. The
heading and the first paragraph are a `.header`, the paragraph a `.lede`,
as every section head is. The way in sits a further `space(2)` down, so it
reads as the page's end. The link takes `.btn .btn--solid`, since it is the
page's one action. It is a `.btn` on an anchor, which needs nothing of its
own: `.btn` drops the underline and outranks the visited ink
([`styling.md`](../styling.md), "Buttons"). Function used: `space()`.

**The lede is the shared `.lede`, at body size in the muted ink**, as every
section head's is. Before MB.116 it was 1.125rem in the body ink, a step
above the paragraphs; the owner chose the shared one at MB.116's sign-off,
so the component sets no type of its own.

## Stories

[`index.stories.tsx`](../../src/components/Welcome/index.stories.tsx) —
`Default` (signed out), `SignedIn` (the `/coven` landing), and `PhoneDark`
and `PhoneLight` at 375px. Each renders inside the page's real
`main.page-frame.welcome-page` ([`workshop.md`](../workshop.md)).
Render-only, no test ids, no snapshots.

## Testing

`tests/components/Welcome/index.test.tsx` covers the way in: the signed-out
link to `/sign-in` with no "Continue", and the signed-in link to the
`landing` given, an admin's included, with no Sign In. What the page says is
copy, and no test asserts it. Role and label queries only. Runs in the `dom`
(jsdom) Vitest project — `npm run test:coverage`.
`tests/app/page.test.tsx` covers the page's half, with the session mocked:
Sign In signed out, and Continue signed in.

`tests/e2e/smoke.spec.ts` renders `/` against the built server signed out,
with no redirect, nothing scrolling and nothing pushing it sideways at 375px,
and runs the axe scan in each theme ([`testing/e2e.md`](../testing/e2e.md));
signed in as an admin through `signInAs`, Continue reaches the admin area.
