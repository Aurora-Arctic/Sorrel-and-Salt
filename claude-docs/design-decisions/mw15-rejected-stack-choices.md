# MW.15 — Stack choices that were weighed and rejected

**Status:** decided. These rows came from the DESIGN.md decision log, which was retired when the log moved into records.

**Decided:** the project does not use any of the following. Each line gives the reason that still holds.

- **Gatsby, as `resume-2026` uses.** Static site generation has no server runtime for sessions or audit stamping.
- **A Vite single-page app.** Neon has no browser-facing API, and a `created_by` set by the client is forgeable.
- **Supabase.** The free tier pauses after 7 days and needs a manual restore.
- **Render Postgres.** The free instance expires 30 days after creation.
- **Netlify.** Vercel Hobby gives 6,000 build minutes against 300, and native Next.js.
- **Apollo Client.** It duplicates TanStack Query's cache and adds about 40 kB.
- **SQLite for tests.** It cannot run PL/pgSQL triggers, `pg_trgm`, `num_nonnulls`, generated columns or array columns (`celestial_bodies[]`, `elements[]`).
- **Neon branches for CI.** Local Postgres is faster and removes the branch limit and the API key.
- **Server functions instead of GraphQL.** Only about 14 hours of the original plan existed purely for the transport; the rest is services, validation, pagination and batching. One typed contract, an SDL that makes schema changes visible in a PR, and introspection while building were judged worth that. The accepted cost: `updateTag` works only in Server Actions, so it is unreachable behind the route handler.
- **Trunk-based development instead of Gitflow.** Trunk with per-PR previews would remove `gitflow.yml`, three skills, the `staging` branch and its Neon branch-scoped override, but it would also remove the staging soak. Revisit if the promotion pipeline starts costing more than it catches.
- **Better Auth's `anonymous` plugin for signed-out visitors.** It would create a `users` row and a cookie per visit and per crawl, add a third identity bootstrap outside `withAudit`, and make static pages dynamic for nothing a public read needs. A signed-out reader is `null`.
