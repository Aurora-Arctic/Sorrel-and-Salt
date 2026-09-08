# Hotfix branches: multi-target PR flow

A `hotfix/*` source branch always needs to land in both `main` (production) and `staging` (mainline development) — non-negotiable, never asked about. It can _also_ need to land in an in-flight `release/*` branch (so that release doesn't ship without the fix) — this one is conditional, and the Gitflow rules (`CLAUDE.md` today, `.github/workflows/gitflow.yml` once M0.17/M0.20 land it) allow `hotfix/* → release/*` precisely for this case. This is the delta from `SKILL.md`'s single-target flow — steps 1, 2, and 4 (auth, preconditions, offer-to-commit) are unchanged, read those in `SKILL.md` first. From step 3 onward, apply these differences instead of `SKILL.md`'s text for that step:

**Step 3 — target(s).** `main` and `staging` are always targets — skip the AskUserQuestion for them entirely, tell the user this is happening rather than asking. Then check step 2's `git branch -a` for existing `release/*` branches: if none exist, those two are the only targets. If one or more exist, use AskUserQuestion to ask whether to also include one as a third target (options: each existing `release/*` branch, plus "No — just `main` and `staging`"; single-select, since a hotfix backports into at most one in-flight release). From here on, "target" refers to each target in turn (two or three) — steps 5-9 below each run once per target.

**Step 5 — pulling before push.** Only pull from `main`: `git fetch origin main`, then `git merge origin/main`. A hotfix branches off `main`, so merging `staging` or a `release/*` branch into it would drag unreleased work into the PR that lands on `main`.

**Step 6 — pushing.** A hotfix branches off `main`, so "ahead of `main`" is a reliable stand-in for "has any work at all" — a single `git log main..HEAD --oneline` check is enough before pushing (step 7 still evaluates each target's own diff separately).

**Step 7 — gathering context.** Run `git diff <target>...HEAD` and `git log <target>..HEAD` once per target — the diffs will usually differ across targets (e.g. `staging` may already contain commits `main` doesn't), so each PR's summary should reflect its own comparison, not be copy-pasted from another target's.

**Step 8 — drafting.** Reuse the same title across every target's PR unless the diffs genuinely warrant different framing. Each PR gets its own Summary/Test plan body based on its own step-7 diff.

**Step 9 — creating/updating.** Do this independently per target — an existing PR into one doesn't affect the others, and skipping one target (per step 7, if its diff against `HEAD` is empty) doesn't block creating/updating the rest. Report every PR URL back to the user.

**Step 10 — Asana.** Run once, not per target. After every PR has been created/updated, post a single `asana_create_task_story` comment on the task that lists all of them (`main`, `staging`, and the optional `release/*`), then set `In Review` once via `asana_update_task`. If every target only updated an already-open PR, add the comment and leave the status alone. `SKILL.md`'s step 10 covers task identification and the not-found handling unchanged.
