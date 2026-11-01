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
- **Escape closes it and returns the focus to the button.** It listens on the
  window and skips an Escape something else already took (`defaultPrevented`),
  so with a failed Sign Out's callout open, the first Escape closes the
  callout, which takes it, and the next closes the menu (M12.31). A press outside it
  closes it, and so does a press on a link in it. The panel is only in the page
  while open.
- **The name is said once**, on the button. The avatar disc (up to two
  initials, from the first and last words of the name) is `aria-hidden`.
- **Every link in the panel is a `PendingLink`** ([`loading.md`](../loading.md)):
  it starts the navigation through the shared hook and sets `aria-busy` while it
  runs. Your Account and the invitations count both name the `main` region and
  the `page` shape, since both lead to the account page. The site links name
  `main` through `siteLinkTarget` (`AppShell/site-target.ts`), the one rule the
  bar's links share: cards under a title and filter for `/compendium`, a narrow page for `/coven`, a wide page for `/admin` and a page for the rest. The account links name a page with the jump menu.
- **The panel lists**: Your Account (a link to `/account`, always, not for an
  unverified viewer), at or under `$shell-tablet-width` the site links, then Sign Out
  (`sign-out-button.tsx`, below). **The theme switch is not in the panel.** It stays in the
  shell's bar at every width (the owner's call, M10.32), so the panel has no
  theme row, and `AppShell` no longer hides the switch at a phone's width.
- **Waiting invitations show in three places** (M10.32, the owner's call):
  - **A dot on the avatar disc**, at its top right, in the `attention` palette's
    red and ringed in `$surface-card`. It is seen only; it is `aria-hidden`
    with the disc.
  - **The button's name gains ", N coven invitations"**, as hidden text
    (`account-menu__count`) that repeats the name and adds the count, the visible
    name then `aria-hidden`, so the button reads "Name, 2 coven invitations" with no
    stray space. Not an `aria-label`: axe's `label-content-name-mismatch` wants a
    label to repeat every visible word, the avatar's initials among them.
  - **A count link at the right end of the Your Account row**: a red circle
    (a pill from two digits), a link of its own to `/account#account-invitations`
    (`ACCOUNT_INVITATIONS_PATH`), named "N Coven Invitations" ("1 Coven
    Invitation" for one). It is a sibling of the Your Account link, not inside
    it, because a link cannot hold a link: a press on the count opens the
    invitations, and a press on the rest of the row opens the account page.
    It wears an `IconTip` (`placement="below"`) reading "You have N Coven
    Invitations".

- **Support counts** (M15.44, the owner's call). `assignedSupport?` and `waitingSupport?` (default 0; `viewerOf` reads them from `getMySupportCounts`, uncached, for a verified viewer; `assignedSupport` is 0 unless staff). Either above 0 puts one dot on the avatar and adds ", N requests assigned to you" / "waiting on you" to the button's hidden name. The Admin row shows `assignedSupport`, and the Support row `waitingSupport`, at the row's right end in the invitations count's red circle (`account-menu__badge`, which shares `account-menu__count-mark`'s badge styles but is not a link). Each circle has an `IconTip` below it naming what it counts, "3 Support Requests Assigned to You" or "Waiting on You", as the invitations count has. The Admin row links to `/admin/support?view=mine` and shows at every width while it has a count. The Support row links to `/account/support` instead of opening the dialog. A count from 100 reads "99+"; its hidden text reads "more than 99 requests ...".
- **Support is a `SupportLink`** ([`support-link.md`](support-link.md)) for a verified account: it opens the Support dialog over the current page.
- **Sign Out is the panel's last row**, `SignOutButton` in
  `src/components/AccountMenu/sign-out-button.tsx`: a client component with no
  props, and drawn nowhere else (it sat beside the account page's heading until
  MB.7; added in MB.63's PR, on the owner's call, since no task builds a way to
  sign out). A plain full-size `.btn`, its label in title case.
  - **Better Auth's own sign-out.** It calls `src/lib/auth-client.ts`'s
    `signOut`, which posts to `/api/auth/sign-out`: the one path outside
    GraphQL, carrying the session and no application data
    ([`auth/graphql-only-exception.md`](../auth/graphql-only-exception.md)), so
    CLAUDE.md rule 1 holds.
  - **A success is a full load of `/`**, so nothing the signed-in page held
    survives it, and a protected page asked for next sends the visitor to sign
    in.
  - **While it runs** the button is `aria-disabled` rather than `disabled`,
    so the focus stays on it, and a second press sends nothing; it is `aria-busy`, with a spinner and
    "Signing Out": a `BusyButton` ([`busy-button.md`](busy-button.md)).
  - **A failure**, a refusal or a connection that drops, says "That didn't
    work. Please try again." (`GENERIC_FAILURE`, `src/lib/graphql-failure.ts`)
    in a click-feedback callout beneath the button, with the focus left on it
    and a badge on its corner that brings the sentence back once dismissed
    ([`click-feedback.md`](click-feedback.md); M12.31). The next press clears
    it. The call
    is Better Auth's, not GraphQL's, but it has no more to say about why than a
    lost request does, so it takes the same sentence.
  - **SignInMethods' Sign In Again makes the same call** in the same shape,
    a refusal or a dropped connection said in `GENERIC_FAILURE`, but lands on
    `/sign-in?next=%2Faccount` rather than `/`, so a stale session comes back
    to the account page fresh
    ([`sign-in-methods.md`](sign-in-methods.md), "A stale session signs in
    again").

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
around them, no gap between them and no rounding; no list markers. Sign Out alone has padding around it (`.account-menu__signout`), and its
`.btn` keeps its outline, full width of that (`.account-menu__signout-action`;
a failure floats beneath it in a callout, its badge on the button's corner). The current link gets a straight accent
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

[`index.stories.tsx`](../../src/components/AccountMenu/index.stories.tsx), titled "Shell / Account Menu", has one story, `States`, with a control that chooses the state: Closed, Open, Closed With Invitations (the dot), Open With Invitations (the count beside Your Account), Open With One Invitation (the singular wording), Open On The Admin Page (the current page marked), Open With A Long Name, Sign Out Failed (the failure callout under the button) and Open Unverified (Sign Out alone). The toolbar viewport menu shows any of them at a phone's width. Every open state draws Sign Out as its last row; there is no state of the button alone, since the app never draws it elsewhere. Each sits at the right, since the panel hangs from the button's right edge. The wrapper holds the menu at its top and is tall enough for the open panel, because the workshop's frame clips what overflows it.

## Testing

`tests/components/AccountMenu/index.test.tsx`: `aria-expanded`, `aria-controls`
and the panel's contents, the Your Account `href`, Escape and the returned
focus, an outside press, a link press, the unverified panel, the phone links,
the initials, and the invitations: the button's name and the count link's name
and `href` when invitations wait, and neither when none do or the viewer is
unverified.

`tests/components/AccountMenu/sign-out-button.test.tsx` covers Sign Out's busy state and
the full load of `/`, and the failure's callout for a refusal and for a
dropped connection: the focus kept, the description, Dismiss, the badge and
the next press clearing it. `index.test.tsx` also checks that Escape closes a
failed Sign Out's callout before the menu. `tests/db/sign-out.test.ts` signs out through Better
Auth's real endpoint: the session row goes, and the same cookie then reads as
no one. `tests/e2e/shell.spec.ts` opens the account menu, routes a refusal of the
sign-out call, and finds it said beside the button, with axe. The refusal is
routed rather than waited for from Better Auth, since whether the served build
refuses it depends on the origin the browser reaches it on (Better Auth refuses
a plain-http origin, as it would any `/api/auth` POST there).
