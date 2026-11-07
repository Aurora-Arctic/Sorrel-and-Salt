# MW.15 — A slug's expiry is a date comparison; work that must happen on time is a durable job

**Status:** decided. The job mechanism is in `m15.46-daily-jobs-from-vercel-cron.md` and `src/lib/jobs/`.

**Decided:** a compendium entry's old slug stops answering by a date comparison at read time, with no scheduled job. Work that must happen on time (a mail, a retry, a delete) runs as a durable job.

## Why

A date predicate is exact at midnight UTC with nothing running. A mail, a retry or a delete must happen, and a Hobby cron fires within an hour of its time while Queues deliver events rather than dates. Those run as durable jobs behind one adapter in `src/lib/jobs/`, acting as the seeded System account. Work due once a day is started by a daily Vercel Cron call and runs to its end; no job sleeps for days waiting.
