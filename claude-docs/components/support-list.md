# SupportList

`src/components/SupportList/` — the sender's own requests on `/account/support`, newest first. Each shows
its subject, what it is about, status, date and message, the replies staff wrote (oldest first) and, for a bug with
one, a View Issue link. The page passes only rows the services returned for the signed-in sender;
the component filters nothing. Paged with the shared pager.
