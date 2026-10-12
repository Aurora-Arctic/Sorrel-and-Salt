# SectionNav

`src/components/SectionNav/` — the one section nav the coven and the admin
area share (MB.7, drawn and signed off in its design review). On a wide screen
it is a row of tabs along the context row, an icon then a label each. On a
tablet the first four tabs stay and the rest go behind a More button. On a
phone it is a bar fixed along the foot of the window, icon above label.
[`coven-nav.md`](coven-nav.md) and [`admin-nav.md`](admin-nav.md) are thin
wrappers that hand it their sections; the old `.link-row` rows and the admin
nav's `<details>` jump menu are gone.

## Props and parts

`SectionNavProps` and `SectionNavItem` (`types.ts`):

| Prop       | What it is                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------- |
| `label`    | The nav's `aria-label`, distinct on a page: "Coven", "Admin"                                |
| `sections` | The tabs, in order. The first four stay in view when room is short; the rest go behind More |

A section is `{ label, href, icon, exact?, matches?, apart? }`:

- `icon` is a **name** (`SectionIconName`), not an element, so the list can be
  built on the server and cross to the client part as plain data.
- `exact` marks a section current only at its own address (the coven index).
- `matches` lists the other addresses it is current on (Categories on its
  Groups tab's address).
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
- **Every section is a link.** Each is a `next/link` at its address, in every
  shape. The nav is an ordinary `<nav>` of links; no `role="menu"`, no
  `role="tablist"`.
- **More is a disclosure, not a menu.** A button with `aria-expanded` and
  `aria-controls` opens a list of links beneath it (tablet) or above the bar
  (phone). Escape closes it and returns focus to the button; a press outside
  the nav closes it; so does navigating, since the open state is the address
  it was opened at, so a new address reads as shut with no effect resetting
  state. It lists every section past the fourth, so a coven with four needs
  none and draws no More.
- **More names the page when the page is hidden.** When the current page is
  one of the sections behind More, the button shows that page's icon and label
  in place of "More" and carries `aria-current="page"`, so the current page is
  never invisible.
- **Nothing is read twice.** The hidden sections' tabs are in the page at
  every width and hidden by `display: none` where More takes over; More, and
  its list, are `display: none` where the tabs show. A hidden element is out of
  the accessibility tree, so a screen reader finds each link once at any
  width. The alternative, deciding which tabs to render by measuring the row
  in script, was rejected: it needs the width on the server, flashes on first
  paint, and the CSS already knows. The cost is that the four-tab count lives
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

- **Wider than `$shell-tablet-width`.** The nav stretches to the context row
  it sits in, and each tab fills the row's height (`$context-row-height`, 56px
  in the design): icon then label, `space(4)` of padding either side, a
  `space(1)` gap between tabs. Muted ink; on hover the `$fill-quiet` fill and
  the body ink; the current tab keeps that fill, weight 500, the accent icon,
  and a `$rule-heavy` accent rule along its foot, one pixel below the row so
  it covers the row's hairline. The focus ring is the shared `focus-ring`,
  drawn 2px inside the tab so the row does not clip it. A hairline stands
  before an `apart` section, between Astrology and People in admin.
- **At or under `$shell-tablet-width`, wider than the phone.** The sections
  past the fourth are hidden and More shows, with a chevron that turns over
  while it is open. The list opens beneath the button at the row's end, a
  floating panel (`layer('floating')`, the shared `floating-panel` look), with
  a hairline above an `apart` section.
- **At or under `$shell-phone-width`.** The same `nav` is
  `position: fixed` along the foot of the window: `layer('shell')`, the card
  ground, a hairline top edge, `$bottom-bar-height` (64px) tall plus the
  device's bottom safe-area inset, which it also pads, so a home indicator does
  not cover the labels. Items take equal widths, icon above a 12px label; the
  current one by weight, the accent icon and a short accent rule above the icon
  (it hangs from the bar's top edge). The brief gave the height as
  `$bottom-bar-height` with the inset as padding; here the inset is added to
  the height so the label area is never squeezed, which is what the page's
  clearance (`AppShell`'s bottom padding, `$bottom-bar-height` plus the same
  inset) assumes. Coven's items all fit. Admin shows Compendium, Categories,
  Forms and Deities, then More (Astrology, People), which opens a sheet above
  the bar at its end, the same disclosure as the tablet's. There is no
  chevron, as in the design.
- **Motion.** The tab fills ease with the theme's transition; under
  `prefers-reduced-motion: reduce` there is none.
- **Icons.** `icons.tsx` draws ten small stroke-only SVGs on a 24-unit square
  (1.6 stroke, round caps, `currentColor`, `aria-hidden`): overview (four
  squares), ingredients (leaf), grimoire (open book), members (two people),
  compendium (books), categories (tag), forms (flask), deities (four-point
  sparkle), astrology (crescent), people (id card), plus the three dots of
  More. Drawn from the design review's mock-up. Inline rather than an icon
  package: they are used here and nowhere else.

## Stories

[`index.stories.tsx`](../../src/components/SectionNav/index.stories.tsx):
`Coven` and `Admin` at the workshop's width; `AdminTablet` and
`AdminOnAHiddenPage` at 700px (More, and More carrying People);
`AdminPhoneDark`, `AdminPhoneLight` and `AdminPhoneOnAHiddenPage` at 375px;
`CovenPhone`. Each sits in a stand-in for the context row; on a phone the nav
leaves it for the foot of the window. Hover, focus and the keyboard are real
input, so no story holds them.

## Testing

`tests/components/SectionNav/index.test.tsx`, with `usePathname` mocked: every
section a link at its address in order; which is current by the `exact` and
`matches` rules and an address beneath one; More absent when the sections fit;
More shut, naming its list, opening to the hidden links and shutting again,
closing on Escape with focus back on the button, on a press outside and not on
one inside, and after the address changes; More naming the current page when
it is hidden and not otherwise; and `data-keyboard` set from a stubbed
`visualViewport`. Which tabs show at which width and the bar's placement are
presentation, which jsdom has none of.
