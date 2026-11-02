# AppShell

`src/components/AppShell/` is the frame around every signed-in page (MB.7):
a skip link, the global bar, and the page. Its layout is
`src/app/(shell)/layout.tsx`, over `/account`, `/coven` and `/admin`. It is a
server component; only the account menu and the current-page marking in the
bar's links are client code.

## Why a route group

`(shell)` is a route group: a folder in parentheses that groups routes under a
shared layout without adding to the URL. The root layout stays free of the
session so a public page can choose its own chrome. Everything that needs a signed-in viewer sits
under `(shell)`, whose layout calls `viewerOf()`. That sends a signed-out
visitor to sign in, but never sends an unverified account to the email page:
the page does that (MB.256, [Route protection](../auth/route-protection.md),
"Where the email redirect is thrown"). Pages call their own guards anyway,
because a layout does not re-run on a client-side navigation.

`src/app/(shell)/forbidden.tsx` sits in the group so that a signed-in
non-admin's 403 draws inside the shell: a segment's `forbidden` boundary sits
inside that segment's layout. It keeps `NotAuthorized` in a `main.page-frame`.

`(public)` is the sibling group for the public compendium (MB.80, MB.83). Its
layout, `src/app/(public)/layout.tsx`, reads `viewerIfSignedIn()`: null for a
signed-out visitor, who gets [`PublicFrame`](public-frame.md); otherwise the
viewer and covens, drawn in this shell. It never redirects. Both chromes put the
page in a wrapper `div`, so the layout owns the plain `<main>` in both
branches (the page in `.page-column` inside it), and a public page
renders no landmark of its own. An unverified account is shown the shell's
unverified chrome (the brand link, the account menu, the Compendium link) rather
than being sent to `/account/email`: the compendium is public, and nothing
there is workspace data.

## Props

- `viewer`: `{ name, canCurate, canCreate, verified, pendingInvitations }`
  (`ShellViewer`, `src/lib/types.ts`). `canCurate` is true for a curator or an admin, read from the session's role (M11.20);
  `canCreate` and `verified` come from the user row; `pendingInvitations` is
  how many coven invitations wait for the viewer's verified address (M10.32).
- `workspaces`: the viewer's covens (`ShellWorkspace[]`), in the switcher's
  order. The shell reads only the first one's slug, for the brand and Your
  Coven.
- `children`: the page, with any context row its own layout renders.

The coven layout and the create page read the same list for their switchers.
`src/lib/viewer.ts` exports `viewerOf()`, which builds
the viewer and that list from `getMe`, `membershipsOf(session, [session.userId])`
and, for a verified account only, `countReceivedInvitations(session, undefined)`
(an unverified account reads 0 and costs no query), wrapped in React `cache()`
so the shell layout, the coven layout's switcher and the `/coven` landing's
notice cost one set of lookups: one count statement per shell page. The count
goes to the account menu, which shows it ([`account-menu.md`](account-menu.md)). The
covens are listed alphabetically by name. A refused lookup (impossible for
one's own id) throws.

## Contracts

- **The bar** has the brand, the site nav, then at the right Add Ingredient,
  the account menu and the theme disc. The disc stays in the bar at every
  width, a phone's included (the owner's call, M10.32): the account panel holds
  no theme switch.
- **The brand** is a link to `/`, the front page, for every viewer, an unverified one included (`/` is public),
  now that Your Coven and Admin sit in the site nav; `/` reads the session
  and offers a signed-in visitor their landing, without redirecting. `src/lib/shell-home.ts` holds `covenHome` (the Your Coven link): `/coven/<slug>` of the first coven the switcher lists, or the
  `/coven` landing (M2.8) for someone in none, which offers the create page or
  explains the invitation. The links go into the coven themselves rather than
  to `/coven`, which would only redirect a member there and leave the browser
  a stop with nothing on it, most visibly from `/admin` (MB.257). At or
  under `$shell-brand-width` (a narrow phone; wider than that the bar has room
  for the name once the site links have gone) the brand reads "S&S"; the full
  name stays in the page, visually hidden, for a screen reader.
- **The site nav** (`nav` named "Site") lists the Compendium for every viewer, verified or not, and, on every shell page, Your Coven ("Your Covens" when the viewer is in more than one coven) **for a verified account that is in at least one coven, and for a verified curator or admin in none** (that link goes to `/coven`), and Admin **for a verified curator or admin** (`canCurate`) alone. At or
  under `$shell-tablet-width` the bar has no room for them beside the brand,
  Add Ingredient, the account button and the disc, so the same links are
  offered in the account panel.
- **Add Ingredient** is `add-ingredient-button.tsx`, a client part: a plain button for one destination (the compendium for a curator, each coven they may write to), a split button with a menu of them all, each “to” its name, for two or more, and nothing without one. The menu draws the places in two labelled groups, **Compendium** and **Coven**, when the viewer may add to both, and as a plain list when to one kind alone (the owner’s call, 2026-10-20). The side the viewer is on comes first, learned from the address alone (`usePathname()`): a coven’s pages (`covenSlugOf`) put the covens first, any other page the compendium, as the bar has always led with it. The groups are made by the shared `sectionsFor` ([`menu-button.md`](menu-button.md), "Sections"); the chevron and its menu are a `MenuButton` (`add-ingredient-menu.tsx`, M14.27), the chevron alone shown as its `icon` and named “Choose Where to Add”, its menu named “Add Ingredient To” (`menuLabel`), so the groups, the keys and the look are MenuButton’s own. A coven opens a modal headed by its name over “Add Ingredient”, named “Add Ingredient to” the coven; the compendium navigates to `/admin/compendium?new` (claude-docs/components/modal.md, "Add Ingredient").
  Its target will follow the area: a coven page adds to that coven, an admin
  page to the compendium, anywhere else to the viewer's only coven or a choice.
- **An unverified viewer** gets the brand link, the account menu with Sign
  Out alone, and the theme disc, a site nav holding the Compendium alone, and no Add Ingredient. (The
  theme disc stays because the root's corner toggle is hidden on shell pages;
  without it the viewer could not change the theme.)
- **The body** (`.app-shell__main`) is wrapped in `main-body.tsx`, a client part (M12.33). While a navigation aimed at the `main` region is pending ([loading](../loading.md)), it hides the page (`visibility: hidden`, `inert`, `aria-hidden`, still mounted at its full height so Back returns to the same place, MB.271) and lays one `Skeleton` of the target's shape over it inside a `main`, pinned under the bar, so the landmark survives the wait, with a visually hidden `<h1>Loading</h1>` because the page's heading is hidden with it (the owner's call, 2026-10-19: kept, so a screen reader hears it and the skeleton's "Loading" status). A `coven` or `admin` target is `SectionBody`'s (the page under that section's context row, which stays), and a navigation with no target (a refresh) leaves the page standing. The `main` is drawn in the frame the target names, top-aligned: `wide`, `with-nav` and `entry` in `page-column` (the last two with the side menu drawn, `entry` in the ingredient page's wide grid), `narrow` in `page-frame--narrow`, with a `panel` under a form. When the wait ends, the skeleton stays over the arrived page for 200ms and fades out ([`SkeletonFade`](skeleton-fade.md)); the body is wrapped in a plain block `div` (the fade's `position: relative` host) to hold it, and the overlay carries no heading or landmark of its own. The site links get their target from `siteLinkTarget(base, href)`.
- **The skip link** ("Skip to Content") is the first element and targets
  `#main`, an empty `span` with `tabindex="-1"` just before the page's
  wrapper (`.app-shell__main`), since each page owns its own `main` and
  there is no one element a page could be asked to name. The link moves focus
  to the span, and the next Tab reaches the page's first control;
  `.skip-target:focus` draws no ring, as the span has no box. It is not the
  wrapper itself (M12.48): a click on plain text focuses the nearest focusable
  ancestor, so a `tabindex="-1"` wrapper took every click on the page's
  text, and the next Tab restarted at the top of the page rather than going on
  from where the click was. [`PublicFrame`](public-frame.md) draws the same
  span before its page wrapper, `.app-shell__main` too. `tests/e2e/skip-target.spec.ts` walks both.
- **The context row** is the layouts' to render: the coven layout puts the
  switcher and `CovenNav` in it, the admin layout "Admin" linking to `/admin` and
  `AdminNav` ([`context-row.md`](context-row.md)).

## Styling

The bar's inner row, brand, initials, end group and their narrow-window rules are the mixin `frame-bar($block)` in `src/scss/_frame-bar.scss`, shared with [`PublicFrame`](public-frame.md); this stylesheet keeps what is the shell's own (the sticky pin, the brand's right padding, hiding the nav under `$shell-tablet-width`, the theme and saved-message wrappers). The brand's two spans are `BrandName` in `brand-name.tsx`. The site nav is `.app-shell__nav` here, and `SiteNav` is also the public frame's nav (with the Compendium as its one link); the frame overrides the hiding under `$shell-tablet-width` in its own sheet.

Measurements come from the signed-off mock-up, as tokens
([`styling.md`](../styling.md), "The application shell and the layers"). The
bar is `position: sticky; top: 0` at `layer('shell')`, exactly
`$shell-bar-height` tall, with `margin-bottom: 0` (the layout layer gives every `header` a bottom margin; zeroed, so a context row meets the bar edge to edge and a page that fits the window does not scroll by it), on `$surface-card` with a `$hairline` bottom edge,
and its inner column is `$wide-column` wide, centred. The site links fill the
bar's height, square, and the current one is told by weight and the
`$rule-heavy` accent rule along the bar's foot (the `nav-current` mixin, a
border and not a box-shadow, so forced colours keeps it, MB.120), with `aria-current="page"`
and no fill, so a hover's quiet wash still shows on it. Controls are
`$control-height` tall. At or under `$shell-tablet-width` the site nav
leaves the bar and the account button is an avatar alone; at or under
`$shell-brand-width` the brand shortens; the theme disc stays at every width.
`_primitives.scss` takes the
bar off `.page-frame`'s height (for the public frame's bar too, `:is(.app-shell, .public-frame)`) and pads `.app-shell__main` for the bottom bar. The root's `scroll-padding-top` and the `scroll-margin-top` of `.page-frame__section` and the ingredient entry's sections are keyed the same way, so a jump or a focus lands below either frame's sticky bar.

## Accessibility

A skip link, one `banner`, a `nav` named "Site", every link and button 44.5px
tall or more, a visible focus ring on each, and `aria-current` on the current
link.

## Stories

[`index.stories.tsx`](../../src/components/AppShell/index.stories.tsx), titled "Shell / App Shell", has one story, `States`, with a control that chooses the state, each inside `ShellFrame` (`.storybook/shell-frame.tsx`), which draws the layouts' markup with fixture props around a stub page. Each area's stub wraps and heads itself as that area's real page does: a coven's name in the coven layout's column, "Admin" in the admin layout's, "Your Account" or "Your Email" in the narrow page frame, and "Create Coven" on its panel. The states are Member, Admin Page, Curator Page, Add Menu Open, Curator In One Coven, Create Page (`/coven/new`: the switcher alone in the context row, with no section nav), Account Page, Invitations Waiting and Unverified (the email page's bar). The toolbar viewport menu shows any of them at 375px. The body swap has its own, `Feedback / Main Body` (`.storybook/main-body.stories.tsx`): `States`, one dropdown of the pages and the loading shapes ([loading](../loading.md), "Stories").

## Testing

`tests/components/AppShell/index.test.tsx` covers who sees the Admin and Your
Coven links (a verified member or viewer of a coven sees Your Coven and not Admin; a verified account in no coven sees neither unless it curates; an unverified one sees neither), the brand's target (`/`), the Your Coven label for one coven or several, Add Ingredient’s target, the unverified
viewer's bar, the skip link's target, and the viewer's invitation count reaching
the account menu's link. `tests/lib/shell-home.test.ts` and
`tests/lib/viewer.test.ts` cover the two helpers, the latter including the count
(read for a verified viewer, never queried for an unverified one).
`tests/e2e/menu-button-edge.spec.ts` scans the page for accessibility with the Add Ingredient menu open, at a desktop width.

## The Add Ingredient button

The bar's one global action. The places a new ingredient can go are the compendium, for someone who curates, and each coven they may write to. One place makes a plain button. Two or more make a split button, whose main part opens the default place and whose chevron opens a menu of them all. A coven's dialog is opened by the page's address (`?new=ingredient-coven-<slug>`), written with the browser's own `pushState`, which Next's router follows, since nothing on the server needs re-reading to draw the form. The compendium's New Entry lives on `/admin/compendium`, so choosing it is a navigation there (`claude-docs/components/modal.md`, "Add Ingredient").

## The main body during a navigation

`main-body.tsx` is the shell's body while a site-level navigation is on its way. The page that was there is hidden and one skeleton stands over it, in a `main` of its own so the page keeps its landmark (the pages draw their own `main`, which is hidden with the page). Only a `main` target is answered here. A `coven` or `admin` target is `SectionBody`'s, and no target (a refresh) leaves the page standing. The wait carries a hidden heading, since a page without a level-one heading fails the accessibility scan. The skeleton's frame is the destination's width and place, not the standard centred `.page-frame`, which stays for a target that names none. The component is a client part because the state is the browser's.

## Site targets

`site-target.ts` works out, from the address alone, what the destination page draws while it is on its way, in the frame the page itself sits in. Two functions share the file.

- A link into the ingredients: a compendium entry is a wide page with its jump menu. A coven's entry sits under the coven's context row, so it belongs to the coven region (`fromCoven`: when the press starts inside a coven only the coven's body changes, and from anywhere else the whole main changes). The Compendium search a See All opens is the Compendium's list. Any other address gets none.
- A site link: the Compendium opens on its cards under a heading and a filter, in the wide column. The coven index is in the forms' column. A coven's own home (a lone coven's link goes straight to it) is a page with its contents menu. The admin index is wide sections of links. The bar's links and the account menu's copies of them share this.
