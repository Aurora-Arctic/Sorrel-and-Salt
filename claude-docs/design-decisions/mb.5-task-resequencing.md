# Re-sequencing the task breakdown by real dependencies

**Status:** decided · **Date:** 2026-09-10

`claude-docs/TASKS.md` was written feature-first: each milestone creates its own
tables. Several foundational tasks need most of the schema at once, so tasks were
scheduled before the tables they operate on existed. This record captures the
re-sequencing, what it deliberately does not change, and the two spec gaps it
exposed.

## The root cause

Every table spreads `...auditColumns`, whose three `*_by` columns reference
`users` — created in M2.3. An FK target must exist before the FK, so `users` is
the first node of the only valid creation order, and in the original numbering it
sat behind ten other tables.

This was not theoretical. It had already forced three workarounds into shipped
code:

| Task  | Workaround                                                       | Recorded in                        |
| ----- | ---------------------------------------------------------------- | ---------------------------------- |
| M1.9  | Clones an empty template                                         | `m1.9-test-db-isolation.md`        |
| M1.11 | Reseeds from template because `seed()` throws for every scenario | `m1.11-e2e-reseed-without-seed.md` |
| M1.15 | `auditColumns` shipped without the FKs §5 mandates               | comment at `src/db/audit.ts:3-5`   |

The fix costs no rework because `src/db/schema/` still contains only `.gitkeep`.
Zero tables exist, so no retrofit migration is needed — which is exactly why this
had to happen now rather than after Wave 3.

## Decided

**Task IDs are immutable.** Execution order and grouping change; identifiers never
do. Renumbering would invalidate git history, branch names, three
`design-decisions/m*.md` filenames, and 45 files in `claude-docs/archive/`, which
is write-once and could never be corrected. The schedule therefore lives in
TASKS.md's **Execution order** section, not in the milestone numbering.

**TASKS.md is corrected in place.** "Frozen" means not re-scoped, not
never-corrected. CLAUDE.md's description of it was updated to match.

**Land the DDL early, the policies late.** The two halves are already different
migrations and different tasks, and they separate cleanly. DDL is fully specified
by §5, is inert until something queries it, and is cheapest to constrain while the
table is empty. Policies carry the real uncertainty, must be written against the
services they backstop, and — critically — would filter the seeds if they landed
first. Hence tables (W3) → seeds (W4) → policies (W5).

**New work uses the `MB.*` namespace** (MB.5–MB.11), which adds tasks without
touching an immutable ID.

**M10.3 stays whole in Wave 5** rather than moving its column into Wave 3. Its PR
pays the M1.5 destructive-DDL acknowledgement line, which is the deliberate price
of keeping its "existing seeded spells migrate" criterion meaningful — and makes
it the first migration to exercise expand/contract for real, on seed data rather
than production rows.

## Rejected: keeping milestones as the unit of dependency

The ordering bug was a **granularity** mistake that scheduling exposed, not a
scheduling mistake. Milestones were treated as the unit of dependency when the
task is. The breakdown already cleaves at the right boundaries almost everywhere —
M10.2/M10.3 and M6.2/M6.4 are already separate tasks — so the fix was to stop
treating each pair as one milestone-shaped unit, not to re-cut the tasks. The
convention is now recorded in CLAUDE.md as **a table task, then a behaviour task**.

The one genuine bundle is M9.2, which carries `inventory_items` and the shared
unit-to-dimension module. It is called out in TASKS.md as the exception rather
than silently split.

## Two DESIGN.md gaps this exposed

Per CLAUDE.md the design doc wins, so §9 changed first and the tasks were written
against it. In both cases the requirement already existed in a task; only its home
in the spec was missing.

- **MB.6 — the spell recipe view.** M10.22 and CLAUDE.md both reference "the spell
  recipe view", and story 56 is about _reading_ a spell, but §9's route table had
  no spell detail route. `/grimoire/new` is the builder; you cannot print a saved
  spell from it. §9 gained `/coven/[slug]/grimoire/[id]`.
- **MB.7 — the application nav shell.** M8.16 and M8.17 require the add and edit
  modals to be "reachable from the main nav on any page", but no task and no route
  built an app-wide nav. `WorkspaceSwitcher` (M6.9) and the coven layout (M6.10)
  do not cover it, and both compendium and ingredient detail sit outside
  `/coven/`. §9's Components list gained `AppShell`.

## Wave close-out replaces milestone close-out

CLAUDE.md requires a compression pass at the end of every milestone. Under the
wave order a milestone is no longer contiguous — M4's tasks land in waves 3, 4, 8
and 11 — so a milestone-anchored pass would compress documentation for work that
shipped weeks apart. The pass is now anchored to the wave (`MW.1`–`MW.15`), and
the eleven milestone-anchored compression tasks are retired.

## The docs had also fallen behind the board

The audit surfaced a second, unrelated defect: `TASKS.md` and `TASKS.csv` were
missing 23 tasks that existed on the Asana board — M0.34–M0.37, M2.10, M7.A.1,
M8.13a, MB.1–MB.4, and the eleven compression tasks. The drift was one-directional;
nothing on the board was absent from the docs. All are now written into both files,
and CLAUDE.md's Asana section says explicitly that a task added to the board is
added to the docs in the same pass.

`M8.13a` mattered beyond bookkeeping: it owns safety presentation, and the
re-sequencing had provisionally given that to M8.14. M8.13a's own acceptance
criteria already named M8.14, M8.19 and M10.18 as its consumers, so the board was
ahead of the plan. M8.13a keeps ownership and lands before all three.

## Known trap

RLS (Wave 5) lands after the seeds (Wave 4) and will filter them. This is already
an M6.4 acceptance criterion, and the mechanism — a `BYPASSRLS` seed role, or
setting `app.current_user_id` to the bootstrap user around the seed — must be
decided when M6.4 is written, not discovered when it breaks.
