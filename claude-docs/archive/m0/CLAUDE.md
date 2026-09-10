# Archived from CLAUDE.md — end of M0 (M0.34)

Text the M0.34 compression pass removed from the root [`CLAUDE.md`](../../../CLAUDE.md).
All of it was true when written, earlier in M0, when most of the toolchain
either didn't exist or was still landing. Kept here rather than deleted, per
[`../README.md`](../README.md).

---

## 1. The "pre-scaffold" status line

Sat under the intro paragraph, above Vocabulary:

```
**Status: pre-scaffold.** The repo currently contains documentation only. Nothing under "Commands" exists until the milestone that creates it lands (M0.1–M0.4 for the toolchain, M1.3 for the database scripts). Do not assume a command runs; check first.
```

M0.1–M0.4 landed early in M0. By M0.34 the whole M0 toolchain — Next.js,
lint/format/typecheck, Docker, CI, Ladle, act — exists and runs. The things
that genuinely still don't run are M1/M3 scope and are now marked inline in
the Commands table instead of behind one repo-wide caveat.

## 2. The original Commands table

```
Once M0.4 lands, `make help` lists every target. Expected surface:

| Command                                                       | Purpose                                                           |
| ------------------------------------------------------------- | ----------------------------------------------------------------- |
| `npm run dev`                                                 | Next.js dev server on **8000**                                    |
| `npm run build` / `npm run start`                             | Production build; e2e runs it on **8001**                         |
| `npm run lint` / `format:check` / `typecheck`                 | The pre-commit trio                                               |
| `npm run test:coverage`                                       | Vitest, both projects (`unit` jsdom + `db` node/Postgres)         |
| `make test-stories`                                           | Acceptance suite only; prints a pass/fail line per user story     |
| `make docker-up`                                              | App + Postgres 17 locally, no Neon connection needed              |
| `make db-reset`                                               | Drop, migrate, reseed local                                       |
| `npm run db:generate` / `db:migrate` / `db:seed` / `db:reset` | Drizzle migrations and seed                                       |
| `npm run codegen`                                             | graphql-codegen; CI fails if output is stale                      |
| `npm run workshop` / `workshop:build`                         | Ladle component workshop; `:build` is the static export CI checks |
| `make workshop`                                               | Ladle component workshop on **61000**                             |
| `make act-*`                                                  | Run a CI workflow locally via act                                 |
```

An "expected surface" — forward-looking, written when almost none of it
existed. Three specific problems by M0.34: it listed `test:coverage` (M1.7)
and `test-stories` (M1.28) alongside commands that do run, with nothing
marking them as unbuilt; `make act-*` implied a target per workflow when only
`act-lint`/`act-format`/`act-typecheck` exist (`act-test` chains those three);
and `` `:build` is the static export CI checks `` asserted CI coverage that
does not exist — see item 5.

## 3. The `:coverage` verification note

```
**Verify with the `:coverage` variants.** A plain `npm run test` pass can still fail CI on the 80% threshold (lines, branches, functions, statements) alone. Carried over from `resume-2026`.
```

Present tense about `npm run test`, which does not exist — Vitest arrives in
M1.7. Reworded in the live file to "Once `test:coverage` lands (M1.7), verify
with it", keeping the rule while dropping the implication that either script
runs today.

## 4. Architecture rule 2's enforcement claim

```
Enforced by lint (M1.17, M3.9). `src/graphql/**` and `src/app/**` may not import the client or the repository — they reach services and nothing below.
```

`.oxlintrc.json` carries one rule (`no-console`) and no import restrictions;
M1.17 and M3.9 are unstarted. The bare milestone refs read as citations for an
existing rule rather than as future work, so a session could believe the
boundary is mechanically enforced. Reworded to name them as the tasks that
_add_ the rules.

## 5. Architecture rule 10's CI claim

```
**10. Migrations are expand/contract and forward-only.** No down migrations exist in this repo. Destructive DDL (DROP, RENAME, type narrowing, NOT NULL additions) is flagged by CI and needs an explicit acknowledgement line in the PR body.
```

"is flagged by CI" asserts a mechanism that does not exist — no workflow
checks for destructive DDL. It is M1.5, unstarted. The rule itself stands; only
the enforcement claim was rephrased.

## 6. The component-story convention

```
- **Every standalone component ships an `index.stories.tsx`** in the same directory — no exceptions, `index.tsx` without a sibling story is a broken build. The Ladle workshop (M0.30) discovers components by that file. `npm run check:stories` (M0.33; `scripts/check-component-stories.ts`) enforces it — in pre-commit and, once the CI workflows land, in the build job and the PR gate — and `npm run workshop:build` there fails a story that throws. The gate is scoped to `src/components/`; `.ladle/*.stories.tsx` is the one known non-component location (§M0.32). Stories carry no test ids and no snapshots.
```

The substantive one. "once the CI workflows land" is stale — `build.yml`
(M0.17) and `pr-gate.yml` (M0.20) both landed, and **neither picked the gate
up**. `grep -rn "check:stories\|workshop:build" .github/workflows/` returns
nothing. `m0.33-component-story-gate.md`'s "What this commits later tasks to"
assigned exactly this to M0.17/M0.20; the handoff was dropped. So the sentence
promised CI enforcement that has never existed. Also `(§M0.32)` was malformed —
`§n` denotes a `DESIGN.md` section, `M0.x` a task.

Rewritten to say the gate runs in pre-commit only and that CI does not catch a
missing or throwing story. The CI wiring is filed as its own task.

## 7. The Skills section's gitflow-check claim

```
Skills live in `.claude/skills/<name>/SKILL.md` and are invoked as `/<name>`. M0.10 ported the six Gitflow branch/PR skills from `resume-2026` — the only skills that repo has. All six were portable as-is (nothing Gatsby-specific to leave behind); repo-specific references were adjusted: the enforcing `gitflow` CI check does not exist until M0.17/M0.20, so the skills name `CLAUDE.md`'s Gitflow convention as the current source of truth; `.claude/settings.json` now carries the `permissions.ask` entries the skills rely on; test-plan guidance points at this repo's check surface. The "testing conventions / component documentation / CI debugging" the original breakdown anticipated are **not** skills in `resume-2026` — that guidance lives in its `claude-docs/` and `CLAUDE.md`, and the equivalents are already carried here (Testing section above, `claude-docs/`). See [`claude-docs/agent-skills.md`](claude-docs/agent-skills.md). `start-task` was added later — it's a thin Asana-aware dispatcher that reads a task's `Type` and delegates to `create-feature` or `create-hotfix`.
```

Wrong on two counts: `gitflow.yml` landed in **M0.22**, not M0.17/M0.20 (see
[`../../ci.md`](../../ci.md) and `m0.22-gitflow-rulesets.md`), and "does not
exist until" reads as still-future for a check that has existed since M0.22.
Reworded to the past tense about the M0.10 port, and to point at
`agent-skills.md` for which of the skills' own hedges remain stale.

---

## What this pass deliberately did NOT remove

Recorded so a later pass doesn't mistake these for oversights:

- **Every forward-looking rule about M1+ work** — the services/repository
  boundary, `withAudit`, soft deletes, RLS, caching, SQL filtering, pagination,
  DataLoader, the whole Testing section. None of that code exists yet, but
  these are the rules future tasks are _bound by_, not status claims. Removing
  them would gut the file.
- **Narrative that is merely historical but still true** — e.g. why the port
  came from `resume-2026`. The criterion was "is it out of date", not "is it
  history".
