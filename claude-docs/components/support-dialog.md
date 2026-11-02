# SupportDialog

`src/components/SupportDialog/` — the Support dialog, drawn once by the root layout, with no props, on every page. The layout reads nothing for it. It is open while the
address carries `?support=<about>`; `?error=<status>` adds an error number, and `?from=<path>` names the
page the request is about when it is not the page the dialog sits on. Closing drops the parameters and
keeps the page.

## Contracts

- Asks what the visitor may do when it opens, through `/api/graphql` (the `supportDialogState` query, open to a signed-out caller and answered under the caller’s own session by `getMySupportDialogState`), and asks again at every open. The answer is `signedOut` (Sign In and the signed-out form), `unverified` (a line and a link to the email page instead of the form), `timedOut` (when the time-out ends) or `form`. Until it arrives the dialog shows a form skeleton, and a failed read shows the generic failure notice, never an empty form.
- The body is [`SupportPanel`](support-panel.md), which draws [`SupportForm`](support-form.md) for a sender who may write, inside a `RouteModal` titled Contact Support.
- Reads the address through `useSearchParams`, so it sits in a Suspense boundary.
