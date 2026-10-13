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
- `pendingInvitations?`: how many coven invitations wait for the viewer's
  verified address (M10.32); defaults to 0. `AppShell` passes
  `viewer.pendingInvitations`, which `viewerOf` reads once per request. Above 0, and
  only for a verified viewer (an unverified one cannot reach the account page the
  count leads to), the menu shows the invitations in three places, below.

## Contracts

- **A disclosure, not an ARIA menu.** The button has `aria-expanded` and
  `aria-controls` and shows a list; there is no `role="menu"`, which promises
  arrow-key movement and a type-ahead the panel does not have, and the panel
  holds links and a button. This is the APG disclosure pattern.
- **Escape closes it and returns the focus to the button.** A press outside it
  closes it, and so does a press on a link in it. The panel is only in the page
  while open.
- **The name is said once**, on the button. The avatar disc (up to two
  initials, from the first and last words of the name) is `aria-hidden`.
- **The panel lists**: Your Account (a link to `/account`, always, not for an
  unverified viewer), at or under `$shell-tablet-width` the site links, then
  `SignOutButton`. **The theme switch is not in the panel.** It stays in the
  shell's bar at every width (the owner's call, M10.32), so the panel has no
  theme row, and `AppShell` no longer hides the switch at a phone's width.
- **Waiting invitations show in three places** (M10.32, the owner's call):
  - **A dot on the avatar disc**, at its top right, in the `attention` palette's
    red and ringed in `$surface-card`. It is seen only; it is `aria-hidden`
    with the disc.
  - **The button's name gains ", N coven invitations"**, set whole as its
    `aria-label` so a screen reader hears what the dot shows. A label rather
    than hidden text: the button is a flex container, whose children a browser
    joins with a space ("Name , 2 …"). It starts with the visible name
    (WCAG 2.5.3).
  - **A count link at the right end of the Your Account row**: a red circle
    (a pill from two digits), a link of its own to `/account#account-invitations`
    (`ACCOUNT_INVITATIONS_PATH`), named "N Coven Invitations" ("1 Coven
    Invitation" for one). It is a sibling of the Your Account link, not inside
    it, because a link cannot hold a link: a press on the count opens the
    invitations, and a press on the rest of the row opens the account page.
    It wears an `IconTip` (`placement="below"`) reading "You have N Coven
    Invitations".

## Styling

The button has no hover or open wash: the avatar disc answers the pointer and the open state as the theme switch does, darkening to `$accent-hover`.

The invitations dot is 0.4167rem across, two thirds of the size it was first drawn at, set 0.0625rem out past the disc's top and right edges, with a 2px `$surface-card` ring (the owner's calls, M10.32).

The button is `$control-height` tall: avatar disc (2rem, the theme switch's size, `$accent`, the
contrast-checked `$text-on-color` initials), name, chevron. At or under
`$shell-tablet-width` the name stays in the page visually hidden, the chevron
goes, and the button is a `$control-height` square, since with the name an
admin's bar ran past the window from 642px up (the owner's finding at MB.7's
review, 2026-10-12). The panel hangs from the
button's right edge at `layer('floating')`, on `$surface-card` with a
hairline-weight muted edge, `radius('surface')` and `$shadow-floating`, at
least 13rem wide. Rows are a control tall and run edge to edge of the panel, with no padding
around them, no gap between them and no rounding; no list markers. Sign Out alone has padding around it, and its `.btn`
keeps its outline, full width of that. The current link gets a straight accent
rule on its left edge and the same weight as the bar's, with no fill, so a hover's wash still shows on it. The focus ring is drawn inside the row (`outline-offset: -2px`), where the panel's own edge would cut an outside one. The account button may give up width (`flex: 0 1 auto`, the bar's one item that can), so a long name ends in an ellipsis rather than pushing the theme disc past the window.

**The panel no longer clips** (`overflow: hidden` is gone, the owner's call at
M10.32), so the count's tip can hang past the panel's edge. The top row's hover
wash takes the panel's rounding itself, inside the 1px edge, so it still does
not square off the corners; the last row is always Sign Out, which has room
around it, so no wash meets the bottom corners.

**The count** is the site's badge in the `attention` palette
([`styling.md`](../styling.md), "Badge palettes"): a 1.5rem circle, a pill from two digits,
laid over the row's right end so Your Account's wash still runs edge to edge
beneath it, with the row's text kept clear of it. On hover the count keeps
`$text-on-color`, the badge's contrast-checked label, and darkens instead
(`filter: brightness(0.85)`), because the typography's link hover would
otherwise recolour the label. It sits one layer up, so its tip hangs over the
rows beneath it.

## Stories

[`index.stories.tsx`](../../src/components/AccountMenu/index.stories.tsx),
titled "Shell / Account Menu": `Closed`, `Open`, `OpenUnverified` (Sign Out
alone), `OpenPhone` (the links, at 375px), `OpenAtSevenHundred` (the links in
the panel at 700px), `ClosedWithInvitations` (the dot), `OpenWithInvitations`
and `OpenWithInvitationsPhone` (the count beside Your Account, at a phone's
width as well). Each sits at the right, since the panel hangs from the
button's right edge. The wrapper holds the menu at its top and is tall enough
for the open panel, because the workshop's frame clips what overflows it.

## Testing

`tests/components/AccountMenu/index.test.tsx`: `aria-expanded`, `aria-controls`
and the panel's contents, the Your Account `href`, Escape and the returned
focus, an outside press, a link press, the unverified panel, the phone links,
the initials, and the invitations: the button's name and the count link's name
and `href` when invitations wait, and neither when none do or the viewer is
unverified.
