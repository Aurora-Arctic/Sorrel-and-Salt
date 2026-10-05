## MB — Bugfixes and gap tasks

Work that was not in the original breakdown. `MB.*` exists so a defect or a missing dependency can be scheduled without renumbering an immutable ID. MB.1 through MB.4 are merged; MB.5 through MB.11 were minted by the re-sequencing audit; MB.12 was minted after M2.2/M2.4/M2.5/M0.27 merged with real verification still outstanding. MB.13 was minted during M1.16, when `/create-pr` nearly pushed a feature branch straight at `staging`. MB.14 was minted during M1.17, when its eleventh test file tipped M1.9's per-worker database naming past the set of clones that exist. MB.15 was minted during M1.20, on noticing that the two smoke-check workflows still built their own copy of the testing image that M0.24 had since made shared; collapsing them onto the shared image showed they were a strict subset of `pr-gate.yml`, and the task was re-scoped in place to deleting them. MB.16 through MB.18 were minted together, also during M1.20, when tracing why `build-db-image.yml` runs on a push to `staging` turned up three separate things: a Dependabot base-image bump no prose ever followed (MB.16), a `latest` tag nothing consumes standing in the docs as the push trigger's whole purpose (MB.17), and — on comparing the three image-build workflows side by side — a skip-if-exists check that only `build-db-image.yml` lacks, for a documented reason that holds on the `push` path and fails on the `workflow_call` path every PR actually takes (MB.18). MB.19 was minted on request, after `npm audit` was found to carry a standing moderate advisory (GHSA-67mh-4wv8-2f99) reached only through `drizzle-kit`'s devDependency chain, with no fix available on its stable dist-tag. MB.19 was then **retired without being done** — it is the first task to be retired rather than completed or re-scoped — when re-examining it showed the advisory has no runtime path and that the upgrade traded a frozen stable dependency for a prerelease one; its ID and analysis are kept because task IDs are immutable, and the standing decision now lives in `db.md`. MB.20 was minted in the same pass: tracing what would eventually force that upgrade anyway identified `@pothos/plugin-drizzle`, a `0.x` package that tracks `drizzle-orm`'s version and whose primary capability — resolver-level database access — CLAUDE.md rule 1 forbids. Dropping it before M3 is written is what makes staying on `0.45.2` sustainable. MB.21 was minted on request: there was no way to browse the local database without `psql`, and `drizzle-kit` — pinned at `0.31.10` by MB.20's decision — already ships a `studio` subcommand that needs only wiring, not a new dependency. MB.22 was minted on request, for the same reason as MB.21 but broader: there was no debugging story at all — no Node inspector wired anywhere in the container, no `.vscode/` directory, no way to step into a service, a repository call, or a test, and no way to watch what `withAudit`'s `SET LOCAL app.current_user_id` and RLS actually do to a query beyond reading its output. It is scoped and sized as a single task rather than split across several, as an explicit exception to the normal 1–2h task sizing: the work is uniformly tooling-only (no table, no service, no page), lands as one coherent developer-experience change, and the user asked for it as one PR. MB.23 was minted on request immediately after MB.22 merged: writing an e2e spec by hand means hand-guessing role and label queries against a page nobody has inspected, and `playwright codegen` records a real interaction and emits exactly the query style CLAUDE.md mandates — but MB.22's `playwright-server` service has no display for the recorder to open, a limitation its own design record names. MB.23 gives that service a display (Xvfb, a window manager, and a noVNC tab at `:7900`) rather than standing up a second service, which as a side effect also delivers `page.pause()` and UI mode's locator picker that MB.22 wrote off. MB.24 through MB.26 were minted together, out of the question of whether RLS was worth its cost at all. Checking §8 against the code answered it twice over: the policies M6.4 was about to write would have been **inert**, since the app owns every table they would filter, and fixing only that would have broken **every read**, since the read path opens no transaction for the GUC — two defects that concealed each other ([`design-decisions/mb.24-rls-role-split.md`](../design-decisions/mb.24-rls-role-split.md), "The two findings"). MB.24 is the decision and the doc correction, MB.25 the role split, MB.26 the read-side wrapper. MB.27 was minted in the same pass from a separate defect found while tracing how `DATABASE_URL` resolves per branch: `deploy.yml` calls `vercel pull` without `--git-branch`, so M1.1's branch-scoped `staging` override has never reached a build. MB.29 through MB.34 were minted together, out of a review of the plan against what had actually been built: eleven days and 99 PRs had produced ~2,700 lines of application code and ~23,000 lines of process, and the question was which of that process was paying for itself. Four answers came back and one did not. MB.31 retires the per-task transcript, the scheduled compression pass and `TASKS.csv`, none of which the PR body was not already doing. MB.29 defers RLS, whose remaining cost after MB.24 was not the ~8h of work but a read transaction on every service call for the life of the project. MB.30 asks whether the Better Auth plugin that justified choosing Better Auth can carry M6 and M7, which nobody had checked. MB.32 collapses five copies of one CI workflow, and MB.33 replaces a guard that reads source as text with a lint rule that bans the capability. MB.34 came out of the same pass from a different direction — the six-column audit spread on a join table means a soft-deleted row per chip toggle, forever. **Two proposals from that review were rejected and are recorded in DESIGN.md §14 so they are not re-argued**: replacing GraphQL with server functions, and trunk-based branching. MB.28 was minted while designing the ingredient identity model: `lower(name)` uniqueness cannot express an admin-curated compendium holding several unrelated things under one ambiguous common name, and DESIGN.md §5 needs that fix recorded before M4.1 can treat the `CREATE TABLE` as transcription rather than design. MB.35 and MB.36 were minted together during M4.2, on the decision that an admin may add a category group — which §6 had modelled as a closed set of eight and M4.2 had therefore built as a pgEnum. MB.35 is the doc-and-scoping half and follows MB.28's shape exactly; MB.36 is the code half, since a group created at runtime cannot have a build-time Sass token. The sequence is worth keeping: M4.2 was **built, complete and green, and then rebuilt**, because the design doc it faithfully transcribed described a closed set. That is the cost MB.28 exists to prevent, paid once here for want of asking whether the eight were a starting point or a boundary — and it is the reason the doc task comes first rather than after, even when the table is already written. MB.37 was minted on a report that the destructive-DDL check fires too much: it fired on every local run and on no PR at all, and the first symptom hid the second, since a check that is always red locally is one nobody looks at in CI either. The CI half was MB.32's — it deleted the calling job without folding the check into the matrix it was collapsing everything else onto, and left every other surface (the path filters, the workflow file, `ci.md`) describing a check that ran on nothing. **The lesson is the one the sweep-task rule already states**: a check deleted from a file five other checks share is noticed; a check that is merely no longer called is not. MB.38 came out of the same reading, from the other end — `check-workshop-theme-default.ts` says in its own header that it is a script rather than a test only because Vitest had not landed yet, and it has since M1.7. MB.39 was minted on a question about step order — whether a leg's should-run flag could be resolved before its container is pulled. It cannot, because `Initialize containers` is job initialization; the only decision point earlier than the pull is the job-level `if:` every workflow here refuses. Tracing why turned up the actual finding: **the rule the entire filtering design is built on was copied verbatim from `resume-2026` at M0.16 and has never been tested here** — the repo has no ruleset requiring a status check, so the symptom it warns about could not have occurred, while `audit / audit` carried a job-level `if:` for eight days and `deploy.yml` carries three today. It is the MB.24 shape exactly: a constraint that everything downstream was arranged around, load-bearing enough that nobody re-derived it, and wrong or right for reasons no one had checked. MB.40 was minted on request during M4.3a, from the question of what it would take for a spell to call for something the workspace will never stock. The answer was cheap only because nothing queries `spell_ingredients` until Wave 13: reshaping it now is a contract migration against zero rows, adopted by each Wave 13 task in its own PR, where the same change as a fast-follow would have been a retrofit across every consumer and a breaking nullability change in the SDL. It is the first contract migration in the repo, and so the first PR to carry rule 10's acknowledgement line. MB.54 was minted during M2.6, which re-scoped the OAuth provider roster to Google, Discord, Facebook and Microsoft: Discord and Facebook can both return a profile with no email, which M2.6 only turns into a readable error rather than a recoverable one. MB.57 was minted during M2.7, which first protected `/` as DESIGN.md §9's post-sign-in landing and was then directed to leave it public as the site's general entry page; what that page says, and where the post-sign-in landing now lives, is MB.57's to decide. MB.58 through MB.63 are M2.9's follow-ups. MB.58 and MB.59 are a table task and a behaviour task, split under CLAUDE.md's table-then-behaviour rule. MB.60 fixes the admin bootstrap, which promoted an unverified sign-up and ran only at account creation. MB.61 scopes first-party email verification, which lifts the provider restriction MB.60 has to impose, moves invitations to email, and re-scopes MB.54 to follow it. MB.62 and MB.63 are the pause switch the primary admin flips against a rogue admin, a table and a behaviour task. Stories 58–61 were added for them: 58 and 59 for the email flow, 60 and 61 for granting admin and the ledger, in a §10 section of their own. MB.64 was minted on request when the repo root had reached fifty entries, eight of them generated output sitting beside the source; it gathers Playwright under `tests/` and every report under one ignored directory, and is housekeeping with no behaviour change. MB.65 through MB.70 are MB.61's follow-ups ([`design-decisions/mb.61-email-verification-and-delivery.md`](../design-decisions/mb.61-email-verification-and-delivery.md)): the mail transport, Better Auth's verification turned on and session-bound, provisional accounts that expire, promotion at verification, and the admin invitation's table and behaviour, the last two split under the table-then-behaviour rule. MB.61 also rewrote M7.3 through M7.5 in place for delivery by mail and re-scoped MB.54 from an interstitial to a page, and found that Better Auth's verification token is a signed JWT that is never stored, so its own "stored hashed" premise had to go. MB.71 was minted during MB.66, on the question of what it would take for an admin who signed up through Discord to sign in through Microsoft now that the site verifies addresses itself. The answer is that verification is the wrong side of the equation: Better Auth links a sign-in to an existing row only when the _provider_ vouches for the address, and Microsoft is pinned never to, against nOAuth (MB.60). What works is an explicit link from a signed-in session, which Better Auth already ships, after which the provider signs in by account id and never by address ([`design-decisions/mb.71-plan.md`](../design-decisions/mb.71-plan.md)). MB.73 was minted on request after M3.1 merged, from asking how to test queries by hand through a Postman-style client given OAuth-only sign-in. The only credential the API accepts is Better Auth's `httpOnly` session cookie, so every desktop client is paste-from-DevTools-and-expire; the one client that gets the cookie for free is a page the app serves same-origin, which Yoga's GraphiQL already was. Swapping it for Altair is the shape of one branch in the route plus a doc. MB.74 was minted on request, to review Better Auth's plugin roster against an OAuth-only, invite-gated site; it minted MB.75 through MB.78. MB.79 was minted on the owner's question of whether Better Auth's Stripe plugin could carry subscriptions for workspace owners. Read against the five things wanted, it carries the plumbing and per-seat pricing at checkout and has MB.30's two structural costs, so the answer is recorded in DESIGN.md §13 for v2 rather than built. MB.80 was minted on the owner's question of what it would take for the compendium list and every compendium entry to be public and fully indexable by search engines. Nothing compendium-shaped existed yet, so the answer was a design change rather than an ungating: the compendium becomes the site's public face while accounts, workspaces and everything in them stay gated. It amended M5.2, M5.5, M8.5, M8.6, M8.18 and M8.19 in place and minted MB.81 through MB.85 — the slug columns and the retirements table, the slug rule that follows a rename with a reserved 308 window, the public frame with its proxy entries and signed-in island, the robots-sitemap-metadata surface, and story 63 ([`design-decisions/mb.80-public-compendium.md`](../design-decisions/mb.80-public-compendium.md)). MB.86 was minted on the owner's question of how the structure would have to change for a later move to separate services to be a transport change rather than a rewrite. The rules already gave most of a modular monolith; the layout did not, since `src/db/schema`, `src/services`, `src/graphql/schema` and `src/graphql/loaders` each mixed every domain. It restructures `src/` into five modules with a guarded boundary, and records why the `ingredients` table stays one table ([`design-decisions/mb.86-modular-monolith.md`](../design-decisions/mb.86-modular-monolith.md)). MB.87 was minted on request once M3.10 had grown `src/db/repository.ts` past five hundred lines: it splits the file into a `src/db/repository/` folder, one file per concern, and makes the select builder folder-private rather than file-private, with the deep-import ban that trade needs ([`design-decisions/mb.87-plan.md`](../design-decisions/mb.87-plan.md)). MB.88 was minted on request during MB.71, once `/account` held the sign-in methods and the address lived on a page of its own: it makes `/account` the one account page, with the name, the address and the sign-in methods together, and leaves `/account/email` to the flows that are not a visit to the account. MB.90 was minted because a new engineer had no starting point: `README.md`'s "Local setup" had gone stale and the subsystem summaries had no reading order, so it adds a Day 1 guide with one, and the root `.env.example` and `npm run setup` that shorten its first hour. MB.91 through MB.95 were minted during M4.5, on the owner's question of what it would take to put the hardcoded lists in the database: M4.5 had left the planet and zodiac suggestions in a TypeScript constant, the shape `form` had before MB.35, so MB.91 records them as two admin-curated vocabularies in `form`'s pattern, and MB.92 through MB.95 are the table, the seed, the suggestions and the admin page ([`design-decisions/mb.91-plan.md`](../design-decisions/mb.91-plan.md)). `nomenclature` and `element` stay enums. MB.96 through MB.99 were minted on the report that the CI Vitest job was approaching three minutes: the suite runs in 14s locally and 110s in CI, so the answer was the runner and the per-file overhead rather than the tests, and sizing the runner budget turned up 130 gate runs created by one bulk edit of closed PR bodies and a layer cache at its 10 GB cap holding the same blobs five times over ([`design-decisions/mb.96-plan.md`](../design-decisions/mb.96-plan.md)). MB.104 was minted during M8.5, on the owner's question of what ranking the compendium search by its score would take, once M8.5 had shipped it alphabetical. MB.105 was minted during MB.104, on the owner's question of what page numbers on the compendium would take; the same question settled that the search box's typeahead is the first page of the ranked search rather than a query of its own, which M8.10 now says ([`design-decisions/mb.105-plan.md`](../design-decisions/mb.105-plan.md)). MB.110 was minted during M5.3, on the owner's review that a layer should leave a spell only by a user's choice, and then recoverably ([`design-decisions/m5.3-spells-keep-deleted-ingredients.md`](../design-decisions/m5.3-spells-keep-deleted-ingredients.md)). MB.111 was minted during M5.4, when trying `/admin` as a new account showed that confirming the address lands on `/coven` rather than the page the account was headed for. MB.112 was minted during M5.4 too, when `admin.spec.ts` reseeding beside `account.spec.ts` showed that Playwright's one shared database made every reseed a race between workers, which CI had only avoided by the order its files happened to fall in. MB.113 through MB.124 were minted during M5.4 as well, on the owner's decisions: MB.113 lands an admin on `/admin` after a sign-in with no return path, and MB.114 through MB.124 are the design reviews the standing rule that the design will change had left without a task — the foundations first, then each section once it is built, the nav once MB.7 builds it, and the sign-in methods on their own. MB.125 through MB.132 were minted during M5.9, on the owner's review of the entry form: an ingredient carried categories that nothing wrote, and the owner chose a curated list for deities over the values already in use. MB.133 came out of the same review: nothing bounded how long a list entry could be drawn. So did MB.134 through MB.141: the owner made planet, zodiac sign and colour lists, and let a substitute link an existing ingredient as well as name one.

| ID     | Task                                                                                           | Status  | Needed by              |
| ------ | ---------------------------------------------------------------------------------------------- | ------- | ---------------------- |
| MB.1   | Fix prefers-reduced-motion facet swap in ThemeToggle                                           | merged  | —                      |
| MB.2   | Fix sun facet swinging in on first paint in light mode                                         | merged  | —                      |
| MB.3   | Fix Prettier formatting in `m1.1-neon-branch-strategy.md`                                      | merged  | —                      |
| MB.4   | Stop destructive-ddl scanning non-migration changed files                                      | merged  | —                      |
| MB.5   | Restore `users` FKs on `auditColumns`                                                          | merged  | every table            |
| MB.6   | Spell recipe view page                                                                         | Wave 13 | M10.22                 |
| MB.7   | Application nav shell                                                                          | Wave 12 | M8.16, M8.17           |
| MB.8   | Zod schema for spells                                                                          | Wave 13 | M10.10                 |
| MB.9   | `ingredientsById` DataLoader                                                                   | Wave 11 | M8.5, M9.4             |
| MB.10  | `usersById` display-name DataLoader                                                            | Wave 9  | M6.18                  |
| MB.11  | GraphQL field exposing the fuzzy duplicate service                                             | Wave 8  | M5.10                  |
| MB.12  | Finish the secrets matrix and verify real OAuth sign-in                                        | Wave 6  | M2.3                   |
| MB.13  | Stop branch skills setting the base branch as upstream                                         | Wave 2  | —                      |
| MB.14  | Key the per-worker test database off `VITEST_POOL_ID`                                          | Wave 2  | —                      |
| MB.15  | Delete the redundant smoke-check workflows                                                     | Wave 2  | —                      |
| MB.16  | Correct the Postgres version across the live docs                                              | Wave 2  | —                      |
| MB.17  | Drop the dead `latest` tag from `build-db-image`                                               | Wave 2  | MB.18                  |
| MB.18  | Give `build-db-image` the skip-if-exists check                                                 | Wave 2  | —                      |
| MB.19  | ~~Move `drizzle-kit`/`drizzle-orm` off the `@esbuild-kit` advisory~~ — **retired, not done**   | —       | —                      |
| MB.20  | Drop `@pothos/plugin-drizzle` from the GraphQL stack                                           | Wave 2  | —                      |
| MB.21  | Drizzle Studio for local development                                                           | Wave 2  | —                      |
| MB.22  | Set up modern debugging tooling                                                                | Wave 2  | —                      |
| MB.23  | Playwright codegen for local development                                                       | Wave 2  | MB.22                  |
| MB.24  | Decide the RLS role split and read-path identity — **superseded by MB.29**                     | merged  | —                      |
| MB.25  | ~~Split the database roles so RLS applies to the app~~ — **retired, not done**                 | —       | —                      |
| MB.26  | ~~`withViewer`, the read-side identity wrapper~~ — **retired, not done**                       | —       | —                      |
| MB.27  | `vercel pull` ignores branch-scoped variables                                                  | Wave 4  | —                      |
| MB.28  | Record the ingredient identity model in the design docs                                        | merged  | M4.1                   |
| MB.29  | Defer RLS to the public launch; make the second layer a `Membership` proof                     | Wave 3  | M6.3, M10.3            |
| MB.30  | Spike Better Auth's organization plugin for workspaces and invitations                         | Wave 3  | M4.1, M6.7             |
| MB.31  | Retire transcripts, the MW compression passes and `TASKS.csv`                                  | Wave 3  | —                      |
| MB.32  | Collapse the five check workflows onto one matrix                                              | Wave 3  | —                      |
| MB.33  | Ban runtime `drizzle-orm` outside the repository by lint                                       | Wave 3  | —                      |
| MB.34  | Hard-delete rows in the three join tables                                                      | Wave 3  | M4.4                   |
| MB.35  | Make category and form groups admin-curated data                                               | Wave 3  | M4.2a, M4.4            |
| MB.36  | Chip colour from the row, not the token                                                        | Wave 3  | MB.35                  |
| MB.37  | Restore the destructive-DDL gate as a checks leg, scope the local run to the branch            | Wave 3  | —                      |
| MB.38  | Move the two workshop guards into Vitest                                                       | Wave 3  | MB.37                  |
| MB.39  | Settle whether a job-level `if:` really renames a check                                        | Wave 14 | —                      |
| MB.40  | Custom one-off spell ingredients (schema)                                                      | Wave 4  | M1.23, M10.5           |
| MB.41  | Move Vitest tests into `tests/`                                                                | Wave 4  | M1.23                  |
| MB.42  | CI container jobs run against files the repo has deleted                                       | Wave 4  | —                      |
| MB.43  | Map service errors to GraphQL errors with field-level detail                                   | Wave 7  | M5.9, M8.8             |
| MB.44  | ~~Release to `main`, then drop the coverage excludes MB.42 made dead~~ — **retired, not done** | —       | —                      |
| MB.45  | `vercel pull --git-branch` is rejected on the production target                                | Wave 5  | MB.27                  |
| MB.46  | CI cannot see what `vercel pull` actually returned                                             | Wave 5  | MB.45                  |
| MB.47  | CI cannot read the Sensitive Vercel variables it needs                                         | Wave 5  | MB.46                  |
| MB.48  | A destructive-DDL acknowledgement does not survive the release PR                              | Wave 5  | MB.37                  |
| MB.49  | `drizzle-kit` fails silently, so a bad `DATABASE_URL` has no cause                             | Wave 5  | MB.47                  |
| MB.50  | Make code comments concise; move the arguments into `claude-docs/`                             | Wave 5  | —                      |
| MB.51  | Deduplicate the db-test harness, seed logic and image-build workflows                          | Wave 5  | —                      |
| MB.52  | Admin user list page                                                                           | Wave 8  | M5.8, MB.53            |
| MB.53  | Impersonate a user outside production                                                          | Wave 8  | —                      |
| MB.56  | Rebuild the Asana board mechanism for the free Personal plan                                   | Wave 6  | —                      |
| MB.54  | Set the account's email: prefilled from the provider, editable, verified before it counts      | Wave 7  | M7.5                   |
| MB.55  | Scan both provider availability states in the e2e accessibility run                            | Wave 6  | M2.6                   |
| MB.57  | Build the public entry page at `/`                                                             | Wave 6  | M2.7                   |
| MB.58  | The admin role ledger (schema)                                                                 | Wave 8  | MB.59                  |
| MB.59  | Grant and revoke admin                                                                         | Wave 8  | —                      |
| MB.60  | Promote the primary admin at sign-in, from Google or Discord only                              | Wave 6  | MB.12, MB.59           |
| MB.61  | Scope first-party email verification and email invitations                                     | Wave 6  | MB.65, M7.3            |
| MB.62  | `site_settings` schema, with the admin-role-changes pause (schema)                             | Wave 8  | MB.63                  |
| MB.63  | Pause admin role changes                                                                       | Wave 8  | MB.70                  |
| MB.64  | Reduce root-folder clutter                                                                     | Wave 6  | —                      |
| MB.65  | Mail transport: Resend, the Mailtrap Sandbox and Mailpit over HTTP                             | Wave 6  | MB.66, M7.3            |
| MB.66  | Turn on Better Auth email verification, audited and session-bound                              | Wave 6  | MB.67, MB.68           |
| MB.67  | Provisional accounts: expire unverified rows and sweep them at the next callback               | Wave 6  | MB.54                  |
| MB.68  | Promote the primary admin at first-party verification                                          | Wave 6  | MB.54                  |
| MB.69  | `admin_invitations` schema                                                                     | Wave 8  | MB.70                  |
| MB.70  | Invite an admin by email                                                                       | Wave 8  | —                      |
| MB.71  | Link a second sign-in method from the account page                                             | Wave 7  | MB.77, MB.88           |
| MB.72  | Scope the mail's light-mode rules beneath the page cell                                        | Wave 6  | —                      |
| MB.73  | Serve Altair at `/api/graphql` in local development                                            | Wave 7  | —                      |
| MB.74  | Review Better Auth's plugin roster: what lands before launch, what waits                       | Wave 7  | MB.75                  |
| MB.75  | `rate_limits` schema for Better Auth's rate limiter                                            | Wave 7  | MB.76                  |
| MB.76  | Pin Better Auth's rate limiter, OAuth token encryption and session lifetimes                   | Wave 7  | —                      |
| MB.77  | Mark the last-used provider on the sign-in page                                                | Wave 7  | —                      |
| MB.78  | OAuth proxy, so a hotfix preview can complete a real sign-in                                   | Wave 8  | MB.53                  |
| MB.79  | Record subscription billing as a v2 feature and the Stripe plugin's fit                        | Wave 7  | —                      |
| MB.80  | Re-scope the compendium as public and search-indexable                                         | Wave 7  | —                      |
| MB.81  | `ingredients.slug`, the pending-slug columns and the `retired_ingredient_slugs` table          | Wave 8  | MB.82                  |
| MB.82  | Ingredient slugs: set on create, follow a rename, retire with a 308, hand over once confirmed  | Wave 8  | M5.5, M8.19, MB.84     |
| MB.83  | Public compendium chrome, proxy entries and the signed-in island                               | Wave 12 | M8.18, M8.19           |
| MB.84  | robots, sitemap, page metadata and noindex off production                                      | Wave 12 | —                      |
| MB.85  | Story 63: a visitor reads the compendium without signing in                                    | Wave 12 | —                      |
| MB.86  | Restructure `src/` into domain modules with a guarded boundary                                 | Wave 7  | —                      |
| MB.87  | Split `src/db/repository.ts` into a `src/db/repository/` folder                                | Wave 7  | —                      |
| MB.88  | One account page: name, email and sign-in methods                                              | Wave 8  | —                      |
| MB.89  | Move task tracking from Asana to GitHub Issues and Projects                                    | Wave 7  | —                      |
| MB.90  | Day 1 new developer guide, root `.env.example` and `npm run setup`                             | Wave 14 | —                      |
| MB.91  | Make the planet and zodiac suggestion lists admin-curated vocabularies                         | Wave 8  | MB.92                  |
| MB.92  | `planets` and `zodiac_signs` schema                                                            | Wave 8  | MB.93                  |
| MB.93  | Seed the planet and zodiac vocabularies                                                        | Wave 8  | MB.94                  |
| MB.94  | Scoped suggestion fields for planet and zodiac                                                 | Wave 8  | M5.10a, MB.95          |
| MB.95  | Admin planet and zodiac CRUD                                                                   | Wave 8  | M5.7                   |
| MB.96  | Run the vitest job on Blacksmith                                                               | Wave 8  | —                      |
| MB.97  | A node Vitest project for the unit files that need no DOM                                      | Wave 8  | —                      |
| MB.98  | Gate runs stop when their PR is closed                                                         | Wave 8  | MB.96                  |
| MB.99  | Docker layer cache to the registry                                                             | Wave 8  | —                      |
| MB.100 | Raw SQL only where a rule or the planner needs it                                              | Wave 8  | M8.2, M5.1             |
| MB.101 | One inserter for an ingredient and its children in tests                                       | Wave 8  | M8.2                   |
| MB.102 | Board calls that defer to the Project's workflows and fit the rate limit                       | Wave 8  | —                      |
| MB.103 | Reorder the Project's items into execution order                                               | Wave 8  | —                      |
| MB.104 | Rank the compendium search by word similarity                                                  | Wave 8  | M8.10, M8.14           |
| MB.105 | Page numbers on the compendium connection                                                      | Wave 8  | M8.6, M8.18            |
| MB.106 | Mark compendium entries New or Updated for 30 days                                             | Wave 12 | —                      |
| MB.107 | Drop the pending-slug columns MB.82 stopped declaring                                          | Wave 8  | —                      |
| MB.108 | Move type declarations into type-only files                                                    | Wave 8  | —                      |
| MB.109 | Move the tests' type declarations into type-only files                                         | Wave 8  | —                      |
| MB.110 | Make spell layers soft-deletable                                                               | Wave 8  | M10.10                 |
| MB.111 | Carry the return path through the verification link                                            | Wave 8  | —                      |
| MB.112 | Give each Playwright worker its own server and database                                        | Wave 8  | —                      |
| MB.113 | Land an admin on the admin area after a sign-in with no return path                            | Wave 8  | —                      |
| MB.114 | Design review: foundations                                                                     | Wave 8  | —                      |
| MB.115 | Design review: the admin area                                                                  | Wave 8  | —                      |
| MB.116 | Design review: the sign-in and account pages                                                   | Wave 8  | —                      |
| MB.117 | Design review: sign-in methods                                                                 | Wave 8  | —                      |
| MB.118 | Design review: the site's mail                                                                 | Wave 10 | —                      |
| MB.119 | Design review: the coven and invitations                                                       | Wave 10 | —                      |
| MB.120 | Design review: the public compendium and shared ingredient components                          | Wave 12 | —                      |
| MB.121 | Design review: the workspace ingredients page                                                  | Wave 12 | —                      |
| MB.122 | Design review: the navigation                                                                  | Wave 12 | —                      |
| MB.123 | Design review: the grimoire                                                                    | Wave 13 | —                      |
| MB.124 | Design review: error, loading and empty states, and the whole site                             | Wave 15 | —                      |
| MB.125 | Categories on the ingredient writes                                                            | Wave 8  | MB.126, M5.5           |
| MB.126 | Grouped category picker in IngredientForm                                                      | Wave 8  | M5.5, M8.11            |
| MB.127 | Make deities an admin-curated vocabulary                                                       | Wave 8  | MB.128                 |
| MB.128 | `deities` schema                                                                               | Wave 8  | MB.129                 |
| MB.129 | Seed the deity vocabulary                                                                      | Wave 8  | MB.130                 |
| MB.130 | Scoped suggestion field for deities                                                            | Wave 8  | MB.131, MB.132         |
| MB.131 | Deity, planet, zodiac and substitute lookups in IngredientForm                                 | Wave 8  | —                      |
| MB.132 | Admin deity CRUD                                                                               | Wave 8  | M5.7                   |
| MB.133 | Long list entries in IngredientForm                                                            | Wave 8  | —                      |
| MB.134 | Make planet, zodiac sign and colour lists                                                      | Wave 8  | MB.135                 |
| MB.135 | List columns for planet, zodiac sign and colour                                                | Wave 8  | MB.136                 |
| MB.136 | Read and write planet, zodiac sign and colour as lists                                         | Wave 8  | MB.130, MB.131, MB.137 |
| MB.137 | Drop the single planet, zodiac and colour columns                                              | Wave 8  | —                      |
| MB.138 | Let a substitute link an existing ingredient                                                   | Wave 8  | MB.139, MB.131         |
| MB.139 | `ingredient_substitutes` table, filled from the list                                           | Wave 8  | MB.140                 |
| MB.140 | Read and write substitutes as links or text                                                    | Wave 8  | MB.131, MB.141, M8.19  |
| MB.141 | Drop `ingredients.substitutes`                                                                 | Wave 8  | —                      |
| MB.142 | Cut the per-turn context: plugin, reporters, stale MCP                                         | Wave 8  | —                      |
| MB.143 | Split TASKS.md by milestone and wave                                                           | Wave 8  | MB.144, MB.147         |
| MB.144 | Slim CLAUDE.md into path-scoped rules                                                          | Wave 8  | MB.147                 |
| MB.145 | Split db.md by section                                                                         | Wave 8  | MB.147                 |
| MB.146 | Split auth.md, ci.md, testing.md and graphql.md by section                                     | Wave 8  | MB.147                 |
| MB.147 | One home per fact across the docs                                                              | Wave 8  | —                      |

**MB.1 — Fix prefers-reduced-motion facet swap in ThemeToggle** · 2h

Merged before this file carried per-task hours; sized after the fact from the merged diff. The reduced-motion swap of the toggle's facets, and the workshop story that simulates the preference.

**MB.2 — Fix sun facet swinging in on first paint in light mode** · 1h

Merged before this file carried per-task hours; sized after the fact from the merged diff. The sun facet's pre-paint state settled in CSS rather than an effect.

**MB.3 — Fix Prettier formatting in `m1.1-neon-branch-strategy.md`** · 0.5h

Merged before this file carried per-task hours; sized after the fact from the merged diff. A one-line formatting fix.

**MB.4 — Stop destructive-ddl scanning non-migration changed files** · 1h

Merged before this file carried per-task hours; sized after the fact from the merged diff. The scan narrowed to the migration files a branch adds.

**MB.5 — Restore `users` foreign keys on `auditColumns`** · 2h

_Story:_ As a developer, I want the audit columns to actually reference `users` so that an audit id cannot point at a user who never existed.

M1.15 shipped `auditColumns` **without** the `.references(() => users.id)` FKs that §5 mandates, because `users` did not exist yet. It lands in Wave 1, between M2.3 and every other table: under the original order this would have needed roughly ten FK-adding migrations and backfills, and under the wave order it is a one-file edit whose FKs every Wave 3 table then generates natively.

Three things make this harder than it looks:

- **Circular module init.** `audit.ts` imports `users`; `schema/users.ts` spreads `auditColumns`. Drizzle's `() => users.id` thunk is lazy so this works at runtime, but TypeScript needs the explicit annotation `.references((): AnyPgColumn => users.id)` or it errors with "circularly references itself". If the ESM cycle proves fragile, the fallback is an `auditForeignKeys(t)` helper called from each table's extra-config argument — same DDL, no cycle.
- **`users` self-references.** `users.created_by → users.id` needs the same annotation.
- **The root row.** The first user has no pre-existing creator. Postgres checks FKs at statement end, so `INSERT INTO users (id, created_by, updated_by) VALUES ($1,$1,$1)` is self-satisfying.

_Acceptance criteria:_

- All three `*_by` columns reference `users.id`
- `users` self-reference compiles without a circularity error
- The bootstrap user inserts successfully as a single self-satisfying statement
- The bootstrap UUID is fixed and shared with M1.21, not generated twice
- The stale comment at `src/db/audit.ts:3-5` is corrected — it cites M2.1, and `users` lands in M2.3
- No retrofit migration is needed for any table created after this task

**MB.6 — Spell recipe view page** · 2h

_Story 56 — As a workspace member, I want to read a saved spell on its own page, so that I can follow it without opening the builder._

`/coven/[slug]/grimoire/[id]`, added to §9's route table by this audit. M10.22 and CLAUDE.md both reference "the spell recipe view" and story 56 is about _reading_ a spell, but §9 had no spell detail route — `/grimoire/new` is the builder, and you cannot print a saved spell from it. This is the page M10.22 attaches print styles to. Two ingredients sharing a display label render with their formal name alongside it, since the page has no hover affordance to disambiguate them the way a card's tooltip can.

_Acceptance criteria:_

- Route resolves a spell by id within the workspace
- Visibility is enforced in SQL: a private spell is reachable only by its author
- A non-member receives 404, consistent with the rest of `/coven/[slug]`
- Ingredients render in layer order with quantities
- Two ingredients sharing a label are disambiguated by their formal name, not by hover
- A custom, one-off ingredient (MB.40) renders its own name and form in layer order with the rest, marked as one-off, and links to no ingredient page
- The page is the only view M10.22 styles for print

**MB.7 — Application nav shell** · 2h

_Story:_ As a user, I want one persistent navigation frame so that every page is reachable from every other page.

`AppShell`, added to §9's Components list by this audit. M8.16 and M8.17 require the add and edit modals to be "reachable from the main nav on any page", but no task and no route built an app-wide nav — `WorkspaceSwitcher` (M6.9) and the coven layout (M6.10) do not cover it, and both compendium and ingredient detail sit outside `/coven/` entirely. `/admin` is the other layout it wraps: M5.4's admin layout nests inside it as the coven layout does, and `AdminNav` becomes the admin area's section nav beneath the shell's own.

_Acceptance criteria:_

- Wraps every signed-in page, inside and outside `/coven/`
- Carries the primary nav, the `WorkspaceSwitcher` and the global add/edit affordances
- The coven layout nests inside it and adds only workspace-scoped chrome
- The admin layout nests inside it too and adds only `AdminNav`, the admin area's section nav
- Nav survives navigation between workspace-scoped and global pages
- Admin entry appears only for admins
- axe clean, keyboard navigable

**MB.8 — Zod schema for spells** · 1h

_Story:_ As a developer, I want one validation schema for spells so that the builder and the mutation cannot disagree about what is valid.

M4.5 covers ingredient and category only. M10.10 needs the spell equivalent.

_Acceptance criteria:_

- One schema shared by client and server
- Covers title, visibility, layers, quantities and units
- A layer is `{ ingredientId }` or `{ name, form? }` and never both or neither (MB.40); `form` beside `ingredientId` is rejected, and a blank `name` or `form` is rejected — the table's four CHECKs, mirrored so the CHECK is never what a user sees
- Unit validation imports M9.2's shared unit-to-dimension module rather than keeping its own list
- Rejects a visibility value outside `private` and `workspace`

**MB.9 — `ingredientsById` DataLoader** · 1h

_Story:_ As an operator, I want ingredient resolution batched so that a list query costs one round trip rather than one per row.

M8.5 and M9.4 both assume batched ingredient resolution; no task built the loader. Constructed per request, never at module level.

_Acceptance criteria:_

- One query per batch, asserted by query count
- Constructed per request
- Soft-deleted rows are not returned
- A missing id resolves to null rather than throwing

**MB.10 — `usersById` display-name DataLoader** · 1h

_Story:_ As a workspace member, I want the last-edited-by name resolved efficiently so that a long list does not issue one query per row.

M6.18 requires the display name to resolve "without an N+1" and no loader existed.

_Acceptance criteria:_

- One query per batch, asserted by query count
- Constructed per request
- Returns display name only, never the email address
- A deleted user still resolves to a stable display value

**MB.11 — GraphQL field exposing the fuzzy duplicate service** · 1h

_Story 16 — As a workspace member, I want the duplicate check available from the client, so that the form can warn me as I type._

M4.7 builds the service; M5.10's debounced client lookup needs it exposed through GraphQL. Without this field M5.10 has nothing to call.

**Decided while building:** the field is `possibleDuplicates(workspaceId, name, first, after)`, a connection of `Ingredient`. M4.7's finder returned a fixed first 25 rows, so to page it through the helper it becomes a keyset page keyed `[-score, name]`. A keyset read gains `similarityMatch`, which sets the same 0.4 constant a similarity read does, so there is still one threshold. Each edge carries its `score`, 0.4 to 1, so M5.10 can tell an exact match from a near miss (claude-docs/graphql.md, "`possibleDuplicates`"). Riding along: the text argument of `compendium` and the four autocompletes, `search` on one and `term` on the rest, is renamed `query` on all five and through the code beneath them, while this field keeps `name` (claude-docs/graphql.md, "The schema").

_Acceptance criteria:_

- Field returns compendium and current-workspace matches only
- Threshold matches M4.7's, not a second constant
- Bounded by the M3.6 pagination helper
- Authorization is enforced in the service, not the resolver

**MB.12 — Finish the secrets matrix and verify real OAuth sign-in** · 1h

_Story:_ As a developer, I want the remaining M0.27 secrets set and a real sign-in confirmed, so that the auth work merged in M2.2/M2.4/M2.5/M2.6 is actually exercised end-to-end, not just verified against live provider endpoints without a completed login.

PR #71 (M2.2/M2.4/M2.5/M0.27, merged 2026-09-11) landed real Google/GitHub OAuth credentials and most of the secrets matrix, verified by fetching the live `accounts.google.com`/`github.com` authorization endpoints directly — real evidence the client id/secret pairs and `redirect_uri` are correct, but no one has completed an actual interactive sign-in through a browser and consent screen. Four rows of `claude-docs/secrets.md` are also still unset. M2.6 later re-scoped the roster to Google, Discord, Facebook and Microsoft — the GitHub credentials this paragraph describes are gone, and Discord/Facebook/Microsoft's are still unregistered.

Minted against Wave 1 and moved to **Wave 6** by MW.1: there is no page to sign in on until M2.6 builds one, so the browser criteria below cannot be met any earlier. Everything it verifies (M2.2/M2.3/M2.4/M2.5) is already merged, so it is a late verification of earlier work, not a blocker for it.

**GitHub row retired by M2.6's re-scoping.** The roster is now Google, Discord, Facebook and Microsoft; the criterion below is Google-only, and a browser round trip through the three new providers is added rather than assumed — none of their applications are registered yet (`claude-docs/secrets.md`'s walkthrough), so this task also covers registering them.

_Acceptance criteria:_

- A real browser completes Google sign-in on `http://localhost:8000`
- A real browser completes Discord, Facebook and Microsoft sign-in on `http://localhost:8000`, once each is registered
- Same for staging, once a staging deploy carries this code
- `VERCEL_SCOPE`, `NEON_API_KEY`, `NEON_PROJECT_ID` set as GitHub Actions secrets
- Admin bootstrap email set as a Vercel env var (Production + Preview) — unblocks M2.3
- `claude-docs/secrets.md` updated to reflect every row set

**MB.13 — Stop branch skills setting the base branch as upstream** · 1h

_Story:_ As a developer, I want a new branch to have no upstream, so that a bare `git push` cannot push my work straight at `staging` or `main`.

`/create-feature`'s `git checkout -b feature/<slug> origin/staging` set the new branch's upstream to `origin/staging`, so a later bare `git push` targeted the protected base branch rather than the feature branch. `/create-hotfix` had the same shape against `origin/main`, which is worse. Caught during M1.16, where the push was redirected by hand.

Fixed by adding `--no-track` to the `checkout -b` in all four branch skills — note the flag must precede `-b`, since `git checkout -b --no-track <name>` parses `--no-track` as the branch name — and by making `/create-pr` push the source branch by name instead of trusting the configured upstream. `/create-release` and `/create-main-sync` were less exposed, since each pushes with `-u` immediately, but take the same flag for consistency.

_Acceptance criteria:_

- A branch made by /create-feature or /create-hotfix has no upstream until it is first pushed
- /create-pr pushes the source branch by name, never relying on the configured upstream
- The four branch skills and /create-pr agree on the pattern
- Protected-branch push is impossible by accident, not merely unlikely

**MB.14 — Key the per-worker test database off `VITEST_POOL_ID`** · 1h

_Story:_ As a developer, I want each `db`-project worker to connect to a database `globalSetup` actually created, so that a green suite does not depend on how many test files the repo happens to have.

`src/test/db-global-setup.ts` clones `sorrel_test_1` through `sorrel_test_<maxWorkers>`, but `src/test/db-setup.ts` pointed the worker at `sorrel_test_${VITEST_WORKER_ID}`. Those index different things: `VITEST_POOL_ID` is the pool slot, which Vitest documents as "between 1-`maxWorkers`", while `VITEST_WORKER_ID` is a counter incremented once per test file across the whole run — both projects — and so passes `maxWorkers` as soon as there are more test files than workers. Latent since M1.9 and a coin flip on file count and sort order; M1.17's eleventh test file made it land, and three tests failed on PR #78 with `database "sorrel_test_4" does not exist` on the three-worker CI runner.

Both halves now share `src/test/worker-database.ts`, which owns the name and throws by name when `DATABASE_URL` or `VITEST_POOL_ID` is missing rather than connecting to `sorrel_test_undefined`. `globalSetup` `provide`s the list of databases it cloned and `test-database-isolation.test.ts` asserts membership of it — the regression this needed, since asserting the name's shape is what passed while the two halves disagreed.

_Acceptance criteria:_

- The database a `db`-project worker connects to is always one `globalSetup` created, whatever the test file count
- A missing `DATABASE_URL` or `VITEST_POOL_ID` fails as a harness error, not as a Postgres error
- The isolation spec asserts membership of the created set, not a name it recomputed
- Every doc naming `VITEST_WORKER_ID` for this purpose is corrected
- M1.9's decision — a real database per worker, never a rolled-back transaction — still stands

**MB.15 — Delete the redundant smoke-check workflows** · 1h

_Story:_ As a developer, I want one push to fire one CI run, so that no status-check context is published by two workflows at once.

Re-scoped mid-task, which is why the title no longer matches the branch name. It began as "collapse the smoke-check workflows onto `build-image.yml`": `lint-format-typecheck-check.yml` and `build-audit-check.yml` each defined their own inline `build-image` job, tagged `testing:smoke-<run id>`, unconditional and never reused across runs. Both headers said why — they were written at M0.16/M0.17, before `build-image.yml` landed at M0.24, and reaching ahead would have made M0.24 either redo the work or inherit a workflow written outside its own acceptance criteria. That rationale expired when M0.24 merged, so both became `uses: ./.github/workflows/build-image.yml`.

Doing that is what exposed the real defect. Once both consumed the same image build and the same `lint.yml`/`format.yml`/`typecheck.yml`/`build.yml`/`audit.yml` with the same inputs as `pr-gate.yml`, they were a strict subset of the gate. One push to the task's own PR fired three workflow runs and reported `lint / lint`, `typecheck / typecheck`, `format / format`, `build / build` and `audit / audit` twice each, `build-image / build-image` three times. Duplicate contexts under one `job / job` name make it ambiguous which run a branch ruleset gates on. Both workflows are deleted.

`composite-actions-check.yml` stays: it asserts `checkout-to-app` lands all five `action.yml` files in `/app`, which nothing in `pr-gate.yml` does, and it builds no image.

One thing the deleted workflows did cover that the gate did not: their path filters listed `Docker/Dockerfile.node`. `pr-gate.yml`'s `changes` job now lists it on `lint`, `typecheck` and `build` — the three checks that run inside that image — and deliberately **not** in the `*shared` anchor, which also feeds `destructive_ddl` and would hand `destructive-ddl.yml` an empty changed-files list for nothing.

`build-db-image.yml`'s standalone `pull_request` trigger is the same defect from the other direction — it is also an unconditional job in both `pr-gate.yml` and `merge-queue.yml`, so any PR touching `src/db/**` ran it twice. The trigger is dropped; `push` on `staging`/`main` stays, since moving `latest` is its real job. Folded into this task at the user's direction rather than minted as a separate `MB.*`, against CLAUDE.md's one-task-per-PR rule and with the rule shown first.

The merge queue was never affected: neither deleted workflow declared `merge_group:`, and `merge-queue.yml` builds each image once and passes it down.

`claude-docs/ci.md` had meanwhile grown a second, different rationale for the ad hoc builds: "so a regression check never runs through the thing it is testing". That is not a rule anyone adopted — already false for `composite-actions-check.yml` — and it is the doc that was corrected, not the code. Confirmed with the user first, per CLAUDE.md's rule on a documentary asymmetry.

Explicitly **not** in scope, and recorded so it is not re-litigated:

- `build-e2e-image.yml` cannot share `build-image.yml`'s work. `Docker/Dockerfile.node` is `node:alpine` (musl); `Docker/Dockerfile.e2e` is `mcr.microsoft.com/playwright:v<version>-noble` (Debian, glibc). An `npm ci` tree is not portable across libc — SWC and the other native addons are per-platform binaries — so the e2e image cannot `COPY --from` the testing image's `node_modules`, and Playwright's Chromium has no Alpine/musl build to unify the bases with. The two `npm ci` runs are structural; both already skip on an unchanged content hash.
- `.github/workflows/build-image.yml` is absent from every `changes` filter. Not a regression — the deleted workflows never listed it either, and `pr-gate.yml`'s own `build-image` job is unconditional, so it is exercised on every PR regardless.
- `ci.md` records (verified 2026-09-10) that no ruleset requires any status check yet, while `pr-gate.yml`'s header speaks of six as required. That discrepancy is real and is left alone here.

_Acceptance criteria:_

- `lint-format-typecheck-check.yml` and `build-audit-check.yml` are deleted
- One push to a PR produces exactly one workflow run, and `gh pr checks` reports every context exactly once
- `pr-gate.yml`'s `lint`/`typecheck`/`build` filters list `Docker/Dockerfile.node`; `*shared` does not
- `build-db-image.yml` has no `pull_request` trigger, and its `latest` tag still moves only on a push to `staging`/`main`
- No live doc or workflow still references either deleted workflow; `claude-docs/archive/**` is untouched

**MB.16 — Correct the Postgres version across the live docs** · 1h

_Story:_ As a developer, I want the docs to name the Postgres version the image actually builds from, so that nobody reasons about the wrong major.

Dependabot commit `43ff203` ("Bump postgres from 17 to 18 in /Docker") changed exactly one line of `Docker/Dockerfile.postgres` and nothing else. No prose followed it, so the Dockerfile says `postgres:18` while CLAUDE.md, DESIGN.md §11, this file, `TASKS.csv`, `ci.md`, `docker-compose.yaml` and three workflow header comments all still say 17. Confirmed with the user that the code is right before touching anything, per CLAUDE.md's rule on reconciling a doc against the code — a version bump argued nowhere and reversed nowhere is a bump, not a mistake.

Purely textual; `Docker/Dockerfile.postgres` is not touched.

Two deliberate non-changes, recorded so they are not re-litigated:

- `docker-compose.yaml`'s note about "a `postgres_data` volume populated by the _old_ `postgres:17` image" is about M0.19 switching that file from `image:` to `build:`, **not** about the version bump, and the literal is still historically accurate. It is clarified rather than changed, because with the base now on 18 it had started to read as though it meant the bump.
- `claude-docs/archive/**` is write-once and is left alone wherever it says 17.

This task also carries the `TASKS.md`/`TASKS.csv` entries for MB.16, MB.17 and MB.18, since all three were added to the board in one pass and CLAUDE.md requires the board and these files to move together.

_Acceptance criteria:_

- `grep -rn "postgres 17\|postgres:17" --exclude-dir=node_modules --exclude-dir=archive .` returns only the intentional `docker-compose.yaml` history line
- `Docker/Dockerfile.postgres` is unchanged
- `claude-docs/archive/**` is untouched
- `npm run pre-commit` passes

**MB.17 — Drop the dead `latest` tag from `build-db-image`** · 1h

_Story:_ As a developer, I want the reason a workflow runs on `staging` to be the reason written next to it, so that the next person to read it can act on what it says.

`build-db-image.yml`'s header and `ci.md` both say the `push` trigger on `staging`/`main` exists to move the `latest` tag. Nothing consumes `latest`: `docker-compose.yaml` builds `Dockerfile.postgres` locally (M0.19) and every CI caller pins the content-addressed hash tag. Meanwhile the trigger does do something neither doc mentions — it is the only thing that writes a GHA layer-cache entry another branch can read, because `cache-to: type=gha` entries are branch-scoped and a `pull_request` run writes only to its own merge-ref scope.

Measured on the real runs: a fully cold build step is 25s, a warm one 6–8s. Fresh feature branches that had never built the image got 6–8s, which is only possible via the cross-branch restore those push runs seed. Worth ~17s on each new branch's first CI run, on a job that gates `vitest` and `playwright`, at no dollar cost — the repo is public and the push run is post-merge, off the PR critical path.

So the trigger stays and the tag goes. (MB.99 later removed the trigger as well: M1.27 took `src/db/**` out of the hash, so a push found the PR's tag already published and skipped, and the layer cache moved to the registry, where every branch reads one copy.) MB.15's own entry above, which records "moving `latest` is its real job", is corrected in the same pass.

`src/db/**` is in the tag hash and the path filter but **not** in the build context — `Dockerfile.postgres` only `COPY`s `Docker/postgres-init/enable-extensions.sql` — so a `src/db`-only change republishes byte-identical layers under a new tag. M1.27 changes that by baking the schema in. Recorded here because it is what makes MB.18's cache argument work.

_Acceptance criteria:_

- `ghcr.io/<repo>/db:latest` is no longer pushed; only the hash tag is
- The `image` job output is unchanged, and `pr-gate.yml`/`merge-queue.yml` still consume it
- The build step on the task's own PR run is still ~6–8s, proving the cache restore is intact
- `build-db-image.yml`, `ci.md` and MB.15's entry above all state the cache-seeding reason, and no live doc still claims the trigger exists to move `latest`

**MB.18 — Give `build-db-image` the skip-if-exists check** · 1h

_Story:_ As a developer, I want a PR that changes nothing about the database image to skip rebuilding it, the same way the other two image builds already do.

`build-image.yml` and `build-e2e-image.yml` both gate their build on `docker buildx imagetools inspect` finding the content-addressed tag already published. `build-db-image.yml` is the only one that does not, and `ci.md` says that is deliberate: "its trigger paths are exactly its hash inputs, so the trigger already does it". That holds for the `push` trigger and fails for `workflow_call`, which bypasses the path filter entirely and is the path every PR takes. On that path nothing does the skipping and buildx runs every time.

The two mechanisms are alternatives, and the siblings picked the better one: skip-if-exists reuses work via GHCR tag existence, which is global, where the GHA layer cache is branch-scoped. Adding the check does **not** make MB.17's push trigger redundant — `src/db/**` is in the hash but not the build context, so through Wave 1 the tag misses constantly while the content does not change, which is exactly when a warm layer cache still pays. Both mechanisms stayed until MB.99, which moved the layer cache to the registry and removed the push trigger.

Three things differ from the siblings and are easy to get wrong: the tag step here is `id: tags` with output `hash-tag`, not `id: tag` with output `image`, so a copied expression would gate on an empty string and silently never skip; the `image` job output must keep coming from `hash-tag`, which is computed before the check and unconditionally, because `vitest.yml` and `playwright.yml` key their `services: postgres:` block off it; and after MB.17 `tags` and `hash-tag` are the same value.

No concurrency change. This entry once called the mid-push corruption hazard `build-image.yml`'s comment described guarded by the job's `cancel-in-progress: false`; MB.98 found the hazard was never real, since a tag is written only after every layer it names, and the workflow's own group cancelled the job regardless.

_Acceptance criteria:_

- On the task's own PR: `exists=false`, the build runs, `vitest`/`playwright` green — the build path still yields a correct `image` output. This PR **cannot** prove the skip path: editing the workflow changes the hash, so its own run is a guaranteed miss.
- On the next unrelated PR after merge: `exists=true`, the build step is skipped, `vitest`/`playwright` still green — the `image` output survives the skip path. The task is not done until a post-merge PR has exercised this.
- Skip-path job duration ~13–15s against ~24s before
- `ci.md` no longer claims the path filter makes the check unnecessary, and states that `workflow_call` bypasses it

**MB.19 — ~~Move `drizzle-kit`/`drizzle-orm` off the `@esbuild-kit` advisory~~** · **RETIRED 2026-09-17, not done**

> **Retired without being done.** The ID is kept because task IDs are immutable
> and the analysis below is still the record of why the advisory is tolerated.
> Removed from the Asana board; it is no longer work to do.
>
> **Why.** The task would trade a stable-but-frozen dependency for a
> prerelease one, to clear an advisory that has **no runtime exposure**:
> GHSA-67mh-4wv8-2f99 is esbuild's _dev server_ accepting cross-origin
> requests, `drizzle-kit` is a devDependency and build-time CLI that never
> ships to Vercel, and nothing here runs `esbuild serve`. Two claims in the
> analysis below are also wrong and are corrected here rather than silently:
> (1) it says to pin the newest `rc.5-<hash>` — those are per-commit CI
> publishes, not releases; the `rc` dist-tag points at the curated
> `1.0.0-rc.4`; (2) it says `audit.yml` "only fails CI on a high-severity
> advisory" — it never fails, running `npm audit --json … || true` and
> commenting only.
>
> **What replaced it.** MB.20 drops `@pothos/plugin-drizzle`, the component
> that tracked `drizzle-orm`'s version and would eventually have forced this
> upgrade. With it gone, the ORM sits behind `repository.ts` as a query
> builder rather than an architectural commitment, and staying on `0.45.2` is
> sustainable. The standing decision and its revisit triggers are recorded in
> `claude-docs/db.md`, "Why the ORM stays on 0.45.2" — **revisit at 1.0 GA**,
> when `drizzle-kit generate` cannot express DDL a task needs, or if the
> advisory gains a runtime path.

_Story (retired):_ As a developer, I want `npm audit` clean of the standing `drizzle-kit` advisory so a known vulnerability doesn't sit in the tree indefinitely just because it's moderate rather than high.

`npm audit` reports a moderate advisory (GHSA-67mh-4wv8-2f99, CVSS 5.3 — esbuild's dev server accepts cross-origin requests) reached only through `drizzle-kit@0.31.10` → `@esbuild-kit/esm-loader@2.6.5` → `@esbuild-kit/core-utils@3.3.2`, which pins its own nested `esbuild` to `~0.18.20` regardless of the `esbuild@^0.25.4` `drizzle-kit` depends on directly. `@esbuild-kit` is archived upstream — folded into `tsx`, which `drizzle-kit@0.31.10` already depends on separately but does not yet use to replace the esm-loader. `0.31.10` is the newest version on the stable dist-tag; there is no patched `0.3x` release to move to; M0.17's audit workflow does not catch this because it only fails CI on a high-severity advisory.

The only version line that drops `@esbuild-kit` is `drizzle-kit`'s `1.0.0-rc.*` prerelease, which depends directly on `esbuild@^0.25.10` via `jiti` instead. `drizzle-orm` has a matching `1.0.0-rc.*` line that must move with it — confirmed compatible with what's installed here: `@better-auth/drizzle-adapter@1.7.4`'s own peer range is already `^0.45.2 || >=1.0.0-rc.1 <2.0.0`, so `src/lib/auth.ts`'s `drizzleAdapter` accepts either. `drizzle-orm@1.0.0-rc.1`'s release notes carry one breaking change relevant to a Postgres/Drizzle Kit project — the `casing: "camel"` config option was replaced by `snakeCase`/`camelCase` table wrappers — which does not apply here: `drizzle.config.ts` sets no `casing` key (confirmed by grep) and no schema file uses it either.

An `overrides` entry forcing `esbuild` up inside `@esbuild-kit/core-utils` without touching `drizzle-kit`'s version was considered and rejected: `@esbuild-kit/core-utils` is unmaintained and pins `~0.18.20` deliberately, so overriding it to `^0.25` would run its code against an esbuild two majors newer than anything it was tested against, with no upstream fix if that broke — trading a documented, understood advisory for an undocumented one.

Both packages are still on release candidates, not a GA `1.0` — `npm view drizzle-kit versions` / `npm view drizzle-orm versions` should be re-checked at implementation time rather than assuming today's newest `rc.5-<hash>` is still the newest, and the PR should say plainly that it pins a prerelease so it's easy to find and revisit once `1.0` goes stable.

_Acceptance criteria (retired — not to be met):_

- `drizzle-kit` and `drizzle-orm` upgraded together to matching `1.0.0-rc.*` versions (re-verify the newest available rc, or a GA `1.0`, at implementation time)
- `npm audit` no longer reports the `@esbuild-kit/esm-loader` → `esbuild` advisory chain
- `npm run db:generate` against the current `src/db/schema` produces no diff versus the existing migrations in `src/db/migrations`
- `npm run db:migrate` (`make db-migrate`) still applies cleanly against a fresh `sorrel_template`
- `npm run db:seed` / `db:reset` still fail at the same known M1.21–M1.23 seed-scenario point, not earlier
- `src/lib/auth.ts`'s `drizzleAdapter` initializes with no peer-dependency warning
- `drizzle.config.ts` needs no changes beyond what the new major documents; any that are needed are recorded in the PR
- The PR body states this pins a `drizzle-kit`/`drizzle-orm` release candidate, not a GA release

**MB.20 — Drop `@pothos/plugin-drizzle` from the GraphQL stack** · 1h

_Story:_ As a developer, I want the GraphQL layer independent of `drizzle-orm`'s version so that a frozen ORM release does not eventually force an upgrade through the resolver layer.

`DESIGN.md` §2 and §7 specify Pothos **with the Drizzle plugin**, justified at `DESIGN.md:64` by `auditColumns` flowing into the graph without retyping. Three of that decision's premises do not hold:

1. **The plugin's primary capability is banned.** It exists so a resolver can query the database from the GraphQL selection set (`builder.drizzleObject`, `t.relation`). `DESIGN.md:359` says "No database access in a resolver, ever. Same lint rule as `db`," and M3.9 adds that rule.
2. **The graph does not mirror the tables.** The schema sketch at `DESIGN.md:417` exposes `audit: AuditInfo!` — a nested object, not six flat columns. `Ingredient.isGlobal` is derived from `workspace_id IS NULL` and is not a column; `Spell.derivedCategories` and `Spell.categoryGaps` are computed. Derivation would be overridden on essentially every type. `DESIGN.md`'s own "resolvers are thin" example (`:346`) is a plain `t.field` over a manually declared type.
3. **It couples GraphQL to the ORM's version.** `@pothos/plugin-drizzle` is `0.20.0` and tracks `drizzle-orm`; every other Pothos package is a stable `4.x` (`core` 4.15.1, `plugin-scope-auth` 4.2.1, `plugin-dataloader` 4.4.6, `plugin-relay` 4.8.1). It is the component that would have forced MB.19's upgrade.

N+1 and pagination were never the plugin's job: `DESIGN.md:362`/`:372` assign batching to per-request DataLoaders in the Yoga context, and rule 8 / M3.6 specify one shared cursor helper.

**Nothing is installed yet** — `package.json` carries no `pothos`, `graphql` or `yoga`, and `src/graphql/{schema,loaders}/` are empty. So this task is documentation and scoping, taken before M3 is written rather than retrofitted onto it, per CLAUDE.md's sweep-task rule. It lands in Wave 2 because M3.2 is the first task that would wire the plugin up.

_Acceptance criteria:_

- `DESIGN.md` §2's "Why Drizzle" no longer cites the Pothos plugin as a reason, and says so explicitly rather than deleting the bullet
- `DESIGN.md` §2's "Why Yoga + Pothos" states the plugin is deliberately unused and why
- `DESIGN.md` §7's stack line reads "Pothos (code-first schema, no ORM plugin)"
- M3.2 no longer says "with the Drizzle plugin", and its criterion "types are inferred from Drizzle tables" is replaced by one asserting hand-declared object types still fail typecheck on a changed column type
- `claude-docs/design-decisions/mb.20-pothos-without-drizzle-plugin.md` records the decision, what it rules out, and that re-adopting later is additive
- `claude-docs/db.md` carries the standing "leave the ORM on 0.45.2" decision and its revisit triggers
- MB.19 is marked retired in `TASKS.md` and `TASKS.csv` and removed from the Asana board
- No dependency change: `package.json` is untouched

**MB.21 — Drizzle Studio for local development** · 1h

_Story:_ As a developer, I want to browse the local database without dropping into `psql`, so I can inspect rows and schema while working.

There is no way to browse the local database today. `drizzle-kit` is already a devDependency (pinned to `0.31.10` by MB.20's decision) and ships a `studio` subcommand that reads the existing `drizzle.config.ts`, so this is a wiring task, not a new dependency. `package.json` already has `db:generate` / `db:migrate` / `db:seed` / `db:reset`; nothing exposed a Studio port.

Two constraints shape the wiring: `make` and `docker` do not exist in the devcontainer, so the npm script has to stand on its own, with the `make`/compose path as the host equivalent — the same split `workshop` / `docker-workshop` already has. And Studio's own UI is hosted externally at `https://local.drizzle.studio`; the browser connects from there back to `127.0.0.1:4983`, so the local process only ever serves data, never a page — port forwarding is the whole story.

`npm run db:studio` runs `drizzle-kit studio --host 0.0.0.0 --port 4983`, both flags explicit rather than relying on `0.31.10`'s (currently matching) defaults, so a future version change on this dist-tag doesn't silently rebind. `Docker/docker-compose.yaml` gets a `studio` service behind a `studio` compose profile, shaped like `workshop` but depending on `postgres`'s health check — there is nothing to browse without a connection. `make db-studio` and `make docker-studio` wrap the two paths, and `make docker-all` starts every long-running service (app, Postgres, workshop, studio) together — MB.23 later adds the Playwright browser server to that list. `.devcontainer/devcontainer.json` forwards **4983** alongside 8000/8001 — the only devcontainer change needed, since that overlay publishes no ports of its own.

_Acceptance criteria:_

- `npm run db:studio` (from the devcontainer, `DATABASE_URL` set) binds to `0.0.0.0:4983` and serves the schema from `src/db/schema` at `https://local.drizzle.studio`
- `make docker-studio` brings up the `studio` compose service; `docker compose ps` shows it healthy-dependent on `postgres`
- `make docker-down` removes the `studio` container (proves `--profile studio` was added to `docker-build`/`docker-down`/`docker-rebuild`, not just `docker-studio`); a bare `make docker-up` does **not** start it
- `make docker-all` starts app, postgres, workshop and studio together
- `make help` lists `db-studio`, `docker-studio` and `docker-all` with their doc lines
- `drizzle.config.ts` is unchanged — it already throws when `DATABASE_URL` is unset and needs no Studio-specific configuration
- `CLAUDE.md`, `claude-docs/db.md` and `claude-docs/docker.md` document the command, the port, and the compose profile
- `npm run pre-commit` and `npm run db:generate` (no migration diff) stay green

**MB.22 — Set up modern debugging tooling** · 8h (explicit exception to normal 1–2h sizing; see the minting note above)

_Story:_ As a developer, I want to set a breakpoint in a server component, a service, a repository finder, or a test, and to see the SQL a query actually emits, so I don't have to debug `withAudit`'s transaction scoping and the two-layer authorization model (rule 5) by printf.

There is no debugging story in this repo at all: no `.vscode/` directory, no Node inspector port wired anywhere in the container, no way to see what a query actually did beyond its output, and no way to replay a failed Playwright run locally — `playwright.config.ts` sets `trace: 'on-first-retry'` next to `retries: process.env.CI ? 2 : 0`, so a local failure writes no trace at all. Playwright also cannot run natively in the devcontainer: `Docker/Dockerfile.node` is Alpine/musl and Chromium has no musl build, so `e2e` is a separate Debian image today with no debugging affordances.

Five pieces, one PR:

1. **Node inspector.** `npm run dev:debug` (`next dev --inspect=0.0.0.0:9229 …`, `next dev`'s own native flag — not `NODE_OPTIONS`, which leaks into Next's internal child processes and collides with whatever port they auto-claim next) plus `make dev-debug`; port 9229 published on the `app` compose service and forwarded by the devcontainer.
2. **VS Code.** `.vscode/launch.example.json` and `.vscode/tasks.example.json` are committed (not `launch.json`/`tasks.json`, which stay per-developer and ignored) — attach-style configs, since every process here starts in a terminal inside the container: attach to the Next.js server (9229), attach to Vitest (9230), a launch config for the current test file, attach to the Playwright runner (9231). No client-side Chrome/Edge config — there is no browser in the container; client-side debugging is host DevTools against the forwarded 8000.
3. **Test debugging.** `npm run test:debug` runs Vitest single-worker under `--inspectBrk=0.0.0.0:9230` (Vitest's own native flag, plus `--maxWorkers=1` — the config's `poolOptions.threads.singleThread` dotted form the earlier draft of this task assumed isn't accepted from the CLI) — single-worker specifically, so the breakpoint is inside a known `sorrel_test_${VITEST_POOL_ID}` clone (CLAUDE.md's Testing section); `npm run test:ui` (`@vitest/ui`, pinned to the installed `vitest@^5.0.0` line). For Playwright: fix the local-trace defect (`trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure'`, screenshots and video on failure off CI), add `e2e:ui` / `e2e:debug` / `e2e:trace` scripts, and — the harder piece — let `npm run e2e` run from inside the devcontainer at all. The approach: a long-lived `playwright-server` compose service (profile `e2e`, same `Docker/Dockerfile.e2e` image already built for CI) runs `playwright run-server`; `playwright.config.ts` reads `PLAYWRIGHT_WS_ENDPOINT` and takes Playwright's `connectOptions` branch only when it's set, which `.devcontainer/docker-compose.yml` sets only on the `devcontainer` service — so `make docker-e2e` and CI, which never set it, are unaffected and keep launching Chromium locally in the `e2e` container. The runner (plain Node, no native browser dependency) stays in the Alpine devcontainer; only the browser needs the Debian image. This is recorded as a decision, not just a diff — `claude-docs/design-decisions/mb.22-playwright-in-devcontainer.md` states the trade-off (headed interaction — `page.pause()`, UI mode's live picker — doesn't work well against a remote browser; trace viewer and UI mode's recorded-step view do).
4. **Database debugging.** `make db-psql` (`docker compose exec postgres psql -U sorrel sorrel`) and opt-in query logging: `src/db/connection.ts`'s `drizzle(client)` becomes `drizzle(client, { logger: process.env.DEBUG_SQL === '1' })` — off by default, so no test output or CI behaviour changes, and on, every statement the repository emits is printed, including `withAudit`'s `SET LOCAL app.current_user_id`. `src/db/connection.ts` is already the one file rule 2 allows to hold the client; nothing about the import boundary changes.
5. **Next.js DevTools MCP.** `.mcp.json` gains a `next-devtools` server (`npx -y next-devtools-mcp@latest`, the form `node_modules/next/dist/docs/01-app/02-guides/mcp.md` specifies) alongside the existing `asana` entry — while `npm run dev` is running, an agent session can read the dev server's current build/runtime errors, route metadata and logs directly.

All of it is documented in one place: `claude-docs/debugging.md`, a new subsystem summary (README.md's per-subsystem convention), with `claude-docs/transcripts/debugging.md` opened alongside it, plus a pointer and a Commands-table row in `CLAUDE.md`, and shorter cross-references from `claude-docs/testing.md` and `claude-docs/db.md`.

_Acceptance criteria:_

- `npm run dev:debug` prints a `Debugger listening on ws://0.0.0.0:9229/…` line and still serves 8000; `npm run dev` is unchanged and starts no inspector
- Copying `.vscode/launch.example.json` into `launch.json` gives a working attach session against the Next.js server, Vitest and the Playwright runner; `.gitignore` allows the two `*.example.json` files through its `.vscode/*` deny while `launch.json`/`tasks.json` stay ignored
- `npm run test:debug` halts on the first line under `--inspect-brk`, attaches on 9230, and the run uses exactly one `db`-project worker
- A locally-failing e2e spec writes `test-results/**/trace.zip`; `npm run e2e:trace` serves a viewer on a forwarded port; CI's `trace`/`screenshot`/`video` behaviour is unchanged (`CI=true` still takes the `on-first-retry` branch)
- `npm run e2e` succeeds from inside the devcontainer with the browser running in `playwright-server`; `make docker-e2e` and `.github/workflows/playwright.yml` are provably untouched — neither sets `PLAYWRIGHT_WS_ENDPOINT`, so neither takes the `connectOptions` branch
- `make db-psql` opens a prompt against the compose `postgres` service; `DEBUG_SQL=1 npm run test -- src/db/repository.test.ts` prints SQL including the `SET LOCAL`, and without the flag output is unchanged
- With `npm run dev` running, the `next-devtools` MCP server connects and reports a deliberately introduced type error; `.mcp.json` stays valid JSON and the `asana` server still connects
- `npm run lint` passes (no new database-client importer — rule 2 holds) and `npm run pre-commit` / `npm run test:coverage` are green
- `claude-docs/debugging.md` is readable without opening any other file, per README.md's standard for a subsystem summary

**MB.23 — Playwright codegen for local development** · 2h

_Story:_ As a developer, I want to record an e2e interaction instead of hand-guessing role and label queries against a page I haven't inspected, so the spec I write matches CLAUDE.md's "role and label queries only" house style from the start.

MB.23 sits directly on top of MB.22 (merged), which split the Playwright runner from the browser: the runner stays in the Alpine devcontainer, and a long-lived `playwright-server` compose service (built from `Docker/Dockerfile.e2e`, behind the `e2e` profile) provides the Chromium it dials over `PLAYWRIGHT_WS_ENDPOINT`. That mechanism cannot serve codegen — `playwright codegen` always launches its own local browser and exposes no `--ws-endpoint` — and MB.22's own design record already names the reason: `page.pause()`'s inspector window has nowhere to open, because `playwright-server` has no display attached. Codegen is exactly that failure mode.

The fix is a display on the existing service, not a second one. `Docker/Dockerfile.e2e` gets a second, named stage (`e2e`, unchanged, then `FROM e2e AS headed` adding `xvfb`, `x11vnc`, `novnc`/`websockify`, and a window manager). `.github/workflows/build-e2e-image.yml` and the `e2e` compose service both pin `target: e2e` so default-stage behaviour doesn't shift under them. `playwright-server` builds `headed` instead, takes its own image tag (`sorrel-e2e-headed`, distinct from the `e2e` service's `sorrel-e2e` — both declaring the same tag today is a latent last-build-wins bug the moment one builds a different stage), and gains a `playwright-entrypoint.sh` that raises the display before handing off to whatever command it was given, so MB.22's `run-server` path is unchanged. Publishing `7900` alongside `4444` turns that display into a tab: `http://localhost:7900` streams the containerised Chromium and Inspector over noVNC. A new `make docker-codegen NAME=<spec>` target `exec`'s `playwright codegen` into the running `playwright-server` container as the caller's uid, writing `e2e/<name>.spec.ts` un-root-owned. `page.pause()` and UI mode's locator picker — the two things MB.22 wrote off — work as a side effect, so its design record gets a dated amendment rather than staying documented as a limitation the code no longer has.

Sign-in is OAuth-only, so an authenticated flow can't be recorded until seeded sessions exist (M1.21–M1.23); this task records unauthenticated pages only and does not build a hook for storage-state loading.

`make docker-all` is extended to bring `playwright-server` up alongside app/Postgres/workshop/studio — it's a long-running service like the other three, and now has a display worth having up by default. `e2e` stays deliberately out of that list: it's a one-shot suite run (`docker compose run --rm`), not a service to leave running, so `docker-all` names the services it starts explicitly rather than blanket-starting everything the `e2e` profile enables.

Recording against a real page surfaced two app-level defects that only a real browser could find, both folded into this task on request rather than split out. First, the recorded page rendered correctly and was completely inert: `next dev` 403s cross-origin requests to `/_next/*` from any host outside `localhost` unless it is listed in `allowedDevOrigins`, and while `<script src>` requests survive that check (they send no `Origin` and count as same-origin), the HMR websocket upgrade does not — and under Turbopack that connection is what boots the client runtime, so the app never hydrated and every handler was silently absent. Second, with that fixed, the first click on `ThemeToggle` did nothing visible: `globals.scss` resolves three theme states (`data-theme`, else a light system preference, else dark) but only a _stored_ choice stamps the attribute, so reading it alone reported "not light" on a light system with nothing stored and applied `light` — the theme already showing. `index.scss` had the same gap, leaving the crescent on a light page until the mount effect swapped it a paint later. Both are fixed by resolving the theme the way the stylesheet does, in the component and in its stylesheet alike.

A third finding is deliberately documented rather than fixed: while the recorder is attached, the dev overlay reports a hydration mismatch on `<body data-pw-cursor="pointer">`. That attribute is Playwright's own, set to drive the pointer styling it paints over the page, and it lands before React loads. Hydration still completes. Silencing it would mean `suppressHydrationWarning` on `<body>` — masking real body-level mismatches everywhere and permanently, to quiet a tool artifact that appears only under the recorder.

_Acceptance criteria:_

- `make docker-build` builds both the `e2e` and `headed` stages without error
- `make docker-e2e` still passes against the `e2e` stage; `sorrel-e2e` and `sorrel-e2e-headed` are distinct images, and `sorrel-e2e`'s size is unchanged from before this task
- `make playwright-server-up` then `npm run e2e` from inside the devcontainer still passes against the remote browser exactly as MB.22 left it
- `make docker-all` brings up app, Postgres, workshop, studio and `playwright-server` (`docker compose ps` shows all five); it does **not** start `e2e` itself
- `make docker-codegen NAME=scratch` opens `http://localhost:7900` to a headed, interactive Chromium beside a draggable Playwright Inspector; recording an interaction writes a caller-owned `e2e/scratch.spec.ts` using `getByRole`/`getByLabel`/`getByText`
- Adapting `e2e/scratch.spec.ts` per the debugging.md checklist (import from `./fixtures`, relative `goto`) and running `make docker-e2e` passes it alongside `smoke.spec.ts`; the scratch file is deleted before the PR
- A temporary `page.pause()` in `e2e/smoke.spec.ts`, run via `npm run e2e` from the devcontainer, opens the Inspector at `:7900`
- The page loaded at `http://sorrel-app:8000` in the recorder actually hydrates: clicking an interactive element runs its handler, and the console carries no blocked-websocket error
- On a system preferring light with no stored choice, the **first** click on `ThemeToggle` changes the theme (to dark), `aria-pressed` reads `true` at mount, and the sun facet is already at rest rather than swinging in after first paint — covered by unit tests that fail without the fix
- `make docker-down` leaves no container behind; the devcontainer's Ports panel lists `7900`
- `claude-docs/design-decisions/mb.23-codegen-needs-a-display.md` records why `run-server` can't serve codegen and why a display on the existing service beats a second one; `claude-docs/design-decisions/mb.22-playwright-in-devcontainer.md` is amended in place with a dated note that `page.pause()` and the locator picker now work; `claude-docs/debugging.md`, `testing.md`, `docker.md` and `ci.md` are updated
- `npm run pre-commit` is green

**MB.24 — Decide the RLS role split and read-path identity** · 2h · **merged, then superseded by MB.29**

> **Superseded, not wrong.** MB.24 shipped and its two findings hold. MB.29 then
> deferred the policies they were fixing to the public launch, so the tasks it
> spawned — MB.25, MB.26 — are retired along with M6.4 and M6.5, and the
> decision record is the specification for when RLS lands rather than for Wave 5. Everything below is history and is left as it was written.

_Story:_ As a developer, I want the RLS design to be enforceable before M6.4 writes policies against it, so that the second authorization layer is real rather than decorative.

Documentation and scoping only, in the shape of MB.20: no policy, no migration, no code. It exists because §8's two-layer design does not currently work, in two ways that hid each other.

**The policies would be inert.** The application connects as `sorrel` (`Docker/docker-compose.yaml`) and `drizzle-kit migrate` runs against that same `DATABASE_URL`, so `sorrel` owns every table its policies would filter. Postgres exempts a table's owner from its own policies unless `ALTER TABLE … FORCE ROW LEVEL SECURITY` is set, and that clause appears nowhere in this repo. Neon is the same shape — the integration injects the table-owning role. M6.5 would have caught this, but only after M6.4 had shipped believing otherwise.

**Fixing that alone would break every read.** `set_config('app.current_user_id', …, true)` is published inside `withAudit`, the write path (M1.19). Reads go through `findMany`/`findOne` → `selectFrom`, which uses the bare client with no transaction (M1.20), and a `LOCAL` GUC exists only inside one. A policy reading the GUC on a read would see it unset on a fresh pooled connection, or reset to `''` on one that has served a write — an error on the `::uuid` cast, or zero rows. Nothing planned catches it, because M6.5 asserts a read is _refused_.

The answer is three independent, individually cheap layers rather than one clever one: the app role stops owning the tables (MB.25), `FORCE` makes an owner-role misconfiguration fail closed instead of open, and a startup assertion makes it fail loudly. Reads get identity from `withViewer` (MB.26). `FORCE` was initially ruled out on the grounds that it breaks migrate and seed; that stops being true once the owner holds `BYPASSRLS`, which outranks it — so it costs nothing already being paid and covers the case where `DATABASE_URL` resolves to a table-owning role that is not `sorrel`, which is exactly what Neon's `neondb_owner` is.

This task also settles four things about the policies themselves, all cheaper to fix in the task text than in M6.4's PR. §8's policy shape subqueries `workspace_members`; applied to that table it is infinite policy recursion, which Postgres rejects outright — so the role hierarchy moves into a `security definer` `app.is_member()` helper, with `app.current_user_id()` beside it returning `NULL` rather than raising on an unset GUC. `ingredients.workspace_id` is nullable and `NULL` means the global compendium, so a policy without `workspace_id IS NULL OR …` deletes the compendium from every signed-in user's view. And `spell_ingredients` and `spell_categories` carry no `workspace_id`, so the guard as worded — "every table with a `workspace_id`" — silently exempts the two tables holding what a spell is made of.

_Acceptance criteria:_

- `claude-docs/design-decisions/mb.24-rls-role-split.md` records both findings and the options weighed: `FORCE` alone vs. the role split vs. both, derive vs. provision on Neon, and per-query vs. per-request read transaction
- DESIGN.md §8 is rewritten for the role split, `FORCE` and `withViewer`; its example policy's name/table mismatch is fixed (it names `ingredients_workspace_access` but attaches it to `inventory_items`)
- DESIGN.md §14 gains a decision-log row for RLS — there is currently none, which is part of why this went unexamined — and §2's recorded risks gain the Neon role-injection risk
- The DESIGN.md §8 / `repository.ts` disagreement is resolved **in the code's favour**: §8 claims every workspace-scoped _call_ passes `assertMembership` inside `withAudit()`, while `withAudit` is the write path only. The doc predates M1.20's read/write split; §8 is corrected to say reads carry identity through `withViewer`
- CLAUDE.md rules 3 and 5 name both wrappers and both roles
- M6.4, M6.5 and M10.3 are re-scoped here and in TASKS.csv, including striking M6.4's seed criterion as answered by MB.25
- No code, no migration
- `npm run pre-commit` is green

**MB.25 — ~~Split the database roles so RLS applies to the app~~** · **RETIRED 2026-09-17, not done**

> **Retired without being done (MB.29).** ID kept, per the MB.19 precedent;
> removed from the Asana board. The analysis below is correct and is kept as
> part of the specification for the public launch — the role split is still
> what would make policies real rather than declared.
>
> **Why.** It exists only to serve RLS, and MB.29 deferred RLS. Every cost in
> it is a cost with no v1 benefit: a second role on every environment, a
> credential-derivation scheme in `connection.ts`, two new variables wired
> through `docker-compose.yaml`, three CI workflows and `deploy.yml`, and a
> Neon assumption about role inheritance across branches that M1.1's record
> says must be verified in the live dashboard before anything depends on it.
> The layer it was buying is bought instead by M6.3's `Membership` proof, for
> nothing at runtime and nothing in operations.

_Story (retired):_ As an owner, I want the application to connect as a role that cannot bypass RLS, so that the database layer enforces workspace boundaries rather than merely declaring them.

`sorrel` keeps everything it is documented to be — owner of the database and of `sorrel_template`, holding `CREATEDB` for M1.9's per-worker clones — and gains `BYPASSRLS` so migrations and the seed run unimpeded. That is what answers M6.4's open question about seeding under policies, using the first of the two options it already offered, on the role that already runs the seed. A new `sorrel_app` (`LOGIN`, `NOBYPASSRLS`, owning nothing) is what the application connects as.

`ALTER DEFAULT PRIVILEGES` is the load-bearing line: without it, every future migration's table is invisible to the app until someone remembers a `GRANT`. Grants live in the database's own catalogs, so `CREATE DATABASE … TEMPLATE sorrel_template` carries them into each `sorrel_test_<n>` clone for free.

**Neon: derive, don't inject.** The integration's branch-per-preview feature mints an endpoint host at deploy time, so there is no host to pre-set a connection string for — "set `DATABASE_URL` explicitly per environment" is not available. Instead `connection.ts` takes whatever `DATABASE_URL` the platform supplies and swaps only username and password, keeping host, database and `sslmode`. Because it never names the host, it behaves identically on an ephemeral branch, on staging, in production, in Docker and in CI. This is also why there is no second connection string: `DATABASE_URL` stays the owner's, which is what `drizzle.config.ts`, `scripts/db-seed.ts` and `db-global-setup.ts` already want, so none of those call sites change. Vitest inherits it — `worker-database.ts` rewrites only the database name, so the clone URL flows through `connection.ts` and comes out as `sorrel_app` on the right clone.

The one assumption is that `sorrel_app` exists with the same password on whichever branch the host points at. Neon branches copy roles and their stored credentials from the parent, so a role created on `main` should reach every descendant — but M1.1's record says to verify Neon branch behaviour in the live dashboard rather than trust it, and that applies here. Verify it before anything depends on it.

_Acceptance criteria (retired — not to be met in v1):_

- `Docker/postgres-init/enable-extensions.sql` grants `BYPASSRLS` to `sorrel` and creates `sorrel_app` with `USAGE` on schema `public` and `ALTER DEFAULT PRIVILEGES` for tables and sequences
- `src/db/connection.ts` derives the app connection from `DATABASE_URL` plus `DATABASE_APP_ROLE` and `DATABASE_APP_PASSWORD`; both are **required** and throw when absent, so `FORCE` stays a backstop rather than a crutch
- The new variables are wired into `Docker/docker-compose.yaml`, the three CI workflows and `deploy.yml`
- A startup assertion refuses to connect as a role that is superuser, holds `rolbypassrls`, or owns a known application table — a `pg_roles`/`pg_class` query, the same introspection style as M6.4's catalogue guard — with a `db`-project test that fails if it is not enforced
- `npm run db:migrate` and `npm run db:seed` both succeed as the owner
- `sorrel_app` can read and write every application table but cannot `CREATE TABLE`
- `npm run test:coverage` is green, M1.9's clone isolation included
- Neon: `sorrel_app` created on `main` and `staging`, with role inheritance **verified on a throwaway branch cut from `main`**. If it does not hold, the fallback is `neonctl branches create` plus `neonctl connection-string --role-name sorrel_app` in `deploy.yml`, dropping the integration's auto-branching
- `claude-docs/secrets.md` documents both new variables
- `npm run pre-commit` is green

**MB.26 — ~~`withViewer`, the read-side identity wrapper~~** · **RETIRED 2026-09-17, not done**

> **Retired without being done (MB.29).** ID kept; removed from the Asana
> board. Unlike MB.24 and MB.25, this one is not held for the public launch
> either without re-deciding it: it is the mechanism whose standing cost is the
> reason RLS was deferred at all, so whoever adds policies later should price
> it again rather than assume this design.
>
> **Why.** Its only purpose was to give a read a transaction for the GUC to be
> `LOCAL` to. With no policy reading the GUC, it publishes a setting nothing
> consults and charges `BEGIN`, `set_config`, `SELECT`, `COMMIT` — four round
> trips where a read is one, roughly +10–15ms per `cache()`-deduped service
> call against Neon, plus a pooled connection held for the length of every
> render — on a meter that bills I/O wait (DESIGN.md §4). Re-entrancy reduces
> how often that is paid, not whether it is.
>
> **What replaced it.** M6.3's `Membership` proof carries identity as a
> function argument instead of a session variable, so reads open no transaction
> and CLAUDE.md rule 3 covers writes alone. DESIGN.md §14 records that this
> wrapper was never built, so a later reader does not go looking for it.

_Story (retired):_ As a developer, I want reads to carry the acting user into the database, so that an RLS policy can filter a read rather than erroring on a setting that was never published.

The mechanism half of the sweep-task rule: it lands one wave before its first caller and is adopted by each later task in that task's own PR, never retrofitted. Until M6.4 adds policies it changes no behaviour, so it lands green.

`withViewer` is `withAudit`'s read-side counterpart, in the same file, and is **re-entrant** so it can be established at whichever boundary is available. Services call it — the same boundary `assertMembership` sits at — and React `cache()` dedupes repeated calls within one server-component render, so that is one short read-only transaction per distinct service call rather than per query. The GraphQL route establishes an outer one alongside the per-request DataLoaders (rule 9), and re-entrancy collapses the services' own calls into it, so a whole operation — every loader batch included — costs one `BEGIN` and one `set_config`. Unauthenticated and cacheable reads establish nothing: the compendium and categories are not workspace-scoped, carry no policies, and are `unstable_cache`d under rule 6, where a viewer transaction would not belong anyway.

`withViewer` and `withAudit` never nest. A mutation writes inside `withAudit`, then resolves its response fields inside `withViewer` — sequentially, one connection at a time. That keeps rule 3 intact and avoids re-introducing the savepoint semantics `m1.9-test-db-isolation.md` rejected, where an outer transaction's `set_config` leaks one user's identity into the next assertion.

_Acceptance criteria (retired — not to be met):_

- `withViewer(session, fn)` opens a read-only transaction, publishes `app.current_user_id`, and runs `fn` inside an `AsyncLocalStorage` scope
- It is re-entrant: an ambient viewer transaction is reused, not nested
- `selectFrom` reads from the ambient transaction when there is one and the bare client otherwise; no finder signature and no call site changes
- `withAudit` throws if a viewer store is ambient, and a test proves it
- A guard test modelled on `tests/guards/soft-delete-finder-guard.test.ts`
- `DEBUG_SQL=1` on one authenticated page load shows a single `BEGIN`/`set_config` per GraphQL operation, not one per query
- `npm run test:coverage` is green and behaviour is unchanged
- `claude-docs/db.md` documents `withViewer` alongside `withAudit`

**MB.27 — `vercel pull` ignores branch-scoped variables** · 1h

_Story:_ As a developer, I want a staging deploy to use staging's own database, so that it does not silently share or lose it to a hotfix preview branch.

Found while tracing how `DATABASE_URL` resolves per branch for MB.25. `deploy.yml` runs `vercel pull --yes --environment=<env>` with no `--git-branch`, and a push to `staging` resolves to `environment=preview`. Vercel only resolves branch-scoped variables when `--git-branch` is passed, so M1.1's `vercel env add DATABASE_URL preview staging` override is not reaching the build.

That override is the entire mechanism shielding `staging` from the Neon integration's automatic branch-per-preview-deployment. The M1.1 record states the failure directly — "if that override is ever removed, `staging` silently starts sharing (or losing) its database with the next hotfix branch's ephemeral one" — and as wired it was never applied in the first place.

Note that M1.1's premise is itself unverified, and says so. `vercel.json` has since set `deploymentEnabled: { "**": false }` and deploys now come from `vercel deploy --prebuilt` in CI, so whether the Neon integration fires at all for CLI-created deployments is open. Establish the live behaviour as part of this task rather than assuming either answer — and if the integration does not fire, say so in the record instead of leaving a rule that describes a mechanism that isn't running.

_Acceptance criteria:_

- `deploy.yml` passes `--git-branch` to `vercel pull`, resolving to the branch actually being deployed
- `migrate.yml` resolves `DATABASE_URL` the same way — M1.1's "Cross-task impact" requires the two to match
- Verified against the live project: a `staging` deploy uses the `staging` Neon branch, and a hotfix preview does not use `staging`'s
- `m1.1-neon-branch-strategy.md` gains a dated amendment recording what the live behaviour actually is
- `claude-docs/ci.md` records the `--git-branch` requirement so the next reader does not drop it again
- `npm run pre-commit` is green

**MB.28 — Record the ingredient identity model in the design docs** · 1h

_Story:_ As a developer, I want the ingredient identity model fully specified in the design docs before M4.1 writes the table, so that the `CREATE TABLE` is transcription, not design.

DESIGN.md §5 currently models an ingredient's identity as `lower(name)` alone, with `folkNames text[]` beside it. That cannot express three things the domain contains: common names are regional and ambiguous — "Cat's Claw" names four unrelated species and a literal cat's claw — a safety note attached to an ambiguous name is dangerous, and global `lower(name)` uniqueness forbids the compendium holding more than one of them at all. `MB` is the namespace for a missing dependency scheduled without renumbering an immutable ID; MB.16 ("Correct the Postgres version across the live docs") is the doc-only precedent. This is its own task, ahead of M4.1, because M4.1 is transcription of §5 and the DDL must be fully specified before it is written.

_Acceptance criteria:_

- DESIGN.md §5 gains `nomenclature`, `canonicalName` and the generated `canonicalKey`; `folkNames[]` moves to its own `ingredient_folk_names` table; `form` becomes free text backed by the new `ingredient_forms` vocabulary rather than an enum, and its SQL block carries three partial unique indexes rather than two
- DESIGN.md §7, §9 and §11 are amended per the identity-model plan, including the note that the M3.4 SDL snapshot moves
- DESIGN.md §14 gains its decision-log rows, and the SQLite array-column example is corrected from `folkNames` to `deities[]`/`substitutes[]`
- DESIGN.md §15 is adjudicated — reworded to distinguish identity from correspondence — rather than silently rewritten
- Both CLAUDE.md invariants are updated: admins curate the form vocabulary too, and a new paragraph states the identity rule
- `claude-docs/db.md` carries the identity model
- `grep -n "catalog" claude-docs/DESIGN.md` still returns nothing
- TASKS.md and TASKS.csv carry every amendment this redesign requires, in the same pass

**MB.29 — Defer RLS to the public launch; make the second layer a `Membership` proof** · 2h

_Story:_ As an owner, I want the second authorization layer to cost nothing at runtime, so that workspace isolation is enforced twice without a second database role, a transaction on every read, and a credential-derivation scheme in every environment.

Documentation and scoping only, in the shape of MB.24 — which it supersedes. The mechanism it specifies lands in M6.3, its first caller.

MB.24 asked whether RLS was worth its cost, answered yes, and then found two defects that had been concealing each other. Its fix is four mechanisms: `sorrel_app` (MB.25), credentials derived by swapping user and password out of whatever `DATABASE_URL` the platform supplies, a startup catalogue assertion, and a re-entrant `withViewer` (MB.26) so a read has a transaction to be `LOCAL` to. The first three are one-off. The fourth is permanent: `BEGIN`, `set_config`, `SELECT`, `COMMIT` is four round trips where a read is one — roughly +10–15ms per `cache()`-deduped service call against Neon, and a pooled connection held for the length of every render. §4 already counts I/O wait as billable, so this is a cost in the meter as well as the latency.

**What replaces it is a type.** `assertMembership(session, workspaceId, minRole)` returns a branded `Membership` — `{ workspaceId, userId, role }` — that only the membership service can build, and every workspace-scoped finder and `AuditWriter` method takes it first and scopes itself from it, so skipping the check does not compile: impossible rather than absent, and free at runtime. DESIGN.md §8 now specifies it.

**Where it is weaker than RLS**, which §8 states: a hand-written `where` naming another workspace's ids passes the type, and `spell_ingredients` and `spell_categories` carry no `workspace_id`, so as scoped here their services load the parent spell under the proof first. Both are left to the direct-id denial tests CLAUDE.md's Testing section requires and M6.6 schedules.

**The GUC does not move.** `withAudit` keeps publishing `app.current_user_id` on every write, so RLS at the public launch (`TO_CLAUDE.md`'s "V Public") stays a single migration (§8). That was half of MB.24's argument for landing the GUC early, and that half is untouched. MB.24's analysis of `FORCE`, the role split, the `security definer` helper, the compendium's nullable `workspace_id` and the two join tables stands as the specification for when it lands; the record gets a status line, not a rewrite.

Retires MB.25, MB.26, M6.4 and M6.5 — ids kept, per the MB.19 precedent. Re-scopes M6.3 and M10.3.

_Acceptance criteria:_

- CLAUDE.md rule 3 covers `withAudit` alone; rule 5 states the service check plus the `Membership` proof, records the deferral, and drops the role-split paragraph
- CLAUDE.md's spell-visibility invariant no longer claims an RLS backstop, and its SQLite justification no longer cites RLS
- DESIGN.md §8 states the `Membership` design in place of the two-layer section, pointing at `mb.24-rls-role-split.md` as the specification for when RLS lands
- DESIGN.md §2, §4, §5, §11 and §14 corrected; §11's stubbed-`assertMembership` test becomes a `@ts-expect-error` compile assertion
- `mb.24-rls-role-split.md` carries a superseded-by line and is otherwise untouched
- `claude-docs/db.md` and `debugging.md` no longer describe a layer that does not exist
- M6.3 carries the proof and its `@ts-expect-error` test; M10.3 keeps the column and the service rule and loses its policy criteria; M0.13's story no longer cites RLS
- `withViewer`, `sorrel_app`, `DATABASE_APP_ROLE` and `FORCE ROW LEVEL SECURITY` appear nowhere outside the superseded record and struck task text
- The board agrees, and `npm run test:coverage` is green — no code changed

**MB.30 — Spike Better Auth's organization plugin for workspaces and invitations** · 2h

> **Merged — not adopted.** The six answers, with the code that produced each,
> are in [`mb.30-organization-plugin.md`](../design-decisions/mb.30-organization-plugin.md).
> No follow-up task was minted: M6.2 stands, and M6.3, M6.7 → M6.15 and
> M7.1 → M7.7 are unchanged. DESIGN.md §2's Auth row no longer names the
> plugin as the reason Better Auth was chosen, and §14 records the rejection.

_Story:_ As a developer, I want to know whether the plugin that justified choosing Better Auth can carry workspaces and invitations, so that M6 and M7 are not hand-built beside a library that already does it.

A spike: code on a throwaway branch to answer six questions, then deleted. What merges is a decision record and, if the answer is yes, one follow-up task.

DESIGN.md §2's Auth row says Better Auth was chosen because its "Organization plugin matches the workspace model". The plugin is installed and unused — M6.2 hand-rolled `workspaces` and `workspace_members` instead — and M6.7 through M7.7 are about to build the rest of it by hand. Nobody has checked whether the stated reason holds.

From the installed package it offers `allowUserToCreateOrganization` taking a predicate over the user (which is `canCreateWorkspace` verbatim), `creatorRole`, `invitationExpiresIn`, an **optional** `sendInvitationEmail` so copy-link works with no mail transport, `beforeCreateInvitation`/`afterAcceptInvitation` hooks, `YOU_CANNOT_LEAVE_THE_ORGANIZATION_AS_THE_ONLY_OWNER`, `YOU_ARE_NOT_ALLOWED_TO_INVITE_USER_WITH_THIS_ROLE`, and endpoints for create, list, invite, accept, cancel, remove-member, update-member-role and get-full-organization.

**Runs before M4.1** because `ingredients.workspaceId` is a foreign key: if the plugin's table becomes the workspace, every later FK targets it, and learning that after nine tables reference `workspaces` is a migration rather than a decision.

_Acceptance criteria:_

- `claude-docs/design-decisions/mb.30-organization-plugin.md` answers all six from running code, not from documentation: (1) does the plugin enforce slug uniqueness and format, and does `/coven/[slug]` resolve through `getFullOrganization`; (2) does the last-owner guard hold for `removeMember` and `updateMemberRole`, not only `leave`, since that is where story 11 lives; (3) does `beforeCreateInvitation` reject `owner` cleanly; (4) do the invitation states plus expiry give story 7 its three distinct reasons or collapse them into one; (5) can `setActiveOrganization` be ignored entirely, since §9 puts the workspace in the URL and not the session; (6) does `auth.api.*` work with a synthetic session inside the `db` project, where `asUser(A)` is a service-level session and the plugin's server API takes headers
- The record states the decision and what it rules out either way
- If adopted, a follow-up task is minted covering the M6.2 revert — staging-only, so a real DROP with the M1.5 acknowledgement line — and the re-scoping of M6.3, M6.7, M6.8, M6.9, M6.11, M6.14, M6.15 and M7.1 → M7.7. The cost is stated plainly: membership and invitation rows join the Better Auth tables that carry neither the audit spread nor soft delete, and the invitation id is stored as the plugin stores it, so CLAUDE.md's hash-only invariant becomes single-use, expiring and CSPRNG
- If not adopted, DESIGN.md §2's Auth row no longer claims the plugin as the reason
- The throwaway branch is deleted; no plugin wiring merges here

**MB.31 — Retire transcripts, the MW compression passes and `TASKS.csv`** · 1h

_Story:_ As a developer, I want the documentation obligations attached to every PR to be the ones that pay for themselves, so that a two-hour task does not carry an hour of bookkeeping.

Three obligations are retired, each because something already does its job:

- **The per-task transcript.** Four of them, 419 lines, feeding an archive of 55 files that `claude-docs/README.md` says never to read. A PR body carries the same narrative, is reviewed, and is searchable.
- **The scheduled compression pass.** MW.3 → MW.14, twelve hours. A sweep weeks later is a slow way to find the two statements a wave staled, and it defers the fix past the person who knows which one went wrong. The rule survives in CLAUDE.md; the schedule does not.
- **`TASKS.csv`.** 2,317 lines and 200 KB duplicating `TASKS.md`, hand-synced on every task that touches the breakdown, beside an Asana board CLAUDE.md already names as the source of truth.

The sizing rule relaxes in the same pass, for a related reason: "sized 1–2h" produced 17 process-only MB ids out of 28, several of them sub-hour fixes that should have been a line in another PR. MB.22 was already an explicit exception at 8h.

Kept deliberately: the subsystem summaries, one doc per component, decision records for contested choices, the doc-versus-code adjudication rule, and MW.15. The archive is frozen where it stands rather than deleted — MW.15 still owns retiring it.

_Acceptance criteria:_

- CLAUDE.md: the `TASKS.csv` parenthetical gone from the header and from the Asana section; the sizing convention relaxed with the sub-hour-fix rule; the transcript dropped from document-as-you-go; the compression-pass bullet replaced by correct-it-in-the-PR-that-stales-it, keeping the out-of-date test, the stand-on-its-own test and the doc-versus-code rule
- `claude-docs/README.md`: `TASKS.csv` row gone, transcripts and archive marked frozen, the compression-pass bullet replaced
- This file: the sizing standing rule added; MW.3 → MW.14 recorded as retired-not-done with ids kept, and off their wave rows — MW.1 and MW.2 stay on theirs, because they ran and that is true history; MB.29 → MB.34 in the header paragraph, the table and their own entries, placed in Wave 3 in dependency order
- `TASKS.csv` deleted. Historical task records that mention it — MB.16, MB.19, MB.24, MB.28 — keep their text: they describe what those tasks did, and rewriting them would be falsifying history rather than correcting a stale instruction
- Folded-in corrections, all sub-hour and all named in the PR body rather than given ids — the new sizing rule's first exercise: `README.md` and `Docker/Dockerfile.postgres` say PostgreSQL 18, finishing the sweep MB.16 left (the image has been `postgres:18` since a Dependabot bump); DESIGN.md §7's caching snippet is corrected for Next.js 16, where single-argument `revalidateTag` is deprecated and a type error and `updateTag` is unreachable behind a route handler; M8.7, which specified that now-uncompilable call, is corrected with it
- DESIGN.md §14 records the two proposals this review rejected, so neither is re-argued from scratch
- `npm run pre-commit` is green

**MB.32 — Collapse the five check workflows onto one matrix** · 2h

> **Merged, with one defect found later.** The collapse also deleted
> `pr-gate.yml`'s `destructive-ddl` job — not one of the five, and not
> replaced by a leg — so that check ran on nothing from 2026-09-17 until
> MB.37 folded it into this matrix. Two migrations landed ungated in between.
> Nothing in the diff looked wrong because the `changes` job kept computing
> its filters and `destructive-ddl.yml` kept existing; only the job that
> called it went. The criterion below saying `pr-gate.yml` calls `checks.yml`
> once was met, and was not sufficient.
>
> `checks.yml` is one matrix job — `checks / lint`,
> `checks / format`, `checks / typecheck`, `checks / build`,
> `checks / audit` — and `pr-gate.yml` calls it once. The summarising steps
> moved into `.github/scripts/` byte-for-byte, proven by running the old
> inline shell and the moved scripts against the same fixture logs and
> diffing their `$GITHUB_OUTPUT`; the audit comment was proven the same way
> against a stubbed API, clean, vulnerable and unparseable. Nine files went:
> five check workflows, `merge-queue.yml`, `composite-actions-check.yml` and
> both timer actions. `duration` was already optional on
> `job-summary`/`pr-comment`, so the seven workflows that had timers needed
> only their timer steps removed.
>
> **Branch protection was not touched, and the criterion below is corrected
> rather than met.** No ruleset requires any status check — the state
> `ci.md` recorded on 2026-09-10 and still true — so there was no stale
> required name to update, and enabling protection is deliberately not part
> of this task. `ci.md` records the five renamed contexts for whenever it is
> enabled.

_Story:_ As a developer, I want one workflow to describe how a check runs, so that changing how checks report is one edit rather than five.

`lint.yml`, `format.yml`, `typecheck.yml`, `build.yml` and `audit.yml` are one workflow written five times — 133 to 154 lines each, `build.yml` leaner at 92 because its summarising step is smaller: identical `image`/`pr-number`/`merge-queue`/`should-run` inputs, identical container and root-user options, identical timer, job-summary and pr-comment scaffolding. They differ in one npm script and one summarising step. MB.15 already deleted two workflows on this reasoning; this is the same observation one level up.

Three more go with them. `merge-queue.yml` re-expresses `pr-gate.yml`'s whole job graph for a merge queue that is not enabled — M7.A.1 is explicitly trigger-based and a prerequisite for nothing — so it is deleted and restored from git history when that trigger fires. `composite-actions-check.yml` is a workflow testing the composite actions that exist to de-duplicate the workflows. `timer-start`/`timer-elapsed` are 46 lines across 12 workflows to print an elapsed time into a summary.

**The `should-run` indirection survives the collapse and is not cosmetic.** `pr-gate` passes it from the paths-filter output instead of putting an `if:` on the job, because a job-level `if:` makes GitHub report a differently-named bare check that never satisfies a required status check and leaves the PR stuck. Every matrix leg runs; a leg whose flag is false exits after checkout.

_Acceptance criteria:_

- `.github/workflows/checks.yml` runs lint, format, typecheck, build and audit as one matrix job, reporting as `checks / <name>`
- Each leg's summarising step moves verbatim into `.github/scripts/`, beside `summarize-vitest.mjs` — no change to what a PR comment says
- `build`'s extras are preserved: the `.next/cache` restore, `DATABASE_URL`/`BETTER_AUTH_SECRET`, `check:stories` and `workshop:build`
- The five check workflows, `merge-queue.yml`, `composite-actions-check.yml` and both timer actions are deleted; `duration` becomes optional on `job-summary`/`pr-comment` so the remaining callers need no other edit
- `pr-gate.yml` calls `checks.yml` once, and path filtering still skips work without leaving a required check unsatisfied
- The `act-*` targets collapse to one parameterised target
- `claude-docs/ci.md` describes the new shape and records that `merge-queue.yml` is restored from git history when M7.A.1 fires
- **Any branch protection naming the old check names is updated in the same session as the merge** — the old names will never report again, and a stale required check blocks every later PR. No ruleset requires a status check today, so there is nothing to update; `ci.md` carries the new names for whenever protection is turned on
- A deliberately broken check is confirmed to comment and then minimise on fix

**MB.33 — Ban runtime `drizzle-orm` outside the repository by lint** · 1h

_Story:_ As a developer, I want the query-builder boundary enforced by the linter rather than by a regex over `git ls-files`, so that it cannot be evaded by declaration style and does not go red on every legitimate addition.

M1.20's guard reads every tracked file as text and asserts no `.select(` appears outside `repository.ts`. It is evaded by writing `const findX = () =>` instead of `function findX()`; its global regex carries `lastIndex` between files inside a `.filter()`; its brace matcher breaks on a brace in a string; and it spawns `git` with a `safe.directory` workaround because CI runs the container as root over a uid-1000 checkout.

The mechanism that makes the same thing impossible is already in the toolchain. A Drizzle query cannot be built without importing `drizzle-orm` at runtime, so a `no-restricted-imports` rule with `allowTypeImports` bans the capability rather than the spelling. It also enforces §7's "the GraphQL layer imports `drizzle-orm` for types only", which has no guard at all today, and is the same mechanism M3.9 is already scheduled to add for the repository boundary.

Kept, because the tripwires are worth more than the brittleness: the pinned export list, the every-finder-filters assertion, the single-`selectFrom` assertion, the escape hatch standing alone, the exemption-set pin, and one positive check that the rule fires. `check:theme-default` is untouched.

**Verify, do not assume, that the rule can be scoped in an `overrides` block.** `db.md` records that oxlint 1.82 _ignores_ a rule set to `"off"` inside `overrides` — which is why the existing exemptions are inline comments — and the inverse has not been tested. If enabling there is ignored too, the fallback is a top-level rule plus a file-level disable header in the `src/db/**` files that legitimately import it.

_Acceptance criteria:_

- A runtime `drizzle-orm` import from `src/services`, `src/graphql`, `src/app`, `src/components`, `src/lib` or `e2e` fails `npm run lint`; `import type` from the same places passes
- `src/db/**`, `scripts/db-seed.ts` and `drizzle.config.ts` are unaffected
- `soft-delete-finder-guard.test.ts` no longer shells out to `git` and no longer walks every tracked file; its remaining assertions over `repository.ts` are unchanged
- `lint-db-client-boundary.test.ts` spawns oxlint once rather than per case, and asserts on rule code and diagnostic count rather than message text
- `npm run test:coverage` is green and the `unit` project is faster
- `claude-docs/db.md` describes both rules and what each makes impossible

**MB.34 — Hard-delete rows in the three join tables** · 2h

_Story:_ As a developer, I want a category chip toggled off to leave no row behind, so that the highest-churn tables in the schema do not fill with tombstones nobody will ever read.

**Lands immediately before M4.4**, the first of the three tables it governs. After M4.4, M10.2 and M10.4 ship, the same change is a contract migration with an M1.5 acknowledgement line instead of a one-line schema choice.

CLAUDE.md rule 3 spreads all six audit columns into every table, join tables included. This task carves out `ingredient_categories`, `spell_categories` and `spell_ingredients`: they keep the four stamp columns and are hard-deleted, so only `deleted_at`/`deleted_by` go, and with them the partial index. The deciding cost is the `deleted_at IS NULL` a service joining _through_ such a table must remember by hand, which rule 4 cannot enforce there; the full argument, and why `workspace_members` and `ingredient_folk_names` keep all six, is DESIGN.md §5 ("Why those three and only those three") and §14's "Soft-delete the join tables too?" row. MB.110 later returned `spell_ingredients` to soft delete, so those now name two; the current shape is [`db/hard-delete-join-tables.md`](../db/hard-delete-join-tables.md).

_Acceptance criteria:_

- `src/db/audit.ts` exports `auditStampColumns`; `auditColumns` is defined as that plus the two delete columns, so the six-column spread has one definition
- `AuditWriter` gains `delete(table, where)`, typed to reject any table carrying `deletedAt` **at compile time**; `softDelete` still requires one. The escape hatch is named and narrow, in the shape of `findManyIncludingSoftDeleted`, not a flag a later edit defaults wrongly
- `findMany`/`findOne` apply `deleted_at IS NULL` where the column exists and accept tables where it does not; no finder can skip it where it applies
- `repository.test.ts` proves both directions on scratch tables, including a `@ts-expect-error` line proving `write.delete` cannot be pointed at a soft-deletable table
- M4.4, M10.2 and M10.4 name `auditStampColumns` and the composite primary key rather than the six-column spread and a partial index
- DESIGN.md §5 and CLAUDE.md rules 3 and 4 state the exception and why; §14 records it
- `npm run test:coverage` is green

**MB.35 — Make category and form groups admin-curated data** · 2h

_Story:_ As an admin, I want to add a category group myself, so that a vocabulary that grows past the eight seeded groups does not need a migration and a deploy.

Documentation and scoping only, in the shape of MB.28 — the precedent this follows exactly: the model is recorded in the design docs before the table task writes it, so the `CREATE TABLE` is transcription rather than design. Every mechanism lands in the tasks this one re-scopes.

DESIGN.md §5 and §6 modelled a category's `group` as a closed set of eight, fixed both by §6's table and by M0.7's eight `_variables.scss` colour tokens, and M4.2 transcribed it as a `category_group` pgEnum — right for a closed set, wrong once an admin may add a ninth, since adding an enum value is DDL an admin mutation cannot run (§14, "A category's `group` as a pgEnum?"). The same question applies to `ingredient_forms.group`, whose three values have already grown twice; M4.2a is the adjacent task, so both are settled here or they diverge within one wave.

Three decisions, each argued in its §14 row and specified in §5 and §6:

1. **Groups become rows, in two tables** — `category_groups` and `ingredient_form_groups`, global and admin-curated, shaped like `categories` itself. Two tables rather than one with a `kind` column, so a category pointing at a form group is a foreign-key violation rather than a blank at render time. Neither carries an order column: groups list alphabetically by `name`, for the reason [`db/categories.md`](../db/categories.md) gives.
2. **Both `groupId`s are foreign keys, where `ingredients.form` stays text** — a vocabulary a member writes is text, one only an admin writes is a foreign key. Stated in §5 in those terms, because it reads as an inconsistency next to the sentence directly above it.
3. **A group's colour is a pair of hexes on its row, one per theme**, each held to the contrast floor on its own theme's ground when written. M0.7's eight tokens become M4.3's seed values. The alternative, a runtime port of `category-group-color()` plus a contrast solver replacing its hand-tabulated per-theme trims, was rejected as more machinery than the feature earns; the cost, that an admin's ninth colour is legible but outside the rotation, is stated in §6.

_Acceptance criteria:_

- DESIGN.md §5 gains both group tables; `categories.group` and `ingredient_forms.group` become `groupId` foreign keys, with the note on why an FK is right here and wrong for `ingredients.form`
- DESIGN.md §6 reframes the eight groups as the seeded starting set, carries each group's slug, states that groups list alphabetically, and says where a seeded colour pair comes from and what an added one does not inherit
- DESIGN.md §14 gains a row per decision above, and the superseded half of the "Admins curate a third resource?" row points forward rather than contradicting the new one
- DESIGN.md's route table gains `/admin/category-groups` and `/admin/form-groups`; §5's admin paragraph and CLAUDE.md's curation invariant both name the two group vocabularies, which M6.6 asserts
- TASKS.md amends M0.7, M4.2, M4.2a, M4.3, M5.6 and M8.11 in the same pass, and adds M5.6b and MB.36
- `claude-docs/db.md` carries the model, and its `ingredient_forms` line matches
- No code changes — documentation only, and `npm run pre-commit` stays green

**MB.36 — Chip colour from the row, not the token** · 2h

_Story:_ As a user, I want a chip for a group an admin added after launch to look like every other chip, so that the taxonomy growing does not look like a bug.

Added by MB.35, and the code half of its third decision. M0.7's `semantic-tokens` mixin emits one `--group-<slug>` custom property per key of `$category-groups`, and `_primitives.scss` generates one `.chip--<slug>` class per key; both run at Sass compile time, so a group created at runtime has neither. `chip()` takes the colour pair rather than a slug, the per-slug class generation goes, and a chip carries both of its group's stored colours as inline custom properties, with the theme rule selecting one — the same per-theme switch `semantic-tokens` already does, moved from build time to the element.

Lands as early as the mechanism can be written and is adopted by each consumer in that consumer's own PR — the sweep-task rule's code half, not a retrofit. The mechanical guard is what stops the old shape coming back: nothing may reference `--group-<slug>` or `.chip--<slug>` once the colour lives on the row.

_Acceptance criteria:_

- `chip()` takes a dark and a light colour; `.chip--<slug>` class generation and the per-slug custom properties are gone, and a guard fails the build if either returns
- Both chip states keep the 1px edge, the padding and the 4.5:1 contrast behaviour M0.8 tuned — a chip wearing an arbitrary colour must still clear its own label
- The workshop story renders chips from a list of colour pairs rather than the eight slugs, and still covers both themes
- `$category-groups` survives in `_variables.scss` as the seed source M4.3 reads, with a comment saying that is now its only job

**MB.37 — Restore the destructive-DDL gate as a checks leg, scope the local run to the branch** · 2h

_Story:_ As a developer, I want the destructive-DDL check to run on the PRs it exists to gate, and a local run to tell me about my own branch, so that neither its silence nor its noise means nothing.

Minted on a report that the check "fires too much". It fired on everything locally and on nothing in CI, for two unrelated reasons, and the first hid the second.

**MB.32 deleted its calling job from `pr-gate.yml` and folded nothing in to replace it.** The `changes` job kept computing `destructive_ddl` and `destructive_ddl_migrations_files`, `destructive-ddl.yml` kept existing, and `ci.md` kept describing a check that ran on nothing — so every surface still said it was there. No PR from #104 onward has a `destructive-ddl` job; #106 and #107 each landed a migration through a gate that was not running. That is the whole argument for folding it into `checks.yml` rather than restoring the job: a leg of a matrix that five other checks depend on cannot be deleted without someone noticing.

**Locally it was permanently red, and correctly so, which is the worse failure.** With no arguments the script scanned every committed migration, and `0002_solid_marauders.sql` carries two `ADD COLUMN ... NOT NULL` with no default — a true finding, merged in PR #73 with no acknowledgement line ([`db/expand-contract.md`](../db/expand-contract.md)), since no ruleset requires the check. A gate that is always red is a gate nobody reads. The script's header already said it scans "only the ones new or changed _in this PR_"; the fallback simply did not do that. It now diffs the branch against its Gitflow base, untracked migrations included, so a task that has just run `db:generate` gets an answer about its own work. `--all` keeps the old behaviour for an audit, where staying red is the point.

Two defects found while reading the rules against CLAUDE.md rule 10, both fixed here rather than deferred, because the fix is one line each in the file already being rewritten (MB.31's sub-hour rule): the rule set knew `DROP COLUMN` and `DROP TABLE` where rule 10 says "DROP", so `0002`'s `DROP CONSTRAINT users_email_unique` passed; and every rule matched raw text, so `drop` inside a comment or a string literal fired. `DROP NOT NULL` and `DROP DEFAULT` are the two exceptions — they widen. `DROP INDEX` is deliberately **not** an exception, which is the one judgement call here: Drizzle rebuilds a changed index as a drop and a create, so an edited predicate now costs an acknowledgement line. Dropping a unique index gives up a guarantee, and saying which in one line is cheap.

CI was also being handed `migrations/meta/*.json` alongside the real migration — MB.4's defect, one layer further in. Fixed in both places: the paths filter narrows to `*.sql`, and the script ignores anything that is not, so no future caller can reintroduce it.

_Acceptance criteria:_

- `checks.yml` runs a `destructive-ddl` leg reporting as `checks / destructive-ddl`, taking `run-destructive-ddl`, `destructive-ddl-files` and `pr-body`; `destructive-ddl.yml` is deleted and `pr-gate.yml` passes all three through
- `DESTRUCTIVE_DDL_FILES` is always _set_ in CI, so an empty list scans nothing rather than falling back to the branch diff
- `npm run check:destructive-ddl` scans what the branch adds against its Gitflow base, committed and untracked; `--base` overrides it, `--all` restores the full scan, and an unresolvable base exits 2 rather than scanning everything
- Every `DROP` but `DROP NOT NULL` and `DROP DEFAULT` is flagged; comments and string literals are read as prose, not DDL; only `*.sql` is ever scanned
- `src/test/destructive-ddl-check.test.ts` covers the rules, the file-list resolution and the branch diff, and **each guard is demonstrated to fail without its mechanism** — not merely to pass with it
- `ci.md`, `db.md`, `CLAUDE.md` and the `Makefile` describe what the check now does, including that `make act-check CHECK=destructive-ddl` scans nothing locally, which the old `act-destructive-ddl` comment claimed otherwise
- Every test passes. **The usual "`npm run test:coverage` is green" is corrected rather than met**: the run has failed its 80% _function_ threshold at 79.59% since MB.32, on `src/app`'s three untested files, and PRs #104–#107 each merged with a red `vitest` leg. Untouched here — it predates this task and belongs to whichever one covers `src/app` — but named so the red leg on this PR is not mistaken for MB.37's
- Three sub-hour fixes found while reading this PR's own run ride along, named in the PR body per MB.31 and not minted as tasks: `checks / audit` now writes its report to the job summary as well as the PR comment (it wrote no summary at all since MB.32, so the audit was invisible on the run page); the build leg's Next.js cache, which had never saved once because the Alpine image's busybox `tar` rejects `--posix`, works now that the `testing` stage installs GNU `tar` and `zstd`; and every `runs-on` is pinned to `ubuntu-26.04` ahead of GitHub's 2026-10-19 move of `ubuntu-latest`, which had been annotating every job with a notice.

**MB.38 — Move the two workshop guards into Vitest** · 1h

_Story:_ As a developer, I want a mechanical guard to be an ordinary test, so that there is one place to look for "what does this repo enforce".

`scripts/check-workshop-theme-default.ts` says in its own header that it is a script rather than a test only because Vitest had not landed yet (M1.7). It has, in M1.7, and the repo's precedent for a mechanical guard is now a Vitest file in `src/test/` — `lint-db-client-boundary.test.ts` and `soft-delete-finder-guard.test.ts` both landed after it. The theme-default check also runs in pre-commit **only**, so CI has never enforced it.

Both guards move to `src/test/workshop-guards.test.ts` and both scripts go. `check:stories` stops riding on the `build` leg, since the `vitest` leg now covers it; `workshop:build` stays there, because catching a story that fails to bundle is a build-time thing and not something a test can assert.

**Pre-commit becomes lint, `format:check` and typecheck** — test-free, by decision. The alternative was running `vitest --project unit` in the hook (it needs no Postgres and takes about two seconds); a hook that runs tests is a hook people start skipping, and CI is where a gate belongs.

_Acceptance criteria:_

- `src/test/workshop-guards.test.ts` asserts every `src/components/<Name>/index.tsx` has a sibling `index.stories.tsx`, and that `.ladle/config.mjs`'s `addons.theme.defaultState` is `'dark'`
- The story guard is proven to bite on a fixture directory, not only to pass against a tree that already complies
- Both scripts and both npm scripts are gone; `pre-commit` is lint, `format:check`, typecheck; the `build` leg runs `npm run build && npm run workshop:build`
- `CLAUDE.md`, `README.md`, `workshop.md` and `ci.md` no longer name either script; M0.33/M0.35/M0.36 carry a superseded-by note rather than an edit
- Every test passes. **The usual "`npm run test:coverage` is green" is corrected rather than met**, exactly as MB.37's entry says: the run has failed its 80% _function_ threshold at 79.59% since MB.32, on `src/app`'s three untested files, which this task does not touch either — named so the red `vitest` leg on this PR is not mistaken for the moved guards failing

**MB.39 — Settle whether a job-level `if:` really renames a check** · 2h

_Story:_ As a developer, I want to know whether the rule the whole CI filtering design is built on is true, so that every path-filtered-off check stops paying for a container it never uses.

**The claim has never been verified in this repo.** "A job-level `if:` makes GitHub report a differently-named, bare check run" arrived at M0.16 (`1db422a`) as a byte-for-byte copy of `resume-2026`'s `should-run` comments — that task's decision record verified YAML parsing and a `diff` against the originals, and nothing about check-run naming. M0.20 re-cited it as upstream's comments, `ecce1f1` lifted it into `ci.md` as a general rule, and MB.32 extended it to matrix jobs. No commit, decision record or transcript describes the symptom being seen, and none could: no ruleset here has ever required a status check.

**What it costs.** The flag is resolved in the leg's first step, which runs _after_ `Initialize containers` — so a filtered-off leg pulls its image and then does nothing. Measured on run `35301237284`: 20s on `checks / typecheck`, 24s on `checks / lint`, 37s on `vitest`, 46s on `playwright`. A docs-only PR wastes all six.

**Two questions, and they are not the same question.** Every assertion in the workflow files is scoped to _the job that calls a reusable workflow_. Whether an `if:` on an **inner** job — `checks.yml`'s `check`, `vitest.yml`'s `vitest` — renames its check is unanswered, and it is the one that matters, since that is where the container is. A third question, whether a `skipped` conclusion satisfies a required check, needs a ruleset to test against and is scoped out unless the user authorises a scratch one.

Probe on a throwaway branch, PR'd into a `scratch/**` base so `pr-gate.yml` — which triggers only on `main`/`staging`/`release/**` — never fires: a `workflow_call` file with both shapes (a matrix job with `if: matrix.should-run`, and two plain jobs with `if: inputs.run-*`, the `vitest.yml` shape), and a caller triggered on `pull_request: branches: ['scratch/**']`. Whether `matrix` is even available to `jobs.<id>.if` is part of what the run answers — a startup failure naming an unrecognized `matrix` value settles the matrix half on its own.

**Adoption is not in this task.** Its scope depends on the answer, and turning `if:` on across the gate is a change to the gate rather than a finding about it.

_Acceptance criteria:_

- The verdict comes from `gh api repos/:owner/:repo/commits/<sha>/check-runs`, quoted verbatim — not read off the UI
- `claude-docs/design-decisions/mb.39-job-level-if-and-check-names.md` carries the provenance trace, the probe, the raw output and the verdict; `ci.md`'s bullet is rewritten from it
- Every surviving assertion of the rule in `checks.yml`, `pr-gate.yml`, `vitest.yml`, `playwright.yml` and this file is corrected or given a pointer to the record, in this PR (MB.31)
- Live GitHub settings are unchanged unless the user authorised a scratch ruleset; a permissions-blocked write is reported, not routed around
- The scratch branches and workflows are gone, and `gh api repos/:owner/:repo/rulesets` shows the same three rulesets with the same rule types as before
- If the rule holds, it is recorded as **verified** with the evidence — a negative result is the deliverable just as much as a positive one

**MB.40 — Custom one-off spell ingredients (schema)** · 2h

_Story 57 — As a workspace member, I want to add a one-off ingredient to a spell by name and form, so that a spell can call for something I will never stock._

A custom ingredient is a layer in the jar that carries a free-text `name` and `form` instead of pointing at an `ingredients` row. It belongs to exactly one spell, shares that spell's visibility, never appears on the workspace's ingredients page, never enters local-beats-compendium suppression, and contributes nothing to derived categories. It is one-off, not reusable, since a workspace-local `ingredients` row is already the reusable kind (story 29's stub).

**The shape is columns on `spell_ingredients`, not a table of its own.** `ingredient_id` becomes nullable and keeps its foreign key; `name` and `form` are added, `form` free text and not a foreign key for the reason `ingredients.form` is not (§14); a `num_nonnulls` check makes a row exactly one kind or the other, a second keeps `form` off a linked row, and both text columns are checked non-blank, as DESIGN.md §5 now specifies. The primary key moves from `(spell_id, ingredient_id)` to `(spell_id, layer_order)` — not every row has the pair, every row has a layer, and that pair was already a unique index — so the old layer index is dropped as redundant and no surrogate id is added. One ingredient per jar, what the old key gave, becomes a partial unique index `WHERE ingredient_id IS NOT NULL`; one custom name per jar is its mirror on `(spell_id, lower(name)) WHERE ingredient_id IS NULL`, the shape of `ingredients_workspace_label_unique`. Still `auditStampColumns`, still hard-deleted (MB.34): derived categories join _through_ this table to `ingredient_categories`, which is exactly the case that rule protects.

**Why not a separate table.** A `spell_custom_ingredients` table would leave `(spell_id, layer_order)` uniqueness absent rather than impossible, since no constraint spans tables, and split every jar read, the reorder and the GraphQL type in two. Argued in full in [`mb.40-custom-spell-ingredients.md`](../design-decisions/mb.40-custom-spell-ingredients.md), "Why not the alternatives".

**Why now.** The table is inert until Wave 13, where a fast-follow would cost a ~3–5h retrofit across ten to twelve files and a breaking change to the SDL (the record's "Decided"). It sits after M1.22 and before M1.23, the first writer of the table.

**Scope is the table, not the behaviour.** Schema, migration, schema test, docs — and the acceptance criteria of every Wave 13 task the change reaches, corrected in this PR so each builds its branch when it lands (table-then-behaviour; adopted, not retrofitted). No service, resolver, Zod or UI.

_Acceptance criteria:_

- `src/db/spell-ingredients-schema.test.ts` is rewritten first and watched red against 0014 alone: the key is `(spell_id, layer_order)` and there is no surrogate id; `ingredient_id`, `name` and `form` are nullable; both-null and both-set are refused by `spell_ingredients_ingredient_or_name`; `form` on a linked row is refused by `spell_ingredients_form_only_on_custom` where the same `form` on a custom row is accepted; a blank `name` or `form` is refused by name; a custom row and a linked row share a jar; two custom rows with distinct names share a jar; the same custom name in another case in one jar is refused by the custom-name index and accepted in another spell; the same ingredient twice is refused by the partial index rather than the key; a layer collision is refused by the key rather than an index — linked against linked, custom against linked, custom against custom; the FK, unit-enum, no-layer, sweep and hard-delete cases are kept, plus a custom row deleted by its layer
- Migration `0017` applies on top of `0016`, expand before contract: the two columns, two partial unique indexes and four checks first; then `DROP CONSTRAINT` on the old key, the new key, `DROP NOT NULL` on `ingredient_id`, and `DROP INDEX` on the old layer index — the key before the `DROP NOT NULL`, since a key column cannot be made nullable
- `npm run check:destructive-ddl` reports exactly the `DROP CONSTRAINT` and the `DROP INDEX`, both in `0017` and nothing for `DROP NOT NULL`, and the PR body carries the acknowledgement line naming both and noting the table is empty and unqueried until Wave 13
- `set_updated_at` is still attached to `spell_ingredients`, and `updated-at-trigger.test.ts` needs no edit — it applies every migration and so proves `0017` applies on top of `0016`
- DESIGN.md §5 rewrites the `spell_ingredients` paragraph; §7 defines `SpellIngredient` for the first time, with a nullable `ingredient` and a non-null `name`; §10 adds story 57 and the count becomes 45 stories (1–34, 47–57), also in §11 and CLAUDE.md; §14 gains the row
- `claude-docs/design-decisions/mb.40-custom-spell-ingredients.md` argues the key move, why no surrogate id, why hard delete still holds, the rejected alternatives, and the rules Wave 13 inherits; `db.md` corrects the M10.2 bullet and the layer-order section and gains a custom-ingredients subsection linking it
- This file: MB.40 in the Wave 4 row; M10.2's key criterion corrected with a superseded-in-part note; the Wave 13 criteria corrected — M10.1, M10.5, M10.7, M10.9, M10.10, M10.15, M10.16, M10.18, M10.19 (a third, one-off state, neither held nor not held), M10.21, MB.6, MB.8, M11.13 — and M1.23 seeds one custom row
- `npm run test:coverage` and `npm run pre-commit` are green

**MB.41 — Move Vitest tests into `tests/`** · 3h

_Story:_ As a developer, I want the test suite in one directory of its own so that `src/` holds the application and nothing else.

All 39 Vitest files live under `src/`, beside the code they cover. Playwright already sits in a top-level `e2e/`, and DESIGN.md §on testing and M1.28 already specify `tests/acceptance/` as a top-level directory — so a `tests/` root makes the repo _more_ consistent with the design doc, not less.

**The layout mirrors `src/`.** `tests/{app,components,lib,db}/` take the path of the code under test; `tests/guards/` takes the five mechanical guards and `tests/support/` the harness (`as-user`, `db-setup`, `db-global-setup`, `worker-database`, `msw/`). `src/test/` is removed; `vitest.setup.ts` stays at the repo root, a config file beside `playwright.config.ts`. Mirroring rather than flattening keeps both things that were already path-decided working unchanged: the project split stays a directory glob (`tests/db/**` → `db`), and `tests/guards/` and `tests/support/` sit two levels deep exactly as `src/test/` did, so the guards' repo-root computation is untouched.

**A test names what it wants rather than how far away it is.** Imports of the code under test go through the `@/` alias tsconfig already declared and nothing used — `vitest.config.mts` gains `resolve: { tsconfigPaths: true }`, Vite's own resolver, which supersedes the `vite-tsconfig-paths` plugin and costs no dependency. Reads from disk go through a new `tests/support/paths.ts` (`REPO_ROOT`, `fromRoot`, `MIGRATIONS_DIR`); 25 files were counting `../` chains out of their own directory, which is what made this a 25-file edit rather than a `git mv`, and is the thing that stops it being one again.

**Four silent breakers, each closed explicitly.** None of them errors — they stop working quietly, which is why each is proved by breaking it rather than by inspection. `tsconfig`'s `include` is `./src/**/*`, so `tests/` must be added or the suite silently leaves `typecheck` — the state `e2e/` is already in — and the `@ts-expect-error` compile assertions stop asserting. `.oxlintrc.json`'s overrides are all `src/**`-scoped, both the `env` blocks and the `src/db/**` one that permits runtime `drizzle-orm`; without a `tests/db/**` entry every db test becomes a rule 4 violation, and with too broad an entry the whole suite quietly gains the exemption. `pr-gate.yml`'s `vitest` filter lists `src/**`, so a test-only PR would skip the job that runs tests. And `lint-db-client-boundary.test.ts` pins its exempt file by path literal and writes its probes _inside_ the directories it names, so both arrays have to gain the new tree.

**Scope is the move and what the move breaks.** No test's assertions change. The one behaviour added is the guard that keeps the rule true.

_Acceptance criteria:_

- No `*.test.ts`/`*.test.tsx` outside `tests/`, and no `src/test/`; every file moved with `git mv` so `git log --follow` still reaches its history
- `tests/guards/test-location.test.ts` scans the git index and fails on a test file outside `tests/` — a test rather than an Oxlint rule, since Oxlint has no custom-rule API and "this file is in the wrong directory" is a statement about the tree; it asserts its own preconditions (the scan is non-empty and finds itself), because an empty scan reports the same pass. The index rather than the working tree because CI runs in a container that still holds every file deleted since its image was built (`checkout-to-app` copies over a baked `/app` without deleting), so an untracked scan reports those as violations — this move's own 34 predecessors, on the first run
- `tests/support/paths.ts` is the only place a test computes a path out of its own directory
- `npm run test:coverage` green, both projects, thresholds unchanged — the coverage `include` still reads `src/`, so the numbers are the same numbers
- `npm run pre-commit` green, and each breaker proved closed by deliberately breaking it: a type error in a `tests/` file fails `typecheck`; a runtime `drizzle-orm` import fails `lint` from `tests/lib` and passes from `tests/db`; a test file in `src/` fails the location guard; `@/db/connection` is refused by the client ban, which is why the alias is added to `CLIENT_SPECIFIERS` rather than assumed to be covered
- `pr-gate.yml`'s `vitest` filter matches `tests/**`
- Ride-along named in the PR body (MB.31): `.oxlintrc.json` listed `vitest.config.ts`, but the file is `vitest.config.mts`
- CLAUDE.md's component convention and Testing section, DESIGN.md's "Component — Vitest + RTL, colocated" heading and its two component-folder listings, `testing.md`, `workshop.md`, `ci.md`, `db.md`, `auth.md`, `components/theme-toggle.md` and the live decision records corrected in this PR; `archive/` and `transcripts/` untouched, and migration `0016`'s comment left alone as committed history

**MB.42 — CI container jobs run against files the repo has deleted** · 1h

_Story:_ As a developer, I want a CI job to see exactly the code on my branch so that a check cannot pass or fail on a file the repo no longer has.

Every container job — `vitest`, `playwright`, and all six of `checks.yml`'s legs — runs against a working tree holding every file deleted from the repo since its image was last built. `Docker/Dockerfile.node` and `Docker/Dockerfile.e2e` both bake the whole repo into `/app` with `COPY . .`; `.github/actions/checkout-to-app` then lays the checkout over it with `cp -a`, which overlays but never deletes. A file the checkout no longer contains survives on disk, untracked and not ignored.

**Two corrections to the entry as minted.** `gitflow` was named as a fourth consuming workflow and is not one: it runs on a bare `ubuntu-26.04` runner with a plain `actions/checkout` and never touches `/app` — three workflows consume the action, not four. And `checks.yml` has six legs, not four. Neither changes the bug or the fix.

**Found by MB.41**, whose location guard failed on its first CI run reporting 34 test files outside `tests/` — every one that move's own predecessor at its pre-move path. The count is the tell: 34, not that branch's 39, because the image predates the five test files added since it was built. MB.41 scans the index instead, which is right for that guard on its own merits and leaves this untouched.

**Why it went unnoticed, and why it still matters.** Until MB.41 the repo mostly added files, so the overlay was harmless; and the checks that enumerate files read _contents_ rather than _locations_, where a stale duplicate says the same thing and passes — `slug-rule.test.ts` is the example. But `oxlint` and `tsc` both walk `src/**`, so a file deleted precisely because it was wrong is still linted and typechecked: a leg can fail on a reason absent from the diff, or pass because the copy left behind is the one that satisfies it.

**The fix is no source layer in either image, and a guard that keeps it out.** `Dockerfile.node` and `Dockerfile.e2e` copy in the two manifests, run `npm ci`, and stop, so a file the branch deleted has nothing to survive _as_. `checkout-to-app` stays checkout + `cp -a`. `tests/guards/image-source-layer.test.ts` holds both Dockerfiles' `COPY`/`ADD` sources to an allowlist, with `Docker/playwright-entrypoint.sh` copied alone for `Dockerfile.e2e`'s `headed` stage so a bare `docker run` of that stage still works. The shape, and why an allowlist, is [`ci/composite-actions.md`](../ci/composite-actions.md).

**The clean-step approach was built first on this PR and replaced.** PR #133's first commits cleaned up after the source layer instead — `git clean -fd` after the copy, a `safe.directory` line when that met "dubious ownership", a `checks / overlay` job with `make act-overlay` to prove it, and MB.44 minted to remove the coverage excludes after a release. It was reversed because the layer was **shadowed everywhere but CI**, so removing it makes stale files _impossible_ where the clean made them _absent_, and because a Dockerfile change is **live on its own PR** where an action edit waits for a release; "rebuild the image more often" was rejected too. The reversal is argued in [`design-decisions/mb.42-no-source-layer.md`](../design-decisions/mb.42-no-source-layer.md).

**The coverage excludes go here too.** `vitest.config.mts` excluded `src/**/*.test.{ts,tsx}` and `src/test/**`, paths MB.41 emptied and the overlay kept alive — `include` enumerates the disk rather than the repo, and CI's container held every test file the repo had deleted; dropping them took CI from 92% to 78.54% with every test passing. With the image carrying no source they match nothing, and removing them in this PR is the proof: the number does not move. What this does **not** change is the record's "What still stands": the three guards that run `git -c safe.directory=*` stay as they are, and only the action stops running git in `/app`.

_Acceptance criteria:_

- `tests/guards/image-source-layer.test.ts` red against the two Dockerfiles as they stood, green once each carries only the manifest COPY (plus the entrypoint script in `headed`) — the guard was written first and watched fail
- Both images carry the manifests and `node_modules` only; `Dockerfile.node`'s stage banner and `Dockerfile.e2e`'s comments say where source comes from instead
- `checkout-to-app` is `actions/checkout` and `cp -a`, nothing else — no clean step, no `safe.directory`; the `overlay` job, `make act-overlay` and `pr-gate.yml`'s mention of it are gone
- `node_modules` survives the copy — no job reinstalls dependencies, and job times do not regress
- `src/**/*.test.{ts,tsx}` and `src/test/**` removed from `vitest.config.mts`'s coverage `exclude` in this PR, thresholds unchanged, and the PR body names the reported number against the 92.03% it was before — the point is that it does not move. If it does, the entries were not dead: stop and report what is still on disk in the container rather than restoring them
- All three consuming workflows (`checks`, `vitest`, `playwright`) green on the rebuilt image, on this PR
- `ci.md`, `docker.md` and `testing.md` corrected — including `ci.md`'s own "every action is exercised by the checks that use it" claim, which is what let this go unguarded; the reversal recorded in a decision record so the asymmetry CLAUDE.md warns of does not exist

**MB.43 — Map service errors to GraphQL errors with field-level detail** · 2h

_Story:_ As a workspace member, I want a rule the form could not check to come back beside the field it is about, so that a refusal from the server is as readable as one from my own browser.

**The gap this closes.** M8.8 promises "validation errors return field-level detail" and no task ever says what that detail looks like. §7's mutations return bare entities, `src/lib/errors.ts` deliberately carries no GraphQL code — "the transport decides" — and M3.1 through M3.3 mount Yoga, build the schema and set the armor limits without ever building that transport mapping. So every readable message the services are asked for (M5.2's colliding entry, M5.6/M5.6a's slug, M5.6b's column and ratio, M10.3's explaining refusal) has nowhere to go and no field to land beside, and M5.9's "errors appear beside the offending field" can only mean the resolver's own errors.

Three pieces, specified by §7's Errors subsection:

- **`ValidationError` in `src/lib/errors.ts`**, beside `Forbidden` and `NotFound`, carrying `issues: { path: (string | number)[]; message: string }[]`. **Zod-free** — it carries issues, it does not produce them, so `src/lib/` gains no dependency and a seed or a script can throw one. The Zod adapter that builds the issues list from a `ZodError` is M4.5's, in `src/lib/validation.ts` — not in any one module, since every module's schemas raise the same shape, and importing Zod for types only.
- **The mapping**, in M3.1's route, through Yoga's `maskedErrors.maskError`. Masking stays **on**: the three types leave with `extensions.code` — `VALIDATION` (plus `extensions.fieldErrors`), `FORBIDDEN`, `NOT_FOUND` — and anything else leaves masked, message and stack discarded. The service's message text is passed through verbatim; rewriting it at the transport is what turns M5.6b's ratio back into "Invalid input".
- **`mockGraphQLError(operationName, { code, fieldErrors?, message? })`** in `tests/support/msw/graphql.ts`, beside the two existing helpers, which can only answer `{ data }` today. Without it no component test can arrange a server-returned field error, which is the half of M5.9 and M10.12 that nothing currently tests.

**Why here in the order.** It is Wave 7's last GraphQL task because M3.1 must exist to hold the mapping — and it must precede Wave 8, since M5.9 is the first task that renders a server error and M8.8 the first that raises one. Landing it after either is a retrofit of both.

_Acceptance criteria:_

- `ValidationError` is distinguishable from `Forbidden` and `NotFound` by type, carries its issues, and imports nothing from Zod — asserted in `tests/lib/errors.test.ts` alongside the existing two
- A resolver throwing each of the three answers with that type's `extensions.code`; a `ValidationError` answers with `fieldErrors` matching its issues one for one, paths preserved, message verbatim
- A resolver throwing a plain `Error` answers masked — no message, no stack, no constraint name
- The refusal is still an error response: `data` is null and the operation did not write
- `mockGraphQLError` produces the shape the route itself produces — asserted against the mapping's own output, not against a hand-written fixture that can drift from it
- `auth.md`'s errors section documents all three types and names this mapping; `errors.ts`'s header comment keeps "neither type carries a status code or a GraphQL error code" and says where the code is attached instead

**MB.44 — ~~Release to `main`, then drop the coverage excludes MB.42 made dead~~** · **RETIRED 2026-09-19, not done**

> **Retired without being done (MB.42's rework).** ID kept; removed from the
> Asana board. It was minted on MB.42's first shape — a `git clean` step in
> `checkout-to-app`, which every caller resolves at `@main`, so the two
> coverage excludes the fix made dead could only go once a release had carried
> it there. The reworked MB.42 removes the source layer from the images
> instead, and `pr-gate.yml` builds the image content-addressed per PR, so the
> fix is live on the PR that makes it and nothing waits on a release. The
> excludes went in MB.42's own PR, with the unchanged number as the proof.
>
> **What survives it.** A release is still worth cutting on its own terms —
> everything that has accumulated on `staging` protects nothing until it is
> on `main` — via `/create-release`, as a release rather than as this task.

**MB.45 — `vercel pull --git-branch` is rejected on the production target** · 1h

_Story:_ As a maintainer, I want a push to `main` to reach production so that a merged release actually ships.

Every push to `main` fails at `vercel pull` with ``Invalid request: `target` must be "preview" when specifying a `gitBranch` ``. Branch-scoped environment variables are a Preview-only Vercel feature, and MB.27 added `--git-branch="$GIT_BRANCH"` to both workflows unconditionally while `resolve-target` emits `git_branch=main` for the production arm. v0.2.0 merged and was tagged but never deployed: `migrate` dies at the pull, and `deploy` is gated behind it, so production still serves v0.1.1 — stale rather than broken, since code and schema still agree.

MB.27's own commit recorded two acceptance criteria as open, both needing live Vercel access. This is one of them, found the only way it could be.

**Two steps, not one command with an optional flag.** Each workflow pulls through a preview arm and a production arm, selected by a YAML `if:` on the resolved environment. The condition is then data `tests/guards/vercel-pull-git-branch.test.ts` already parses, each arm spells its `--environment` literally so an invocation can be classified, and the run's step list shows which fired. `== 'preview'` rather than `!= 'production'`, so a third environment skips both arms and fails at `migrate.yml`'s existing named error rather than silently pulling the wrong one.

Two shapes were rejected. Making `git-branch` optional and gating on emptiness reintroduces exactly what MB.27 fixed — a caller that forgets it gets the environment-wide value and nothing fails. Computing a `--git-branch=…` string in `resolve-target` and interpolating it would mean the flag never appears as literal text on any line the guard's `INVOCATION` regex matches, so the sweep goes blind on the half that can only be made absent.

_Acceptance criteria:_

- The guard rewritten rather than deleted, written first and watched fail — six of its seven sweep assertions red against the workflows as they stood
- New assertion: a pull naming `--environment=production` carries no `--git-branch`, with the Vercel error quoted in the comment so nobody re-adds it
- New assertion: each arm's `if:` names the same target its command does — what makes the pairing structural rather than two `run:` lines that happen to agree
- MB.27's assertions kept, narrowed to preview; the sweep precondition becomes two pulls per workflow
- The honest limit stated in the test header: a YAML `if:` is still text to this test, so it proves the conditions are complementary and paired, not that GitHub evaluates them as written
- `ci.md`, `secrets.md` and `m1.1-neon-branch-strategy.md` corrected, the last superseded in place
- **Not done when CI is green.** MB.27 shipped green and broke production; the criterion is a live deploy on `main`

**MB.46 — CI cannot see what `vercel pull` actually returned** · 2h

_Story:_ As a maintainer, I want CI to state what the pull returned and refuse what it cannot use, so that a bad environment fails by name instead of inside someone else's stack trace.

Re-scoped mid-task. It began as "CI accepts a placeholder as a database connection string" — `migrate.yml`'s load step guarded `[ -z "$db_url" ]` and nothing else, so Vercel's `[SENSITIVE]` placeholder, a quote the `sed` failed to strip, or a `psql '…'` wrapper pasted from the Neon console all reached drizzle-kit, which died on `new URL()`. **MB.45's own PR showed the defect is wider than `DATABASE_URL`**: `migrate` passed on a hotfix preview while `deploy` failed on the same pull at `vercel build` with `BETTER_AUTH_SECRET is not set` — and the last staging deploy before MB.27 added `--git-branch` had that secret, and even warned it was low-entropy.

**The common defect is that nothing between the pull and its consumer could say what the pull returned.** `migrate.yml` masked the value before anything could print it; `deploy.yml` never read the file at all. That is why MB.27 dropping variables took a production outage to surface: one job said `ERR_INVALID_URL` with its input shown as `***`, the other said a secret was unset, and neither said which variables had survived.

So `scripts/assert-pulled-env.ts` does two things, and the second is the one worth having. It **asserts** the keys a job needs, each failing with its own named cause. It **reports** every key the pull returned — classification and length, never a value — and prints that report even when the run is about to fail.

A script rather than shell, because this repo tests scripts and cannot test a `run:` block. Its input is a **file path**, never argv and never an env var carrying the value: argv is visible to `ps` and echoed by `set -x`. Because it reads the file itself and provably never prints a value, it is safe to run **before** the mask exists — which is a stronger guarantee than the sequencing this task was originally specified with, and replaces it.

_Acceptance criteria:_

- Tests written before the script and watched fail — 38 of 40 green on the first run of the implementation, the two red ones being the workflow sweep, which the wiring then satisfied
- A case per rule, plus green cases for a Neon pooled URL, the local compose URL, and a `%`-escaped password
- **No value ever printed**, asserted rather than intended: every failure message and every report line checked against a realistic secret, including the cases where the rejected value is a real connection string wearing a wrapper
- A placeholder's message says a Sensitive Vercel variable is unreadable _by design_ and that a retry will not fix it — it is not a flake
- Every failure collected rather than stopping at the first, so one run names every unusable key
- `deploy.yml` requires `BETTER_AUTH_SECRET` as well, because `vercel build` runs `next build` with `NODE_ENV=production` and traces `/api/auth/[...all]` → `src/lib/auth.ts` → `src/db/connection.ts` — `auth.ts` throws on an unset secret and `connection.ts` calls `postgres()` at module scope, which parses eagerly
- A directory sweep ties the assertion to the pull rather than to these two workflows, so the next pull added without one fails in the diff that adds it

Stacked on MB.45. Its PR targets `main` and `staging` and carries MB.45's commit until that merges — deliberate, because a PR based on the MB.45 branch would not trigger `deploy.yml`, which only runs on PRs into `main`, and the preview deploy is the run this task exists to read.

**MB.47 — CI cannot read the Sensitive Vercel variables it needs** · 2h

_Story:_ As a maintainer, I want CI to hold the two values Vercel will not give it, so that a migration and a build can run without turning off a security setting.

`DATABASE_URL` and `BETTER_AUTH_SECRET` are marked Sensitive in Vercel. A Sensitive variable cannot be read back by `vercel pull` — that is what the setting means, not a fault to route around. The pull writes the literal string `[SENSITIVE]`, which is non-empty and so passes any check that only asks whether something is set; that is how it reached drizzle-kit and produced an `ERR_INVALID_URL` with its own input masked out of the stack trace, and how it reached `vercel build` and produced `BETTER_AUTH_SECRET is not set`.

**A diagnostic branch settled it.** Using MB.46's reporter, it pulled staging's preview environment both with and without `--git-branch` in one run: `DATABASE_URL` came back as `[SENSITIVE]` either way, and the flag changed only which _other_ keys resolved. That also answered two things the plan had wrong. `--git-branch` must stay — the two GitHub OAuth secrets exist only as `staging`-branch-scoped rows and vanish from an unscoped pull — so MB.45's two-arm split stands. And an earlier reading of this bug had blamed Sensitive, then withdrawn it because the "3 Secret values" count did not change between a passing and a failing run. That reasoning was wrong: the count describes whichever set that pull resolved, and the two modes resolve different sets.

**CI keeps its own copy of exactly the two values it cannot read.** `DATABASE_URL_PRODUCTION` and `DATABASE_URL_STAGING`, because it differs per target; `BETTER_AUTH_SECRET`, one value for both. The runtime is untouched — a deployed function reads its environment from the platform, not from the pulled file — so the Sensitive flag stays on and only CI changes.

**Named secrets rather than GitHub Environments.** The environment version was built first and reverted: it needed a new `workflow_call` input, a new `resolve-target` output and an `environment:` key on two jobs, to express what a secret's name already says. The three GitHub Environments that exist stay Vercel's.

`deploy.yml` writes the values **into the pulled dotfile** rather than exporting them, since the file is what reaches the Next build. The hotfix-preview arm has no named secret — its Neon branch is created per deployment — so it falls back to the pulled `POSTGRES_URL`, which the integration provides and which is _not_ Sensitive.

_Acceptance criteria:_

- Guard written first and watched fail, asserting the selection rather than the values: production chosen by the Vercel environment and not the branch name, staging by the branch, the fallback present, a named error when every source is empty, and the mask before the export
- The two workflows assert to select **identically** — M1.1's "Cross-task impact" in mechanical form, since choosing differently migrates one database and serves another
- The override runs after the pull and before both the build and MB.46's assertion, so the assertion checks the file the build will actually read
- `secrets.md` rewritten: its claim that "no separate GitHub Actions copy of `DATABASE_URL` is needed" is what this task disproves, and the two-places rotation cost is written in as a rule rather than hoped away
- `secrets.md`'s `BETTER_AUTH_SECRET` row corrected — it specified a separate Preview value, and one shared value is now a deliberate decision with its reasoning recorded, plus the known low-entropy value as an explicit pre-launch item
- **Not done when CI is green.** The criterion is a live `staging` push that migrates against the staging database, and a `main` push that reaches production

_Deferred, recorded so it is not re-derived:_ pulling connection strings from Neon directly (`GET /projects/{id}/connection_uri?branch_id=…`) would put the credential in exactly one place and cover ephemeral branches too, retiring both `DATABASE_URL_*` secrets. The keys exist since MB.12, but it would put the snapshot key on every deploy's path, a broader credential than one connection string, and would not replace `BETTER_AUTH_SECRET` regardless.

**MB.48 — A destructive-DDL acknowledgement does not survive the release PR** · 3h

_Story:_ As a reviewer, I want a destructive migration to carry its own acknowledgement so that the gate still works at the release, not only at the PR that wrote it.

Release 0.2.0's PR failed `checks / destructive-ddl` and was merged past it. `resolveDefaultBase()` maps `release/*` to `origin/main`, so a release PR rescans every migration since the last release — 17 files, 5 destructive statements in `0002` and `0017`. The acknowledgement lives only in a PR body. #126 acknowledged `0017`; #73 never acknowledged `0002`, having merged before MB.37 restored the gate. So "carry the acknowledgement forward from the staging PR" could not have worked: one of the two never existed.

**Not urgent, and the entry should say why.** With the release merged, both migrations are in `origin/main` and the next release will not rescan them — the instance is self-resolving. What remains is the class: the next destructive migration hits the same wall at the next release, and at every `main-sync/*` PR carrying a hotfix migration.

**The acknowledgement moves beside the migration**, as `src/db/migrations/<tag>.ack.md`. A PR body is the wrong home for a fact about a file: visible from one branch base, gone on merge. The scanner's pathspec is already `*.sql`, so sidecars are never scanned; and because `ACK_LINE_RE` anchors at line start, a Markdown sidecar matches it unchanged where an in-`.sql` comment would not. Findings group by file, so an acknowledgement covers exactly the migration it was written for — strictly stronger than today, where one line blesses every finding in the diff, which is precisely how a release carrying acknowledged `0017` and unacknowledged `0002` would have passed on `0017`'s line alone.

**The PR-body path is retired, not OR-ed.** An `OR` keeps the uncorrelated hole open, and with two migrations carrying findings there is nothing to migrate. The check then depends on GitHub not at all, so `make act-check CHECK=destructive-ddl` finally proves the scan rather than the wiring, and `--all` becomes a usable audit instead of permanently red.

_Acceptance criteria:_

- Per-file correlation cases written first and watched fail: two files with one acknowledged exits 1; sidecar absent; sidecar present with an empty reason; a sidecar for another migration does not cover this one
- Both sidecars written — `0017` ports #126's wording, `0002` is new and says it was written retroactively and why
- `npm run check:destructive-ddl -- --all` green with both, red again when one is deleted — the proof the sidecar is load-bearing rather than decorative
- CLAUDE.md rule 10 and `ci.md` updated; `db.md`'s claim that `0002` "was acknowledged when [it] landed" corrected — #73 carries no acknowledgement and never did, so the **doc** is what is wrong
- Sized at 3h rather than split for the sake of the number, per CLAUDE.md

**MB.49 — `drizzle-kit` fails silently, so a bad `DATABASE_URL` has no cause** · 1h

_Story:_ As whoever is on the end of a failed deploy, I want a failed migration to name what went wrong so that I can fix it instead of guessing at it.

Staging's migration failed after MB.45–47 and the log said this, in full:

```
Using 'postgres' driver for database querying
[⣟] applying migrations...
##[error]Process completed with exit code 1.
```

No error, no code, no message — `drizzle-kit migrate` catches whatever postgres.js threw and exits 1. Reproduced locally, **an unreachable host, a wrong password, `sslmode=require` against a server with no TLS, and `channel_binding=require` all produce byte-identical output.** Four different fixes, one indistinguishable failure. That is why MB.45, MB.46 and MB.47 each ended on a hypothesis rather than a diagnosis, and it is the actual defect: not any one bad URL, but that a bad URL cannot be told from a bad network.

**A connectivity probe, before the consumer.** `scripts/probe-database.ts` opens the connection itself and runs `select 1`, printing the driver's own error code and message on failure and the role, database and server version on success. `ECONNREFUSED`, `ENOTFOUND`, `28P01`, `3D000` and `42704` are five different problems with five different fixes, and naming which one happened is the whole task. Fatal in `migrate.yml`, where a migration cannot proceed without a connection; advisory in `deploy.yml`, where a build issues no query and failing on a transient blip would trade one outage for another.

**It validates the _resolved_ URL, which is the gap MB.47 reopened.** MB.46's validator only ever saw the file `vercel pull` wrote; MB.47 then took `DATABASE_URL` from a GitHub secret and handed it straight to drizzle-kit, so a malformed secret failed exactly as silently as a malformed pull used to — one task after the gap was closed, by its own successor. `Resolve DATABASE_URL` now writes whichever value won to `$RUNNER_TEMP/resolved.env` under `umask 077`, and the probe reads that. A file path rather than argv or a step `env:`, for MB.46's reasons.

**`channel_binding` gets a named rule rather than a note.** It is a libpq _client-side_ option that postgres.js passes through to the server, which answers `42704` ([`ci/deploy.md`](../ci/deploy.md) has the mechanism). Neon's console adds it by default, so it will recur — and it is cheaper to reject in the validator, before a connection is attempted, than to diagnose from a 42704 afterwards.

_Acceptance criteria:_

- Tests written first and watched fail — the `channel_binding` rule against `validateDatabaseUrl`, the probe's error-description and scrubbing helpers, and the workflow sweep
- The probe runs in `migrate.yml` before `Apply pending migrations` and in `deploy.yml` before `Build`, fatal in the first and advisory in the second, asserted apart
- Its output names the driver's error code and message and **never** the URL — asserted against a realistic connection string rather than intended, including errors that quote the URL, the password and the userinfo back at it. The hostname is deliberately kept: `ENOTFOUND` without the name it failed to resolve is the same silence this task exists to end
- `validateDatabaseUrl` gains the client-only-parameter rule, with a green case for a Neon pooled URL carrying `sslmode=require` alone — postgres.js consumes that one, and rejecting it would break every working string in the project
- The resolved `DATABASE_URL` is validated whatever its source, secret or pulled `POSTGRES_URL`, pinned by a guard — the point is that the gap cannot reopen a second time
- Docs corrected: `ci.md` and `db.md` on what a failed migration now tells you, `secrets.md` on deleting `channel_binding` from what the Neon console hands you
- **Not done when CI is green** — done when a live staging push either migrates, or fails with a named cause somebody can act on

**MB.50 — Make code comments concise; move the arguments into `claude-docs/`** · 6h

_Story:_ As someone reading this code, I want a comment to tell me what the code is and why it is not the obvious alternative, so that I can follow a file without a board or a decision-record index open.

Comments are 28% of the lines in scope — 7,905 of 27,847 across 203 tracked files, which is two thirds the volume of `claude-docs/` itself and much of it paraphrase of the docs it already cites. Two problems, and they are not the same problem. **Verbosity:** eight paragraphs are duplicated near-verbatim across 3–16 files each, the M1.27 template boilerplate alone running ~120 lines across 16 db test files. **Task-reference clutter:** board identifiers and scheduling narrative — `The table is inert at Wave 3. Nothing queries it until M10.5's service and M10.9's queries land in Wave 13` — are threaded through nearly every schema, seed and test file, and mean nothing to a human reading the code.

**The rule is a division of labour, not a length limit**: the comment keeps the conclusion and `claude-docs/` the argument, as [`README.md`](../README.md)'s "Comments in code" now states it. It inverts nothing there: a summary still gives its reason in a clause and stands on its own. CLAUDE.md had **no rule about comments at all**, which is why the prose grew — so the convention lands first, and the sweep cites it.

**What brevity may not cost** is that section's list, kept whatever its length; in this sweep it also covers oxlint's `overrides` replacing rather than merging, a job-level `if:` renaming a check and permanently blocking a PR, the Ladle `@type` JSDoc and shebangs.

**The dangling citations are the finding, and there are fourteen.** Scoping expected four; the guard found `.ladle/` citing m0.30, m0.32 and m0.34 as well, plus `tests/app/api/auth/[...all]/route.test.ts` citing `claude-docs/transcripts/auth.md`, which has never existed — so a hand-verification of the real OAuth URL shape is described as "recorded" nowhere. Thirteen of the fourteen resolve only under `claude-docs/archive/`, and were cited **without** the `archive/` prefix: the path was wrong and the destination is out of bounds, README.md having declared the archive never-read. Those comments are long precisely because the live doc was never written, so the prose moves into `styling.md`, `workshop.md` and `testing.md` and the citations are repointed.

**A guard on citation, deliberately none on density.** `tests/guards/doc-citation.test.ts` fails a `claude-docs/` path that does not resolve, points into `archive/`, wraps across two comment lines, or names a section heading that was never written. Density cannot be guarded without penalising exactly the comments the rule protects, so it stays prose enforced in review — a conscious deviation from the sweep-task rule's "mechanism plus a mechanical guard" default, recorded here rather than left to be noticed. The guard also makes MW.15's `grep -r 'claude-docs/archive'` criterion continuous instead of a one-time check at close-out.

_Acceptance criteria:_

- The guard is written first and watched fail — it finds all fourteen dangling citations and all four wrapped ones before anything is fixed
- CLAUDE.md carries the comment convention; `claude-docs/README.md` carries the code-vs-doc division of labour and says prose leaving a comment lands in a live summary, never in `archive/`
- The eight duplicated paragraphs collapse to one pointer each
- Task-reference narrative gone; a task ID survives only as provenance for a constraint that would otherwise look arbitrary
- Prose relocated per subsystem, **doc section written first and trim second in the same commit**, so no intermediate commit has lost the reasoning
- Coverage summary **counts** identical before and after — 185/201 statements, 49/52 branches, 73/83 functions, 183/199 lines. Comments are not executable, so any drift means non-comment code moved
- `make help` renders the full target list; `workshop:build`, `test:stories` and `check:destructive-ddl` green
- Out of scope, and the PR says so: `src/db/migrations/*.sql` (drizzle hashes migration file content, so editing one to fix a comment is not the harmless change it looks like), `claude-docs/archive/**`, and any non-comment code change

**MB.51 — Deduplicate the db-test harness, seed logic and image-build workflows** · 6h

_Story:_ As someone maintaining this repo, I want the scaffolding that every schema test, seed scenario and image-build workflow repeats to exist once, so that adding a table, a vocabulary or an image means writing what is new about it and nothing else.

Measured before scoping, so the work goes where the duplication actually is — the request was a repo-wide DRY pass on the impression that `src/` was bloated, and the measurement said otherwise. `src/` is 4,893 lines of which 1,799 are comments (MB.50's subject) and ~1,686 are seed reference data; the ~1,100 lines of application logic left are already factored — one `selectFrom`, one `auditColumns` definition, `slugify` as the package, no hand-rolled date, merge, chunk or case helper anywhere. Nor is the schema's declarative repetition a target: the uuid-PK block, the `deleted_at IS NULL` predicate and the FK triples repeat because drizzle-kit reads them literally, and a helper would hide the table's shape from the one reader that needs it. The repetition is in three other places. **Tests:** `tests/db/*-schema.test.ts` is 12 files and 4,839 lines, and 1,211 of its 2,546 substantive lines are shared with another schema test — `failureOf` byte-identical in 11 files, `columnNames` in 9, the `AUDIT_COLUMNS` array in 8, the connect/teardown pair in 10; `spell-categories-schema` and `ingredient-categories-schema` are one file with one word swapped. **Seeds:** `categories.ts` and `forms.ts` carry the same four functions with tables swapped, differing by one Prettier line-wrap; the insert-what-is-missing idiom is hand-written 13 times and the transaction preamble five. **CI:** the image-build step sequence appears three times and the Vercel secrets guard three times differing in one word.

**The harness lives under `tests/db/support/`, not `tests/support/`.** `tests/support/` may not import `drizzle-orm` at runtime — `tests/guards/lint-db-client-boundary.test.ts` probes exactly that — and `getTableConfig` is what the shared lookups are built on. The new directory joins the guard's `EXEMPT` probe list rather than the ban being loosened. The connection helper binds into each file's existing `let sql` from inside its own `beforeAll`, so no call site changes and no proxy object is introduced; it is per-file because `db-setup.ts` re-clones the worker database `WITH (FORCE)` before every file, which kills any longer-lived connection.

**The audit-column assertions become one sweep, not a shared helper.** Eight files repeat "spreads the shared audit columns" and ten repeat "references users.id from every audit id"; each reads Drizzle metadata only. A `describeAuditedTable(spells)` one-liner could be deleted in review without anything looking wrong, and shared functions would leave eight copies of one claim that still miss the next table. `tests/db/audit-columns.test.ts` holds the twelve audited and three join tables as transcribed object lists, asserts both the Drizzle and the catalogue side per table, and is added first, proven to fail three ways, and only then are the copies deleted — a deleted `it()` whose claim the sweep does not make is this task's failure mode.

**Seed helpers stay under `src/db/seed/`** because that directory is coverage-excluded; a helper anywhere else under `src/` would owe its own 80% and turn a tidy-up into a test-writing task. `insertMissing` takes the caller's own existence query on purpose — the call sites scope by `inArray`, by workspace, by `isNull(workspace_id)` and by a case-folded name, and each honours or ignores `deleted_at` on its own terms. The data literals do not move.

**One PR, by explicit decision.** The rule is one task per PR; this bundles three areas because the user chose it after the conflict was raised, in the shape MB.22 records. It is based on MB.50's branch rather than on `staging` because MB.50 rewrote the comments in every file it touches.

_Acceptance criteria:_

- The audit-columns sweep lands before any per-file copy is deleted, and its three deliberate-breakage runs — the spread removed from a schema file, `deleted_at` added to a join table, an unaudited table added to the audited list — are recorded red in the PR body
- Every deleted per-file `it()` has its claim traced to a sweep assertion, `deleted_by` undefined on the join tables in particular
- `AUDIT_COLUMNS` in the harness is a literal list, never derived from `src/db/audit.ts`
- `tests/db/seed/*.test.ts` pass unmodified across the seed refactor
- Each image-build workflow's buildx cache key is byte-identical before and after
- The hoisted or added checkout that lets the guard become a composite action is the one behaviour change, kept in its own commit
- `vercel pull` steps untouched; `vercel-pull-git-branch.test.ts` and `doc-citation.test.ts` green
- `testing.md`, `db.md` and `ci.md` corrected in the same PR; the job-level container and service repetition recorded in `ci.md` as inexpressible rather than left to be re-proposed
- `npm run test:coverage` green with the threshold unmoved — neither scope can move it, so a change means something else broke

**MB.52 — Admin user list page** · 2h

_Story:_ As a site admin, I want a list of everyone who has signed in, so that I can act on a person without being sent their id.

**Nothing tasks this page and two tasks already assume it.** M5.8's "users awaiting approval are findable" is written as a criterion of the approval control rather than of a surface that exists, and MB.53 needs somewhere to pick an impersonation target. `/admin/users` joins `/admin/compendium`, `/admin/categories` and `/admin/forms` in M5.4's nav, which gains a fourth entry here.

**It is a read, so M5.7's sweep does not reach it.** That task gates every admin _mutation_ at the service and again at the Pothos layer; a list query is neither, so this page carries its own service-level admin assertion and its own non-admin rejection test. The list is not a fifth admin capability either — CLAUDE.md's invariant says an admin curates the compendium, the categories and the two vocabularies "and nothing else", which governs what an admin may _change_. Reading who has an account is what the role already implies, and the page offers no control over any workspace.

**Not Better Auth's `listUsers`.** The `admin` plugin ships one, and reaching for it would put a database read outside `src/db/repository.ts` and a browser-initiated read outside `/api/graphql` — rules 2 and 1 in one call. The list is an ordinary service plus an ordinary GraphQL query, paginated through M3.6's cursor helper like every other list (rule 8). `User.email` is behind a Pothos auth scope; this page is the first consumer that legitimately passes it, so the scope is exercised here for the first time rather than worked around.

_Acceptance criteria:_

- `/admin/users` lists name, email, role, `canCreateWorkspace`, created-at, the providers linked to the account and whether the email is verified, server-rendered through a service, sorted stably. The provider and verified columns are what an admin granting admin (MB.59) is asked to judge by
- The list paginates through the M3.6 helper — default 25, no offset in the cursor — and is not fetched unbounded
- Filter by name or email substring, and a filter for `canCreateWorkspace = false`, which is the curation to-do list M5.8 acts on
- Soft-deleted users do not appear, and the finder does not filter at the call site (rule 4)
- A non-admin is refused at the service, by direct query and not merely by the page being unreachable; the test asserts why the read could have succeeded — the users exist, the fixture is populated, and the same call as E returns them
- `User.email` resolves through its existing auth scope rather than a second path around it
- M5.4's nav and layout list `/admin/users` as a fourth admin resource
- `auth.md` documents the page and states that it confers no workspace access

**MB.53 — Impersonate a user outside production** · 3h

_Story:_ As a site admin, I want to sign in as a specific user in local, hotfix preview and staging, so that I can reproduce what they are seeing instead of guessing at it from their description.

Better Auth's `admin` plugin already carries this — `impersonateUser`, `stopImpersonating`, and a `session.impersonated_by` column to hang them on — so the work is the gate, the column, the audit question and the way back out, not the mechanism.

**`NODE_ENV` is the wrong signal, and using it would fail silently.** `next build` and `next start` always run at `NODE_ENV=production` (`auth.md`, "Config"), so every Vercel build is production by that measure — staging and the hotfix previews included. A `NODE_ENV !== 'production'` gate would therefore switch impersonation off in two of the three environments this task exists to serve, and on in none of them that matter. The gate reads the deploy target instead: `VERCEL_ENV`, which is `production` only on the `main` deploy, `preview` for staging and every `hotfix-<slug>` alias, and unset locally.

**Two conditions, both required, defaulting to off.** The plugin is registered only when `ENABLE_IMPERSONATION` is explicitly set _and_ `VERCEL_ENV !== 'production'` — the belt-and-braces shape rule 5 and M5.7 already use, for the same reason: one mis-scoped Vercel variable should not be the whole defence. Unset means the plugin is never constructed, so `/api/auth/admin/*` is absent rather than refusing — impossible over forbidden, which is the sweep-task rule's own test.

**It is not a third access path.** Impersonation swaps the session cookie, which a GraphQL mutation cannot do cleanly, and it lands under `/api/auth/*` — the one exception rule 1 already names. Worth stating because it looks like a new one: nothing else moves off GraphQL, and the user list it is driven from is MB.52's ordinary query.

**The audit stamps the impersonated user, and says so twice.** `created_by`/`updated_by` record whoever the session is acting as — stamping the admin instead would mean impersonation no longer reproduces what the user would see, which is the whole point. So that the acting admin is not lost with the session row, `withAudit` publishes `app.impersonated_by` beside `app.current_user_id`, from the session and never a request body, through the same `set_config(..., true)`. Like that GUC, it has no reader in v1 and is published anyway, for rule 3's reason (`.claude/rules/database.md`).

**The way out cannot live in the admin nav.** Impersonating a non-admin costs the admin `/admin` for the duration — correct, and precisely why a persistent banner naming the impersonated user and carrying Stop belongs outside it, on every page.

**Two things to answer from running code rather than from the plugin's documentation**, in MB.30's idiom: whether the plugin's `role` handling accepts the existing `user_role` pgEnum unmapped, since its default values and ours are both `user` and `admin`; and whether its ban endpoints can be left unregistered. v1 has no ban story, so the three ban columns the plugin's schema expects are not added — if they cannot be declined, they land nullable and the migration says in its own comment that nothing in v1 reads them.

**Impersonation is the only thing the plugin may expose.** Registering it also mounts `set-role`, `update-user`, `remove-user`, `create-user`, `set-user-password`, `list-users`, `get-user`, the session listing and revoking endpoints, and `has-permission`. On staging and previews, `set-role` would be a second way to grant admin: it writes through the adapter, outside `withAudit`, M2.9's ledger and the bootstrap admin's protection, and `remove-user` could hard-delete the primary admin ([`design-decisions/m2.9-granting-admin.md`](../design-decisions/m2.9-granting-admin.md)). So only `impersonate-user` and `stop-impersonating` stay reachable. The test checks what is mounted against those two by name, rather than checking a list of blocked paths, so an upgrade that adds an endpoint fails the test instead of going through unnoticed. `allowImpersonatingAdmins` stays at its default, off, so an admin cannot take on another admin's session, the primary admin's included.

_Acceptance criteria:_

- Migration adds `sessions.impersonated_by uuid references users.id`, nullable and additive — no acknowledgement sidecar, since nothing is dropped or narrowed. `sessions` carries neither the audit spread nor `set_updated_at`, so `updated-at-trigger.test.ts` is unchanged, and the schema test asserts the column and its FK
- The gate is asserted in all four combinations: flag set with `VERCEL_ENV` unset and `preview` register the plugin; flag set with `VERCEL_ENV=production`, and the flag unset at any target, do not — and in the negative cases the endpoint is **absent**, not merely refusing
- A non-admin cannot impersonate even where the plugin is registered, asserted against the endpoint itself rather than the missing UI
- An admin impersonating B sees what B sees: B's workspaces, B's grimoire, and no `/admin`
- A write made while impersonating B stamps B in `created_by`/`updated_by`, and `app.impersonated_by` carries the admin — asserted inside the transaction, since the GUC is transaction-local
- Stop returns the admin to their own session with `impersonated_by` cleared, and is reachable from every page, `/admin` included
- The banner names the impersonated user and is present on every page while a session carries `impersonated_by`
- Ban endpoints are not reachable; if the plugin cannot decline them, the reason is recorded and the unused columns are named as unused
- Of the plugin's `/api/auth/admin/*` endpoints, only `impersonate-user` and `stop-impersonating` are reachable. The test compares the mounted set against that allowlist, so an endpoint a Better Auth upgrade adds fails it. `set-role` answering is asserted absent in particular, since it would grant admin outside `withAudit` and M2.9's ledger
- Impersonating a user who is an admin is refused, asserted against the endpoint
- `secrets.md` gains the `ENABLE_IMPERSONATION` row for all three environments and states it must never be set on Production; `auth.md` gains an impersonation section covering the gate, the audit semantics and the way out; DESIGN.md §14 records the decision, `NODE_ENV` included as the rejected signal

**MB.54 — Set the account's email: prefilled from the provider, editable, verified before it counts** · 3h

_Stories 58 and 59 — As a new user, I want the email the site knows me by to be prefilled from my provider but mine to change, and to prove it's mine before it counts, so that a provider that shares no address, or the wrong one, is not a dead end._

Minted during M2.6 as "collect an email address when a provider returns none": Discord returns an email only for an account with a verified one, Facebook can withhold it under the permissions granted, and the callback then fails as `?error=email_not_found`, a readable but dead-end sentence in `src/lib/sign-in.ts`. **Re-scoped by M2.9 to follow MB.61's follow-ups, and by MB.61 to a page rather than an interstitial** ([`design-decisions/mb.61-email-verification-and-delivery.md`](../design-decisions/mb.61-email-verification-and-delivery.md)). An unverified account has a session and is provisional (MB.66, MB.67), so there is no pending identity to hold across a round trip: the account exists, and `/account/email`, protected, is where its address is set. It shows the provider's address if there is one and whether it is verified, lets the user change it through a `setEmail` mutation to a service under `withAudit`, and resends the verification mail through Better Auth's server API; the address counts only once MB.66's verification confirms it, from a session holding that row. A provider that returns no address no longer dead-ends: `mapProfileToUser` yields the placeholder `<providerAccountId>@pending.invalid`, which can never be mailed or matched, so the row and session exist and the page asks. The same page, reached from the account later, is how a user changes their email (story 59), which is why there is no separate change-email task: Better Auth's `changeEmail` stays pinned off (MB.60) and this page replaces it.

**Moved from Wave 6 to the end of Wave 7, after MB.43**, when starting it found the mutation had nowhere to go: `setEmail(email): User!` needs M3.1's `/api/graphql` and M3.10's `User` type, and rule 1 rules out a server action or a route of our own in their place. Building the service and the page first would have left a no-email user on a form that cannot submit, which is the dead end this task exists to remove.

Two criteria from the earlier draft go. "The bootstrap address is refused outright" is unnecessary, since typing it is harmless: verifying it is the promotion (MB.68), and only its owner's inbox can. "No partial `users` row survives an abandoned interstitial" is MB.67's sweep, which clears every provisional row the same way.

**Corrected while building, in MB.54's own PR:** the criterion that a change "marks the row unverified" would have put an established account under MB.67's sweep — unverified and older than the three-hour cap, it is hard-deleted on the next OAuth callback by anyone or, its audit foreign keys being `NO ACTION`, fails the whole sweep statement from then on. So a change writes nothing to `users.email`. The service mints Better Auth's own change token (`updateTo`, `requestType: change-email-verification`), mails the new address, and `/verify-email` swaps the address and verifies it in one write from a session holding the row — gated by a `hooks.before`, since Better Auth's change branch calls no `beforeEmailVerification` and mints a session for an opener with none. A provisional caller's window is still restarted first, so the link cannot outlive the row. Every unverified sign-in lands on `/account/email` with its address prefilled, not only one with no address, and the placeholder is `<providerId>-<providerAccountId>@pending.invalid`. The "resend through Better Auth's server API" in the description holds for the row's own unverified address only. The approved plan is [`design-decisions/mb.54-plan.md`](../design-decisions/mb.54-plan.md).

_Acceptance criteria:_

- A provider callback with no email lands on `/account/email` with an empty field instead of the dead-end error, and the `email_not_found` mapping in `src/lib/sign-in.ts` goes; one with an unverified email lands there too, prefilled and editable, and a verified one lands where it asked
- Asking for a new address writes nothing to `users.email` and leaves a verified row verified: the new address is mailed a change link, and the row carries it, verified, only once that link is followed from a session holding the row — asserted by reading `email` and `emailVerified` before and after, and by the sweep leaving an established account alone; a provisional caller's window is restarted through `withAudit` first
- An address already held by a live verified account is refused with a message, asserted with the other account present; one held by a provisional account is not, since that row will lapse
- The placeholder address is never mailed and never matches an invitation, asserted
- One verification mail a minute per account, whichever path would send it: `users.verification_sent_at` is stamped by every mail sent for the row's own account and cleared by the write that verifies it, `setEmail` refuses the next within the minute with a field error naming the wait, and Better Auth's resend endpoint sends nothing inside it; asserted through the service and through the endpoint. The form starts its countdown from the seconds the page reports and counts its own sends down too
- `/send-verification-email` answers 401 to anyone but the session holding the address, asserted from no session and from another account's
- An unverified account reaches no page but `/account/email`: `requireSession()` sends it there from any other page with that page's path as `next`, asserted in `tests/lib/request-session.test.ts`
- A followed link lands on the page's confirmed view (`?verified`): the address and Continue, no field; a verified account that comes back sees the field alone. A link opened from a signed-out browser goes to `/sign-in` with a sentence saying to sign in and open it again, and nothing from the link in the URL
- The form uses no native validation: an empty or malformed field is the server's refusal, shown beside the input like every other
- A signed-in user can reach the same page to change their email, with the same rules
- Covered by a component test with role and label queries, and stories 58 and 59's acceptance tests pass in a new `tests/acceptance/08-email-and-admin.test.ts`

**MB.55 — Scan both provider availability states in the e2e accessibility run** · 2h

_Story:_ As a developer, I want the e2e accessibility scan to cover a sign-in page whose providers _are_ configured, so that a brand-coloured button's contrast is checked by CI rather than by whoever happens to have credentials in `.env.local`.

`playwright.yml` sets `BETTER_AUTH_SECRET` and nothing else, so `configuredProviders()` returns empty and every provider button renders greyed — which drops the brand-colour class entirely (`SignInPanel/index.tsx`'s `className` comment). The brand-coloured state, which is the only state a real user sees, is therefore never scanned: `sign-in.spec.ts`'s two axe tests pass in CI because the colours under test are not on the page.

Found during MB.12, when registering the four OAuth applications put real client ids in a local `.env.local` and the same suite immediately failed on white-on-`#1877f2` at 4.23:1 — a genuine WCAG AA violation CI had passed three times. This task is the reason it was invisible, and it also carries the fix: #156 merged before the colour change could ride along in it.

The trap is that simply adding placeholder credentials inverts the gap rather than closing it: the greyed state has its own accessibility surface — `aria-disabled` keeping a button in the tab order, the `.sign-in-panel__note` text, and Facebook's transparent-chip wrinkle — and that is what the existing keyboard test's rationale rests on. Both states need covering, so the page has to be reachable in each within one run. Placeholder ids must also never reach a real authorization endpoint: nothing may click a provider button in the configured state.

It carries one more M2.6 leftover. The error-state test's bare `getByRole('alert')` matches two elements — the panel's own error and the empty `role="alert"` route announcer Next portals into `<body>` on every page — and fails Playwright's strict mode. #156 merged with that leg red, since no ruleset requires a status check (MB.39), and every PR since has been path-filtered out of the leg, so it is red on `staging` without showing it.

_Acceptance criteria:_

- An axe scan runs against the sign-in page with all four providers configured, and against it with none configured
- The brand-coloured resting **and** hover states are what the configured scan sees, not the greyed fallback
- No test clicks a provider button while placeholder credentials are set
- The greyed state keeps its existing keyboard and `aria-disabled` coverage
- The Facebook button is `#0866ff` (4.82:1) at rest and `#0653d4` on hover, and the error-state test's alert query is scoped to the page's own `main`
- A contrast regression on any brand button fails CI — demonstrated by reverting `#0866ff` to `#1877f2` and watching it fail
- `claude-docs/components/sign-in-panel.md` records which state each scan covers

**MB.56 — Rebuild the Asana board mechanism for the free Personal plan** · 6h

_Story:_ As someone running this board, I want task lookup and status to keep working on Asana's free Personal plan, so that the branch and PR skills do not break with the downgrade.

The workspace dropped to the free Personal plan, which puts custom fields and advanced search behind the paywall. `Status`, `Task ID` and `Type` are still present and still visible in the web UI, frozen at their last values, but the API no longer returns them at all — `opt_fields=custom_fields` comes back with neither the key nor an error — and `asana_search_tasks` returns `payment_required`. All four Asana-touching skills used that search to find a task by id and the `Status` field to record progress, so every one of them broke at once. Nothing was deleted and nothing here can delete them: the MCP server exposes no field-management tool, so the fields stay visible and stale until the plan changes back.

**Status moves into the task name.** A marker prefixes it: `▶ ` for `In Progress`, `◔ ` for `In Review`, nothing for `Not Started`, and the completed checkbox — which survived the downgrade — still carries `Completed`. Tags remain free on this plan but the MCP server exposes no tag tool, so they cannot be set programmatically; sections were rejected because the board already spends them on `Waves`, `Bugfixes` and `Pre-Wave Complete`, and the task notes were rejected because a board card does not show them, which is the whole point of an at-a-glance status.

**Lookup replaces search with the wave notes.** A wave card's notes already open with the ids it contains, so `asana_get_tasks` over the project finds the wave and one `asana_get_task` on it finds the subtask — two calls, deterministic, and more reliable than the fuzzy text search it replaces. It holds only under exact id-segment matching: thirty of the board's ids are a strict prefix of another (`M2.1` and `M2.10`, `M4.1` and `M4.1a`, `M0.1` and `M0.30`), so a `startsWith` test silently picks the wrong task. A CSV export taken before the downgrade confirmed all 266 ids already begin their task's name, with no duplicates — so the convention was already true and only needed writing down.

**`Type` is gone and is deliberately not replaced by an id rule.** All four historical `Hotfix` tasks were `MB.*`, and `MB.*` covers ordinary bugfixes too, so the prefix cannot decide it. `start-task` routes on what the task itself says and asks when that is ambiguous, rather than inferring a base branch and being wrong about it after there are commits on one.

**The fields could not be removed, so the project was replaced.** A downgraded project keeps whatever custom fields it had, and a free plan cannot shed them: `POST /projects/:gid/removeCustomFieldSetting` answers `402 custom_fields_premium_only`, `GET /projects/:gid/custom_field_settings` answers `402 Custom Field Settings are not available for free users`, and the web UI routes the same click to an upgrade page. Neither the MCP server nor a personal access token changes that — it is the plan, not the credential. So the board was rebuilt into a new project, which on a free plan starts with no fields and cannot be given any: 290 tasks with their names, notes, completion state, section and subtask nesting, plus all 395 comments. The original is archived rather than deleted, which keeps every pre-rebuild task permalink resolving — an older PR body's Asana link still lands somewhere real.

**What the rebuild costs, stated here rather than discovered later.** Task GIDs change, so `CLAUDE.md` and the four skills are repointed in this task. `created_at` and `completed_at` reset to the rebuild date on every task. A story's timestamp cannot be set through the API, so each migrated comment opens with `[YYYY-MM-DD HH:MM UTC]` and its own metadata reads as the rebuild date — on anything older than the rebuild, the bracket is the true date. Asana's own system stories (`changed Status from …`, `added to project`) are not recreated; they narrated the fields that caused this.

_Acceptance criteria:_

- No skill calls `asana_search_tasks` or writes a `custom_fields` value
- `start-task`, `create-feature`, `create-hotfix` and `create-pr` each find a task by id through the two-call lookup
- A status transition rewrites only the marker, never the id or title
- `CLAUDE.md`'s Asana section documents the markers, the lookup and the board's three sections
- The board's in-flight tasks carry the marker matching their real state
- The project carries no custom fields, and the pre-rebuild project is archived rather than deleted
- Task count, completion count, subtask nesting and comment count each match the source board exactly

**MB.57 — Build the public entry page at `/`** · 2h

_Story:_ As a visitor who is not signed in, I want `/` to tell me what Sorrel & Salt is and how to get in, so that the front door is neither a bare sign-in form nor an empty splash.

Minted during M2.7. Route protection first treated `/` as DESIGN.md §9 does — the post-sign-in landing — and redirected a signed-out visitor to `/sign-in`. It was then directed to leave `/` public as the site's general entry page, so M2.7 lists `/` in the proxy's `PUBLIC_ROUTES` (`tests/proxy.test.ts` pins it) and `/` is still the static splash it has been since M0. This task builds the page that stands there.

The design question is the one M2.7 left open: §9 also makes `/` the post-sign-in landing, where M2.8 puts its three states — into the workspace, the create form, or the invite-only explanation. Either `/` renders the entry content signed out and M2.8's states signed in, reading the session with `getSession()` (never `requireSession()`, which would make it protected again), or the post-sign-in landing moves to its own route and `/sign-in`'s default `next` moves with it. Decide which, and correct §9, M2.8's entry and story 2's acceptance test (which reads `src/app/page.tsx`) to match in this task's PR.

_Acceptance criteria:_

- `/` renders for a signed-out visitor without a redirect, says what the site is, and says plainly that it is invite-only
- It offers a clear way to `/sign-in`
- A signed-in visitor is not asked to sign in again
- `/` stays in `PUBLIC_ROUTES`, and reads the session (if at all) with `getSession()`
- Where the post-sign-in landing lives is decided and recorded: DESIGN.md §9's `/` row, M2.8's entry and story 2's test agree with it
- Component test with role and label queries only; axe scan passes

**Decided:** the landing moves to `/coven` and `/` stays the front door ([`design-decisions/mb.57-post-sign-in-landing.md`](../design-decisions/mb.57-post-sign-in-landing.md)).

**MB.58 — The admin role ledger (schema)** · 1h

_Story:_ As a site admin, I want every change to who is an admin recorded where a later edit cannot overwrite it, so that "who made this person an admin" still has an answer after their row has changed again.

M2.9's table half ([`design-decisions/m2.9-granting-admin.md`](../design-decisions/m2.9-granting-admin.md)). `users.updated_by` is overwritten by the next update to the row, and M5.8's approval control is the first one, so a grant's provenance would last only until then. The ledger is one table recording one privilege. It is not the v2 edit history.

`admin_role_changes`: `id`, `userId` → `users.id`, `change` (`bootstrap` | `grant` | `revoke`, a pgEnum because the set is closed), `note` (nullable text), plus the full `...auditColumns` spread like every non-join table. `created_by` is the actor and `created_at` is when. Nothing in v1 updates or deletes a row. The repository exposes no update or delete for the table, because `sorrel` owns its tables and a `REVOKE` would not bind it. The migration backfills a `bootstrap` row for every existing live admin, stamped as that admin, so the ledger has no gap at its start.

**Rider: the seed's bootstrap user is demoted to `role: 'user'`.** Every seed needs a creator row, since every `created_by` is `NOT NULL` and references `users.id`, so the row stays. But nothing needs it to be an admin: it has no OAuth account, it is unverified, so Better Auth refuses to link anything to it, and nobody can sign in as it. As an admin it would be a revocable row on `/admin/users` and a backfilled ledger row for an account no one can use. `minimal` becomes one system user and one user; its test and the three docs that say "one admin" change with it.

_Acceptance criteria:_

- Migration creates the table, its enum and its `CREATE OR REPLACE TRIGGER` line for `set_updated_at`, so `updated-at-trigger.test.ts` stays green without an edit
- Every existing live admin has exactly one `bootstrap` row after migration, asserted against the seeded template's admins
- The schema test asserts the columns, the enum values and the foreign key
- The repository offers an insert and a read for the table and nothing that updates or deletes it, asserted at the type level
- The seed's bootstrap user has `role: 'user'` in every scenario, a test asserts no OAuth sign-in can reach it, and `minimal`'s test and docs say one system user and one user
- Additive only, so no acknowledgement sidecar

**MB.59 — Grant and revoke admin** · 3h

_Story:_ As a site admin, I want to make another user an admin, or stop one being one, from the user list, so that promoting a second admin does not mean editing an environment variable and redeploying.

This is the behaviour half of M2.9. It builds on MB.58's table and MB.60's primary admin, and adds a control to MB.52's `/admin/users` next to the one M5.8 puts on the same row. The decision, and the approaches it rejected, are in [`design-decisions/m2.9-granting-admin.md`](../design-decisions/m2.9-granting-admin.md).

A `setUserRole` service sits behind an admin-only GraphQL mutation, writes through `withAudit`, and appends a ledger row in the same transaction. Any admin may grant admin to any live user, verified or not, and confirming who they are from MB.52's list is the granting admin's job; a grant also sets `canCreateWorkspace`, and a revoke leaves it. Any admin may revoke any other admin, themselves included, **except the primary admin** — the live admin whose email matches `ADMIN_BOOTSTRAP_EMAIL` when the check runs — whom no one can revoke. **A count guards the gap** a change of the variable opens: the service also refuses any revoke that would leave zero live admins, counting under a `for update` lock on the live admin rows. MB.60's sign-in promotion and MB.68's verification promotion call this same service with the user's own session, so each `bootstrap` row is written through `withAudit`, and the `standard` seed writes one for fixture E. Why each rule is what it is: the record's "The primary admin", "Granting" and "Revoking".

_Acceptance criteria:_

- An admin can grant admin to a user and revoke it from `/admin/users`, with a confirmation that names the user. Granting does not require the grantee's email to be verified
- Each change appends one ledger row naming the subject, the direction, the actor (taken from the session) and the time. A request body cannot set the actor
- Granting admin to someone who is already an admin, or revoking it from someone who isn't, is refused with a message and writes no ledger row
- Revoking the primary admin is refused for every caller, the primary admin included, with an explaining `Forbidden` in plain language that names no variable. The test asserts the target is a live admin who could otherwise have been revoked
- Revoking the last live admin is refused with an explaining `Forbidden`, asserted with the primary admin absent from the fixture so the count is what refuses. Two concurrent transactions revoking the only two admins leave exactly one, asserted with real concurrent transactions
- The primary admin's row carries a "Primary admin" label. Its revoke control stays visible but `aria-disabled`, with the same plain-language reason beside it, and activating it states the reason rather than doing nothing
- After `ADMIN_BOOTSTRAP_EMAIL` changes, the previous primary admin is still an admin and can now be revoked like any other
- A revoked admin's next request is refused at `/admin` and at every admin mutation, with no new session issued. A test pins that `session.cookieCache` is off, since enabling it would reopen that window; it sits in `tests/lib/auth.test.ts`'s "session lifetimes" block beside MB.76's pins
- Granting sets `canCreateWorkspace` to `true` and is audited as such; revoking leaves it, workspace memberships, and the `created_by` of everything the admin wrote untouched
- A non-admin cannot reach the control, the mutation or the ledger read. The test asserts why the call could have succeeded
- A primary-admin promotion at sign-in or at first-party verification (MB.68) produces a `bootstrap` ledger row through `withAudit`, and so does fixture E in the `standard` seed
- Stories 60 and 61's acceptance tests pass
- The mutation carries M5.7's Pothos admin scope as well as the service check
- `auth.md` documents granting, revoking, the primary admin's protection, the count fallback, how to change the primary admin (set the variable, redeploy, then a Google or Discord sign-in, or a verification by mail, by the new address) and the ledger. It also records that any future user-deletion path must refuse the primary admin

**MB.60 — Promote the primary admin at sign-in, from Google or Discord only** · 2h

_Story:_ As the site owner, I want only someone who has proved they own `ADMIN_BOOTSTRAP_EMAIL` to be made admin by it, so that an unverified sign-up cannot claim admin before I sign in.

M2.9 found the defect ([`design-decisions/m2.9-granting-admin.md`](../design-decisions/m2.9-granting-admin.md)). Today `src/lib/auth.ts`'s sign-up hook promotes whichever new user carries the address, whether or not the provider verified it, and it runs at account creation only, so the variable can name one admin ever. Both are open until the owner has an account, and a database reset opens them again. They go live when MB.12 sets the variable in a deployed environment, so this task lands before MB.12.

**Only Google and Discord qualify**: Facebook never reports an address verified, and Microsoft is excluded on purpose, since its `common` tenant lets an attacker's own Entra tenant assert any email. The record's "The primary admin" gives each provider's case. MB.61's first-party verification is what would let the other providers in.

**Promotion moves from account creation to sign-in, and writes through `withAudit`.** It runs in Better Auth's after-callback hook, at one comparison per sign-in and no query, and decides on the provider's fresh profile at the callback, never the stored `users.emailVerified`. The hook builds an ordinary `Session` for the now-authenticated user and calls the role service (a stub until MB.59) inside `withAudit`, stamped as the user, so the create-time promotion goes and rule 3 keeps two identity bootstraps. Promoting at sign-in is what makes changing the variable work: the new address is promoted at its next qualifying sign-in even if the account already exists, and the previous primary admin keeps `role: 'admin'`, no longer protected (MB.59). A non-qualifying match signs in as an ordinary user, and the reason is logged against the user id, never the address. The record argues the hook, the fresh profile and the silent log ("The primary admin").

_As built:_ the after hook's `newSession.user` is the stored row, so the fresh profile reaches it from `user.validateUserInfo`, the one hook Better Auth calls with it, through a per-request `defineRequestState` store — still no query ([`auth.md`](../auth.md), "Promotion at sign-in"). The write needed a ninth `AuditWriter` method, `updateById`, since a service cannot build `id = $1`. "At most one live row" is a `users_email_lower_case` check constraint (migration 0019). Wiring the service surfaced a latent bug, fixed in the same PR: `repository.ts` entered the `audit.ts` ↔ `schema/users.ts` cycle from the wrong side, so a repository-first import built `users` without its audit columns ([`db.md`](../db.md), "The seed module").

**The squat is left open until MB.61's follow-ups, deliberately.** Refusing an unverified account that holds the address, and mapping the `account_not_linked` code, were both in this task's first draft and move to those follow-ups, since first-party verification lands before launch and settles squatting for every address; MB.54's typed-address form now follows it. The hole that stays until then is the record's "What is simplified, and the hole it leaves"; pre-launch the site has no users who could open it.

_Acceptance criteria:_

- A user whose email matches `ADMIN_BOOTSTRAP_EMAIL` (case-insensitively) is promoted at a sign-in whose provider profile is Google or Discord with `emailVerified` true, whether the account is new or already existed
- The same email arriving through Microsoft or Facebook, or through Google or Discord unverified, is not promoted and signs in as an ordinary user. The test asserts the Google case promotes, so each refusal is shown to be the provider rule and not a mismatch
- The promotion is decided on the callback's provider profile: a stored row with `emailVerified` true and a non-qualifying provider is not promoted
- The promotion writes through `withAudit` with the signed-in user's own session; no new `oxlint-disable` and no third identity bootstrap
- An already-admin user is not rewritten on sign-in, and a non-matching user is never promoted
- At most one live `users` row matches the variable, asserted against a mixed-case row inserted by hand
- With `ADMIN_BOOTSTRAP_EMAIL` unset, the app refuses to start in every deployed environment: production, staging and hotfix previews. The check keys on `NODE_ENV=production`, as `BETTER_AUTH_SECRET`'s does, so it also covers CI's `build` leg, `playwright.yml` and compose's `e2e` service, and each of those sets a fixed placeholder on the reserved `.invalid` domain. `next dev` and Vitest are exempt, and an unset variable there promotes nobody. The test asserts both sides
- `user.changeEmail.enabled`, every provider's `overrideUserInfoOnSignIn`, and `accountLinking.trustedProviders` are pinned off by test, with a comment naming what each would move
- `auth.md` and `secrets.md` describe the Google-or-Discord, at-sign-in promotion, the squat left open and why, and what changing the variable does

**MB.61 — Scope first-party email verification and email invitations** · 3h

_Stories 58, 59 and 62, and story 4 — As the site owner, I want a considered plan for verifying email addresses ourselves, so that an address can be trusted whichever provider it arrived through, invitations can go by email, and the shortcuts M2.9 had to take can be undone._

_Decided:_ [`design-decisions/mb.61-email-verification-and-delivery.md`](../design-decisions/mb.61-email-verification-and-delivery.md), with the approved plan beside it as [`design-decisions/mb.61-plan.md`](../design-decisions/mb.61-plan.md). Follow-ups MB.65 through MB.70; M7.3, M7.4 and M7.5 rewritten in place; MB.54 re-scoped. One premise below did not survive the discovery: Better Auth's verification token is a signed JWT that is never stored, so it cannot be hashed and is not single-use, and the record argues why that is acceptable for this write where it would not be for an invitation's.

**Scoping task in M2.9's own shape: a decision doc and follow-up tasks, no code.** Today only Google's and Discord's word on an address can be trusted (MB.60); vouching for it ourselves, by mailing a link the user follows, would let the primary admin sign in through any provider, let an unverified account prove its address rather than block the owner's sign-in, let a user set or change their email (MB.54), and send workspace invitations (story 4) and M2.9's option B, an admin invitation (story 62), by email to be accepted only by the address's verified holder ([`design-decisions/m2.9-granting-admin.md`](../design-decisions/m2.9-granting-admin.md), "Email verification (MB.61)").

**It needs email delivery, which v1 has none of**, though several providers' free tiers sit well past the few mails a week this site would send. The discovery compares those free tiers against the site's real volume and against what each requires (a sending domain and its DNS records, a sandbox limited to verified recipients, or neither), and settles which one, if any, is worth the dependency. It then checks Better Auth's own `emailVerification` and `sendVerificationEmail` hooks against the rules here: the mail is sent from `/api/auth/*`, which is the one transport exception rule 1 already allows, the token must be stored hashed like an invitation's, and the verification write must be audited or argued as a third identity bootstrap, not just done. Until the follow-ups land, MB.60's rules stand as written.

_Acceptance criteria:_

- At least three delivery options compared on free-tier limits, sending-domain requirements and what happens when the limit is hit
- States what Better Auth's verification flow does out of the box, verified against the installed version and not its docs, and where it crosses rules 1 and 3
- Decides whether verification is required at sign-up, offered afterwards, or both, and what an unverified account can and cannot do meanwhile
- Covers the token's storage, expiry and single use, and what the audit trail records
- Names which of MB.60's restrictions each follow-up lifts, and which stay; decides how an unverified account holding an address is resolved when its owner signs in verified
- Re-scopes M7.3, M7.4 and M7.5 and §7's `InvitationResult` for email delivery with verified-match acceptance, and writes the admin-invitation follow-up (story 62): its table, hashed single-use expiring token, revocation, mailed link, verified-match acceptance route, and acceptance as a grant through MB.59's service with its ledger row and pause check
- Scopes MB.54's flow: the provider's address prefilled, editable, taking effect on verification, and reachable later to change it
- Ends with written follow-up tasks ready to schedule, sized like every other task here
- No implementation in this PR

**MB.62 — `site_settings` schema, with the admin-role-changes pause (schema)** · 1h

_Story:_ As the site owner, I want a place for a site-wide setting to live, so that a switch the primary admin flips does not need a redeploy or a column on somebody's user row.

M2.9's pause switch, table half ([`design-decisions/m2.9-granting-admin.md`](../design-decisions/m2.9-granting-admin.md)). One row, fixed id, `adminRoleChangesPaused boolean not null default false`, plus the full `...auditColumns` spread, so `updated_by` and `updated_at` say who last flipped it and when. Not a variable, because flipping one is a redeploy; not a column on the primary admin's row, because the primary admin moves with `ADMIN_BOOTSTRAP_EMAIL` and the switch must not. Inert until MB.63 reads it. A single-row table is enforced by a check on the fixed id, not by convention, so a second row is a constraint error rather than an ambiguity about which row is the setting.

_Acceptance criteria:_

- Migration creates the table, seeds its one row, and adds the `CREATE OR REPLACE TRIGGER` line for `set_updated_at`, so `updated-at-trigger.test.ts` stays green
- A second row is refused by a constraint, asserted by inserting one
- The schema test asserts the column, its default and the audit spread
- The repository exposes a read and an update for the row and no insert or delete, asserted at the type level
- Additive only, so no acknowledgement sidecar

**MB.63 — Pause admin role changes** · 2h

_Story 60 — As the primary admin, I want to switch admin grants and revokes off for every other admin, so that an admin account that has gone rogue cannot make more admins or remove the good ones while I sort it out._

M2.9's pause switch, behaviour half, on MB.62's row and MB.59's service ([`design-decisions/m2.9-granting-admin.md`](../design-decisions/m2.9-granting-admin.md)). Only the primary admin may flip it, and only the primary admin is exempt from it: while paused, `setUserRole` refuses a grant or a revoke from any other admin with an explaining `Forbidden` that says admin changes are paused and names nobody, and the primary admin can still do both, so it can clean up without first unpausing. The exemption costs nothing, because the primary admin is the one account a rogue admin cannot become: it is set by `ADMIN_BOOTSTRAP_EMAIL` and cannot be revoked (MB.59). Revokes are paused as well as grants because a rogue admin removing the good admins is the same attack from the other side. The control sits on `/admin/users`, visible to every admin and active only for the primary admin, with the current state stated in words beside it. The flip is written through `withAudit`, so the row's stamps record who and when; a history of flips is v2 edit history and is not kept.

_Acceptance criteria:_

- The primary admin can pause and resume admin changes from `/admin/users`, and the page states the current state in words
- A non-primary admin sees the control, cannot activate it, and is refused at the service with an explaining `Forbidden`; the test asserts the caller is a live admin who can otherwise grant
- While paused, a grant or a revoke by any other admin is refused with an explaining `Forbidden` and writes no ledger row; the test asserts the same call succeeds once resumed, so it is the pause that refuses
- While paused, the primary admin can still grant and revoke, each writing its ledger row as usual
- The flip stamps `updated_by` and `updated_at` through `withAudit`, and a request body cannot set either
- The mutation carries M5.7's Pothos admin scope as well as the service check
- `auth.md` documents the switch beside granting and revoking

**MB.64 — Reduce root-folder clutter** · 2h

Housekeeping, no behaviour change. The root had grown to fifty entries, eight of them generated output sitting beside the source. `e2e/` becomes `tests/e2e/`, beside the db, acceptance and guard suites — the rest of `tests/` stays flat, because nesting it into a `tests/vitest/` would have cost about thirty code edits and two hundred and fifty doc lines for a level that groups nothing new, and every future test path would carry the extra segment. Every generated report and build goes under one gitignored `.reports/`: Vitest's coverage and json output, Playwright's report, traces and e2e coverage, and the Ladle workshop build. `vitest.setup.ts` moves to `tests/support/setup.ts`, `TO_CLAUDE.md` to [`backlog.md`](../backlog.md), `tsc`'s incremental state to `node_modules/.cache/`, and the empty `tmp/` goes. Two things fall out of the move: `tests/e2e/` is type-checked, since tsconfig already includes `tests/**` and the suite compiled clean the moment it was tried; and pr-gate's `playwright` filter gains `tests/support/**`, which the e2e database helper imports and which never triggered it before. The configs stay at the root by decision.

_Acceptance criteria:_

- `ls` at the root shows none of `e2e`, `build`, `coverage`, `coverage-e2e`, `playwright-report`, `test-results`, `tmp`, `tsconfig.tsbuildinfo`, `TO_CLAUDE.md`, `vitest.setup.ts` or `.vitest` after a full local run
- `tests/guards/test-location.test.ts` pins Playwright specs to `tests/e2e/` the way it pins Vitest files to `tests/`, with the same precondition
- `npm run typecheck` covers `tests/e2e/`
- pr-gate's `vitest` filter skips a change confined to `tests/e2e/`, and its `playwright` filter runs on one confined to `tests/support/`
- CI's coverage and report uploads and the two summarize scripts read from `.reports/`
- Every live doc naming a moved path is corrected in the same PR

**MB.65 — Mail transport: Resend, the Mailtrap Sandbox and Mailpit over HTTP** · 2h

_Story:_ As the site owner, I want the site to send mail in production and nowhere else, so that a verification or an invitation reaches its address and a staging test never reaches a stranger.

The first of MB.61's follow-ups ([`design-decisions/mb.61-email-verification-and-delivery.md`](../design-decisions/mb.61-email-verification-and-delivery.md), "Delivery"). One module, `src/lib/mail.ts`, one function, `send({ to, subject, text, html })`, and three transports over HTTP, selected by `MAIL_TRANSPORT`: `resend` posts to Resend's API, `mailtrap-sandbox` to the Mailtrap Email Sandbox's send API, which captures and never delivers, and `mailpit` to Mailpit's `POST /api/v1/send` in compose. Unset, the message is logged and nothing is sent. No SMTP anywhere: SMTP from a Vercel function is unreliable, and every target here speaks HTTP. **The guard fails closed:** at `VERCEL_ENV=production` the module refuses any value but `resend`, at `preview` any but `mailtrap-sandbox`, and a refused transport logs and sends nothing. A send failure is logged, never thrown. Keys are read at send time — `RESEND_API_KEY` in Production, `MAILTRAP_SANDBOX_TOKEN` and `MAILTRAP_SANDBOX_ID` in Preview, all Sensitive — so neither the pulled-environment assertion nor CI holds them. The record's "Delivery" argues each. Compose gains a `mailpit` service with its UI on `:8025`; `app`, the `e2e` service, the devcontainer and `playwright.yml` set `MAIL_TRANSPORT=mailpit` and `MAILPIT_URL`; `checks.yml`'s build leg sets neither, since nothing reads them at build. A Playwright helper reads the latest message for an address from Mailpit's API, which is how stories 58, 59, 4 and 62 will follow a mailed link.

_Acceptance criteria:_

- `send` reaches each of the three transports through a mocked `fetch`, asserted per transport with the request body checked
- The environment guard is asserted both ways: production with `mailpit` and preview with `resend` both log and send nothing, and each with its permitted value sends
- Unset `MAIL_TRANSPORT` logs the message and sends nothing, and a transport error is logged and not thrown
- Compose runs Mailpit, and a Playwright helper returns the latest message to a given address from its API, exercised by one e2e spec that sends through the transport
- `secrets.md` gains the rows for `MAIL_TRANSPORT`, `MAIL_FROM`, `RESEND_API_KEY`, `MAILTRAP_SANDBOX_TOKEN` and `MAILTRAP_SANDBOX_ID`, each scoped to the one environment that reads it, and numbered steps for the Resend account with its sending-domain DNS records and for creating the sandbox
- `tests/guards/pulled-env-assertion.test.ts` is untouched, since nothing here is read at build; `docker.md` and `ci.md` name the service and the variables

**MB.66 — Turn on Better Auth email verification, audited and session-bound** · 3h

_Story 58 — As a user, I want to prove I own my email address, whichever provider I signed in with, so the site can trust it._

Bigger than the norm: configuration, three hooks, a session check and two test files. Configures `emailVerification` in `src/lib/auth.ts` with `sendVerificationEmail` sending through MB.65's transport, `expiresIn` at 3600, `autoSignInAfterVerification` off and `sendOnSignUp` on, each pinned by test. The token is Better Auth's signed JWT, never stored and not single-use; the record argues why that is acceptable for a write that flips one boolean. Verification is offered, not required for a session: no provider sets `requireEmailVerification`, an unverified user is signed in, and what needs a verified address checks the column. **Verification completes only in a browser holding a session for that account**: `beforeEmailVerification` refuses a request whose session is not the user's, closing the attack described in [`design-decisions/mb.61-email-verification-and-delivery.md`](../design-decisions/mb.61-email-verification-and-delivery.md), "The token, and who may follow the link". Facebook and Microsoft carry `mapProfileToUser: () => ({ emailVerified: false })`, so `users.emailVerified` true means Google, Discord or our own mail vouched. The `/verify-email` write carries its stamp: `beforeEmailVerification` records the user's id in MB.60's per-request store and `databaseHooks.user.update.before` merges `updatedBy` into the same statement, outside `withAudit` for the reason the create hook is and argued beside it in the record. `src/lib/sign-in.ts` maps `email_not_verified` to a sentence naming the email page. **This is the first email the site writes, so it settles the template library**: React Email (`@react-email/components`, rendered to `send`'s `html` and `text` by `@react-email/render`) is the proposed choice, kept or replaced on what this first template shows, with templates in `src/emails/` rather than `src/components/`, since a mail is not a page component. M7.3 and MB.70 reuse whatever it picks, and the choice is recorded in `claude-docs/` with the rest of this task's docs. **Folded in on request during the task, past the sub-hour ride-along size:** the mail follows the site's design — its palette, checked against the compiled theme mixins, its two fonts self-hosted with Google as the fallback, and Backdrop's photographs pre-blended per theme — dark by default and light under `prefers-color-scheme`, and each template ships a Ladle story, guarded like a component's ([`email.md`](../email.md)).

_Acceptance criteria:_

- Each `emailVerification` value is pinned by test, and `requireLocalEmailVerified` is pinned at its default
- A sign-up with an unverified address creates the row, sends one mail through the transport's test double, and still issues a session, asserted
- Following the link from a session holding that row sets `emailVerified` and stamps `updated_by` with that user's own id, asserted by reading the row; from no session or another user's session it is refused and the row is unchanged
- Facebook and Microsoft profiles arrive unverified whatever the provider reported, and Google and Discord keep their mapping, asserted per provider
- An already-verified row is untouched by a second use of the link, asserted
- `auth.md` gains a "First-party verification" section beside the promotion rules, and CLAUDE.md rule 3's bootstrap sentence names the update hook

**MB.67 — Provisional accounts: expire unverified rows and sweep them at the next callback** · 2h

_Story 58 — As the owner of an address, I want an unverified account that happens to hold it to lapse, so that it cannot block my own verified sign-in for longer than a verification window._

The squat, closed for every address. A row with `emailVerified` false and `updated_at` older than one verification lifetime is expired: a sign-up sets that clock, and a resend touches the row through `withAudit` before mailing, so every send pushes the window forward. A Better Auth `hooks.before` on `/callback/:id` sweeps every expired row before the code exchange, together with its `accounts` and `sessions` rows. It hard-deletes, decided in this task, through the repository's named `deleteProvisionalUsers`, the linked rows going by `ON DELETE CASCADE`, and stamps nothing, since no row survives to carry it. The sweep also requires a provider `accounts` row, so the seeded bootstrap admin is never reached. A resend extends the window only from a session holding the row. A three-hour cap on `created_at`, added in this task on request, sweeps a row whatever it has resent, and carries its own partial index. Why each, from the tombstone that would keep blocking the owner to the squatter resending hourly, is [`design-decisions/mb.61-email-verification-and-delivery.md`](../design-decisions/mb.61-email-verification-and-delivery.md), "Provisional accounts and the sweep". `account_not_linked` is mapped in `src/lib/sign-in.ts` to one generic sentence, the same whatever the cause: sign-in didn't work, and if you signed in before with a different provider, sign in that way and add this one under Account — wording MB.71 decided, since a sentence naming the squat would confirm that the address is taken.

_Acceptance criteria:_

- With a squatting Facebook row older than the window present, a verified Google sign-in with the same address lands in a fresh account, asserted end to end; with the row inside the window, the sign-in is refused with the mapped sentence, so it is the expiry that admits
- A resend touches `updated_at` and keeps the row past what would have been its expiry, asserted
- The swept row's `accounts` and `sessions` rows are gone, asserted, and a verified row of any age is never swept
- The partial index on the sweep predicate lands in this PR; additive, so no acknowledgement sidecar
- `auth.md` and `secrets.md` drop "have the owner sign in before anyone else can sign up with the address"

**MB.68 — Promote the primary admin at first-party verification** · 1h

_Story:_ As the site owner, I want to become the primary admin by proving I own `ADMIN_BOOTSTRAP_EMAIL`, so that I am not limited to Google or Discord.

One hook on top of MB.66. `afterEmailVerification` on the bootstrap address calls `promotePrimaryAdminAtVerification`, which shares `promotePrimaryAdmin`'s `withAudit` role write, with the user's own session, writing MB.59's `bootstrap` ledger row once MB.58 exists and a stub until then, as MB.60 did. MB.60's sign-in rule stands untouched, on the callback's fresh profile and never the stored column ([`design-decisions/mb.61-email-verification-and-delivery.md`](../design-decisions/mb.61-email-verification-and-delivery.md), "Which of MB.60's restrictions each follow-up lifts"). This is safe only because MB.66 binds verification to a session holding the row, which is why it lands after it and not with it.

_Acceptance criteria:_

- A Microsoft-only owner is promoted on following the verification link from their own session, with the ledger row written once MB.58 exists
- The same link followed from another browser is refused and promotes nobody, asserted, so it is the session binding that guards the promotion
- MB.60's promotion tests stay green unchanged
- `auth.md` and `secrets.md` describe the second promotion event, and MB.60's "squat left open" paragraph is rewritten to the new state

**MB.69 — `admin_invitations` schema** · 1h

_Story:_ As the site owner, I want admin invitations stored the way workspace invitations are, so that a leaked row cannot be redeemed and every one is accounted for.

Table half of story 62, after MB.58 (its acceptance writes a ledger row) and shaped like `workspace_invitations`: `id`, `email`, `tokenHash`, `expiresAt` defaulting to seven days, `acceptedAt`, `acceptedBy`, `revokedAt`, a `note` for why the person is being invited, and the full `...auditColumns` spread. Only the hash is stored; the token is MB.70's. Indexed on the hash, with `CREATE OR REPLACE TRIGGER` for `set_updated_at`. Inert until MB.70 reads it.

_Acceptance criteria:_

- Migration creates the table with the columns above, the partial unique index on `token_hash`, and the `set_updated_at` trigger line, so `updated-at-trigger.test.ts` stays green
- The schema test asserts the columns, the expiry default and the audit spread, and that no column holds a plaintext token
- The repository exposes insert, a finder by hash, and the two stamp updates, and no delete, asserted at the type level
- Additive only, so no acknowledgement sidecar

**MB.70 — Invite an admin by email** · 3h

_Story 62 — As an admin, I want to invite someone by email to become an admin, accepted only by an account that has proved it owns that address, so that I can promote someone who has not signed in yet without handing anyone a bearer token._

Bigger than the norm: create, mail, revoke, accept, a page and its rejections. M2.9's option B, on MB.69's table, MB.59's service, MB.63's pause and MB.65's transport. `createAdminInvitation(email, note)` is admin-only, generates the token with `crypto.randomBytes`, stores only its hash, mails the link and returns no URL; it is refused for a non-primary admin while changes are paused. `/admin-invite/[token]`, public in `src/proxy.ts`, prompts sign-in and then accepts only when the signed-in account's verified email matches the invitation's, case-insensitively; a matching unverified account is pointed at `/account/email`. Accepting is a grant through `setUserRole`, so it writes the ledger row naming the invitation, sets `canCreateWorkspace`, and is refused while paused. Expired, revoked and already-accepted tokens are rejected with distinct messages, as M7.7 does, and pending invitations are listed and revocable on `/admin/users`.

_Acceptance criteria:_

- Only an admin can create one; the link reaches the address through the transport's test double and appears in no response or query
- Creation and acceptance are both refused while changes are paused, for every admin but the primary, and the test asserts the same calls succeed once resumed
- Acceptance requires a verified matching address: the test asserts the same session unverified is pointed at the email page and a different verified address is refused, so it is the match that admits
- Acceptance writes the `grant` ledger row naming the invitation, sets `canCreateWorkspace`, stamps `acceptedAt` and `acceptedBy`, and a second use is rejected as already accepted
- Expired and revoked tokens are rejected, each distinctly, and a pending invitation can be revoked from `/admin/users` and is listed there with its note and expiry
- The mutations carry M5.7's Pothos admin scope as well as the service check, and story 62's acceptance test passes
- `auth.md` documents the invitation beside granting and revoking

**MB.71 — Link a second sign-in method from the account page** · 3h

_Story 1 — Sign in with an account I already have, so I don't manage another password: here a second account I already have, added to the same Sorrel & Salt account so either signs me in._

Minted during MB.66, on the question of what it would take for an admin who signed up through Discord to sign in through Microsoft ([`design-decisions/mb.71-plan.md`](../design-decisions/mb.71-plan.md)). First-party verification does not help, and cannot: Better Auth's implicit link at sign-in (`oauth2/link-account.mjs`) needs the _provider_ to vouch for the address, and Microsoft is pinned unverified against nOAuth (MB.60), so the row being verified is the wrong side of the equation. What works is an explicit link from a signed-in session, which Better Auth ships as `/link-social`; after it the provider signs in by its account id and its address claim is never consulted again. The link branch does not check `requireLocalEmailVerified`, so an unverified row can link too. The mechanism as built is [`auth/admin-bootstrap.md`](../auth/admin-bootstrap.md), "Linking a second provider".

The one hurdle is that the same pin makes the link branch answer `unable_to_link_account`, so every provider's mapper vouches inside a link flow, read from `better-auth/api`'s `getOAuthState()`, and keeps its own answer everywhere else. The scoping named Microsoft and Facebook alone; Google and Discord were added during the task, on request, so that a Discord account with no verified address can be linked too. `accountLinking.allowDifferentEmails` is turned on, and the row's email is untouched by a link. `trustedProviders`, `requireLocalEmailVerified`, `overrideUserInfoOnSignIn` and `updateUserInfoOnLink` stay as they are, and `validateUserInfo` skips recording the promotion profile on an explicit link, told apart by the state rather than `source.action`. The surface is a protected `/account` page with a `SignInMethods` component: the four providers, each linked or addable, with a remove control shown only when two or more are linked; `allowUnlinkingAll` stays false, pinned, so the last one cannot be removed. Better Auth 1.7's `/unlink-account` takes the `accounts` row's own id rather than the provider id, and wants a session younger than a day, which the page maps to a sentence. On the sign-in page `account_not_linked` gets one generic sentence whatever the provider and the cause, since telling a squat from a never-vouching provider would confirm which addresses are taken. MB.67 landed that sentence in place of the squat-specific one it had planned; this task keeps it, corrects `unable_to_link_account`'s wrong sentence, and moves the link-only codes to `/account`. The `/account` axe scan needed a signed-in browser no spec had had: `tests/e2e/session.ts` writes the rows a sign-in would leave and the signed session cookie.

_Acceptance criteria:_

- Signed in through Discord, linking Microsoft with a profile reporting `email_verified` false creates the `accounts` row on the same user, and a later Microsoft sign-in lands in that user, asserted end to end through `auth.handler` on `tests/support/oauth.ts`
- The same Microsoft callback with no link state over that row is still refused with `account_not_linked`, with the row asserted present and verified beforehand, so it is the pin that refuses and not a missing fixture
- A link started under user A cannot attach to user B, and `/link-social` without a session is refused
- Unlinking removes the row and that provider's sign-in is refused again; the last provider cannot be removed, asserted with the row surviving
- `allowDifferentEmails` on and `allowUnlinkingAll` off are pinned by test beside the options MB.60 pinned, which stay pinned
- `account_not_linked` maps to the one generic sentence and nothing else; `SignInMethods` has a component test with role and label queries, a story, and a Playwright axe scan of `/account`
- `auth.md` gains "Linking a second provider" beside first-party verification, and the MB.61 record and MB.67's entry are corrected

**MB.72 — Scope the mail's light-mode rules beneath the page cell** · 1h

_Story 58 — Verify my email address: here the mail that carries the link, readable in every client._

Minted after MB.66 merged, from a rendered client preview of its verification mail: in every client whose browser or system prefers light (every iPhone and the iPad, iCloud, Yahoo and AOL in Chrome, Zoho, o2.pl, Seznam.cz, Outlook.com's dark mode in Firefox) the light text, link and button rules applied and the page rule did not, leaving dark text on the dark page. MB.66's last commit had moved the page rule to a bare class on a table of the layout's own, and the preview could not show whether that landed, because the failure is the shape of the stylesheet rather than any one selector: eight independent rules on unrelated elements, any one of which a client can drop alone. The fix makes the light rules share fate. One `<td>` the layout renders carries the page colour and the class `ss-page`, and every other light rule is scoped beneath it, so a client that keeps the text rules has by construction kept the page rule too; `Body` takes `ss-body` and its own rule for the surround, which is readable either way. Dark stays the inline default, since flipping the two would move the same hazard to dark-preference clients rather than remove it.

_Acceptance criteria:_

- `ss-page` is on exactly one element, a `<td>` carrying the inline dark page colour, and every selector in the light block is `.ss-page`, `.ss-page .ss-…` or `.ss-body`, pinned by test
- No `ss-` rule exists outside the light block
- The Ladle story shows the beige page under dark text in the light theme and the dark page in the dark theme
- A fresh unspam.email client preview of the rendered mail, linked from the PR, shows the light page in the clients that failed and the dark page unchanged in Gmail, desktop Outlook, Thunderbird and Apple Mail dark
- `email.md` states the shared-fate rule and that a client preview must be checked against the branch's own markup before it is read

**MB.73 — Serve Altair at `/api/graphql` in local development** · 1h

_Story:_ As a developer, I want to explore GraphQL queries by hand as a signed-in user, with nothing to install, so that checking a query means opening a page.

The only credential the API accepts is Better Auth's session cookie, and it is `httpOnly` and `SameSite=Lax`: every desktop client — Postman, Insomnia, Bruno, Altair desktop — needs it pasted from DevTools and pasted again when the seven-day session lapses. A page the app serves same-origin gets it for free, which is what Yoga's GraphiQL already was under `next dev`. This swaps that page for [Altair](https://altairgraphql.dev/): `altair-static` renders the shell, its `<base>` points the assets at jsDelivr pinned to the installed version, so no asset route exists. The route serves it itself rather than through Yoga's `renderGraphiQL`, which never sees the request — the endpoint must be absolute because of that `<base>`, and it is taken from the `Host` header because `next dev --hostname 0.0.0.0` reports its bind address in `request.url`. `cors` stays `false`; the page is same-origin.

Two OAuth-shaped answers were rejected and are recorded so they are not re-tried. A client's own OAuth 2.0 helper _can_ sign in: Better Auth's ID-token branch of `sign-in/social` verifies a provider ID token for Google, Facebook and Microsoft (Discord declares no verification config) and answers with the cookie — but it puts the client secret inside the tool, needs a callback registered on the provider app, and can never be a fixture user. The `bearer` plugin rewrites an `Authorization` header into the same cookie, so it grants nothing a `Cookie:` header does not.

_Acceptance criteria:_

- A browser `GET` (`Accept: text/html`) at `/api/graphql` outside production serves Altair — `AltairGraphQL.init` present, the jsDelivr base pinned to the installed `altair-static` version, the endpoint absolute on the request's `Host` — and serves no IDE at `NODE_ENV=production`; the unit test stubs `NODE_ENV` each way and `tests/e2e/graphql.spec.ts` holds against the production build
- `POST` queries, `GET` queries and `cors: false` are unchanged
- `altair-static` is imported lazily, so production never loads it, and is a `serverExternalPackages` entry so its `readFileSync` of `dist/index.html` survives Turbopack
- M3.1's criterion and `graphql.md`'s IDE section say Altair
- `manual-api-testing.md`: open the endpoint signed in; switching identity; staging through the Altair browser extension, whose host permissions make its requests same-site; any desktop client by pasted cookie; why the clients' OAuth helpers are not the path. Linked from CLAUDE.md's `npm run dev` row and from `graphql.md`
- A `dev:session` script minting fixture-user cookies is named in the doc as a possible follow-up, not built

**MB.74 — Review Better Auth's plugin roster: what lands before launch, what waits** · 2h

_Story:_ As the site owner, I want each of Better Auth's plugins weighed against this site, so that the ones worth having land before launch and the rest are decided once rather than rediscovered.

_Decided:_ [`design-decisions/mb.74-better-auth-plugins.md`](../design-decisions/mb.74-better-auth-plugins.md), with the approved plan beside it as [`design-decisions/mb.74-plan.md`](../design-decisions/mb.74-plan.md). Follow-ups MB.75 through MB.78.

**Scoping task in M2.9's own shape: a decision doc and follow-up tasks, no code.** The site signs in through four OAuth providers and is invite-gated, so most of the roster has nothing to do here (DESIGN.md §14, "Which Better Auth plugins?"). The review read the installed `1.7.5` rather than its documentation and found three things that were not known: the rate limiter is already on in every deploy and counts per function instance, with a fallback that puts every visitor in one bucket when the client IP cannot be resolved; OAuth tokens sit in `accounts` in plaintext; and two-factor never challenges an OAuth sign-in. Passkeys become the v2 first-party credential in §13, in place of email and password.

_Acceptance criteria:_

- Every plugin exported by the installed version, and the separately packaged passkey, SSO, API-key and OIDC-provider plugins, is placed as adopted before launch, v2, or never, with the reason
- The findings are read from `node_modules/better-auth/dist` and cited by file
- The decisions already taken for `organization` (MB.30) and `admin` (MB.53, M2.9) are restated as unchanged
- DESIGN.md §13 and §14 and `auth.md` say what the record decided
- Ends with written follow-up tasks ready to schedule
- No implementation in this PR

**MB.75 — `rate_limits` schema for Better Auth's rate limiter** · 1h

_Story:_ As the site owner, I want sign-in attempts counted in one place, so that a burst spread across function instances is limited as one burst.

MB.74's rate-limiting decision, table half ([`design-decisions/mb.74-better-auth-plugins.md`](../design-decisions/mb.74-better-auth-plugins.md), "Rate limiting"). Better Auth's `storage: 'database'` expects a `rateLimit` model: `key` unique, `count`, and `lastRequest` as a bigint of milliseconds. It is Better Auth's adapter table, written and pruned by Better Auth alone, so it is shaped like `sessions` rather than like application data: no audit spread, no soft delete and no `set_updated_at` trigger (`auth.md`, "Tables"). Inert until MB.76 turns the storage on.

_Acceptance criteria:_

- Migration creates `rate_limits` with `id`, `key` text unique not null, `count` integer not null and `last_request` bigint not null, in the adapter's pluralised naming
- No audit columns and no `set_updated_at` trigger; `updated-at-trigger.test.ts` stays green unchanged, since the table carries no audit stamps
- The schema test asserts the columns, their types and the unique constraint on `key`
- The Drizzle table is passed to `drizzleAdapter`'s `schema` beside `sessions`, `accounts` and `verifications`
- Additive only, so no acknowledgement sidecar

**MB.76 — Pin Better Auth's rate limiter, OAuth token encryption and session lifetimes** · 2h

_Story:_ As the site owner, I want sign-in limited per visitor across every instance, and the provider tokens we store unreadable without our secret, so that neither depends on a default nobody checked.

MB.74's rate-limiting decision, behaviour half, on MB.75's table. Better Auth enables its limiter whenever `NODE_ENV` is `production`, which every Vercel build is, and by default counts in each instance's memory, which on Fluid Compute limits almost nothing. `rateLimit.storage` becomes `'database'`. The client IP is the other half: Better Auth reads `x-forwarded-for` and trusts it only when it holds one address, and otherwise keys every visitor on that path as one shared bucket, which on `/sign-in/social` is three sign-ins per ten seconds for the whole site. `advanced.ipAddress.ipAddressHeaders` is set explicitly, to the header a real deployed request carries, read from staging's request log before the value is chosen and recorded in `auth.md`. Two riders, each under an hour and named in the PR body: `account.encryptOAuthTokens` is turned on, which needs no migration because Better Auth decrypts only a value that looks encrypted and reads older plaintext rows as they are; and the session lifetimes, which DESIGN.md never set, are pinned at Better Auth's defaults by test.

_Acceptance criteria:_

- `rateLimit.enabled` and `storage: 'database'` are pinned by test
- Past the limit, `/sign-in/social` answers 429 with `X-Retry-After`, through `auth.handler` on `tests/support/oauth.ts`, and the `rate_limits` row for that key is asserted, so it is the database that counted
- Two requests from different client IPs are counted separately, asserted by their two rows; the test also shows that without `ipAddressHeaders` set they would have shared the `no-trusted-ip` bucket, so it is the pin that separates them
- `ipAddressHeaders` is set, and the PR records the header staging's requests actually carry
- `account.encryptOAuthTokens` is on and pinned; a new sign-in stores encrypted tokens, and an `accounts` row written in plaintext beforehand still reads
- `session.expiresIn` (seven days), `updateAge` (one day) and `freshAge` (one day) are pinned in `tests/lib/auth.test.ts`'s "session lifetimes" block, which MB.59's `cookieCache` pin joins
- `auth.md` gains a "Rate limiting" section

**MB.77 — Mark the last-used provider on the sign-in page** · 2h

_Story 1 — Sign in with an account I already have: here the page reminds me which of my accounts I used last time._

MB.74's one sign-in convenience ([`design-decisions/mb.74-better-auth-plugins.md`](../design-decisions/mb.74-better-auth-plugins.md), "Sign-in convenience"). When a sign-in is refused with `account_not_linked`, MB.71's sentence tells the visitor to sign in the way they did before, and the page cannot say which way: the server naming a provider would confirm that the address has an account. Better Auth's `lastLoginMethod` plugin writes a readable cookie holding the provider id whenever a callback sets the session, so the browser remembers its own last sign-in and nothing about the address is revealed. `storeInDatabase` stays off, so no `users` column is added. `lastLoginMethodClient` joins `auth-client.ts`, and `SignInPanel` marks that provider's button as last used.

_Acceptance criteria:_

- The server plugin is registered with `storeInDatabase` unset, pinned by test, and the schema gains no column
- A callback through a provider sets the cookie to that provider's id, and `/sign-in/social` alone does not, asserted through `auth.handler` on `tests/support/oauth.ts`
- `SignInPanel` marks the last-used provider's button in its accessible name, asserted with role and label queries, and marks none without the cookie; its story shows both
- A Playwright axe scan of `/sign-in` with the cookie present
- `auth.md`'s "Plugins" table marks the plugin registered

**MB.78 — OAuth proxy, so a hotfix preview can complete a real sign-in** · 3h

_Story:_ As a developer, I want to sign in to a hotfix preview, so that a fix to anything behind sign-in can be checked where it will ship, and MB.53's impersonation works there.

Every provider needs its redirect URI registered in advance, and a hotfix preview's `hotfix-<slug>.sorrelandsalt.com` does not exist until its PR does, so no hotfix preview can finish a sign-in today (`secrets.md`). Better Auth's `oAuthProxy` sends the provider's callback to a fixed `productionURL` whose URI is registered, where the code is exchanged and the profile encrypted, then redirects to the preview's own `/callback/:id/oauth-proxy`, which creates the user and session there. The redirect target must be a trusted origin, and `baseURL.allowedHosts` already names `hotfix-*.sorrelandsalt.com`. `productionURL` is staging's origin, which shares the Preview secret with every hotfix preview. The plugin is registered only at `VERCEL_ENV=preview`, the gate MB.53 uses, so at production and locally it is never constructed and its endpoint is absent rather than refusing. Two things to answer from running code: the preview completes on `/callback/:id/oauth-proxy`, which `src/lib/auth.ts`'s hooks do not match, so the provisional-account sweep and the promotion at sign-in do not run there; and staging's own callback also runs its hooks against a request it did not start. The record says what each means and whether either hook should also match the proxy path.

_Acceptance criteria:_

- Registered only when `VERCEL_ENV=preview`, asserted in both directions, with the endpoint absent, not refusing, at `production` and with `VERCEL_ENV` unset
- `productionURL` is staging's origin, pinned by test
- A real sign-in completes on a hotfix preview, and a recording or screenshot is linked from the PR
- Which of `src/lib/auth.ts`'s callback hooks run on each side is asserted, and the decision on whether they should also match the proxy path is written into the MB.74 record
- `secrets.md` and `auth.md` drop "hotfix previews can't complete a real sign-in" and say how they do; MB.53's entry names MB.78 as what makes it usable on a hotfix preview

**MB.79 — Record subscription billing as a v2 feature and the Stripe plugin's fit** · 1h

_Story:_ As the owner, I want to know whether Better Auth's Stripe plugin can carry the subscriptions I mean to charge, so that the requirements and the answer are written down before any of it is scheduled.

Minted on request, from the question of whether the plugin could bill workspace owners by member count, with free months, workspaces free until an admin clears them, and a discount for people in several workspaces. The plugin was read from its documentation and source, not installed or run. It carries the Stripe customer, Checkout, the billing portal, webhook verification and per-seat pricing at checkout. Its seat resync hangs off the organization plugin's member hooks, which MB.30 rejected; its trial is per plan and once per customer; it has no exemption and no discount field; and it writes its tables outside `withAudit` and serves browser routes under `/api/auth/subscription/*`. Nothing in v1 changes and no hook is left. The one open question, the plugin or a thin service over the Stripe SDK, is for a test-mode spike in MB.30's shape when the work is scheduled.

_Acceptance criteria:_

- DESIGN.md §1 lists subscription billing as deferred; §13 gains a Subscription billing subsection stating the five requirements, the plugin's fit against each, its structural costs, and what is decided now against what is left to the spike; §14 gains a row; §15 gains a bullet
- CLAUDE.md's out-of-scope list names subscription billing
- `backlog.md` carries the item under V2, and `claude-docs/README.md`'s description of the backlog says so
- MB.74's record and `auth.md`'s plugin table name the Stripe plugin and point here, so the roster MB.74 reviewed is complete
- The diff touches only Markdown

**MB.80 — Re-scope the compendium as public and search-indexable** · 2h

_Story 63 — As a visitor, I want to read the compendium and its entries without signing in, so that the site's reference is useful to people who are not in a coven._

Minted on request, from the question of what it would take. Doc-only: nothing compendium-shaped exists yet, so this is a change to the design and to the acceptance criteria of tasks not yet built, plus MB.81–MB.85 for the slug, the public frame, the search-engine surface and the visitor story. The invite gate itself is untouched. Decided: the public canonical URL is `/compendium/ingredients/[slug]`, with the in-app `/ingredients/[id]` staying signed-in and reaching compendium entries too; a slug from name, form and formal name (name plus form as minted; MB.81 added the formal name when the seed's two _Uncaria_ barks collided on it), stored on every ingredient, following a change to any of the three with the old slug answering a 308 for 180 days from midnight UTC and reserved for that window, a rename into a reserved slug recorded as a single pending claim, and nothing on a schedule; the compendium read takes no session; the three compendium queries drop the `signedIn` scope; the public pages are ISR under the `compendium` tag with a client island for the signed-in affordances; the `anonymous` plugin is declined here and recorded for v2 as try-before-sign-up, beside a v2 path for suggesting a change to an entry ([`design-decisions/mb.80-public-compendium.md`](../design-decisions/mb.80-public-compendium.md), plan in [`design-decisions/mb.80-plan.md`](../design-decisions/mb.80-plan.md)).

_Acceptance criteria:_

- DESIGN.md §1, §5, §7, §9, §10, §13, §14 and §15 amended; §10 gains story 63 and the count reads 51
- CLAUDE.md's invite-gated invariant names the compendium as the public exception, the slug convention says an ingredient slug follows a rename, and the story count reads 51
- M5.2, M5.5, M8.5, M8.6, M8.18 and M8.19 amended in place; MB.81–MB.85 entered, indexed and placed in the wave rows; the MB paragraph names them
- `auth.md`'s route-protection list, the mb.57 record, the mb.74 record's `anonymous` line and `backlog.md`'s V Public item corrected
- The record and the plan sit in `design-decisions/`
- The diff touches only Markdown

**MB.81 — `ingredients.slug`, the pending-slug columns and the `retired_ingredient_slugs` table** · 2h

_Story:_ As an operator, I want every ingredient to carry a URL slug and a record of the slugs it has retired, so that a compendium entry has a permanent public address that survives a relabel.

Table task, landing after M4.8 and before M8.2 under the table-then-behaviour rule. Adds to `ingredients`: `slug` (text, nullable on arrival), `pending_slug` (text, nullable) and `pending_slug_effective_at` (`timestamp`, nullable — without time zone, as every timestamp here, holding UTC; `timestamptz` as minted, corrected while building). Partial unique indexes: `(slug) WHERE workspace_id IS NULL AND deleted_at IS NULL`; `(workspace_id, slug) WHERE deleted_at IS NULL`; the same pair on `pending_slug WHERE pending_slug IS NOT NULL`. Creates `retired_ingredient_slugs`: `id`, `ingredient_id` (FK), `workspace_id` (nullable FK, mirroring the ingredient's scope), `slug`, `retired_at`, `expires_at` generated as the UTC calendar date of `retired_at` plus 180 days at 00:00 UTC, the six-column audit spread and its `set_updated_at` trigger line, and an index on `(slug)`. Backfills `slug` through a script that uses `src/lib/slugify.ts` on name, form and formal name, then `SET NOT NULL` on `slug` alone with a destructive-DDL ack sidecar. If it lands before the compendium holds production rows, the backfill is the seed. **Corrected while building: the slug is the label, the form and the formal name where one is declared.** MB.80 minted it as name plus form, and the `standard` seed's two _Cat's Claw_ barks — _Uncaria tomentosa_ and _U. guianensis_ — collided on the compendium slug index the moment it existed. The formal name is what tells such entries apart everywhere else, so it is in the address too, and the slug index refuses only what `slugify` folds together ([`design-decisions/mb.80-public-compendium.md`](../design-decisions/mb.80-public-compendium.md)).

_Acceptance criteria:_

- Columns, indexes and the table exist with the shapes above, asserted from the catalogue
- `expires_at` is a generated column and reads 00:00 UTC whatever the hour of `retired_at`
- The trigger test and the audit-column test both pass with the new table
- Every seeded ingredient has a slug equal to `slugify` of its name, its form and its formal name where declared, and no two seeded slugs in one tier are alike
- The `NOT NULL` step carries its ack sidecar; nothing else in the migration is destructive
- Nothing reads the new columns yet

**MB.82 — Ingredient slugs: set on create, follow a rename, retire with a 308, hand over once confirmed** · 4h

_Story:_ As an admin, I want an entry's public address to follow its name and its old address to keep working long enough for search engines to move over, so that a relabel never loses a reader or an index entry.

Lands after M5.2, whose service it extends — and M8.2's, which sets a workspace ingredient's slug on create — and before M5.3 and M5.5, so the admin form and the public route consume a finished rule. The slug is `slugify` of name, form and formal name, set on create and recomputed whenever any of the three changes. A compendium entry's old slug becomes a `retired_ingredient_slugs` row, as the relabelling admin's, with the redirect, expiry and takeover DESIGN.md §5 specifies for that table. The takeover's confirmation is a refusal on `endRedirect`, naming the entry and when its window closes, until the input carries `endRedirect: true`; the retirement stays, so the public route's one read, `resolveCompendiumSlug`, can name the moved entry for the page to link to. A coven ingredient's slug retires nothing (§5).

**Decided while building:** MB.80's reservation and pending claims are dropped ([`design-decisions/mb.82-slug-takeover.md`](../design-decisions/mb.82-slug-takeover.md)). With the formal name in the slug since MB.81, only an entry spelling the old address exactly can want it, and that is most often the correct entry being added — a create the pending claims could not serve, since a create has no current slug to keep while it waits. Building the reservation as written would have doubled the task, for a guarantee the confirmation and the link on the new page mostly recover. The coven tier retires nothing because nothing routes by a coven ingredient's slug. The pending-slug columns and their indexes leave the Drizzle schema here and are dropped by MB.107 once this has deployed, since a column drop is two PRs (CLAUDE.md rule 10). A "new at this address" notice was widened into MB.106's New and Updated markers.

_Acceptance criteria:_

- Create sets the slug; a change to the label, the form or the formal name moves it, and a compendium entry's move records the retirement; an identity collision is refused by the identity index first, and a slug collision the identity index does not catch (two formal names the slug rule folds together) is refused with an explaining error naming the colliding entry
- A retired slug resolves to its ingredient until `expires_at` and not after, tested at either side of midnight UTC, and only while no entry holds it
- A write that would take a slug another entry's redirect runs from is refused on `endRedirect`, naming that entry and when its window closes, until the admin confirms; confirmed, it takes the slug, and the address's read names the entry that moved until the window closes
- Taking back your own retired slug inside the window is accepted at once, without a confirmation
- Lapsed retirements are gone after the next compendium write
- Every write goes through `withAudit`; the retirement's `created_by` is the relabelling admin
- A coven ingredient's slug follows its name under the `(workspace_id, slug)` scope, through the `Membership` proof, and retires nothing
- The pending-slug columns and their two indexes are declared nowhere in the schema; MB.107 drops them from the database

**MB.83 — Public compendium chrome, proxy entries and the signed-in island** · 2h

_Story 63 — As a visitor who is not signed in, I want the compendium pages to open without a redirect and to offer me the way in, so that I can read the reference and know how to join._

Lands after M8.17 and before M8.18, which composes it. `PUBLIC_ROUTES` in `src/proxy.ts` gains `/compendium`, `/compendium/*`, `/robots.txt` and `/sitemap.xml`, and `tests/proxy.test.ts` moves `/compendium` from the lookalike list to the public list and pins the two crawler files as passed through. A public frame for the two compendium pages: the site name, Sign in, and nothing workspace-shaped, in the same minimal shape as `/`. The signed-in affordances — the `AppShell` chrome and the Add to my ingredients slot — are one client island that asks `/api/graphql` `me` after hydration and renders a sign-in link for a null session, so the page itself reads no cookies or headers and stays static. Off production the proxy sets `X-Robots-Tag: noindex` on every response, because `staging.sorrelandsalt.com` is a public URL.

_Acceptance criteria:_

- A signed-out request to `/compendium` and `/compendium/ingredients/x` passes the proxy; `/coven/*` still redirects; `/robots.txt` and `/sitemap.xml` pass
- The island renders the signed-in chrome for a session and a sign-in link without one, tested both ways
- The island is the only place the two public pages learn who is viewing; a guard fails if either page calls `cookies()` or `headers()`
- Off production every response carries `X-Robots-Tag: noindex`
- axe clean signed out at 375px

**MB.84 — robots, sitemap, page metadata and noindex off production** · 3h

_Story:_ As the owner, I want search engines to find and correctly title every compendium page, and to find nothing on staging, so that the public reference is indexed once at its canonical address.

Lands after M8.19, since both pages must exist to describe. `src/app/robots.ts` allows `/compendium` and `/compendium/*`, disallows everything else and points at the sitemap; under a `VERCEL_ENV` other than `production` it disallows all. `src/app/sitemap.ts` lists `/compendium` and one `/compendium/ingredients/<slug>` per current entry, read through the cached compendium, `lastModified` from `updated_at`. `generateMetadata` on the list page, the public detail page and the in-app detail page: a title from the name, the form and the site, a description from the entry, `alternates.canonical` set to the public URL on every route, and Open Graph fields with M11.16's image. Filtered list views carry canonical `/compendium` and `noindex`, so category combinations are not a crawl trap. An unknown slug is a real 404; a retired slug inside its window answers `permanentRedirect()` to the current one, and a test pins that the redirect carries no `max-age`, `Expires` or `Last-Modified`.

_Acceptance criteria:_

- `/robots.txt` and `/sitemap.xml` answer 200 with the shapes above; the sitemap carries every current slug and no retired one
- Off production robots disallows all
- Every compendium page carries a title, description and canonical; two entries sharing a label are distinguished in the title by the formal name
- A filtered list view is `noindex` with canonical `/compendium`
- An unknown slug is 404; a retired slug is 308 to the current one, with no browser-cacheable freshness headers
- A Lighthouse SEO audit passes on both public pages signed out

**MB.85 — Story 63: a visitor reads the compendium without signing in** · 1h

_Story 63 — As a visitor, I want to read the compendium and its entries without signing in, so that the site's reference is useful to people who are not in a coven._

Closes Wave 12, once MB.83, M8.18, M8.19 and MB.84 have landed. The acceptance test for story 63 in `tests/acceptance/02-compendium.test.ts`; a service test that the compendium read takes no session while a null session is refused on every workspace read, asserting the rows exist before asserting the refusal; a route test that a workspace ingredient's slug at `/compendium/ingredients/` is 404, stating that the row is a workspace entry; and the e2e: a signed-out visit to `/compendium` lands on the page rather than `/sign-in?next=`, follows a card to its entry, and both pages are axe clean signed out.

_Acceptance criteria:_

- `make test-stories` reports story 63 passing
- The null-session denial test asserts the rows exist before asserting the refusal
- The direct-slug 404 test states the row is a workspace entry
- The e2e runs signed out and scans both pages with axe

**MB.86 — Restructure `src/` into domain modules with a guarded boundary** · 5h

_Story: As a developer, I want every table and service to have one owning module with a public surface the tooling enforces, so that a later move to separate services replaces a transport rather than a layout._

Minted on request, from the question of what would make an eventual split a transport change. The answer was that the rules already permit it and the layout forbids it: nothing said which code owned which table, and no unit could be lifted out. So `src/db/schema/` and `src/services/` go, and five modules take their place under `src/modules/` — `identity`, `coven`, `vocabulary`, `ingredients`, `grimoire` — cut along the foreign-key graph and named from the project's own nouns, each owning its tables in `schema/`, its services in `services/`, and its GraphQL registrations and loader factories in `graphql/` and `loaders/`. A module's public surface is its `index.ts` plus its `schema/*.ts` files; `services/`, `graphql/` and `loaders/` are internal. Cross-module imports go through `@/modules/<name>`; the dependency graph is fixed and acyclic; a module never imports presentation. The compendium is a tier inside `ingredients`, not a module, and the `ingredients` table is deliberately not split — the record carries the argument. `src/lib/units.ts` moves to `src/modules/ingredients/schema/units.ts`, since the tables are built from it. Enforcement is the usual two layers: one `no-restricted-imports` pattern group in `.oxlintrc.json` over the deep paths, restated in every override, and `tests/guards/module-boundaries.test.ts`, which resolves alias and relative specifiers alike and pins the public-surface rule, the allowed edges, the module roster, the no-presentation rule and the `TIER_SEAM` allowlist — the named set of repository finders that read the compendium tier, empty today and appended to by each later task that adds one. Tests mirror the move into `tests/modules/<name>/`, the db harness moves to `tests/support/db/`, and M3.9's two guards are re-pointed. Bigger than a sitting, and it says so: the move is mechanical but touches every import of a schema or a service, and the guard is written first and watched to fail on the old layout. Stacked on M3.9's branch, since it adopts M3.9's `server-only` marker and guards. Docs corrected in the same PR: CLAUDE.md rules 1, 2 and 9 and a new Modules convention, DESIGN.md §3's tree, and the moved paths in `db.md`, `graphql.md`, `auth.md`, `workshop.md` and `testing.md`; the summary is `claude-docs/modules.md`. The stale "port from resume-2026" lines in CLAUDE.md and this file's standing rules go in the same pass — nothing in this repo is ported.

_Acceptance criteria:_

- `src/db/schema/` and `src/services/` no longer exist; every table and service sits in one of the five modules, with the ownership the record's table gives
- `npm run db:generate` reports no schema changes and `src/db/migrations/` is untouched in the diff
- `tests/guards/module-boundaries.test.ts` is green, and was shown to fail on a deep import of another module's `services/` — as was `npm run lint` — before the probe was reverted
- `tests/guards/lint-access-boundary.test.ts` and `tests/guards/server-only-services.test.ts` name `src/modules/*/services` and are green
- CLAUDE.md, DESIGN.md §3, `db.md`, `graphql.md`, `auth.md`, `workshop.md` and `testing.md` name no path that no longer exists; `claude-docs/README.md` links `modules.md`
- `design-decisions/mb.86-modular-monolith.md` and `mb.86-plan.md` are present, the plan carrying its execution amendments

**MB.87 — Split `src/db/repository.ts` into a `src/db/repository/` folder** · 2h

_Story: As a developer, I want the repository split into one file per concern, so that adding a finder means reading the file that holds its kind rather than all of them._

Minted on request, once M3.10 had taken `src/db/repository.ts` to 530 lines holding six concerns — the table-shape types, the audited write path, the one select builder and its keyset paging, the generic finders, the spell visibility finders, the two reads that take no proof, and the provisional-account delete — with Wave 8 about to add a finder per service. The file becomes `src/db/repository/`: `index.ts` (named re-exports only, entering the database layer through `users`), `shapes.ts`, `write.ts`, `select.ts`, `finders.ts`, `spells.ts`, `memberships.ts` and `provisional-users.ts`. Callers do not change: `@/db/repository` resolves to the index. **The one design change is privacy**: `selectFrom` was file-private, which the language guaranteed; the finders beside it now import it, so it is folder-private — never re-exported from the index, and a deep import from outside the folder is banned by a `no-restricted-imports` group (restated in every override) and by `tests/guards/module-boundaries.test.ts`, whose resolver sees every spelling. The client importers go from one to three (`write.ts`, `select.ts`, `provisional-users.ts`), each with its own disable comment, rather than one internal re-export of `db` that no lint pattern would name. `tests/db/repository.test.ts` is split to mirror, with the probe tables in `tests/support/db/probe-tables.ts`. Stacked on M3.10's branch, whose three new finders it moves.

_Acceptance criteria:_

- `src/db/repository.ts` no longer exists; `src/db/repository/index.ts` re-exports exactly the surface the soft-delete guard pins, and has no `export *`
- Function bodies are moved, not changed: each finder and writer differs from the old file in location alone
- `tests/guards/soft-delete-finder-guard.test.ts` reads the folder and still asserts one SELECT, inside `selectFrom`, and every finder filtered
- A deep import of `@/db/repository/select` from a service fails `npm run lint` and `tests/guards/module-boundaries.test.ts` — shown before the probe was reverted
- `tests/guards/lint-db-client-boundary.test.ts` pins the six client exemptions
- `tests/db/repository.test.ts` is split into `tests/db/repository/`, every test moved rather than rewritten
- CLAUDE.md, DESIGN.md, `db.md`, `modules.md` and `.oxlintrc.json`'s messages name `src/db/repository/`; `design-decisions/mb.87-plan.md` is present
- `npm run test:coverage` and `npm run build` are green

**MB.88 — One account page: name, email and sign-in methods** · 3h

_Stories 1 and 59, gathered onto one page: the name the site shows, the email it knows me by, and the ways I sign in, all changed in one place. Changing the name has no story of its own._

Minted on request during MB.71, once `/account` held only the sign-in methods and the address lived on a page of its own. `/account` becomes the one account page: a Name section, an Email section and MB.71's Sign-in methods, each under its own heading below the page's "Your account". It carries no link to `/account/email`, and MB.71's "Your email" link comes off. The email page stays for the flows that are not a visit to the account. It is where every unverified sign-in lands and the only page a provisional account can reach. A mailed link lands there and shows its confirmed view, and a link opened from the wrong browser is explained there. Its own link across, offered to a verified account, reads "Your account".

The name changes through GraphQL, as the address does (rule 1): `setName(name: String!): User!`, backed by an identity-module service. It writes the session's own row through `withAudit` and trims the name. A blank or over-long name is refused with a `ValidationError` on `name`, which MB.43 maps to the field. A provisional account is refused, as by every service but `me` and `setEmail`. Better Auth's `/update-user` also writes `name` (and `image`) outside `withAudit`, so it is refused before the endpoint, leaving the name one write path, the audited one. `overrideUserInfoOnSignIn` is already off, so a later sign-in never puts the provider's name back. The Email section is EmailForm's field, mutation, cooldown and field errors, not a second form. EmailForm gains an embedded use without its page heading or its confirmed view, both of which stay on `/account/email`. SignInMethods' heading drops a level.

_Acceptance criteria:_

- `setName` renames the session's own row, stamped with the session's user, and leaves another user's row untouched, asserted present first
- `setName` refuses a blank or over-long name as a field error on `name` and refuses a provisional account; the SDL snapshot and the generated client types are updated
- `/update-user` is refused with the row unchanged; the update hook's `/update-user` test is replaced, or its session fallback removed if nothing else reaches it
- `/account` renders "Your account" with Name, Email and Sign-in methods sections and no link to `/account/email`; an unverified account is still sent to the email page
- The Email section sends a change link through `setEmail` with the email page's cooldown and field errors, and the email page itself behaves as before: sign-up landing, confirmed view, refusals
- The name field is a component with a story, a doc and a role-and-label component test; EmailForm's and SignInMethods' docs and stories cover their use on the account page
- A Playwright axe scan of `/account` with all three sections, on `tests/e2e/session.ts`
- DESIGN.md §7 gains `setName` and §9's `/account` row describes the one page; `auth.md`'s "The email page" and "Linking a second provider" name the account page

**MB.89 — Move task tracking from Asana to GitHub Issues and Projects** · 11h

_Story:_ As someone running this board, I want the tasks, their status and their history on GitHub Issues with a Project board over them, so that custom fields, search, dependencies and rules come back without a paid plan, and a merge closes its task by mechanism rather than by memory.

MB.56 rebuilt the board around Asana's free Personal plan — no custom fields, no search, no rules, no dependencies — so the id and the status lived in the task name and lookup walked the wave cards' notes. GitHub Projects (v2), issue types, sub-issues, issue dependencies and issue search are on every GitHub plan, and `gh` 2.97 in the devcontainer already carries `--parent`, `--add-sub-issue`, `--type` and `--add-blocked-by`. The tracker moves there, one task per issue, and the Asana MCP server goes with it: everything is `gh`.

Decided in the plan ([`design-decisions/mb.89-plan.md`](../design-decisions/mb.89-plan.md)): issues live in the public code repo, on the evidence that the comments carry names and narrative but no values, and that `TASKS.md`, `DESIGN.md`, `secrets.md` and every PR body are already public; the 395 comments are pattern-scanned, and the credential-touching threads read, before any is published. Waves are milestones, one per wave; sub-issues are reserved for genuine parent/child. The task id stays in the title and lookup is one `gh issue list` call with the same exact-segment match, since GitHub search tokenises `M2.1` and `M2.10` alike. The Asana workspace stays alive and archived so the existing PR-body permalinks keep resolving.

Status is a Project single-select and hours a Project number field. Closing is not free: GitHub's `Closes #N` fires only on a PR into the default branch, and feature PRs target `staging`, so `.github/workflows/close-task-on-merge.yml` reads `Closes #N` from a merged PR's body and closes the issue; the Project's built-in workflow then marks it Done. PRs into `main` close natively.

Two prerequisites the owner supplies: a fine-grained PAT owned by the org, with the org's Projects permission at read and write and the repo's Issues, Contents, Pull requests and Workflows permissions — the pre-existing token was refused on `createProjectV2` — and an Asana personal access token for the one-off `scripts/migrate-asana-to-github.mjs`.

_Acceptance criteria:_

- Every Asana leaf task is an issue titled `<ID> — <title>`, with the notes as its body, its wave milestone and an issue type, closed as completed for a done task and as not planned for a retired one; the script's `verify` reports matching counts of issues, closed issues, comments and milestones
- Every migrated comment opens with its original `[YYYY-MM-DD HH:MM UTC]` bracket, and the scan reported zero hits before publication
- The org Project carries `Status` and `Estimate`, its auto-add filter admits only `tracked` issues, and every migrated issue is on it with the status its Asana marker carried
- A PR merged into `staging` closes the issue its body names with `Closes #N`, by Action, and the Project marks it Done
- `start-task`, `create-feature`, `create-hotfix`, `create-pr` and `project-progress` reach the board only through `scripts/task-board.mjs`, and every comment step carries "names, never values"
- CLAUDE.md's Asana section is replaced by a GitHub section; the live docs and `.mcp.json` no longer name Asana; design-decision records and transcripts are left as history
- The Asana project is renamed as archived, not deleted

**MB.90 — Day 1 new developer guide, root `.env.example` and `npm run setup`** · 5h

_Story:_ As an engineer new to this codebase, I want one guide that orders what to read and a single command that sets up my environment, so that my first day goes on understanding the system rather than reconstructing how to start it.

A new engineer has no starting point. `README.md`'s "Local setup" is stale — it still says M0 is complete, that `npm run codegen` exits non-zero, and that the `standard` and `demo` seeds have not landed — and the eighteen subsystem summaries under `claude-docs/` have no reading order. The per-subsystem docs are strong; what is missing is the glue and a first-hour walkthrough.

**The deliverable is `claude-docs/day-1.md`**, readable in two to three hours including the doc sections it links to. Twelve sections in reading order — before you start, the first hour, how the site works, the repo map, dev tooling, tests, PR checks, deploys and branches, task tracking and skills, the rules you will trip over, and where to look next — each ending in a "Read next" line naming a verified section heading. It links out and holds nothing the other summaries do not, except the reading order and a request-flow diagram.

**Three structural changes ride in the same PR, because each shortens the guide:**

- A root `.env.example` naming every variable `src/` and `scripts/` read, with safe local values. `.gitignore`'s `.env*` line under `# Scratch` re-ignores it after the earlier `!.env.example` carve-out, so that line goes.
- `scripts/setup.ts`, wired as `npm run setup` and `make setup`: copy-if-absent of `.env.example` to `.env.local`, `Docker/.env.example` to `Docker/.env`, and the two `.vscode/*.example.json` files. It never overwrites.
- `tests/guards/env-example.test.ts`: every variable the code reads is a key in `.env.example` and every key is read somewhere, so the file cannot drift; `setup()` is proven on a temporary tree.

`README.md` loses its status block, and "Local setup" becomes `npm ci`, `npm run setup`, then `make docker-up` or "Reopen in Container", linking the guide. `claude-docs/README.md` gains a row, and CLAUDE.md's Commands table, `secrets.md`, `debugging.md` and `docker.md` each a line. The scoped plan — section budgets, verified heading names, the `.env.example` contents, the guard's design and the README fix table — is committed on the task's branch as its design-decisions record.

_Acceptance criteria:_

- `claude-docs/day-1.md` exists in twelve sections in reading order, each ending in a "Read next" line whose heading resolves; the guide is 2,500–3,500 words
- The guide links nothing under `claude-docs/archive/` or `transcripts/`, and does not use the word "catalog"
- `.env.example` names every variable the code reads and nothing it does not, enforced by `tests/guards/env-example.test.ts`; `.gitignore` no longer re-ignores it
- `npm run setup` in a fresh worktree copies four files, and a second run reports all four kept
- `README.md`'s setup section is current and links the guide; `claude-docs/README.md`, CLAUDE.md's Commands table, `secrets.md`, `debugging.md` and `docker.md` are updated
- `npm run pre-commit` and `npm run test:coverage` pass

**MB.91 — Make the planet and zodiac suggestion lists admin-curated vocabularies** · 2h

_Story:_ As an admin, I want to add a planet or a sign myself, so that a practice the seeded lists left out does not need a deploy.

Documentation and scoping only, in MB.35's shape: the model is recorded before the table task transcribes it. M4.5 settled `planet` and `zodiac` as free text with suggested values and put the suggestions in a TypeScript constant — the shape `form`'s vocabulary had before MB.35, and wrong for the same reason: adding a body is a deploy. The two lists become two tables, `planets` and `zodiac_signs`, shaped like `ingredient_forms` minus the group, and `ingredients.planet` / `ingredients.zodiac` stay `text` — §5's rule that a vocabulary a member writes is text. `nomenclature` and `element` stay enums. Two tables rather than one with a `kind`, by the §14 row that decided it for the groups.

Five differences from the forms precedent are recorded rather than glossed: one tier (no group, so a flat seed helper); tables too small for an EXPLAIN index-scan assertion; §5's new table must sit outside `forms.test.ts`'s slice; `standard` seeds no uncurated planet; and the to-do list's add cannot be one click, since `description` is required. The admin's to-do list is compendium-tier only; the member's autofill reads the compendium and the current workspace. The scoped plan, with what moving `element` and `nomenclature` too would have cost, is [`design-decisions/mb.91-plan.md`](../design-decisions/mb.91-plan.md).

_Acceptance criteria:_

- DESIGN.md §5: the planet/zodiac paragraph re-points at the two tables; `planets` and `zodiac_signs` paragraphs and one `Vocabulary | Values` table (nineteen bodies, thirteen signs, lower-case, in seed order) inserted after the "`ingredients.form` is `text`" paragraph and before `categories`, so `tests/db/seed/forms.test.ts`'s slice is unchanged — asserted by running that test on the branch
- DESIGN.md §5's admin sentence, §7 (the `compendium` tag covers five reads), §9's route table (`/admin/planets`, `/admin/zodiac-signs`) and §14 rows; CLAUDE.md's curation invariant, rule 6 and commands table
- db.md gains "The astrology vocabularies" and a seed section carrying M4.5's sources; validation.md's `correspondences.ts` row and Sources section move there; modules.md's ownership row and ci.md's seed paragraph updated
- TASKS.md: MB.91–MB.95 entered, indexed and placed in the Wave 8 row; M4.7a, M5.4, M5.6a, M5.7 and M5.10a amended; M4.5's entry gains a forward pointer
- The plan is stored as `claude-docs/design-decisions/mb.91-plan.md`; the Wave 08 milestone description lists the new ids in execution order
- The diff touches only Markdown; `npm run pre-commit` and the vitest job stay green

**MB.92 — `planets` and `zodiac_signs` schema** · 1.5h

_Story:_ As an admin, I want the planet and zodiac vocabularies to be rows, so that the autofill has something an admin can edit.

Table task. Two flat tables in `src/modules/vocabulary/schema/astrology.ts`: `id`, `name`, `slug`, `description` NOT NULL with a non-blank CHECK, and the six-column audit spread; a partial unique index on `slug` where not deleted; one multicolumn `gin_trgm_ops` index over `(name, description)` per table, since the suggestion query matches both. No group, colour, order column or workspace scoping. The migration appends two `CREATE OR REPLACE TRIGGER set_updated_at` lines by hand — the first tables since 0016 to carry their own, per CLAUDE.md rule 3.

_Acceptance criteria:_

- Both tables carry exactly `id, name, slug, description` plus the audit spread — asserted from `getTableConfig` and the catalogue
- `slug` unique among live rows on a partial index, freed by soft delete; a blank `description` is a 23514 naming the CHECK
- No `group_id`, colour, ordering column or `workspace_id`; the only foreign keys are the audit stamps
- The `(name, description)` trigram index exists on both, asserted from the catalogue
- `ingredients.planet` and `ingredients.zodiac` stay nullable `text` with no foreign key to either table — asserted from the schema and by the migration-file scan, as for `form`
- `AUDITED_TABLES` gains both names; `tests/db/updated-at-trigger.test.ts` passes
- Nothing reads the tables yet

**MB.93 — Seed the planet and zodiac vocabularies** · 1.5h

_Story:_ As an admin, I want the nineteen bodies and thirteen signs already curated, so that the autofill offers something before the first uncurated value is typed.

`src/db/seed/astrology.ts` holds `PLANETS` and `ZODIAC_SIGNS` as `{ name, description }` lists in §5's order, Title Case, every slug derived by `slugify`. A flat helper over `insertMissing` replaces the two-tier engine, which assumes a group. `standard` seeds both inside its own transaction. `scripts/db-seed.ts` gains an `astrology` target (`npm run db:seed:astrology`), `migrate.yml`'s reference-seed step a third line, and `deploy.yml`'s seed-changed path list the new files. Deletes `src/modules/ingredients/validation/correspondences.ts`; its tests read the seed literals instead.

_Acceptance criteria:_

- Every value §5's table lists is seeded, in §5's order, and nothing else — parsed from DESIGN.md at test time, the parse itself checked (two vocabularies, 19 and 13)
- Every name is Title Case; every description non-empty and no two the same on a table
- Reseeding adds nothing, resurrects nothing an admin soft-deleted, and overwrites no description an admin rewrote
- Rows are stamped by the bootstrap user with the GUC published
- `standard` seeds both vocabularies; every `planet` the seeded compendium sets is curated, case-insensitively
- `migrate.yml` runs the new target beside the other two; `deploy.yml` re-seeds when the new files change
- `validation/correspondences.ts` is gone and nothing imports it

**MB.94 — Scoped suggestion fields for planet and zodiac** · 4h

_Story:_ As a workspace member, I want the planet and zodiac fields to suggest from the vocabulary and from what my workspace already uses, so that I do not write Moon four ways.

Builds the suggestion mechanism M4.7a then adopts, for two text-over-vocabulary columns: curated rows first, matched on name then description, then in-use uncurated values from the compendium and the current workspace only. **Moved ahead of M4.7a while building this task**, since M4.7a had not started and whichever came first had to build the mechanism; hence 4h rather than 1.5h. **Corrected while building: a description matches by `<%`, not `%`.** `%` compares whole strings, so `serpent` scores 0.12 against Ophiuchus's description and `black moon` 0.22 against Lilith's, and the first criterion below could not be met with it. A name or in-use value matches by `%` or `<%`, a description by `<%` alone, under per-transaction `pg_trgm.similarity_threshold` 0.4 and `pg_trgm.word_similarity_threshold` 0.6; `<%` is a trigram operator too, so the rule behind `%` still holds. No group on a suggestion. Two fields, `planetSuggestions` and `zodiacSuggestions`, sharing one `CorrespondenceSuggestion` type, each a `pagedConnection`. The service sits in `vocabulary/services/`; the finder that reads the compendium tier joins `TIER_SEAM`. What counts as uncurated is DESIGN.md §5's case-folded match against live rows. `standard` gains no uncurated planet: the tests write their own against an emptied table, and one in the shared template would reach every workspace's suggestions and MB.95's to-do list. M5.10a renders the two fields.

_Acceptance criteria:_

- Curated first, uncurated second, distinguishable; a name match outranks a description match (`black moon` offers Lilith, `serpent` offers Ophiuchus)
- A value in use only in unrelated workspace X never appears — asserted by direct query, with the precondition that X holds it
- Filtered in SQL; soft-deleted rows excluded; bounded by the M3.6 helper
- The match uses `%` and `<%` with explicit thresholds, asserted by test; no planner assertion, since a two-page table is never index-scanned, and the entry says so
- `Moon` and `moon` on ingredients are one in-use value, and a value equal to a curated name is not offered twice

**MB.95 — Admin planet and zodiac CRUD** · 2h

_Story 18 — As a site admin, I want to add, edit and soft-delete planets and signs, so that the vocabularies can grow without a deploy._

`/admin/planets` and `/admin/zodiac-signs`, reusing M5.6a's page shape without the group control. `PlanetInput` and `ZodiacSignInput` (name, description; no slug) in `vocabulary/validation/`; create, update and soft-delete mutations per table, admin-gated in the service and firing the `compendium` cache tag. Each page lists compendium-tier in-use values outside the vocabulary as a curation to-do list, whose add control prefills the create form and still asks for the required description (DESIGN.md §5). Soft-deleting a value in use rewrites no ingredient, and the page says so. Lands after M5.6a, before M5.7, which gates it.

_Acceptance criteria:_

- Admin can create, edit and soft-delete on both pages; both lists alphabetical by name
- A slug collision is a readable error pathed to `name`
- Soft-deleting an in-use value leaves every ingredient's `planet` and `zodiac` untouched, asserted by row, and the value then appears in the to-do list
- The to-do list is compendium-tier only — a workspace's uncurated value never appears, asserted with the precondition that the workspace holds it
- Non-admins reach neither page nor any mutation; every mutation fires the tag

**MB.97 — A node Vitest project for the unit files that need no DOM** · 3h

_Story:_ As a developer, I want a test that never touches a DOM to run without booting one, so that the suite's per-file overhead stops growing with every guard that is added.

The `unit` project runs 71 files under jsdom with jest-dom and React Testing Library in its setup files. Nine need a DOM — all `.tsx` — and two `.ts` files need jsdom's `location` (`tests/lib/auth-client.test.ts`, `tests/support/msw/graphql.test.ts`); the other 59 pay for the environment anyway, which Vitest's own diagnostics flag after every run.

**Measured with a mirror config before the change:** the unit project drops from 5.84s to ~3.6s locally, an estimated ~20–28s off the 110s CI step. The measurement, and the alternatives it rules out, are [`design-decisions/mb.96-plan.md`](../design-decisions/mb.96-plan.md), "Part 1 — MB.97: a node project for the unit files that need no DOM" and "Facts the plan rests on".

**The rule: a `.tsx` test gets jsdom; a `.ts` test runs in node unless `dom` names it.** `unit` becomes `environment: 'node'` over `tests/**/*.test.ts`; a new `dom` project takes `tests/**/*.test.tsx` plus the two named `.ts` files under jsdom. `tests/support/setup.ts` splits into `setup-msw.ts`, which both projects run so that no unit test can reach the network, and `setup-dom.ts` for the RTL cleanup and `localStorage` polyfill. The three `// @vitest-environment node` docblocks go. `tests/guards/test-location.test.ts` gains the guard that every test file sits in exactly one project, since a file in none is a file nothing runs and a file in two runs twice unnoticed.

Rides along, under MB.31's sub-hour rule: `tests/guards/codegen-staleness.test.ts`'s redundant fifth `generate()` goes, reusing the `beforeAll` output.

_Acceptance criteria:_

- `npx vitest run --project unit` runs only `.ts` files in node and its `Duration` line has no `environment` share; `--project dom` runs the twelve DOM files
- `npm run test:coverage` is green with the same file and test counts as before and coverage ≥ 80% on all four measures
- A `.test.ts` listed in `dom` but not excluded from `unit`, or a test file matched by neither project, fails `tests/guards/test-location.test.ts`
- `testing.md`, CLAUDE.md's `test:coverage` row and every doc or comment that said "the `unit` (jsdom) project" say which project a file runs in and why

**MB.98 — Gate runs stop when their PR is closed** · 1.5h

_Story:_ As a developer, I want a closed PR to stop spending CI, so that a bulk edit of old PR bodies or a merge mid-run costs nothing.

On 2026-09-27 one bulk edit of PR bodies started 130 `pr-gate.yml` runs for PRs merged days to weeks earlier, since `edited` — in the trigger list so gitflow re-runs when an open PR is retargeted — fires for a closed PR just the same; and four of the last twenty merged PRs had a gate run still in flight at merge that ran to the end ([`design-decisions/mb.96-plan.md`](../design-decisions/mb.96-plan.md), "Blacksmith feasibility (the user's question)"). Free on GitHub's runners, metered on Blacksmith (MB.96), which is why this lands first.

**One mechanism, two paths.** A first step in the `changes` job, which `checks`, `vitest` and `playwright` already `need`, cancels a closed PR's run — a step-level `if:`, so the header's rule against job-level ones is untouched — and `closed` joins the gate's trigger types, so a close cancels the PR's other runs through its concurrency group and then itself, and `build-*` and `gitflow` stop within seconds instead of running out ([`ci/aggregating-workflows.md`](../ci/aggregating-workflows.md) has the shape). Re-scoped during the task from a separate `cancel-gate-on-close.yml` keyed by head branch, which would have cancelled the other PR of a hotfix's pair (the plan's "Part 2 — MB.98: gate runs stop when their PR is closed"). `deploy.yml` is left alone.

**Found on the way, corrected here.** The three `build-*` jobs' `cancel-in-progress: false` never survived the workflow-level `true`, and a cancelled build leaves no tag behind anyway, so the blocks are removed, confirmed with the user, and their comment about a half-written layer is corrected. `deploy`'s non-cancelling group and `migrate`'s lock are right as they are. The audit is the plan's "Facts the plan rests on".

_Acceptance criteria:_

- An `edited` event on a closed PR produces a run that cancels itself in its first job; an `edited` event on an open PR still runs the full gate
- Closing or merging a PR cancels every queued or in-progress `pr-gate.yml` run for that PR, and no other PR's; `deploy.yml` is untouched
- No job in `pr-gate.yml` carries a job-level `if:`
- `ci.md` "Aggregating workflows" describes both paths, the burst that motivated them, and the corrected build-job comment, and records the `deploy` and `migrate` concurrency as right so the audit is not redone

**MB.99 — Docker layer cache to the registry** · 1.5h

_Story:_ As a developer, I want an image build on one PR to warm the next PR's build, so that the layer cache is shared rather than copied per PR until it evicts itself.

The Actions cache is at its 10 GB cap and evicting, mostly with buildkit blobs stored once per PR, since a cache written under a PR's merge ref cannot be restored by any other PR or the base branch; the Next.js build cache and the npm cache are what the duplicates crowd out, and a real build spent 32s more writing layers its image push had already uploaded. The evidence is in [`design-decisions/mb.96-plan.md`](../design-decisions/mb.96-plan.md), "Facts the plan rests on".

**`type=registry`, one `:buildcache` tag per image.** `.github/actions/build-image/action.yml` reads from and writes to `ghcr.io/<repo>/<path>:buildcache` with `mode=max` (the `testing` and `e2e` targets need the `development` stage's layers too), derived beside the image tag; the `cache-scope` input and its two call sites go, since the ref already separates the three images. Each build leaves the previous cache manifest untagged, and a package-version cleanup is a later task. What the registry cache buys is the plan's "Part 3 — MB.99: Docker layer cache to the registry".

**`build-db-image.yml`'s `push` trigger goes too**, confirmed with the user: it existed to seed the branch-scoped Actions cache, which a registry cache leaves nothing to seed, and it had already stopped building.

_Acceptance criteria:_

- `build-image`, `build-e2e-image` and `build-db-image` all read from and write to `ghcr.io/aurora-arctic/sorrel-and-salt/<path>:buildcache`; the `cache-scope` input is gone
- `build-db-image.yml` has no `push` trigger, and no live doc says it seeds a cache
- A build on one PR leaves `[development 6/6] RUN npm ci` CACHED for a later PR that changed only the testing stage
- The cache export step takes seconds rather than tens; `ci.md` "Composite actions" and "Database image" describe the cache, its cost and the 10 GB reason

**MB.96 — Run the vitest job on Blacksmith** · 1h

_Story:_ As a developer, I want the Vitest job to run on a runner with enough cores for the suite and a warm image cache, so that a PR's slowest check takes a minute rather than three.

The job took 2m47s on #517, nearly all of it pulling images and paying per-file overhead on the three workers a 4-vCPU public-repo runner allows, for a suite that runs in 14s locally ([`design-decisions/mb.96-plan.md`](../design-decisions/mb.96-plan.md), "Context"). `blacksmith-8vcpu-ubuntu-2404` gives seven workers and caches job and service images automatically. The job runs inside `container:`, so the host's Ubuntu (Blacksmith has no 26.04 label) is only Docker and the runner agent.

**Only the `vitest` job moves.** Blacksmith's free tier is capped and GitHub's own runners cost nothing on a public repo, so `vitest` alone goes now and `playwright` is the second step, taken after two weeks of the usage page; every other job stays on `ubuntu-26.04`. Lands after MB.98, so a metered runner never sees a closed PR's run. The budget behind the split is the plan's "Blacksmith feasibility (the user's question)".

**Prerequisite outside the repo, met on 2026-09-28:** the Blacksmith GitHub App is installed on the `Aurora-Arctic` organisation. It has to stay installed — a `runs-on` label with no app behind it queues forever rather than failing.

_Acceptance criteria:_

- `vitest.yml` runs on `blacksmith-8vcpu-ubuntu-2404`; every other workflow stays on `ubuntu-26.04`, and `ci.md` says why the split falls where it does
- The "Run vitest" step prints `nproc` and the job log shows 8
- `.actrc` maps the new label so `act` still finds a platform for the job
- `ci.md` carries the runner budget table and the two-week review rule, and records the job time before and after from the second Blacksmith run (the first pays the cold image cache)

**MB.100 — Raw SQL only where a rule or the planner needs it** · 3h

_Story:_ As a developer, I want a `sql\`` fragment in the repository to mean something a Drizzle builder cannot say, so that a reviewer reading one knows it is there for a reason rather than by habit.

M4.8's review found the compendium-tier predicate written as `sql\`${ingredients.workspaceId} is null\``in a fourth finder, copied from three neighbours, where`isNull()`exists. A survey of`src/`found 48`sql\``fragments, every one in`src/db/repository/`— MB.33 holds above it. Three kinds: **31 have no builder** — pg_trgm's`%`, `<%`and`similarity()`, `union all`, `mode() within group`, window functions, `json_agg`, row-value cursor comparisons, casts to a column's own type, and `set_config`with bind parameters — and stay. **5 are plain swaps**:`notSoftDeleted`'s `is null`in`shapes.ts`, and the compendium predicate written three times in `ingredients.ts`, `vocabularies.ts`and`common-names.ts`, which becomes one helper beside `scopedTo`. **4 are correlated `exists (select 1 …)`subqueries** —`findManyInSpell`, `findMembershipsOfUsers`, `findManyOfIngredients`, `deleteProvisionalUsers`— written raw only because`soft-delete-finder-guard.test.ts`allows exactly one`.select(`in the folder — a mechanism that leaves those four the least-checked reads in the repository, though the rule's purpose is right ([`design-decisions/mb.100-plan.md`](../design-decisions/mb.100-plan.md), "Assessment 1"). This task changes the mechanism, not the purpose:`existsIn(table, where)`beside`selectFrom`, on the same `db`, ANDing `notSoftDeleted(table)`itself and returning`SQL`rather than a builder; the guard counts two`.select(`calls, both in`select.ts`, one per named body, and asserts `existsIn`carries the filter;`existsIn`joins`INTERNAL`. `Derived`sources and`union all` arms stay raw and the doc says why.

_Acceptance criteria:_

- `existsIn` exists in `select.ts`, applies `notSoftDeleted` by construction, returns `SQL`, and is in the guard's `INTERNAL` list; the guard asserts exactly two `.select(` calls in the folder, both in `select.ts`, one in each of `selectFrom` and `existsIn`, and that `existsIn`'s body calls `notSoftDeleted(`
- The four raw `exists (select 1 …)` fragments are gone; every direct-id denial test over those finders still passes, and each still fails with `existsIn`'s filter removed (the mutation check is recorded in the PR body)
- No `sql\`… is null\``remains where`isNull()` serves; the compendium-tier predicate has one definition
- Every `sql\`` left in `src/db/repository/`is one a reviewer can justify from`db.md` "Where queries may be built", which gains the list of what has no builder and what a rule requires; a fragment that is not obviously one of those carries a one-clause comment
- `db.md` "Soft-delete filtering" and "Spell visibility", the four finder comments and CLAUDE.md rule 4's text describe the two-builder guard; `tests/db/repository/*` and the ingredient/spell/membership tests are green

**MB.101 — One inserter for an ingredient and its children in tests** · 2h

_Story:_ As a developer, I want a test to seed an ingredient with its folk names and categories in one call, so that the seventeen files that each hand-roll the insert stop drifting from each other.

M4.8's review asked whether test setup should go through `withAudit` rather than the raw `postgres` client. It should not — setup must not depend on the code under test, and the writer refuses states setup needs, a compendium ingredient among them ([`design-decisions/mb.100-plan.md`](../design-decisions/mb.100-plan.md), "Assessment 2") — and this task fixes what the question found instead. What is wrong is the duplication: every ingredient-family service, loader and GraphQL test carries its own `addIngredient` with slightly different columns, and `makeIngredient()` carries `folkNames` and `categories` that nothing inserts. One `insertIngredient(sql, fixture, author)` in `tests/support/db/` writes the row, its folk names and its category links (names resolved to ids through the seeded `categories`), stamps `created_by`/`updated_by` from `author`, and publishes `app.current_user_id` in its transaction the way the seed does, so a v2 history trigger records the author rather than nothing. `testing.md` states the convention: setup rows go through the raw client and the shared inserters; a test whose subject is the write path uses `withAudit`.

_Acceptance criteria:_

- `tests/support/db/insert-ingredient.ts` exports `insertIngredient`, takes an `IngredientFixture` and an author id, writes ingredient + folk names + category links in one transaction with the GUC published, and returns the row's id; its own test — `tests/db/insert-ingredient.test.ts`, under `tests/db/` because the `db` project's glob is `tests/db/` and `tests/modules/` — covers a compendium row, a workspace row, the GUC observed from inside the transaction, and a category name the database does not hold live (a thrown error naming it and nothing written, never a silent skip)
- The ingredient-family fixture tests — `ingredients/services/{common-name-suggestions,duplicates}`, `ingredients/loaders/ingredient-children`, `ingredients/graphql/common-names`, `vocabulary/services/{form-suggestions,suggestions}`, `vocabulary/graphql/{form-suggestions,suggestions}` — seed through it, each keeping at most a one-line adapter from what it states to a fixture; no file under `tests/modules/` outside `schema/` still carries a private fixture insert into `ingredients`. The two `*-plan` tests were on the list when minted and are not fixture tests, found when the task was built: their `generate_series` loads of tens of thousands of rows are the planner's ballast, not fixtures, and stay raw beside the schema tests' inserts
- Schema tests and the existing `tests/db/` files are untouched: their raw inserts are the subject or the mechanism, and the entry says so
- `testing.md` "Fixture factories" states the convention in one paragraph and links the inserter; CLAUDE.md's Testing section gains one line
- Coverage is unchanged or higher; `npm run test:coverage` green

**MB.102 — Board calls that defer to the Project's workflows and fit the rate limit** · 1h

_Story:_ As a developer, I want a board command to make only the calls the Project's own workflows do not already make, and to make them cheaply, so that a status move or an estimate never trips GitHub's rate limit.

Minting MB.100 and MB.101 hit `GraphQL: API rate limit exceeded` twice in one sitting, with 4,896 of the hour's 5,000 points still unspent: the refusal is GitHub's _secondary_ limit on bursts, and every `task-board.mjs` command was a burst. `find` (which every other command calls first) ran `gh issue list --limit 1000` — a GraphQL query carrying each issue's labels — and then `loadProject()` listed all 314 Project items with their field values, page after page, to find one. Meanwhile the Project's built-in workflows already did two of the things the script did by hand. **Auto-add to project** (and **Auto-add sub-issues**) puts every `tracked` issue on the board, so `ensureItem`'s `gh project item-add` was redundant; **Item added to project** sets `Not Started` — verified on #531 and #532 within ten seconds of creation — so no status is ever set by hand before `In Progress`. What the workflows cannot do stays the script's: `In Progress` has no trigger, and `In Review` cannot come from **Pull request linked to issue**, because GitHub links a `Closes #N` only on a pull request into the default branch — #294 and #295, both merged into `staging`, carry no linked PR. `Done` was already the merge's (**Item closed**, after `close-task-on-merge.yml`), verified live on #295.

The change: `listTracked()` reads the issues through REST (`gh api --paginate --slurp repos/…/issues?labels=tracked&state=all`, the core budget, one request per hundred issues, pull requests filtered out and the JSON shape kept); the item, its Status and Estimate, and the Project's field and option ids come from one `issue.projectItems` query (one point) instead of `project view` + `field-list` + `item-list`; `ensureItem` becomes `requireItem`, refusing with a retry message when the auto-add has not run yet rather than adding the item itself. `find` and `comment` make no expensive call; `status` and `estimate` make one small query and one mutation. [`task-tracking.md`](../task-tracking.md) says which status each workflow owns and which the script still sets, and why.

_Acceptance criteria:_

- `task-board.mjs` makes no `gh issue list`, `gh project item-list`, `gh project view`, `gh project field-list` or `gh project item-add` call; the migration script still imports what it needs
- `find`'s and `list`'s JSON shape is unchanged (`number`, `title`, `state`, `stateReason`, `url`, `milestone`, `labels`, plus `status` on `find`), with REST's lower-case `state`/`state_reason` normalised to the GraphQL spellings the skills and `project-progress` read
- `status`/`estimate` on an issue the auto-add has not yet placed refuse with a message naming the workflow and saying to retry, and write nothing
- A unit test covers the REST-to-shape normalisation, the pull-request filter and the exact-prefix match, without calling `gh`
- `task-tracking.md` lists the Project's workflows and which status each owns; CLAUDE.md's Status table says `Not Started` is the Item-added workflow's and is never set by hand; the `find` description no longer says `gh issue list`
- Running `find`, `status`, `estimate` and `comment` back to back on one issue draws no rate-limit refusal

**MB.103 — Reorder the Project's items into execution order** · 3h

_Story:_ As the owner, I want the Project's items to read in execution order, and to stay there as tasks are minted, so that the board is the schedule rather than the order the migration happened to insert.

Minted on finding the Project in TASKS.md heading order — the migration's insertion order — everywhere below the M0 and M1 groupings: M0.1 to M11.16, then MB.5 to MB.89, then MB.1 to MB.4, the MW ids, the retired ids, and everything minted since at the bottom. The board is read in execution order, which is the wave table in the Execution order section, so the order was wrong for every wave still open. Fixing it by hand is 315 `updateProjectV2ItemPosition` mutations behind a `gh project item-list`, which is the burst MB.102 exists to keep off the board.

The fix is a `reorder` subcommand on `scripts/task-board.mjs`, built around the limit three ways: **reads are lean** (no nested connection, and no per-item read), **moves are minimal** (an anchor, the longest increasing subsequence left in place, each other item moved after its predecessor — 44 mutations today rather than 315) and **writes are paced**, a stopped run simply re-run. **Waves with no open task are left where they sit**, which saves 139 moves on the done waves. [`task-tracking.md`](../task-tracking.md)'s "Order" section is the command as built.

The dry run surfaced five places TASKS.md and the board disagreed, fixed here: MB.13 and MB.49 were on the Wave 02 and 05 milestones and in no row; MB.88 was in the Wave 7 row and on the Wave 08 milestone, and moves to the end of Wave 8, where nothing needs it; Wave 13's cell contradicted its own reasoning, which the milestone description already had right; M7.A.1 sits on Wave 15 and was in no row. MB.37 and MB.38 were done tasks with no issue at all and are minted closed. The TASKS.md parser the migration carried moves to `scripts/tasks-md.mjs`, shared by both scripts.

_Acceptance criteria:_

- `node scripts/task-board.mjs reorder` prints the discrepancy report and the move list and writes nothing; `--apply` makes those moves, one paced mutation each, and ends by printing the recomputed plan; `--limit N` caps a run
- The reads are the REST issue list, one milestones page and an items listing with no nested connection; nothing calls `gh project item-list`
- A wave whose milestone has no open issue is left where it sits; the anchor never moves; no move omits `afterId`
- `readTasksMd` lives in `scripts/tasks-md.mjs`, imported by the migration script and the board script, with its `.d.mts`
- Waves 08 to 15 read in the wave table's order on the Project, and the run's cost is recorded in the PR body
- The wave rows agree with the board: MB.13, MB.49 and M7.A.1 in their rows, MB.88 at the end of Wave 8, Wave 13's cell matching its prose; the Wave 07 and 08 milestone descriptions follow
- MB.37 and MB.38 are on the board, closed as completed, on Wave 03
- Tests cover the parser and the planner, including a replay of the moves that proves the plan; `task-tracking.md` and CLAUDE.md describe the command; `npm run test:coverage` is green

**MB.104 — Rank the compendium search by word similarity, with the score on each edge** · 7h

_Story 21 — As a workspace member, I want the closest match first when I search, so that a typo or a prefix finds what I meant without scrolling._

M8.5's `compendium(query:)` matches by word similarity at 0.5 but pages the matches alphabetically, because the keyset helper sorts on one stored column and a score is computed per query. This task teaches the helper a list of sort parts and pages a search by `(score DESC, name ASC, id ASC)`, keeping rule 8 whole — never a capped top-N, which would leave matches past the cap unreachable and give a search a different shape from a browse, and never pg_trgm's `<<->` nearest-neighbour order, which needs GiST, orders by one text where the score is the best of three, and cannot resume after a cursor. Each edge of `QueryCompendiumConnection` carries `score: Float`, null on an unranked list. A query shorter than two characters is treated as absent by the service; the finder stays callable with one.

It is sized past one sitting because the mechanism and its one adopter land together. The cursor's key becomes an array, `{k: [...], i}`, which reaches every list — `readSuggestionPage`'s hand-rolled `tier:fold` key becomes a two-part key and drops its regex. `pagedConnection` gains edge fields, and `resolvePage` copies what an entry carries beside `cursor` and `node` onto its edge. The score is negated so one ascending row comparison serves, as `real`, whose shortest-exact text round-trips through the cursor unchanged (`1 - score` would promote to `double precision`). It is computed inside the search's `UNION ALL` arms, where the GIN recheck already runs `word_similarity`, and joined back as `max(score) … group by id` — a plain column that the order and the page bound both read, rather than a `greatest(…)` with a correlated folk-name subquery, which a page bound would evaluate against every compendium row. An `EXPLAIN ANALYZE` test over ~20,000 rows shows the ranked plan, pages one and two, still starting from the expression indexes. M8.14 declares its `(lower(name), canonical_key, id)` parts on the same mechanism rather than building one.

_Acceptance criteria:_

- A search pages best match first, `(score DESC, name ASC, id ASC)` — ties on score by name then id — and a walk across a tie neither loses nor repeats a row, forwards or backwards
- `edges { score }` is the row's word similarity on a search and `null` without one; the SDL snapshot and `src/gql/` are regenerated
- A one-character query is no filter and no ranking, asserted at the service (the finder sees `query: undefined`) and through the query
- The keyset helper takes a list of sort parts, each a column or an expression with its cast type, all ascending; a cursor whose key has the wrong number of parts is `InvalidCursor`; single-column callers are unchanged in behaviour; `tests/db/pagination.test.ts` walks a compound, computed key with a tie
- The ranked query, on its first page and after a cursor, starts from `ingredients_unaccent_trgm` and `ingredient_folk_names_unaccent_trgm` under `enable_seqscan = off` over ~20,000 rows with no `SubPlan`, and the test prints the ranked and unranked timings
- `claude-docs/graphql.md` ("Pagination", the compendium section), `claude-docs/db.md` ("Keyset pages", "The compendium read") and DESIGN.md §7 and §14 describe the compound key and the score

**MB.105 — Page numbers on the compendium connection** · 4h

_Story 14 — As a workspace member, I want a browsable compendium page, so that I can find shared entries and add them to my ingredients._

M8.18's pager can offer Next and Previous and nothing more: the compendium connection carries `edges` and `pageInfo`, the whole Relay set, and no count, so neither how many pages there are nor which one this is can be shown. This task adds both, as `totalCount: Int!` and `countBefore: Int` on `QueryCompendiumConnection` — the rows the list holds under its filter, and how many of them come before this page's first edge, 0 on the first page and null on an empty one — and the client derives "Page X of Y": the page is `floor(countBefore / size) + 1`, the count `max(1, ceil(totalCount / size))`, and Last asks for `last: totalCount % size || size`, since `last: 25` would end on a page that starts mid-page and read one page early. The position is counted from a key and never used to seek, so DESIGN.md §7's "never an offset" stands; a row inserted ahead mid-walk shifts a label, not a page. No numbered jump links: a cursor per page would rank every match on every request and tie the pager to one page size. The position is named as the count it is rather than `startIndex`, which Google's JSON style guide and OpenSearch count from 1, so a client has no base to guess.

`pagedConnection` gains an optional `count`, emitted as the two fields through the Relay plugin's connection options, beside MB.104's edge fields. Both fields share one memoised call per connection, so selecting both runs one query and selecting neither runs none — M8.10's typeahead dropdown, the first page of the same search, selects neither. The count is one statement, `count(*)` beside `count(*) filter (where <row> < <first edge's key>)`, built by a count mode on `selectFrom` over the page's own `where` and search join, with no order or limit and no new `.select(`; the keyset is built once for the page and the count, so the two cannot drift. On a search it runs under the page's word-similarity threshold, 0.5 — read at the server's 0.6 it would count fewer rows than the pages hold. It is priced as `pageInfo` is, at the page size.

_Acceptance criteria:_

- `totalCount` equals the rows collected by walking every page — unfiltered, by category, by form, and on a search whose query is word-similar between 0.5 and 0.6 — and excludes soft-deleted and workspace rows
- `countBefore` is `(n − 1) × size` on page n, walked forwards and backwards across a score tie, and null on an empty page
- Selecting neither field runs no count; selecting both runs one
- A signed-out query reads both fields
- The SDL snapshot and `src/gql/` are regenerated; `claude-docs/graphql.md` ("Pagination", the compendium section), `claude-docs/db.md` ("Keyset pages", "The compendium read") and DESIGN.md §7 describe the two fields and the client's formula

**MB.106 — Mark compendium entries New or Updated for 30 days** · 3h

_Story:_ As a reader of the compendium, I want to see which entries are new and which have changed lately, so that a return visit shows me what moved since I last looked.

A compendium entry reads **New** for 30 days after it is created and **Updated** for 30 days after its last change, New winning while both hold. Compendium entries only: a coven's ingredients are its members' own, and they made the changes themselves. Both markers are computed at read time from the entry's stamps, so there is no column and nothing runs on a schedule. They show on M8.14's card in M8.18's list and on M8.19's entry page, public and in-app. M8.6's hour-long cache and the pages' ISR mean a marker appears or lapses up to an hour late, which is accepted rather than worked around.

Two things the task settles, because the stamps as they stand do not say "changed". `updateCompendiumEntry` replaces the whole row, and M1.18's trigger stamps `updated_at` on every `UPDATE`, so a save that changes nothing would read as an update. And an entry's folk names and categories are child rows, whose changes do not move the entry's own `updated_at`. Raised while scoping MB.82, whose "new at this address" notice this replaces with a marker every new entry carries.

_Acceptance criteria:_

- An entry created within the last 30 days reads New, and one changed within them reads Updated; New wins when both hold, and neither shows after 30 days, tested at either side of the boundary
- A save that changes nothing leaves the entry's marker as it was
- A change to an entry's folk names or categories marks it Updated
- The markers show on the compendium list's cards and on the entry page, public and in-app, as text a screen reader announces rather than colour alone
- A coven's ingredients carry no marker

**MB.107 — Drop the pending-slug columns MB.82 stopped declaring** · 1h

_Story:_ As an operator, I want a column dropped only after the code that declared it has left every deploy, so that a migration never breaks the reads of the version still serving.

MB.82 replaced the slug reservation's pending claims with a taker ending the redirect ([`design-decisions/mb.82-slug-takeover.md`](../design-decisions/mb.82-slug-takeover.md)), and took `pending_slug`, `pending_slug_effective_at` and their two partial unique indexes out of the Drizzle schema. That was the first half of the drop, and this task is the second: the migration `drizzle-kit generate` now produces, with its acknowledgement sidecar. It lands once MB.82 has deployed to staging, since a drop that met a deploy still declaring the columns would break that deploy's ingredient reads (`.claude/rules/database.md`, rule 10). Production has never had them — its release predates MB.81 — so the release carrying both ships the add and the drop together. Until this lands, a `db:generate` run on any branch emits the drop; the destructive-DDL check refuses it without a sidecar, and it belongs here rather than to the branch that ran the command.

_Acceptance criteria:_

- The migration drops the two pending-slug indexes and the two columns, and nothing else
- An acknowledgement sidecar beside it says why the drop is safe, and `npm run check:destructive-ddl` passes
- The catalogue tests expect only the five unique indexes the schema declares, and no pending column
- `db:generate` reports no change afterwards

**MB.108 — Move type declarations into type-only files** · 8h

_Story:_ As a developer, I want a code file to hold behaviour and its types to sit in a type-only file beside it, so that I read what a file does without scrolling past the shapes it passes around.

Raised by the owner: 126 `type` and `interface` declarations in 61 files of `src/` and `scripts/` sat inline, and nothing said where a type belongs. This moves every one that can move into a `types.ts` beside the code that uses it, and lands the guard that keeps them there. Larger than the usual sitting because it is a sweep with its guard, and a sweep that attaches to code lands as a mechanism plus a guard rather than piecemeal. `tests/` follows in MB.109.

Three kinds stay in their code file. The first is a type derived from a value declared in the same file, such as the Zod schema and type pairs, `Loaders` and `WorkspacePermission`. The second is the branded proofs `Membership` and `SiteAdmin`, beside the function that mints each. The third is the repository's two `typeof db` types, since the client import is pinned to three files. Where a types file sits follows from who imports it, because the guards that walk imports follow `import type` too. `src/lib/types.ts` imports nothing, since a validation schema reaches it. A module's types sit at the module root, named through its index. A validation file's helper types go in `validation/types.ts` ([`design-decisions/mb.108-types-in-type-files.md`](../design-decisions/mb.108-types-in-type-files.md)).

_Acceptance criteria:_

- `tests/guards/types-in-type-files.test.ts` fails a column-0 `type` or `interface` in any `src/` or `scripts/` file that is not type-only, unless it reads a same-file value through `typeof`, carries a same-file `unique symbol` key, or is on its pinned list. It proves itself on both proofs and a Zod pair, and fails a pinned entry that no longer exists.
- The guard passes over `src/` and `scripts/`, with the exemptions `Membership`, `SiteAdmin`, the value-derived types, `Executor` and `Transaction`, and no others.
- `src/db/repository/shapes.ts` is `types.ts` and `predicates.ts`, and the index re-exports its types in one `export type` line without changing its value exports.
- Each module's index names the moved types it exported before, so no module's surface shrinks. `@/modules/*/types` is in the lint deep-import group in every override, and `lint-access-boundary.test.ts` probes it.
- `IngredientRow` and the seed's `SeedUser` are declared once each.
- The scripts Node runs directly import their types as `import type … from './types.ts'`, and still run.
- `claude-docs/modules.md` has "Where types live"; CLAUDE.md's Conventions name the rule; `db.md`'s repository file table lists the folder as it is.

**MB.109 — Move the tests' type declarations into type-only files** · 5h

_Story:_ As a developer, I want the tests to follow the same rule as the code, so that a test file reads as its cases and a shape two tests share is declared once.

MB.108's guard covers `src/` and `scripts/`. This widens it to `tests/` and moves the tests' own declarations, about 130 in 23 directories, into a `types.ts` per directory. The shared harness in `tests/support/` goes first, because the rest import it. The repeats collapse as they move: `Diagnostic` four times in the guards, `Logged` four times, `Step`, `Job` and `Workflow` across the workflow guards, and `Row` three times. The names reused for different shapes, `Node`, `Connection` and `UserRow` among them, are renamed for what each holds. A type declared inside a function or a `describe` block stays with it, and so does one derived from a table the test declares itself.

_Acceptance criteria:_

- The guard's roots include `tests`, and it passes.
- Every duplicate shape in `tests/` is declared once, and a test's type that duplicates a `src/` type imports that one instead, such as `ProviderId` and `SpellVisibility`.
- The guard's own interfaces live in `tests/guards/types.ts`.
- `npm run test:coverage` and `npm run test:stories` pass.

**MB.110 — Make spell layers soft-deletable** · 3h

_Story:_ As a workspace member, I want an ingredient I take out of a spell to be recoverable, so that editing a record of a working never loses part of it.

A table task, minted by M5.3. `spell_ingredients` is one of MB.34's three hard-deleted join tables; a spell is a record of a working, so a layer leaves it only when a user removes it, and then softly. The table takes the full `...auditColumns`, gaining `deleted_at` and `deleted_by`; `ingredient_categories` and `spell_categories` stay hard-deleted, so "the three join tables" becomes two in CLAUDE.md rules 3 and 4, DESIGN.md §5, db.md's "Hard delete on the three join tables", `tests/support/db/table-metadata.ts` and `audit-columns.test.ts`. A removed layer must not hold its slot, so the `(spell_id, layer_order)` primary key gives way to a surrogate `id`, with `(spell_id, layer_order)` a partial unique index over live rows, and the two existing partial indexes gain `deleted_at IS NULL`. That is destructive DDL — a primary key and two indexes dropped, a `NOT NULL` column added — so the migration carries an `.ack.md` sidecar, and the task decides whether the index swap needs MB.107's two-PR split. It lands while the table is still empty in production and before Wave 13 writes a layer. M5.3's spell finders read the layer through `existsIn`, which filters a removed layer as soon as the column exists, so they need no change.

_Acceptance criteria:_

- `spell_ingredients` carries all six audit columns, and a catalogue test asserts every unique index on it is partial on `deleted_at IS NULL`
- A removed layer vanishes from `findManyInSpell` and from M5.3's two spell finders
- A removed layer's `layer_order`, ingredient and custom name can be reused in the same spell
- Soft-deleting an ingredient never touches a layer
- The destructive-DDL check passes with the sidecar, and the demo seed and spell fixtures still write

**MB.111 — Carry the return path through the verification link** · 2h

_Story:_ As a new member, I want the link that confirms my address to take me on to the page I was headed for, so that confirming it does not drop me somewhere else.

Minted during M5.4. `requireSession()` sends an unverified account to `/account/email?next=<its own path>`, and the confirmed view's Continue goes to that `next` — but no mailed link carries it. The `sendVerificationEmail` hook in `src/lib/auth.ts` rewrites every link's `callbackURL` to `VERIFIED_LANDING` (`/account/email?verified`), and `src/lib/email-verification.ts` sends the resend and change links to the same fixed landing, so the page the link opens has no `next` and Continue falls back to `/coven`. A new account sent to verify on its way to `/admin` ends at the landing instead.

The landing becomes `/account/email?verified&next=<path>`, the path through `safeReturnPath` when the link is built as well as when the page reads it. The hook builds it from the link's own `callbackURL`: a sign-up's is where the sign-in was going, and a resend's is the landing the email page asked for. The email page hands its `next` to the resend and change links through an optional `next` argument on `setEmail`, passed to the sender, with the SDL snapshot and codegen regenerated. A refused link already keeps the rest of its landing's query, so an expired or wrong-account link keeps `next` beside its `?error=`. The confirmed view stays (MB.54): the link lands on it, and Continue goes on. The signed-out path, `SIGN_IN_TO_VERIFY_PATH`, carries nothing from the link by design and is unchanged.

_Acceptance criteria:_

- The sign-up, resend and change links each land on the confirmed view carrying the `next` the account was sent with, and Continue goes there
- A `next` that leaves the site is dropped when the link is built, and that link lands as it does today
- A refused link keeps `next` beside its `?error=`
- With no `next`, every link lands exactly as today
- `auth.md`'s "The email page" and `components/email-form.md` describe the landing

**MB.112 — Give each Playwright worker its own server and database** · 2h

_Story:_ As a developer, I want the e2e suite to run in parallel without one spec file resetting another's database, so that it stays fast as the UI specs arrive and never fails for a reason that is not in the code.

Minted during M5.4. CLAUDE.md says Playwright re-clones its database before every spec file as Vitest does, but Vitest gives each worker its own database and Playwright has one, `sorrel_e2e`, which every server reads. A file's reseed drops it `WITH (FORCE)`, cutting the connections of whatever another worker is running, and two files starting together race the same `CREATE DATABASE` — the collision M5.4's `admin.spec.ts` hit beside `account.spec.ts`. M5.4 set `workers: 1` to keep the rule true; this task makes it true in parallel.

Each worker slot gets its own server and database, as each Vitest pool slot gets a database. Playwright's `parallelIndex`, `TEST_PARALLEL_INDEX` inside the worker, is unique among running workers and kept across a worker's restart. The first `webServer` entry still builds; each further slot runs `npm run start` over that build on the next port, reading `sorrel_e2e_<index>`. The configured-providers server moves off 8002 to a port and a database of its own, which no spec reseeds. `global-setup.ts` clones every slot's database from the one seeded template before any test runs — after the servers start, which Playwright does first. `recreateE2eDatabase()` and `signInAs()` read the slot themselves, so no spec changes, and a fixture points the default project's `baseURL` at its slot's server. The worker count becomes a config value with an env override, since the servers are declared up front, and a slot with no server fails loudly rather than reaching another worker's.

**Decided while building:** a server per slot, declared in `playwright.config.ts`, over the two alternatives [`design-decisions/mb.112-server-per-worker.md`](../design-decisions/mb.112-server-per-worker.md) records — a server each worker starts from a worker-scoped fixture, which reboots a server after every failed test, since Playwright replaces the worker and its fixtures die with it, and can orphan one on the port the slot's next worker needs; and one server choosing its database per request by a header the browser sends, which puts a test-only, request-controlled database switch into `src/db/connection.ts` and hands one slot's cached compendium to every slot. Swapping `DATABASE_URL` in the worker, as Vitest does, would move only the reseed and `signInAs()`: the app runs in `next start`, which read it once at boot. The worker count is `E2E_WORKERS`, defaulting to half the CPUs as Playwright's own default does, and capped at 99. The configured-providers server takes 8100, fixed above every slot's port with the cap keeping it there, so that no slot reaches it or, under a local `reuseExistingServer`, silently attaches to it; it reads `sorrel_e2e_providers`. `global-setup.ts` runs after the servers start, not before as `testing.md` had it — Playwright's runner orders the `webServer` entries ahead of the global setups — which is enough only because postgres.js connects on its first query and the readiness poll reads no database. Riding in the same PR as a sub-hour fix: `experimental.isrFlushToDisk` off under `NEXT_ISR_FLUSH_TO_DISK=false`, which every e2e server sets, since the servers share the one `.next-e2e` build and a data cache flushed to it would hand one slot's cached compendium to another slot's server ([`testing.md`](../testing.md), "E2E — Playwright").

_Acceptance criteria:_

- `workers` is above one, and each worker's reseed, `signInAs` and page requests reach only its own database and server
- Two db-touching spec files starting together on different workers both pass, where on the one shared database they collided
- A retried test runs on the same slot, server and database
- Asking for more workers than there are servers fails with a message naming the limit
- The configured-providers spec runs against its own server and database
- CLAUDE.md's "Playwright does the same" and testing.md's E2E section describe one server and database per worker, and the ports named in `testing.md`, `DESIGN.md` and `components/sign-in-panel.md` are corrected

**MB.113 — Land an admin on the admin area after a sign-in with no return path** · 2h

_Story:_ As a site admin, I want signing in to take me to the admin area when I was not headed anywhere else, so that curating starts where I work.

Minted during M5.4, on the owner's request. With no `next`, the sign-in page falls back to `POST_SIGN_IN_LANDING`, `/coven`, for everyone. A verified admin who signs in with no return path lands on `/admin` instead. A return path still wins, an explicit `/coven` included, so the sign-in has to carry whether one was asked for rather than the callback guessing it from the landing path. The callback's after-hook in `src/lib/auth.ts` already sends an unverified account to the email page and promotes the primary admin, so it is where the landing is chosen, by the role after any promotion at this very sign-in. An unverified admin goes to the email page first, as every unverified account does, and the page's Continue follows the same rule. DESIGN.md §9's `/coven` row and `auth.md`'s "Route protection" record it.

**Decided while building:** the sign-in carries it as Better Auth's `additionalData`, a `NO_RETURN_PATH` flag the after-hook reads back with `getOAuthState()` — the one channel from the browser's `signIn.social` to the callback, and the one the link flow already reads `link` through. It is client-supplied, and harmless so: it only chooses between two landings the account may open anyway. `safeReturnPath` loses its `/coven` fallback and answers `undefined` for a missing or unsafe `next`, since which landing applies is the role's, known only once the callback has run: so `signInPath` with none is a bare `/sign-in`, the email page with none is a bare `/account/email`, and `verifiedLanding` carries an explicit `/coven` rather than dropping it. `postSignInLanding(role)` is the one rule, used by the after-hook and by the email page's Continue, which reads the role when it renders, after a followed link has promoted the primary admin. `socialSignInTarget(next)` builds `SignInPanel`'s call and the tests' OAuth harness alike, so a harness sign-in with no destination is the panel's. On the owner's request while building, `/`'s signed-in Continue follows the same rule: `src/app/page.tsx` hands `Welcome` the `postSignInLanding` of the session's role, so an admin's front door leads to `/admin` too.

_Acceptance criteria:_

- A verified admin who signs in with no `next` lands on `/admin`
- With a `next`, `/coven` included, an admin lands on it
- A non-admin with no `next` lands on `/coven`, as today
- The primary admin promoted at this sign-in lands on `/admin`
- An unverified admin is sent to the email page first, and its Continue, with no `next`, goes to `/admin`
- DESIGN.md §9 and `auth.md` describe the admin's landing

**MB.114 — Design review: foundations** · 3h

_Story:_ As the site's owner, I want the palette, type, spacing and shared primitives settled first, so that each section review designs its pages rather than re-deciding a button.

Minted during M5.4, the first of the design reviews and the one the rest build on. Since M0 the standing rule has been that the design will change and nothing is styled beyond the tokens and mixins; MB.114 through MB.124 are where it changes, one section at a time, each once the section is built. This one reviews what every section shares: the palette and its two themes, the type scale, spacing, which has no scale yet, the reading measure, focus rings, and the `_primitives.scss` class layer — buttons, panels, chips, badges and modals. It adds the one primitive every section needs and none has, form fields, and lands before the admin pages are built, so they are built on it. The direction it settles is written into `styling.md`, where each section review reads it, and it is reviewed in the workshop, in both themes and at phone width, with the owner signing off before anything is built.

_Acceptance criteria:_

- The owner signs off the palette, type scale, spacing and primitives, in both themes and at phone width, recorded as a comment on this issue
- `styling.md` records the direction the section reviews design to, including the spacing scale if one is adopted
- Form fields — text, select, textarea, checkbox and their error state — exist as a primitive, and `EmailForm` uses it
- The workshop has a foundations page showing the palette, type scale, spacing and every primitive in both themes
- Every token still clears 4.5:1 in both themes, and the existing pages' e2e specs, axe scans and stories pass

**MB.115 — Design review: the admin area** · 3h

_Story:_ As a site admin, I want the admin area to look finished and read clearly, so that curating the compendium is quick and hard to get wrong.

Minted during M5.4. Reviews the admin area once its last page lands: M5.4's layout and `AdminNav`, including the current-page marker it leaves to the design; `IngredientForm` in editable mode (M5.9, M5.10, M5.10a) inside M5.5's compendium page; the category, form, planet and zodiac pages (M5.6, M5.6a, MB.95); the group pages and their colour pickers (M5.6b); the user list (MB.52) with its approval, grant and pause controls (M5.8, MB.59, MB.63); and admin invitations (MB.70). The admin layout is wider than the reading measure for its tables. `IngredientForm` is reviewed again read-only and inside the add and edit modals, with the compendium (MB.120).

A section review designs what the section's building tasks left at the tokens and mixins. It looks at every page and component in the section as built — in the workshop and the running app, in both themes, at desktop and at phone width (375px) — proposes the design as workshop stories and screenshots, and builds what the owner signs off, within the tokens, mixins and primitives MB.114 settles: a value that is not there becomes a token, never a raw hue or size (`styling.md`). Behaviour does not change; a defect found on the way is fixed if it is sub-hour and minted if not.

_Acceptance criteria:_

- The owner signs off the section's design, in both themes and at phone width, recorded as a comment on this issue
- No page in the section scrolls sideways at 375px, and its body copy keeps to the reading measure
- Contrast holds at 4.5:1 in both themes, and no raw hue or size is added outside `_variables.scss`
- Every page in the section is axe clean with visible keyboard focus, and its e2e specs and stories pass
- Each component's doc updates its Styling section, and its stories show the reviewed design
- `AdminNav` marks the current page, with `aria-current` as well as visually
- Admin lists and tables read at desktop width and stay usable at phone width
- A destructive admin action looks destructive, and its confirmation says what will happen

**MB.116 — Design review: the sign-in and account pages** · 2h

_Story:_ As a member, I want signing in and managing my account to feel like one finished site, so that trusting it with my sign-in is easy.

Minted during M5.4. Reviews the pages around signing in once MB.88 rebuilds `/account`: the public entry page `/` (MB.57), the sign-in page and its provider buttons with the last-used mark (M2.6, MB.77), `/account` with the name and address (MB.88), `/account/email` (MB.54) and the not-authorized page (M5.4). The sign-in methods list on `/account` has a review of its own, MB.117, straight after.

A section review designs what the section's building tasks left at the tokens and mixins. It looks at every page and component in the section as built — in the workshop and the running app, in both themes, at desktop and at phone width (375px) — proposes the design as workshop stories and screenshots, and builds what the owner signs off, within the tokens, mixins and primitives MB.114 settles: a value that is not there becomes a token, never a raw hue or size (`styling.md`). Behaviour does not change; a defect found on the way is fixed if it is sub-hour and minted if not.

_Acceptance criteria:_

- The owner signs off the section's design, in both themes and at phone width, recorded as a comment on this issue
- No page in the section scrolls sideways at 375px, and its body copy keeps to the reading measure
- Contrast holds at 4.5:1 in both themes, and no raw hue or size is added outside `_variables.scss`
- Every page in the section is axe clean with visible keyboard focus, and its e2e specs and stories pass
- Each component's doc updates its Styling section, and its stories show the reviewed design
- The provider buttons keep their brand-coloured and greyed states distinct in both themes
- `/`, `/sign-in` and the not-authorized page read as one site with the signed-in pages

**MB.117 — Design review: sign-in methods** · 1h

_Story:_ As a member, I want to see at a glance how I can sign in, and add or remove a method safely, so that I never lock myself out by accident.

Minted during M5.4, a review of its own at the owner's request, after the sign-in and account pages (MB.116): `SignInMethods` on `/account` (MB.71, moved there by MB.88) — each provider linked or addable, Add greyed for a provider that is not configured, Remove only while another method is left, and the error a failed link comes back with.

A section review designs what the section's building tasks left at the tokens and mixins. It looks at every page and component in the section as built — in the workshop and the running app, in both themes, at desktop and at phone width (375px) — proposes the design as workshop stories and screenshots, and builds what the owner signs off, within the tokens, mixins and primitives MB.114 settles: a value that is not there becomes a token, never a raw hue or size (`styling.md`). Behaviour does not change; a defect found on the way is fixed if it is sub-hour and minted if not.

_Acceptance criteria:_

- The owner signs off the section's design, in both themes and at phone width, recorded as a comment on this issue
- No page in the section scrolls sideways at 375px, and its body copy keeps to the reading measure
- Contrast holds at 4.5:1 in both themes, and no raw hue or size is added outside `_variables.scss`
- Every page in the section is axe clean with visible keyboard focus, and its e2e specs and stories pass
- Each component's doc updates its Styling section, and its stories show the reviewed design
- Linked, addable and unavailable providers are told apart without colour alone
- The last remaining method reads as the one that cannot be removed, and says why
- A failed link's error sits beside the provider it concerns

**MB.118 — Design review: the site's mail** · 2h

_Story:_ As a new member or an invitee, I want the site's mail to look like the site and read well in my mail client, so that I trust the link in it.

Minted during M5.4. Reviews the mail the site sends, once the last of it exists: the verification and change-of-address mail (MB.66, `verify-email.tsx`), the coven invitation (M7.3) and the admin invitation (MB.70). Mail has its own constraints — inline styles, a client's own dark mode, images blocked by default, MB.72's light-mode rules — so it is reviewed as mail, in Mailpit and in the major clients, not as a page, and built within the palette and type MB.114 settles. Behaviour does not change; a defect found on the way is fixed if it is sub-hour and minted if not.

_Acceptance criteria:_

- The owner signs off each mail's design, in a light and a dark client, recorded as a comment on this issue
- Each mail reads correctly in Gmail, Outlook and Apple Mail, light and dark, and with images blocked
- Each mail carries a plain-text part that says everything its HTML does
- The link is the obvious action, and its address is also readable as text
- Text contrast holds at 4.5:1 in the mail's light and dark renderings
- `email.md` records the design rules the mail follows

**MB.119 — Design review: the coven and invitations** · 3h

_Story:_ As a coven member, I want the coven's pages to feel like one place I belong to, so that finding members and inviting someone is obvious.

Minted during M5.4. Reviews the coven section once invitations land: creating a coven (M6.7), `WorkspaceSwitcher` (M6.9), the coven layout's chrome (M6.10), `MemberList` and the members page with its owner controls (M6.12, M6.13), deleting, leaving and the last owner's guided exit (M6.14 to M6.16), last-edited-by on ingredient rows (M6.18), `InviteDialog` (M7.4), the acceptance page (M7.5) and the post-sign-in landing (M2.8). The switcher is reviewed here as a component; where it sits in the app's nav is MB.122's.

A section review designs what the section's building tasks left at the tokens and mixins. It looks at every page and component in the section as built — in the workshop and the running app, in both themes, at desktop and at phone width (375px) — proposes the design as workshop stories and screenshots, and builds what the owner signs off, within the tokens, mixins and primitives MB.114 settles: a value that is not there becomes a token, never a raw hue or size (`styling.md`). Behaviour does not change; a defect found on the way is fixed if it is sub-hour and minted if not.

_Acceptance criteria:_

- The owner signs off the section's design, in both themes and at phone width, recorded as a comment on this issue
- No page in the section scrolls sideways at 375px, and its body copy keeps to the reading measure
- Contrast holds at 4.5:1 in both themes, and no raw hue or size is added outside `_variables.scss`
- Every page in the section is axe clean with visible keyboard focus, and its e2e specs and stories pass
- Each component's doc updates its Styling section, and its stories show the reviewed design
- Owner-only controls read as such, and a viewer's page shows no control it cannot use
- The acceptance page reads correctly signed in, signed out, and for an expired or used link

**MB.120 — Design review: the public compendium and shared ingredient components** · 3h

_Story:_ As a visitor, I want the public compendium to look finished and read well on any device, so that it earns trust as a reference.

Minted during M5.4. Reviews the public compendium and the ingredient components the rest of the site shares, once MB.106's markers land: `IngredientSearch` with its chips, OR toggle and filters (M8.10 to M8.13), `SafetyNote` (M8.13a), the local-or-compendium chip and the stock badges (M9.7, M9.8), `IngredientCard` (M8.14), `IngredientForm` read-only and inside the add and edit modals (M8.15 to M8.17), the public frame and its signed-in island (MB.83), the compendium page and its pager (M8.18, MB.105), the entry page (M8.19) and the New and Updated markers (MB.106). The compendium is the site's public, indexable face (MB.80), so it is reviewed signed out as well as signed in.

A section review designs what the section's building tasks left at the tokens and mixins. It looks at every page and component in the section as built — in the workshop and the running app, in both themes, at desktop and at phone width (375px) — proposes the design as workshop stories and screenshots, and builds what the owner signs off, within the tokens, mixins and primitives MB.114 settles: a value that is not there becomes a token, never a raw hue or size (`styling.md`). Behaviour does not change; a defect found on the way is fixed if it is sub-hour and minted if not.

_Acceptance criteria:_

- The owner signs off the section's design, in both themes and at phone width, recorded as a comment on this issue
- No page in the section scrolls sideways at 375px, and its body copy keeps to the reading measure
- Contrast holds at 4.5:1 in both themes, and no raw hue or size is added outside `_variables.scss`
- Every page in the section is axe clean with visible keyboard focus, and its e2e specs and stories pass
- Each component's doc updates its Styling section, and its stories show the reviewed design
- The compendium and entry pages read the same signed out and signed in, apart from the signed-in island
- A safety note stands out from the rest of an entry without relying on colour alone
- The card grid holds its layout from phone width to a wide screen

**MB.121 — Design review: the workspace ingredients page** · 2h

_Story:_ As a coven member, I want the ingredients page to make stock easy to scan and edit, so that keeping it current is quick.

Minted during M5.4. Reviews the coven's one ingredients page (M9.6) once its flows land — inline row editing (M9.9), deletion with confirmation (M9.10), the empty state (M9.11) and the add-from-compendium flow (M9.12) — over the search and cards MB.120 has reviewed.

A section review designs what the section's building tasks left at the tokens and mixins. It looks at every page and component in the section as built — in the workshop and the running app, in both themes, at desktop and at phone width (375px) — proposes the design as workshop stories and screenshots, and builds what the owner signs off, within the tokens, mixins and primitives MB.114 settles: a value that is not there becomes a token, never a raw hue or size (`styling.md`). Behaviour does not change; a defect found on the way is fixed if it is sub-hour and minted if not.

_Acceptance criteria:_

- The owner signs off the section's design, in both themes and at phone width, recorded as a comment on this issue
- No page in the section scrolls sideways at 375px, and its body copy keeps to the reading measure
- Contrast holds at 4.5:1 in both themes, and no raw hue or size is added outside `_variables.scss`
- Every page in the section is axe clean with visible keyboard focus, and its e2e specs and stories pass
- Each component's doc updates its Styling section, and its stories show the reviewed design
- A row being edited reads differently from one at rest, and an unsaved change shows
- The empty state says what to do next

**MB.122 — Design review: the navigation** · 2h

_Story:_ As a user, I want the navigation to look finished and show me where I am, so that moving around the site is effortless on any screen.

Minted during M5.4, on the owner's request that the nav be designed once MB.7 builds it. Reviews `AppShell`: the primary nav, where `WorkspaceSwitcher` and the global add and edit affordances sit, the Admin entry, and the section navs beneath it — the coven layout's and `AdminNav`. At phone width the nav has to fit, which may mean collapsing it behind a control.

A section review designs what the section's building tasks left at the tokens and mixins. It looks at every page and component in the section as built — in the workshop and the running app, in both themes, at desktop and at phone width (375px) — proposes the design as workshop stories and screenshots, and builds what the owner signs off, within the tokens, mixins and primitives MB.114 settles: a value that is not there becomes a token, never a raw hue or size (`styling.md`). Behaviour does not change; a defect found on the way is fixed if it is sub-hour and minted if not.

_Acceptance criteria:_

- The owner signs off the section's design, in both themes and at phone width, recorded as a comment on this issue
- No page in the section scrolls sideways at 375px, and its body copy keeps to the reading measure
- Contrast holds at 4.5:1 in both themes, and no raw hue or size is added outside `_variables.scss`
- Every page in the section is axe clean with visible keyboard focus, and its e2e specs and stories pass
- Each component's doc updates its Styling section, and its stories show the reviewed design
- Every nav marks the current page, with `aria-current` as well as visually
- At phone width the nav is reachable and operable by keyboard and by screen reader
- The section navs read as beneath the shell's nav, not beside it

**MB.123 — Design review: the grimoire** · 3h

_Story:_ As a coven member, I want building and reading a spell to feel crafted, so that the grimoire is a pleasure to use.

Minted during M5.4. Reviews the grimoire once its print layout lands: the grimoire list (M10.11), `SpellBuilder` with its fields, visibility control, intent categories, layers and reordering (M10.12 to M10.16), the intent-versus-derived comparison panel (M10.17), the safety and out-of-stock warnings (M10.18, M10.19), draft and complete (M10.20), and the recipe view (MB.6) with its print layout (M10.22), the one print style on the site.

A section review designs what the section's building tasks left at the tokens and mixins. It looks at every page and component in the section as built — in the workshop and the running app, in both themes, at desktop and at phone width (375px) — proposes the design as workshop stories and screenshots, and builds what the owner signs off, within the tokens, mixins and primitives MB.114 settles: a value that is not there becomes a token, never a raw hue or size (`styling.md`). Behaviour does not change; a defect found on the way is fixed if it is sub-hour and minted if not.

_Acceptance criteria:_

- The owner signs off the section's design, in both themes and at phone width, recorded as a comment on this issue
- No page in the section scrolls sideways at 375px, and its body copy keeps to the reading measure
- Contrast holds at 4.5:1 in both themes, and no raw hue or size is added outside `_variables.scss`
- Every page in the section is axe clean with visible keyboard focus, and its e2e specs and stories pass
- Each component's doc updates its Styling section, and its stories show the reviewed design
- The recipe view's print layout is reviewed on paper or as a PDF as well as on screen
- Reordering layers reads clearly by keyboard as well as by pointer
- The comparison panel reads without relying on colour alone

**MB.124 — Design review: error, loading and empty states, and the whole site** · 3h

_Story:_ As a user, I want errors, loading and empty pages to look as finished as the rest, and the whole site to feel like one thing, so that nothing looks broken.

Minted during M5.4, the last design review, once M11.10's error pages and M11.16's images land: the cold-start skeletons (M11.9); the 403, 404 and 500 pages (M5.4, M11.10), which need one design whether Next draws them in the browser, as it does a thrown error, or on the server, as it does an unmatched URL (`auth.md`, "The admin guard"); the empty states across sections; and a read of the whole site end to end for anything the section reviews left inconsistent.

A section review designs what the section's building tasks left at the tokens and mixins. It looks at every page and component in the section as built — in the workshop and the running app, in both themes, at desktop and at phone width (375px) — proposes the design as workshop stories and screenshots, and builds what the owner signs off, within the tokens, mixins and primitives MB.114 settles: a value that is not there becomes a token, never a raw hue or size (`styling.md`). Behaviour does not change; a defect found on the way is fixed if it is sub-hour and minted if not.

_Acceptance criteria:_

- The owner signs off the section's design, in both themes and at phone width, recorded as a comment on this issue
- No page in the section scrolls sideways at 375px, and its body copy keeps to the reading measure
- Contrast holds at 4.5:1 in both themes, and no raw hue or size is added outside `_variables.scss`
- Every page in the section is axe clean with visible keyboard focus, and its e2e specs and stories pass
- Each component's doc updates its Styling section, and its stories show the reviewed design
- The 403, 404 and 500 pages share one design, and a thrown one looks the same drawn by the browser as the unmatched 404 drawn by the server
- Every skeleton matches the layout it stands in for
- Every finding of the whole-site read is fixed or minted

**MB.125 — Categories on the ingredient writes** · 2h

_Story 30 — As a workspace member, I want the categories I pick saved with the ingredient, so that searching by category finds it._

Minted during M5.9, on the owner's question of whether ingredients get categories. They do — `ingredient_categories` (M4.4), `Ingredient.categories` through M4.8's loader, and the seed tags the compendium — but nothing writes them: M8.8's inputs take no `categoryIds`, and M8.11, which cited story 30, builds its chips as a search filter. This task is the write half; MB.126 is the picker. `categoryIds` joins both Zod variants and every ingredient input — the workspace create and update and the compendium create and update — and DESIGN.md §7's sketch. The service replaces the ingredient's set inside the `withAudit` transaction that writes the ingredient: a pair kept keeps its stamps, a pair dropped is hard-deleted (MB.34), and a pair added is stamped from the session. On update the field is required, as every field of `IngredientUpdateInput` is (M8.8), and `[]` clears it.

_Acceptance criteria:_

- Creating an ingredient with `categoryIds` writes one `ingredient_categories` row per id, stamped from the session, in the ingredient's own transaction — a failed category write leaves no ingredient behind
- Updating replaces the set: a kept pair's `created_by` and `created_at` are unchanged, a dropped pair leaves no row, and an added pair is stamped by the editor
- An id naming no live category, unknown or soft-deleted, is a `VALIDATION` field error at `['categoryIds', i]`; a repeated id is written once
- The returned `Ingredient`'s `categories` are the ones just written
- A viewer is refused, as for any workspace write; a compendium entry's categories are written only under the `SiteAdmin` proof
- DESIGN.md §7's sketch and claude-docs/graphql.md name the new field

**MB.126 — Grouped category picker in IngredientForm** · 3h

_Story 30 — As a workspace member, I want to pick categories from grouped chips, so that I can tag an ingredient without scrolling through 63 of them._

Minted during M5.9. Follows MB.36, whose row colours the chips wear, and MB.125, which writes what they pick. A public `categories` query returns each live category with its group, cached under the `compendium` tag as rule 6 allows, and paged like every list (rule 8): one page of the hard maximum holds every category there is. `CategoryPicker` is a component of its own, since M8.11 reuses it as its filter: toggle chips grouped by category group, the groups alphabetical by name and each collapsible, a picked chip filled. `IngredientForm` gains it as a `categoryIds` field after the lists. A `fieldErrors` entry at `['categoryIds', i]` renders on the picker's one error element, naming the chip, as a list entry's does (claude-docs/components/ingredient-form.md).

_Acceptance criteria:_

- Every live category appears under its group, the groups alphabetical, and a group added after the seed appears without a code change
- Each chip wears its group's stored colour for the active theme through MB.36's mixin; a picked chip is distinguishable visually and to assistive technology (`aria-pressed`)
- Groups collapse, and the picker is usable at a 375px viewport
- The form sends the picked ids as `categoryIds`, and `[]` when none is picked
- A server field error at `['categoryIds', i]` renders through `FieldError`, on the picker's error element
- `CategoryPicker` ships a story and a component doc

**MB.127 — Make deities an admin-curated vocabulary** · 1.5h

_Story:_ As an admin, I want the deities the autofill offers to be a list I curate, so that a practice's gods are spelled one way and a missing one needs no deploy.

Documentation and scoping only, in MB.91's shape: the model is recorded before the table task transcribes it. Minted during M5.9, on the owner's decision that the deities field searches a curated list, as planet and zodiac do, rather than only the values already in use. `deities` becomes a flat table shaped like `planets` — `name`, `slug`, `description` and the audit spread — and `ingredients.deities` stays `text[]`, by §5's rule that a vocabulary a member writes is text. Two differences from MB.91 are recorded rather than glossed: the ingredient column is an array, so the in-use scan unnests it; and the seeded compendium names no deity at all, so the starting list is the owner's to supply. This task also settles whether `description` is required, as it is for a planet, given a seed of many deities across pantheons.

_Acceptance criteria:_

- DESIGN.md §5 re-points `deities[]` at the vocabulary; its admin sentence, §7 (the `compendium` tag covers six reads), §9's route table (`/admin/deities`) and §14 rows follow, as do CLAUDE.md's curation invariant and rule 6
- The owner's starting list is recorded with its source, for MB.129 to seed
- db.md and modules.md name the table and the module that owns it

**MB.128 — `deities` schema** · 1h

_Story:_ As an admin, I want the deity vocabulary to be rows, so that the autofill has something an admin can edit.

Table task, as MB.92: `src/modules/vocabulary/schema/` gains `deities` with `id`, `name`, `slug`, `description` as MB.127 settles it, and the six-column audit spread; a partial unique index on `slug` where not deleted; one `gin_trgm_ops` index over `(name, description)`, since the suggestion query matches both. The migration appends its own `CREATE OR REPLACE TRIGGER set_updated_at` line, per CLAUDE.md rule 3.

_Acceptance criteria:_

- The table carries exactly its columns plus the audit spread — asserted from `getTableConfig` and the catalogue
- `slug` is unique among live rows on a partial index, freed by soft delete
- The `(name, description)` trigram index exists, asserted from the catalogue
- `ingredients.deities` stays a nullable `text[]` with no foreign key to the table
- `AUDITED_TABLES` gains the name; `tests/db/updated-at-trigger.test.ts` passes
- Nothing reads the table yet

**MB.129 — Seed the deity vocabulary** · 1.5h

_Story:_ As an admin, I want a starting list of deities already curated, so that the autofill offers something before the first one is typed.

As MB.93: the seed gains `DEITIES` from MB.127's list, written through the flat helper over `insertMissing`, with every slug derived by `slugify`. `standard` seeds it inside its own transaction. `scripts/db-seed.ts` gains a `deities` target, `migrate.yml`'s reference-seed step a line, and `deploy.yml`'s seed-changed paths the new file.

_Acceptance criteria:_

- Every value MB.127 records is seeded, in its order, and nothing else — parsed from the doc at test time, the parse itself checked
- Reseeding adds nothing, resurrects nothing an admin soft-deleted, and overwrites no description an admin rewrote
- Rows are stamped by the bootstrap user with the GUC published
- `migrate.yml` runs the new target beside the others; `deploy.yml` re-seeds when the new file changes

**MB.130 — Scoped suggestion field for deities** · 2h

_Story:_ As a workspace member, I want the deities field to suggest from the vocabulary and from what my workspace already uses, so that I do not write Hecate three ways.

Adopts MB.94's `findVocabularySuggestions`, pairing `deities` with `ingredients.deities`. The column is an array, so the in-use scan unnests it before it trims and lower-cases, adopting the scan MB.136 built for the planet and zodiac lists. `deitySuggestions(workspaceId, query)` is a `pagedConnection` of MB.94's `CorrespondenceSuggestion`: curated rows first, matched on name then description, then in-use uncurated values from the compendium and the current workspace only.

_Acceptance criteria:_

- Curated first, uncurated second, distinguishable; a name match outranks a description match
- A value in use only in unrelated workspace X never appears — asserted by direct query, with the precondition that X holds it
- `Hecate` and `hecate` in two ingredients' arrays are one in-use value, and a value equal to a curated name is not offered twice
- Filtered in SQL; soft-deleted rows excluded; bounded by the M3.6 helper; the match uses `%` and `<%` with explicit thresholds, as MB.94's does

**MB.131 — Deity, planet, zodiac and substitute lookups in IngredientForm** · 3h

_Story 16 — As a workspace member, I want the deity, planet, zodiac and substitute fields to suggest from what already exists, so that I pick an entry rather than typing a fourth spelling of it, and a substitute I pick leads to its ingredient._

Minted during M5.9, and widened in the same review once planet and zodiac became lists and a substitute could link an ingredient. Follows M5.10a, whose `Combobox` it reuses, MB.130, and MB.136 and MB.140, which make those changes. The Deities, Planets, Zodiac signs and Substitute ingredients boxes are already that combobox, since M5.10a puts it on every list field; this task gives each its source: deities over `deitySuggestions`, planets and signs over MB.94's `planetSuggestions` and `zodiacSuggestions`, each with curated values distinguished from in-use ones; substitutes over MB.138's `ingredientSuggestions`, the compendium and this coven, or on a compendium entry's form over `compendium(query)`, since its substitutes may link only the compendium. Picking a deity, planet or sign adds its text as an entry. Picking an ingredient adds a linked substitute, its pill reading as that ingredient. Free text is still added by Add or Enter, and a typed substitute stays text. Text left in a box, neither picked nor added, still stops the save, as M5.9's boxes do. Colour keeps no suggestions, the owner's call, and folk names keep M5.10a's. The planet and zodiac lookups moved here from M5.10a once they became lists.

_Acceptance criteria:_

- Typing in any of the four boxes suggests, debounced; picking adds an entry and empties the box
- A deity, planet or sign suggestion shows whether it is curated; a substitute suggestion shows the ingredient's formal name and whether it is the compendium's or this coven's
- Picking an ingredient saves a link, and a substitute typed without picking saves as text, without a warning
- Arrow keys move through the suggestions, Enter picks one, Escape closes them, and Enter with none open adds the typed text

**MB.132 — Admin deity CRUD** · 1.5h

_Story 18 — As a site admin, I want to add, edit and soft-delete deities, so that the vocabulary can grow without a deploy._

`/admin/deities`, reusing MB.95's page shape. `DeityInput` in `vocabulary/validation/`; create, update and soft-delete mutations, admin-gated in the service and firing the `compendium` cache tag. The page lists compendium-tier deities in use outside the vocabulary as a curation to-do list, its add control opening the create form prefilled. Soft-deleting a deity in use rewrites no ingredient, and the page says so. Lands after MB.95, before M5.7, which gates it.

_Acceptance criteria:_

- Admin can create, edit and soft-delete deities; the list is alphabetical by name
- A slug collision is a readable error pathed to `name`
- Soft-deleting a deity in use leaves every ingredient's `deities` untouched, asserted by row, and the value then appears in the to-do list
- The to-do list is compendium-tier only — a workspace's uncurated deity never appears, asserted with the precondition that the workspace holds it
- Non-admins reach neither the page nor any mutation; every mutation fires the tag

**MB.133 — Long list entries in IngredientForm** · 1h

_Story:_ As a workspace member, I want a long folk name, deity or substitute ingredient to stay inside the form, so that one long entry does not push the page sideways or bury the others.

Minted during M5.9, on the owner's review. An entry in one of M5.9's list fields is a pill, `.ingredient-form__entry`, sized to its text, and nothing bounds it: the shared schema sets no length on a list entry, and the pill is an `inline-flex` whose text keeps its minimum content width. So an unbroken string wider than the column — a binomial run together, a pasted address — should run past the form's edge and scroll the page sideways, and a long entry in words should wrap inside a pill whose rounded ends were drawn for one line. That is read from the styles rather than yet seen, and the task confirms it first. It settles how a long entry is drawn: wrapped inside the pill, with its ends eased so a two-line pill still reads as one, or truncated with an ellipsis. Either way the whole text stays reachable: the entry's × already names its full value, and a truncated entry shows all of it somewhere a sighted user can read it. Whether a list entry also takes a length cap in the shared schema, and at what length, is decided here with the owner, since a cap binds the service as well as the form.

_Acceptance criteria:_

- An entry of any length stays inside the form's column, and nothing scrolls sideways at 320px, with an entry of 80 unbroken characters and one of 80 characters in words, in each of the three lists
- The entry's whole text stays readable, and its × is still named by the full value
- A one-line entry looks as it does now
- If a length cap is added, it is in the shared schema, its message lands on the list's error element, and the service refuses the same length
- Checked by hand in the workshop at 320px in both themes until M5.5's page holds the form for a Playwright spec to assert it; the component doc's Styling section records the rule

**MB.134 — Make planet, zodiac sign and colour lists** · 1.5h

_Story:_ As a workspace member, I want an ingredient to carry more than one planet, sign or colour, so that a herb ruled by both Venus and the Moon is recorded as it is practised.

Documentation and scoping only, in MB.91's shape: the model is recorded before the table task transcribes it. Minted during M5.9, on the owner's decision. DESIGN.md §5 gives `planet`, `zodiac` and `color` one text value each; they become text arrays beside `deities[]`, and stay free text: the planet and zodiac vocabularies suggest and nothing refuses, and colour has no vocabulary and no suggestions at all, the owner's call. Folk names keep M5.10a's suggestions; colour is the one list without any. This task settles the new column and field names; the GraphQL change, the single fields on `Ingredient` and both inputs replaced by lists with no deprecation window, since nothing outside the app reads the API; the sequence rule 10 requires, MB.135 adding and filling the lists, MB.136 switching every reader and writer and ceasing to declare the old columns, and MB.137 dropping them once MB.136 has deployed; and the in-use scan MB.94 built for a single column, which must unnest an array, as MB.130 needs for deities too. MB.136 lands first by the order, so it builds that scan and MB.130 adopts it. M5.10a's planet and zodiac fields move to MB.131 as list lookups.

_Acceptance criteria:_

- DESIGN.md §5's column list and correspondence rows and §7's sketch carry the three lists; §14's form-library row names every list field
- The column and field names, and whether a list keeps the order entered, are recorded
- db.md and validation.md say how the three lists are validated, as `deities` already is

**MB.135 — List columns for planet, zodiac sign and colour** · 1h

_Story:_ As a developer, I want the list columns in place before any code reads them, so that the switch to lists is a code change against columns that already exist.

Table task, the expand half of rule 10. `ingredients` gains three nullable `text[]` columns, named as MB.134 records, and the migration fills each from its single column where one is set. The single columns stay declared and written until MB.136. Nothing reads the new ones yet.

_Acceptance criteria:_

- The three columns exist as nullable `text[]`, asserted from the catalogue
- Every row with a value in a single column carries it as a one-entry list, and no row without one gains a list, asserted against the seeded template
- The migration only adds, so the destructive-DDL check passes with no sidecar
- The single columns are unchanged

**MB.136 — Read and write planet, zodiac sign and colour as lists** · 3h

_Story:_ As a workspace member, I want to add several planets, signs and colours to an ingredient, so that it records every correspondence I work with.

Switches every reader and writer to MB.135's columns. The shared Zod schema takes each as a list of free text, blank entries dropped as for `deities`; the workspace and compendium services write them; GraphQL's `Ingredient` and both inputs carry the lists; the planet and zodiac suggestion fields' in-use scan unnests a list, the mechanism MB.130 then adopts for deities; the seed and the test fixtures write lists. `IngredientForm`'s Planet, Zodiac sign and Colour become M5.9's list fields in the same PR, since the form's types follow the schema; their lookups are MB.131's. The Drizzle schema stops declaring the single columns, rule 10's first half of a drop, and the migration fills the lists again for any row the live deploy wrote to a single column after MB.135.

_Acceptance criteria:_

- A save carries several planets, signs and colours, and an edit replaces each list whole
- Each list keeps the order entered, drops blank entries, and treats an empty list as absent
- `planetSuggestions` and `zodiacSuggestions` count a value in use once however many lists hold it, still scoped to the compendium and this coven — a value only another coven holds never appears, asserted with the precondition that it holds it
- The seed and fixtures write lists, and the SDL snapshot moves
- Nothing declares or reads the single columns, which still exist
- The form's three fields are list fields with their info tips, covered by its tests

**MB.137 — Drop the single planet, zodiac and colour columns** · 1h

_Story:_ As a developer, I want the retired single columns gone, so that nothing can write a value the app no longer reads.

The contract half of rule 10, a task of its own. Once MB.136 has deployed, the migration fills the lists one last time from anything written to the single columns since, then drops `planet`, `zodiac` and `color`, with its `.ack.md` sidecar.

_Acceptance criteria:_

- The three columns are gone, and the lists hold every value they held
- The migration carries its acknowledgement sidecar, and the destructive-DDL check passes with it
- Lands only after MB.136 has deployed to staging

**MB.138 — Let a substitute link an existing ingredient** · 3h

_Story:_ As a workspace member, I want to pick an existing ingredient as a substitute or type one that is not entered, so that a substitute I have recorded leads to its own page.

Scoping, and the picker's search. Minted during M5.9, on the owner's decision: `ingredients.substitutes text[]` becomes a child table, one row per substitute, each either a link to an ingredient or a free-text name, the shape MB.40 gave a spell's layers, `CHECK (num_nonnulls(substitute_id, name) = 1)`. This task settles which ingredients a substitute may link: a compendium entry only another compendium entry, since the compendium is public and a coven's entries are not, and a coven's ingredient either tier, its own coven's included. It settles what a link does when its ingredient is deleted, kept and shown by its last name or turned to text; whether a row takes the full audit spread, as content like a folk name, or the stamp columns and a hard delete, as a link (MB.34); whether the list keeps its order; the GraphQL shape, a `Substitute` carrying `name` and a nullable `ingredient`, resolved through a DataLoader (rule 9); and which search the form's picker reads for ingredients to link, since `commonNameSuggestions` returns names rather than ids. The expand, switch and drop follow as MB.139 to MB.141. **Widened while it was built, on the owner's call:** no existing query fits the picker — `possibleDuplicates` compares whole names and never completes a prefix, and `workspaceIngredients` lists only what a coven holds, in wave 11 — so this task also builds the one it names, `ingredientSuggestions`, ahead of MB.131. **Decided** ([`design-decisions/mb.138-substitute-links.md`](../design-decisions/mb.138-substitute-links.md)): a compendium entry links only the compendium, a coven's ingredient either tier; a link to a deleted ingredient is kept and shown by its last name, the owner's choice, through a third named finder in M5.3's shape; the full audit spread, soft-deleted; alphabetical by the name each shows, and each substitute once, both the owner's calls, so nothing stores an order; `Substitute { name, ingredient }`.

_Acceptance criteria:_

- DESIGN.md §5 gains the table and drops `substitutes[]` from the column list, §7's sketch gains `Substitute`, and §9's detail page links a linked substitute
- The tier rule, the deletion rule, the audit shape and the order rule are each recorded with its reason
- The picker's search is named, scoped to the compendium and the current coven
- `ingredientSuggestions` answers a reader of the coven with the live ingredients of the compendium and that coven, matched as `compendium` matches, best first, and never another coven's, asserted with the precondition that another coven holds a match

**MB.139 — `ingredient_substitutes` table, filled from the list** · 1.5h

_Story:_ As a developer, I want the substitutes table in place and filled before any code reads it, so that the switch to links is a code change against rows that already exist.

Table task, in MB.138's shape: the table, its CHECKs, an index on the parent over live rows, the two partial unique indexes that hold one link per ingredient and one name per ingredient case-insensitively, and the full audit spread MB.138 chose, so its own `set_updated_at` trigger line. **Amended by MB.138:** no index on the linked ingredient, since under its deletion rule nothing reads from a linked ingredient back to its linkers. The migration copies each `substitutes` entry across as a name. `ingredients.substitutes` stays declared and written until MB.140. Nothing reads the table yet.

_Acceptance criteria:_

- The shape is asserted from the catalogue, and a row that is both a link and a name, or neither, or that links its own ingredient, is a 23514 naming its CHECK
- Every existing entry is a name row, and a list repeating an entry, in any case, is copied once, in the spelling it first holds, so the unique index never refuses the fill
- A second live link to the same ingredient, or a second live name folding alike, is a 23505 naming its index, and a soft-deleted row reserves neither
- `AUDITED_TABLES` and `tests/db/updated-at-trigger.test.ts` agree with the full audit spread MB.138 chose
- Nothing reads the table yet

**MB.140 — Read and write substitutes as links or text** · 3h

_Story:_ As a workspace member, I want a substitute I pick to stay linked to its ingredient, so that the detail page can lead me to it.

Switches substitutes to MB.139's table. The shared schema takes each entry as a name or an ingredient id, and refuses a repeat — the same id twice, or the same name in any case — at the repeat's position, as it refuses a repeated folk name; the services write them in the ingredient's own `withAudit` transaction, bringing the live rows to the list sent as folk names are replaced, so a save that changes nothing writes nothing, and refuse a link the tier rule forbids, as a field error pathed to the entry; GraphQL's `Ingredient.substitutes` returns MB.138's `Substitute`, through a loader whose finder reaches a linked ingredient deleted or not — MB.138's third named `…IncludingSoftDeleted` finder, added to `tests/guards/soft-delete-finder-guard.test.ts`'s pinned hatches and held to skipping the linked ingredient's filter alone; the seed and fixtures follow; the Drizzle schema stops declaring `ingredients.substitutes`. `IngredientForm`'s substitute entries carry a link or a name in the same PR, a linked entry's pill reading as its ingredient's label with its formal name. Picking a link in the form is MB.131's.

_Acceptance criteria:_

- A save carries linked and typed substitutes together, read back alphabetically by the name each shows
- A repeated link or name is a field error pathed to the repeat, never the index's 23505
- A compendium entry cannot link a coven's ingredient, and a coven's cannot link another coven's — refused by direct id, with the precondition that the id exists
- A page of ingredients resolves its linked substitutes in one query, through a DataLoader
- MB.138's deletion rule holds, asserted by soft-deleting a linked ingredient: the substitute reads as its last name with no `ingredient`, survives a save of its parent, and a new link to the deleted ingredient is refused
- Nothing declares or reads `ingredients.substitutes`, which still exists

**MB.141 — Drop `ingredients.substitutes`** · 1h

_Story:_ As a developer, I want the retired substitutes column gone, so that nothing can write a substitute the app no longer reads.

The contract half of rule 10, a task of its own. Once MB.140 has deployed, the migration copies anything written to the column since MB.139 across as names, then drops it, with its `.ack.md` sidecar.

_Acceptance criteria:_

- The column is gone, and the table holds every substitute it held
- The migration carries its acknowledgement sidecar, and the destructive-DDL check passes with it
- Lands only after MB.140 has deployed to staging

**MB.142 — Cut the per-turn context: plugin, reporters, stale MCP** · 1h

_Story:_ As a developer, I want a session to start from the context this repo needs and no more, so that every turn of every task stops paying for a plugin it never uses and a test table it never reads.

Minted on the owner's request to cut the tokens a task costs, the first of six ([design-decisions/mb.142-plan.md](../design-decisions/mb.142-plan.md)). Measured: `CLAUDE.md` is 63 KB, and the Vercel plugin's 49 skills, ~250 tool names and session hook are another ~10k tokens, on every turn, for a repo whose deploys are CI-only (M0.26); `npm run test:coverage` prints ~200 coverage rows and one line per test file, several times a task. The plugin is disabled at project scope, the stale `asana` MCP entry goes with the board that left it, and the reporters are quiet under Claude Code only: `CLAUDECODE=1` is set in its shell and nowhere else, so the host and CI see what they see today.

_Acceptance criteria:_

- `.claude/settings.json` disables `vercel@claude-plugins-official` for this repo, and a fresh session lists none of its skills or tools
- `.claude/settings.local.json` names no `asana` server
- Under `CLAUDECODE=1`, Vitest reports with `dot`, coverage with `text-summary`, and a passing test's console output is dropped (`silent: 'passed-only'`); without it all three are as before, and CI's run is unchanged
- The plan is stored as `design-decisions/mb.142-plan.md`, and testing.md says where the per-file coverage numbers are read when the table is not printed

**MB.143 — Split TASKS.md by milestone and wave** · 3h

_Story:_ As a developer, I want a task's entry and its wave's reasoning to be readable without the 800 KB around them, so that starting a task costs a page rather than a book.

The first move ([design-decisions/mb.142-plan.md](../design-decisions/mb.142-plan.md)), verbatim: each `## M0 …`, `## MB …` and `## MW …` section becomes `claude-docs/tasks/<milestone>.md`, and the execution-order table's reasoning column becomes `claude-docs/waves/wave-NN.md`, the table keeping its id cells and a link. `TASKS.md` keeps the preamble, the deferrals and the table, and indexes the rest. `scripts/tasks-md.mjs` reads the files in a declared sequence and concatenates them, since a range like `M3.3 → M3.10` is the headings between its ends in file order; `tally.mjs` reads the same list. `start-task` reads the task's entry by its heading and its wave file, not "the milestone".

_Acceptance criteria:_

- `claude-docs/tasks/` holds one file per milestone section and `claude-docs/waves/` one per wave, each moved without a rewrite, and `TASKS.md` is under 40 KB
- `tasks-md.mjs` exports the file sequence, `loadTasksMd` and `tally.mjs` read through it, and a test fails on a file in `claude-docs/tasks/` the sequence does not name
- `node scripts/task-board.mjs reorder` prints no moves, and `tally.mjs` prints the figures it printed before the split
- `start-task`, CLAUDE.md's "Minting a task", task-tracking.md's "Order" and README.md name the new paths

**Decided while building.** The sections keep their `## ` headings and the wave files gain a `# Wave NN — name` line; the one edit the move needed was a `../` on each of the 94 links relative to `claude-docs/`, since the files sit one directory down. `tally.mjs` skips a file the ref lacks: `origin/main` and every ref before the split hold the whole breakdown in `TASKS.md`, so the figures are the same there as here, and a bad ref still fails on the `rev-parse` it runs first.

**MB.144 — Slim CLAUDE.md into path-scoped rules** · 3h

_Story:_ As a developer, I want the rules for the area I am editing in front of me and the rest out of the way, so that a turn on a component does not carry the database's rules, or the reverse.

`CLAUDE.md` goes from 63 KB to about 18: the vocabulary, a ten-row command table, the ten architecture rules cut to their binding sentences and keeping their numbers (tests cite `CLAUDE.md rule 4` by number), the domain invariants, the testing bullets every test obeys, the conventions, out of scope, the skills table and a ten-line task-tracking summary. The long forms go to `.claude/rules/<area>.md` with a `paths:` frontmatter, which Claude Code loads only when a matching file is read or edited — `database`, `graphql`, `components`, `testing`, `task-tracking` — and the long command table to `claude-docs/commands.md`. The redundancy that is CLAUDE.md's own goes in the same pass: TASKS.md's eleven standing rules become one line citing it, `create-pr` loses its stale notes and restatements, and `create-feature` and `create-hotfix` become wrappers over one shared reference. A precedence line says `DESIGN.md` wins over `CLAUDE.md`, which wins over a rule file.

_Acceptance criteria:_

- `CLAUDE.md` is at most 20 KB, and every `CLAUDE.md rule N` a test cites still names the same rule
- Each `.claude/rules/*.md` carries a `paths:` list, and a fresh session that opens a file under `src/db/` has the database rule in context while one that opens `src/components/` does not
- TASKS.md's "Standing rules" is one line, and `create-feature` and `create-hotfix` share one reference file
- `tests/guards/doc-citation.test.ts` passes, and every citation in a rule file resolves

**Decided while building.** A fresh `claude -p` session settled what loads a rule file — the Read tool opening a file its globs match, and never a shell read ([`agent-skills.md`](../agent-skills.md), "Rule files", has the probe). `CLAUDE.md` therefore names every rule file and says to open the one for the area being edited, and `tests/guards/claude-rules.test.ts` checks each glob with picomatch, the matcher Vitest uses, rather than asking Claude Code. That guard also holds `CLAUDE.md` to 20,000 bytes and pins each numbered rule to the clauses code cites it for. `doc-citation.test.ts` now reads `CLAUDE.md` and every markdown file under `.claude/`. TASKS.md's standing rules were all in `CLAUDE.md` bar one, that the OAuth handshake at `/api/auth/*` carries no application data, and code cites rule 1 for it, so rule 1 took it. The comment rule and the doc-correction rule bind every area, so their long forms went to README.md's "Comments in code" and "Correcting a doc" rather than to a rule file. The Skills table keeps its rows and triggers with shorter descriptions, since a session already lists each skill's own. The shared branch steps are `create-feature/reference-branch.md`, so that every directory under `.claude/skills/` is a skill. `create-release` and `create-main-sync` lose the same stale `gitflow` hedge `create-pr` did, one sentence each.

**MB.145 — Split db.md by section** · 4h

_Story:_ As a developer, I want one section of the database summary to cost one section, so that reading how keyset pages work does not mean reading 236 KB.

Verbatim: each of the 37 `## ` sections moves to `claude-docs/db/<slug>.md`, and `db.md` becomes the index, keeping every `## ` heading with one sentence and a link. The doc-citation guard resolves a `db.md, "Section"` cite by heading prefix in the cited file, so the 105 section citations and 159 plain citations in code keep resolving and no code file changes. Intra-doc `#anchor` links move to the new files.

**Widened while building, on the owner's decision.** The five subsections large enough to read alone — "Fuzzy matching", "Ingredient slugs", "The member's autofill", "The finder convention" and "What a `sql` fragment is for" — move to files of their own, each leaving a one-line pointer where it stood. Every section citation in code and in the other summaries then names the file its section lives in rather than `db.md`, and the guard fails one that names a split summary's index, so the index is for reading and not a hop every citation pays. The move's fallout is corrected in the same PR: a mention of a section that now sits in another file, "above", "below" or by name, becomes a link to that file, and the client-import exemption count, "four" in three sections and three comments since MB.87 split the repository, becomes six.

_Acceptance criteria:_

- `claude-docs/db/` holds one file per section and per carved subsection, moved without a rewrite bar links, and `db.md` lists every one under its original heading
- `tests/guards/doc-citation.test.ts` fails a section cited through a split summary's index, reads a citation whose section starts the next comment line, and passes
- No `db.md#` link remains in `claude-docs/`, no "above" or "below" in `claude-docs/db/` points into another file, and a section named in another file is a link
- README.md names the layout and the citation rule

**Decided while building.** The index keeps every `### ` heading too, each linked to where it lives: the guard matches a cited section against a heading at any level of the cited file, and 35 of the 103 section citations named a subsection. That puts the index at 15 KB rather than the plan's 6. The sections keep their `## ` headings, as MB.143's did; a carved subsection's `### ` becomes its file's `## `, and each file is named for its heading, shortened and without the task id. Nine citations put the quoted section on the next comment line, which the guard's pattern did not read, so they had never been checked; it reads them now, and all nine resolved. Five citations named `db.md` alone but meant one section — `check-destructive-ddl.ts`'s message among them, naming a "Migrations section" no heading carries — and point at that section's file; `.claude/rules/database.md`'s means the whole summary and keeps the index. Comment lines the longer paths pushed past 100 columns were rewrapped to their paragraph's width. A mention that names a section in another file without "above" or "below" still read correctly, but no longer resolved by searching the file it sits in, so on the owner's decision it became a link too. On the owner's request the split and the repoint are kept, as `scripts/split-doc.mjs` and `scripts/repoint-doc-citations.mjs`, for MB.146: the repoint reads citations through `scripts/doc-citations.mjs`, which the guard now imports too, so the rewrite reaches exactly what the guard reads, and anchors come from `github-slugger`, GitHub's own algorithm, rather than a hand-kept pattern. Found along the way and fixed here, as a sub-hour fix: `src/db/repository/index.ts` still imported `users` first against a `users` ↔ `audit.ts` cycle MB.86 had removed. The import goes, with the comments and records that argued for it; the test that entering through the repository builds `users` with its audit columns stays, and a cycle put back makes it throw.

**MB.146 — Split auth.md, ci.md, testing.md and graphql.md by section** · 3h

_Story:_ As a developer, I want the next four largest summaries to cost a section each, so that the auth doc's 35 KB bootstrap section is read only by the task that needs it.

MB.145's move for the next four, 47 sections into `claude-docs/auth/`, `ci/`, `testing/` and `graphql/`, each original file becoming its index. Nothing is condensed here: `auth.md`'s "Admin bootstrap and the self-created user" moves as is, and MB.147 shortens it. As in MB.145, and with its `scripts/split-doc.mjs` and `scripts/repoint-doc-citations.mjs`, every section citation in code and in the other summaries then names the file its section lives in, since the guard fails one named through an index — 138 on one line alone, by the count taken during MB.145 — and a mention of a section that now sits in another file, "above", "below" or by name, becomes a link to it.

_Acceptance criteria:_

- The four directories hold one file per section, moved without a rewrite, and each index lists every one under its original heading
- `tests/guards/doc-citation.test.ts` passes, no section citation in code or another summary names one of the four indexes, and no intra-doc anchor link is left dangling
- No "above" or "below" in the four directories points into another file, and a section named in another file is a link

**Decided while building.** Each file is named for its heading, shortened as MB.145's were, and no subsection is carved out, since nothing here is condensed. The repoint reached 148 section citations in code rather than 138: `CLAUDE.md`'s cite of "The email page" closes its code span before the comma, a form `scripts/doc-citations.mjs` did not read, so the guard had never checked it; it reads it now, with a test. Four comments that named one of the four summaries alone but meant one section point at that section's file, as do 23 such mentions in other summaries, and those meaning the whole summary keep the index: the two rule files, DESIGN.md's CI inventory, and `db/migrations-and-scripts.md`'s pointer to both test harnesses. The other summaries' 38 section citations name the file too, which mends `components/email-form.md`'s link to `auth.md`, written as if from the directory above; decision records, task entries and transcripts keep theirs, as in MB.145. In `auth/tests.md`, "the wiring above" meant the whole summary and reads "the auth wiring". Paragraphs a link lengthened were rewrapped at 80 where they were already wrapped there, never inside a code span, which prettier outdents.

**MB.147 — One home per fact across the docs** · 3h

_Story:_ As a developer, I want each fact stated once and cited elsewhere, so that a correction is one edit and a read is one page.

Measured before the pass: 6,537 eight-word runs occur in two or more of the 82 live docs and skills. The largest pairs are TASKS entries restating the design-decision plans and DESIGN.md's sections, db.md restating §5's data model, and the wave reasoning kept three times — the table column, the milestone preambles and each GitHub milestone description. The rule, added to README.md beside "a summary must stand on its own": a summary stands on its own for the current shape and cites for the argument. A binding rule lives in CLAUDE.md or its rule file, a subsystem's shape in its summary, a contested choice's argument in its decision record, a task's scope in its entry, and ordering reasoning in its wave file; every other mention becomes a clause and a citation. The pass goes pair by pair, largest first, and stops under about 60 shared runs. The measuring script is kept as `scripts/doc-overlap.mjs`, a report rather than a guard, since a threshold would penalise the legitimate mentions.

_Acceptance criteria:_

- README.md carries the rule and the table of homes
- The GitHub milestone description carries the id list and a link to the wave file, and the task-tracking rule's "Board layout" (`.claude/rules/task-tracking.md`) says so
- `scripts/doc-overlap.mjs` runs from a clean checkout, and the PR body records its count before and after
- `tests/guards` pass

**Decided while building.** The count was retaken on this branch, since MB.143 to MB.146 had split the corpus after the plan measured it: 7,536 runs across 209 live docs (`CLAUDE.md`, `.claude/` and `claude-docs/`, less `archive/` and `transcripts/`) before, 3,937 across 210 after. The table of homes gains a row the plan's lacked, DESIGN.md for specified behaviour and the data model, so a summary restating §5 is the copy. Four pairs stay at or above 60, each for a reason: DESIGN.md ↔ `tasks/mb.md` (130) is mostly entries' `_Story:_` lines quoting §10, kept as each entry's story; `design-decisions/mb.24-rls-role-split.md` (72) shares MB.24 to MB.26, which MB.29 marked as history left as written; `CLAUDE.md` ↔ DESIGN.md (60) is the domain invariants, binding reminders of §5 and §8; and `design-decisions/mb.80-plan.md` (60) is the approved scope MB.81 to MB.85 were cut from. Each wave's milestone description held reasoning its wave file lacked, so the wave files absorbed it first and the description keeps the row's ids and a link; Waves 02, 03 and 05's descriptions had drifted from their rows and take the row's. `create-main-sync` and `create-release` share their merged-PR lookup and notes in `create-release/reference-shared.md`, as `create-feature` and `create-hotfix` share `reference-branch.md`. Stale facts met on the way were corrected rather than cited: DESIGN.md §5's hard-deleted join tables (two since MB.110) and its admin grant (MB.68 promotes too), MB.37's claim that PR #73 carried an acknowledgement, the MB.61 record's sentence for a squatted address, and `auth/admin-bootstrap.md`'s change link and field count.
