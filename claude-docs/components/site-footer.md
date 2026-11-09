# SiteFooter

`src/components/SiteFooter/` — the footer, drawn once by the root layout (`src/app/layout.tsx`) under every page: the shell, the public frame, the home page and the error screens. It has a row (site name linking to `/`, then the footer nav of public documents, Help (`/help`, after Privacy) and the Support link; [`document-page.md`](document-page.md)) and, beneath it, the tagline (`SITE_TAGLINE` in `src/lib/site.ts`): what the site is, and that its reference is not advice. The row stacks on a phone, the tagline does not. A later document's link joins the nav here.

The Support link is a [`SupportLink`](support-form.md#support-link) drawn as the bare support icon (as in [`ReportThis`](error-page.md#report-this)) in an `IconTip` "Support", and still named "Support" by a `visually-hidden` span. `--icon-ground` is the footer's surface at rest and the hover fill, so the bubble's cut-out matches. It opens the Support dialog over the current page; the dialog is mounted beside the footer in the root layout. Before the address is known the link goes to `/support`.

## At the foot of the window

The layout wraps the page and footer in `.site-frame`, a column at least one window tall (`100dvh` less the top inset). The footer's top margin is `auto`, so on a short page the footer sits at the window's foot and on a long one it follows the content. The air above it (`space(8)`) is the bottom margin of whatever precedes it, so the gap is never smaller.

A centred `.page-frame` is shorter by the footer's height (`$footer-space`, `$footer-space-phone`) so page and footer fit one window without scrolling. The footer's fixed minimum height (`$footer-height`, `$footer-height-phone`) makes that arithmetic hold: wide 5.71875rem, phone 9.2375rem. A tagline wrapping to a third line on a very narrow phone would exceed the phone figure.

The home page is the exception: its frame (`.page-frame.welcome-page`) takes the whole window height, so the footer always follows below the fold, and `.site-frame > .welcome-page:has(+ .site-footer)` drops the air above (`margin-block-end: 0`), so one footer-height of scroll reveals it.

## The salt stays above it

The footer is opaque (`$surface-page`) and full width, so in a browser without scroll-driven animations the fixed backdrop images do not show through it. Where `animation-timeline` is supported, the footer declares a view timeline (`view-timeline: --site-footer`, scoped on `body` with `timeline-scope`) and the salt image runs `salt-rise` (`Backdrop/index.scss`) on it, lifting its `bottom` by the footer's height as the footer enters the window, so the footer pushes the salt up instead of scrolling over it. Both are inside `@supports` and marked "not yet Baseline" for the browser floor. On an entry page, where the images are absolute in a band at the page's foot, the animation is off.

On a shell page at phone width the section nav is a bar fixed along the bottom, so the footer's bottom padding adds `$bottom-bar-height` (the bar's token plus the device's bottom inset) to keep the link above it.
