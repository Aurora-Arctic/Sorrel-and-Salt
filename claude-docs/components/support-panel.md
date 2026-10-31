# SupportPanel

`src/components/SupportPanel/` — the body of `/support` and of the Support dialog. It takes the state the page or the dialog's slot worked out and
draws one of three things: Sign In for a signed-out visitor, the end of a time-out in place of the form,
or [`SupportForm`](support-form.md). `returnTo` is where Sign In brings the visitor back (the support page by default; the dialog passes its own address) and `onDone` closes the dialog. The caller decides the state; the panel decides nothing about access.

For a signed-out visitor the Sign In notice and `SignedOutSupportForm` sit in one `.support-panel--signed-out` grid, `space(4)` apart. The notice has no margin, and the form's first group has none above it and its legend none above it, so the grid gap is the whole distance.
