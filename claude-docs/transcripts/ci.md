# CI pipeline — transcript

## 2026-09-10 — M1.4: migrate.yml, run ahead of deploy

Added `.github/workflows/migrate.yml`, a `workflow_call`-only reusable
workflow (same shape as `lint.yml`/`format.yml`/`typecheck.yml`) that applies
`npm run db:migrate` against one Vercel environment's `DATABASE_URL`.

`deploy.yml`'s single `deploy` job split into three so migrate can sit ahead
of it with a real `needs:` dependency rather than the `workflow_run`
alternative `DESIGN.md` §12 also allowed:

- `resolve-target` — the old "Resolve deploy target" step, unchanged, just
  promoted to its own job (no secrets needed) since both `migrate` and
  `deploy` now read its `environment`/`prod_flag`/`alias` outputs.
- `migrate` — `needs: resolve-target`, calls `migrate.yml` with
  `secrets: inherit`. Carries its own `group: migrate` /
  `cancel-in-progress: false` concurrency lock, deliberately global rather
  than per-environment — the acceptance criterion is "two merges cannot
  migrate at once," full stop, and a shared lock is simpler to reason about
  than one scoped per target.
- `deploy` — `needs: [resolve-target, migrate]`, `if: success()`. The
  `success()` is load-bearing: a job-level `if:` replaces the implicit
  "all `needs` succeeded" check GitHub Actions would otherwise apply, so
  without it a failed migration would not actually block the deploy step —
  exactly the acceptance criterion ("workflow fails loudly and blocks the
  deploy on a migration error").

`migrate.yml` resolves `DATABASE_URL` the same way `deploy.yml`'s own
`vercel pull` step does — `vercel pull --environment=<preview|production>`,
same flag deploy.yml passes, so it picks up the same branch-scoped `staging`
override / per-hotfix ephemeral Neon branch distinction the M1.1 branch
strategy record describes — then reads it out of the pulled
`.vercel/.env.<environment>.local` file (`vercel pull` doesn't export
`DATABASE_URL` as a job env var on its own; `drizzle.config.ts` needs it in
`process.env` to run `drizzle-kit migrate`), masking the value with
`::add-mask::` before it can reach the log.

Applies to all three deploy triggers via `resolve-target`'s existing
condition: push to `staging` and push to `main` (obviously), and — since the
task's own description explicitly named it — a `hotfix/** → main` PR too,
with `environment=preview` same as a `staging` push.

**Left unresolved, flagged rather than fixed:** `claude-docs/ci.md`'s Deploy
section states the four `VERCEL_*` secrets "are set as repo secrets, so the
deploy runs for real," but the M0.27 Asana task ("Define environment
variable and secrets matrix") that would set them is `On Hold`, and
`deploy.yml`'s own header comment still says they "do not exist yet." Left
that line as-is rather than silently picking a side — `migrate.yml`'s guard
step behaves correctly either way, skipping the real work greenly if the
secrets are in fact absent.
