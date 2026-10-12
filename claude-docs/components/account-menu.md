# AccountMenu

`src/components/AccountMenu/` is the account button in the shell's bar and the
panel it opens (MB.7). It is a client component.

## Props

- `name`: the name the site shows for the viewer: the button's text, and its
  initials.
- `verified`: whether their address is verified. When not, the panel offers Sign
  Out alone.
- `links?`: the bar's site links (Your Coven, Admin), offered in the panel at a
  phone's width, where the bar has no room for them.

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
  unverified viewer), at a phone's width the links and a theme row (a "Theme"
  label beside `<ThemeToggle variant="inline" size="small" />`, which carries
  its own name and `aria-pressed`), then `SignOutButton`.

## Styling

The button is `$control-height` tall: avatar disc (1.75rem, `$accent`, the
contrast-checked `$text-on-color` initials), name, chevron. At or under
`$shell-phone-width` the name stays in the page visually hidden, the chevron
goes, and the button is a `$control-height` square. The panel hangs from the
button's right edge at `layer('floating')`, on `$surface-card` with a
hairline-weight muted edge, `radius('surface')` and `$shadow-floating`, at
least 13rem wide. Rows are a control tall; Sign Out's `.btn` is flattened to a
row. The current link in the panel gets the same weight and rule as the bar's.

## Stories

`Closed`, `Open`, `OpenUnverified`, `OpenPhone` (the links and the theme row).

## Testing

`tests/components/AccountMenu/index.test.tsx`: `aria-expanded`, `aria-controls`
and the panel's contents, the Your Account `href`, Escape and the returned
focus, an outside press, a link press, the unverified panel, the phone links,
and the initials.
