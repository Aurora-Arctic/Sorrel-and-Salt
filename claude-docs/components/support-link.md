# SupportLink

`src/components/SupportLink/` — a link that opens the Support dialog over the page it is on, by adding
a bare `?support=` to the current address and keeping its other parameters. The footer
and the account menu use it; the dialog is in every page. Until the address is known it renders a link to `/support`.

It is a `ModalLink` (`scroll={false}`), so opening the dialog does not scroll the page behind it to the top ([`modal.md`](modal.md)).

Both links carry `rel="nofollow"`, which asks a search engine's crawler not to fetch the address. Each is a copy of a page with the dialog asked for, and `robots.txt` blocks the home page's copy, `/?support=`, so a crawler that followed it would report a blocked link.

The optional `about` prop names a topic from the form’s own list (`SUPPORT_ABOUTS`), so the dialog opens with it chosen: the link adds `?support=<about>` instead of a bare `?support=`, and the no-JavaScript link goes to `/support?support=<about>`. The page the request is about is the address the link sits on. A signed-out visitor gets the topic chosen only when it is one of the five open without an account (accessibility, bug, account, privacy, question); a topic that needs an account, such as the compendium, leaves nothing chosen.
