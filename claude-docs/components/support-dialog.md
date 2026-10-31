# SupportDialog

`src/components/SupportDialog/` — the Support dialog, drawn once by the root layout through `SupportDialogSlot`, on every page. It is open while the
address carries `?support=<about>`; `?error=<status>` adds an error number, and `?from=<path>` names the
page the request is about when it is not the page the dialog sits on. Closing drops the parameters and
keeps the page.

## Contracts

- Takes `state`: `signed-out` (Sign In and the signed-out form), `unverified` (a line and a link to the email page instead of the form), `timed-out` (when the time-out ends) or `form`. The slot reads it per request from the session and the time-out query.
- The body is [`SupportPanel`](support-panel.md), which draws [`SupportForm`](support-form.md) for a sender who may write, inside a `RouteModal` titled Contact Support.
- Reads the address through `useSearchParams`, so it sits in a Suspense boundary.
