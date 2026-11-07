# SectionNav

`src/components/SectionNav/` is the one section nav the coven and the admin area share. Wider than a phone it is a row of tabs along the context row, an icon then a label each, showing as many leading tabs as fit (measured in the browser) with the rest behind a More button. On a phone it is a bar fixed along the foot of the window, icon above label, showing the first four tabs with the rest behind More. [`coven-nav.md`](coven-nav.md) and [`admin-nav.md`](admin-nav.md) are thin wrappers that hand it their sections. Props are in `types.ts` (`SectionNavProps`, `SectionNavItem`).

`index.tsx` is a server component and renders `section-links.tsx`, the one client part: only a client component can read the address (`usePathname()`), hold More's state and listen to the keyboard. `icons.tsx` is the icon set.

## Contracts

- **`icon` is a name (`SectionIconName`), not an element**, so the list can be built on the server and cross to the client as plain data.
- **A section is current by `exact` or by `matches`.** `exact` marks it current only at its own address (the coven index). Otherwise it is current by `isAtPath` (`src/lib/at-path.ts`) on its `href` and each of its `matches` (Categories is current on its Groups tab's address).
- **`apart` starts a new group.** The row draws a hairline before it and More's list draws one above it. The nav cannot otherwise tell where groups fall: admin's People follows the compendium's pages, and a coven's Members follows Grimoire.
- **The list stays on the server.** `CovenNav` and `AdminNav` build their sections in a server component; only the links are client code.
- **The current page is told by weight and shape, never hue alone.** Its link carries `aria-current="page"`, weight 500, a quiet fill and the heavy accent rule (`$rule-heavy`); its icon takes the accent and a heavier stroke.
- **Every section is a `PendingLink`** (`src/lib/navigation/`), in the row and in More's list. It starts the navigation through the shared hook and sets `aria-busy` on the link while the navigation runs; the skeleton the wait draws is chosen by the address ([`loading.md`](../loading.md)). The nav is an ordinary `<nav>` of links, with no `role="menu"` and no `role="tablist"`.
- **More is a disclosure, not a menu.** A button with `aria-expanded` and `aria-controls` opens a list of links beneath it (wider than a phone) or above the bar (phone). Escape closes it and returns focus to the button, and a press outside the nav closes it. Navigating closes it too: the open state is the address it was opened at, so a new address reads as shut with no effect resetting state. It lists the hidden sections, so a row where every tab fits draws no More.
- **More names the page when the page is hidden.** When the current page is behind More, the button shows that page's icon and label in place of "More" and carries `aria-current="page"`, so the current page is never invisible. Its label is prefixed with a visually hidden "More: ", so a screen reader hears a disclosure and not the hidden page.
- **Nothing is read twice.** The hidden sections' tabs are in the page at every width and hidden with `display: none` where More takes over, so a screen reader finds each link once. Choosing which tabs to render by measuring in script is rejected for the phone, because it needs the width on the server and the CSS already knows it. The phone's count of four lives in one constant (`VISIBLE`, `section-links.tsx`) and one class (`--extra`), the only link between code and stylesheet.
- **The bar steps aside on a phone** while a dialog is open (`body:has(dialog[open])`) and while the on-screen keyboard is up. The client part detects the keyboard with a `visualViewport` `resize` listener read through `useSyncExternalStore`, and sets `data-keyboard="open"` when the visual viewport is under three quarters of the window's height. A browser with no `visualViewport` never reports a keyboard.

## Fitting the tabs

Wider than the phone, the browser measures which tabs fit, because the lead (the coven switcher, or "Admin") and the labels set the room: four labelled tabs plus More outrun the context row at many widths (from 642px up on the coven row and the wide admin row).

- **What is measured.** `section-links.tsx` measures each tab's width once with every tab showing, before paint, and the width of the list (the nav takes the room the lead leaves, `flex: 1 1 0`). It keeps the most leading tabs, never fewer than one, that fit beside More. It measures again when the list's width changes (a `ResizeObserver`), once the web fonts have loaded, and on a navigation, since the current tab's weight changes its width.
- **More's reserved width.** More is reserved at its own width, unless the current page's tab is among those it would hide. A More wearing a hidden page's label is that tab's width (without its `apart` margin) plus the button's inner gap and the chevron, so it is reserved at that, or at its own width if wider. Reserving the widest hidden tab would put a tab behind More while the row has room for it. More wears no other tab's label.
- **The measuring render is never painted.** It marks the nav `data-measuring`, which turns off wrapping and the hiding of More, so More's width and chevron are read and the row is measured unwrapped. More is drawn in it whenever there is more than one section.
- **Before the script has fitted the row**, the server's phone count of four is the wrong guess, and the server cannot know the window's width. Wider than the phone and with no `data-fit` on the nav, the stylesheet shows every tab (overriding `--extra`) and hides More, so a refresh does not flash a folded row. Tabs that do not fit wrap onto further lines: the list is taken out of the flow to fill the nav, whose height the context row gives it, and each tab is as tall as the list, so a wrapped line starts below the list's foot and its `overflow: hidden` keeps it out of sight.
- **The server and the first client render use the phone's count of four.** React keeps the server's band answer until a passive effect runs, so the measured count applies only after hydration. Where nothing has a width (happy-dom) the four stays.
- **The phone never gets `data-fit`**, so the rules above are scoped to the widths past it. The script's band, the literal `'(min-width: 40.01rem)'` in `section-links.tsx` (`TABLET_BAND`), is `$shell-phone-width` plus 0.01rem, kept by hand because a media query in script cannot read the Sass token.

## Styling

`index.scss`. The three shapes follow the window's width, not the nav's, because the phone bar is the window's (`$shell-phone-width`, `$shell-tablet-width`, `_variables.scss`).

- **Wider than `$shell-phone-width`.** The nav stretches to the context row and each tab fills its height (`$context-row-height`). The focus ring is drawn 2px inside the tab so the row does not clip it.
- **At or under `$shell-phone-width`.** The same `nav` is fixed along the foot of the window, `$bottom-bar-height` tall plus the device's bottom safe-area inset, which is added to the height so the label area is never squeezed, as `AppShell`'s bottom padding assumes. Labels are at `type-size('tab')` (11px) because "Compendium" is wider than a fifth of 375px at 12px. The current item has no fill: a filled tab in a bar of one (the coven's Overview alone) would recolour the whole bar.
- **Phone contents.** The coven's items all fit. Admin shows Compendium, Categories, Forms and Deities, then More (Astrology, People), which opens a sheet above the bar at its end. The phone More has no chevron, except where it stands in for a hidden current page, where a muted one at the tab's end says there is more.
- **Motion.** None under `prefers-reduced-motion: reduce`. More's sheet stays displayed through its fade, and `hidden` takes it out of sight with `visibility` once the fade has run.
- **Icons.** `icons.tsx` draws them inline because nothing else uses them. The forms icon is the generic form icon, the salt spoon, imported from `FormIcon`, so one mark means "a form" everywhere ([`form-icon.md`](form-icon.md)).

## Not here

The sections themselves belong to [`coven-nav.md`](coven-nav.md) and [`admin-nav.md`](admin-nav.md).

Stories: [`index.stories.tsx`](../../src/components/SectionNav/index.stories.tsx), each in a stand-in for the context row.

Tests: `tests/components/SectionNav/index.test.tsx` (with `usePathname` mocked). Which tabs show at which width, More naming a hidden current page, and the bar's placement need layout, so `tests/e2e/shell.spec.ts` proves them in Chromium, including that across the tablet band neither row puts a tab behind More while it has room for it.
