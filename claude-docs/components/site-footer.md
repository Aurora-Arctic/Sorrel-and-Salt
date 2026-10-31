# SiteFooter

`src/components/SiteFooter/` — the footer both `AppShell` and `PublicFrame` draw. It carries a Support
link and nothing else; later footer links are added here. With `inShell`, as `AppShell` passes it, the
link is a [`SupportLink`](support-link.md) that opens the Support dialog over the current page. The
public frame draws no dialog, so its link goes to `/support`.

On a shell page at phone width the section nav is a bar fixed along the bottom, so the footer's bottom
padding adds `$bottom-bar-height` (the bar's own token, plus the device's bottom inset) to keep the
link above it. The signed-in home page, which sits in neither frame, draws the footer itself with the
plain link to `/support`; a signed-out visitor to `/` sees the site name only.
