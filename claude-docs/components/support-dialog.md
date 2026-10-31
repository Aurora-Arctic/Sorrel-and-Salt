# SupportDialog

`src/components/SupportDialog/` — the Support dialog, drawn once by `AppShell`. It is open while the
address carries `?support=<about>`; `?error=<status>` adds an error number, and `?from=<path>` names the
page the request is about when it is not the page the dialog sits on. Closing drops the parameters and
keeps the page.

## Contracts

- Takes `verified`. An unverified account sees a line and a link to the email page instead of the form,
  as every other page does for it.
- The body is [`SupportForm`](support-form.md) inside a `RouteModal` titled Contact Support.
- Reads the address through `useSearchParams`, so it sits in a Suspense boundary.
