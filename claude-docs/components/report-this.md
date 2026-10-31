# ReportThis

`src/components/ReportThis/` — the link on the 404, 500 and global-error screens. It builds a bug
request with the status (`error`) and the page filled in. It opens the Support dialog
over the same page, which the root layout draws everywhere. Only `global-error.tsx`, which replaces that layout, links to `/support` itself.

It is an icon-only button, `btn btn--quiet btn--icon`: `SupportIcon` (a solid speech bubble with a question mark cut out of it)
in a square the height of a field, wrapped in `IconTip` with the tip "Report This". The link is still named "Report This", by a
`visually-hidden` span. The bubble takes the button's ink and the cut-out takes `--icon-ground`, which `.btn--quiet` sets to its
own background, resting and pointed at. The same icon and button are the footer's Support link.

## The path it names

It reads the page from `useActualPathname` (`src/lib/use-actual-pathname.ts`), not `usePathname`. An address
no route matches renders on the framework's own `/_not-found` route, which `usePathname` reports, so the link
would send `/_not-found` as the page. In the browser the hook reads the address bar. In the server's render it gives
the router's path unless that is `/_not-found`, when it gives nothing: the link is then a bare query
(`?support=bug&error=404`, which keeps the address it is at).

## The error reference

An error page that has a digest (the 500 pages) passes it as `reference`, and the link carries it as `ref`. The
Support dialog and the `/support` page read `ref` through `errorReferenceOf` (blank or over 100 characters is
dropped) and hand it to the form. `src/app/global-error.tsx` builds the same `ref` into its plain link.
