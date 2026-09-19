# Wave 2 — Write path

Closed by **MW.2** on 2026-09-17. Wave 2 was M1.16 (`repository.ts` and
`withAudit`), M1.19 (`app.current_user_id` per transaction), M1.17 (the
`no-restricted-imports` client boundary), MB.14 (`VITEST_POOL_ID` as the
per-worker database slot), M1.20 (the soft-delete finder builder and its
guard), MB.15–MB.18 (CI and doc corrections: the redundant smoke-check
workflows deleted, the Postgres version corrected, `build-db-image`'s dead
`latest` tag dropped and its skip-if-exists check added), MB.20 (dropping
`@pothos/plugin-drizzle`), MB.21 (Drizzle Studio), MB.22 (the debugging
tooling) and MB.23 (Playwright codegen and the display it needed).

**Nothing here is required reading.** Every settled decision and binding
constraint these files held was written into a live doc before they moved;
that extraction is the gating step of the pass, not an afterthought. If you
find yourself needing something here to understand the system, the live
summary is missing it — fix the summary, not this copy.

| Archived                                                  | Was                                           | Where its still-true content now lives                                                      |
| --------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `design-decisions/mb.20-pothos-without-drizzle-plugin.md` | `claude-docs/design-decisions/`               | `DESIGN.md` §2 (why the plugin is out) and §7 (the four rules it sets), `claude-docs/db.md` |
| `design-decisions/mb.22-playwright-in-devcontainer.md`    | `claude-docs/design-decisions/`               | `claude-docs/debugging.md`, `claude-docs/testing.md`                                        |
| `design-decisions/mb.23-codegen-needs-a-display.md`       | `claude-docs/design-decisions/`               | `claude-docs/debugging.md`, `claude-docs/docker.md`, `claude-docs/ci.md`                    |
| `transcripts/debugging.md`                                | `claude-docs/transcripts/debugging.md`        | `claude-docs/debugging.md` (the whole subsystem summary is MB.22/MB.23's output)            |
| `transcripts/db.md`                                       | `claude-docs/transcripts/db.md`'s M1.19 entry | `claude-docs/db.md`, "`app.current_user_id`, published per transaction"                     |

Six things were extracted into live docs by this pass specifically because
they existed nowhere else:

- **Every Pothos package in the stack is a stable major**, and **the GraphQL
  layer imports `drizzle-orm` for types only** — two rules MB.20 set for M3
  that had no home outside its record → `DESIGN.md` §7, alongside "a
  per-table audit shape is a bug."
- **`PLAYWRIGHT_WS_ENDPOINT` must stay scoped to the `devcontainer` compose
  service.** Setting it in an npm script or in `playwright.config.ts` would
  silently make CI and `make docker-e2e` depend on `playwright-server` being
  up → `claude-docs/debugging.md`, `claude-docs/testing.md`.
- **Rebasing the devcontainer off Debian was considered and rejected** —
  only the browser needs glibc, and rebasing reverses M0.11 for one process
  → `claude-docs/debugging.md`.
- **`DISPLAY` must be declared on the `playwright-server` compose service**,
  not only exported by its entrypoint, because `docker compose exec` starts
  a fresh process from the container's initial environment →
  `claude-docs/debugging.md`.
- **One display per container (so one headed session at a time), and the
  revisit trigger**: if Playwright ever adds recording to UI mode, the
  display stack can be retired → `claude-docs/debugging.md`.
- **The remote branch moves `baseURL` to `http://devcontainer:8001` but
  leaves `webServer.url`'s readiness poll on `localhost`** — the poll runs
  in the runner's own process, so the asymmetry is correct and matching the
  two breaks one of them → `claude-docs/debugging.md`.

Two corrections were made rather than carried forward, in both cases because
the code was right and the doc was wrong:

- `CLAUDE.md`'s rule 3 said `withAudit` issues `SET LOCAL
app.current_user_id = '<uuid>'`. `src/db/repository.ts` deliberately issues
  `select set_config('app.current_user_id', $1, true)` instead, because
  `SET LOCAL` takes no bind parameters. `CLAUDE.md`, `DESIGN.md` §5 and
  `TASKS.md`'s M1.19 body now all say so.
- `claude-docs/ci.md` said all four `VERCEL_*` secrets were set and the
  deploy runs for real. That predated M0.27's secrets audit; `VERCEL_SCOPE`
  is still unset and MB.12 owns it. `claude-docs/secrets.md` is the source of
  truth for which rows are set, and `ci.md` now points at it.

`MB.22`'s record carried a standing "authored without a live `docker compose`
run, needs host-side verification" caveat. MB.23's manual verification pass
closed it — it exercised `playwright-server` for real and found four bugs
reasoning alone had missed. Nothing outstanding moved into this archive.

**Not archived here, deliberately:** `claude-docs/transcripts/db.md`'s M1.2
and M1.15 entries, and the whole of `transcripts/ci.md` and
`transcripts/testing.md`, stay live. They record M1 work that landed before
the wave order existed, so no `MW.<n>` owns them; a later pass that wants to
retire them should say which wave it is filing them under rather than
labelling them Wave 2.
