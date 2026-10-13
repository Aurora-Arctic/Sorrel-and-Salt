# AccountMenu

`src/components/AccountMenu/` is the account button in the shell's bar and the
panel it opens (MB.7). It is a client component.

## Props

- `name`: the name the site shows for the viewer: the button's text, and its
  initials.
- `verified`: whether their address is verified. When not, the panel offers Sign
  Out alone.
- `links?`: the bar's site links (Your Coven, Admin), offered in the panel at or under
  `$shell-tablet-width`, where the bar has no room for them.

## Contracts

- **A disclosure, not an ARIA menu.** The button has `aria-expanded` and
  `aria-controls` and shows a list; there is no `role="menu"`, which promises
  arrow-key movement and a type-ahead the panel does not have, and the panel
  holds a link, a switch and a button. This is the APG disclosure pattern.
- **Escape closes it and returns the focus to the button.** A press outside it
  closes it, and so does a press on a link in it. The panel is only in the page
  while open.
- **The name is said once**, on the button. The avatar disc (up to two
  initials, from the first and last words of the name) is `aria-hidden`.
- **The panel lists**: Your Account (a link to `/account`, not for an
  unverified viewer), at or under `$shell-tablet-width` the site links and, at a phone's width, pinned to the panel's top right
  corner and first in the tab order, `<ThemeToggle variant="inline" size="small" />`
  (it carries its own name and `aria-pressed`; an unverified account gets it on a
  row of its own), then `SignOutButton`.

## Styling

The button has no hover or open wash: the avatar disc answers the pointer and the open state as the theme switch does, darkening to `$accent-hover`.

The button is `$control-height` tall: avatar disc (2rem, the theme switch's size, `$accent`, the
contrast-checked `$text-on-color` initials), name, chevron. At or under
`$shell-tablet-width` the name stays in the page visually hidden, the chevron
goes, and the button is a `$control-height` square, since with the name an
admin's bar ran past the window from 642px up (the owner's finding at MB.7's
review, 2026-10-12). The panel hangs from the
button's right edge at `layer('floating')`, on `$surface-card` with a
hairline-weight muted edge, `radius('surface')` and `$shadow-floating`, at
least 13rem wide. Rows are a control tall and run edge to edge of the panel, with no padding
around them, no gap between them and no rounding (the panel clips them to its
corners); no list markers. Sign Out alone has padding around it, and its `.btn`
keeps its outline, full width of that. The current link gets a straight accent
rule on its left edge and the same weight as the bar's, with no fill, so a hover's wash still shows on it. The first row keeps `space(8)` clear of the theme disc pinned to the corner. The focus ring is drawn inside the row (`outline-offset: -2px`), where the panel's clipped edge would cut an outside one. The account button may give up width (`flex: 0 1 auto`, the bar's one item that can), so a long name ends in an ellipsis rather than pushing the theme disc past the window.

## Stories

[`index.stories.tsx`](../../src/components/AccountMenu/index.stories.tsx),
titled "Shell / Account Menu": `Closed`, `Open`, `OpenUnverified` (Sign Out
alone), `OpenPhone` (the links and the theme switch, at 375px) and
`OpenAtSevenHundred` (the links in the panel at 700px, with no theme item).
Each sits at the right, since the panel hangs from the button's right edge. The
wrapper holds the menu at its top and is tall enough for the open panel,
because the workshop's frame clips what overflows it.

## Testing

`tests/components/AccountMenu/index.test.tsx`: `aria-expanded`, `aria-controls`
and the panel's contents, the Your Account `href`, Escape and the returned
focus, an outside press, a link press, the unverified panel, the phone links,
and the initials.
