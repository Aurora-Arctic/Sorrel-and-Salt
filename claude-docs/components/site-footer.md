# SiteFooter

`src/components/SiteFooter/` — the footer both `AppShell` and `PublicFrame` draw. It is one row in the wide column, under a hairline: at the left the site name (`SITE_NAME`) as a link to `/`, in the heading face, and at the right the footer nav, in the body face at the small size. The two are baseline-aligned and wrap; at phone width the row stacks, name above links, left-aligned. The nav carries a Support
link and nothing else; later footer links are added to it here, and there is no descriptive line under the name.

The footer is opaque (`$surface-page`) and full width, so the fixed backdrop images never show through it, and its top margin (`space(8)`) is the whole gap under a page's last content: a frame that a footer follows gives up its own bottom padding (`_primitives.scss`).

With `inShell`, as `AppShell` passes it, the
link is a [`SupportLink`](support-link.md) that opens the Support dialog over the current page. The
public frame draws no dialog, so its link goes to `/support`.

On a shell page at phone width the section nav is a bar fixed along the bottom, so the footer's bottom
padding adds `$bottom-bar-height` (the bar's own token, plus the device's bottom inset) to keep the
link above it. The signed-in home page, which sits in neither frame, draws the footer itself with the
plain link to `/support`; a signed-out visitor to `/` sees the site name only.
