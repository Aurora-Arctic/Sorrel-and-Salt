# PublicFrame

`src/components/PublicFrame/` — the chrome round a public page for a visitor
who is not signed in (MB.83). It takes only `children`. The `(public)` route
group's layout (`src/app/(public)/layout.tsx`) uses it for a signed-out
request and draws [`AppShell`](app-shell.md) instead for a signed-in one, so
`/compendium` looks right to both from one layout.

## What it draws

- **A skip link** ("Skip to Content") first, targeting `#main`. Its styling is
  `.skip-link` from AppShell's stylesheet, which the layout always loads.
- **A bar** with the site name linking to `/` (set in the heading face at `$brand-size`, as the shell's is), a `nav` named "Site" holding the
  Compendium link, which carries `aria-current="page"` at or beneath `/compendium` (MB.120), a Sign In link (`/sign-in`, `.btn--solid.btn--medium`, the size the shell's Add Ingredient button takes) and the inline
  theme toggle. At or under `$shell-brand-width` the brand reads "S&S" (the full
  name stays for a screen reader), as the shell's does, so the bar holds at 375px.
- **`main#main`** round the page. Unlike the shell, whose `#main` is a wrapper,
  the frame owns the `main` landmark, so a public page renders none. It is not a
  `.page-frame`: the `(public)` layout puts the page in `.page-column`, the
  top-left wide column `/admin/compendium` uses, so M8.18's page lands in it.

Nothing here is workspace-shaped: no coven link, no Admin, no Add Ingredient.

## Server-rendered

The frame is a server component. Its two client parts are `ThemeToggle`, which
works as a button after hydration, and `public-nav.tsx`, which reads
`usePathname()` to mark the current page, as the shell's `SiteNav` does. Both
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

## Stories

[`index.stories.tsx`](../../src/components/PublicFrame/index.stories.tsx) —
`Default`, `PhoneDark`, `PhoneLight` and `NotOnTheCompendium`, then MB.120's
`ProposalCurrentPageBare` and `ProposalCurrentPage` (with phone variants): the
bar without and with the current-page mark, the second being what is built. The
compendium page's head (`ProposalCompendiumHead`) is in
`.ladle/compendium-head.stories.tsx`. Render-only.

## Testing

`tests/components/PublicFrame/index.test.tsx` asserts the landmarks, the skip
link's target, the way in and the current-page mark (present at and beneath
`/compendium`, absent elsewhere and on a path that only begins with its letters). `tests/app/(public)/layout.test.tsx` asserts which
chrome each kind of visitor gets. `tests/e2e/public-frame.spec.ts` proves the
chrome with script off, the current-page mark signed out and in, the `X-Robots-Tag` header and axe at 375px; story 63
walks the visitor in.
