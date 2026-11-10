# Welcome

`src/components/Welcome/` — the public entry page at `/`: what Sorrel & Salt is, that it is invite-only, the way in, and a link to the public compendium. `src/app/page.tsx` reads the session and hands down one prop, the signed-in visitor's `landing`; the component renders the same page for everyone and changes only the way-in link. It never sees a role.

## The session contract

- **The page reads `getSession()`, never `requireSession()`.** `/` is in the proxy's `PUBLIC_ROUTES` and must stay reachable signed out; `requireSession()` would redirect exactly the visitors the page exists for. The page never redirects.
- **Signed out: Sign In** (`/sign-in`). **Signed in: Continue** to `signedInLanding(session)` (`src/lib/landing.ts`), the rule a sign-in with no return path lands by: `/keepers` for a keeper, `/curator` for a curator, the first coven the switcher lists for a member (entered directly, since `/coven`'s redirect would leave the browser a stop with nothing on it), `/coven` for someone in none, and for an unverified account the email page with that place as its `next`. Why the landing is not `/`: [`auth.md`, "Where the post-sign-in landing lives"](../design-decisions/auth.md#where-the-post-sign-in-landing-lives).
- **Browse the Compendium** (`/compendium`, `.btn .btn--quiet`) is offered to everyone, signed in or not: the compendium is the one public surface (MB.80).
- **Every link is `next/link`**, and `landing` is typed as Next's `Route`, so `typedRoutes` checks it. The workshop aliases `next/link` to a plain anchor (`.storybook/UnoptimizedLink.tsx`).

## Copy

The invite-only sentence names an invitation "from someone who already uses it" and nothing more specific (not a link, not an email), so the front door need not change with how invitations are delivered. The audience is "a coven or a household" (story 3's words); the page never says _workspace_ (CLAUDE.md, "Vocabulary").

## Styling

`src/app/page.tsx`'s `main` is `page-frame welcome-page`. `.page-frame` centres the column at `$measure` ([`styling.md`](../styling.md), "The page frame"); `welcome-page` styles nothing and stays only as the hook `Backdrop` reads (`body:has(.welcome-page)`) to draw its art larger on the front door. The heading and first paragraph are a `PageHeader` ([`page-header.md`](page-header.md)), the paragraph its `lede` (the shared `.lede`, so the component sets no type of its own). The way in sits a further `space(2)` down so it reads as the page's end; it takes `.btn--solid`, the page's one primary action.

## Stories and tests

`src/components/Welcome/index.stories.tsx` — `States`, with a control for Default (signed out) or Signed In, inside the page's real `main.page-frame.welcome-page` ([`workshop.md`](../workshop.md)) beside the corner `Backdrop`.

`tests/components/Welcome/index.test.tsx` covers the compendium link for both visitors, the signed-out Sign In (no "Continue") and the signed-in link to the given `landing`, a keeper's included. `tests/app/page.test.tsx` covers the page's half with the session mocked. `tests/e2e/smoke.spec.ts` renders `/` signed out against the built server (no redirect, no overflow at 375px, axe in each theme; [`testing/e2e.md`](../testing/e2e.md)); signed in as a keeper through `signInAs`, Continue reaches the admin area.
