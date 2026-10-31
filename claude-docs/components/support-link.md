# SupportLink

`src/components/SupportLink/` — a link that opens the Support dialog over the page it is on, by adding
a bare `?support=` to the current address and keeping its other parameters. The footer in the shell
and the account menu use it. Until the address is known it renders a link to `/support`, and with `plain`
(the public frame's footer, which draws no dialog) it always does.
