# PublicFrame

`src/components/PublicFrame/` — the chrome round a public page for a visitor
who is not signed in (MB.83). It takes only `children`. The `(public)` route
group's layout (`src/app/(public)/layout.tsx`) uses it for a signed-out
request and draws [`AppShell`](app-shell.md) instead for a signed-in one, so
`/compendium` looks right to both from one layout.

## What it draws

- **A skip link** ("Skip to Content") first, targeting `#main`. Its styling is
  `.skip-link` from AppShell's stylesheet, which the layout always loads.
- **A bar** with the site name linking to `/`, a `nav` named "Site" holding the
  Compendium link, a Sign In link (`/sign-in`, `.btn--solid.btn--medium`, the size the shell's Add Ingredient button takes) and the inline
  theme toggle. At or under `$shell-brand-width` the brand reads "S&S" (the full
  name stays for a screen reader), as the shell's does, so the bar holds at 375px.
- **`main#main`** round the page. Unlike the shell, whose `#main` is a wrapper,
  the frame owns the `main` landmark, so a public page renders none. It is not a
  `.page-frame`: the `(public)` layout puts the page in `.page-column`, the
  top-left wide column `/admin/compendium` uses, so M8.18's page lands in it.

Nothing here is workspace-shaped: no coven link, no Admin, no Add Ingredient.

## Server-rendered

It is a server component with no script of its own (`ThemeToggle` is the one
client part, and works as a button after hydration), so the chrome is in the
HTML a crawler or a script-less browser receives. There is no client island
and no `me` call ([`design-decisions/mb.80-public-compendium.md`](../design-decisions/mb.80-public-compendium.md)).

The root layout's corner theme toggle is hidden when `.public-frame` is
present, as it is for `.app-shell` (`src/components/ThemeToggle/index.scss`),
so the page holds one disc.

## Styling

Tokens only: the shell bar's height and hairline, `$surface-card`, `$wide-column`
and the control height. Mixins used: `list-reset`, `focus-ring`.

## Stories

[`index.stories.tsx`](../../src/components/PublicFrame/index.stories.tsx) —
`Default`, `PhoneDark` and `PhoneLight`. Render-only.

## Testing

`tests/components/PublicFrame/index.test.tsx` asserts the landmarks, the skip
link's target and the way in. `tests/app/(public)/layout.test.tsx` asserts which
chrome each kind of visitor gets. `tests/e2e/public-frame.spec.ts` proves the
chrome with script off, the `X-Robots-Tag` header and axe at 375px; story 63
walks the visitor in.
