# SupportList

`src/components/SupportList/` — the sender's own requests on `/account/support`, newest first. Each shows
its subject (a level 2 heading at the smallest heading size, under the page's own), what it is about, status, date and message, the replies staff wrote (oldest first) and, for a bug with
one, a View Issue link. The page passes only rows the services returned for the signed-in sender;
the component filters nothing. Paged with the shared pager.
