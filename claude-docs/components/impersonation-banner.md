# ImpersonationBanner

`src/components/ImpersonationBanner/` is the way out of an impersonation. On every page while the session is an impersonation, it names the user being impersonated and carries Stop Impersonating ([`auth/impersonation.md`](../auth/impersonation.md), "The way out"). The `email` tells two people with the same name apart.

## Contracts

- **An `<aside>` named "Impersonation".**
- **Stop calls `stopImpersonating`** (`src/lib/auth-client.ts`). On success it does a full load of `/keepers/users`, since the session cookie is the admin's again and every server component must read it. While pending the button is a `BusyButton` ([`busy-button.md`](busy-button.md)), `aria-disabled` rather than `disabled` so the focus stays on it; a second press sends nothing. On failure it says "Impersonation didn't stop. Please try again, or sign out to end it." in a click-feedback callout under the button ([`click-feedback.md`](click-feedback.md)); the banner stays open while the failure stands and the next press clears it.
- **The root layout mounts it through a slot,** `src/app/impersonation-banner.tsx`, which reads `useSession` and renders only while `session.impersonatedBy` is set. The layout mounts the slot only where `impersonationEnabled()` holds, so at production neither exists. It is first in `<body>`, above what it describes.

## Styling

The rule is `$rule-heavy` (3px) in `$secondary`, heavy enough to read by weight as well as colour. Full width, and it never adds to a page's height.

- **On a touch screen** (`@media (hover: none)`) it sits in the page's flow at the very top and scrolls away with the page, shown in full, since nothing can hover to bring it back. The component publishes its height as `--impersonation-banner-height` on the root while mounted (a `ResizeObserver`), and its stylesheet maps that to the top inset. Only the heights that fit the window (the page frames' and the site frame's `min-height`) subtract it; the shell's bar, ThemeToggle, the backdrop and every scroll offset start from the window's top, so the bar rides up under the banner and holds at the top once it has gone. Its end padding reserves `$toggle-corner` (3.9rem, the token ThemeToggle reads too) and a `space(2)` gap, so Stop is never under the toggle at scroll 0 ([`styling.md`](../styling.md), "The top inset"). Its bottom padding is one step more than its top, so Stop is not crowded by the rule when it wraps.
- **Where a pointer can hover** (`@media (hover: hover)`) it is fixed over the top of the page, translated up so only `space(2)` shows (the rule and a sliver), and sits under the corner ThemeToggle (`layer('banner')` 11, under `layer('toggle')` 12 and over the shell's bar at `layer('shell')` 10; [`styling.md`](../styling.md), "The application shell and the layers"), so pointing at the toggle never opens the banner. An invisible `::after` reaches `space(4)` further down, so a pointer that near the top counts as hovering it. On hover it slides down and casts `$shadow-floating`.
- **It also opens on focus** (`:focus-within`, so a keyboard reaches Stop) **and while Stop is pending or has failed** (the `--open` modifier), so the failure sentence does not slide away unread.
- **Standard motion**: `theme-transition`, jumping under reduced motion.

## Stories and tests

`src/components/ImpersonationBanner/index.stories.tsx` (`OverTheShell` uses `ShellFrame`, `.storybook/shell-frame.tsx`), `tests/components/ImpersonationBanner/` and `tests/app/impersonation-banner.test.tsx` (the slot shows only during an impersonation; the layout mounts it only where the gate is open). A desktop browser can hover, so the workshop shows the banner tucked; review screenshots emulate a touch screen (`scripts/review-screenshots.mjs`). In the workshop Stop reaches no server, so a click shows the failure. The published height is a measured layout that happy-dom fakes, so no test asserts it.
