# AccountMenu

`src/components/AccountMenu/` is the account button in the shell's bar and the panel it opens. It is a client component. Facts the props cannot say:

- `verified` is whether the viewer's address is verified. When it is not, the panel offers Sign Out alone.
- `links` are the bar's site links (Your Coven, Admin), offered in the panel at or under `$shell-tablet-width`, where the bar has no room for them.
- `pendingInvitations` counts coven invitations waiting for the viewer's verified address. `AppShell` passes `viewer.pendingInvitations`, which `viewerOf` reads once per request. It counts only for a verified viewer, because an unverified one cannot reach the account page the count leads to.
- `assignedSupport` and `waitingSupport` default to 0. `viewerOf` reads them from `getMySupportCounts`, uncached, for a verified viewer, and `assignedSupport` is 0 unless the viewer is staff.

## Contracts

- **A disclosure, not an ARIA menu.** The button has `aria-expanded` and `aria-controls` and shows a list. There is no `role="menu"`, which promises arrow-key movement and a type-ahead the panel does not have, and the panel holds links and a button. This is the APG disclosure pattern.
- **Escape closes it and returns the focus to the button.** It listens on the window and skips an Escape something else already took (`defaultPrevented`). With a failed Sign Out's callout open, the first Escape closes the callout and the next closes the menu. A press outside it closes it, and so does a press on a link in it. The panel is in the page only while open.
- **The name is said once**, on the button. The avatar disc (up to two initials, from the first and last words of the name) is `aria-hidden`.
- **Every link in the panel is a `PendingLink`** ([`loading.md`](../loading.md)): it starts the navigation through the shared hook and sets `aria-busy` while it runs.
  - The destination's address chooses the skeleton (`src/app/skeletons.ts`), so the site links and the account links name nothing.
- **The panel lists**, in order: Your Account (a link to `/account`, not for an unverified viewer), the site links at or under `$shell-tablet-width`, then Sign Out. **The theme switch is not in the panel.** It stays in the shell's bar at every width.
- **Waiting invitations show in three places.**
  - **A dot on the avatar disc**, `aria-hidden` with the disc.
  - **The button's name gains ", N coven invitations"**, as hidden text (`account-menu__count`) that repeats the name and adds the count. The visible name is then `aria-hidden`, so the button reads "Name, 2 coven invitations" with no stray space. It is not an `aria-label`, because axe's `label-content-name-mismatch` wants a label to repeat every visible word, the avatar's initials among them.
  - **A count link at the right end of the Your Account row**: a link of its own to `/account#account-invitations` (`ACCOUNT_INVITATIONS_PATH`). It is a sibling of the Your Account link, because a link cannot hold a link: a press on the count opens the invitations, and a press on the rest of the row opens the account page.
- **Support counts.** Either `assignedSupport` or `waitingSupport` above 0 puts one dot on the avatar and adds ", N requests assigned to you" or "waiting on you" to the button's hidden name.
  - The Keepers row shows `assignedSupport`, and the Support row `waitingSupport`, at the row's right end in a circle (`account-menu__badge`, which shares `account-menu__count-mark`'s badge styles but is not a link), each with an `IconTip` naming what it counts.
  - The Keepers row links to `/keepers`, and its circle is a link of its own beside it, to `/keepers/support?view=mine`. The row shows at every width while it has a count. The Support row's circle sits inside its link, and the row links to `/account/support`, not to the dialog.
  - A count from 100 reads "99+", and its hidden text reads "more than 99 requests ...".
- **Support is a `SupportLink`** ([`support-form.md`](support-form.md), "Support link") for a verified account: it opens the Support dialog over the current page.
- **Sign Out is the panel's last row**, `SignOutButton` (`sign-out-button.tsx`): a client component with no props, drawn nowhere else.
  - **It is Better Auth's own sign-out.** It calls `signOut` from `src/lib/auth-client.ts`, which posts to `/api/auth/sign-out`: the one path outside GraphQL, carrying the session and no application data ([`auth/config.md`](../auth/config.md)), so CLAUDE.md rule 1 holds.
  - **A success is a full load of `/`**, so nothing the signed-in page held survives it, and a protected page asked for next sends the visitor to sign in.
  - **While it runs** the button is `aria-disabled` rather than `disabled`, so the focus stays on it and a second press sends nothing. It is `aria-busy`, with a spinner and "Signing Out": a `BusyButton` ([`busy-button.md`](busy-button.md)).
  - **A failure**, a refusal or a dropped connection, says "That didn't work. Please try again." (`GENERIC_FAILURE`, `src/lib/graphql-failure.ts`) in a click-feedback callout beneath the button, with the focus left on it and a badge on its corner that brings the sentence back once dismissed ([`click-feedback.md`](click-feedback.md)). The next press clears it. The call is Better Auth's, not GraphQL's, but it has no more to say about why than a lost request does, so it takes the same sentence.
  - **SignInMethods' Sign In Again makes the same call** in the same shape, but lands on `/sign-in?next=%2Faccount` rather than `/`, so a stale session comes back to the account page fresh ([`sign-in-methods.md`](sign-in-methods.md), "A stale session signs in again").

## Styling

- At or under `$shell-tablet-width` the name stays in the page visually hidden, the chevron goes, and the button is a `$control-height` square, because with the name an admin's bar ran past the window from 642px up. The button may give up width (`flex: 0 1 auto`, the bar's one item that can), so a long name ends in an ellipsis rather than pushing the theme disc past the window.
- The focus ring is drawn inside the row (`outline-offset: -2px`), where the panel's own edge would cut an outside one.
- The panel is between `$panel-min-width` (15rem) and `$panel-max-width` (18rem) wide, or the button's own width if that is greater, through the `floating-panel` mixin the switcher's list uses too. Rows are `$panel-row-height` tall (2.8125rem, 45px; the switcher's rows use it too) and run edge to edge of the panel, with no padding around them, no gap between them and no rounding.
- Sign Out is a row like the others (`.account-menu__item`), under a 1px hairline (`.account-menu__signout`) that sets it apart, with no padding around it (`.account-menu__signout-action`); a failure floats beneath it in a callout, its badge on the button's corner.
- The panel does not clip (no `overflow: hidden`), so the count's tip can hang past its edge. The last row is always Sign Out, whose own wash takes the panel's bottom rounding.
- The count is the site's badge in the `attention` palette ([`styling.md`](../styling.md), "Badge palettes"), laid over the row's right end so Your Account's wash still runs edge to edge beneath it. On hover it keeps `$text-on-color` and darkens (`filter: brightness(0.85)`), because the typography's link hover would otherwise recolour the label.
- In forced-colours mode the disc's `$accent` fill is dropped, so a 1px `CanvasText` border draws the circle. The invitations dot is drawn by its fill alone, so it does not show in forced-colours mode.

## Not here

Stories: [`index.stories.tsx`](../../src/components/AccountMenu/index.stories.tsx). The wrapper is tall enough for the open panel, because the workshop's frame clips what overflows it.

Tests: `tests/components/AccountMenu/index.test.tsx` and `sign-out-button.test.tsx` (Sign Out's busy state, the full load of `/`, and the failure callout for a refusal and for a dropped connection, with the next press clearing it). `tests/db/sign-out.test.ts` signs out through Better Auth's real endpoint. `tests/e2e/shell.spec.ts` routes a refusal of the sign-out call, because whether the served build refuses it depends on the origin the browser reaches it on (Better Auth refuses a plain-http origin for any `/api/auth` POST).
