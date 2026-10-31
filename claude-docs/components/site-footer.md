# SiteFooter

`src/components/SiteFooter/` — the footer both `AppShell` and `PublicFrame` draw. It carries a Support
link and nothing else; later footer links are added here. With `inShell`, as `AppShell` passes it, the
link is a [`SupportLink`](support-link.md) that opens the Support dialog over the current page. The
public frame draws no dialog, so its link goes to `/support`.
