# SupportPanel

`src/components/SupportPanel/` — the body of `/support`. It takes the state the page worked out and
draws one of three things: Sign In for a signed-out visitor, the end of a time-out in place of the form,
or [`SupportForm`](support-form.md). The page decides the state; the panel decides nothing about access.
