# Secrets and environment variable matrix — summary

M0.27. Every secret this app needs, where it lives, and whether it's set —
so a deploy never discovers a missing one mid-flight. Nothing here is a
value; this doc names variables, not secrets.

**History.** This task was put On Hold on 2026-09-08: writing the full
matrix before the underlying deployment features existed (no Neon
branches, no OAuth apps, no Vercel environments) would have been
speculative. A carve-out landed anyway — `VERCEL_DEPLOY_TOKEN`,
`VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` were added directly to GitHub Actions
secrets so `deploy.yml`/`migrate.yml` could exist and stub-skip cleanly
(M0.26/M0.28). Resumed and this doc written on 2026-09-11, alongside
M2.2/M2.4/M2.5's auth code.

**Status as of MW.2 (2026-09-17), unchanged since MW.1:** the three deploy
secrets above are set,
and the Google/GitHub OAuth apps are registered with their four client
id/secret variables set locally and in Vercel. Four rows are still
outstanding — `ADMIN_BOOTSTRAP_EMAIL`, `VERCEL_SCOPE`, `NEON_API_KEY`,
`NEON_PROJECT_ID` — so no account can be promoted to admin and
`migrate.yml` still stub-skips instead of applying migrations. **MB.12 owns
closing those rows and confirming a real browser sign-in**, and it waits on
M2.6's sign-in page. See "How to set each row" for the exact manual steps —
none can be done from this repo or by an agent without your
Vercel/Neon/Google/GitHub accounts.

## Vercel environment variables

Set per Vercel **Environment** (Production, Preview), not per branch —
`staging` and any `hotfix/**` preview both resolve through Preview, unless
a row below says otherwise.

| Variable                       | Production                                     | Preview (staging + hotfix)                                                                                                                                                                                                                                                                          | Read by                                                                                                                                                                                                  |
| ------------------------------ | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                 | `main`-backed Neon branch connection string    | `staging`-backed Neon branch, pinned with a **branch-scoped** override (`vercel env add DATABASE_URL preview staging`) — see `design-decisions/m1.1-neon-branch-strategy.md`. A hotfix preview gets its own ephemeral branch from the Neon/Vercel integration instead, unaffected by that override. | `src/db/connection.ts` — throws if unset, always                                                                                                                                                         |
| `BETTER_AUTH_SECRET`           | real, high-entropy (`openssl rand -base64 32`) | **one value shared with Production** (MB.47) — see the note below                                                                                                                                                                                                                                   | `src/lib/auth.ts` — required whenever `NODE_ENV=production`, which every Vercel build is                                                                                                                 |
| `GOOGLE_CLIENT_ID` / `_SECRET` | Production OAuth client                        | reuse the same client registered for `staging` below                                                                                                                                                                                                                                                | `src/lib/auth.ts`'s `socialProviders()` — omitted entirely, not broken, if unset                                                                                                                         |
| `GITHUB_CLIENT_ID` / `_SECRET` | Production OAuth client                        | reuse the same client registered for `staging` below                                                                                                                                                                                                                                                | same                                                                                                                                                                                                     |
| `ADMIN_BOOTSTRAP_EMAIL`        | the real admin's email                         | can differ from Production's                                                                                                                                                                                                                                                                        | `src/lib/auth.ts`'s `isAdminBootstrapEmail()` — compared case-insensitively; promotes the matching sign-in to `admin` on `databaseHooks.user.create.before`, omitted entirely (nobody promoted) if unset |

**`BETTER_AUTH_SECRET` is one value across both environments** (MB.47), which
reverses what this table used to say. The old advice — a separate Preview value,
"safer than reusing Production's" — is sound in general: a leaked preview secret
that also signs production sessions is a forged login. It was set aside
deliberately, because CI needs a readable copy of this value and one shared
secret is one thing to keep in step rather than two. Revisit it at the public
launch, when a leaked preview secret stops being a pre-launch inconvenience.

**Known, and deliberately not fixed yet:** the current value is short and
low-entropy — Better Auth says so itself in every build log ("your
`BETTER_AUTH_SECRET` should be at least 32 characters long", "appears
low-entropy"). Regenerating it with `openssl rand -base64 32` invalidates every
existing session, which is free now and expensive after launch. **Do it before
the site is public**, and while the sessions being thrown away are still only
yours.

**No `BETTER_AUTH_URL` row — deliberately.** A single Preview-scoped value
can't be correct for both `staging` (a fixed alias) and a hotfix preview
(its own ephemeral `hotfix-<slug>.sorrelandsalt.com` domain per open PR,
`deploy.yml`'s own aliasing): Vercel's Preview scope applies to both
uniformly, so staging's URL would leak into every hotfix preview's OAuth
`redirect_uri` if this were an env var. Handled in code instead —
`src/lib/auth.ts`'s `baseURL()` uses Better Auth's `allowedHosts`
(wildcard-capable) to resolve the right origin per request, scoped to
`NODE_ENV=production` only. An unrecognized `Host` header resolves to the
production URL rather than being reflected into a redirect — verified by
curling a built server with a spoofed `Host: evil.example.com`. Nothing to
set in Vercel for this one.

**Hotfix previews still can't complete a real Google/GitHub sign-in.**
`allowedHosts` above only fixes what URL this app _tells_ Google/GitHub to
redirect back to — it can't make Google or GitHub accept a redirect URI
that was never registered. Both require an exact, pre-registered URI, and
there's no way to register one for a hotfix slug that doesn't exist yet.
The sign-in flow only works end-to-end on `staging` and Production, whose
domains are known ahead of time. If a hotfix build ever needs to exercise
a real sign-in, do it against `staging`'s URL rather than the hotfix
preview's own.

**`vercel pull` cannot give CI `DATABASE_URL` or `BETTER_AUTH_SECRET`, and that
is by design** (MB.47). Both are marked Sensitive in Vercel, and a Sensitive
variable cannot be read back — the pull says so ("Secret values cannot be
pulled from the `<env>` Environment") and writes `[SENSITIVE]` in place of the
value. That is a perfectly non-empty string, so it sails through any check that
only asks whether something is set, which is how it once reached `drizzle-kit`
and produced an `ERR_INVALID_URL` with its own input masked out of the stack
trace. A diagnostic run pulled staging both with and without `--git-branch` and
got the placeholder either way; no arrangement of flags changes it.

So **CI keeps its own copy of exactly those two**, and nothing else:

| Value                | CI source                                          | Why                                                                 |
| -------------------- | -------------------------------------------------- | ------------------------------------------------------------------- |
| `DATABASE_URL`       | `DATABASE_URL_PRODUCTION` / `DATABASE_URL_STAGING` | Differs per target, so one named secret each                        |
| `BETTER_AUTH_SECRET` | `BETTER_AUTH_SECRET`                               | One value for both environments, so one secret                      |
| a hotfix preview     | the pulled `POSTGRES_URL`                          | Its Neon branch is created per deployment; no static value names it |

**The runtime is untouched.** A deployed function reads its environment from
the Vercel platform, not from the pulled file. Only `vercel build` and
`drizzle-kit migrate` read that file, and both run in CI — so this is a CI
problem with a CI answer, and the Sensitive flag stays on.

**Named secrets rather than GitHub Environments**, deliberately: an environment
would need a new `workflow_call` input, a new `resolve-target` output and an
`environment:` key on two jobs, to express what the secret's name already says.

**The cost, stated as a rule rather than hoped away: the connection string now
lives in two places.** Rotating a database credential means changing it in
Vercel _and_ in the matching GitHub secret. A drifted copy does not error — it
migrates the wrong database silently. `deploy.yml` and `migrate.yml` select
between the same two secrets the same way, and
`tests/guards/ci-secret-environments.test.ts` is what holds those two
selections together.

**Worth retiring once MB.12 lands.** With `NEON_API_KEY`/`NEON_PROJECT_ID` set,
`GET /projects/{id}/connection_uri?branch_id=…` would give every branch its own
connection string from Neon directly — one source of truth, no second copy, and
ephemeral branches covered too. It is not done now because those keys do not
exist, and because a project-wide Neon API key is a broader credential than one
connection string. It would not replace `BETTER_AUTH_SECRET` either way.

`--git-branch` stays on the preview pull regardless (MB.27): the two GitHub
OAuth secrets exist _only_ as `staging`-branch-scoped rows and are absent from
an unscoped pull. The production pull passes no branch and must not — Vercel
rejects the pair with
``Invalid request: `target` must be "preview" when specifying a `gitBranch` `` —
so each workflow pulls through two steps, one per target (MB.45).

`scripts/assert-pulled-env.ts` (MB.46) reports every key a pull returned, with
a classification and a length and never a value, so which variables survived is
a fact CI states rather than one inferred from which consumer broke first.

## GitHub Actions repository secrets

Used by `deploy.yml`/`migrate.yml` to drive the Vercel CLI and, on
production only, a pre-migration Neon snapshot (`claude-docs/db.md`,
"Snapshot before production migrations"). None of these are read by
`pr-gate.yml`'s own build/test/lint jobs — **no
credential is required to run tests locally or in a PR check**, per
M0.27's own acceptance criteria.

| Secret                    | Status          | Where it comes from                                                       |
| ------------------------- | --------------- | ------------------------------------------------------------------------- |
| `VERCEL_DEPLOY_TOKEN`     | **Already set** | Vercel account settings → Tokens                                          |
| `VERCEL_ORG_ID`           | **Already set** | `vercel link` locally, or the Vercel project's Settings → General         |
| `VERCEL_PROJECT_ID`       | **Already set** | same                                                                      |
| `VERCEL_SCOPE`            | Not set         | the Vercel team/org slug                                                  |
| `DATABASE_URL_PRODUCTION` | **Already set** | Neon console → the `main` branch → Connection Details (MB.47)             |
| `DATABASE_URL_STAGING`    | **Already set** | Neon console → the `staging` branch → Connection Details (MB.47)          |
| `BETTER_AUTH_SECRET`      | **Already set** | the same value set in Vercel; one shared across both environments (MB.47) |
| `NEON_API_KEY`            | Not set         | Neon console → Account settings → API keys                                |
| `NEON_PROJECT_ID`         | Not set         | Neon console → the project's Settings → General                           |

## How to set each row (manual — needs your accounts)

Nothing here can be done from this session: I don't have Vercel, Neon,
Google Cloud, or GitHub-OAuth-app access, and the `gh` token this repo's
devcontainer carries isn't scoped to manage Actions secrets/variables
(confirmed — `gh secret list`/`gh variable list` both 403 here).

1. **Vercel env vars** (`DATABASE_URL`, `BETTER_AUTH_SECRET`, the four
   OAuth vars, admin email): Vercel dashboard → Project → Settings →
   Environment Variables, or `vercel env add <NAME> production` /
   `vercel env add <NAME> preview` from a machine with the Vercel CLI
   installed and linked to this project (this devcontainer doesn't have
   the CLI — the Vercel plugin session hint at the start of this
   conversation already flagged that). `DATABASE_URL` for `staging`
   specifically needs the branch-scoped form above, not the plain
   `preview` one.
2. **Neon connection strings**: Neon console → the project → each branch
   (`main`, `staging`) → Connection Details.
3. **Google OAuth client**: Google Cloud Console → APIs & Services →
   Credentials → Create OAuth client ID (Web application). Authorized
   redirect URIs — one client, two real rows (see above for why hotfix
   isn't a third):
   - Local: `http://localhost:8000/api/auth/callback/google`
   - Staging: `https://staging.sorrelandsalt.com/api/auth/callback/google`
   - Production: `https://sorrelandsalt.com/api/auth/callback/google`
4. **GitHub OAuth App**: GitHub → Settings → Developer settings → OAuth
   Apps → New OAuth App. GitHub allows only **one** callback URL per OAuth
   App (unlike Google), so this needs either three separate GitHub OAuth
   Apps (one per environment, each with its own client id/secret) or one
   App per non-local environment plus a local-only one — register
   `.../api/auth/callback/github` under whichever split you'd rather
   maintain.
5. **`NEON_API_KEY`/`NEON_PROJECT_ID`** (the only two GitHub Actions
   secrets still missing): this repo's Settings → Secrets and variables →
   Actions → New repository secret, or `gh secret set <NAME>` from a
   machine whose `gh` token has the Actions-secrets permission (this
   session's doesn't).
6. **M0.26's Vercel dashboard settings** — already done (deploy previews
   off, `staging` aliased to `staging.sorrelandsalt.com`; M0.26 is
   Completed in Asana). Recorded here for completeness: Project → Settings
   → Git (deploy previews) and → Domains (the staging alias). Nothing in
   this repo drives that — `vercel.json`'s `deploymentEnabled: false`
   already stops the Git integration from deploying anything itself
   (CLI-driven `deploy.yml` is the only path, per that file's own header
   comment), but the staging alias and turning previews off in the
   dashboard are separate settings this doesn't touch.

## What's already true without any of the above

- Everything above is additive to what already works: local dev, the full
  Vitest suite, and CI's lint/typecheck/build/vitest/playwright jobs all
  run with **no** real secret, using the fixed non-secret
  `local-dev-not-a-real-secret` placeholder for `BETTER_AUTH_SECRET` where
  a production-mode build needs one at all (`claude-docs/auth.md`).
- `src/lib/auth.ts` already reads all four OAuth env var names
  (`GOOGLE_CLIENT_ID`/`_SECRET`, `GITHUB_CLIENT_ID`/`_SECRET`) and a
  provider is registered the moment both halves of a pair are set, and
  already resolves the right `baseURL` for Production/staging/any hotfix
  preview with no env var at all — no further code change is needed once
  real credentials land in Vercel.
- `deploy.yml`/`migrate.yml` already guard on every secret above being
  absent and skip cleanly rather than failing (`claude-docs/ci.md`
  describes the guard-skip steps) — setting these rows turns those jobs
  on; it doesn't require touching the workflow files again.
