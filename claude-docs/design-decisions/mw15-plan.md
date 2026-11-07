# MW.15 plan: the v1 docs close-out, with M11.12 and MB.90

Approved by the owner on 2026-11-07 and run overnight in one PR. The decision records this close-out produced are the `mw15-*` files beside it; this file is the plan and the owner's answers it ran under.

## Principles (the owner's)

1. The docs hold only what adding a feature needs. History that informs no future decision is archived; closed-wave task material may go.
2. One home per fact. Never drop a fact; move it.
3. Anything that would rule out an old decision is a question for the owner, not a change.
4. Two audiences: people (`README.md`, `claude-docs/day-1.md`) and agents (`CLAUDE.md`, the rules, the skills, the summaries). Both concise.
5. The layout may be reorganised for cleaner writing and cheaper parsing.
6. A code comment holds only what is strictly necessary to warn of a nuance; the details are in the docs, cited.

## Owner decisions (2026-11-07)

1. **The old `claude-docs/archive/` and `transcripts/` are kept, compressed.** History lives under `claude-docs/archive/` as one gzipped tarball per kind (closed task entries, superseded decision records, transcripts, the deity Sources citations, the old archive); several files are fine. Git history holds the plain text.
2. **`archive/compendium-seed-shards/` stays plain** until MB.249 closes.
3. **Decision records marked history are archived**, `m12.8-jar-follows-local.md` among them. A record a live doc cites as its decision record is not history and stays.
4. **Closed-wave task entries are archived whole**; the live entry keeps only the lines the scripts read (its heading). Anything crucial for future development moves into a topic doc first.
5. **DESIGN.md §14 is retired**: its binding rows become records; the rest is in git.
6. **DESIGN.md §5, §7 and §9 are split** into `claude-docs/design/`.
7. **`claude-docs/backlog.md` is the one home for deferred work**; `CLAUDE.md` keeps a one-line do-not-build pointer.
8. **No doc states a seed count**: seeded content is subject to change.
9. **A component doc exists only where it holds a binding fact the source cannot say**; a sub-part is covered by its parent's doc.
10. **The eleven components without a story owe one**: the rule stays, and M17.20 adds them.
11. **The deity Sources citations are archived**; the annotations stay in the seed doc.
12. `claude-docs/backlog.md` stays.
13. **The story-numbering rule lives in `claude-docs/testing/acceptance.md`.**
14. **M17.19 (one Drizzle snapshot) is minted and built in this PR.**
15. The stale Vercel Preview note in `secrets.md` is removed, the credentials having been reset.
16. A dev server for the owner is started only on a port the owner names, never offered.
17. A review or an audit starts in a worktree unless the owner says otherwise.

## Lanes

Each lane edited only its own paths in the shared worktree, committed with a pathspec under a lock, and wrote any fact that belonged to another lane's file to a shared facts file, which an integration pass folded in. Every doc/code disagreement a lane fixed is listed in the PR body with the side that was wrong.

| Lane       | Scope                                                                                                                                                                            |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A          | `CLAUDE.md`, the rule files, the skills, `modules.md`, `task-tracking.md`, `commands.md`; a new `.claude/rules/domain.md`                                                        |
| B          | The subsystem summaries (`db/`, `auth/`, `ci/`, `testing/`, `graphql/`, `billing/`, `compendium/`), then the integration of every facts file and the repoint of every moved path |
| C          | `design-decisions/`: closed-wave plans read and deleted after their facts moved, records trimmed, `INDEX.md`                                                                     |
| D, D2      | `TASKS.md`, `tasks/`, `waves/`: narration out, closed waves archived, entries cut to their headings                                                                              |
| E          | `components/`: the five largest rewritten, 14 small docs folded, dated attributions out                                                                                          |
| G, G2      | `DESIGN.md` corrected against the code, then split; `README.md` setup                                                                                                            |
| M          | MB.90: `.env.example`, `scripts/setup.ts`, the env guard, `day-1.md`                                                                                                             |
| F1–F4      | Code comments in `src/modules`, `src/components` + `src/emails` + `src/app`, the `.scss` files, and `src/lib` + `src/db` + `src/graphql` + `scripts` + `tests`                   |
| M17.19     | Mint M17.19 and M17.20; build M17.19                                                                                                                                             |
| Archive    | The tarballs and `archive/README.md`                                                                                                                                             |
| Loss audit | Every removed sentence checked against the live tree; what was stated nowhere was restored                                                                                       |

## Verification

The loss audit took every line removed since `origin/staging`, kept the fact-shaped sentences, matched each against the live docs and code, and read every unmatched one: two facts were stated nowhere and were restored, the rest were history, plan steps or stated elsewhere. Then `lint`, `format:check`, `typecheck`, `test:coverage` and a production build into a separate dist dir.
