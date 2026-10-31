# SupportLink

`src/components/SupportLink/` — a link that opens the Support dialog over the page it is on, by adding
a bare `?support=` to the current address and keeping its other parameters. The footer
and the account menu use it; the dialog is in every page. Until the address is known it renders a link to `/support`.
