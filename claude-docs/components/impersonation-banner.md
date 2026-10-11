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
  admin's again and every server component must read it. On failure it says
  "Impersonation could not be stopped. Signing out ends it too.", and the
  button works again.
- **The root layout mounts it through a slot,**
  `src/app/impersonation-banner.tsx`, which reads the session with
  `useSession` and renders the banner only while `session.impersonatedBy` is
  set. The layout mounts the slot only where `impersonationEnabled()` holds,
  so at production neither exists. It is first in `<body>`, above what it
  describes.

## Styling

Layout and motion only, until the admin area's design review (MB.115). The
motion, the width, the rule and the button size are the owner's calls, made
during MB.53. It is a wrapping row of the sentence and the button, padded with
`space()`, on `$surface-card` over a 3px `$secondary` rule. The button is
`.btn--quiet .btn--small`, and a failure is `.notice--error`.

- **Full width, and never adding to a page's height.**
- **On a touch screen it sits in the page's flow at the very top**, shown in
  full, since nothing can hover to bring it back. Everything that measures from
  the top of the window starts below it: the component publishes its height as
  `--impersonation-banner-height` on the root while mounted (a
  `ResizeObserver`), and its stylesheet maps that to the top inset under
  `@media (hover: none)`. ThemeToggle, the backdrop and the full-height pages
  offset by the inset, so nothing overlaps the banner and no page scrolls by
  its height ([`styling.md`](../styling.md), "The top inset"). Its bottom
  padding is `space(3)`, one step more than its top, so Stop is not crowded
  by the rule when it wraps to a row of its own.
- **Where a pointer can hover, it is fixed over the top of the page and sits
  under the ThemeToggle** (`z-index: 1` under the toggle's `2`), so pointing
  at the toggle reaches the toggle and never opens the banner. Its right padding keeps its content clear of the
  toggle's corner (3.9rem, ThemeToggle's `$theme-toggle-corner-radius`).
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

[`index.stories.tsx`](../../src/components/ImpersonationBanner/index.stories.tsx):
`Default`. In the workshop Stop reaches no server, so a click shows the
failure. Render-only, no test ids, no snapshots.

## Testing

`tests/components/ImpersonationBanner/index.test.tsx` covers the user named
by name and address, the call and the landing, and the failure as an alert
with the admin kept on the page. The published height is presentation, a
measured layout that jsdom fakes, and no test asserts it.
`tests/app/impersonation-banner.test.tsx` covers the slot (shown only while
the session is an impersonation) and the layout (mounted only where the gate
is open).
