# N · Wave 07 — Hosting on Vercel Pro and Neon Launch

**The row is** `N7.1 → N7.11`.

**This wave exists because the site moved from Vercel Hobby and Neon's free plan to Vercel Pro and Neon Launch.** Both new plans bill by use, so settings that were fixed or free before now cost money or can be changed. The repo and its docs still describe the old plans, and the hotfix preview does not deploy. The tasks are in [`tasks/v1-next/n7.md`](../../tasks/v1-next/n7.md). The settings, reasons, hotfix setup and sources are in [`ci.md`, "Hosting on Vercel Pro and Neon Launch"](../../design-decisions/ci.md#hosting-on-vercel-pro-and-neon-launch). Every vendor fact in the tasks comes from the vendors' current documentation, and a fact the documentation did not confirm is marked "unconfirmed" in its task, with confirming it part of that task.

**The dashboard settings are the owner's and are not tasks.** The Vercel and Neon dashboard changes (function region, Fluid compute, the AI Bots ruleset, Neon's compute range and history window, the database address Vercel holds, and the branch clean-up) are done by the owner in the vendors' dashboards. The Vercel budget and Neon spending notifications already belong to N6.15 and are not repeated here.

**The order is the order of the row.**

1. **N7.1 comes first.** The hotfix preview does not deploy today: the only hotfix preview run among the last 40 deploy runs (PR #1688, 2026-11-11) failed at the `migrate` job. N7.5, N7.6, and N7.10 are each rehearsed on a hotfix preview, so they need N7.1 working.
2. **N7.2, N7.3, and N7.4 are small settings and config changes** with no dependency on each other. N7.2 needs the Vercel function region from the owner, who chooses it after finding the Neon project's region; without that value the task cannot write the `regions` line.
3. **N7.5 and N7.6 change the production deploy path.** N7.5 adds the rollback workflow and N7.6 adds the check before promotion. Both are proved by one rehearsal each on a throwaway `hotfix/*` branch, after N7.1.
4. **N7.7 caches the form reads** that the Compendium page still repeats on every request, and does not depend on the tasks above. N7.8 is retired: the sitemap and the robots file are already held at the CDN.
5. **N7.9 is research only.** It installs no package. It is measured against N6.3 (the guard against analytics packages) and N6.12 → N6.15 (the site counting its own visits, and the move to Vercel Pro) and changes none of them.
6. **N7.10 tags a hotfix and opens its main-sync PR.** It follows N7.1 because it is rehearsed on a hotfix.
7. **N7.11 is last, and is research first.** It would change how rule 6 of `CLAUDE.md` (never cache anything not keyed by viewer identity) is implemented, so it ends in a proposal to the owner and builds nothing.

**Owner steps that wait on a task.** Protecting the Neon production branch waits for N7.1: a child branch made from a protected branch gets new role passwords, and N7.1 makes the workflow read each hotfix branch's address from the branch-creation step's output instead of assuming it.

**MB.78 (the OAuth proxy for hotfix previews) is retired.** Password sign-in needs no provider redirect, so it replaces the proxy. The preview does not deploy today, so that is untested until N7.1's password sign-in check passes.

**Tasks that already exist elsewhere.** N6.15 (Vercel Pro, 30-day logs, and spend alerts) already owns the Vercel budget. N6.3 and N6.12 → N6.14 stay as they are. ND.1 (hourly crons on Pro) is untouched.

**Every task follows CLAUDE.md's Testing rules.** A config or workflow task is proved by the checks its entry names (`npm run pre-commit`, the next staging deploy, and a rehearsal on a throwaway `hotfix/*` branch), and a task that changes code runs the Vitest files and e2e specs it touches. No criterion asks for a copy, class, layout, or snapshot assertion, and no task is met by a skipped or flaky test.
