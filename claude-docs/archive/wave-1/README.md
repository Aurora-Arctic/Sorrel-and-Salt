# Wave 1 — FK root

Closed by **MW.1** on 2026-09-11. Wave 1 was M2.2 (Better Auth + the Drizzle
adapter), M2.3 (`users` role, creation rights, admin bootstrap) and MB.5
(`users` foreign keys restored on `auditColumns`).

**Nothing here is required reading.** Every settled decision and binding
constraint these files held was written into a live doc before they moved;
that extraction is the gating step of the pass, not an afterthought. If you
find yourself needing something here to understand the system, the live
summary is missing it — fix the summary, not this copy.

| Archived                                     | Was                               | Where its still-true content now lives                                                                              |
| -------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `transcripts/auth.md`                        | `claude-docs/transcripts/auth.md` | `claude-docs/auth.md` (config, tables, providers, tests), `claude-docs/secrets.md`, `claude-docs/testing.md`        |
| `design-decisions/mb.5-task-resequencing.md` | `claude-docs/design-decisions/`   | `CLAUDE.md` (table-then-behaviour, sweep rule), `claude-docs/TASKS.md` (Execution order, MW namespace), `DESIGN.md` |

Three things were extracted into live docs by this pass specifically because
they existed nowhere else:

- **Don't regenerate the Better Auth schema with `@better-auth/cli`** — it
  is a major behind the installed core → `claude-docs/auth.md`.
- **`unit`-project tests see the plain `sorrel` database**, not a
  per-worker clone; M1.27's template bake will not fix a `unit` test that
  needs schema → `claude-docs/testing.md`, `CLAUDE.md`.
- **Vitest's include glob does reach `src/app/api/auth/[...all]/`** despite
  `[...]` being glob syntax → `claude-docs/testing.md`.
