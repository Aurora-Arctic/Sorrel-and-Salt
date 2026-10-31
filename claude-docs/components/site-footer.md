# SiteFooter

`src/components/SiteFooter/` — the footer, drawn once by the root layout (`src/app/layout.tsx`) under every page: the shell, the public frame, the home page and the error screens. It is one row in the wide column, under a hairline that spans the whole window (the footer's own top border, not the row's): at the left the site name (`SITE_NAME`) as a link to `/`, in the heading face, and at the right the footer nav, in the body face at the small size. The two are baseline-aligned and wrap; at phone width the row stacks, name above links, left-aligned. The nav carries a Support link and nothing else; later footer links are added to it here, and there is no descriptive line under the name.

The link is a [`SupportLink`](support-link.md): it opens the Support dialog over the current page. The dialog is mounted beside the footer in the root layout, so every page has one. Before the address is known, the link goes to `/support`.

## At the foot of the window

The layout wraps the page and the footer in `.site-frame`, a column at least one window tall (`100dvh` less the top inset). The footer's top margin is `auto`, so on a short page the spare room opens between the page and the footer and the footer sits at the foot of the window; on a long page it follows the content. The step of air above it (`space(8)`) is the bottom margin of whatever precedes it, so the gap is never smaller. A centred page frame (`.page-frame`) is shorter by the footer's height (`$footer-space`, `$footer-space-phone`) so the page and the footer together fit one window and do not scroll for it. The one exception is the home page: its frame (`.page-frame.welcome-page`) takes the whole window height, so the footer always follows below the fold. The row has a fixed minimum height (`$footer-height`, `$footer-height-phone`) so those numbers hold.

## The salt stays above it

The footer is opaque (`$surface-page`) and full width, so in a browser without scroll-driven animations the fixed backdrop images do not show through it. Where `animation-timeline` is supported, the footer declares a view timeline (`view-timeline: --site-footer`, scoped on `body` with `timeline-scope`), and the salt image runs an animation on it (`salt-rise` in `Backdrop/index.scss`) that lifts its `bottom` by the footer's height as the footer enters the window. The footer therefore never scrolls over the salt; it pushes it up, as the sorrel is held below the bar. Both are inside `@supports` and marked "not yet Baseline" for the browser floor. On an entry page, where the images are absolute in a band at the page's foot, the animation is off.

On a shell page at phone width the section nav is a bar fixed along the bottom, so the footer's bottom padding adds `$bottom-bar-height` (the bar's own token, plus the device's bottom inset) to keep the link above it, and the salt's resting place is already above the bar.
