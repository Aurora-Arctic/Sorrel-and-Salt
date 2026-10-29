# PublicFrame

`src/components/PublicFrame/` — the chrome round a public page for a visitor
who is not signed in (MB.83). It takes only `children`. The `(public)` route
group's layout (`src/app/(public)/layout.tsx`) uses it for a signed-out
request and draws [`AppShell`](app-shell.md) instead for a signed-in one, so
`/compendium` looks right to both from one layout.

## What it draws

- **A skip link** ("Skip to Content") first, targeting `#main`: an empty
  `span` with `tabindex="-1"` just before the page's wrapper, as in
  [`AppShell`](app-shell.md), which says why it is not the wrapper itself. Its
  styling is `.skip-link` and `.skip-target` from AppShell's stylesheet,
  which the layout always loads.
- **A bar** with the site name linking to `/` (set in the heading face at `$brand-size`, as the shell's is), a `nav` named "Site" holding the
  Compendium link (a `PendingLink` carrying `siteLinkTarget('/compendium')`, so a press draws the list's skeleton, M12.47), which carries `aria-current="page"` at or beneath `/compendium` (MB.120), a Sign In link (`/sign-in`, `.btn--solid.btn--medium`, the size the shell's Add Ingredient button takes) and the inline
  theme toggle. At or under `$shell-brand-width` the brand reads "S&S" (the full
  name stays for a screen reader), as the shell's does, so the bar holds at 375px.
- **`.app-shell__main`**, a wrapper `div` round the page, as the shell's is, with the
  shell's [`MainBody`](app-shell.md) inside it. The frame does not own the
  `main` landmark: the `(public)` layout renders `<main>` round the page, in
  `.page-column`, the top-left wide column `/admin/compendium` uses, so M8.18's
  page lands in it. The wrapper was chosen over a frame-owned `main` whose
  skeleton dropped its own, so that `MainBody` is reused unchanged: during a
  wait it swaps the layout's `main` for the skeleton's, and a `main` on the
  wrapper would have nested the two. The wrapper has no id and no `tabIndex`:
  the skip link's target is the span before it (M12.48).

Nothing here is workspace-shaped: no coven link, no Admin, no Add Ingredient.

## The wait

A press of a link that names a `main` target (the frame's Compendium link,
`cards`; an ingredient card's name or an entry's own links, `page` with its
jump menu) swaps the page for the destination's skeleton under the frame's
bar, with one `main` and the hidden `<h1>Loading</h1>`, exactly as the shell
does ([`loading.md`](../loading.md)). The skeleton draws in the destination's
own frame. There is no `loading.tsx` and no route-level Suspense, so a direct
request keeps its 404 or 308.

## Server-rendered

The frame is a server component. Its two client parts are `ThemeToggle`, which
works as a button after hydration, and the shell's `SiteNav` (`AppShell/site-nav.tsx`), which reads
`usePathname()` to mark the current page, given the Compendium as its one link. Both
still render on the server, so the chrome, the mark included, is in the HTML a
crawler or a script-less browser receives. There is no client island that
fetches and no `me` call ([`design-decisions/mb.80-public-compendium.md`](../design-decisions/mb.80-public-compendium.md)).

The root layout's corner theme toggle is hidden when `.public-frame` is
present, as it is for `.app-shell` (`src/components/ThemeToggle/index.scss`),
so the page holds one disc.

## Styling

Tokens only: the shell bar's height and hairline, `$surface-card`, `$wide-column`,
the control height and `$brand-size`. Mixins used: `heading-face` (the brand),
`list-reset`, `focus-ring` (inset on a nav link, which fills the bar and would
clip an outside ring), `theme-transition` on the nav link, and `nav-current`
for the current page: weight and a `$rule-heavy` accent rule drawn as a border,
which forced colours keeps and a box-shadow it drops. The shell's nav draws the
same mark from the same mixin.

The bar’s parts that are the same in both frames (the sticky bar and its `--sticky-top`, inner row, brand with its right padding, initials, end group, and their narrow-window rules) are one mixin, `frame-bar($block)` in `src/scss/_frame-bar.scss`, included by both stylesheets. The nav is the shell’s too: the frame renders `SiteNav` with the one Compendium link and takes its class, `.app-shell__nav`, styled in AppShell’s sheet (which `PublicFrame` imports), link padding at `$shell-phone-width` included. So are the theme-toggle wrapper (`.app-shell__theme`) and the page wrapper (`.app-shell__main`). What stays here is one override, `.public-frame .app-shell__nav { display: block }`: the nav stays in the bar under `$shell-tablet-width`, where the shell hides it. The brand is a `PendingLink` as the shell’s is. The two brand spans are `BrandName` in `src/components/AppShell/brand-name.tsx`, used by both. The page rules that keep content clear of the sticky bar (the root's `scroll-padding-top`, the `.page-frame` minimum height, and the `scroll-margin-top` of `.page-frame__section` and the ingredient entry's sections) are keyed on `:is(.app-shell, .public-frame)`, so they apply in both frames.

## Stories

[`index.stories.tsx`](../../src/components/PublicFrame/index.stories.tsx) —
`States`, with a control that chooses Default, on the compendium so its link carries
the current-page mark, and Not On The Compendium, on a page the nav does not
name, so the link rests unmarked. Render-only, bar
`LoadingTheCompendium`, which presses the Compendium link from an entry's
page and holds the wait, so the cards skeleton stands under the bar.

## Testing

`tests/components/PublicFrame/index.test.tsx` asserts the landmarks, the skip
link's target, the way in and the current-page mark (present at and beneath
`/compendium`, absent elsewhere and on a path that only begins with its letters), and that pressing the Compendium link leaves one `main` holding one status, one h1, the bar standing and the link busy. `tests/app/(public)/layout.test.tsx` asserts which
chrome each kind of visitor gets. `tests/e2e/public-frame.spec.ts` proves the
chrome with script off (the page's `main` inside `.app-shell__main`, after the `span#main` target), the current-page mark signed out and in, the `X-Robots-Tag` header and axe at 375px; story 63
walks the visitor in. `tests/e2e/navigation-wait.spec.ts` ("signed out") proves the wait in a browser: the Compendium link from an entry and a card from the list each draw one wait under held answers, reduced motion leaves only the pulse with axe passing, and a direct request for an unknown entry still answers 404.

## Source notes

Comments in the source that point here; each is the detail behind a one-line comment.

- `index.tsx`: The frame round a public page for a visitor who is not signed in: a skip link, the site name, a nav holding the Compendium and the way in, and the page in a wrapper after the skip link's target. Nothing workspace-shaped. A signed-in visitor gets `AppShell` from the same layout instead (`src/app/(public)/layout.tsx`). `.skip-link` and `.skip-target` are drawn by AppShell's stylesheet, which the layout always loads with it. A server component; its nav is the shell's `SiteNav`, the one client part (it marks the current page), and renders on the server too, so the chrome is in the HTML a crawler or a script-less browser receives. The body is the shell's `MainBody`, so a move between public pages draws the destination's skeleton under the bar as the shell does. See claude-docs/components/public-frame.md.
