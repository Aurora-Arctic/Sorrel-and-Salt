# ReportThis

`src/components/ReportThis/` — the link on the 404, 500 and global-error screens. It builds a bug
request with the status (`error`) and the page filled in. With `inShell` it opens the Support dialog
over the same page; without, it goes to `/support` with the page as `from`, because the screen has no
shell round it. The shell's `error.tsx` and `not-found.tsx` pass `inShell`.
