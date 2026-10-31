# ImpersonationBanner

`src/components/ImpersonationBanner/`: MB.53's way out. On every page while
the session is an impersonation, it names the user being impersonated and
carries Stop Impersonating
([`auth/impersonation.md`](../auth/impersonation.md), "The way out").

## Props

`ImpersonationBannerProps` (`types.ts`):

| Prop    | What it is                                                     |
| ------- | -------------------------------------------------------------- |
| `name`  | The impersonated user's name                                   |
| `email` | Their address, which tells two people with the same name apart |

## Contracts

- **An `<aside>` named "Impersonation"**, holding "You are impersonating
  _name_ (_email_)." and a Stop Impersonating button.
- **Stop calls `stopImpersonating`** from `src/lib/auth-client.ts`. On success
  it does a full load of `/admin/users`, since the session cookie is the
  admin's again and every server component must read it. While the request
  is out the button is a `BusyButton` ([`busy-button.md`](busy-button.md)):
  `aria-busy`, the spinner and "Stopping", and `aria-disabled` rather than
  `disabled`, so the focus stays on it rather than falling to the page; a
  second press sends nothing (MB.115, a sub-hour fix the owner asked for).
  On failure, a refusal or a request that never arrives, it says
  "Impersonation didn't stop. Please try again, or sign out to end it." in a
  click-feedback callout under the button, with the focus left on it and a
  badge on its corner that brings the sentence back once dismissed
  ([`click-feedback.md`](click-feedback.md); M12.31). The banner stays open
  while the failure stands, and the next press clears it.
- **The root layout mounts it through a slot,**
  `src/app/impersonation-banner.tsx`, which reads the session with
  `useSession` and renders the banner only while `session.impersonatedBy` is
  set. The layout mounts the slot only where `impersonationEnabled()` holds,
  so at production neither exists. It is first in `<body>`, above what it
  describes.

## Styling

The motion, the width, the rule and the button size are the owner's calls,
made during MB.53. It is a wrapping row of the sentence and the button,
padded with `space()`, on `$surface-card` over a `$rule-heavy` (3px)
`$secondary` rule, heavy enough to read by its weight as well as its colour.
The touch layout below is signed off at MB.115 from touch-emulated
screenshots. The button is
`.btn--quiet .btn--small`, and a failure is the click-feedback callout and
badge ([`click-feedback.md`](click-feedback.md)).

- **Full width, and never adding to a page's height.**
- **On a touch screen it sits in the page's flow at the very top and stays
  pinned there** (`position: sticky; top: 0`, at `layer('banner')`), shown in
  full, since nothing can hover to bring it back. The shell's bar sticks at the
  inset, so the banner must not scroll away and leave the bar a gap above it. Everything that measures from
  the top of the window starts below it: the component publishes its height as
  `--impersonation-banner-height` on the root while mounted (a
  `ResizeObserver`), and its stylesheet maps that to the top inset under
  `@media (hover: none)`. ThemeToggle, the backdrop and the full-height pages
  offset by the inset, so nothing overlaps the banner and no page scrolls by
  its height ([`styling.md`](../styling.md), "The top inset"). Its bottom
  padding is `space(3)`, one step more than its top, so Stop is not crowded
  by the rule when it wraps to a row of its own.
- **Where a pointer can hover, it is fixed over the top of the page and sits
  under the corner ThemeToggle** (`layer('banner')`, 11, under the toggle's
  `layer('toggle')`, 12, and over the shell's bar at `layer('shell')`, 10), so
  pointing at the toggle reaches the toggle and never opens the banner. Its right padding keeps its content clear of the
  toggle's corner, `$toggle-corner` (3.9rem), the token ThemeToggle reads
  too, so the two cannot drift (MB.115). The layers are `layer()`'s map in `_variables.scss`
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

## Stories

[`index.stories.tsx`](../../src/components/ImpersonationBanner/index.stories.tsx),
`Layout / Impersonation Banner`: `Default`, the banner alone, `OverTheShell`,
the banner over the shell (`ShellFrame`, `.storybook/shell-frame.tsx`),
where the app puts it: first in the body, above the shell's bar, `StopFailed`, Stop pressed so the failure shows, and `Stopping`, Stop pressed and not yet answered, the button reading Stopping and busy. A desktop browser can hover, so it shows the
banner tucked; the review screenshots emulate a touch screen
(`scripts/review-screenshots.mjs`), where `(hover: none)` holds and the
banner sits in the flow with the shell starting below it. In the workshop Stop
reaches no server, so a click shows the failure. Render-only, no test ids, no
snapshots.

## Testing

`tests/components/ImpersonationBanner/index.test.tsx` covers the user named
by name and address, the call and the landing, Stop busy and still
focusable while pending with a second press sending nothing, and the failure
as an alert
with the admin kept on the page. The published height is presentation, a
measured layout that happy-dom fakes, and no test asserts it.
`tests/app/impersonation-banner.test.tsx` covers the slot (shown only while
the session is an impersonation) and the layout (mounted only where the gate
is open).
