# AppShell

`src/components/AppShell/` is the frame around every signed-in page (MB.7):
a skip link, the global bar, and the page. Its layout is
`src/app/(shell)/layout.tsx`, over `/account`, `/coven` and `/admin`. It is a
server component; only the account menu and the current-page marking in the
bar's links are client code.

## Why a route group

`(shell)` is a route group: a folder in parentheses that groups routes under a
shared layout without adding to the URL. The root layout stays free of the
session so the public pages (sign-in, and the compendium to come, MB.80) can
be rendered ahead of time. Everything that needs a signed-in viewer sits
under `(shell)`, whose layout calls `requireSession()` and then `viewerOf()`.
Pages still call their own guards, because a layout does not re-run on a
client-side navigation.

`src/app/(shell)/forbidden.tsx` sits in the group so that a signed-in
non-admin's 403 draws inside the shell: a segment's `forbidden` boundary sits
inside that segment's layout. It keeps `NotAuthorized` in a `main.page-frame`.

## Props

- `viewer`: `{ name, isAdmin, canCreate, verified }` (`ShellViewer`,
  `src/lib/types.ts`). `isAdmin` is the session's role; `canCreate` and
  `verified` come from the user row.
- `workspaces`: `{ slug, name }[]`, the viewer's covens.
- `children`: the page, with any context row its own layout renders.

`src/lib/viewer.ts` exports `viewerOf()`, which builds both from `getMe` and
`membershipsOf(session, [session.userId])`, wrapped in React `cache()` so the
shell layout and the coven layout's switcher cost one pair of lookups. The
covens are listed alphabetically by name. A refused lookup (impossible for
one's own id) throws.

## Contracts

- **The bar** has the brand, the site nav, then at the right Add Ingredient,
  the account menu and the theme disc.
- **The brand** is a link to `shellHome(viewer, workspaces)` and plain text
  for an unverified viewer. `src/lib/shell-home.ts` holds `shellHome` (admin:
  `/admin`) and `covenHome` (the first coven, else `/coven/new` for someone who
  may create one, else `/account`). M2.8 replaces both with `/coven`. At or
  under `$shell-brand-width` (a narrow phone; wider than that the bar has room
  for the name once the site links have gone) the brand reads "S&S"; the full
  name stays in the page, visually hidden, for a screen reader.
- **The site nav** (`nav` named "Site") lists Your Coven and Admin, **for an
  admin only**, on every shell page. There is no Compendium link until its
  public route exists (MB.80). With no links the nav is not rendered. At or
  under `$shell-tablet-width` the bar has no room for them beside the brand,
  Add Ingredient, the account button and the disc, so the same links are
  offered in the account panel.
- **Add Ingredient** is a real `button`, disabled until M8.16 builds the form.
  Its target will follow the area: a coven page adds to that coven, an admin
  page to the compendium, anywhere else to the viewer's only coven or a choice.
- **An unverified viewer** gets the brand as text, the account menu with Sign
  Out alone, and the theme disc, and no site nav and no Add Ingredient. (The
  theme disc stays because the root's corner toggle is hidden on shell pages;
  without it the viewer could not change the theme.)
- **The skip link** ("Skip to Content") is the first element and targets
  `#main`, a wrapper around the page's children, since each page owns its own
  `main`.
- **The context row** is the layouts' to render: the coven layout puts the
  switcher and `CovenNav` in it, the admin layout the word "Admin" and
  `AdminNav` ([`context-row.md`](context-row.md)).

## Styling

Measurements come from the signed-off mock-up, as tokens
([`styling.md`](../styling.md), "The application shell and the layers"). The
bar is `position: sticky; top: $top-inset` at `layer('shell')`, exactly
`$shell-bar-height` tall, with `margin-bottom: 0` (the layout layer gives every `header` a bottom margin; zeroed, so a context row meets the bar edge to edge and a page that fits the window does not scroll by it), on `$surface-card` with a `$hairline` bottom edge,
and its inner column is `$wide-column` wide, centred. The site links fill the
bar's height, square, and the current one is told by weight and the
`$rule-heavy` accent rule along the bar's foot, with `aria-current="page"`
and no fill, so a hover's quiet wash still shows on it. Controls are
`$control-height` tall. At or under `$shell-tablet-width` the site nav
leaves the bar and the account button is an avatar alone; at or under
`$shell-brand-width` the brand shortens and at or under `$shell-phone-width`
the theme disc leaves the bar too. `_primitives.scss` takes the
bar off `.page-frame`'s height and pads `.app-shell__main` for the bottom bar.

## Accessibility

A skip link, one `banner`, a `nav` named "Site", every link and button 44.5px
tall or more, a visible focus ring on each, and `aria-current` on the current
link.

## Stories

`index.stories.tsx`: `CovenPage`, `AdminPage`, `AccountPage`, `Unverified`,
`Phone` and `PhoneAdmin`, each inside `ShellFrame` (`.ladle/shell-frame.tsx`),
which draws the layouts' markup with fixture props.

## Testing

`tests/components/AppShell/index.test.tsx` covers who sees the Admin and Your
Coven links (an admin does; a verified member sees the rest of the bar and not
these), the brand's target, Add Ingredient being disabled, the unverified
viewer's bar, and the skip link's target. `tests/lib/shell-home.test.ts` and
`tests/lib/viewer.test.ts` cover the two helpers.
