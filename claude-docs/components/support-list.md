# SupportList

`src/components/SupportList/` — the sender's own requests on `/account/support`, newest first. Each shows
its subject (a level 2 heading at the smallest heading size, under the page's own), what it is about, status, date and message, and the replies staff wrote (oldest first). It never draws a
link to a bug's issue: the address is staff-only and the sender's reads do not carry it. The page passes only rows the services returned for the signed-in sender;
the component filters nothing. Paged with the shared pager.
