## MB — Bugfixes and gap tasks

The MB tasks that belong to the Sorrel & Salt V1.Next Project; the rest are in [`v1/mb.md`](../v1/mb.md).

_2 tasks · 8 hours_

**MB.163 — Rewrite a renamed curated value in a background job** · 4h

_Story:_ As a site keeper, I want renaming a celestial body, zodiac sign, form or deity to return at once however many compendium entries hold it, so that fixing a typo in a list the whole compendium uses is not a request that times out.

Minted during MB.162's scoping, on the owner's call ([`ingredients.md`, "The compendium holds curated values alone"](../../design-decisions/ingredients.md#the-compendium-holds-curated-values-alone)); it sits in the Deferred milestone, moved there from Wave 17 on the owner's call of 2026-11-08. **Post-launch, and unscheduled by design as M7.A.1 is:** it is not built now, and only its trigger starts it. The trigger is a _measured_ rewrite time near the function's time limit, not a guess. Until it fires, the rewrite in the rename's own transaction is v1's behaviour. The trigger is unlikely to fire at the compendium's expected size: each rename's rewrite is one set-based `UPDATE` in the rename's transaction (`carryAstrologyRename`, `carryFormRename` and `carryDeityRename` in `src/db/repository/write.ts`). A form or a deity is matched through an index on `form_id` or `deity_id`. A celestial body or zodiac sign rename scans every live compendium entry's list, with no index. The cost is an estimate, not a measurement: under 50 ms at 5,000 compendium entries.

MB.162 holds a compendium entry's forms, celestial bodies, zodiac signs and deities to the live curated rows, and M5.6a, MB.95 and MB.132 keep that so by carrying a rename onto every live compendium entry holding the old spelling, in the rename's own transaction. MB.290 extends that rewrite and the delete check to each compendium variant's own `celestial_bodies` and `zodiac_signs` lists, so this task builds on MB.290 as well as on M5.6a, MB.95 and MB.132, and its job must cover the variants' lists too. A form rename moves no slug: since MB.215 a slug comes from the name and the formal name alone (DESIGN.md §5; `claude-docs/db/ingredient-slugs.md`), and a form is a variant's `form` text plus its `form_id` pick, so there is nothing to re-key or re-slug.

Background jobs exist now. The site runs durable jobs on Vercel Workflows ([`support.md`, "The site has a durable job mechanism"](../../design-decisions/support.md#the-site-has-a-durable-job-mechanism)) and daily Vercel Cron routes ([`support.md`, "Daily jobs start from Vercel Cron, and no job sleeps waiting"](../../design-decisions/support.md#daily-jobs-start-from-vercel-cron-and-no-job-sleeps-waiting)). The expected job is a Workflow run started after the rename commits. The task still records the alternatives it weighed: that, a cron draining a record of owed rewrites, and `after()` on the response.

A job started after the commit can fail to start, and then nothing would record that a rewrite is owed. For a celestial body or sign, the old spelling must be recorded in the rename's own transaction. The expected shape is a column on the curated row, cleared by the job's last step, as M15.50 keeps `former_email` ([`support.md`, "Mail is sent through a retried job"](../../design-decisions/support.md#mail-is-sent-through-a-retried-job)), not a new table, so the table-task and behaviour-task split does not apply. A form or a deity needs no record: a sweep can find stored text that differs from the row its `form_id` or `deity_id` points at. If starting the job throws, the rename can carry in the request as today, the fallback `src/modules/support/services/retention-start.ts` uses.

The task decides how the window between the rename and the rewrite keeps MB.162's rule. Forms and deities are picked by id (MB.167), so a form's or deity's stored text would only lag beside a correct id. Celestial bodies and zodiac signs are still matched by spelling (`curatedSpellings` in `src/modules/ingredients/services/compendium.ts`), so only those two can misread in the window, since an entry then holds a spelling no live row has. Ways to keep the rule include matching the old spelling as curated until its rewrite lands, refusing a second rename or a delete of the row while one is pending, or making the window short enough to name rather than close. The task also decides what an entry edited during the window writes.

It also decides the writer's proof. The carry writers take a `Curator` proof minted by `assertCurator(session)`, and a job step runs as the seeded System account and has none. Either the renaming curator's id is passed into the run, or a proof-less writer is added and guarded as `rotateInvitationToken` is (CLAUDE.md, rule 5). A failed rewrite must be retried or surfaced, never dropped: a lost one leaves entries holding a value no list has, which MB.131's headings and MB.162's write check would then misread.

_Acceptance criteria:_

- The mechanism is recorded in a `design-decisions/` record with the alternatives weighed (a Workflow run started after commit, a cron draining a record, `after()`), and `design-decisions/INDEX.md` lists it
- The trigger is met first: a measured rewrite time near the function's time limit, recorded in the record
- A rename returns without rewriting the compendium in its request, and once the job has run every live compendium entry's own lists, each live variant's `form`, `celestial_bodies` and `zodiac_signs`, and each `ingredient_deities.name` hold the new spelling, asserted by row; no slug moves
- The old spelling of a renamed celestial body or sign is recorded in the rename's own transaction, so a job that fails to start is recovered, asserted by forcing the start to fail
- How the window keeps MB.162's rule is decided and asserted: an entry saved, a second rename and a delete of the row during it each behave as the record says
- The job step writes as the renaming curator or through a proof-less writer guarded as `rotateInvitationToken` is, and the record says which
- A rewrite that fails is retried or surfaced to a keeper, never dropped, asserted by forcing one to fail
- A coven's ingredients and variants are still never rewritten

**MB.291 — Error Pages Are Blank Without JavaScript** · 4h

_Story:_ As a visitor whose browser runs no JavaScript, or a search crawler that runs none, I want a missing or forbidden page to say so in the HTML the server sends, so that I see why the page did not load and how to get back.

A page that answers 404 (not found) or 403 (not authorized) sends the right status code, but its HTML body holds only `<div hidden>`, 58 to 562 bytes, and the heading, message and links back appear only once JavaScript runs. The pages are drawn by `ErrorScreens` and `NotAuthorized` (`src/components/`).

**Deferred, the owner's call.** It sits in the Deferred milestone, and its trigger is a Next release that renders the not-found and forbidden boundaries into the server's HTML. The cause is Next, not this app: a dynamic page or layout that throws `notFound()` or `forbidden()` gets the right status, but the server renders Next's error payload, whose HTML is the empty error shell `<html id="__next_error__">`, and the screen exists only in the script payload. It holds for a bare page that only calls `notFound()`. A `Suspense` boundary around the thrower puts the screen in the HTML but locks the status at 200 (`loading.md`), and the other routes (the global not-found file, a rewrite in the proxy, a route handler) either miss the thrown cases or break rule 1.

It happens locally and on staging, every time. Signed out for the 404, signed in as a non-keeper for the 403. Steps to reproduce:

1. Signed out, request `/compendium/ingredients/no-such-entry` with JavaScript off, or with curl.
2. Read the HTML body the server sends.
3. Signed in as a coven member who is not a keeper, request `/keepers/users` with JavaScript off.

Actual: each body holds only `<div hidden>`, so the page is blank. Expected: the server's HTML carries the 404 page's heading, message and links back, and the styled "not authorized" page for the 403.

_Acceptance criteria:_

- A regression test fails before the fix: with JavaScript off, a missing compendium entry and a keeper page requested by a non-keeper each show their heading in the server's HTML.
- The 404 for a missing compendium entry, the 404 for a coven the viewer is not a member of, and the 403 for a keeper page each carry their heading and links back in the server's HTML.
- The status codes stay 404 and 403, and the 308 redirects are unchanged.
- `claude-docs/loading.md`, or the error-page doc, is corrected wherever it describes how these pages render.
