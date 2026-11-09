# PublicFrame

`src/components/PublicFrame/` is the chrome round a public page for a visitor who is not signed in: a skip link, the site bar, and the page in a wrapper. It takes only `children`. The `(public)` route group's layout (`src/app/(public)/layout.tsx`) uses it for a signed-out request and draws [`AppShell`](app-shell.md) for a signed-in one, so `/compendium` looks right to both. Nothing in it is workspace-shaped.

## Contracts

- **The skip link** ("Skip to Content") targets `#main`: an empty `span` with `tabindex="-1"` just before the page's wrapper, as in [`AppShell`](app-shell.md), which says why it is not the wrapper itself. `.skip-link` and `.skip-target` come from AppShell's stylesheet, which the layout always loads.
- **The bar** holds the site name linking to `/`, a `nav` named "Site", a Sign In link (`sign-in-link.tsx`, `.btn--solid.btn--medium`) to `/sign-in?next=<the page's path and query>`, so signing in by any method comes back to the page; on an auth page, or inside the Suspense fallback before the query is read, it is a bare `/sign-in` and the inline theme toggle.
  - The nav holds the Compendium link, a `PendingLink`, so a press draws the list's skeleton. `aria-current="page"` at or beneath `/compendium`, not on a path that only begins with its letters.
  - At or under `$shell-brand-width` the brand reads "S&S" (the full name stays for a screen reader), so the bar holds at 375px. Both frames draw it with `BrandName` (`src/components/AppShell/brand-name.tsx`).
- **The frame does not own the `main` landmark.** The `(public)` layout renders `<main>` round the page, in `.page-column` (the top-left wide column `/curator/compendium` uses). The frame draws `.app-shell__main`, a `div` with the shell's [`MainBody`](app-shell.md) inside it; a frame-owned `main` would nest with the one `MainBody` swaps in for the skeleton's during a wait. The wrapper has no id and no `tabIndex`.
- **A wait draws the destination's skeleton under the bar.** A press of a link to a registered page (the Compendium link, an ingredient card's name or an entry's own links) swaps the page for that skeleton, chosen by its address, with one `main` and one status ([`loading.md`](../loading.md)). There is no `loading.tsx` and no route-level Suspense, so a direct request keeps its 404 or 308.
- **Server-rendered.** Its client parts are `ThemeToggle` and the shell's `SiteNav` (`AppShell/site-nav.tsx`, reads `usePathname()` to mark the current page); both render on the server too, so the chrome is in the HTML a crawler or script-less browser receives. No client island fetches and there is no `me` call ([`graphql.md`, "The compendium is public and search-indexable"](../design-decisions/graphql.md#the-compendium-is-public-and-search-indexable)).
- **One theme disc.** The root layout's corner theme toggle is hidden when `.public-frame` is present, as for `.app-shell` (`src/components/ThemeToggle/index.scss`).

## Styling

The bar's shared parts are one mixin, `frame-bar($block)` in `src/scss/_frame-bar.scss`. The nav (`.app-shell__nav`), theme-toggle wrapper (`.app-shell__theme`) and page wrapper (`.app-shell__main`) are the shell's, styled in AppShell's sheet, which `PublicFrame` imports. The one override is `.public-frame .app-shell__nav { display: block }`: the nav stays in the bar under `$shell-tablet-width`, where the shell hides it. The page rules that keep content clear of the sticky bar (the root's `scroll-padding-top`, the `.page-frame` minimum height, and the `scroll-margin-top` of `.page-frame__section` and the ingredient entry's sections) are keyed on `:is(.app-shell, .public-frame)`. `nav-current` draws the current-page mark as a `$rule-heavy` border, which forced colours keeps and a box-shadow it drops; the focus ring is inset on a nav link, which fills the bar and would clip an outside ring.

## Stories and tests

`src/components/PublicFrame/index.stories.tsx` (`States`, with a control for Default or Not On The Compendium; `LoadingTheCompendium` holds the wait). Tests: `tests/components/PublicFrame/index.test.tsx`, `tests/app/(public)/layout.test.tsx` (which chrome each visitor gets), `tests/e2e/public-frame.spec.ts` (script off, the mark signed out and in, the `X-Robots-Tag` header, axe at 375px; story 63) and `tests/e2e/navigation-wait.spec.ts` ("signed out").
