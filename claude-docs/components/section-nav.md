# SectionNav

`src/components/SectionNav/` — the one section nav the coven and the admin
area share (MB.7, drawn and signed off in its design review). On a wide screen
it is a row of tabs along the context row, an icon then a label each, and wider than a phone it shows as many leading tabs as fit the row, measured in the browser, with the rest behind a More button. On a phone it is a bar fixed along the foot of the window, icon above label, the first four tabs and the rest behind More.
[`coven-nav.md`](coven-nav.md) and [`admin-nav.md`](admin-nav.md) are thin
wrappers that hand it their sections; the old `.link-row` rows and the admin
nav's `<details>` jump menu are gone.

## Props and parts

`SectionNavProps` and `SectionNavItem` (`types.ts`):

| Prop       | What it is                                                                                                                             |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `label`    | The nav's `aria-label`, distinct on a page: "Coven", "Admin"                                                                           |
| `sections` | The tabs, in order. Wider than a phone as many leading tabs as fit stay in the row, on a phone the first four; the rest go behind More |

A section is `{ label, href, icon, exact?, matches?, apart? }`:

- `icon` is a **name** (`SectionIconName`), not an element, so the list can be
  built on the server and cross to the client part as plain data.
- `exact` marks a section current only at its own address (the coven index).
- `matches` lists the other addresses it is current on (Categories on its
  Groups tab's address).
- `target` says what the page draws while it is on its way: a region and a
  shape (M12.33), handed on to each link as its `navigationTarget`. The
  wrappers set it: the coven's sections with `covenTarget`, the admin's
  with `adminTarget`. See [`loading.md`](../loading.md), "Where the pieces are
  used".
- `apart` starts a new group: the row draws a hairline before it and the More
  list above it. The admin nav's People, after the compendium's pages. (The
  brief for MB.7 named four fields; `apart` is the fifth, since the nav cannot
  otherwise tell where the groups fall.)

`index.tsx` stays a server component and renders `section-links.tsx`, the one
client part: only a client component can read the address (`usePathname()`),
hold the More button's state and listen to the keyboard. `icons.tsx` is the
icon set.

## Contracts

- **The page you are on is told by weight and shape, never hue alone.** Its
  link carries `aria-current="page"`, weight 500, a quiet fill and the heavy
  accent rule (`$rule-heavy`); its icon takes the accent and a heavier
  stroke. A section is current by `exact` (its own address only) or else by
  `isAtPath` (`src/lib/at-path.ts`) on its `href` and each of its `matches`.
- **Every section is a link.** Each is a `PendingLink` at its address
  (`src/lib/navigation/`), in every shape, in the row and in More's list. A
  `PendingLink` starts the navigation through the shared hook, passes the
  section's `target` as its `navigationTarget`, and sets `aria-busy` on the
  link while the navigation runs ([`loading.md`](../loading.md)). The nav is an ordinary `<nav>` of links; no `role="menu"`, no
  `role="tablist"`.
- **More is a disclosure, not a menu.** A button with `aria-expanded` and
  `aria-controls` opens a list of links beneath it (wider than the phone) or above the bar
  (phone). Escape closes it and returns focus to the button; a press outside
  the nav closes it; so does navigating, since the open state is the address
  it was opened at, so a new address reads as shut with no effect resetting
  state. It lists the hidden sections, so a row where every tab fits draws no More.
- **More names the page when the page is hidden.** When the current page is
  one of the sections behind More, the button shows that page's icon and label
  in place of "More" (the label is prefixed with a visually hidden "More: ", so a screen reader hears a disclosure, not the hidden page) and carries `aria-current="page"`, so the current page is
  never invisible.
- **Nothing is read twice.** The hidden sections' tabs are in the page at
  every width and hidden by `display: none` where More takes over. A hidden element is out of
  the accessibility tree, so a screen reader finds each link once at any
  width. The alternative, deciding which tabs to render by measuring the row
  in script, was rejected for the phone: it needs the width on the
  server, and the CSS already knows. Only wider than the phone, where the room
  depends on the lead and the fonts, does the script measure. The measuring render is never painted, and wider than the phone neither is the server's folded row: the server cannot know the window's width, so it draws the phone's four tabs and More, but until the script has fitted the row (no `data-fit`) the stylesheet shows every tab there and hides More (MB.264; see below). The cost is that the phone's four-tab count lives
  in one constant (`VISIBLE`, `section-links.tsx`) and one class
  (`--extra`), which is the only link between code and stylesheet.
- **The bar steps aside.** On a phone it hides while a dialog is open
  (`body:has(dialog[open])`) and while the on-screen keyboard is up. The
  keyboard is detected in the client part: a `visualViewport` `resize`
  listener, read through `useSyncExternalStore`, sets `data-keyboard="open"`
  on the nav when the visual viewport is under three quarters of the window's
  height; the stylesheet hides it then. A browser with no `visualViewport`
  never reports a keyboard.
- **The list stays on the server.** `CovenNav` and `AdminNav` build their
  sections in a server component; only the links are client code.

## Styling

`index.scss`. The three shapes follow the **window's** width, not the nav's:
the phone bar is the window's, so it is measured against the window, with
the shell's other bars (`$shell-phone-width`, `$shell-tablet-width`,
`_variables.scss`).

- **Wider than `$shell-phone-width`.** The nav stretches to the context row
  it sits in, and each tab fills the row's height (`$context-row-height`, 56px
  in the design): icon then label, `space(4)` of padding either side, a
  no gap between tabs (the owner's call, MB.7's review), so their hover fills meet. Muted ink; on hover the `$fill-quiet` fill and
  the body ink; the current tab keeps that fill, weight 500, the accent icon,
  and a `$rule-heavy` accent rule along its foot, one pixel below the row so
  it covers the row's hairline. The focus ring is the shared `focus-ring`,
  drawn 2px inside the tab so the row does not clip it. A hairline stands
  before an `apart` section, between Astrology and People in admin and between
  Grimoire and Members in a coven.
- **Which tabs show, wider than the phone (Priority+).** The row shows as many leading tabs as fit and the rest go behind More; More is not drawn at all when every tab fits (it renders only when something is tucked away). The count is measured, not fixed: the lead (the coven switcher, or "Admin") and the labels set the room, and four labelled tabs plus More outrun the context row at many widths: the owner's call at MB.7's review (2026-10-12), after the row overflowed the window from 642px with four tabs and, on /admin, from 882px with all six. `section-links.tsx` measures each tab's width once with every tab showing, before paint, and the width of the list (the nav takes the room the lead leaves, `flex: 1 1 0`), and keeps the most leading tabs, never fewer than one, that fit beside More. More is reserved at its own width, unless the current page's tab is among those it would hide: a More wearing a hidden page's label is that tab's width (without its `apart` margin) plus the button's inner gap and the chevron, so then it is reserved at that, or at its own width if wider. It was reserved at the widest tab it would hide until M10.11, which put a tab behind More while the row had room for it (the coven row at 680px showed Overview alone where Overview, Ingredients and More fit); More wears no other tab's label, and a navigation measures the row afresh. It measures again when the list's width changes (a `ResizeObserver`), once the web fonts have loaded, and on a navigation (the current tab's weight changes its width). While measuring, More is drawn whenever there is more than one section, so its width and chevron are read even where every tab will fit; that render is never painted. The server and the first client render use the phone's count of four, and React keeps the server's band answer until a passive effect runs, so the measured count applies only after hydration, and where nothing has a width (happy-dom) the four stays. Until then, wider than the phone and with no `data-fit` on the nav, the stylesheet shows every tab (overriding `--extra`) and hides More, so a refresh does not flash a folded row (MB.264). The tabs that do not fit wrap onto further lines: the list is taken out of the flow to fill the nav, whose height the context row gives it, and each tab is as tall as the list, so a wrapped line starts below the list's foot and its `overflow: hidden` keeps it out of sight. The measuring render marks the nav `data-measuring`, which turns the wrapping and the hiding of More off, so More is drawn and measured, and the row is measured unwrapped, as before. The phone never gets `data-fit`, so those rules are scoped to the widths past it and the phone keeps its four tabs and More. The script's band, the literal `'(min-width: 40.01rem)'` in `section-links.tsx`, is `$shell-phone-width` plus 0.01rem, kept by hand because a media query in script cannot read the Sass token. More's sheet is a floating panel (`top: calc(100% + space(2))` beneath the button, `layer('floating')`, a hairline above an `apart` section, its chevron turning while open).
- **At or under `$shell-phone-width`.** The same `nav` is
  `position: fixed` along the foot of the window: `layer('shell')`, the card
  ground, a hairline top edge, `$bottom-bar-height` (64px) tall plus the
  device's bottom safe-area inset, which it also pads, so a home indicator does
  not cover the labels. Items take equal widths, icon above a label at `type-size('tab')`, 11px, the one role below overline, since five labels share a 375px screen and "Compendium" is wider than a fifth of it at 12px; the
  current one by weight, the accent icon and a short accent rule above the icon
  (it hangs from the bar's top edge), with no fill: a filled tab in a bar of
  one, the coven's Overview alone, would recolour the whole bar. The brief gave the height as
  `$bottom-bar-height` with the inset as padding; here the inset is added to
  the height so the label area is never squeezed, which is what the page's
  clearance (`AppShell`'s bottom padding, `$bottom-bar-height` plus the same
  inset) assumes. Coven's items all fit. Admin shows Compendium, Categories,
  Forms and Deities, then More (Astrology, People), which opens a sheet above
  the bar at its end, the same disclosure as the row's. There is no
  chevron, except on a More button standing in for a hidden current page
  (it wears that page's icon and label), where a muted one at the tab's end
  says there is more.
- **Motion.** The tab fills ease with the theme's transition; More's sheet
  fades in and out over the theme's duration (it stays displayed, and
  `hidden` takes it out of sight with `visibility`, held until the fade has
  run, as a tip's bubble is) and its chevron flips with `rotateX(180deg)` over the same duration;
  under `prefers-reduced-motion: reduce` there is none.
- **Icons.** `icons.tsx` draws nine small stroke-only SVGs on a 24-unit square
  (1.6 stroke, round caps, `currentColor`, `aria-hidden`): overview (four
  squares), ingredients (leaf), grimoire (open book), members (two people),
  compendium (books), categories (tag), deities (four-point sparkle),
  astrology (crescent), people (id card), plus the three dots of More. Drawn
  from the design review's mock-up. Inline rather than an icon package: they
  are used here and nowhere else. The tenth, forms, is the generic form
  icon, the salt spoon, imported from `FormIcon` (M12.7; it replaced the
  flask), so one mark means "a form" everywhere
  ([`form-icon.md`](form-icon.md)).

## Stories

[`index.stories.tsx`](../../src/components/SectionNav/index.stories.tsx),
titled "Navigation / Section Nav":
`States`, with a control that chooses Coven Overview Current, Coven Ingredients Current, Coven Members Current, Coven As A Viewer, Admin Categories Current, Admin Compendium Current, Admin Astrology Current, Admin People Current and Admin As A Curator, at the workshop's width; `AdminOnAHiddenPage` pinned at 700px (More carrying People), and `TabletMoreOpen`, `PhoneBottomBar`, `PhoneAdminBottomBar` and `PhoneMoreOpen` pinned to their widths. The toolbar viewport menu shows any of them at 375px. Each sits in a stand-in for the context row; on a phone the nav
leaves it for the foot of the window. Hover, focus and the keyboard are real
input, so no story holds them.

## Testing

`tests/components/SectionNav/index.test.tsx`, with `usePathname` mocked: every
section a link at its address in order; which is current by the `exact` and
`matches` rules and an address beneath one; More shut, naming its list, opening to the hidden links and shutting again,
closing on Escape with focus back on the button, on a press outside and not on
one inside, and after the address changes; and `data-keyboard` set from a stubbed
`visualViewport`. Which tabs show at which width, More naming the current page
when it is hidden, and the bar's placement need layout, which happy-dom has none of. `tests/e2e/shell.spec.ts` proves them in Chromium, among them that across the tablet band neither the coven row nor the admin row puts a tab behind More while it has room for it.

## Fitting the tabs (Priority+)

Wider than the phone, the nav shows as many leading tabs as fit the context row and puts the rest behind More. The browser measures which fit, because the lead and the labels set the room (`section-links.tsx`); the client part marks the others `--extra`. The count is not fixed in the stylesheet: four labelled tabs and More overflow the row from 642px up.

## Before the script has fitted the row

Wider than the phone and before the script has run (no `data-fit`), the server's phone count of four is the wrong guess. So the row shows every tab and hides More, and the tabs that do not fit wrap onto further lines. The list is taken out of the flow to fill the nav, whose height the context row gives it, so those lines add no height and the list's clipping keeps them out of sight. Waiting for the script instead would flash a folded row on every load.

The phone never gets `data-fit`, so it is excluded by width, at the script's own `TABLET_BAND`. The measuring render (`data-measuring`) is the exception: it draws More so that its width is read, and does not wrap, so the row is measured as it will be fitted.
