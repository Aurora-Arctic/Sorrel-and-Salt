# Sorrel and Salt — Work Breakdown

Every task is one PR, sized to one sitting and reviewable in one. Task IDs are immutable: they identify a task, they do not schedule it. Execution order is the wave order in the next section.

The Asana board **Sorrel & Salt** is the source of truth for what to work on. This file is the reasoning behind the breakdown — corrected in place when it is wrong, never re-scoped to chase the board.

Story references point at the numbered user stories in §10 of the design doc. Infrastructure tasks carry developer-facing stories instead.

## Standing rules

- One task per PR. Do not combine tasks, even small adjacent ones. A task is sized to one sitting; a sub-hour fix noticed along the way rides in the PR at hand and is named in its body rather than being minted as an MB id (MB.31).
- Two access paths, one set of rules. Server components read through cache()-wrapped services. Everything the browser initiates — every mutation, and every read without a navigation — goes through GraphQL. Admin is not an exception to either (M3.8).
- Services are the authorization boundary. Both paths end there, so a permission enforced once holds for both. No server actions, no bespoke route handlers, no admin-only access path.
- The OAuth handshake at /api/auth/* is outside both paths and carries no application data (M2.2).
- A task is done when every acceptance criterion is demonstrably met, not when the code appears to work.
- Source repo for all ports is resume-2026. Port, do not rewrite from memory.
- No print styles anywhere except the spell recipe view (M10.22).
- The design will change. Do not build component styling beyond the tokens and mixins in M0.7 and M0.8.
- Tests never touch Neon. Neon is deployment-only.
- Staging carries the same protections as production. Local development is the only relaxed environment.
- There are no personal workspaces. Every workspace can take members and be deleted by an owner.
- The site is invite-gated. Signing in with Google or GitHub earns an account and nothing else. Creation rights come from accepting a workspace invitation (M7.5) or an admin approval (M5.8), and once held they persist.

## Deferred to v2

Notes are out of scope for v1. That removes stories 35–46 and the whole notes data layer, UI and visibility model — 17 tasks and 29 hours. Two consequences carried into the tasks below: viewers are now strictly read-only, since their own private notes were the sole exception; and the ingredient detail page (M8.19) is built so a notes section can be added beneath it without restructuring the page.

Also deferred: edit history, viewer spell approval, compendium suggestions and merge tooling, GraphQL response caching, and email/password sign-in.

## Execution order

The milestone numbers below are **identifiers, not a schedule**. Tasks are executed in the wave order in this section; a task keeps its ID wherever it runs. M1.21 stays `M1.21` even when it runs eighteenth.

**Why the original order does not work.** The breakdown was written feature-first: each milestone creates its own tables. But every table spreads `...auditColumns`, whose three `*_by` columns reference `users`, created in M2.3. An FK target must exist before the FK, so `users` is the first node of the only valid creation order — and in the original numbering it sits behind ten other tables. That is not a narrow edge case: it already forced three workarounds into shipped code (M1.9 clones an empty template, M1.11 reseeds because `seed()` throws for every scenario, and M1.15 shipped `auditColumns` without the FKs §5 mandates). The wave order below retires all three, and costs no rework, because `src/db/schema/` still contains only `.gitkeep` — no table exists yet, so no retrofit migration is needed.

### The core move: land the DDL early, the policies late

|            | **DDL** (moves early)                                                              | **Policies and behaviour** (stays late)                                           |
| ---------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Statements | `CREATE TABLE`, columns, types, NOT NULL, CHECK, FKs, indexes, PKs                 | The membership check, the `Membership` proof, and the finder predicates they gate |
| Answers    | _What shape is the data?_                                                          | _Who may see and change which row?_                                               |
| Tasks      | M6.2, M4.1, M4.1a, MB.35, M4.2, M4.2a, M4.4, M4.4a, M4.6, M7.1, M9.2, M10.2, M10.4 | M6.3, M6.6, M10.3                                                                 |

They separate cleanly because they are already different migrations and different tasks. Postgres will happily create a table in one migration and attach a policy in a later one, and nothing about creating `spells` commits you to a visibility model.

The DDL is safe early because §5 already specifies every column, type, enum set and index predicate — writing it in Drizzle is transcription, not design. Additive DDL is inert: a table nobody queries yet changes no behaviour, and under expand/contract this is the free direction. Empty tables are also the cheapest moment for constraints, so land every constraint §5 specifies at **full strength** — NOT NULL, CHECK, enum sets, three partial unique indexes on `ingredients`, composite PKs. Tightening later needs a backfill, an M1.5 acknowledgement line, and can fail on rows that already exist.

The authorization rules must not come early for the opposite reason. A rule written before its service tends not to match it: the `Membership` proof M6.3 threads through every workspace-scoped finder mirrors the role hierarchy `assertMembership` defines in the same task, and the two-layer design only works if both layers agree. Behaviour is also where the real uncertainty lives — whether an owner can read a member's private spell is worth deciding with the service in front of you; column types are not. The wave order follows: tables (W3), then seeds run against them (W4), then the service rules land and are proved against real seeded rows (W5).

**MB.29 removed the second half of this argument**, which used to be that RLS interferes with seeding — a policy on a table you are about to seed will filter your seed. With policies deferred to the public launch there is no seed interference to dodge, and the wave order stands on the first reason alone. When policies do land, that constraint comes back with them: [`mb.24-rls-role-split.md`](design-decisions/mb.24-rls-role-split.md) answers it with `BYPASSRLS` on the seeding role.

### The waves

| Wave                         | Tasks                                                                                                                                                                                          | Why here                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1 — FK root**              | M2.2 · M2.3 · MB.5 · MW.1                                                                                                                                                                      | `users` first, because the whole graph roots on it. M2.2 leads so Better Auth's adapter table ownership is settled before anything references `users`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **2 — Write path**           | M1.16 · M1.19 · M1.17 · MB.14 · M1.20 · MB.15 · MB.16 · MB.17 · MB.18 · MB.20 · MB.21 · MB.22 · MB.23 · MW.2                                                                                   | Needs exactly one table. M1.20 is re-scoped to the finder builder plus its guard, not "edit N finders". MB.15 through MB.18 are CI- and doc-only and depend on nothing in the wave; they sit before MW.2 so the compression pass sees the corrected `ci.md`. MB.18 depends on MB.17 — both edit the same header comment. MB.20 is documentation and scoping only, depends on nothing else in the wave, and sits last so MW.2 records the standing decision to leave the ORM on `0.45.2`. It replaces MB.19, which was retired without being done. MB.21 depends on nothing else in the wave either — it wires `drizzle-kit studio` against the same pinned `0.31.10` MB.20 settled on — and sits last for the same reason. MB.22 depends on nothing else in the wave and closes it: it is tooling only, touches no table and no service, and sits last so MW.2 documents the debugging setup rather than leaving `claude-docs/` behind. MB.23 was minted after MB.22 merged, needs it merged first, and sits directly after it for the same dependency reason — MW.2 now documents the recorder alongside the rest of the debugging story.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **3 — Schema block**         | M6.2 · MB.24 · MB.28 · MB.31 · MB.29 · MB.30 · MB.32 · MB.33 · M4.1 · M4.1a · MB.35 · MB.37 · MB.38 · M4.2 · MB.39 · M4.2a · MB.34 · M4.4 · M4.4a · M4.6 · M7.1 · M9.2 · M10.2 · M10.4 · M1.18 | FK order. **MB.28 precedes M4.1**, since M4.1 transcribes DESIGN.md §5 and §5 must be correct first. **MB.35 precedes M4.2 for exactly that reason, one table later**: M4.2 had already been built against §6's closed eight and had to be rebuilt, which is the cost MB.28 existed to avoid and the argument for spending the doc task first rather than after. MB.36 is its code half and sits in Wave 8, ahead of M5.6b: it attaches to the chip mixin and depends on no table, so it lands as early as the mechanism can be written, and its consumers — M5.6b here, M8.11 in Wave 12 — adopt it in their own PRs rather than retrofitting it. **MB.31, MB.29, MB.30, MB.32 and MB.33 form one doc-and-tooling block ahead of M4.1**, in that order: MB.31 first because it removes the `TASKS.csv` obligation from every PR after it, MB.29 next because it retired MB.25 out of this wave and MB.26 out of the next, so it had to precede both, MB.30 before M4.1 because `ingredients.workspaceId` is a foreign key and the spike decides what it points at, and MB.32/MB.33 anywhere in the block since they depend on nothing — placed here so the tooling change lands before there is code to retrofit, per the sweep-task rule. **MB.34 sits immediately before M4.4**, the first join table it governs: after M4.4, M10.2 and M10.4 ship, the same change becomes a contract migration. **MB.37 and MB.38 sit between MB.35 and M4.2**, where they are CI-only and block nothing: MB.37 is a defect in MB.32 found while M4.2 was in flight, and a migration task should not be the one to discover its gate has not run since #104 — so it lands before the next `CREATE TABLE`, not after. MB.38 follows it because both touch `checks.yml`, and **MB.39 follows MB.38** for the same reason — it is CI-only, blocks nothing, and can be moved to any later wave without consequence. **M4.2a and M4.4a land before M1.18** so the trigger sweep covers both new tables in one pass — the hard ordering constraint in the whole change, since the sweep-task rule forbids a later "re-assert" task. M1.18's trigger closes the wave, attaching to every audited table at once. **M10.3 is deliberately excluded** — see below. MB.24 is merged, and superseded by MB.29 the same wave; **MB.25 was on this row and is retired**, so nothing here depends on Wave 4's M1.27 any longer. |
| **4 — Seed and harness**     | M1.21 · M4.3 · M4.3a · M1.22 · MB.40 · M1.26 · M1.23 · MB.41 · M1.25 · M1.24 · M1.27 · M1.28 · MB.27                                                                                           | The payoff wave: retires all three workarounds. M4.3 is pulled ahead of M1.22, which consumes its 63 categories; **M4.3a is pulled ahead of M1.22 for the same reason**, since M1.22 also consumes its form vocabulary. **MB.40 sits after M1.22 and before M1.23**: it is DDL on `spell_ingredients`, empty and unqueried until Wave 13, so it lands as early as the schedule allows after it was minted — and ahead of M1.23, the first writer of that table, whose demo scenario seeds one custom row against the reshaped key. It is the repo's first contract migration, taken against zero rows. **MB.26 was on this row and is retired** (MB.29) — there is no read-side wrapper to land ahead of a caller that no longer exists. MB.27 is CI-only and depends on nothing here. **MB.41 sits after M1.23 and before M1.28**: it moves the whole suite into `tests/`, so it wants every Wave 4 test file that is going to exist already written — and it must precede M1.28, which creates `tests/acceptance/` and would otherwise create it beside a `src/` suite it does not match.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **5 — Authorization**        | M6.3 · M10.3 · M6.6                                                                                                                                                                            | All seven workspace-scoped tables now exist, so M6.3's `Membership` sweep over the finders is complete rather than partial — the reason this wave waits on the schema block. **M6.4 and M6.5 were on this row and are retired** (MB.29); M6.6 now carries the whole burden of proving isolation, which is why its direct-id denial tests are per-entity rather than a sample.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **6 — Auth surface**         | M2.1 · M2.4 · M2.5 · M2.6 · M2.7 · M2.9 · M2.10 · MB.12                                                                                                                                        | M2.8 defers to Wave 10. M2.10 needs M2.7's session helper and M0.30's Ladle build, both of which exist by the end of this wave. MB.12 closes the wave: "a real browser completes sign-in" is unmeetable before M2.6 builds the page to sign in on.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **7 — GraphQL**              | M3.1 → M3.10 · MB.43, internal order otherwise unchanged                                                                                                                                       | M3.8's "representative service" and M3.10's `me` both have real targets now. MB.43 closes the wave because it needs M3.1's route to hold the error mapping, and it must precede Wave 8: M5.9 is the first task to render a server-returned field error and M8.8 the first to raise one, so landing it later is a retrofit of both.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **8 — Compendium + admin**   | M4.5 · M4.7 · M4.7a · M4.8 · M8.2 · M8.5 · M8.8 · MB.11 · M5.1 · M5.2 · M5.3 · M5.4 · M5.9 · M5.10 · M5.10a · M5.5 · MB.36 · M5.6 · M5.6a · M5.6b · M5.7 · M5.8 · M8.6 · M8.7                  | M5.5/M5.6 read and write through GraphQL, which is M8.5/M8.8 — so those move ahead of M5.5. M5.9/M5.10 build `IngredientForm`, which M5.5 consumes, so they precede it too. **M5.10a joins M5.9/M5.10 ahead of M5.5** because M5.5 consumes `IngredientForm`; **M5.6a follows M5.6 but precedes M5.7**, which gates it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **9 — Workspaces**           | M6.1 · M6.7 · M6.8 · M6.9 · M6.10 · M6.11 · M6.12 · M6.13 · M6.14 · M6.15 · M6.16 · MB.10 · M6.18                                                                                              | M6.18 needs MB.10's display-name loader to resolve without an N+1.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **10 — Invitations**         | M7.2 → M7.7 · M2.8                                                                                                                                                                             | M2.8 moves here: "an invited user lands in the workspace they were invited to" is unmeetable before M7.5.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **11 — Ingredient services** | M8.1 · M8.3 · M8.3a · M8.4 · M9.1 · M9.3 · M9.4 · M9.5 · MB.9                                                                                                                                  | M9's data layer moves ahead of M8's UI. This is what fixes M8.13, M8.14 and M8.18.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **12 — Ingredient UI**       | M8.9 → M8.12 · M8.13 · M8.13a · M9.7 · M9.8 · M8.14 · M8.15 → M8.19 · M9.6 · M9.9 → M9.12 · MB.7                                                                                               | M8.13a lands before its three consumers. M9.7 and M9.8 land before M8.14, which consumes both — see the ownership table below.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **13 — Grimoire**            | M10.1 · M10.5 → M10.22 · MB.6 · MB.8                                                                                                                                                           | MB.8's Zod schema precedes M10.10; MB.6's recipe view precedes M10.22's print layout.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **14 — Sweep close-out**     | M6.17                                                                                                                                                                                          | "Every mutating service" is a finite existing set only now.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **15 — Launch**              | M11.1 → M11.14 · MW.15                                                                                                                                                                         | Unchanged. MW.15 closes the project, and is the one close-out pass sized at 3h — see the MW section.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

**Unscheduled by design:** M7.A.1 (require merge queue) is trigger-based, not wave-based — do it when a second contributor arrives or PR volume makes untested merge combinations a real risk, whichever comes first. It is not a prerequisite for anything.

### Breaking the M1.23 ↔ M10.3 cycle

There is no cycle at task granularity, only at milestone granularity: M1.23 needs the `spells` **table** (M10.2), while M10.3 adds the `visibility` **column**. Splitting across waves linearises it — M10.2 (W3) → M1.23 (W4) → M10.3 (W5) — and M10.3's criterion "existing seeded spells migrate to workspace visibility" becomes genuinely testable, which is the signal it wanted this order all along.

M10.3 stays whole in Wave 5 rather than moving its column into Wave 3. Its PR needs the M1.5 destructive-DDL acknowledgement line, because it adds NOT NULL to a table that now has rows. That is the deliberate price of keeping the migration criterion meaningful, and it makes M10.3 the first migration to exercise expand/contract against seeded rows — MB.40's reshaping of `spell_ingredients` came first, and carried the first acknowledgement line, but against an empty table — worth rehearsing once on seed data rather than discovering it later on production rows.

### The sweep-task rule

> A sweep that attaches to **database objects** lands once, immediately after the last object it covers, protected by a catalogue-introspection test — never by a later "re-assert" task. A sweep that attaches to **code** lands as a mechanism plus a mechanical guard, as early as the mechanism can be written, and is adopted by each later task in that task's own PR — never retrofitted.

The tell is whether the thing can be made _impossible_ or only _absent_. DDL can only be added retroactively, so wait for the objects; code conventions can be made impossible prospectively, so land the guard first.

- M1.18's trigger → end of Wave 3, guarded by a `pg_trigger` coverage test
- M6.3's `Membership` proof → Wave 5, the _code_ half of the rule: the mechanism plus a `@ts-expect-error` compile assertion, adopted by each later workspace-scoped finder in its own PR. MB.29 retired the database-object sweep that used to sit here (M6.4's RLS, guarded by a `pg_class`/`pg_policy` catalogue test); when policies land at the public launch they bring that guard back with them
- M1.20 soft-delete, M1.17/M3.9 lint, M3.6 pagination → land the mechanism early, guard via lint fixture and the M3.4 SDL snapshot
- M6.17 is the one exception: it is a _census_, not an enforcer — M6.3 does the enforcing, adopted per-PR — and a census of an incomplete set is worthless, so it closes at Wave 14

### A table task, then a behaviour task

The ordering bug was never really a scheduling mistake; it was a **granularity** mistake that scheduling exposed. Milestones were treated as the unit of dependency when the task is. So: **split every table from the behaviour attached to it, and schedule them separately.** The breakdown already cleaves at the right boundaries almost everywhere — M10.2 and M10.3 are already two tasks, M6.2 and M6.3 likewise. The one genuine bundle is M9.2, which carries `inventory_items` _and_ the shared unit-to-dimension module; that module is behaviour riding along with DDL, and is called out here as the exception rather than silently split.

### Wave close-out and the MW namespace

The compression pass began as one per milestone, was re-anchored to the wave when milestones stopped executing as contiguous blocks, and is **retired by MB.31** — leaving MW.15, the v1 close-out, as the third and last pass rather than the sixteenth. `MW.1` and `MW.2` ran; `MW.3` through `MW.14` are retired without being done, and `MW.15` survives as the v1 close-out rather than a sixteenth compression.

What replaced it is not nothing. A scheduled pass over every doc is a slow way to find the two statements a wave actually staled, and it defers the fix to whoever runs the pass — by which point the person who knows which statement went wrong has moved on. Correcting a doc in the PR that stales it is the same work, done where it is cheapest and by the person holding the context. The rule survives in CLAUDE.md's Conventions; only the scheduled task is gone.

The eleven milestone-anchored passes this namespace originally replaced (M1.29, M2.11, M3.11, M4.9, M5.11, M6.19, M7.8, M8.20, M9.13, M10.23, M11.15) stay retired.

## M0 — Repo, tooling & environment

_33 tasks · 45 hours_

**Sequencing**

- M0.6 blocks M0.7, M0.8 and M0.29 — the semantic tokens, the mixins and the theme toggle all derive from the base palette, so picking it late means redoing them.
- M0.30 stands up the component workshop and blocks M0.31, M0.32 and M0.33. It needs M0.5's Sass partials; the theme decorator (M0.31) and the first stories (M0.32) also need M0.29. The workshop numbers sit after M0.29 for the same reason it does — added after the original breakdown.
- M0.18 blocks M0.19 and the final image tag in M0.13.
- M0.18 ships an image with extensions and an empty template only. Migrations and seed are baked in later, by M1.27. Do not try to bake a schema that does not exist yet.

### Repo bootstrap

**M0.1 — Scaffold Next.js 15 App Router with strict TypeScript** · 1h

_Story:_ As a developer, I want a running Next.js 15 App Router project with strict TypeScript so that every later task builds on the framework the design doc chose.

Create the app skeleton with the App Router, `strict: true` and `noEmit: true` in tsconfig, and the `src/` layout from §3 of the design doc (app, components, services, db, graphql, lib, scss) as empty directories with .gitkeep.

_Acceptance criteria:_

- `npm run dev` serves a page on port 8000
- `npx tsc --noEmit` passes with strict mode on
- Directory skeleton matches §3 exactly
- No Pages Router files present

**M0.2 — Port Oxlint config with Next.js node-globals override** · 1h

_Story:_ As a developer, I want the same lint rules as resume-2026 so that code style is consistent across my repos and CI can gate on it.

Copy `.oxlintrc.json` verbatim, then swap the `gatsby-*.ts` node-globals override for `next.config.ts`, `drizzle.config.ts`, `src/db/**`, and `src/app/**/route.ts`.

_Acceptance criteria:_

- `npm run lint` passes on the scaffolded repo
- Node globals resolve without error in the four override paths
- No Gatsby-specific overrides remain

**M0.3 — Port Prettier config and pre-commit hook** · 1h

_Story:_ As a developer, I want formatting enforced before commit so that no PR review is spent on whitespace.

Copy `.prettierrc` and `.prettierignore`, install the `pre-commit` npm package, and set the array to `['lint', 'format:check', 'typecheck']`.

_Acceptance criteria:_

- `npm run format:check` passes
- A commit with badly formatted code is blocked locally
- The pre-commit array matches resume-2026

**M0.4 — Port makefile and npm scripts, drop Gatsby helpers** · 2h

_Story:_ As a developer, I want the familiar make targets so that I run the same commands in both repos.

Port the makefile wrapper. Point `dev`/`build`/`start` at Next.js. Remove `predevelop`, `prebuild`, `postclean` and the `Docker/link-public.js` and `Docker/clean.js` Gatsby workarounds. Add placeholders for `db:generate`, `db:migrate`, `db:seed`, `db:reset`, `codegen`.

_Acceptance criteria:_

- `make help` lists every target
- `make build` produces a Next.js production build
- No Gatsby helper scripts remain in Docker/
- Database and codegen script names exist even if they exit non-zero for now

**M0.5 — Port only the foundational Sass partials** · 1h

_Story:_ As a developer, I want the minimum shared Sass so that styling can start without importing a design that is going to change anyway.

Copy only `_variables.scss`, `_mixins.scss` and `_typography.scss` into `src/scss/`. Do not port `_buttons.scss` or `_print.scss` — button styling will be redesigned, and print styling is needed for exactly one view (the spell recipe) and will be written there. Confirm `@use`, never `@import`.

_Acceptance criteria:_

- A component importing `@use '../../scss/variables' as *;` compiles
- `focus-ring()`, `theme-transition()` and `reduced-motion` all resolve
- No `_buttons.scss` or `_print.scss` in the repo
- No `@import` statements anywhere in src/scss

**M0.6 — Choose typefaces and base colour palette** · 2h

_Story:_ As a user, I want the app to look like a considered thing rather than a default so that it feels appropriate to what it holds.

Decision task. Pick a display and body typeface pairing and a base palette (surface, text, accent, and the light and dark variants of each). Record the choice and the reasoning in claude-docs, and set them in `_variables.scss` and `_typography.scss`. This is a deliberate blocker for the semantic tokens that follow.

_Acceptance criteria:_

- Typeface pairing chosen, licensed for the intended use, and self-hosted or loaded with a documented strategy
- Base palette defined for both light and dark themes
- Every text-on-surface pairing meets 4.5:1
- Decision and rationale recorded in claude-docs
- Font loading does not cause a layout shift on first paint

**M0.7 — Add category-group and safety design tokens** · 1h

_Story:_ As a user, I want categories and safety warnings to be visually distinguishable so that I can scan a page without reading every label.

Building on the base palette, extend `_variables.scss` with 8 category-group colours matching §6's groups and a safety-badge palette.

_Acceptance criteria:_

- 8 group colours defined and named after the groups in §6
- All new colours meet 4.5:1 contrast against their intended background
- Derived from the M0.6 base palette rather than picked independently

**Merged, and partly superseded by MB.35.** `$category-groups` is no longer the runtime lookup: groups are rows an admin can add, so a chip reads its colour from its group's stored pair — `category_groups.colorDark` and `colorLight` — via inline custom properties, and the map survives as the **seed values** M4.3 resolves and writes onto the eight seeded rows. What that map does — the hue rotation off `$sorrel` and the per-theme lightness tuning tabulated for 4.5:1 — is exactly why the starting eight read as one family, and none of it is discarded. MB.36 does the mechanical part: `chip()` takes a colour rather than a slug, and `_primitives.scss` stops generating a `.chip--<slug>` class per key.

**M0.8 — Add modal-surface, chip and badge mixins** · 2h

_Story:_ As a developer, I want shared mixins for the three new UI primitives so that modals, chips and badges are consistent everywhere they appear.

Add `modal-surface()`, `chip()` and `badge()` to `_mixins.scss`, each honouring the existing `theme-transition()` and `reduced-motion` conventions.

_Acceptance criteria:_

- Each mixin compiles in isolation
- `chip()` supports selected and unselected states
- `badge()` accepts a palette argument for safety vs low-stock
- All three respect prefers-reduced-motion

**M0.29 — Port the ThemeToggle component from resume-2026** · 2h

_Added after the original breakdown, which is why the number sits out of sequence. Placed here because it depends on M0.6 and on nothing later._

_Story:_ As a user, I want to choose light or dark for myself so that the app matches the room I am in rather than the preference my operating system happens to carry.

Port `src/components/ThemeToggle/` from resume-2026 — the button, the two SVG facets (moon and sun) and the rotate-through-the-top facet swap, including the `transitionend` reset to `--pre-enter` that keeps a fast double-click from stranding a facet out of view. Drive it off the M0.6 tokens (`$text-primary`, `$accent`, `theme-transition()`, `reduced-motion`) and nothing else: the resume-2026 stylesheet's folded-corner chrome, its `$silver-oxide` / `$lavender-oxide` borders, its `_buttons.scss` base and its `print-hidden` all stay behind — the first two are that design's, and the last two are files this repo does not have and will not get outside M10.22.

**Icons — redraw, do not port.** The two facets are the one part of resume-2026 that does not come across as-is. Redraw both in Celtic knotwork: smooth interlaced curves rather than the faceted polygons the source uses, with the over-under weave reading at the rendered size and not only when zoomed. The moon facet gains a crow — perched in or sitting within the crescent, its lines continuing the same knotwork rather than sitting on top of it as separate art. Generating the SVG paths with a Claude model is fine and expected; what lands still has to be hand-checked as inline single-path-set SVG on currentColor, with no raster, no external asset and no per-theme variant.

Drop the `Tooltip` wrapper. It is a separate component that is not ported, and the button's `aria-label` already names the action.

Add the pre-paint init script to the root layout in place of resume-2026's `gatsby-ssr.ts`, with one deliberate behavioural change: **set `data-theme` only when a stored choice exists.** M0.6's globals.scss resolves an absent attribute through `prefers-color-scheme`, so stamping the resolved theme on every load would dead-end that tier and force the script to grow the `matchMedia` change listener that resume-2026 carries. Storage writes stay in a `try`/`catch` — a blocked `localStorage` costs persistence, not the toggle.

_Acceptance criteria:_

- Clicking toggles `html[data-theme]` between `light` and `dark` and persists the choice under the `theme` key
- With no stored choice, no `data-theme` attribute is set and the system preference still decides
- `aria-pressed` reflects the current mode, and the button is reachable and operable by keyboard
- No flash of the wrong theme on first paint with a stored choice, JS enabled
- Facets survive a click mid-transition — neither is left parked out of view
- Both facets are smooth knotwork curves, not the resume-2026 polygons, and the weave reads at the rendered size
- The moon facet contains a crow, drawn in the same knotwork line
- Icons are inline SVG on currentColor — no raster, no external asset, no per-theme variant
- The whole toggle respects prefers-reduced-motion
- Component tests query by role and name only, per the repo convention
- Styling uses only M0.6/M0.7/M0.8 tokens and mixins; no `_buttons.scss`, no `_print.scss`, no new hand-picked colour
- Documented in `claude-docs/components/`

**M0.9 — Scaffold claude-docs, README and CLAUDE.md** · 1h

_Story:_ As a developer, I want the documentation convention in place from commit one so that subsystem docs accumulate instead of being retrofitted.

Create `claude-docs/` with a subsystem summary stub, the append-only transcript file, and a `components/` directory. Write README and CLAUDE.md covering vocabulary (compendium / ingredients / grimoire), commands, and the coverage rule about running `:coverage` variants.

_Acceptance criteria:_

- claude-docs structure matches the resume-2026 convention
- CLAUDE.md states the three domain nouns and their meanings
- CLAUDE.md records that verification uses the `:coverage` script variants
- README explains local setup in under ten steps

**M0.10 — Port applicable Claude skills from resume-2026** · 2h

_Story:_ As a developer, I want my existing agent skills available in this repo so that the assistant follows the same conventions here without being re-taught them.

Review the skills in resume-2026 and port the ones that apply — testing conventions, component documentation, commit and PR conventions, CI debugging. Leave behind anything Gatsby-specific. Adjust paths and command names to this repo, and note in CLAUDE.md which skills exist and when each applies.

_Acceptance criteria:_

- Ported skills live in the conventional skills directory and are discoverable
- Every ported skill references commands that actually exist in this repo
- Gatsby-specific skills are excluded, not copied and edited into uselessness
- CLAUDE.md lists the available skills and their triggers

### Component workshop

_Added after the original breakdown, alongside M0.29. Ladle rather than Storybook — see M0.30 for the reasoning. Depends on M0.5 and M0.6; the decorator and the first stories also depend on M0.29. Nothing later depends on these._

**M0.30 — Stand up Ladle as the component workshop** · 2h

_Story:_ As a developer, I want every component to render in isolation so that I can build and review it against the tokens without routing a page to it.

Greenfield tooling choice, not a port — resume-2026 has no workshop. Add `@ladle/react` and the `vite` it needs as devDependencies. **Ladle, not Storybook or Histoire:** it is Vite + React only, so it never couples the workshop to a Next.js major — this lands mid-Next-16, ahead of Storybook's Next framework; it installs an order of magnitude lighter; and its config is one file. Storybook's one real advantage here, running stories through the planned Vitest projects, is thin — the repo already fixes component testing on role and label queries and accessibility on Playwright + `@axe-core/playwright`, neither of which wants a story runner. Histoire's React plugin trails its Vue one and is not a safe bet on React 19.

- `.ladle/config.mjs` points `stories` at `src/components/**/index.stories.tsx` — one file per component directory, beside `index.tsx` and `index.test.tsx`, imported the same way.
- A Ladle Vite config wires `css.preprocessorOptions.scss` so `@use '../../scss/variables' as *;` resolves exactly as it does under `next dev`. The workshop and the app must not disagree on Sass.
- `npm run workshop` serves on port **61000**; `npm run workshop:build` writes a static build to a gitignored `build/`. The backlog PR that added this task already left both script names in `package.json` and `makefile` as failing placeholders; this task points them at Ladle.
- `make workshop` and `make workshop-build` wrap the scripts, and both show in `make help`.

_Acceptance criteria:_

- `npm run workshop` and `make workshop` both serve the workshop on 61000
- `npm run workshop:build` exits zero and writes a gitignored static build
- A story using `@use '../../scss/...' as *` compiles with the same resolution as `next dev`
- `make help` lists `workshop` and `workshop-build`, and no workshop script is still a placeholder
- Stories are discovered only at `src/components/**/index.stories.tsx`
- The choice of Ladle over Storybook and Histoire, with reasoning, is recorded in `claude-docs/`

**M0.31 — Theme and token decorator for the workshop** · 1h

_Story:_ As a developer, I want stories to render on the real surface in both themes so that what I see in the workshop is what ships.

Add a global Ladle decorator that wraps every story in the app surface — the `globals.scss` body background, `$text-primary`, and the M0.7/M0.8 tokens in scope — and a light/dark control in the Ladle toolbar that stamps `html[data-theme]` through the **same** helper M0.29 ships, not a second copy. With the control unset, nothing is written and `prefers-color-scheme` decides, matching M0.29's rule that an absent attribute is a valid state. Depends on M0.6, M0.29 and M0.30.

_Acceptance criteria:_

- Every story renders against the `globals.scss` body surface with no per-story setup
- A toolbar control switches the story frame between light and dark
- The switch calls the M0.29 helper; there is no duplicate theme-setting code
- With the control unset, no `data-theme` is written and `prefers-color-scheme` decides
- The decorator uses only M0.6/M0.7/M0.8 tokens and mixins

**M0.32 — Stories for every component already in the tree** · 1h

_Story:_ As a developer, I want the components that already exist to be in the workshop the day it lands, not eventually.

Add `index.stories.tsx` for every directory under `src/components/` that exists when this task starts — the task is "whatever is in `src/components/`", not a fixed list. Today that is `ThemeToggle` (M0.29); anything merged in the meantime is in scope too. Each story covers the component's meaningful states — for `ThemeToggle`: light selected, dark selected, and reduced-motion. Role and label queries only if a story asserts anything; no test ids; no snapshots. Depends on M0.29 and M0.30.

_Acceptance criteria:_

- Every `src/components/<Name>/` directory has an `index.stories.tsx`
- `ThemeToggle` has stories for light, dark and reduced-motion
- `npm run workshop:build` builds them with no errors
- No test ids and no snapshots in the story files
- Each component's `claude-docs/components/` doc links its story

**M0.33 — Gate: no standalone component without a story** · 2h · **merged, then superseded by MB.38**

> **Superseded, not wrong.** The gate shipped as a script under `scripts/`, run
> from pre-commit and, after M0.36, from CI's build job. MB.38 moved it into
> `src/test/workshop-guards.test.ts` — the same assertion, as an ordinary Vitest
> test on the `vitest` job — and took it out of pre-commit, which is test-free
> by decision. The rule it enforces is unchanged and still stands in CLAUDE.md.

_Story:_ As a developer, I want CI to fail when a component ships without a workshop entry so that "every future component is in the workshop" is enforced, not remembered.

Add a check that fails when any `src/components/<Name>/index.tsx` has no sibling `index.stories.tsx` — an Oxlint rule if it can express "directory has `index.tsx` ⇒ directory has `index.stories.tsx`", otherwise a small script under `scripts/` run from `pre-commit` and CI. Add `npm run workshop:build` to the CI build job (M0.17) and the PR gate (M0.20) so a story that throws fails the PR. Record the rule in CLAUDE.md next to the component-layout convention; if the M0.10 component-documentation skill has landed, its checklist names the story file as a required part of a component PR. Depends on M0.30; touches the M0.17 and M0.20 workflows.

_Acceptance criteria:_

- A component directory with `index.tsx` and no `index.stories.tsx` fails the check locally and in CI
- The check runs in `pre-commit` and in the PR gate
- `workshop:build` runs in CI and a throwing story fails the build
- CLAUDE.md Conventions states the one-story-per-standalone-component rule
- If M0.10 has landed, its component checklist names the story file

### Local dev environment

**M0.11 — Slim two-stage Dockerfile.node** · 2h

_Story:_ As a developer, I want a small image so that pulls, CI cold starts and rebuilds stay fast.

Write a slim `Docker/Dockerfile.node` on an alpine or slim Node base with two stages — `development` and `testing` — rather than porting the three-stage resume-2026 file wholesale. The devcontainer consumes the development stage instead of getting its own. Layer-cache dependencies separately from source.

_Acceptance criteria:_

- Both stages build
- Final image is materially smaller than the resume-2026 equivalent, with the number recorded
- A source-only change does not reinstall dependencies
- `testing` stage can run vitest

**M0.12 — Port docker-compose, drop Gatsby LMDB volume** · 1h

_Story:_ As a developer, I want a working compose file so that `make docker-up` gives me the app without local Node version juggling.

Copy `docker-compose.yaml`, keep the `node_modules` volume, remove the Gatsby LMDB cache volume.

_Acceptance criteria:_

- `make docker-up` starts the app container
- node_modules volume persists across restarts
- No LMDB volume remains

**M0.13 — Add the Postgres service to docker-compose** · 2h

_Story:_ As a developer, I want a local Postgres so that tests exercise triggers, generated columns and pg_trgm rather than a substitute that cannot.

Add the Postgres service with a named volume and a health check, wired to the same image tag that CI will use once M0.18 publishes it. Set `DATABASE_URL` for the app and devcontainer services.

_Acceptance criteria:_

- `make docker-up` starts Postgres 18 and reports healthy
- App container connects using the service name
- Data survives `docker compose restart`
- No Neon connection is required for local work

**M0.14 — Port devcontainer against the development stage** · 1h

_Story:_ As a developer, I want the devcontainer to come up with a database attached so that a fresh clone is productive immediately.

Copy `.devcontainer/`, point it at the `development` stage of the slim Dockerfile, add `depends_on: postgres` with the health condition, and forward ports 8000 and 8001.

_Acceptance criteria:_

- Devcontainer opens and installs dependencies
- Postgres is reachable from inside it
- No dedicated devcontainer image stage exists
- Both ports forward correctly

### CI pipeline port

**M0.15 — Port shared composite actions** · 1h

_Story:_ As a developer, I want the reusable composite actions available so that each check workflow stays a thin wrapper.

Copy the shared composite actions from resume-2026 unchanged, adjusting any hardcoded repo name.

_Acceptance criteria:_

- Composite actions resolve when referenced locally
- No references to the resume-2026 repo remain
- At least one workflow consumes each action successfully

**M0.16 — Port lint, format and typecheck workflows** · 1h

_Story:_ As a reviewer, I want style and type checks on every PR so that review time goes to logic.

Copy the three reusable per-check workflows and confirm each runs its npm script inside the testing container image.

_Acceptance criteria:_

- Each workflow runs green on the scaffolded repo
- Each fails when its check is deliberately broken
- All three run inside the container, not on the runner host

**M0.17 — Port build and audit workflows** · 1h

_Story:_ As a developer, I want build and dependency-audit checks so that a broken build or a known vulnerability never reaches staging.

Copy the reusable `build` and `audit` workflows, pointing build at the Next.js output.

_Acceptance criteria:_

- Build workflow produces and caches the .next output
- Audit workflow fails on a seeded high-severity advisory
- Both are referenced from pr-gate

**M0.18 — Build and publish the base Postgres image to GHCR** · 2h

_Story:_ As a developer, I want one database image shared by CI and local development so that every environment starts from an identical Postgres in seconds.

Workflow building a Postgres 18 image with required extensions enabled and an empty `sorrel_template` database, published to GHCR. Tag by content hash of `src/db/**` plus `latest`; rebuild only when that path changes. Migrations and seed are baked into the template by M1.27, once they exist — this task deliberately ships the image before there is a schema to put in it.

_Acceptance criteria:_

- Image publishes to GHCR and is pullable by other workflows and locally
- Extensions are enabled at build time, not at container start
- An empty sorrel_template database exists in the image
- Tag changes when src/db changes and does not when it does not
- Rebuild is skipped for PRs that do not touch src/db

**M0.19 — Consume the preseeded image in CI and compose** · 1h

_Story:_ As a developer, I want CI and local development to use the same database image so that a data-layer bug reproduces identically in both.

Point the CI job `services:` and the compose Postgres service at the published GHCR tag. Cache the pull between jobs.

_Acceptance criteria:_

- A `SELECT 1` succeeds from inside the job container
- Compose and CI reference the same tag from one place, not two literals
- Pull is cached between jobs in a run
- Health check gates the test step

**M0.20 — Port pr-gate.yml** · 1h

_Story:_ As a reviewer, I want one gate aggregating every check so that a PR's mergeability is a single signal.

Copy `pr-gate.yml` and wire it to the reusable workflows ported so far. Leave vitest and playwright references stubbed until M1.

_Acceptance criteria:_

- Opening a PR triggers the gate
- Gate fails if any child check fails
- Stubbed references do not break the run

**M0.21 — Port merge-queue.yml and enable the queue on both branches** · 1h

_Story:_ As a developer, I want a merge queue so that main and staging never receive an untested merge combination.

Copy `merge-queue.yml`. Manually enable Require merge queue in Settings → Branches on both `main` and `staging` — without this the workflow never fires.

_Acceptance criteria:_

- Merge queue enabled on main and staging
- A queued PR triggers the workflow
- Setup step documented in claude-docs

**M0.22 — Port gitflow workflow and branch rulesets** · 2h

_Story:_ As a developer, I want the Gitflow rules enforced so that branch discipline does not depend on memory.

Copy the `gitflow` reusable workflow. Mirror branch rulesets onto `main` and `staging`. Confirm `feature/*` → `staging`, `release/MAJOR.MINOR.PATCH` promotion, `hotfix/*` opening both PRs, and `main-sync/YYYY-MM-DD-HH-MM-SS`. Configure Dependabot to target `staging`, exempt by author.

_Acceptance criteria:_

- A feature branch PR targeting main is rejected
- Release branch naming is validated
- Dependabot PRs target staging and skip the author-exempt check
- Rulesets identical on both branches

**M0.23 — Port .actrc and make act-\* targets** · 1h

_Story:_ As a developer, I want to run workflows locally so that CI debugging does not require pushing commits.

Copy `.actrc` and the `make act-*` targets, adjusting image references if needed.

_Acceptance criteria:_

- `make act-lint` runs the lint workflow locally
- At least one act target completes green
- Image references resolve without manual pulls

**M0.24 — Port build-image.yml with new GHCR tag** · 1h

_Story:_ As a developer, I want the application container image published so that CI and the devcontainer pull a prebuilt image instead of rebuilding.

Copy `build-image.yml`, changing the GHCR tag to the Sorrel-and-Salt repo. Distinct from the database image in M0.18.

_Acceptance criteria:_

- Image publishes to ghcr.io under the new repo name
- CI workflows pull the published tag
- No resume-2026 tag references remain

### Vercel setup

**M0.25 — Connect repo to Vercel and restrict branch deploys** · 1h

_Story:_ As a developer, I want only main and staging to deploy so that build minutes and function meters are not spent on every feature branch.

Connect the repo to a Vercel Hobby project. Add `vercel.json` with `git.deploymentEnabled` set true for `main` and `staging` only.

_Acceptance criteria:_

- A push to a feature branch produces no deployment
- A push to staging deploys
- vercel.json is committed, not configured only in the dashboard

**M0.26 — Disable deploy previews and alias staging** · 1h

_Story:_ As a developer, I want a stable staging URL so that OAuth callbacks and manual testing have a fixed target.

Turn off deploy previews in project settings. Map the `staging` branch to a stable Preview alias.

_Acceptance criteria:_

- Deploy previews are off
- Staging resolves at a fixed URL across deploys
- Production alias points at main

**M0.27 — Define environment variable and secrets matrix** · 1h

_Story:_ As a developer, I want every secret named and scoped up front so that no environment is discovered to be missing one mid-deploy.

Document and set: the production and staging Neon connection strings, `BETTER_AUTH_SECRET`, Google and GitHub OAuth client id and secret, admin bootstrap email. Record which are Vercel-managed versus GitHub Actions secrets.

_Acceptance criteria:_

- Matrix table committed to claude-docs
- Production and staging connection strings differ and point at different Neon branches
- All variables set for Production and Preview
- GitHub Actions secrets set for the migrate workflow
- No credentials required to run tests locally

**M0.28 — Deploy hello-world from staging and promote to production** · 2h

_Story:_ As a developer, I want the whole pipeline proven end to end before any feature work so that deploy problems surface while the app is trivial.

Merge a trivial page to `staging`, confirm the Preview deploy, then run a `release/0.0.1` promotion to `main` and confirm Production.

_Acceptance criteria:_

- Staging URL serves the page
- Release branch promotion succeeds through the merge queue
- Production URL serves the page
- Build time recorded in claude-docs as a baseline

### Doc archive and workshop gates

Added after the original breakdown, once the docs and the workshop had enough in them to need gating.

**M0.34 — Stand up the doc archive and compress the working docs** · 2h

_Story:_ As a developer, I want a write-once archive and a compressed set of live docs so that a stale statement cannot outlive the milestone that made it true.

Create `claude-docs/archive/<mN>/` and run the first compression pass. The archive is written, not read: nothing may end up living only in it, so every settled decision and binding constraint moves into a live doc before its transcript is archived.

_Acceptance criteria:_

- `claude-docs/archive/` exists with the M0 pass inside it
- Every live doc statement is true as of M0's end
- No live doc sends the reader into the archive to understand the system
- An already-archived file is never edited; a repeat pass writes a dated subdirectory

**M0.35 — Fix the stale 'auto' comment above defaultState: 'dark'** · 1h · **merged, then superseded by MB.38**

> **Superseded, not wrong.** The comment fix holds. The regression check M0.35
> added beside it, `scripts/check-workshop-theme-default.ts`, said in its own
> header that it was a script only because Vitest had not landed; MB.38 moved
> that assertion into `src/test/workshop-guards.test.ts`, which is also the
> first time CI has enforced it — the script ran from pre-commit alone.

_Story:_ As a developer, I want comments to match the code beneath them so that the next reader is not misled about the default.

_Acceptance criteria:_

- The comment describes the actual default
- No other comment in the file contradicts the code

**M0.36 — Wire check:stories and workshop:build into CI** · 2h · **merged, then superseded by MB.38**

> **Superseded, not wrong.** Both gates still run in CI. `workshop:build` stays
> on `checks.yml`'s `build` leg exactly as M0.36 wired it; `check:stories` left
> that leg when MB.38 made it a Vitest test, so it runs on the `vitest` job
> instead. Neither runs in pre-commit any more.

_Story:_ As a developer, I want the story gates enforced in CI so that a PR cannot skip them by skipping the local hook.

Both checks run in pre-commit **and** in CI's build job. `check:stories` catches a missing story; `workshop:build` catches one that fails to bundle.

_Acceptance criteria:_

- Both run in CI's build job
- A component without a story fails CI
- A story that fails to bundle exits non-zero
- The gate is scoped to `src/components/`

**M0.37 — Document the undocumented styling and workshop files** · 2h

_Story:_ As a developer, I want every styling and workshop file to have a doc so that the conventions are discoverable without reading the source.

_Acceptance criteria:_

- Each styling and workshop file is covered in `claude-docs/`
- The docs match the files as they exist

## M1 — Database foundation

_28 tasks · 45 hours_

**Sequencing**

- M1.5 must land before any migration touching an existing column. It is the reason no down migrations exist in this repo.
- M1.21 and M1.22 block M1.27, which is in turn what makes M1.9 a clone rather than a setup routine.
- M1.16 blocks every service that writes. No feature code writes to the database before the choke point exists, or audit columns start rotting immediately.
- This milestone does not execute as a block. Its write path (M1.16, M1.19, M1.17, M1.20) runs in Wave 2 on one table; its seed and harness tasks (M1.21 through M1.28) cannot run until Wave 4, because every one of them writes rows into tables that Wave 3 creates. M1.18’s trigger closes Wave 3 so it attaches to every audited table at once.

### Neon and Drizzle

**M1.1 — Create Neon project and wire the Vercel integration** · 1h

_Story:_ As a developer, I want deployment databases provisioned so that staging and production have isolated data from the first migration.

Create one Neon project with `production` as the default branch and `staging` as a child branch of it, so staging can be reset from production data without a second project. Install the Neon Vercel integration so `DATABASE_URL` is injected per environment. Neon is deployment-only — tests never touch it.

_Acceptance criteria:_

- Two branches in one project: production and staging
- Staging and production connection strings exist and differ
- Branch and storage usage checked against the current free-tier limits
- DATABASE_URL resolves in both Vercel environments
- Scale-to-zero behaviour noted in claude-docs with the ~1s resume expectation
- No Neon credentials are needed to run tests

**M1.2 — Install Drizzle and add the connection module** · 2h

_Story:_ As a developer, I want a single typed database client so that every query path goes through one configured connection.

Add `drizzle-orm`, `drizzle-kit` and the Postgres driver. Write `drizzle.config.ts` and a connection module that reads `DATABASE_URL`. Export nothing that bypasses the repository layer.

_Acceptance criteria:_

- A trivial query runs against local Postgres
- The same code connects to Neon when DATABASE_URL points there
- Connection module is the only place the driver is instantiated

**M1.3 — Add database npm scripts and the first migration** · 2h

_Story:_ As a developer, I want migration commands wired before any schema exists so that every table arrives through the same mechanism.

Implement `db:generate`, `db:migrate`, `db:seed`, `db:reset`. Generate and apply an initial migration enabling required extensions.

_Acceptance criteria:_

- `npm run db:migrate` applies cleanly to an empty database
- Re-running is idempotent
- Migration files are committed, not generated at deploy time

**M1.4 — Add migrate.yml for staging and production** · 2h

_Story:_ As a developer, I want migrations applied automatically on merge so that a deploy never runs against an older schema.

Workflow applying migrations to staging on merge to `staging` and to production on merge to `main`. Migrations run before the new deploy goes live, which is only safe because every migration is additive under the M1.5 policy.

_Acceptance criteria:_

- Merge to staging applies pending migrations
- Merge to main applies them to production
- Workflow fails loudly and blocks the deploy on a migration error
- Completes before the Vercel deploy is promoted
- Concurrent runs are serialised so two merges cannot migrate at once

**M1.5 — Adopt expand/contract and add a destructive-DDL check** · 2h

_Story:_ As a developer, I want the schema to stay compatible with the previous app version so that reverting a bad release is a deploy rollback and never a database rollback.

Drizzle generates no down migrations, and writing them by hand is a reliable way to lose data. Instead, adopt expand/contract: every migration must work against both the old and new application code. Adding a column is additive; renaming one is add, backfill, dual-write, then drop in a later release. Add a CI check that flags DROP COLUMN, DROP TABLE, RENAME, type narrowing and NOT NULL additions, failing unless the PR body carries an explicit acknowledgement line. Document the policy and the forward-fix convention in claude-docs.

_Acceptance criteria:_

- Policy documented with a worked rename example across two releases
- CI check flags each destructive DDL form
- Check passes when the acknowledgement line is present, fails when it is not
- Reverting the app one version leaves it working against the migrated schema
- No down-migration files exist anywhere in the repo

**M1.6 — Snapshot before production migrations and drill the restore** · 2h

_Story:_ As an operator, I want a known-good point to return to so that a migration that corrupts data is recoverable rather than merely regrettable.

Before migrating production, the workflow creates a Neon branch from the current production state, named by commit sha. Write the recovery runbook: how to promote that branch back, what the data-loss window is, and who decides. Then actually rehearse it once against staging rather than assuming it works.

_Acceptance criteria:_

- A snapshot branch is created before every production migration
- Branch name identifies the commit it precedes
- Runbook states the exact promotion steps and the data-loss window
- Restore has been performed once against staging and the result recorded
- Old snapshot branches are pruned on a schedule so the branch quota is not exhausted

### Test harness

**M1.7 — Configure Vitest with unit and db projects** · 2h

_Story:_ As a developer, I want two test projects so that pure logic runs fast in jsdom while data-layer tests get a real Postgres connection.

`vitest.config.ts` with a `unit` project (jsdom) and a `db` project (node, local Postgres). Keep the 80% threshold on lines, branches, functions and statements. Upload coverage artifacts.

_Acceptance criteria:_

- `npm run test:coverage` runs both projects
- Thresholds fail the run when coverage drops below 80%
- db project connects to the compose Postgres, not Neon
- Coverage artifact uploads in CI

**M1.8 — Port vitest.setup.ts** · 1h

_Story:_ As a developer, I want the existing test setup carried over so that RTL and jsdom quirks are already solved.

Port `afterEach(cleanup)` and the localStorage polyfill — Node's native global still shadows jsdom's — plus MSW server lifecycle hooks.

_Acceptance criteria:_

- Components unmount between tests
- localStorage is writable in jsdom tests
- MSW starts and resets around each test

**M1.9 — Clone a per-worker test database from the baked template** · 1h

_Story:_ As a developer, I want isolated databases per Vitest worker so that parallel data-layer tests cannot interfere, without maintaining a test-database harness to get it.

A `globalSetup` helper of roughly ten lines: each worker runs `CREATE DATABASE sorrel_test_${VITEST_WORKER_ID} TEMPLATE sorrel_template` and drops it on teardown, with a drop-if-exists first so a crashed run self-heals. Postgres copies template files directly, so this is fast enough to need no further optimisation. Rejected alternative, with the reasoning recorded in claude-docs: wrapping each test in a transaction that rolls back. It reads cleaner but breaks here, because `withAudit` opens its own transaction and `SET LOCAL app.current_user_id` would escape the savepoint into the outer wrapper, leaking one test user's identity into the next assertion — precisely the thing these tests exist to verify.

_Acceptance criteria:_

- Two workers writing the same table do not collide
- No migrations run at test time
- A crashed previous run leaves nothing to clean up by hand
- Setup is small enough to read in one screen
- The rejected transaction-rollback approach and its reason are recorded

**M1.10 — MSW server and GraphQL handler stub** · 1h

_Story:_ As a developer, I want component tests to mock the GraphQL endpoint so that they never require a running server.

Set up the MSW node server with a stub handler for `/api/graphql`, and a helper for per-test response overrides.

_Acceptance criteria:_

- A component test can override a single operation's response
- Unhandled requests fail loudly rather than silently
- Handlers reset between tests

**M1.11 — Configure Playwright on port 8001 with local Postgres** · 2h

_Story:_ As a developer, I want e2e runs against a production build and a real database so that they catch what component tests cannot.

`playwright.config.ts` with `webServer` running `npm run build && npm run start` on 8001, preserving separation from the dev server on 8000. `globalSetup` prepares `sorrel_e2e`; specs truncate and reseed between files.

_Acceptance criteria:_

- A smoke spec passes locally and in CI
- Dev server on 8000 can run simultaneously
- sorrel_e2e is reseeded between spec files
- No Neon connection involved

**M1.12 — Wire axe-core into Playwright** · 1h

_Story:_ As a user relying on assistive technology, I want the app to meet accessibility standards so that I can use every page and modal.

Add `@axe-core/playwright` and a reusable scan helper. Assert accessibility here rather than via vitest-axe, matching the resume-2026 pattern.

_Acceptance criteria:_

- Scan helper is callable from any spec
- A seeded violation fails the run
- Smoke spec scans at least one page

**M1.13 — Wire monocart coverage for e2e** · 1h

_Story:_ As a developer, I want e2e coverage reported so that the two suites' contributions are visible separately.

Configure `monocart-coverage-reports` for the Playwright run and upload the artifact.

_Acceptance criteria:_

- Coverage report generated after an e2e run
- Artifact uploads in CI
- Report is separate from the Vitest report

**M1.14 — Port vitest and playwright CI workflows with path filters** · 2h

_Story:_ As a developer, I want test jobs skipped for docs-only changes so that trivial PRs are not slowed by the full suite.

Port the two reusable workflows, add the Postgres service, and path-filter so documentation-only changes skip them.

_Acceptance criteria:_

- Both workflows run green on a code PR
- A docs-only PR skips them and still satisfies the gate
- Both use the CI Postgres service

### Audit and repository

**M1.15 — Implement auditColumns and applyAudit with unit tests** · 2h

_Story:_ As an owner, I want every record to carry who created and last changed it so that a shared workspace has an accountable history.

Write `src/db/audit.ts` exporting the six-column spread. Implement `applyAudit()` covering insert, update and soft delete. Unit test each case.

_Acceptance criteria:_

- Insert sets created_at, created_by, updated_at, updated_by
- Update leaves created_at and created_by untouched
- Soft delete sets deleted_at and deleted_by only
- Ids in the payload are ignored in favour of session ids

**M1.16 — Implement repository.ts with withAudit** · 2h

_Story:_ As a developer, I want one write path so that audit stamping cannot be skipped by a new call site.

Implement `withAudit(session, fn)` as the only exported write mechanism. It opens the transaction, injects audit ids, and is the sole module importing the database client.

_Acceptance criteria:_

- A write outside withAudit is impossible through the public API
- Audit ids come from the session, never the request body
- Transaction rolls back cleanly on error

**M1.17 — Add lint rule banning db imports outside repository.ts** · 1h

_Story:_ As a reviewer, I want the choke point enforced mechanically so that I do not have to catch violations by eye.

Add an Oxlint restriction on importing the database client anywhere except `src/db/repository.ts`.

_Acceptance criteria:_

- A deliberate violation fails `npm run lint`
- repository.ts itself is exempt
- Rule runs in pr-gate

**M1.18 — Add updated_at trigger migration** · 1h

_Story:_ As an owner, I want updated_at to be correct even after a manual database fix so that the audit trail cannot be quietly bypassed.

Migration adding a trigger function and attaching it to every audited table, so `updated_at` is set by the database rather than application code.

_Acceptance criteria:_

- A raw psql UPDATE still stamps updated_at
- Application updates are not double-stamped inconsistently
- Trigger attaches automatically for tables added later, or the pattern is documented

**M1.19 — Set app.current_user_id GUC per transaction** · 1h

_Story:_ As a developer, I want the current user available to the database so that the v2 history trigger, and the policies deferred to the public launch, can read who acted without a re-audit of every write path.

Inside `withAudit`, set `app.current_user_id` to the acting user's uuid at transaction start. Shipped as `select set_config('app.current_user_id', $1, true)` rather than a literal `SET LOCAL`: the two are identical in effect (`is_local => true` _is_ `LOCAL`), but `SET LOCAL` takes no bind parameters and would mean interpolating a user id into SQL text.

_Acceptance criteria:_

- current_setting('app.current_user_id') returns the acting user inside a transaction
- The value does not leak across pooled connections
- A write without a session is rejected

**M1.20 — Repository-level soft-delete filtering and the partial-index convention** · 2h

_Story:_ As a user, I want deleted records to stay recoverable but invisible so that a mistaken delete is not permanent and does not clutter my lists.

Build the finder **builder** that applies `deleted_at IS NULL`, plus the mechanical guard that fails a finder written without it. This is a code sweep, so it lands as a mechanism early and each later task adopts it in that task’s own PR — not as a retrofit pass over N finders that do not exist yet. At Wave 2 there is exactly one table, which is the point: the guard exists before there is anything to forget. Document the partial unique index convention too — without the WHERE clause, deleting a record permanently blocks reusing its name.

_Acceptance criteria:_

- No exported query can return a soft-deleted row
- A finder written without the builder fails the guard, not review
- A dedicated escape hatch exists for admin restore paths and is clearly named
- Convention documented in claude-docs with an example index

### Seed and acceptance harness

**M1.21 — Seed module with the minimal scenario** · 2h

_Story:_ As a developer, I want one seed module used by Docker, Vitest and Playwright so that a bug reproduces identically in all three.

`src/db/seed/index.ts` exporting `seed(db, { scenario })`. Implement `minimal`: one admin, one user, empty compendium.

_Acceptance criteria:_

- Seed runs from a script, a test, and the Docker init hook
- Re-running is idempotent or explicitly truncates first
- minimal produces exactly one admin and one user
- The bootstrap user is inserted with the fixed UUID MB.5 defines, as a single self-satisfying statement, not a second generated id

**M1.22 — Standard scenario with fixture users A–E** · 2h

_Story:_ As a developer, I want a fixed cast of users and workspaces so that authorization tests read clearly and consistently.

Implement `standard`: A owner of W, B member of W, C viewer in W, D member of unrelated X, E site admin in no workspace. Populated compendium whose entries declare `nomenclature`, deliberately including the awkward cases the identity model exists for: one `none` entry, one `unknown` entry, one mineral _variety_ (`Quartz var. amethyst`), the full Cat's Claw set including _Felis catus_, and one in-use `form` value outside the curated vocabulary — so M4.7/M4.7a and M8.3/M8.3a have real ambiguity to resolve against, not just clean data.

_Acceptance criteria:_

- All five users exist with the documented roles
- Workspaces W and X exist and share no members
- E belongs to no workspace
- Compendium has enough entries to exercise search
- Every compendium entry declares a `nomenclature`
- At least one seeded entry is `none`, one is `unknown`, and one is a mineral variety
- The Cat's Claw set is seeded, including the _Felis catus_ entry
- At least one seeded `form` value falls outside the curated vocabulary

**M1.23 — Demo scenario with spells** · 2h

_Story:_ As a developer, I want realistic seeded content so that manual testing and screenshots show the app as a user would see it.

Implement `demo`: standard plus spells in W's grimoire with ingredients and layer order.

_Acceptance criteria:_

- At least two spells with ingredients and layer order
- Spells reference a mix of compendium and workspace-local ingredients
- One spell also carries a custom, one-off ingredient (MB.40) — `name` and `form` with no `ingredient_id` — beside its linked layers, so Wave 13 has a real row of each kind to test against
- Reseeding does not duplicate rows

**M1.24 — Docker seed hook and make db-reset** · 1h

_Story:_ As a developer, I want a one-command reset so that a corrupted local database is never a blocker.

Wire the seed module into the Postgres init script and add `make db-reset` to drop, migrate and reseed.

_Acceptance criteria:_

- `make db-reset` completes from a broken state
- First `make docker-up` on a clean volume seeds automatically
- Scenario is selectable by environment variable

**M1.25 — Fixture factories** · 2h

_Story:_ As a developer, I want factories with sensible defaults so that tests state only what they are actually testing.

Add `fixtures/` factories — `makeIngredient`, `makeSpell`, `makeWorkspace` — with overrides, so tests read `makeIngredient({ categories: ['protection'] })`. `makeIngredient()`'s default supplies a valid `nomenclature`/`canonicalName` pair rather than leaving every fixture to silently default to `none`, and an override lets a test opt into any other kind.

_Acceptance criteria:_

- Each factory works with zero arguments
- Overrides merge rather than replace nested defaults
- Factories are used by at least one existing test
- `makeIngredient()` defaults to a valid `nomenclature`/`canonicalName` pair; overriding `nomenclature` still produces a valid row
- Every ingredient or workspace name a factory supplies on its own is invented, never a real one — M1.27 bakes `standard` into every db worker's clone, and a real name is only safe until someone seeds it; a test that reads the seed's own lists backstops it

**M1.26 — asUser helper and Forbidden error type** · 1h

_Story:_ As a developer, I want a uniform way to act as a fixture user so that authorization tests are one line rather than five.

Implement `asUser(A)` returning a session context, and a `Forbidden` error the services throw so tests can assert on the type rather than a message string.

_Acceptance criteria:_

- asUser works for all five fixture users
- Forbidden is distinguishable from a not-found error
- A denied call rejects rather than returning empty

**M1.27 — Bake migrations and the standard seed into the database image** · 2h

_Story:_ As a developer, I want the shared image to carry a ready-to-clone template so that no environment spends time migrating or seeding before it can run a test.

Extend the M0.18 image build: apply migrations and the standard scenario into `sorrel_template` at build time. This closes the dependency that M0.18 deliberately left open, and is what makes M1.7 a clone rather than a setup routine.

_Acceptance criteria:_

- Template contains the full schema and the standard scenario
- Image tag changes when migrations or seed change
- A cloned database is immediately usable with no further setup
- CI and compose both pick up the new tag from one place
- Local and CI clones are byte-identical in content

**M1.28 — make test-stories with a per-story checklist** · 2h

_Story:_ As a product owner, I want a live checklist of which user stories pass so that progress is measured against requirements rather than coverage percentage.

Add the `tests/acceptance/` directory and a `make test-stories` target running only that suite and printing story ids with pass or fail. Track acceptance coverage separately from the 80% line threshold.

_Acceptance criteria:_

- Target runs only the acceptance suite
- Output lists story ids and status
- Acceptance coverage reported separately from unit coverage
- Suite runs in CI but does not double-count toward thresholds

## M2 — Auth and users

_9 tasks · 15 hours_

**Sequencing**

- M2.1 lands deliberately failing tests. Either exempt tests/acceptance from the CI gate until the milestone closes, or mark them skipped-with-reason and unskip as each is implemented.
- M2.3 (role column) blocks all of M5. Without it there is no admin to bootstrap.
- M2.7 (session helper) blocks every protected route and every service that takes a session.
- M2.8 replaces the old auto-created workspace. Signing in no longer produces one, so the three post-signup states must all be handled or new users hit a dead end.
- M2.9 is a scoping task whose output is a decision doc and a follow-up task, not code. Schedule the follow-up before a second admin is actually needed.

### Better Auth

**M2.1 — Acceptance test scaffold for stories 1–2** · 2h

_Stories 1–2 — As a developer, I want the account stories expressed as failing tests before implementation, so that done is measured against the specification rather than my own reading of it._

Create `tests/acceptance/01-accounts.test.ts` with failing tests naming stories 1 and 2. This PR intentionally lands red — it is the definition of done for the milestone.

_Acceptance criteria:_

- Both tests exist and fail for the right reason
- Each describe block names its story number and text
- make test-stories lists them as failing
- CI is configured to tolerate the acceptance suite failing until the milestone closes

**M2.2 — Install Better Auth with the Drizzle adapter** · 2h

_Story:_ As a developer, I want auth running in-process so that there is no extra service, no extra deploy and no extra cost.

Install Better Auth, configure the Drizzle adapter against Neon, and generate the auth tables migration. Mount the route handlers at `/api/auth/*`. This is the one deliberate exception to the GraphQL-only rule and it is not really an exception: OAuth callbacks are browser redirects from Google and GitHub carrying query params, and the session cookie is set on an HTTP response. None of that can travel over a GraphQL POST. The rule governs application data access — every query and mutation about ingredients, workspaces and spells — not the protocol handshake that establishes who you are.

_Acceptance criteria:_

- Auth tables created by migration, not by runtime bootstrapping
- Route handlers respond at /api/auth/*
- BETTER_AUTH_SECRET read from the environment
- No application data is readable or writable through the auth endpoints
- The exception and its boundary are recorded in claude-docs
- No separate service or container added

**M2.3 — Users table with role, creation rights and admin bootstrap** · 1h

_Story 18 precondition — As the site owner, I want admin rights to exist on a real account, so that someone can curate the compendium before anyone depends on it._

Add `users` with id, email, name, image, role (`user` | `admin`), canCreateWorkspace and audit columns. `name`/`image` (not `displayName`/`avatarUrl`, corrected post-implementation) are Better Auth's own core `User` field names — renaming them would need a `user.fields` mapping in `src/lib/auth.ts` for no real benefit. Promote the first user matching the bootstrap env email. `canCreateWorkspace` defaults to false: signing in with Google or GitHub earns an account and nothing more. The flag turns true by one of two routes — accepting a workspace invitation (M7.5) or an admin granting it (M5.8) — and once true it stays true, so an established user can create as many workspaces as they like.

_Acceptance criteria:_

- A user matching the bootstrap email becomes admin on first sign-in
- All other users default to role user with canCreateWorkspace false
- Admins can create workspaces regardless of the flag
- Nothing in the OAuth flow sets the flag
- No API or UI path grants admin
- Role and creation rights are columns, not separate tables

**M2.4 — Configure the Google OAuth provider** · 1h

_Story 1 — As a new user, I want to sign in with Google, so that I don't have to manage another password._

Register the OAuth client, configure callback URLs for local, staging and production, and add the provider to Better Auth.

_Acceptance criteria:_

- Sign-in completes on local and staging
- Callback URLs registered for all three environments
- Client secret stored as a secret, not committed

**M2.5 — Configure the GitHub OAuth provider** · 1h

_Story 1 — As a new user, I want to sign in with GitHub, so that I don't have to manage another password._

Same as the Google provider, for GitHub.

_Acceptance criteria:_

- Sign-in completes on local and staging
- An existing account is matched by email rather than duplicated
- Callback URLs registered for all three environments

**M2.6 — Build the sign-in page** · 2h

_Story 1 — As a new user, I want one sign-in page offering Google and GitHub, so that I can get in without managing another password._

`/sign-in` with both OAuth buttons, an error state for a failed callback, and a redirect to the intended destination after success. Component test with role and label queries only.

_Acceptance criteria:_

- Both providers reachable by keyboard
- Failed callback shows a readable error, not a stack trace
- Post-sign-in redirect honours the original destination
- axe scan passes

**M2.7 — Session helper and route protection** · 2h

_Story:_ As a user, I want unauthenticated access blocked so that my grimoire is not reachable by anyone with the URL.

Server-side session helper used by layouts and services. Protect all authed segments, redirecting to `/sign-in` with the return path preserved.

_Acceptance criteria:_

- An unauthenticated request to a protected route redirects
- The return path survives the round trip
- Sign-in and invite acceptance remain publicly reachable
- Services receive the session rather than reading it themselves

**M2.8 — Post-signup landing for a user with no workspace** · 2h

_Story 2 — As a newly signed-in user, I want to be told plainly what I can do next, so that an empty account does not look like a broken one._

The site is invite-gated, so a new user does not get a workspace automatically. Three states to handle after sign-in: they accepted an invitation and are already a member, so send them there; they hold creation rights from a previous invitation or an admin grant, so offer the create form; they have neither, so explain that Sorrel and Salt is invite-only and that they need a link from someone who already uses it, or an admin's approval. The third state is what decides whether the product reads as exclusive or broken, so write it carefully and do not leave it as a bare empty page.

_Acceptance criteria:_

- An invited user lands in the workspace they were invited to
- A user with creation rights is offered the create form
- A user with neither sees a clear explanation, not an empty dashboard or an error
- The explanation says how to get in, and does not imply the account is faulty or pending review
- No workspace is created implicitly by signing in
- Story 2 acceptance test passes

**M2.9 — Scope a UI for granting admin** · 2h

_Story:_ As the site owner, I want a considered plan for granting admin rights so that promoting a second admin does not mean editing an environment variable and redeploying.

Scoping task, not an implementation. Bootstrapping by env email works for exactly one admin and stops there. Write up the options — admin-grants-admin, invitation-based, or a break-glass CLI — with the risks of each, what audit trail a grant needs, whether admin can be revoked and by whom, and what happens if the last admin is removed. Output is a short decision doc in claude-docs plus a follow-up task with acceptance criteria, sized like every other task here.

_Acceptance criteria:_

- At least three approaches described with their failure modes
- Covers granting, revoking, and the last-admin case
- States what the audit trail must record
- Ends with a written follow-up task ready to schedule
- No implementation in this PR

**M2.10 — Enable Ladle on staging, gated behind auth** · 2h

_Story:_ As a developer, I want the component workshop reachable on staging so that reviewers can see real component states without pulling the branch, without turning Ladle into a public, unauthenticated surface.

`workshop:build` (M0.30) writes only a gitignored static build today; nothing publishes it anywhere reachable outside CI. Deploy that build to a staging URL and gate it behind the session check M2.7 introduces — an unauthenticated visitor redirects to `/sign-in` exactly like any other protected route. Admin only. Staging carries the same protections as production; local development stays the only relaxed environment, so `npm run workshop` on 61000 stays unauthenticated. Needs M0.30 and M2.7.

_Acceptance criteria:_

- The static build deploys to a reachable staging URL on every staging deploy
- An unauthenticated request redirects to `/sign-in`, same as any other protected route
- Only admins reach it once authenticated
- Local `npm run workshop` and `make workshop` remain unauthenticated
- No application data or GraphQL access is reachable through the workshop route
- The gating mechanism is recorded in claude-docs beside the Ladle setup notes

_A developer/product user type that can view this without full admin rights is v2, not this task._

## M3 — GraphQL foundation

_10 tasks · 17 hours_

**Sequencing**

- Sits ahead of all feature work so that every request in the app — admin included — uses one endpoint, one context and one auth path. There is no second access convention anywhere in this project. It runs whole, in Wave 7, after the schema and the auth surface exist and before any resolver needs them.
- M3.2 (Pothos builder and context) blocks every resolver from M4 onward.
- M3.5 (codegen) must land before any client-side query work.
- M3.6 (pagination helper) blocks every list query in the project. Landing it late means retrofitting bounds onto queries already written without them.
- M3.8 fixes the access boundary for the whole project and M3.9 enforces it. Land both before feature work, or the boundary erodes one convenient import at a time.
- The DataLoaders are deliberately not here. Each sits with the schema it loads: M4.8 (categoriesByIngredient), M6.11 (membersByWorkspace), MB.9 (ingredientsById) and MB.10 (usersById).

### GraphQL server

**M3.1 — Mount GraphQL Yoga at /api/graphql** · 2h

_Story:_ As a developer, I want a single GraphQL endpoint in-process so that the API adds no hosting cost and no separate deploy.

Yoga as a Next.js route handler, exported from `src/app/api/graphql/route.ts`. No Apollo integration shim.

_Acceptance criteria:_

- Endpoint responds to a trivial query
- Runs in the existing process, no new service
- GraphiQL available on local development only, not on staging

**M3.2 — Pothos builder and request context** · 2h

_Story:_ As a developer, I want a typed code-first schema so that a resolver returning the wrong shape is a compile error.

Set up the Pothos builder with an auth-scopes plugin. **No ORM plugin** — MB.20 dropped it, and DESIGN.md §7 carries the four rules that follow: object types are declared by hand against the row type each service returns, `auditColumns` maps to one shared `AuditInfo` object type rather than six flat fields per table, every Pothos package in the stack is a stable major, and the GraphQL layer imports `drizzle-orm` for types only. Context carries the session and per-request DataLoader instances.

_Acceptance criteria:_

- Schema builds, and a hand-declared object type still fails typecheck when a column's type changes under one of its fields
- `AuditInfo` is defined once and reused; no per-table audit shape
- No `@pothos/plugin-drizzle` in `package.json`; every Pothos package is a stable major
- Context exposes session and loaders
- Loaders are constructed per request, never module-level
- A wrong return shape fails typecheck

**M3.3 — Apply graphql-armor protections in staging and production** · 2h

_Story:_ As an operator, I want expensive or probing queries rejected everywhere the app is reachable so that a client cannot burn my compute budget or map the schema, and so the protections are exercised before they matter.

Add graphql-armor with a depth limit of 7 and a cost limit. Introspection and field suggestions are off in staging as well as production — staging is a public URL and gets real protections. `NODE_ENV` is the right signal: Vercel sets it to production for Preview builds, so staging is covered automatically and the rule reads as 'on only where the environment is not publicly reachable'.

_Acceptance criteria:_

- A query nested past depth 7 is rejected in every environment
- An expensive composed query is rejected by cost in every environment
- Introspection is off in staging and production, on under `next dev`
- Field suggestions are off in staging and production
- Verified against the deployed staging URL, not only in a test
- Noted that a local production build also disables them, which is correct and occasionally surprising

**M3.4 — Schema snapshot test** · 1h

_Story:_ As a reviewer, I want schema changes to be visible in the diff so that a contract change is never silent.

Write the SDL out on every run and snapshot it. This and design tokens are the only permitted snapshots.

_Acceptance criteria:_

- SDL file is committed and regenerated by the test
- An unintended schema change fails CI
- Snapshot update is a deliberate, reviewable step

**M3.5 — graphql-codegen and the staleness check** · 2h

_Story:_ As a developer, I want generated client types to match the schema so that the client cannot drift from the server.

Configure graphql-codegen for typed documents. Add `codegen.yml` to CI, failing if generated output is stale.

_Acceptance criteria:_

- Codegen produces typed documents and hooks
- CI fails when generated files are stale
- Generated files are committed

**M3.6 — Cursor pagination helper with a hard maximum page size** · 2h

_Story:_ As an operator, I want every list bounded by one shared rule so that no query can ask for the whole table, and no future list query can forget to say so.

Build the connection helper every list query uses: cursor-based, stable across inserts, with a default page size of 25 and a hard server-side maximum of 100. A client asking for more gets the maximum, not an error and not what it asked for. Cursors encode a stable sort key plus id, never an offset, so inserting a row does not shift a page under a reader. This pairs with the cost limit in M3.3: without a bound on list size the cost calculation has nothing to multiply, and depth limiting alone will not save you from one query for every ingredient with every category and spell attached.

_Acceptance criteria:_

- One helper used by every list query in the project
- Default 25, maximum 100, enforced server-side
- Requesting more than the maximum returns the maximum, silently and consistently
- Cursors encode sort key plus id, never an offset
- Pagination is stable when rows are inserted or soft-deleted mid-traversal
- Cost limit accounts for the requested page size
- A test walks a full multi-page traversal and asserts no row is skipped or repeated

### GraphQL client

**M3.7 — Wire graphql-request with TanStack Query** · 2h

_Story:_ As a developer, I want a light client so that the bundle does not carry a second normalized cache duplicating TanStack Query.

Set up the provider, a typed request function, and sensible defaults for staleness and retries. Not Apollo — its cache duplicates TanStack Query and adds roughly 40 kB.

_Acceptance criteria:_

- A client component can run a typed query
- Provider is mounted once at the root
- Errors surface to the nearest error boundary
- No Apollo dependency present

**M3.8 — React cache() wrapper and the server read path** · 1h

_Story:_ As a developer, I want server components to read through services directly so that a server-rendered page does not pay to serialize a GraphQL round trip to itself.

Wrap read-side service functions in React `cache()`, request-scoped so there is no staleness risk. This task also fixes the access boundary for the project, so write it down rather than leaving it to be inferred: server components read through `cache()`-wrapped services; everything the browser initiates — every mutation, and every read that happens without a navigation — goes through GraphQL. Services are the real authorization boundary and both paths end there, so a permission enforced once holds for both. Two transports, one set of rules.

_Acceptance criteria:_

- A layout and page requesting the same workspace hit Postgres once
- Cache does not persist across requests
- Mutations are never wrapped, and never take the server read path
- The boundary is documented in claude-docs with an example of each path
- Every service used by a server component enforces authorization itself, not relying on the caller
- A test proves the same denial occurs through both paths for one representative service

**M3.9 — Lint rules enforcing the access boundary** · 1h

_Story:_ As a reviewer, I want the two access paths enforced mechanically so that the boundary does not erode one convenient import at a time.

Extend the lint restrictions so `src/graphql/**` cannot import the database client or the repository directly, and neither can `src/app/**` — server components reach services and nothing below them. Combined with M1.17, this leaves services as the only route to the database from anywhere.

_Acceptance criteria:_

- A resolver importing the client or repository fails lint
- A server component importing the client or repository fails lint
- Services remain importable from both
- Client components cannot import services at all
- Rules run in pr-gate

**M3.10 — me query, User type and field-level auth scope** · 2h

_Story:_ As a user, I want my own profile available to the client so that the shell can render my identity and memberships.

Add the `me` query and `User` type. Apply a Pothos auth scope to `User.email` as the second check behind the service layer.

_Acceptance criteria:_

- me returns the signed-in user
- Unauthenticated me is rejected
- Another user's email is not exposed
- Memberships resolve through a loader

## M4 — Compendium data layer

_13 tasks · 21.5 hours_

**Sequencing**

- M4.1 through M4.5 block the compendium service in M5.
- M4.6 blocks M4.7, which blocks the duplicate warning in M5.10. Hand-entering a large compendium without duplicate detection is how you end up with three spellings of mugwort.
- M4.8 (categoriesByIngredient loader) needs the schema from M4.1 and the builder from M3.2, which is why it sits here rather than in the GraphQL milestone.
- This milestone splits across three waves. Its tables (M4.1, M4.2, M4.4, M4.6) land in Wave 3; its category seed (M4.3) opens Wave 4 because M1.22 consumes its 63 categories; its services and loader (M4.5, M4.7, M4.8) wait for Wave 8.
- It is not true that nothing here is workspace-scoped: M4.1 declares `workspaceId` and M4.7 scopes its search to the current workspace, so the services half genuinely depends on M6.

### Schema and seed

**M4.1 — Ingredients schema with nomenclature and the generated identity key** · 2h

_Story:_ As a user, I want one ingredient table covering the shared reference and my own additions so that spells point at a single kind of thing.

Add `ingredients` with nullable workspaceId, name, nomenclature (enum, no database default), canonicalName, form (free text, no longer an enum), description, element, planet, zodiac, deities[], color, safetyNotes, substitutes[] and audit. `folkNames[]` moves to its own `ingredient_folk_names` table (M4.4a). `canonicalKey` is a stored generated column — `lower(coalesce(canonical_name, name))` plus the normalised `form` — carrying three CHECK constraints: the nomenclature/canonicalName biconditional, and non-blank checks on `canonicalName` and `form`. The three partial unique indexes over `canonicalKey` and the label move to M4.1a, which keeps both tasks inside the 1–2h sizing without paying for a later `ALTER`.

_Acceptance criteria:_

- `nomenclature` has no database default — an insert omitting it fails
- The biconditional holds both ways: `none`/`unknown` **with** a formal name is rejected, and any other kind **without** one is rejected
- A blank-but-present formal name or form is rejected; `form` otherwise accepts any text, including a value absent from the curated vocabulary
- `canonical_key` cannot be inserted or updated directly — Postgres refuses, and the column is absent from `$inferInsert` so TypeScript refuses first
- Changing `name` leaves `canonical_key` unchanged on a row with a formal name and recomputes it on a row without one; changing `form` always recomputes it
- `Root Bark` and `root bark` produce the same key; `element` accepts only its documented value set
- (Uniqueness criteria move to M4.1a)

**M4.1a — Ingredient identity and label unique indexes** · 1h

_Story:_ As a user, I want two ingredients that share a display label but not a formal identity to both exist in the compendium, so that "Cat's Claw" can name four different things without the database picking one.

Add the three partial unique indexes over `ingredients`: global identity on `canonical_key` where `workspace_id IS NULL`, per-workspace identity on `(workspace_id, canonical_key)`, and per-workspace label uniqueness on `(workspace_id, lower(name))`. Split from M4.1 to keep both tasks inside CLAUDE.md's 1–2h sizing without paying for an `ALTER` later — `CREATE INDEX` is purely additive, and nothing queries `ingredients` until Wave 8.

_Acceptance criteria:_

- All three partial unique indexes exist, each carrying `WHERE deleted_at IS NULL`
- Two compendium entries may share a label but not a formal name, and both persist
- _Valeriana officinalis_ root and leaf both persist as distinct compendium rows
- Two workspaces may each hold a local ingredient with the same formal name
- Inside one workspace, two locals may not share either a label or an identity
- A `pg_indexes`/`pg_index.indpred` catalogue-introspection test asserts all three predicates

**M4.2 — Category groups and categories schema** · 2h

_Story:_ As a user on a phone, I want categories grouped so that selecting from 52 chips is manageable.

Add `category_groups` (id, name, slug, colorDark, colorLight, description, audit) and `categories` (id, name, slug, description, groupId, audit). Both global only, admin-curated. **A category carries no colour**: MB.35 made a group's colour a pair of hexes, one per theme, which a single `color` column on a category cannot hold either half of — and M4.3 seeds the pair onto the group row, leaving nothing to seed a per-category counterpart from. Settled while writing the table; §5, §6, §14 and `db.md` are corrected in this PR. **Re-scoped by MB.35**: the group was a `category_group` pgEnum, which is right for a closed set and wrong once an admin may add a ninth — adding an enum value is DDL, and an admin mutation cannot run DDL. Both tables land in this one task because a NOT NULL foreign key is unwritable without the table it points at.

_Acceptance criteria:_

- Slug unique among non-deleted rows, on both tables
- `groupId` is required, and is a real foreign key to `category_groups`
- Both `colorDark` and `colorLight` are required; validating each against its own theme's 4.5:1 floor is M5.6b's job, not a CHECK constraint — the failure needs a readable message and the ground to compare against
- No order column: groups list alphabetically by `name`
- No workspace scoping on either table

**M4.2a — ingredient_forms and form groups schema** · 2h

_Story:_ As an admin, I want a curated vocabulary of ingredient forms shaped like categories, so that the autofill on the entry form has something to offer.

Add `ingredient_form_groups` (id, name, slug, description, audit) and `ingredient_forms` — global, admin-curated, shaped like `categories` — with `name`, `slug`, `groupId` and a required `description`, so a curated value like `rootBark` can explain itself. Same shape as M4.2, adjacent task. Deliberately **not** a foreign key target for `ingredients.form`, which stays free text — the curated table is a vocabulary, not a constraint.

**Re-scoped by MB.35**, alongside M4.2 and for the same reason: the form groups are a set that has already grown twice — and again in M4.3a, which replaced the original three with §5's six — so they are rows rather than an enum. No colour and no order column — form groups section an autofill dropdown alphabetically, they are not chips. Note the two directions of the same table sitting side by side here: `ingredient_forms.groupId` is a foreign key because only an admin writes it, while `ingredients.form` stays text because a member writes it. That asymmetry is the rule stated in DESIGN.md §5, not an inconsistency to tidy up.

_Acceptance criteria:_

- `slug` unique among non-deleted rows on a partial index, on both tables. **Corrected while building the task**: this bullet asked for the same index on `name`, written by MB.28 and left unamended when MB.35 re-scoped the task around it — MB.35's own rule is slug-only uniqueness on all four vocabulary tables, which is what M4.2 shipped and what db.md has stated since. Two live forms may therefore share a display name; the autofill disambiguates them by group instead, per the two bullets added to M4.7a and M5.10a. The reasoning, including why a `name` index would have been both weaker than it looks and stricter than the vocabulary wants, is recorded in db.md
- `groupId` is required, and is a real foreign key to `ingredient_form_groups`
- `description` is required and non-empty on both
- `ingredients.form` still carries no foreign key to `ingredient_forms` — asserted, since it is the property the identity design rests on
- No workspace scoping
- Carries the audit spread
- A test asserts `ingredients` carries no foreign key to `ingredient_forms`

**M4.3 — Seed all 63 categories across 8 groups** · 2h

_Story:_ As a user, I want a rich category vocabulary on day one so that I am not building the taxonomy myself before I can use the app.

Seed the eight `category_groups` rows first, then every category from §6 pointing at them. **Re-scoped by MB.35**: the group colour is no longer read from a Sass token at render time, so this task resolves each of M0.7's eight `$category-groups` entries — which already carry a `dark` and a `light` value — to two hexes and writes both onto the group row. That resolution happens once, here — it is what carries M0.7's contrast tuning across into data, and nothing downstream recomputes it.

_Acceptance criteria:_

- All eight groups present, then all 63 categories, matching §6 exactly
- Each seeded group carries both hexes resolved from its M0.7 token, and each clears 4.5:1 against its own theme's ground — asserted, not assumed, since the resolution is the step where the tuning could silently be lost
- Every category and every group has a non-empty description
- Reseeding does not duplicate rows in either table, and re-running it does not overwrite a colour pair an admin has since changed

**M4.3a — Seed the ingredient form vocabulary** · 1h

_Story:_ As an admin, I want a starter set of ingredient forms already curated, so that the form autofill has real options before anyone types the first uncurated value.

Seed `ingredient_forms` with §5's table: six groups and the 78 forms filed under them, including the original twelve and the additions the identity model surfaced (leaf, seed, fruit, peel, stem, wood, sap, pollen, bone, claw, feather, shell, tooth, fur, shed, wax, whole). Pulled ahead of M1.22 for the same reason M4.3 already is: M1.22 consumes this vocabulary.

**It ships the way M4.3's categories do**, and that is part of the task rather than a later one: reference data reaches staging and production only through `migrate.yml`, since deploys are CI-only and neither database has a shell. So `scripts/db-seed.ts` gains a second target (`npm run db:seed:forms`) and the existing seed step runs both vocabularies — one gate, one log, one summary. Its input is renamed `seed-categories` → `seed-reference` in the same pass, since it no longer seeds only categories.

**The groups were resettled while building the task, and §5 amended in the same PR.** The original three — organism part, preparation, matter — named a group after a process where `form` asks what you are holding, and put 21 of 29 rows under one header. §5 now files every form under one of Botanical, Animal, Mineral, Substance, Fluid or Curio: three by source, three by state. A powdered mineral is a `powder`, and the ingredient's name carries what it was made from. **There is no `Other`** — a value fitting no form is free text, which is what feeds M4.7a's second bucket and M5.6a's to-do list, and a catch-all row would swallow exactly those.

_Acceptance criteria:_

- Every form §5's table lists is present, in §5's order, filed under the group §5 files it under — and nothing §5 does not list
- The twelve MB.28 originals and the seventeen animal-derived and whole-organism additions are all still present
- §5's six groups are seeded, and no group holds more than half the vocabulary — the failure the regrouping exists to prevent
- Every row carries a non-empty description, and no two rows share one — "non-empty" alone would pass a description copied from the row above. A description defines its own form and stops there: an earlier draft ended several with a redirect ("Set firm, it is a balm") and tested that 30 such pairs named each other, which read as instructions rather than descriptions and pushed toward padding a line to keep a test green
- The vocabulary is asserted against §5's own sentence, parsed at test time rather than transcribed, and the parse itself is checked so an empty match cannot make the comparison vacuous
- Reseeding does not duplicate rows, does not resurrect a form an admin has deleted, and does not overwrite a description an admin has rewritten
- `npm run db:seed:forms` runs it, and `migrate.yml` runs it on staging and production alongside the categories

**M4.4 — ingredient_categories join table** · 1h

_Story 22 — As a workspace member, I want ingredients to carry several categories, so that I can find things that are both protective and cleansing._

Join table with the audit stamp columns and indexes supporting lookup in both directions. **Hard-deleted, per MB.34**: it spreads `...auditStampColumns`, not `...auditColumns`, so there is no `deleted_at`, no partial unique index, and no tombstone per chip toggle — the composite primary key is what keeps a pair unique, and re-adding one that was removed is an ordinary insert.

_Acceptance criteria:_

- Composite primary key on `(ingredient_id, category_id)` prevents duplicate assignment
- Indexed for both ingredient-to-category and category-to-ingredient
- Carries `...auditStampColumns` and no delete columns
- A removed pair is deleted outright through `write.delete` and can be re-added

**M4.4a — ingredient_folk_names table** · 1h

_Story 21 — As a workspace member, I want an ingredient's common names stored and searchable, so that I can find Devil's Shoestring without remembering it is honeysuckle root._

Add `ingredient_folk_names` — `ingredientId`, `name`, audit — with a per-ingredient partial unique index on `(ingredient_id, lower(name))` and a trigram GIN index on `name`. Normalises what `folkNames text[]` used to hold; uniqueness is per ingredient, deliberately not global, since several unrelated plants sharing a common name is the thing being documented. It keeps the full `...auditColumns` spread and the partial index that follows from it — MB.34 hard-deletes the three join tables, and this is not one of them: a folk name is content, not a link. Lands before M1.18 so the trigger sweep covers it in the same pass as `ingredient_forms`.

_Acceptance criteria:_

- Carries the audit spread
- Unique per `(ingredient_id, lower(name))` on a partial index excluding soft-deleted rows
- Two different ingredients may both claim the same common name — asserted, not merely allowed
- Foreign key to `ingredients`
- Re-adding a folk name after soft delete succeeds
- `gin_trgm_ops` index on `name`, so §9's common-name matching has an index to use
- Catalogue introspection asserts the unique index's predicate, not merely that some predicate exists
- Lands before M1.18 so the trigger sweep covers it in one pass

**M4.5 — Zod schemas for ingredient, category and stock** · 2.5h

_Story:_ As a developer, I want one validation definition shared by client and server so that the two cannot disagree about what is valid.

Write Zod schemas covering both models, exported for form validation and service-level parsing. Two variants for `ingredient`: a workspace-local schema where only `name` is required and `nomenclature` defaults to `none` when no formal name is given, and a compendium schema that makes the admin answer `nomenclature` explicitly. Both couple `nomenclature` to `canonicalName` in Zod — `none`/`unknown` forbid it, every other kind requires it — so the database CHECK is never what a user sees. `canonicalName` and `form` trim and reject a blank-but-present value with **no format regex**; `form` validates against nothing but trim/non-empty, never against the curated vocabulary, since that vocabulary is an autofill, not a constraint. `name` must not also appear among the ingredient's own folk names.

**Stock comes with them**, as the `StockInput` schema M9.4 and M9.9 both write through: `quantityOnHand` and `lowStockThreshold` reject a negative value, and `unit` validates against M9.2's shared unit-to-dimension module rather than a second list. `db.md` pushes the non-negative rule here deliberately — it is not a CHECK constraint because the refusal has something to say, and until now no task owned it.

**The Zod-to-issues adapter lives here too**, not in `src/lib/errors.ts`: a failed `safeParse` becomes MB.43's `ValidationError` with one issue per Zod issue and the path preserved, so the error type stays Zod-free and every service raises the same shape without each one writing the conversion.

_Acceptance criteria:_

- Same schema imported by form and service
- Only name is required on the local variant; a stub ingredient validates, with `nomenclature: 'none'` supplied automatically
- The compendium variant requires `nomenclature` explicitly
- The kind↔name coupling is enforced in both directions, matching the database CHECK
- `canonicalName` and `form` reject a blank-but-present value; neither is checked against a format regex or the curated vocabulary
- `name` is rejected if it duplicates one of the ingredient's own folk names
- Enum fields reject values outside the documented sets
- Unit tests cover valid and invalid cases

### Duplicate detection

**M4.6 — Enable pg_trgm and add the gin index** · 1h

_Story 16 precondition — As a developer, I want trigram matching available in the database, so that near-duplicate names can be detected before they multiply._

Migration creating one multicolumn gin index over `name` and `canonical_name` on `ingredients` — a multicolumn `gin_trgm_ops` index serves a query on either column alone, so one index suffices rather than two. The extension itself was already enabled by `0000_enable-extensions.sql`, which keeps owning that statement: this task consumes the `gin_trgm_ops` operator class rather than re-enabling it, and asserts its presence by test. `ingredient_folk_names`' own trigram index is M4.4a's, created with that table. Matching must use the `%` operator with an explicit per-transaction `SET LOCAL pg_trgm.similarity_threshold`, never a bare `similarity(...)` comparison — `similarity()` cannot use the index even with sequential scans disabled, and the two forms return identical-looking results until the query is slow.

_Acceptance criteria:_

- Extension enabled on local and Neon — 0000's, asserted here rather than re-enabled
- The multicolumn index covers both `name` and `canonical_name`, and the planner uses it for a predicate on either column alone
- `ingredient_folk_names_trgm` (M4.4a) exists and is used independently
- Matching sets the similarity threshold explicitly per transaction and is written with the `%` operator, not a `similarity(...)` comparison
- Migration is idempotent

**M4.7 — Fuzzy duplicate service** · 2h

_Story 16 — As a workspace member, I want to be warned when a name resembles something that already exists, so that I don't end up with three spellings of mugwort._

Return compendium and in-workspace matches on `name`, `canonicalName`, or any folk name, filtered with the `%` operator against an explicit `SET LOCAL pg_trgm.similarity_threshold = 0.4` per transaction — never a bare `similarity(...) > 0.4` comparison, which cannot use the trigram index and returns identical-looking results while sequentially scanning. Each result carries its formal name — a "Did you mean Cat's Claw?" that could mean five different plants is useless without it. Non-blocking by design.

_Acceptance criteria:_

- Near-misses above threshold are returned
- Below-threshold names return nothing
- Folk names and the formal name are matched, not only the display name
- Every result carries its formal name
- The threshold is set explicitly per transaction and the match is written with the `%` operator, not a `similarity()` comparison
- `EXPLAIN` on the query shows the trigram index is used, not a sequential scan
- Results span compendium and current workspace only

**M4.7a — Scoped suggestion service for common names and forms** · 2h

_Story:_ As a workspace member, I want the common-name and form fields to suggest from what already exists, so that I don't invent a fourth spelling of a name three ingredients already share.

Service plus GraphQL field suggesting values as someone types a folk name or a form: the curated `ingredient_forms` vocabulary first, then in-scope values already in use but not in it, visibly distinguishable — the admin's curation to-do list. Shares M4.7's trigram machinery and permission scoping, including its threshold rule. Suggestions are scoped to the compendium and the current workspace only, on both the suggested strings and their attribution — a naive implementation scopes only the attribution list and leaks the strings themselves.

_Acceptance criteria:_

- The curated vocabulary is returned first and in-use values outside it second, distinguishable by the caller
- **A curated form matches on its description as well as its name**, so typing `salve` or `balm` offers _Ointment_ — §5's rule, added by M4.3a when those two rows merged into one. The vocabulary is short by design and each description carries the words its row stands in for, so name-only matching would offer nothing and the value would be typed uncurated. A name match outranks a description match in the returned order (typing `wax` puts _Wax_ above _Ointment_), asserted by test. Only curated rows are searched this way — an in-use uncurated value has no description. `ingredient_forms.description` needs its own trigram index, or the match degenerates to a sequential scan the same way M4.6's rule warns about
- Suggestions of in-use values span the compendium and the current workspace only
- A folk name or in-use form present only in unrelated workspace X never appears, asserted by direct query and not merely by absence from a list
- Filtering happens in SQL, not after fetching
- Each suggestion carries the formal names of the in-scope ingredients already claiming it
- **Each curated form suggestion carries its group's name**, so the caller can render "Wax (substance)". Not cosmetic: M4.2a constrains `ingredient_forms` on `slug` alone, so two live forms may share a display name, and since `ingredients.form` stores the string rather than an id the group is the only thing that tells them apart. A test asserts that two same-named forms in different groups both come back, each with its own group — returning the name alone would collapse them into an unresolvable pair
- Soft-deleted rows are excluded
- Bounded by the M3.6 pagination helper
- The similarity threshold is set explicitly per transaction and the match is written with the `%` operator, same as M4.7, so the trigram index is actually used

### Batching

**M4.8 — DataLoader base plus categoriesByIngredient** · 2h

_Story:_ As an operator, I want related data batched so that a 50-ingredient page does not fire 101 queries and spend compute on nothing.

Implement the loader factory, `categoriesByIngredient`, and `folkNamesByIngredient` — same base, same shape, landing together as one task. Test by asserting query count, not just correctness.

_Acceptance criteria:_

- A 50-ingredient fetch with categories issues a bounded number of queries
- A 50-ingredient fetch with folk names issues a bounded number of queries
- Test asserts query count explicitly
- Loaders are per-request
- Batching preserves result ordering

## M5 — Admin curation tool

_13 tasks · 22 hours_

**Sequencing**

- This milestone exists to give you a manual data-entry and testing surface early. Once it closes you can populate the compendium by hand instead of editing seed files.
- Admin uses the same GraphQL endpoint, context and session handling as every other page. No server actions, no bespoke route handlers.
- M5.9 and M5.10 (IngredientForm) are reused by the modals in M8. Build the form standalone and wrap it later, rather than building it inside a modal.
- Depends on M2.3, all of M3, and M4’s schema and services. It does **not** stand clear of M6: M5.4’s admin guard reads the role M2.3 adds, and M5.5/M5.6 read and write through the GraphQL surface M8.5 and M8.8 build, so those precede M5.5 within Wave 8.
- Within the milestone, M5.9 and M5.10 build `IngredientForm` and M5.5 consumes it, so the form is built before the page that wraps it — the reverse of the original numbering.

### Compendium service

**M5.1 — Acceptance test scaffold for stories 17–18** · 1h

_Stories 17–18 — As a developer, I want the admin stories expressed as failing tests before implementation, so that the tool everything else is entered through is verified as it is built._

Create `tests/acceptance/07-admin.test.ts` with failing tests naming stories 17 and 18. Landing this first means the admin tool is verified as it is built, which matters more than usual here because everything downstream will be entered through it.

_Acceptance criteria:_

- Two failing tests, one per story
- Each names its story number and text
- make test-stories reports them

**M5.2 — Compendium service with admin-only writes** · 2h

_Story 17 — As a workspace member, I want to be prevented from editing compendium entries, so that shared reference data stays trustworthy for everyone._

Read path open to every signed-in user; write path restricted to `users.role = admin`. Authorization lives here, not in resolvers, and the tests confirm the mutation surface offers no bypass on update or delete. A write that omits `nomenclature` is rejected before it reaches the database, and the partial-unique-index violation on `canonical_key` is translated into a readable error naming the colliding entry rather than surfacing the raw constraint name.

_Acceptance criteria:_

- Any signed-in user can read the compendium
- A non-admin update is rejected with Forbidden
- A non-admin delete is rejected with Forbidden
- An admin write succeeds and stamps updated_by
- A compendium write omitting `nomenclature` is rejected
- A colliding write surfaces a readable error naming the existing entry, not the raw constraint name — as a `ValidationError` whose issue path is `canonicalName`, so the message can land beside the field that caused it (MB.43)
- Story 17 acceptance test passes

**M5.3 — Soft-delete a compendium entry and prove the name can be reused** · 1h

_Story 25 — As a workspace member, I want deletions to be recoverable, so that a mistake costs a request for help rather than my data._

Admin soft delete stamping deletedAt and deletedBy, plus the test that proves the partial unique index from M4.1a allows re-adding the same **formal name** afterwards. Separate from M5.2 because it exercises the index behaviour rather than the authorization rule — without the WHERE clause, deleting an entry would permanently reserve its identity. The assertion must be on the formal name, not the display label: two compendium entries may already share a label without deletion being involved, so a label-reuse assertion alone would still pass even with the WHERE clause removed.

_Acceptance criteria:_

- Deleted ingredient vanishes from all finders
- Re-adding the same **formal name** (not merely the same display label) succeeds
- deletedBy records who deleted it
- Row is still present in the table

### Admin surface

**M5.4 — Admin route guard and layout** · 1h

_Story 18 — As a site admin, I want an admin area only I can reach, so that I can curate shared data without exposing the surface to anyone else._

`/admin` layout asserting `users.role = admin`. A signed-in non-admin gets a clear 'not authorized' page, not a 404 — `/admin` is a guessable path on every site ever built, so pretending it does not exist buys no secrecy and only makes the app look broken to someone who typed it out of curiosity. This differs from `/coven/[slug]` in M6.10, where the existence of a workspace is genuinely private and 404 is the right answer. Admin follows the same access boundary as the rest of the site: server-rendered reads through services, every mutation through GraphQL. The nav and layout list `/admin/forms` beside `/admin/compendium` and `/admin/categories`, since curating the form vocabulary is now a third admin resource.

_Acceptance criteria:_

- Admins see the layout
- Signed-in non-admins get a styled not-authorized page explaining they lack rights
- Signed-out visitors are sent to sign-in with the return path preserved
- Guard is server-side, not a client redirect
- The page does not name who the admins are or offer a way to request access
- Admin mutations go through /api/graphql like every other mutation
- Nav entry appears only for admins
- Nav lists `/admin/forms` alongside `/admin/compendium` and `/admin/categories`

**M5.5 — Admin compendium CRUD** · 2h

_Story 18 — As a site admin, I want to add, edit and soft-delete compendium entries, so that the shared reference can grow without a deploy._

`/admin/compendium` reusing IngredientForm in editable mode, with create, edit and soft delete over the global entries. Reads and writes go through GraphQL queries and mutations. The form covers `nomenclature`, `canonicalName` and `form` alongside the existing fields.

_Acceptance criteria:_

- Admin can create, edit and soft-delete compendium entries, including `nomenclature`, `canonicalName` and `form`
- Audit columns record the admin
- Soft-deleted entries vanish from the public compendium
- Fuzzy duplicate warning applies here too
- A colliding write surfaces a readable duplicate error naming the existing entry
- Admin can filter to entries still `nomenclature = 'unknown'` — the curation to-do list

**M5.6 — Admin categories CRUD** · 2h

_Story 18 — As a site admin, I want to add, edit and soft-delete categories, so that the taxonomy can change without a migration._

`/admin/categories` with create, edit and soft delete, including the group assignment that drives chip grouping. Reads and writes go through GraphQL queries and mutations.

_Acceptance criteria:_

- Admin can manage categories including which group they sit in
- Slug uniqueness enforced with a readable error, pathed to `name` — the slug is derived rather than typed (M4.3), so the field the admin can act on is the one the message lands beside
- Deleting a category in use is handled explicitly, not by cascade surprise
- The group is chosen from the `category_groups` rows, not a fixed list; managing the groups themselves is M5.6b

**M5.6a — Admin forms CRUD** · 2h

_Story 18 — As a site admin, I want to add, edit and soft-delete ingredient forms, so that the vocabulary can grow without a deploy._

`/admin/forms`, reusing M5.6's page shape. Admins manage the curated vocabulary, including the group; soft-deleting a value in use does not rewrite any ingredient — the value stays on the rows and moves into the uncurated bucket — and the page lists in-use values outside the vocabulary as a curation to-do list with a one-click add. Lands after M5.6, before M5.7, which gates it.

_Acceptance criteria:_

- Admin can create, edit and soft-delete vocabulary rows, including the group
- Slug uniqueness surfaces a readable error, pathed to `name` as in M5.6
- Soft-deleting a value in use does not rewrite any ingredient; the page says so
- The page lists in-use values outside the vocabulary as a to-do list with a one-click add
- Non-admins cannot reach the page or the mutations

**M5.6b — Admin group CRUD, with the colour contrast check** · 2h

_Story 18 — As a site admin, I want to add a category group and pick its colour, so that the taxonomy can grow a ninth section without a migration and a deploy._

Added by MB.35. `/admin/category-groups` and `/admin/form-groups`, reusing M5.6's page shape a third and fourth time. Both manage name, slug and description; the category-groups page also carries the two colour pickers, one per theme, each previewed on its own ground.

**The colour validation is the substance of this task.** A group's colours are two free hexes, one per theme — so the service rejects `colorDark` below 4.5:1 against the dark ground and `colorLight` below 4.5:1 against the light one, with a message naming which column failed and what the ratio was. Two columns because M0.7 already tunes per theme and no single hex clears both grounds without being mud on one. Refusing rather than silently correcting is the `unitConvert` idiom (§11): the caller gets an explicit failure to handle, never a quietly adjusted colour they did not choose. Lands after M5.6, and before M5.7 gates it.

_Acceptance criteria:_

- Admin can create, edit and soft-delete groups on both pages; both lists are alphabetical by name
- A colour failing 4.5:1 against its own ground is refused, and the error names the column and the ratio — asserted for each column, including a hex that would pass the other theme's ground
- That refusal is pathed to the column it names, `colorDark` or `colorLight`, so it lands beside the picker that produced it rather than above both (MB.43)
- Soft-deleting a group in use is handled explicitly, not by cascade surprise — the categories pointing at it must go somewhere, and the page says where
- Non-admins cannot reach either page or their mutations

**M5.7 — Gate admin mutations by role** · 2h

_Stories 18 and 19 — As a workspace owner, I want admin rights to cover shared reference data and nothing else, so that an admin cannot reach into my workspace._

Apply the role check at the service layer for every admin mutation, with tests for each entry point, and add a Pothos auth scope on the admin mutation fields as the second check — the same belt-and-braces pattern used for `User.email`. `ingredient_forms` mutations (M5.6a) are admin mutations too, and join the per-mutation rejection tests here — left out, this task would fail by design the moment the form vocabulary exists.

_Acceptance criteria:_

- Every admin mutation rejects non-admins at the service layer
- Pothos auth scope rejects them at the schema layer independently
- Rejection is Forbidden, not a silent no-op
- Tests cover each mutation individually, including every `ingredient_forms` mutation
- No admin capability outside compendium, categories and the form vocabulary

**M5.8 — Approve a user for workspace creation** · 1h

_Story:_ As a site admin, I want to approve someone who has no invitation, so that a person starting a coven of their own can get in without knowing an existing user.

Admin control setting `canCreateWorkspace` on a user, with the change audited. This is the approval route; the invitation route is M7.5. Revoking does not touch workspaces the person already created — they remain owner of those, since the flag governs creating, not keeping.

_Acceptance criteria:_

- Admin can grant and revoke the flag
- The change records who made it and when
- Revoking leaves existing workspaces and their ownership untouched
- Users awaiting approval are findable, so an admin can act without being sent an id
- A non-admin cannot reach the control or the mutation

### Entry form

**M5.9 — IngredientForm — fields and inline validation** · 2h

_Stories 29 and 31 — As a workspace member, I want to save an ingredient with only a name and see errors beside the field that caused them, so that I can capture something quickly and fix mistakes without hunting._

Form covering every ingredient property, on react-hook-form with the Zod resolver (§14), validating with the shared Zod schema, showing errors inline next to their field. Installs react-hook-form and `@hookform/resolvers`; closed-enum fields are native `<select>`s and the array fields use `useFieldArray`. Gains a formal-name field and a nomenclature-kind selector wired to the kind↔name coupling rule, and `form` becomes a free-text field rather than a fixed selector.

**One error element, two sources.** The resolver catches what it can before the mutation is sent; MB.43's `fieldErrors` arrive afterwards for what only the server could know — a duplicate identity, a slug already taken — and go in through `setError`. Both render through the same element, so a server-only rule is not a second visual language, and a rule that moves from one side to the other changes nothing a user sees.

_Acceptance criteria:_

- Saving with only a name succeeds — the workspace-local variant still supplies `nomenclature: 'none'` automatically
- A resolver error appears beside the offending field, before any request is sent
- A server `fieldErrors` entry appears beside the same field, through the same element — arranged with MB.43's `mockGraphQLError` helper
- An error with an empty path renders above the fields rather than beside one
- Errors are announced to assistive technology, from either source
- The nomenclature selector and formal-name field enforce the coupling rule inline
- `form` is a free-text field, not a fixed selector
- Array fields (folkNames, deities, substitutes) are editable

**M5.10 — IngredientForm — Did you mean warning** · 2h

_Story 16 — As a workspace member, I want a warning when the name I'm typing resembles an existing one, so that I can reuse an entry instead of duplicating it._

Debounced fuzzy lookup on the name field rendering a non-blocking suggestion with a link to the match, alongside a Create Anyway action. The suggestion renders the matched entry's formal name beside its display label, so a "Did you mean Cat's Claw?" warning is disambiguated at the point of entry.

_Acceptance criteria:_

- Warning appears for a near-match and does not block submission
- Link navigates to the suggested ingredient
- The suggestion shows the matched entry's formal name beside its label
- Create Anyway proceeds
- No warning below threshold
- Story 16 acceptance test passes

**M5.10a — Common-name and form lookups in IngredientForm** · 2h

_Story 16 — As a workspace member, I want the common-name and form fields to suggest from what already exists, so that I don't duplicate what three other entries already call the same thing._

Adopts M4.7a. Both fields are one `Combobox` component built on Downshift's `useCombobox` — headless, not react-select (§14) — which this task installs. Both fields debounce and suggest, with curated values visibly distinguished from in-use uncurated ones and each suggestion showing which ingredients already claim it, by formal name. Picking one fills the text and links nothing; free text outside the vocabulary is accepted without a warning. Lands after M5.10, before M5.5, which consumes `IngredientForm`.

_Acceptance criteria:_

- Both fields debounce and suggest
- Curated values are visibly distinguished from in-use uncurated ones
- **A curated form suggestion renders its group beside the name** — "Wax (animal)" beside "Wax (substance)" — using the group M4.7a returns. Two live forms may legitimately share a display name (M4.2a constrains the slug alone), and the group is the only thing distinguishing them; without it the dropdown offers the same word twice with no way to choose. The group is part of the option's accessible name, not a visual-only adornment, so the distinction survives for a screen-reader user, and it is asserted by a test that renders a same-named pair
- A suggestion shows which ingredients already claim it, with their formal names
- Picking a suggestion fills the text field and links nothing
- Free text outside the vocabulary is accepted without a warning
- **The suggestion list ends in an explicit "use what you typed" row**, so typing past the vocabulary is a visible choice rather than a discovered behaviour. Added by M4.3a: the seeded vocabulary carries no `Other`, deliberately — a catch-all would swallow the uncurated values M4.7a's second bucket and M5.6a's to-do list exist to surface — so the affordance belongs in the UI instead. Asserted by a test that types a value in no vocabulary and picks that row
- Keyboard operable end to end and announced to assistive technology
- axe clean, usable at 375px

## M6 — Workspaces and membership

_16 live tasks · 29 hours · 2 retired (M6.4, M6.5)_

**Sequencing**

- M6.2 (schema) blocks everything else in this milestone.
- M6.3 (assertMembership) blocks every workspace-scoped service from M8 onward. Land it before any workspace feature work.
- **M6.4 and M6.5 are retired** (MB.29). M6.3 absorbed what they were for: it is now both the check and the proof that the check ran, and its `@ts-expect-error` assertion is the "prove the second layer works without the first" argument M6.5 made, moved to the layer that carries it.
- M6.3's sweep over the finders is complete rather than partial only because it runs in Wave 5, after all seven workspace-scoped tables exist. Run at its original position it would have covered whichever tables happened to exist that week — and every finder added later would then be a retrofit rather than an adoption.
- M6.3 and M6.6 are two different things: the check-plus-proof, and the evidence that it holds by direct id for every entity. Neither is redundant — the type cannot catch a service that holds a valid proof and hand-writes the wrong `where`, which is exactly what M6.6 queries for.
- M6.11 and M6.12 land before M6.13 because the members page composes both.
- M6.8 must return a reason, not a bare refusal, or M6.16 cannot offer the right remedy.

### Schema and authorization

**M6.1 — Acceptance test scaffold for stories 3–13** · 2h

_Stories 3–13 — As a developer, I want the workspace stories expressed as failing tests before implementation, so that authorization is verified against the specification._

Extend `01-accounts.test.ts` with failing tests for stories 3 through 13, each naming its story.

_Acceptance criteria:_

- Eleven failing tests, one per story
- Each names its story number and text
- make test-stories reports them

**M6.2 — Workspaces and workspace_members schema** · 2h

_Story:_ As a user, I want workspaces with members so that a coven or household can share one inventory.

Add `workspaces` (id, name, slug, audit) and `workspace_members` (workspaceId, userId, role, joinedAt, audit) with a composite primary key. Unique slug on a partial index. No kind column — every workspace behaves identically.

_Acceptance criteria:_

- Migration applies cleanly
- Slug is unique among non-deleted workspaces
- Composite primary key on the membership pair
- No column distinguishes one class of workspace from another
- Both tables carry the full audit spread

**M6.3 — assertMembership, the role hierarchy and the `Membership` proof** · 2h

_Story 12 — As a viewer, I want to read everything in a workspace but change nothing, so that I can be included without putting shared records at risk._

Implement `assertMembership(session, workspaceId, minRole)` with the ordering viewer < member < owner, called for every workspace-scoped operation. Unit test every role and threshold combination.

**Re-scoped by MB.29**, which made this task the whole of the second authorization layer rather than the first half of it. `assertMembership` **returns** a branded `Membership` — `{ workspaceId, userId, role }` carrying a `unique symbol` brand, so it is unconstructible outside this service: no object literal satisfies it and no cast to it survives review. Every workspace-scoped repository finder and every `AuditWriter` method then takes a `Membership` as its first argument and ANDs `workspace_id = membership.workspaceId` onto the query _itself_, rather than trusting a `workspaceId` its caller passed alongside; `write.insert` fills the column from the proof for the same reason. A service cannot write a workspace-scoped query without having passed the check — impossible rather than absent, which is the test CLAUDE.md's sweep-task rule applies, and free at runtime because the brand is erased at compile time.

This is a **mechanism plus a mechanical guard, adopted by each later task in its own PR** — the code half of that rule, not the database half. This task retrofits nothing: it converts the finders and writer methods that exist today, and every workspace-scoped finder added afterwards takes the proof in the PR that adds it.

The type is what makes the omission impossible, so the test for it must be a **compile** error, not a thrown one: a `@ts-expect-error` line calling a finder without a proof fails `npm run typecheck` the moment the parameter stops being required. A runtime assertion here would pass against a signature that had quietly gone optional.

Where the proof is weaker than a policy — a service that holds a valid proof for W and hand-writes a `where` naming X's ids, and the two join tables that carry no `workspace_id` — is covered by M6.6's direct-id denial tests, not by this type. Say so in the doc rather than implying the type closes it.

_Acceptance criteria:_

- Every role/threshold pair is covered by a test
- A non-member is rejected with Forbidden
- `assertMembership` returns a `Membership` that cannot be constructed anywhere else — asserted by a `@ts-expect-error` on an object literal and on a plain cast
- Every workspace-scoped finder and `AuditWriter` method takes a `Membership` first and applies `workspace_id = membership.workspaceId` itself; `write.insert` sets the column from it
- A `@ts-expect-error` compile assertion covers calling a workspace-scoped finder without a proof
- No service bypasses it, and no finder accepts a bare `workspaceId` string in its place
- `claude-docs/db.md` documents the proof, the finder convention, and the two gaps M6.6 covers

**M6.4 — ~~Row-Level Security policies for workspace-scoped tables~~** · **RETIRED 2026-09-17, not done**

> **Retired without being done (MB.29).** The ID is kept because task IDs are
> immutable, and the analysis below is kept because it is the specification for
> the migration that adds these policies at the public launch — it is correct,
> it is just not v1 work. Removed from the Asana board.
>
> **Why.** MB.24 made this task's policies workable at the price of three
> mechanisms before it (`sorrel_app`, derived credentials, a startup assertion)
> and one permanent one under it (`withViewer`, a transaction on every read).
> MB.29 took the standing cost seriously — `BEGIN`, `set_config`, `SELECT`,
> `COMMIT` is four round trips where a read is one, on a meter that bills I/O
> wait — and replaced the layer with a branded `Membership` proof in M6.3 that
> makes the same omission a compile error for nothing at runtime. `withAudit`
> keeps publishing `app.current_user_id`, so this task stays one migration away
> rather than needing a re-audit of every write path.
>
> **Where it lives now.** [`mb.24-rls-role-split.md`](design-decisions/mb.24-rls-role-split.md)
> is the specification, superseded as a plan for v1 and intact as a plan for
> then; `TO_CLAUDE.md`'s "V Public" list carries it as work.

_Story (retired):_ As an owner, I want the database itself to enforce workspace boundaries so that an application bug cannot leak my grimoire.

Migration adding Row-Level Security policies to every workspace-scoped table. RLS is a Postgres feature that attaches a rule to a table so the database itself filters which rows a query may read or change — enforcement below the application, so a bug in a service cannot leak another workspace's data. The policies need to know who is asking, which comes from the GUC set in M1.19. A GUC is Postgres's name for a runtime setting; `SET LOCAL app.current_user_id = '<uuid>'` defines a custom one scoped to the transaction, and a policy reads it back with `current_setting('app.current_user_id')`. Transaction-scoped matters: it cannot leak to the next request sharing a pooled connection.

**Re-scoped by MB.24**, which moved this task's two hardest problems out of it. The seed question is answered — `sorrel` holds `BYPASSRLS` as of MB.25, so the seed runs unimpeded and the criterion that used to defer the choice is struck. The read path is answered too: MB.26's `withViewer` publishes the GUC on reads, without which every policy here would return zero rows or raise on the `::uuid` cast. What remains is the policies themselves, plus four specifics MB.24 settled:

- **`FORCE ROW LEVEL SECURITY` alongside `ENABLE`.** Without it a table's owner is exempt from its own policies, and `FORCE` is what keeps that true of any owner-ish role a misconfigured `DATABASE_URL` might resolve to — Neon's `neondb_owner` in particular. `sorrel`'s `BYPASSRLS` outranks it, so migrate and seed are unaffected.
- **Two `sorrel`-owned helpers in an `app` schema.** `app.current_user_id()` (`stable`) returns `nullif(current_setting('app.current_user_id', true), '')::uuid`, so an unset GUC denies rather than raises. `app.is_member(uuid, workspace_role)` is `security definer` with an explicit `search_path`, `execute` revoked from `public` and granted to `sorrel_app`. The `security definer` part is not a convenience: a policy on `workspace_members` written in §8's shape subqueries `workspace_members`, which is infinite policy recursion and Postgres rejects it outright. It also puts the role hierarchy in one place rather than one per policy.
- **`ingredients.workspace_id` is nullable**, and `NULL` means the global compendium. A policy without `workspace_id IS NULL OR …` deletes the compendium from every signed-in user's view.
- **`spell_ingredients` and `spell_categories` carry no `workspace_id`.** They are workspace-scoped only through `spells`, so they need policies joining through it — and the catalogue guard must enumerate the workspace-scoped set rather than infer it from a column name, or it silently exempts the two tables holding what a spell is made of.
- **`ingredient_folk_names` and `ingredient_forms` are new tables from the ingredient identity model (M4.4a, M4.2a), minted after this task was originally scoped.** Verify — do not assume — that the catalogue guard treats `ingredient_folk_names` the way it already treats `ingredient_categories` (both child tables carrying no `workspace_id` of their own, reached only through their parent ingredient), and `ingredient_forms` the way it already treats `categories` (both global and admin-curated, no per-workspace policy needed).

_Acceptance criteria (retired — not to be met in v1):_

- RLS `ENABLE`d **and `FORCE`d** on each workspace-scoped table, `spell_ingredients` and `spell_categories` included
- `app.current_user_id()` and `app.is_member()` created, owned by `sorrel`, `execute` granted to `sorrel_app` and revoked from `public`; `app.is_member` is `security definer` with an explicit `search_path`
- Policies read the acting user only through `app.current_user_id()` — never from a session variable, a parameter, or anywhere else
- A policy on `workspace_members` does not recurse
- The compendium is still visible: a signed-in user reads `ingredients` rows with `workspace_id IS NULL`
- Migrations and the seed still run green — as the owner, needing no per-seed workaround
- The setting does not survive past the transaction that set it
- Policy names follow one convention
- A `pg_class`/`pg_policy` guard test asserts every table in the enumerated workspace-scoped set has RLS enabled, forced, and at least one policy
- Confirmed by test, not assumed: `ingredient_folk_names` is covered the way `ingredient_categories` is, and `ingredient_forms` is covered the way `categories` is
- RLS and GUC are explained once in claude-docs so the next reader need not look them up

**M6.5 — ~~Prove RLS holds with the service check disabled~~** · **RETIRED 2026-09-17, not done**

> **Retired without being done (MB.29),** because the thing it proves no longer
> exists in v1: with M6.4 retired there is no policy to stub the service check
> away from. ID kept; removed from the Asana board.
>
> **What replaced it.** The second layer is now a type, so the test that proves
> it is a **compile** assertion rather than a runtime one — a `@ts-expect-error`
> in M6.3 showing a workspace-scoped finder cannot be called without a
> `Membership`. That is the same argument this task made, moved to the layer
> that now carries it: without it the proof would be decoration, since every
> passing test would pass on the service check alone.
>
> Its precondition insight — that "the database refused the read" has several
> causes and only one of them is the policy working — is retained in
> [`mb.24-rls-role-split.md`](design-decisions/mb.24-rls-role-split.md) and in
> CLAUDE.md's rule that an authorization test must assert **why** the access
> could have succeeded. That applies to the direct-id denial tests M6.6 runs.

_Story 19 (retired) — As a workspace owner, I want the database to block cross-workspace access even if the application forgets to, so that one missed check in a service is not a data breach._

M6.3 is the application-layer check and M6.4 is the database-layer one. They look redundant and that is the point: this task proves the second works without the first. Stub out `assertMembership` for the duration of one test, attempt a cross-workspace read, and assert the database refuses it. Without this test the RLS policies are decoration — every passing test would pass on the service check alone, and a broken policy would go unnoticed for months.

**Re-scoped by MB.24** with one criterion added, because "the database refused the read" has more than one cause and only one of them is the policy working. A test connected as a role that owns the tables would see no rows for the ordinary reason that RLS never applied to it, and a test whose GUC was never published would see no rows because `app.current_user_id()` returned `NULL` — both green, both proving nothing. Assert the preconditions, not just the outcome.

_Acceptance criteria (retired — not to be met):_

- Test passes only because RLS blocks the read
- The test asserts its own preconditions: the connected role neither owns the table nor holds `rolbypassrls`, and `app.current_user_id()` returns the acting user inside the transaction under test
- Stub is scoped to the single test and cannot leak into others
- The test fails if RLS is disabled on the table, proving it tests what it claims
- Comment explains why the bypass is deliberate

**M6.6 — Cross-boundary denial tests for non-members and site admins** · 2h

_Story 19 — As a workspace owner, I want both outsiders and site admins refused access to my workspace, so that neither a stranger nor a curator can read what my coven records._

Automated tests in the `db` suite, not a manual pass. Two actors, one harness: D, a member of an unrelated workspace, and E, a site admin belonging to no workspace. Assert both are refused W's ingredients and grimoire — by direct id, not merely absent from list results, since filtering a list is easy to get right while leaving a direct fetch wide open. Writes must throw Forbidden rather than silently no-op.

_Acceptance criteria:_

- Direct-id reads rejected for both D and E, not just filtered from lists
- Writes throw Forbidden rather than returning success
- Covers ingredients and grimoire
- E's admin capabilities over the compendium remain intact
- Failure messages do not reveal whether the record exists
- Story 19 acceptance test passes

### Workspace UI

**M6.7 — Create a workspace** · 2h

_Story 3 — As a signed-in user, I want to create a workspace, so that my coven or household has a shared place to work._

Service and mutation creating a workspace with the creator as owner, gated on canCreateWorkspace or the admin role. Slug generated from the name with collision handling. The gate lives in the service, so it holds for the GraphQL mutation and any future path equally.

_Acceptance criteria:_

- Creator is owner on creation
- A user without creation rights is rejected with Forbidden
- An admin can create without holding the flag
- Slug collisions resolve deterministically
- A user with rights may own more than one workspace
- Creation rights are not consumed by creating a workspace unless the invite said single-use
- Story 3 acceptance test passes

**M6.8 — Last-owner guard on demotion and removal** · 1h

_Story 11 — As a workspace owner, I want to be blocked from removing the last owner, so that a workspace cannot be orphaned by one careless click._

Reject any demotion or removal that would leave a workspace with zero owners, at the service layer. The rejection must carry enough information for the interface to offer the remedy — which member could be promoted, or whether the owner is the only member and should delete the workspace instead. A bare Forbidden here is what makes M6.16 impossible to build well.

_Acceptance criteria:_

- Demoting the only owner is rejected
- Removing the only owner is rejected
- The owner leaving voluntarily is also rejected
- The error distinguishes 'other members exist, promote one' from 'you are the only member'
- Two owners can each be demoted down to one

**M6.9 — WorkspaceSwitcher component** · 2h

_Story 8 — As a member of several workspaces, I want to switch between them without losing my place, so that moving between my own notes and a coven's is quick._

Component listing the user's memberships and navigating on select. Workspace comes from the URL, never session state — two tabs must be able to disagree safely.

_Acceptance criteria:_

- Lists every workspace the user belongs to
- Selecting navigates to the equivalent route in the new workspace
- Two tabs in different workspaces do not interfere
- Keyboard operable, axe clean

**M6.10 — Coven layout, slug resolution and non-member 404** · 2h

_Story:_ As a user, I want a workspace-scoped layout so that every page below it knows which workspace it is in without guessing.

`/coven/[slug]` layout resolving the slug to a workspace and asserting membership. Non-members get 404, not 403, so workspace existence is not disclosed — the opposite call to `/admin` in M5.4, and for a reason: a slug is a guess about someone's private data, whereas `/admin` is a fixed path everyone already knows.

_Acceptance criteria:_

- Members see the layout
- Non-members receive 404
- Unknown slug also receives 404, indistinguishable from the above
- Workspace is read from the URL segment only

**M6.11 — membersByWorkspace loader** · 2h

_Story:_ As an operator, I want membership lookups batched so that a members page does not issue one query per row.

Add the `membersByWorkspace` loader with a query-count assertion. Sits here rather than in the GraphQL foundation because it cannot exist before workspaces do.

_Acceptance criteria:_

- Loader batches correctly across a multi-workspace request
- Query-count assertion in place
- Loader is per-request, never module-level
- Ordering of batched results is preserved

**M6.12 — MemberList component** · 2h

_Story 9 — As a workspace member, I want each member shown with their role and joining date, so that the membership list is readable at a glance._

Presentational component showing display name, role and joined date, with an action slot supplied by the page. Component tests using role and label queries.

_Acceptance criteria:_

- Renders all three roles distinctly
- Action slot is absent when no actions are passed
- Own row is identifiable
- No test ids for anything a user can see

**M6.13 — Members page with owner-gated controls** · 2h

_Story 9 — As a workspace member, I want to see who is in the workspace and their roles, so that I know who can read what I write._

`/coven/[slug]/members` listing members and roles. Role controls and the invite action are rendered only for owners. This page is the only route to ownership: invitations cannot grant it, so an owner promotes an existing member here, after they have signed up and can be recognised. Composes the MemberList component and reads through the membersByWorkspace loader, both of which land immediately before it.

_Acceptance criteria:_

- All members can view the list
- Role controls hidden for non-owners and rejected server-side too
- An owner can promote an existing member to owner from this page
- Promotion targets an existing member only, never a pending invitation
- axe scan passes
- Every workspace shows the page, including one with a single member

**M6.14 — Delete a workspace** · 2h

_Story:_ As an owner, I want to delete a workspace I no longer use so that abandoned covens do not clutter my switcher forever.

Owner-only soft delete, with a confirmation naming the workspace and stating what becomes inaccessible — its ingredients and its grimoire. Members lose access immediately. Deletion is soft, so nothing is destroyed and a workspace deleted in error can be restored by hand.

_Acceptance criteria:_

- Only an owner can delete
- Confirmation names the workspace and states what is lost
- Deletion is soft; nothing is destroyed
- All members lose access immediately, including other owners
- Deleted workspaces disappear from the switcher

**M6.15 — Remove member and leave workspace** · 1h

_Story 10 — As a workspace owner, I want to remove a member, and as a member I want to leave, so that membership reflects who is actually involved._

Owner-initiated removal and self-initiated leave, both soft, both subject to the last-owner guard. This task covers the ordinary cases; the blocked last-owner case and its remedy are M6.16.

_Acceptance criteria:_

- Owner can remove a member
- A member can leave without owner action
- Last-owner guard applies to both paths
- Removed user immediately loses access

**M6.16 — Guided exit for the last owner** · 2h

_Story 10 — As the only owner of a workspace I no longer want, I want to be shown how to hand it over or close it, so that I am not left believing I am stuck in it forever._

The last-owner guard in M6.8 is correct and will read as a bug unless the refusal explains itself. Keep the Leave control visible and enabled rather than hidden or greyed out — a disabled control with no explanation is exactly what makes someone conclude they are trapped. On click, offer both ways out, never only one. If other members exist: promote one of them and leave, with a picker and a single action that does both; or delete the workspace entirely, since an owner may simply be done with it and should not have to install a successor to get there. If the owner is the only member, promotion is impossible and deletion is the whole answer. Deletion always routes into the M6.14 confirmation, which already names what becomes inaccessible — that confirmation is what stops 'delete instead' from being a foot-gun when other people's records are in there. Also surface it before it is urgent: the members page shows a quiet note whenever a workspace has exactly one owner, saying that if that person loses access nobody can manage members.

_Acceptance criteria:_

- Leave stays visible and enabled; the explanation comes on click, not as a disabled tooltip
- Both remedies are offered together: hand it over, or delete it entirely
- With other members present, the dialog lists them and offers promote-then-leave as one action
- Deletion is offered in both branches, not only when the owner is the only member
- Deletion routes into the M6.14 confirmation rather than deleting from this dialog
- The deletion option states that other members lose access, before it is chosen
- Neither path can leave a workspace ownerless, and the guard still refuses if the UI is bypassed
- The members page notes when a workspace has exactly one owner
- Wording avoids blame and states the remedies first
- Both paths are keyboard operable and axe clean

**M6.17 — Viewer read-only enforcement across services** · 2h

_Story 12 — As a workspace owner, I want viewers to be unable to change shared records, so that I can share our ingredient records without risking them._

Apply the `member` minimum to every mutating workspace service. With notes deferred to v2 there is no exception: a viewer reads everything in the workspace and writes nothing. As a census task, verify — do not assume — that a folk-name write on a workspace-local ingredient inherits the `member` minimum through its parent ingredient's service, the same way an `ingredient_categories` write does.

_Acceptance criteria:_

- Viewer writes to ingredients and grimoire are rejected
- Viewer reads succeed everywhere within the workspace
- No mutating service accepts a viewer
- Confirmed by test: a folk-name write on a local ingredient inherits the `member` minimum through its parent ingredient's service
- Story 12 acceptance test passes

**M6.18 — Last-edited-by display on ingredient rows** · 1h

_Story 13 — As a workspace member, I want to see who last edited an ingredient and when, so that I know who to ask about a change._

Surface `updatedBy` and `updatedAt` on the row, resolved to display name, formatted relative with an absolute tooltip.

_Acceptance criteria:_

- Row shows who and when
- Display name resolves without an N+1 query
- Absolute timestamp available on hover and to screen readers
- Story 13 acceptance test passes

## M7 — Invitations

_7 tasks · 12 hours_

**Sequencing**

- Depends on M6 membership existing.
- M7.2 (token service) blocks M7.3 through M7.7.
- M7.6 (revoke) lands before M7.7 (rejection), because the rejection path cannot honour a revoked state that does not exist yet.
- Invitations grant viewer or member only. Ownership is granted afterwards by an existing owner on the members page (M6.13), so identity is confirmed before rights are.

### Invitations

**M7.1 — workspace_invitations schema** · 1h

_Story:_ As an owner, I want invitations stored safely so that a leaked database row cannot be redeemed.

Add the table with id, workspaceId, email, role, tokenHash, expiresAt, acceptedAt, acceptedBy, revokedAt and audit columns. Only the hash is stored. The role column accepts `viewer` or `member` only — owner is deliberately not invitable, and the constraint lives in the database so no future code path can widen it by accident.

_Acceptance criteria:_

- No column holds the plaintext token
- A check constraint rejects an invitation with role owner
- Expiry has a sensible default
- Indexed for lookup by token hash
- Full audit spread present

**M7.2 — Token generation and hash-only storage** · 2h

_Story 4 — As a workspace owner, I want an invitation link shown once and stored only as a hash, so that a leaked database row cannot be redeemed._

Service generating an invitation token, storing only its hash, and returning the plaintext exactly once to the caller. Generate it with a CSPRNG — a cryptographically secure pseudorandom number generator, meaning `crypto.randomBytes()` from Node's crypto module, never `Math.random()`. The difference matters: `Math.random()` is a fast, predictable generator, so anyone who collects a few tokens can work out the internal state and compute the next ones. A CSPRNG draws from the operating system's entropy pool and gives no such foothold. Unit tests cover generation, hashing and single-return.

_Acceptance criteria:_

- Token is generated with crypto.randomBytes(), not Math.random()
- Token carries at least 128 bits of entropy
- Only the hash reaches the database
- Plaintext is returned once and is never retrievable afterwards
- Holding one token gives no way to guess another
- CSPRNG is explained once in claude-docs so the next reader need not look it up

**M7.3 — createInvitation mutation returning the URL once** · 2h

_Story 4 — As a workspace owner, I want to generate an invitation link with a chosen role, so that I control what a new member can do before they arrive._

Owner-only mutation returning `InvitationResult` with the invitation and the full URL. The URL appears in that response body and nowhere else. The invitable roles are viewer and member; ownership cannot be granted by link. Someone holding a URL has proved only that they received it, and an invitation can be forwarded, so ownership is granted afterwards by an existing owner on the members page, once there is an identifiable account to point at.

_Acceptance criteria:_

- Only owners can call it
- Role must be viewer or member; owner is rejected with a clear error
- Role is chosen at creation and honoured on acceptance
- URL is absent from any subsequent query
- Any workspace can be invited into, including a user's first one
- Rejection happens at the service, not only in the schema enum

**M7.4 — InviteDialog component** · 2h

_Story 4 — As a workspace owner, I want to copy the invitation link and be told plainly that it will not be shown again, so that I do not lose it silently._

Dialog with role selection, a copy-to-clipboard field, and an unmistakable warning that this is the only time the link is shown. The role selector offers viewer and member only, with a line explaining that ownership is granted after the person joins. Component tests for copy behaviour and the warning.

_Acceptance criteria:_

- Warning is present and visible before the link is dismissed
- Role selector offers viewer and member, and never owner
- Explains in one line where ownership is granted instead
- Copy control works and confirms success
- Link is not re-rendered after the dialog closes
- Focus trap, Escape to close, focus restored, axe clean

**M7.5 — Invitation acceptance page** · 2h

_Story 6 — As an invited person, I want to accept an invitation and land in the workspace, so that joining takes one click and a sign-in._

`/invite/[token]` — reachable unauthenticated, prompting sign-in first if needed, then adding membership at the invited role and redirecting into the workspace. Accepting also sets `canCreateWorkspace`: someone vouched for by an existing member is an established user, and this is the main route through the invite gate.

_Acceptance criteria:_

- Signed-out users can start the flow and complete it after sign-in
- Membership is created at the invited role
- Accepting sets canCreateWorkspace, and the change is audited
- A viewer invitation grants creation rights too — the gate is about the site, not the role
- A tampered token claiming owner is rejected, not honoured
- Redirect lands in the workspace ingredients page
- acceptedAt and acceptedBy are stamped

**M7.6 — Revoke a pending invitation** · 1h

_Story 5 — As a workspace owner, I want to revoke a pending invitation, so that I can undo an invite sent in error._

The owner-facing half: an owner-only mutation stamping revokedAt, plus the list of pending invitations on the members page so there is something to revoke from. This task creates the revoked state; M7.7 is what honours it when someone tries to redeem the link. Already-accepted invitations cannot be revoked — removing that person is a membership action, not an invitation one.

_Acceptance criteria:_

- Owner can revoke a pending invitation
- Revoking an already-accepted invitation is rejected, with a pointer to member removal
- Non-owners cannot revoke
- Pending invitations are listed on the members page with their role and expiry
- revokedAt is stamped and the row is retained for audit

**M7.7 — Reject expired, revoked and reused tokens** · 2h

_Story 7 — As a workspace owner, I want expired, revoked and already-used links rejected, so that an old link in someone's inbox is not a way in._

The redeemer-facing half: everything that can make a link unusable, checked in one place on the acceptance path. Three separate conditions, three distinct messages — expired (the clock ran out), revoked (the owner withdrew it, the state M7.6 creates), and already accepted (someone used it). One generic 'invalid link' would leave the recipient unable to tell whether to ask for a new invitation or check whether they are already a member. Messages must not name the workspace, since the reader is by definition not a member of it.

_Acceptance criteria:_

- Expired token rejected, with a message saying so
- Revoked token rejected, distinctly from expired
- Already-accepted token rejected, distinctly from both
- A token that is both expired and revoked reports one reason, deterministically
- No message reveals the workspace name to a non-member
- Story 7 acceptance test passes

## M8 — Compendium browsing and local ingredients

_20 tasks · 37 hours_

**Sequencing**

- Depends on M4 schema, M5 services and M3 GraphQL.
- M8.4 (filterIngredients) blocks the search UI in M8.9 through M8.12.
- Build IngredientSearch composable with an action slot the first time.
- M8.7 (revalidateTag on admin mutations) closes the loop on M5: it cannot land until caching exists in M8.6.
- IngredientSearch is reused by the workspace ingredients page in M9 and the spell builder in M10.

### Services and search

**M8.1 — Acceptance test scaffold for stories 14–16** · 2h

_Stories 14–16 — As a developer, I want the compendium browsing stories expressed as failing tests before implementation, so that done is measured against the specification._

Create `tests/acceptance/02-compendium.test.ts` with failing tests naming stories 14 through 16. Stories 17 and 18 are covered by the admin scaffold in M5.1; story 19 by the workspace isolation tests in M6.6.

_Acceptance criteria:_

- Three failing tests, one per story
- Each names its story number and text
- No overlap with the admin or workspace scaffolds
- make test-stories reports them

**M8.2 — Workspace-local ingredient service** · 2h

_Story 15 — As a workspace member, I want to create an ingredient local to my workspace when the compendium lacks it, so that my practice is not limited to someone else's list._

Create, update and read local ingredients scoped by workspaceId, writable by owners and members. Invisible to every other workspace. Writing an ingredient — including its folk names — happens inside one `withAudit` transaction, so a folk name is never written or updated independently of its parent row.

_Acceptance criteria:_

- Owners and members can create; viewers cannot
- A local ingredient is unreadable from another workspace, including by direct id
- No path promotes a local ingredient to global
- Creating or updating an ingredient's folk names happens inside the same `withAudit` transaction as the ingredient write
- Story 15 acceptance test passes

**M8.3 — Local-beats-compendium name resolution** · 2h

_Story:_ As a user who disagrees with an admin's correspondences, I want my own version to win in my workspace so that curation does not override my practice.

A compendium row is suppressed in a workspace's results when a non-deleted local row in that workspace matches it on `canonicalKey`, **or — only when the local row declares no formal name — on the display label**, case-insensitively. Implemented as a single SQL anti-join (`NOT EXISTS`), never fetch-then-filter in the resolver. The `canonicalName IS NULL` gate is the crux: a local that declared an identity must not suppress a differently-identified compendium row for merely sharing a label, while a local that declared nothing has only its label to go on.

_Acceptance criteria:_

- A local with no formal name ("Mugwort") suppresses a compendium entry sharing its label ("Mugwort / _A. vulgaris_")
- A local with a different label but the same identity ("Cronewort / _A. vulgaris_") suppresses the compendium entry sharing that identity ("Mugwort / _A. vulgaris_")
- A local and a compendium entry sharing a label but declaring different identities ("Mugwort / _A. vulgaris_" vs. "Mugwort / _A. absinthium_") are **both shown**
- A `none` local suppresses only a `none` compendium row with the identical label
- A single unidentified local "Cat's Claw" suppresses all four Cat's Claw compendium rows — over-suppression, and exactly the case M4.7/M5.10 warn about before the stub is created
- Other workspaces still see every compendium entry
- The badge distinguishes local from compendium
- Two locals in one workspace may not share a name
- Suppression is a single SQL anti-join, not a fetch-then-filter in the resolver

**M8.3a — Promote a folk name to the display name** · 2h

_Story:_ As a workspace member, I want to promote a common name to an ingredient's display name, so that the label I see matches what I actually call it.

One server-side transaction swapping `ingredients.name` with an `ingredient_folk_names` row: the old display name becomes a folk name exactly once and the promoted one leaves the folk names, deduped case-insensitively. Depends on M8.3's identity rule. Carries the display-name requirement, which no existing task owns.

_Acceptance criteria:_

- One server-side transaction; no client round-trip of the folk-name list
- The old name becomes a folk name exactly once; the promoted name leaves the folk names
- Deduplication is case-insensitive
- `canonicalKey` is unchanged for a row that declares a formal name
- For a row with no formal name (`none`), the key changes, and a collision surfaces as a readable error naming the other entry
- Admins may promote on compendium rows; owners and members on local rows; viewers are `Forbidden`
- A compendium swap is global, and the UI states that

**M8.4 — filterIngredients() library function** · 2h

_Story 21 — As a workspace member, I want to search by name or folk name, so that I can find Devil's Shoestring without remembering it is honeysuckle root._

Pure function handling name, folk-name and formal-name matching, AND versus OR across categories, case and accent insensitivity, and empty query returning all. Heaviest unit coverage in the project.

_Acceptance criteria:_

- Matches on folk names and the formal name as well as the display name
- AND is the default across categories; OR is opt-in
- Accent and case insensitive
- Empty query returns everything
- No database access — pure function

**M8.5 — compendium and ingredient GraphQL queries** · 2h

_Story 14 — As a workspace member, I want to browse the compendium, so that I can add shared entries to my own ingredients._

Add both queries with search, categoryIds and `form` arguments, delegating to services. `Ingredient` gains `canonicalName`, `nomenclature` and `folkNames`; `form` becomes a `String` argument rather than the retired `Form` enum. Add an `ingredientFormValues` query returning `IngredientFormValue`, the curated-vocabulary type — named apart from the `IngredientForm` React component (M5.9/M5.10) so the two cannot be confused. Categories and folk names resolve through DataLoaders. The M3.4 SDL snapshot moves to cover the new shape.

_Acceptance criteria:_

- Both queries return correct results for each argument combination
- Resolvers contain no database access
- `Ingredient` exposes `canonicalName`, `nomenclature` and `folkNames`
- `form` is a `String` argument, not the retired `Form` enum
- `ingredientFormValues` query returns the curated vocabulary as `IngredientFormValue`
- Category and folk-name resolution are both batched
- List query paginates through the M3.6 helper, with its default and maximum
- The M3.4 SDL snapshot is updated for the new shape

**M8.6 — Cache the compendium with tag invalidation** · 2h

_Story:_ As an operator, I want the compendium served from cache so that the most-read data on the site does not hit Postgres on every page.

Wrap the compendium and category reads in `unstable_cache` with the `compendium` tag and an hour's revalidation. Viewer-independent data only — never cache anything workspace-scoped. The `ingredient_forms` vocabulary is viewer-independent too, and caches under this same `compendium` tag rather than a new one.

_Acceptance criteria:_

- Repeat reads do not hit Postgres
- Only viewer-independent data is cached
- `ingredientFormValues` reads are cached under the same `compendium` tag
- Tag name is a shared constant, not a literal
- Cache is bypassed correctly in tests

**M8.7 — Fire revalidateTag on admin mutations** · 1h

_Story:_ As a user, I want compendium edits to appear promptly so that the cache does not serve me an admin's outdated correspondences for an hour.

Call `revalidateTag('compendium', { expire: 0 })` after every admin mutation touching ingredients, categories or the form vocabulary. Two arguments, not one: Next 16 deprecated the single-argument form into a type error, and `{ expire: 0 }` rather than the generally-recommended `'max'` because an admin must see their own edit on the next read. `updateTag` is the call that would normally serve that, and it throws outside a Server Action — see DESIGN.md §7.

_Acceptance criteria:_

- An admin edit is visible on the next page load
- Tag constant is shared, not a string literal per call site
- Every admin mutation path is covered, including every `ingredient_forms` mutation

**M8.8 — createWorkspaceIngredient and updateIngredient mutations** · 2h

_Stories 15 and 34 — As a workspace member, I want my edits saved and reflected in the list immediately, so that I can trust what I am looking at._

Both mutations delegating to services, with Zod validation and audit stamping. Return the updated entity for cache reconciliation. Folk-name child rows are written in the same `withAudit` transaction as the ingredient itself, not a separate round trip.

_Acceptance criteria:_

- A Zod failure leaves as MB.43's `VALIDATION` error carrying `fieldErrors`, one entry per issue with its path preserved — the shape M5.9's form reads back into its own error elements
- Audit columns stamped from the session
- Returned entity lets the client update without a refetch
- Folk-name writes are transactional with the ingredient write, not a separate round trip
- Viewers are rejected

### Search UI

**M8.9 — Acceptance test scaffold for stories 28–34** · 2h

_Stories 28–34 — As a developer, I want the add and edit modal stories expressed as failing tests before implementation, so that the form's behaviour is specified rather than discovered._

Create `tests/acceptance/04-modals.test.tsx` with failing tests naming each of stories 28 through 34.

_Acceptance criteria:_

- Seven failing tests, one per story
- Each names its story number and text
- make test-stories reports them

**M8.10 — IngredientSearch — debounced text matching** · 2h

_Story 21 — As a workspace member, I want to type a name or folk name and see the list narrow, so that finding something is faster than scrolling._

The search component's text input, debounced, matching name, folk names and the formal name via `filterIngredients()`. Shared later by compendium, workspace ingredients and spell builder.

_Acceptance criteria:_

- Typing filters results after the debounce, not on every keystroke
- Folk names and the formal name match
- Debounce tested with fake timers
- Clear control resets the query

**M8.11 — IngredientSearch — grouped category chips** · 2h

_Stories 22 and 30 — As a workspace member, I want to filter by several categories from grouped chips, so that I can narrow 63 categories on a phone without scrolling forever._

Multi-select chips grouped by each category's `groupId`, groups alphabetical by name, collapsible by group so 52 chips are usable on a phone. AND semantics by default. **Groups come from the database, not a constant** (MB.35) — an admin may have added a ninth, and a hard-coded list would silently drop every category in it.

_Acceptance criteria:_

- Chips are grouped and each group collapses
- Sections render alphabetically by group name, and a group added after seed appears without a code change
- Each chip wears its group's stored colour for the active theme through MB.36's mixin, not a `.chip--<slug>` class
- Multiple selections combine with AND
- Selected state is visually and programmatically distinguishable
- Usable at a 375px viewport, axe clean

**M8.12 — IngredientSearch — OR toggle** · 1h

_Story 22 — As a workspace member, I want to combine categories with 'any' as well as 'all', so that I can search broadly when nothing matches every term._

Toggle switching category combination between AND and OR, with a label that makes the current mode obvious.

_Acceptance criteria:_

- Toggle switches modes and results update
- Current mode is announced to assistive technology
- Mode persists in URL state

**M8.13 — IngredientSearch — secondary filters and URL state** · 2h

_Story 27 — As a workspace member, I want to filter to only our own ingredients or only compendium ones, so that I can review what we have added ourselves._

Form and element filters, plus the URL-state mechanism every other filter chip plugs into. All filter state lives in the URL query string so a filtered view is shareable and survives reload. Source (local versus compendium) and in-stock-only are **not** here — both need M9 data, so M9.7 owns source and M9.8 owns stock, each adopting this task’s URL-state mechanism. The form filter’s options come from the curated `ingredient_forms` vocabulary plus in-use values outside it, not a fixed chip set — `element` stays a fixed enum.

_Acceptance criteria:_

- Every filter is reflected in the URL
- Reloading restores the exact view
- Back button steps through filter changes
- Filters combine correctly with search text
- Form filter options are drawn from the curated vocabulary plus in-use values outside it, not a hardcoded list
- The URL-state mechanism is reusable by a filter this task does not itself define

**M8.13a — SafetyNote component for ingredient caution text** · 1h

_Stories 23 and 53 — As a workspace member, I want an ingredient's caution text set apart from ordinary description copy, so that I notice a safety warning instead of skimming past it._

Standalone presentational component (`src/components/SafetyNote/`) rendering `safetyNotes` as a labelled caution block — border-accent treatment with a CAUTION kicker, per the M0.6 palette decision's `.safety` styling. Extracted as its own component because three call sites need the identical treatment: the card badge (M8.14), the detail page's safety-notes field (M8.19), and the spell-builder toxic-ingredient warning (M10.18). Without it, each would restyle the same warning independently. **This task owns safety presentation for the whole project.**

_Acceptance criteria:_

- Renders nothing when safetyNotes is empty or absent
- Meaning conveyed by text and a caution label, not colour alone
- Semantic markup so assistive tech announces it as distinct from surrounding body text
- axe clean, keyboard reachable
- `index.stories.tsx` present per component convention
- Adopted by M8.14, M8.19 and M10.18 in place of any ad hoc safety-note rendering

**M8.14 — IngredientCard with safety and low-stock badges** · 2h

_Stories 23 and 53 — As a workspace member, I want stock and safety flagged on the card, so that I notice a toxic ingredient or an empty jar without opening it._

Card shell composing the safety and stock treatments the two tasks before it own: `SafetyNote` from M8.13a for the caution block, and M9.8’s low and out-of-stock badges. This task owns the card layout and nothing else — it must not restyle either treatment. Badges convey meaning by text and shape, not colour alone. The card also renders the formal name and form as a secondary line beneath the display label — required, not decorative, now that two rows can share a label — and lists sort on `(lower(name), canonical_key, id)` so identically labelled rows keep a stable, disambiguating order.

_Acceptance criteria:_

- The card renders M8.13a’s SafetyNote when safetyNotes is present, unmodified
- The card renders M9.8’s stock badges, unmodified
- No safety or stock styling is redefined in this component
- The formal name and form render as a secondary line beneath the display label
- Lists sort on `(lower(name), canonical_key, id)`, so identically labelled rows keep a stable order
- Meaning does not depend on colour alone
- axe clean, keyboard reachable

### Modals and pages

**M8.15 — IngredientForm — read-only mode for compendium entries** · 1h

_Story 17 — As a workspace member, I want compendium entries shown as read-only with a reason, so that I understand why I cannot edit rather than assuming it is broken._

Render fields read-only for non-admins viewing a compendium entry, with an explanation rather than disabled controls that look broken.

_Acceptance criteria:_

- Non-admin sees read-only fields and a reason
- Admin sees the editable form
- Read-only state is conveyed to assistive technology

**M8.16 — AddIngredientModal** · 2h

_Story 28 — As a workspace member, I want to open the add form from anywhere via the nav, so that recording something does not cost me my place._

Modal wrapper around IngredientForm, reachable from the main nav on any page. Focus trap, Escape to close, focus restored to the trigger. Closing with unsaved input warns first, matching the edit modal in M8.17 — a half-filled new ingredient is as easy to lose as an edit, and losing it to a stray Escape key is worse because there is nothing to go back to.

_Acceptance criteria:_

- Opens from nav on every page
- Focus is trapped while open and restored on close
- Submit payload matches the schema
- axe scan passes with the modal open
- Closing with unsaved input prompts before discarding
- Escape and the close control both route through the same prompt
- Closing an untouched form does not prompt

**M8.17 — EditIngredientModal with dirty-discard warning** · 2h

_Stories 32 and 33 — As a workspace member, I want the edit form pre-filled and a warning before discarding changes, so that I do not lose work by closing a dialog._

Modal pre-populated from the selected ingredient, reachable from the nav picker and from a row. Warn before discarding unsaved edits.

_Acceptance criteria:_

- Fields pre-populate correctly
- Closing with unsaved changes prompts first
- Closing with no changes does not prompt
- Reachable from both entry points
- Story 34: the list reflects the edit immediately on save

**M8.18 — Compendium page** · 2h

_Story 14 — As a workspace member, I want a browsable compendium page, so that I can find shared entries and add them to my ingredients._

`/compendium` composing IngredientSearch with an Add to my ingredients action slot. Read-only for non-admins. Server-rendered with the cached data. Cards disambiguate two compendium entries sharing a label via M8.14's secondary line.

_Acceptance criteria:_

- Search, filters and chips all function
- Add to my ingredients is present for members, absent for viewers
- Page is server-rendered and uses the cached compendium
- Two entries sharing a label are visibly distinguished on the page
- axe clean, usable at 375px

**M8.19 — Ingredient detail page shell** · 2h

_Story:_ As a user, I want a page per ingredient so that correspondences have a permanent home I can link to.

`/ingredients/[id]` showing every correspondence field, safety notes and substitutes. Built so a notes section can be added below without restructuring the page, since notes are the first thing planned for v2. The formal name, nomenclature and form render beside the display label, with a deliberate empty state for entries still `none` or `unknown` rather than a blank field.

_Acceptance criteria:_

- All properties rendered with sensible empty states
- Works for both compendium and local ingredients
- Local entries are badged
- A `none`/`unknown` entry shows a deliberate empty state for its formal name, not a blank field
- Empty states read as intentional, not broken

## M9 — Workspace ingredients

_12 tasks · 19 hours_

**Sequencing**

- Depends on M4 ingredients and M6 workspaces existing.
- M9.2 (schema) blocks the rest of the milestone.
- M9.8 (stock badges) depends on the lowStockThreshold column and the unit dimensions added in M9.2.
- Units live in one shared module owning the unit-to-dimension map. M9.2, M9.5 and M9.8 all import it rather than each keeping a list.
- Compendium entries carry no stock. An ingredient only gains a quantity when a workspace adds it, which creates a row in inventory_items scoped to that workspace (M9.2).

### Workspace ingredients

**M9.1 — Acceptance test scaffold for stories 20–27** · 2h

_Stories 20–27 — As a developer, I want the workspace ingredient stories expressed as failing tests before implementation, so that stock behaviour is specified rather than discovered._

Create `tests/acceptance/03-ingredients.test.ts` with failing tests naming each of stories 20 through 27.

_Acceptance criteria:_

- Eight failing tests, one per story
- Each names its story number and text
- make test-stories reports them

**M9.2 — inventory_items schema** · 1h

_Story 20 — As a workspace member, I want our ingredients and quantities recorded, so that I can see everything we hold in one list._

Add the table with workspaceId, ingredientId, quantityOnHand, unit, unitDimension, lowStockThreshold, source, acquiredDate and audit. Unique on (workspaceId, ingredientId) where not deleted. Units cover three dimensions, metric and imperial in each: weight — mg, g, kg, oz, lb; volume — ml, l, tsp, tbsp, fl oz, cup; count — piece, drop, pinch. Store the dimension alongside the unit rather than deriving it at every call site, so a query can filter or group by it and M9.5 has something to check against. One shared module owns the unit-to-dimension map and both the Zod schema and the conversion library import it, so the list cannot drift in two places.

_Acceptance criteria:_

- A workspace cannot hold two stock rows for one ingredient
- Re-adding after soft delete succeeds
- Unit enum covers weight, volume and count, metric and imperial
- unitDimension is stored and always consistent with the unit
- A row whose dimension contradicts its unit cannot be written
- Adding a unit means editing one module, not three
- Audit spread present

**M9.3 — Workspace ingredients service with authorization tests** · 2h

_Story 12 — As a workspace owner, I want members to change stock and viewers only to read it, so that stock records match who is responsible for them._

CRUD service scoped by workspace, going through assertMembership and withAudit. Tests cover each fixture user against each operation.

_Acceptance criteria:_

- Members can add, update and delete stock
- Viewers are rejected on writes and permitted on reads
- D cannot touch W's stock by direct id
- Admin E has no access

**M9.4 — workspace ingredients query and stock mutations** · 2h

_Story 14 — As a workspace member, I want to add a compendium entry to our ingredients, so that I do not re-type what is already described._

Add the `workspaceIngredients` query and `addIngredientToWorkspace` plus stock update mutations, delegating to services with batched ingredient and category resolution. The Ingredient list paginates through the M3.6 helper.

_Acceptance criteria:_

- Query supports search and category filters
- addIngredientToWorkspace is idempotent against an existing row
- Ingredient and category resolution is batched
- Mutations return the updated item
- Ingredient list paginates through the M3.6 helper, not an unbounded fetch
- Stock input is parsed with M4.5's `StockInput` schema; a negative quantity or threshold is refused with a message and a field path, never written

**M9.5 — unitConvert() within a single dimension** · 2h

_Story 24 — As a workspace member, I want quantities compared across units of the same kind, so that a recipe in teaspoons can be checked against a jar measured in millilitres._

Pure function converting only within one dimension: weight to weight, volume to volume. Cross-dimension conversion is refused outright rather than attempted — grams to teaspoons depends on what is being measured, and a wrong answer here silently doubles or halves an ingredient in a working. Count converts to nothing at all; three pinches is not a quantity of millilitres. The refusal is an explicit result the caller must handle, never a null or a best guess.

_Acceptance criteria:_

- Weight to weight and volume to volume convert exactly, to a defined precision
- Weight to volume is refused, in both directions
- Any conversion involving count is refused
- Refusal is a distinguishable result the caller must handle, not null or NaN
- Round-tripping a value returns the original within the defined precision
- No density table exists anywhere in the codebase
- Unit tested across every pair within each dimension, and a sample of refused pairs

**M9.6 — Workspace ingredients page** · 2h

_Story 20 — As a workspace member, I want one page listing everything we hold, so that I do not have to look in two places._

`/coven/[slug]/ingredients` — one page covering both local ingredients and compendium-sourced stock, composing IngredientSearch with an edit/delete action slot. No structural change from the identity model — it inherits M8.14's formal-name/form disambiguation and sort order through the composed `IngredientCard`, deliberately rather than by accident.

_Acceptance criteria:_

- Lists local and compendium-sourced entries together
- Search and filters function identically to the compendium page
- Server-rendered shell, no workspace data cached across requests
- axe clean, usable at 375px

**M9.7 — Local versus compendium filter chip** · 1h

_Story 27 — As a workspace member, I want to filter my ingredients by where an entry came from, so that I can review what we added ourselves._

Filter chip distinguishing the two sources, plus the in-stock-only filter, both reflected in URL state through the mechanism M8.13 builds. This task owns source and stock filtering because both need M9 data; M8.13 owns form and element and the URL-state mechanism itself. This is what makes one page correct rather than two. No structural change from the identity model — it inherits M8.14's disambiguation the same way M9.6 does.

_Acceptance criteria:_

- Three states: all, local only, compendium only
- In-stock-only filters against M9.2’s quantities
- Both reflected in the URL, through M8.13’s mechanism rather than a second one
- Local entries are badged in every state
- Story 27 acceptance test passes

**M9.8 — Low and out-of-stock badges with a sensible default threshold** · 1h

_Story 23 — As a workspace member, I want low and empty stock flagged, so that I know what to replace before I start a working._

Compare quantityOnHand against lowStockThreshold and render the appropriate badge, with a filter for low stock. Nobody wants to set a threshold on every one of two hundred jars, so supply one at add time by dimension: 3 for count, 10 g for weight, 15 ml for volume, converted into whatever unit the row uses. A flat number across dimensions would be useless — 5 is a reasonable count of candles and an invisible quantity of dried herb. Write the default onto the row when it is created rather than leaving the column null and applying a constant at read time: it stays visible and editable, and changing the constant later does not silently reinterpret every existing row.

_Acceptance criteria:_

- Low stock triggers at or below the threshold
- Zero renders as out of stock, distinctly from low
- A new row gets a dimension-appropriate default without the member choosing one
- The default is written to the row, not applied at read time
- The threshold is visible and editable on the row
- Setting a threshold of zero disables the warning rather than meaning 'always low'
- Meaning does not depend on colour alone
- Story 23 acceptance test passes

**M9.9 — Inline row editing** · 2h

_Story 24 — As a workspace member, I want to edit quantities from the row, so that updating stock after a working takes seconds._

Edit quantity, unit and threshold in place, with optimistic update and rollback on failure.

_Acceptance criteria:_

- Edit and save without navigation
- Failed save rolls back and explains why
- Keyboard operable end to end
- Story 24 acceptance test passes

**M9.10 — Soft delete with confirmation** · 1h

_Story 25 — As a workspace member, I want deletion to ask first and be recoverable, so that a mis-tap does not lose a record._

Confirmation dialog naming the item, then a soft delete that removes it from the list immediately.

_Acceptance criteria:_

- Confirmation names the specific item
- Cancel leaves everything unchanged
- Row disappears without a full page reload
- Record is soft-deleted, not removed

**M9.11 — Empty state** · 1h

_Story 26 — As a new workspace member, I want an empty ingredient list to prompt my first addition, so that I know what to do next._

Distinguish a genuinely empty ingredient list from a filtered-to-nothing view — the first offers an add action, the second offers to clear filters.

_Acceptance criteria:_

- An empty ingredient list prompts the first add
- No-results-from-filters offers to clear them
- The two states are not confused
- Story 26 acceptance test passes

**M9.12 — Add-from-compendium flow** · 2h

_Story 14 — As a workspace member, I want to add a compendium entry to our ingredients with a quantity, so that browsing leads directly to a stocked item._

Wire the compendium page's action slot to addIngredientToWorkspace, with quantity and unit capture and a confirmation that links to the new ingredient row.

_Acceptance criteria:_

- Adding from the compendium creates the stock row
- Adding something already held is handled gracefully
- Confirmation links through to the ingredient list
- Story 14 acceptance test passes

## M10 — Grimoire

_22 tasks · 37 hours_

**Sequencing**

- Schema first is true only within this milestone. Across the project M10.2 and M10.4 land in Wave 3 with the rest of the tables, and M10.3 waits for Wave 5 with the rest of the policies. Visibility is a column and a policy, not a filter added later — but the column and the policy do not have to ship together, and here they deliberately do not.
- M10.6 (visibility rules) blocks M10.9, M10.11 and M10.13. Every list, search and page must filter in SQL, never after fetching.
- M10.7 and M10.8 (pure comparison functions) block the comparison panel in M10.17.
- M10.15 reuses IngredientSearch from M8. If it needs changes, change it there rather than forking it.

### Grimoire data layer

**M10.1 — Acceptance test scaffold for stories 47–57** · 2h

_Stories 47–57 — As a developer, I want the grimoire stories expressed as failing tests before implementation, so that spell behaviour is specified rather than discovered._

Create `tests/acceptance/06-grimoire.test.ts` with failing tests naming each of stories 47 through 57 — 57 being MB.40's custom, one-off ingredient.

_Acceptance criteria:_

- Eleven failing tests, one per story
- Each names its story number and text
- make test-stories reports them

**M10.2 — spells and spell_ingredients schema** · 2h

_Stories 47 and 50 — As a workspace member, I want a spell recorded with its intent and its ingredients, so that I can repeat a working exactly._

Add `spells` (workspaceId, title, intent, jarSize, sealWaxColor, moonPhase, dayOfWeek, instructions, status draft|complete, `...auditColumns`) and `spell_ingredients` (spellId, ingredientId, quantity, unit, layerOrder, note, `...auditStampColumns`). The join references the ingredient, not the inventory item, so a saved spell survives running out. `spell_ingredients` is hard-deleted per MB.34 — a composite primary key, no `deleted_at`, and no rule-4 partial index — while `spells` itself keeps the full six-column spread.

**Superseded in part by MB.40**, which reshaped `spell_ingredients` after this task merged: the primary key is `(spell_id, layer_order)` rather than `(spell_id, ingredient_id)`, `ingredient_id` is nullable, and `name`/`form` carry a custom, one-off ingredient, with the one-ingredient-per-jar guarantee moved onto a partial unique index. The migration this task shipped (`0014`) is unchanged; `0017` is the contract. The criteria below read as MB.40 left them.

_Acceptance criteria:_

- Migration applies cleanly
- spell_ingredients references ingredients, not inventory_items
- `spells` carries `...auditColumns`; `spell_ingredients` carries `...auditStampColumns` and a composite primary key — on `(spell_id, ingredient_id)` as shipped, on `(spell_id, layer_order)` since MB.40 — with no delete columns
- layerOrder is stored and unique within a spell
- status accepts only draft and complete in v1

**M10.3 — Spell visibility column and the service rule** · 1h

_Story:_ As a workspace member, I want to keep a spell to myself, so that I can record a working that is nobody else's business without leaving the workspace.

Add `visibility` (`private` | `workspace`) to spells, defaulting to workspace, and filter private spells to their author in the finder — in SQL, under rule 7, so a private spell never reaches a resolver.

**Re-scoped by MB.29.** MB.24 had left this task half policy; with RLS deferred it is the column plus the service rule, and the filtering happens where every other workspace-scoped predicate now happens — inside the finder, which already takes M6.3's `Membership` and ANDs its own `workspace_id` clause. The author id joins the proof as an argument rather than arriving through a session variable.

The MB.24 finding it keeps: `spell_ingredients` and `spell_categories` reach their spell by FK and carry no `workspace_id` of their own. Whatever this task does to `spells`, a private spell's _ingredients_ must not remain readable through the join tables, or the visibility rule holds for the spell and leaks its contents. Those two tables cannot self-scope, so their finders load the parent spell under the proof and derive visibility from it — the gap CLAUDE.md rule 5 names, closed here by test rather than by the type.

_Acceptance criteria:_

- Column added with a default of workspace and no nulls
- The spell finder admits a private spell only to its author, filtering in SQL rather than after fetching
- A private spell's rows in `spell_ingredients` and `spell_categories` are refused to everyone but its author — **by direct id**, not merely absent from a list
- Each denial test asserts why the read could have succeeded: the row exists, the fixture is populated, and the same call as the author returns it
- Widening `private → workspace` is allowed and `workspace → private` is refused with an explaining error, not a bare `Forbidden` (the service half of M10.6's rule)
- Existing seeded spells migrate to workspace visibility
- The PR carries the M1.5 destructive-DDL acknowledgement line: this adds NOT NULL to a table that now holds seeded rows

**M10.4 — spell_categories join table** · 1h

_Story 48 — As a workspace member, I want to assign categories describing what a spell is meant to do, so that intent is recorded alongside contents._

Join table mirroring ingredient_categories, with the audit stamp columns and both-direction indexes. Hard-deleted per MB.34, in the same shape M4.4 set: `...auditStampColumns`, a composite primary key, no `deleted_at` and no partial index.

_Acceptance criteria:_

- Composite primary key on `(spell_id, category_id)` prevents duplicates
- Indexed both ways
- Carries `...auditStampColumns` and no delete columns
- A removed assignment is deleted outright and can be re-added

**M10.5 — Spell service with member and viewer rules** · 2h

_Story 56 — As a workspace member including a viewer, I want to read every spell in the grimoire, so that shared knowledge is actually shared._

Owners and members create and edit; viewers read and never write. Spells carry a visibility of `private` or `workspace`: a private spell is readable only by its author, a workspace spell by every member including viewers.

_Acceptance criteria:_

- Members and owners can create and edit
- Viewers can read workspace spells and create nothing, including private spells
- A private spell is invisible to every other member, including owners
- D cannot read W's spells by direct id at either visibility
- A custom, one-off ingredient row (MB.40) is readable and writable exactly when its spell is — it has no scope of its own, and the finder derives its visibility from the parent spell the same way it does for a linked row
- Story 56 acceptance test passes

**M10.6 — resolveSpellVisibility() and the one-way rule** · 2h

_Story:_ As a workspace member, I want a spell I shared to stay shared, so that nobody can quietly withdraw something the rest of us have been working from.

Pure function deciding who may read a spell, plus the transition rule: private may be widened to workspace, and workspace may never be narrowed to private. The asymmetry is deliberate. Once a spell is part of the shared grimoire the others have read it, may have built on it, and hiding it afterwards would remove something they were relying on while pretending it never existed. Widening is a gift and narrowing is a retraction, so only one of them is allowed. Exhaustively unit tested, both the read decision and every transition.

_Acceptance criteria:_

- Every combination of viewer relationship and visibility is tested
- Private resolves to the author only, including against owners
- private to workspace is permitted
- workspace to private is rejected with an error that explains why, not a bare Forbidden
- The rule is enforced in the service, not only absent from the UI
- Deleting a shared spell is still possible — this rule governs visibility, not existence
- No database access; pure function

**M10.7 — summarizeSpellCategories()** · 1h

_Story 52 precondition — As a workspace member, I want the categories of a spell's ingredients gathered into one set, so that I can compare what is in the jar against what I intended._

Pure function returning the deduped union of categories across a spell's ingredients. Unit tested including empty and duplicate cases.

_Acceptance criteria:_

- Union is deduped
- Empty ingredient list returns empty
- A custom, one-off ingredient (MB.40) contributes no categories: rows with no `ingredient_id` are skipped, and a jar of only custom rows returns empty — asserted, not assumed
- Order is stable
- No database access

**M10.8 — compareSpellCategories()** · 2h

_Story 52 — As a workspace member, I want gaps shown in both directions between intent and ingredients, so that I can see what is missing and what I did not plan for._

Pure function returning intended-not-present and present-not-intended. These are two distinct concepts and conflating them would be a bug.

_Acceptance criteria:_

- Intent categories with no ingredient backing are reported
- Ingredient categories outside the stated intent are reported
- Both empty when the sets match
- Unit tested in both directions

**M10.9 — grimoire and spell queries with derived fields** · 2h

_Story 52 — As a workspace member, I want the comparison available from the API, so that it is computed once rather than reimplemented in each view._

Add the queries exposing categories, derivedCategories and categoryGaps, with batched ingredient and category resolution. The grimoire list paginates through the M3.6 helper. Visibility filtering happens in the query, not after fetching. Fetching every spell and dropping the private ones in the resolver is the trap here: it is invisible in the response and wrong only when someone inspects the rows the resolver actually loaded, which is why a private spell must never reach the resolver in the first place.

_Acceptance criteria:_

- derivedCategories computed from the linked ingredients; a custom, one-off row (MB.40) contributes none
- categoryGaps reports both directions
- Resolution is batched, asserted by query count
- Resolvers contain no database access
- Grimoire list paginates through the M3.6 helper, not an unbounded fetch
- Private spells are excluded in SQL, never fetched and filtered in the resolver

**M10.10 — createSpell and updateSpell mutations** · 2h

_Stories 47, 50 and 55 — As a workspace member, I want to create a spell, add ingredients and save it as a draft, so that I can build it over more than one sitting._

Both mutations with Zod validation, ingredient list handling and layer order assignment.

_Acceptance criteria:_

- A spell can be created with only a title
- Ingredients can be added and removed in one update
- A layer is added as either an `ingredientId` or a `{ name, form }` (MB.40); one carrying both or neither is rejected by MB.8's schema before the table's CHECK ever sees it
- layerOrder is assigned and preserved
- Viewers are rejected

### Grimoire UI

**M10.11 — Grimoire list page** · 2h

_Story 56 — As a workspace member, I want to browse our spells, so that I can find and reuse past workings._

`/coven/[slug]/grimoire` listing spells with title, intent, status and category chips. Searchable by title and intent text, and filterable by category and status. A grimoire is the thing you go back to, so finding a spell from six months ago by half-remembering its name is the primary use of this page, not browsing.

_Acceptance criteria:_

- Every spell in the workspace is listed for every member
- Search matches title and intent text, debounced
- Search combines with category and status filters rather than replacing them
- Draft and complete are visually distinct
- Search and filters persist in the URL
- axe clean, usable at 375px
- List is paginated; a workspace with hundreds of spells does not render them all
- Search, filters and pagination all respect visibility; a private spell never appears in another member's count or page

**M10.12 — SpellBuilder — title, intent and jar fields** · 2h

_Story 47 — As a workspace member, I want to name a spell and state its intent, so that I know what it was for months later._

`/coven/[slug]/grimoire/new` with the spell-level fields: title, intent, jarSize, sealWaxColor, moonPhase, dayOfWeek, instructions.

_Acceptance criteria:_

- Only title is required
- All jar fields are editable and persist
- Validation errors appear inline, from both sources as in M5.9 — the resolver's before submit, MB.43's `fieldErrors` after, through the same element
- Story 47 acceptance test passes

**M10.13 — Visibility control in the spell builder** · 2h

_Story:_ As a workspace member, I want to choose whether a spell is mine or ours while I build it, so that I decide before anyone has seen it rather than afterwards.

Visibility control on the builder, defaulting to workspace. Private spells are badged in the grimoire list so the author can tell at a glance which of their spells the others can see. Once a spell is workspace-visible the control becomes read-only with a line explaining that sharing is permanent — better stated plainly than discovered by a rejected mutation.

_Acceptance criteria:_

- Visibility is set at creation and defaults to workspace
- A private spell can be shared to the workspace in one action, with confirmation
- A workspace spell shows the control as read-only, with the reason
- Private spells are badged in the grimoire list for their author
- The badge is not colour-only
- Attempting to narrow through the API is still rejected, per M10.6

**M10.14 — SpellBuilder — assign intent categories** · 2h

_Story 48 — As a workspace member, I want to tag a spell with intent categories, so that I can find it by purpose._

Grouped category chips reused from IngredientSearch, bound to the spell's own categories rather than a filter.

_Acceptance criteria:_

- Chips select and deselect spell categories
- Grouping and collapsing behave as on the search component
- Selections persist on save
- Story 48 acceptance test passes

**M10.15 — SpellBuilder — add and remove ingredients** · 2h

_Stories 49 and 50 — As a workspace member, I want the same search controls as my ingredients page and to add ingredients with a quantity, so that building a spell uses tools I already know._

Compose IngredientSearch with an Add to jar action slot, plus quantity and unit capture per ingredient and a remove control. Beside the search results, a custom-ingredient entry takes a name and a form for something the workspace will never stock (MB.40, story 57) — it goes into the jar and nowhere else, creating neither an ingredients row nor a stock row.

_Acceptance criteria:_

- Search behaves identically to the workspace ingredients page
- Quantity and unit are captured per ingredient
- A custom ingredient can be added by name and form, and the workspace's ingredients page does not gain a row for it
- Removing an ingredient updates derived categories immediately
- Story 49, 50 and 57 acceptance tests pass

**M10.16 — SpellBuilder — reorder for layer order** · 2h

_Story 51 — As a workspace member, I want to reorder ingredients, so that layering sequence is recorded as part of the recipe._

Reordering with both pointer and keyboard affordances, persisting layerOrder.

_Acceptance criteria:_

- Order can be changed by keyboard alone
- New order persists on save, rewriting the jar's rows under the `(spell_id, layer_order)` primary key (MB.40) — custom and linked rows reorder alike, since the key is the layer and not the ingredient
- Order is announced to assistive technology
- Story 51 acceptance test passes

**M10.17 — Intent versus derived category comparison panel** · 2h

_Story 52 — As a workspace member, I want to see where intent and contents disagree while I build, so that I can correct the jar rather than discover it later._

Sidebar showing assigned intent alongside the derived union, flagging both directions — tagged for prosperity with nothing carrying it, and mugwort adding psychic work that was not intended. Weight the second list by whether the ingredient is pulling its weight elsewhere. An ingredient contributing an intended category and one stray one is doing its job and the stray is a footnote; an ingredient contributing nothing intended is the one worth looking at. Same list, two levels of emphasis, so the eye lands on the ingredient that has no reason to be in the jar.

_Acceptance criteria:_

- Both gap directions are shown with distinct wording
- An unintended category from an ingredient that also carries an intended one is de-emphasised
- An ingredient contributing nothing intended is emphasised
- Emphasis is conveyed by more than colour or weight alone, so it survives a screen reader
- Panel updates as ingredients change
- No gaps renders a clear matched state
- Story 52 acceptance test passes

**M10.18 — Safety warning for toxic ingredients** · 1h

_Story 53 — As a workspace member, I want a warning when an ingredient is toxic or unsafe to burn, so that I do not harm myself or someone I give it to._

Surface safetyNotes prominently when such an ingredient is added, without blocking the addition. Reuse M8.13a’s `SafetyNote` component rather than restyling the warning — this is a different surface from the ingredient card (M8.14), not a duplicate of it, and the treatment must stay identical across both.

_Acceptance criteria:_

- Warning appears on add and remains visible in the list
- Warning does not block the action
- A custom, one-off ingredient (MB.40) shows no warning — it has no compendium entry to carry a safety note — and its silence is not rendered as "safe"
- Announced to assistive technology
- Story 53 acceptance test passes

**M10.19 — Out-of-stock indicator while building** · 1h

_Story 54 — As a workspace member, I want to see when I am adding something we have none of, so that I know what to gather before starting._

Compare against the workspace's stock and flag ingredients with none on hand, or held below the quantity called for.

_Acceptance criteria:_

- Zero stock is flagged on add
- Insufficient quantity is flagged distinctly from zero
- Compendium ingredients not in the workspace's ingredients are flagged as not held
- A custom, one-off ingredient (MB.40) is a third state, distinct from held and from not held: it is marked one-off, because nothing on the ingredients page could ever resolve it and "gather this" is not the instruction
- Story 54 acceptance test passes

**M10.20 — Save as draft and mark complete** · 1h

_Story 55 — As a workspace member, I want to save a spell as a draft and mark it complete later, so that an unfinished spell is not mistaken for a finished one._

Status control with draft as the default, and completion as an explicit action.

_Acceptance criteria:_

- New spells default to draft
- Marking complete is explicit and reversible
- Status is visible in the grimoire list
- Story 55 acceptance test passes

**M10.21 — Spell survives a soft-deleted inventory item** · 1h

_Story:_ As a user, I want a saved spell to remain intact after I run out of something so that my record of a working is not damaged by stock changes.

Test that soft-deleting an inventory item leaves the spell's ingredient list intact, since spell_ingredients references the ingredient, not the stock row.

_Acceptance criteria:_

- Spell renders fully after the stock row is deleted
- Ingredient shows as not held rather than disappearing
- A custom, one-off ingredient (MB.40) in the same jar is unaffected by any inventory change — it never pointed at one
- No foreign key error occurs

**M10.22 — Spell recipe print layout** · 2h

_Story:_ As a user, I want a printable recipe so that I can work from paper without a screen beside the jar.

Create `_print.scss` — this is the only view in v1 that gets print styling. Spell layout: ingredients in layer order with quantities, instructions, and correspondences. Navigation and controls suppressed. Add a visible print control on the spell page: nobody thinks to reach for a browser menu on a phone, and a print stylesheet with no way to invoke it is a feature only its author knows about. Two ingredients sharing a display label print with their formal name alongside it, since on paper there is no hover to disambiguate them.

_Acceptance criteria:_

- A print control is visible on the spell page and triggers the print dialog
- The control is keyboard reachable and labelled
- The control does not itself appear in the printed output
- Prints on one page for a typical spell
- Layer order and quantities are legible
- Two ingredients sharing a label are distinguishable on the printed page by their formal name
- Interactive chrome is hidden
- Print styles are scoped to this view and do not leak into others

## M11 — Hardening and launch

_14 tasks · 22 hours_

**Sequencing**

- Every other wave must be complete. This is mostly verification, but not purely: M11.9 and M11.10 build net-new UI, so do not schedule them as if they were a checklist pass.
- M11.8 (axe sweep) depends on every page existing.
- M11.13 (full story checklist green) gates M11.14 (release).

### End-to-end suite

**M11.1 — E2E: admin adds a compendium entry** · 2h

_Story 18 — As a site admin, I want compendium curation to work through the real interface against a production build, so that the path users take is the path that is tested._

Playwright spec signing in as E, creating a compendium entry, and verifying it appears for a non-admin user.

_Acceptance criteria:_

- Spec passes against the production build on 8001
- Runs against sorrel_e2e, reseeded beforehand
- axe scan on each page visited

**M11.2 — E2E: add a compendium ingredient to a workspace** · 2h

_Story 14 — As a workspace member, I want adding a compendium entry to our ingredients to work end to end, so that the core daily loop is verified._

As A, add the compendium entry created in M11.1 to W's ingredients with a quantity, and confirm it appears with its stock and default threshold.

_Acceptance criteria:_

- Stock row appears in W's ingredients
- Quantity and unit are as entered
- Default low-stock threshold is applied and visible
- Survives a page reload
- axe scan clean

**M11.3 — E2E: build a spell and check the category comparison** · 2h

_Stories 47–52 — As a workspace member, I want spell building and the category comparison to work end to end, so that the most complex screen is verified as a whole._

As A, build a spell with intent categories and ingredients, and assert the comparison panel reports the expected gaps in both directions.

_Acceptance criteria:_

- Spell saves with ingredients in layer order
- Comparison panel shows both gap directions
- Spell appears in the grimoire list
- axe scan clean with the builder open

**M11.4 — E2E: invite, accept, and land in the workspace** · 2h

_Stories 4 and 6 — As a workspace owner, I want inviting a member to work end to end, so that sharing behaves as promised._

As A, generate an invite link at member role; as B, accept it, sign in, and land in W with the ingredient list visible.

_Acceptance criteria:_

- Invite link is copyable and single-use
- B lands in W at the invited role
- B sees W's ingredients and grimoire
- Reusing the link afterwards is rejected

**M11.5 — E2E: viewer reads but cannot edit** · 1h

_Story 12 — As a viewer, I want my read-only access verified end to end, so that the role means what it says._

As C, read the ingredients and grimoire, and confirm no write controls are rendered anywhere.

_Acceptance criteria:_

- No write controls rendered for C
- C can read every spell
- A direct mutation attempt is rejected

**M11.6 — E2E: outsider sees nothing** · 1h

_Story 19 — As a workspace owner, I want isolation from other workspaces verified end to end, so that privacy is proven rather than assumed._

As D, attempt to reach W's ingredients and grimoire by URL and confirm 404 throughout.

_Acceptance criteria:_

- Every W route returns 404 for D
- No workspace name or content leaks in the response
- D's own workspace X is unaffected

**M11.7 — E2E: soft delete disappears from the list** · 1h

_Story 25 — As a workspace member, I want soft delete verified end to end, so that removal behaves the same way in the browser as in the service tests._

As A, soft-delete an ingredient, confirm it leaves the list, and confirm the same name can be added again.

_Acceptance criteria:_

- Item disappears without reload
- Re-adding the same name succeeds
- Record remains in the database

### Launch readiness

**M11.8 — axe scans across every page and modal** · 2h

_Story:_ As a user relying on assistive technology, I want every page and modal to meet the standard so that no part of the app is closed to me.

Extend the e2e specs to scan each route and each open modal. Accessibility is asserted here, not via vitest-axe.

_Acceptance criteria:_

- Every route in §9 is scanned
- Every modal is scanned while open
- Zero violations at the configured level
- Scan list is maintained alongside the route table

**M11.9 — Cold-start skeleton states** · 2h

_Story:_ As a user returning after a quiet week, I want the first paint to be immediate so that Neon's resume is invisible rather than looking broken.

Add skeletons for the first paint on every data-backed route. No assumption that the first query returns in under 50ms.

_Acceptance criteria:_

- Every data-backed route has a skeleton
- Skeletons match final layout closely enough to avoid a jump
- Tested with an artificially delayed first query
- Respects prefers-reduced-motion

**M11.10 — Error boundaries and 404/500 pages** · 2h

_Story:_ As a user, I want failures to be legible so that an error is a message rather than a blank screen.

Route-level error boundaries plus styled 404 and 500 pages, with a route back to somewhere useful.

_Acceptance criteria:_

- A thrown error renders the boundary, not a blank page
- 404 and 500 are styled and offer a way onward
- No stack traces reach production output
- Boundaries do not swallow authorization redirects

**M11.11 — Verify coverage thresholds and acceptance reporting** · 1h

_Story:_ As a developer, I want the gates proven before release so that the first post-launch PR is not the one that discovers they were misconfigured.

Confirm the 80% thresholds hold on both suites and that acceptance coverage reports separately from line coverage.

_Acceptance criteria:_

- Both suites report at or above 80% on all four metrics
- A deliberate coverage drop fails CI
- Acceptance coverage is reported separately
- Coverage artifacts upload on every run

**M11.12 — claude-docs completeness pass** · 2h

_Story:_ As a future maintainer, I want each subsystem and component documented so that the design decisions survive the people who made them.

Write the subsystem summaries and one doc per component. (The append-only transcript this task used to bring up to date was retired by MB.31.)

_Acceptance criteria:_

- A summary exists for auth, data, GraphQL, ingredients, grimoire and CI
- Every component in src/components has a doc
- Vocabulary is used consistently throughout

**M11.13 — Full story checklist green** · 1h

_Story:_ As a product owner, I want every one of the 45 stories passing so that done is measured against the specification.

Run `make test-stories` and confirm all 45 pass. Any deferral is recorded explicitly rather than left silently failing.

_Acceptance criteria:_

- All 45 stories report pass
- Output is captured in claude-docs as the release record
- No test is skipped to achieve the result

**M11.14 — Promote release/1.0.0 to main** · 1h

_Story:_ As a developer, I want v1 released through the standard Gitflow path so that the first production deploy exercises the same process as every later one.

Cut `release/1.0.0` from staging, promote through the merge queue, confirm migrations applied and the production deploy is healthy.

_Acceptance criteria:_

- Release branch passes the full gate
- Migrations applied to production before traffic
- Production smoke check passes
- main-sync branch opened to bring main back down

## M7.A — PR gates

_1 task · 1 hour · unscheduled by design_

Not a wave. This gate is trigger-based: do it when a second contributor arrives, or when PR volume makes an untested merge combination a real risk. Nothing depends on it.

**M7.A.1 — Enable Require merge queue on main and staging** · 1h

_Story:_ As a developer, once other people are contributing, I want a merge queue so that `main` and `staging` never receive an untested merge combination.

Split off from M0.21, which ports `merge-queue.yml` but deliberately leaves the branch-protection switch off during solo development — a required queue forces the full CI suite before every merge, which is wasted time with one developer and no users. Enable **Require merge queue** in Settings → Branches on both `main` and `staging`.

_Acceptance criteria:_

- Merge queue enabled on `main` and `staging`
- A queued PR triggers the workflow
- The additional required checks from M0.22 are in place
- Setup step documented in claude-docs

## MB — Bugfixes and gap tasks

Work that was not in the original breakdown. `MB.*` exists so a defect or a missing dependency can be scheduled without renumbering an immutable ID. MB.1 through MB.4 are merged; MB.5 through MB.11 were minted by the re-sequencing audit; MB.12 was minted after M2.2/M2.4/M2.5/M0.27 merged with real verification still outstanding. MB.13 was minted during M1.16, when `/create-pr` nearly pushed a feature branch straight at `staging`. MB.14 was minted during M1.17, when its eleventh test file tipped M1.9's per-worker database naming past the set of clones that exist. MB.15 was minted during M1.20, on noticing that the two smoke-check workflows still built their own copy of the testing image that M0.24 had since made shared; collapsing them onto the shared image showed they were a strict subset of `pr-gate.yml`, and the task was re-scoped in place to deleting them. MB.16 through MB.18 were minted together, also during M1.20, when tracing why `build-db-image.yml` runs on a push to `staging` turned up three separate things: a Dependabot base-image bump no prose ever followed (MB.16), a `latest` tag nothing consumes standing in the docs as the push trigger's whole purpose (MB.17), and — on comparing the three image-build workflows side by side — a skip-if-exists check that only `build-db-image.yml` lacks, for a documented reason that holds on the `push` path and fails on the `workflow_call` path every PR actually takes (MB.18). MB.19 was minted on request, after `npm audit` was found to carry a standing moderate advisory (GHSA-67mh-4wv8-2f99) reached only through `drizzle-kit`'s devDependency chain, with no fix available on its stable dist-tag. MB.19 was then **retired without being done** — it is the first task to be retired rather than completed or re-scoped — when re-examining it showed the advisory has no runtime path and that the upgrade traded a frozen stable dependency for a prerelease one; its ID and analysis are kept because task IDs are immutable, and the standing decision now lives in `db.md`. MB.20 was minted in the same pass: tracing what would eventually force that upgrade anyway identified `@pothos/plugin-drizzle`, a `0.x` package that tracks `drizzle-orm`'s version and whose primary capability — resolver-level database access — CLAUDE.md rule 1 forbids. Dropping it before M3 is written is what makes staying on `0.45.2` sustainable. MB.21 was minted on request: there was no way to browse the local database without `psql`, and `drizzle-kit` — pinned at `0.31.10` by MB.20's decision — already ships a `studio` subcommand that needs only wiring, not a new dependency. MB.22 was minted on request, for the same reason as MB.21 but broader: there was no debugging story at all — no Node inspector wired anywhere in the container, no `.vscode/` directory, no way to step into a service, a repository call, or a test, and no way to watch what `withAudit`'s `SET LOCAL app.current_user_id` and RLS actually do to a query beyond reading its output. It is scoped and sized as a single task rather than split across several, as an explicit exception to the normal 1–2h task sizing: the work is uniformly tooling-only (no table, no service, no page), lands as one coherent developer-experience change, and the user asked for it as one PR. MB.23 was minted on request immediately after MB.22 merged: writing an e2e spec by hand means hand-guessing role and label queries against a page nobody has inspected, and `playwright codegen` records a real interaction and emits exactly the query style CLAUDE.md mandates — but MB.22's `playwright-server` service has no display for the recorder to open, a limitation its own design record names. MB.23 gives that service a display (Xvfb, a window manager, and a noVNC tab at `:7900`) rather than standing up a second service, which as a side effect also delivers `page.pause()` and UI mode's locator picker that MB.22 wrote off. MB.24 through MB.26 were minted together, out of the question of whether RLS was worth its cost at all. Checking §8 against the code answered it twice over: the policies M6.4 was about to write would have been **inert**, because `drizzle-kit migrate` and the application share one `DATABASE_URL` and so the app owns every table it would be filtered by — Postgres exempts a table's owner from its own policies unless `FORCE` is set, and `FORCE` appears nowhere in this repo; and fixing only that would have broken **every read**, because the GUC is published inside `withAudit` and the read path never opens a transaction for it to be local to. The two defects concealed each other, which is why neither had surfaced: the first kept the policies from applying, so the second could not yet bite. MB.24 is the decision and the doc correction, MB.25 the role split, MB.26 the read-side wrapper. MB.27 was minted in the same pass from a separate defect found while tracing how `DATABASE_URL` resolves per branch: `deploy.yml` calls `vercel pull` without `--git-branch`, so M1.1's branch-scoped `staging` override has never reached a build. MB.29 through MB.34 were minted together, out of a review of the plan against what had actually been built: eleven days and 99 PRs had produced ~2,700 lines of application code and ~23,000 lines of process, and the question was which of that process was paying for itself. Four answers came back and one did not. MB.31 retires the per-task transcript, the scheduled compression pass and `TASKS.csv`, none of which the PR body was not already doing. MB.29 defers RLS, whose remaining cost after MB.24 was not the ~8h of work but a read transaction on every service call for the life of the project. MB.30 asks whether the Better Auth plugin that justified choosing Better Auth can carry M6 and M7, which nobody had checked. MB.32 collapses five copies of one CI workflow, and MB.33 replaces a guard that reads source as text with a lint rule that bans the capability. MB.34 came out of the same pass from a different direction — the six-column audit spread on a join table means a soft-deleted row per chip toggle, forever. **Two proposals from that review were rejected and are recorded in DESIGN.md §14 so they are not re-argued**: replacing GraphQL with server functions, and trunk-based branching. MB.28 was minted while designing the ingredient identity model: `lower(name)` uniqueness cannot express an admin-curated compendium holding several unrelated things under one ambiguous common name, and DESIGN.md §5 needs that fix recorded before M4.1 can treat the `CREATE TABLE` as transcription rather than design. MB.35 and MB.36 were minted together during M4.2, on the decision that an admin may add a category group — which §6 had modelled as a closed set of eight and M4.2 had therefore built as a pgEnum. MB.35 is the doc-and-scoping half and follows MB.28's shape exactly; MB.36 is the code half, since a group created at runtime cannot have a build-time Sass token. The sequence is worth keeping: M4.2 was **built, complete and green, and then rebuilt**, because the design doc it faithfully transcribed described a closed set. That is the cost MB.28 exists to prevent, paid once here for want of asking whether the eight were a starting point or a boundary — and it is the reason the doc task comes first rather than after, even when the table is already written. MB.37 was minted on a report that the destructive-DDL check fires too much: it fired on every local run and on no PR at all, and the first symptom hid the second, since a check that is always red locally is one nobody looks at in CI either. The CI half was MB.32's — it deleted the calling job without folding the check into the matrix it was collapsing everything else onto, and left every other surface (the path filters, the workflow file, `ci.md`) describing a check that ran on nothing. **The lesson is the one the sweep-task rule already states**: a check deleted from a file five other checks share is noticed; a check that is merely no longer called is not. MB.38 came out of the same reading, from the other end — `check-workshop-theme-default.ts` says in its own header that it is a script rather than a test only because Vitest had not landed yet, and it has since M1.7. MB.39 was minted on a question about step order — whether a leg's should-run flag could be resolved before its container is pulled. It cannot, because `Initialize containers` is job initialization; the only decision point earlier than the pull is the job-level `if:` every workflow here refuses. Tracing why turned up the actual finding: **the rule the entire filtering design is built on was copied verbatim from `resume-2026` at M0.16 and has never been tested here** — the repo has no ruleset requiring a status check, so the symptom it warns about could not have occurred, while `audit / audit` carried a job-level `if:` for eight days and `deploy.yml` carries three today. It is the MB.24 shape exactly: a constraint that everything downstream was arranged around, load-bearing enough that nobody re-derived it, and wrong or right for reasons no one had checked. MB.40 was minted on request during M4.3a, from the question of what it would take for a spell to call for something the workspace will never stock. The answer was cheap only because nothing queries `spell_ingredients` until Wave 13: reshaping it now is a contract migration against zero rows, adopted by each Wave 13 task in its own PR, where the same change as a fast-follow would have been a retrofit across every consumer and a breaking nullability change in the SDL. It is the first contract migration in the repo, and so the first PR to carry rule 10's acknowledgement line.

| ID    | Task                                                                                         | Status  | Needed by    |
| ----- | -------------------------------------------------------------------------------------------- | ------- | ------------ |
| MB.1  | Fix prefers-reduced-motion facet swap in ThemeToggle                                         | merged  | —            |
| MB.2  | Fix sun facet swinging in on first paint in light mode                                       | merged  | —            |
| MB.3  | Fix Prettier formatting in `m1.1-neon-branch-strategy.md`                                    | merged  | —            |
| MB.4  | Stop destructive-ddl scanning non-migration changed files                                    | merged  | —            |
| MB.5  | Restore `users` FKs on `auditColumns`                                                        | merged  | every table  |
| MB.6  | Spell recipe view page                                                                       | Wave 13 | M10.22       |
| MB.7  | Application nav shell                                                                        | Wave 12 | M8.16, M8.17 |
| MB.8  | Zod schema for spells                                                                        | Wave 13 | M10.10       |
| MB.9  | `ingredientsById` DataLoader                                                                 | Wave 11 | M8.5, M9.4   |
| MB.10 | `usersById` display-name DataLoader                                                          | Wave 9  | M6.18        |
| MB.11 | GraphQL field exposing the fuzzy duplicate service                                           | Wave 8  | M5.10        |
| MB.12 | Finish the secrets matrix and verify real OAuth sign-in                                      | Wave 6  | M2.3         |
| MB.13 | Stop branch skills setting the base branch as upstream                                       | Wave 2  | —            |
| MB.14 | Key the per-worker test database off `VITEST_POOL_ID`                                        | Wave 2  | —            |
| MB.15 | Delete the redundant smoke-check workflows                                                   | Wave 2  | —            |
| MB.16 | Correct the Postgres version across the live docs                                            | Wave 2  | —            |
| MB.17 | Drop the dead `latest` tag from `build-db-image`                                             | Wave 2  | MB.18        |
| MB.18 | Give `build-db-image` the skip-if-exists check                                               | Wave 2  | —            |
| MB.19 | ~~Move `drizzle-kit`/`drizzle-orm` off the `@esbuild-kit` advisory~~ — **retired, not done** | —       | —            |
| MB.20 | Drop `@pothos/plugin-drizzle` from the GraphQL stack                                         | Wave 2  | —            |
| MB.21 | Drizzle Studio for local development                                                         | Wave 2  | —            |
| MB.22 | Set up modern debugging tooling                                                              | Wave 2  | —            |
| MB.23 | Playwright codegen for local development                                                     | Wave 2  | MB.22        |
| MB.24 | Decide the RLS role split and read-path identity — **superseded by MB.29**                   | merged  | —            |
| MB.25 | ~~Split the database roles so RLS applies to the app~~ — **retired, not done**               | —       | —            |
| MB.26 | ~~`withViewer`, the read-side identity wrapper~~ — **retired, not done**                     | —       | —            |
| MB.27 | `vercel pull` ignores branch-scoped variables                                                | Wave 4  | —            |
| MB.28 | Record the ingredient identity model in the design docs                                      | merged  | M4.1         |
| MB.29 | Defer RLS to the public launch; make the second layer a `Membership` proof                   | Wave 3  | M6.3, M10.3  |
| MB.30 | Spike Better Auth's organization plugin for workspaces and invitations                       | Wave 3  | M4.1, M6.7   |
| MB.31 | Retire transcripts, the MW compression passes and `TASKS.csv`                                | Wave 3  | —            |
| MB.32 | Collapse the five check workflows onto one matrix                                            | Wave 3  | —            |
| MB.33 | Ban runtime `drizzle-orm` outside the repository by lint                                     | Wave 3  | —            |
| MB.34 | Hard-delete rows in the three join tables                                                    | Wave 3  | M4.4         |
| MB.35 | Make category and form groups admin-curated data                                             | Wave 3  | M4.2a, M4.4  |
| MB.36 | Chip colour from the row, not the token                                                      | Wave 3  | MB.35        |
| MB.37 | Restore the destructive-DDL gate as a checks leg, scope the local run to the branch          | Wave 3  | —            |
| MB.38 | Move the two workshop guards into Vitest                                                     | Wave 3  | MB.37        |
| MB.39 | Settle whether a job-level `if:` really renames a check                                      | Wave 3  | —            |
| MB.40 | Custom one-off spell ingredients (schema)                                                    | Wave 4  | M1.23, M10.5 |
| MB.41 | Move Vitest tests into `tests/`                                                              | Wave 4  | M1.23        |
| MB.42 | CI container jobs run against files the repo has deleted                                     | Wave 4  | —            |
| MB.43 | Map service errors to GraphQL errors with field-level detail                                 | Wave 7  | M5.9, M8.8   |

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

`AppShell`, added to §9's Components list by this audit. M8.16 and M8.17 require the add and edit modals to be "reachable from the main nav on any page", but no task and no route built an app-wide nav — `WorkspaceSwitcher` (M6.9) and the coven layout (M6.10) do not cover it, and both compendium and ingredient detail sit outside `/coven/` entirely.

_Acceptance criteria:_

- Wraps every signed-in page, inside and outside `/coven/`
- Carries the primary nav, the `WorkspaceSwitcher` and the global add/edit affordances
- The coven layout nests inside it and adds only workspace-scoped chrome
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

_Acceptance criteria:_

- Field returns compendium and current-workspace matches only
- Threshold matches M4.7's, not a second constant
- Bounded by the M3.6 pagination helper
- Authorization is enforced in the service, not the resolver

**MB.12 — Finish the secrets matrix and verify real OAuth sign-in** · 1h

_Story:_ As a developer, I want the remaining M0.27 secrets set and a real sign-in confirmed, so that the auth work merged in M2.2/M2.4/M2.5 is actually exercised end-to-end, not just verified against live provider endpoints without a completed login.

PR #71 (M2.2/M2.4/M2.5/M0.27, merged 2026-09-11) landed real Google/GitHub OAuth credentials and most of the secrets matrix, verified by fetching the live `accounts.google.com`/`github.com` authorization endpoints directly — real evidence the client id/secret pairs and `redirect_uri` are correct, but no one has completed an actual interactive sign-in through a browser and consent screen. Four rows of `claude-docs/secrets.md` are also still unset.

Minted against Wave 1 and moved to **Wave 6** by MW.1: there is no page to sign in on until M2.6 builds one, so the browser criteria below cannot be met any earlier. Everything it verifies (M2.2/M2.3/M2.4/M2.5) is already merged, so it is a late verification of earlier work, not a blocker for it.

_Acceptance criteria:_

- A real browser completes Google sign-in on `http://localhost:8000`
- A real browser completes GitHub sign-in on `http://localhost:8000`
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

Dependabot commit `44d2175` ("Bump postgres from 17 to 18 in /Docker") changed exactly one line of `Docker/Dockerfile.postgres` and nothing else. No prose followed it, so the Dockerfile says `postgres:18` while CLAUDE.md, DESIGN.md §11, this file, `TASKS.csv`, `ci.md`, `docker-compose.yaml` and three workflow header comments all still say 17. Confirmed with the user that the code is right before touching anything, per CLAUDE.md's rule on reconciling a doc against the code — a version bump argued nowhere and reversed nowhere is a bump, not a mistake.

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

So the trigger stays and the tag goes. MB.15's own entry above, which records "moving `latest` is its real job", is corrected in the same pass.

`src/db/**` is in the tag hash and the path filter but **not** in the build context — `Dockerfile.postgres` only `COPY`s `Docker/postgres-init/enable-extensions.sql` — so a `src/db`-only change republishes byte-identical layers under a new tag. M1.27 changes that by baking the schema in. Recorded here because it is what makes MB.18's cache argument work.

_Acceptance criteria:_

- `ghcr.io/<repo>/db:latest` is no longer pushed; only the hash tag is
- The `image` job output is unchanged, and `pr-gate.yml`/`merge-queue.yml` still consume it
- The build step on the task's own PR run is still ~6–8s, proving the cache restore is intact
- `build-db-image.yml`, `ci.md` and MB.15's entry above all state the cache-seeding reason, and no live doc still claims the trigger exists to move `latest`

**MB.18 — Give `build-db-image` the skip-if-exists check** · 1h

_Story:_ As a developer, I want a PR that changes nothing about the database image to skip rebuilding it, the same way the other two image builds already do.

`build-image.yml` and `build-e2e-image.yml` both gate their build on `docker buildx imagetools inspect` finding the content-addressed tag already published. `build-db-image.yml` is the only one that does not, and `ci.md` says that is deliberate: "its trigger paths are exactly its hash inputs, so the trigger already does it". That holds for the `push` trigger and fails for `workflow_call`, which bypasses the path filter entirely and is the path every PR takes. On that path nothing does the skipping and buildx runs every time.

The two mechanisms are alternatives, and the siblings picked the better one: skip-if-exists reuses work via GHCR tag existence, which is global, where the GHA layer cache is branch-scoped. Adding the check does **not** make MB.17's push trigger redundant — `src/db/**` is in the hash but not the build context, so through Wave 1 the tag misses constantly while the content does not change, which is exactly when a warm layer cache still pays. Both mechanisms stay.

Three things differ from the siblings and are easy to get wrong: the tag step here is `id: tags` with output `hash-tag`, not `id: tag` with output `image`, so a copied expression would gate on an empty string and silently never skip; the `image` job output must keep coming from `hash-tag`, which is computed before the check and unconditionally, because `vitest.yml` and `playwright.yml` key their `services: postgres:` block off it; and after MB.17 `tags` and `hash-tag` are the same value.

`pr-gate.yml` already gives this job `cancel-in-progress: false`, so the mid-push corruption hazard `build-image.yml`'s comment describes is guarded. No concurrency change.

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

**What replaces it is a type.** `assertMembership(session, workspaceId, minRole)` returns a branded `Membership` — `{ workspaceId, userId, role }`, unconstructible outside the membership service. Workspace-scoped finders and `AuditWriter` methods take one as their first argument and AND `workspace_id = membership.workspaceId` on themselves; `write.insert` fills the column from the proof. A service cannot build a workspace-scoped query without having passed the check. That is the sweep-task rule's own test — impossible rather than absent — and it costs nothing at runtime because it is erased at compile time.

**Where it is weaker than RLS, stated rather than glossed.** A service holding a proof for W that hand-writes a `where` naming X's ids is not caught by the type. `spell_ingredients` and `spell_categories` carry no `workspace_id` and cannot self-scope, so their services load the parent spell under the proof first. Both cases are covered by the direct-id denial tests CLAUDE.md's Testing section already requires and M6.6 already schedules — which is the same coverage that would have caught a policy written wrong.

**The GUC does not move.** `withAudit` keeps publishing `app.current_user_id` on every write, so RLS at the public launch (`TO_CLAUDE.md`'s "V Public") is one migration plus its tests rather than a re-audit of every write path. That was half of MB.24's argument for landing the GUC early, and that half is untouched. MB.24's analysis of `FORCE`, the role split, the `security definer` helper, the compendium's nullable `workspace_id` and the two join tables stands as the specification for when it lands; the record gets a status line, not a rewrite.

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
> are in [`mb.30-organization-plugin.md`](design-decisions/mb.30-organization-plugin.md).
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

CLAUDE.md rule 3 spreads all six audit columns into every table, join tables included. For `ingredient_categories`, `spell_categories` and `spell_ingredients` that means every chip toggled in the ingredient form and every ingredient pulled out of a spell leaves a soft-deleted row forever, each needing a partial unique index so the pair can be re-added, and each adding a `deleted_at IS NULL` that a service joining _through_ the table must remember by hand. That last one is the real argument: it is exactly the mistake rule 4 exists to prevent, and the one place the repository's finder cannot prevent it, since `findMany` filters the table it selects from and not the tables it joins.

Nothing in v1 reads a deleted join row — there is no restore UI, and the trash view is v2. The v2 revisions trigger records a `DELETE` as readily as an `UPDATE`, so history is unaffected.

The four stamp columns stay: `created_by` on a join row answers "who added this ingredient to this spell", which story 13 asks for. Only `deleted_at`/`deleted_by` go, and with them the partial index. `workspace_members` keeps the full spread — who removed whom, and when, is worth keeping — and so does `ingredient_folk_names`, which holds content rather than a link.

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

DESIGN.md §5 and §6 modelled a category's `group` as a closed set of eight, fixed both by §6's table and by M0.7's eight `_variables.scss` colour tokens. M4.2 transcribed that faithfully as a `category_group` pgEnum — the right call for a closed set, and the wrong one the moment an admin may add a ninth: `ALTER TYPE … ADD VALUE` is DDL, migrations here are forward-only and CI-gated, and an admin mutation cannot run DDL at all. The same question applies to `ingredient_forms.group`, whose three values have already grown twice; M4.2a is the adjacent task, so both are settled here or they diverge within one wave.

Three decisions, recorded in §14:

1. **Groups become rows, in two tables** — `category_groups` and `ingredient_form_groups`, each global, admin-curated, unscoped by workspace, shaped like `categories` itself. Two tables rather than one with a `kind` discriminator, because a discriminator would let `categories.groupId` point at a form group and fail invisibly at render time, where two tables make it a foreign-key violation. Impossible rather than merely absent, for one extra `CREATE TABLE`. Neither carries an order column: groups list alphabetically by `name`, which needs nothing stored and puts an admin-added group where a reader would look for it.
2. **Both `groupId`s are foreign keys, where `ingredients.form` stays text** — and the asymmetry is a rule, not an exception. `form` is written by a member, who must be able to write `rhizome` before curation catches up; groups are written only by admins on both sides, so an FK blocks nobody, and a typo'd group would otherwise empty a chip section silently. Stated in §5 in those terms, because it reads as an inconsistency next to the sentence directly above it.
3. **A group's colour is two hexes on the row, one per theme, each contrast-checked on write.** A group created at runtime cannot have a Sass variable, so M0.7's eight tokens stop being the runtime lookup and become M4.3's seed values — and since that map already carries a `dark` and a `light` value per group, the pair falls straight out of it. Generalising M0.7's hue rotation to N groups was the alternative — a runtime port of `category-group-color()` plus a contrast solver replacing its hand-tabulated per-theme trims — and was rejected as more machinery than the feature earns. Two columns rather than one because no single hex clears 4.5:1 on both soot and parchment without being mud on one; each is checked on write against its own ground, so the floor is exact and the admin picks both swatches side by side. What is given up is stated rather than glossed: an admin's ninth colour is legible but will not join the rotation, so the set stops reading as one family at the edges.

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

**Locally it was permanently red, and correctly so, which is the worse failure.** With no arguments the script scanned every committed migration, and `0002_solid_marauders.sql` carries two `ADD COLUMN ... NOT NULL` with no default — a true finding, acknowledged in PR #73's own body and merged anyway, since no ruleset requires the check. A gate that is always red is a gate nobody reads. The script's header already said it scans "only the ones new or changed _in this PR_"; the fallback simply did not do that. It now diffs the branch against its Gitflow base, untracked migrations included, so a task that has just run `db:generate` gets an answer about its own work. `--all` keeps the old behaviour for an audit, where staying red is the point.

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

**The claim has never been verified in this repo.** "A job-level `if:` makes GitHub report a differently-named, bare check run" arrived at M0.16 (`258b825`) as a byte-for-byte copy of `resume-2026`'s `should-run` comments — that task's decision record verified YAML parsing and a `diff` against the originals, and nothing about check-run naming. M0.20 re-cited it as upstream's comments, `b3b0dbb` lifted it into `ci.md` as a general rule, and MB.32 extended it to matrix jobs. No commit, decision record or transcript describes the symptom being seen, and none could: no ruleset here has ever required a status check.

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

A custom ingredient is a layer in the jar that carries a free-text `name` and `form` instead of pointing at an `ingredients` row. It belongs to exactly one spell, shares that spell's visibility, never appears on the workspace's ingredients page, never enters local-beats-compendium suppression, and contributes nothing to derived categories. It is one-off, not reusable: a _reusable_ custom ingredient is already what a workspace-local `ingredients` row is (story 29's stub), and making this one reusable would have been a second way to say that plus a flag to keep it off every list — and a workspace-level name for content that may belong to a private spell.

**The shape is columns on `spell_ingredients`, not a table of its own.** `ingredient_id` becomes nullable and keeps its foreign key; `name` and `form` are added, `form` free text and not a foreign key for the reason `ingredients.form` is not (§14); `CHECK (num_nonnulls(ingredient_id, name) = 1)` makes a row exactly one kind or the other, the idiom §14 already blesses for the deferred notes model; `CHECK (ingredient_id IS NULL OR form IS NULL)` keeps `form` off a linked row, where it would shadow half the ingredient's identity; both text columns are checked non-blank. The primary key moves from `(spell_id, ingredient_id)` to `(spell_id, layer_order)` — the pair no longer exists on every row, the layer is the one thing every row has, and that pair was already a unique index — so the old layer index is dropped as redundant and no surrogate id is added. One ingredient per jar, what the old key gave, becomes a partial unique index `WHERE ingredient_id IS NOT NULL`; one custom name per jar is its mirror on `(spell_id, lower(name)) WHERE ingredient_id IS NULL`, the shape of `ingredients_workspace_label_unique`. Still `auditStampColumns`, still hard-deleted (MB.34): derived categories join _through_ this table to `ingredient_categories`, which is exactly the case that rule protects.

**Why not a separate table.** A `spell_custom_ingredients` table splits layer ordering across two tables, and no constraint can span tables: `(spell_id, layer_order)` uniqueness becomes service discipline or a cross-table trigger — absent rather than impossible. Every jar read becomes a `UNION`, M10.16's reorder touches both tables, GraphQL needs a union type, and quantity, unit, layer order, note and the stamps exist twice. Argued in full in [`mb.40-custom-spell-ingredients.md`](design-decisions/mb.40-custom-spell-ingredients.md).

**Why now.** The table is inert until Wave 13, so the contract migration runs against zero rows and every Wave 13 task adopts the null-ingredient branch in its own PR. As a fast-follow the same task costs a ~3–5h retrofit across ten to twelve files plus a breaking nullability change on `SpellIngredient.ingredient` in the SDL. It sits after M1.22 and before M1.23, the first writer of the table.

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

Every container job — `vitest`, `playwright`, `gitflow`, and all four of `checks.yml`'s legs — runs against a working tree holding every file deleted from the repo since the testing image was last built. `Docker/Dockerfile.node` bakes the whole repo into `/app` with `COPY . .`; `.github/actions/checkout-to-app` then lays the checkout over it with `cp -a`, which overlays but never deletes. A file the checkout no longer contains survives on disk, untracked and not ignored.

**Found by MB.41**, whose location guard failed on its first CI run reporting 34 test files outside `tests/` — every one that move's own predecessor at its pre-move path. The count is the tell: 34, not that branch's 39, because the image predates the five test files added since it was built. MB.41 scans the index instead, which is right for that guard on its own merits and leaves this untouched.

**Why it went unnoticed, and why it still matters.** Until MB.41 the repo mostly added files, so the overlay was harmless; and the checks that enumerate files read _contents_ rather than _locations_, where a stale duplicate says the same thing and passes — `slug-rule.test.ts` is the example. But `oxlint` and `tsc` both walk `src/**`, so a file deleted precisely because it was wrong is still linted and typechecked: a leg can fail on a reason absent from the diff, or pass because the copy left behind is the one that satisfies it.

The likely fix is `git clean -fd` after the copy — without `-x` it respects `.gitignore`, so the image's `node_modules` and `.next` survive while untracked leftovers go. **Sequencing note:** the action is referenced at `@main`, so the fix has no effect on its own PR's runs and only takes effect once merged — which is also why MB.41 could not simply fix it.

_Acceptance criteria:_

- `checkout-to-app` leaves `/app` holding exactly the checkout plus the image's ignored build artifacts; no file absent from the checkout survives
- Demonstrated rather than asserted: a job asserts a path deleted on the branch is absent from `/app`, and that assertion is shown to fail against the current action
- `node_modules` survives — no job reinstalls dependencies, and job times do not regress
- All four consuming workflows still pass
- `ci.md` documents the overlay and why the clean step exists, so it is not later removed as redundant

**MB.43 — Map service errors to GraphQL errors with field-level detail** · 2h

_Story:_ As a workspace member, I want a rule the form could not check to come back beside the field it is about, so that a refusal from the server is as readable as one from my own browser.

**The gap this closes.** M8.8 promises "validation errors return field-level detail" and no task ever says what that detail looks like. §7's mutations return bare entities, `src/lib/errors.ts` deliberately carries no GraphQL code — "the transport decides" — and M3.1 through M3.3 mount Yoga, build the schema and set the armor limits without ever building that transport mapping. So every readable message the services are asked for (M5.2's colliding entry, M5.6/M5.6a's slug, M5.6b's column and ratio, M10.3's explaining refusal) has nowhere to go and no field to land beside, and M5.9's "errors appear beside the offending field" can only mean the resolver's own errors.

Three pieces, specified by §7's Errors subsection:

- **`ValidationError` in `src/lib/errors.ts`**, beside `Forbidden` and `NotFound`, carrying `issues: { path: (string | number)[]; message: string }[]`. **Zod-free** — it carries issues, it does not produce them, so `src/lib/` gains no dependency and a seed or a script can throw one. The Zod adapter that builds the issues list from a `ZodError` belongs beside the schemas, in M4.5.
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

## MW — Wave close-out

_2 done, 12 retired, 1 live: MW.15 at 3 hours_

One per wave, each compressing the live docs and archiving that wave's transcripts and decision records — as MW.1 and MW.2 did. **MW.1 and MW.2 ran. MW.3 through MW.14 are retired without being done (MB.31)** — ids kept, per the MB.19 precedent. The reasoning is in the Execution order section above: the pass is real work, but it is cheaper and more reliable done in the PR that stales a statement than in a scheduled sweep weeks later, and CLAUDE.md now says so.

**MW.15 is not retired.** It is not a compression pass with a bigger diff — it is the pass that ends the mechanism, and the only one whose job cannot be done incrementally: a v1 reader needs the whole set checked against the shipped code at once, and the archive needs retiring exactly once.

**MW.15 carries the v1 close-out** that M11.15 held, which is why it is sized at 3h rather than 1h. The docs a v2 reader opens must be short, true, and the only thing they have to open. Three parts, in this order, because verifying a doc you are about to rewrite wastes the verification, and retiring the archive before the live docs are settled hides what is missing:

1. **Verify.** Walk every live doc in `claude-docs/` and CLAUDE.md against the shipped code. Commands in the Commands table are run, not read; ports, script names, file paths, table and column names are checked to exist. Each disagreement is settled per CLAUDE.md's rule — establish which side is wrong _before_ reconciling them, so a bug is not laundered into documented behaviour by editing the doc to match it.
2. **Compress and close out v1.** The usual Wave 15 compression, plus: rewrite CLAUDE.md as a description of the shipped system rather than of the work, and turn the "Out of scope for v1" list into the v2 backlog it always was. The test of that pass is that nothing a v2 task still needs to read has left CLAUDE.md.
3. **Retire the archive.** Read every file under `claude-docs/archive/` and confirm each settled decision and binding constraint in it is already stated in a live doc — moving it into one where it is not. Then `git rm -r claude-docs/archive/`, and amend CLAUDE.md's compression-pass and archive rules in the same PR, since they would otherwise describe a directory that no longer exists: post-v1, text leaving a live doc either moves to another live doc because it still binds, or is deleted because it does not, and git history is the record.

Part 3 replaces the earlier plan to _fold_ the per-wave archives into a v1 archive with an index. It now carries **more** weight than when it was written, not less: MW.1 and MW.2 each asserted that nothing lives only in the archive before filling it, but the twelve passes that would have re-asserted it are retired, so MW.15 is the one place that claim is checked against the whole directory. Check it a line at a time rather than trusting the two passes that ran. Keeping a directory nobody reads as insurance is the failure mode, not the safeguard, and git history keeps every archived file retrievable in any case — which is what makes this a compression decision rather than a destructive one. MB.31 froze the archive, so its contents are fixed and there is no wave still feeding it.

CLAUDE.md already says nothing new goes into the archive (MB.31); part 3 is what makes the directory itself go. The docs will have changed substantially by the time MW.15 runs, so scope it against the docs as they are then, not as they are today.

MW.15 carries the criteria every pass carried:

- Every statement in every live doc is true as of v1
- Forward-looking rules that still bind later work are kept, not trimmed for reading like background
- History that is still true is kept
- Nothing ends up living only in the archive
- Where a doc and the code disagree, which one is wrong is established before they are reconciled

**MW.15 adds:**

- Every command in CLAUDE.md's Commands table has been run and behaves as documented
- Each doc/code disagreement found is recorded in the PR body with which side was wrong and why — never silently reconciled toward the code
- Every settled decision and binding constraint in `claude-docs/archive/` is demonstrably stated in a live doc before deletion; the PR body lists anything that had to be moved out
- `claude-docs/archive/` no longer exists, and no live doc or code comment links into it — `grep -r 'claude-docs/archive' .` returns nothing outside git history
- CLAUDE.md is a description of the shipped system, its compression-pass and archive rules describe the post-v1 mechanism, and "Out of scope for v1" has become the v2 backlog
- `claude-docs/README.md` describes the layout as it now is
- Nothing a v2 task still needs to read has been trimmed
- `npm run pre-commit` and `npm run test:coverage` are green
