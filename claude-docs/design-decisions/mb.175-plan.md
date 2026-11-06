This is MB.175's approved plan.

# MB.175 — Scope Help and FAQ Articles (plan)

## Context

MB.175 (#690, Not Started, milestone Wave 15) is a scoping task: it records the help-article model, the glossary and sub pages in the docs and mints the five build tasks. Nothing is built.

You asked for two things this session:

- **Placement:** move MB.175 out of Wave 15 and into Wave 17, **before M17.6**.
- **Order with M17.3:** MB.175 runs before M17.3 finishes. M17.3's branch (`/home/node/worktrees/m17.3`, unpushed) already holds a copy of MB.175's retitle commit (`5bfc4273f`). Its M20.15 (the help page for the warnings) depends on "MB.175's build tasks", which do not have ids yet. MB.175 mints those ids first. Then M17.3 rebases onto staging, the duplicate retitle commit drops out, and M20.15 names the new ids.

M17.2 is merged (#1554). The `parent_id` amendment it asked for is already in #690's body.

## Where the work happens

- Worktree `/home/node/worktrees/mb.175-scope`, branch `feature/mb.175-scope-help-and-faq-articles`. It holds one commit, the retitle (`6113047d4`), and is not pushed. Rebase it onto `origin/staging` and reuse it. I do not create a new branch.
- `/home/node/worktrees/mb.175-glossary` is clean, sits at staging and holds no commits. I leave it alone. If you want it removed, tell me.
- Step 1: `node scripts/task-board.mjs status MB.175 "In Progress"`.

## Changes (docs only)

1. **Placement**
   - `claude-docs/TASKS.md`: remove MB.175 from Wave 15's row. Wave 17's row becomes `M17.1 → M17.3 · M17.5 · M17.4 · MB.175 · M17.13 → M17.17 · M17.6 → M17.12 · MB.163`. Correct the "Unscheduled by design" paragraph (line 66).
   - `claude-docs/waves/wave-15.md` line 27: say MB.175 moved to Wave 17.
   - `claude-docs/waves/wave-17.md` line 21: replace the "stay on Wave 15" paragraph with the move. It gives the date (the owner's call of 2026-11-06) and says MB.175 and its five tasks sit after M17.4 and before the M17.6 audits, so the accessibility audit (M17.9) scans the help pages. MB.78 stays on Wave 15.
   - **What the move changes, stated in the docs:** the help pages ship after launch, not in v1. Wave 15's axe sweep (M11.16, M11.8) no longer covers them; M17.9 does. "v1 scope" becomes "fast follow" in the mb.md entry, the waves and DESIGN.md.
   - Move the issue's milestone to Wave 17 by the method `claude-docs/task-tracking.md` gives (sync, or the script's milestone command).
2. **The model**, as #690's body sets it out, recorded in DESIGN.md §5 (the `help_articles` table: `kind` `faq`/`article`/`term`, nullable `parent_id`, one level deep, pointing at an `article`; `slug` unique among live rows; `glossary` reserved), §7 (services: `assertSiteAdmin` writes, a sessionless finder cached under tag `help`), §9 (`/keepers/help`, `/help`, `/help/glossary`, `/help/[slug]`, `/help/[parent]/[slug]`, PUBLIC_ROUTES, sitemap, links) and §10 ("Help and FAQ articles").
3. **The record:** `claude-docs/design-decisions/mb.175-help-articles.md`. It weighs rows against files in the repo and names the two invariants it widens. **Module: I recommend a sixth module, `help`.** The articles have no tie to identity, and `claude-docs/modules.md` "Adding a module" gives the steps. Copy this plan in as `design-decisions/mb.175-plan.md`.
4. **CLAUDE.md:** amend the two lines. "Keepers and curators curate …" gains the help articles (writes are admin only). "The compendium is the one public surface" gains `/help`, which carries no workspace data.
5. **Mint the five build tasks** in `claude-docs/tasks/m17.md`. Ids M17.13–M17.17 are free on every branch and on the board (checked today). Recheck just before minting. Each task gets an estimate and names its prerequisite:
   - M17.13 the table, with `parent_id` (after MB.175)
   - M17.14 services and GraphQL (after M17.13)
   - M17.15 the `/keepers/help` admin page (after M17.14)
   - M17.16 the public pages: `/help`, `/help/glossary`, the nested child route and the children list, plus the story numbered next free (after M17.14)
   - M17.17 the `help` seed with the glossary terms, `migrate.yml` and `deploy.yml` (after M17.13)

   Then run `task-board.mjs sync` from the worktree.

6. **Bring the `mb.md` entry (line 5220) up to date** with #690's body: both amendments and the new placement.

## Who does it

One Sonnet agent in the worktree, briefed with these paths. Its brief tells it to describe every Bash call in one short sentence, to commit each step, and not to push. I review its work and comment on the board.

## Verification

This diff is prose only, so I run `npm run format:check` and `npm run lint`, and no tests. I check that every acceptance criterion in #690 maps to a line in the diff. After the merge, `reorder` is run from a staging checkout, dry run first.

## After MB.175

M17.3 rebases onto staging and names M17.16 (the public pages) as M20.15's prerequisite. Nothing in this PR edits the M17.3 branch.
