# ImpersonationBanner

`src/components/ImpersonationBanner/` is the way out of an impersonation. On every page while
the session is an impersonation, it names the user being impersonated and
carries Stop Impersonating
([`auth/impersonation.md`](../auth/impersonation.md), "The way out").

## Props

`ImpersonationBannerProps` (`types.ts`). The `email` tells two people with the same name apart.

## Contracts

- **An `<aside>` named "Impersonation"**, holding "You are impersonating
  _name_ (_email_)." and a Stop Impersonating button.
- **Stop calls `stopImpersonating`** from `src/lib/auth-client.ts`. On success
  it does a full load of `/keepers/users`, since the session cookie is the
  admin's again and every server component must read it. While the request
  is out the button is a `BusyButton` ([`busy-button.md`](busy-button.md)):
  `aria-busy`, the spinner and "Stopping", and `aria-disabled` rather than
  `disabled`, so the focus stays on it rather than falling to the page; a
  second press sends nothing.
  On failure, a refusal or a request that never arrives, it says
  "Impersonation didn't stop. Please try again, or sign out to end it." in a
  click-feedback callout under the button, with the focus left on it and a
  badge on its corner that brings the sentence back once dismissed
  ([`click-feedback.md`](click-feedback.md)). The banner stays open
  while the failure stands, and the next press clears it.
- **The root layout mounts it through a slot,**
  `src/app/impersonation-banner.tsx`, which reads the session with
  `useSession` and renders the banner only while `session.impersonatedBy` is
  set. The layout mounts the slot only where `impersonationEnabled()` holds,
  so at production neither exists. It is first in `<body>`, above what it
  describes.

## Styling

It is a wrapping row of the sentence and the button,
padded with `space()`, on `$surface-card` over a `$rule-heavy` (3px)
`$secondary` rule, heavy enough to read by its weight as well as its colour.
The button is
`.btn--quiet .btn--small`, and a failure is the click-feedback callout and
badge ([`click-feedback.md`](click-feedback.md)).

- **Full width, and never adding to a page's height.**
- **On a touch screen it sits in the page's flow at the very top and scrolls
  away with the page**, shown in full, since nothing can hover to bring it
  back. The component publishes its height as `--impersonation-banner-height`
  on the root while mounted (a `ResizeObserver`), and its stylesheet maps that
  to the top inset under `@media (hover: none)`. Only the heights that fit the
  window (the page frames' and the site frame's `min-height`) subtract it. The
  shell's bar, ThemeToggle, the backdrop and every scroll offset start from the
  window's top, so the bar rides up under the banner and holds at the top once
  it has gone. Its end padding reserves the corner toggle's width, `$toggle-corner`, and a `space(2)` gap, so Stop is never under the toggle at scroll 0 ([`styling.md`](../styling.md), "The top inset"). Its bottom
  padding is `space(3)`, one step more than its top, so Stop is not crowded
  by the rule when it wraps to a row of its own.
- **Where a pointer can hover, it is fixed over the top of the page and sits
  under the corner ThemeToggle** (`layer('banner')`, 11, under the toggle's
  `layer('toggle')`, 12, and over the shell's bar at `layer('shell')`, 10), so
  pointing at the toggle reaches the toggle and never opens the banner. Its right padding keeps its content clear of the
  toggle's corner, `$toggle-corner` (3.9rem), the token ThemeToggle reads
  too, so the two cannot drift. The layers are `layer()`'s map in `_variables.scss`
  ([`styling.md`](../styling.md), "The application shell and the layers").
- **Tucked away until a pointer nears the top.** Where the pointer can hover
  (`@media (hover: hover)`), the banner is fixed to the top and translated up
  so only `space(2)` of it shows: the 3px rule and a sliver above it. An
  invisible `::after` reaches `space(4)` further down, so a pointer that far
  from the top counts as hovering it. On hover it slides down and casts
  `$shadow-floating`.
- **It also opens on focus and while Stop is pending or has failed.**
  `:focus-within` lets a keyboard reach Stop. The `--open` modifier keeps
  the failure sentence from sliding away unread.
- **Standard motion.** The transform moves with `theme-transition`, the
  shared 400ms `ease-in-out`. Under reduced motion it jumps instead.

## Stories and tests

`src/components/ImpersonationBanner/index.stories.tsx`, `tests/components/ImpersonationBanner/` and `tests/app/impersonation-banner.test.tsx` (the slot shows only during an impersonation; the layout mounts it only where the gate is open). `OverTheShell` uses `ShellFrame` (`.storybook/shell-frame.tsx`). A desktop browser can hover, so the workshop shows the banner tucked; the review screenshots emulate a touch screen (`scripts/review-screenshots.mjs`), where `(hover: none)` holds. In the workshop Stop reaches no server, so a click shows the failure. The published height is a measured layout that happy-dom fakes, so no test asserts it.
