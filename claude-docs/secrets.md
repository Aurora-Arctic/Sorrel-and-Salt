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

**Status as of this writing:** only the three deploy secrets above are set.
Nothing else in the tables below exists in Vercel or GitHub yet — no real
staging or production deploy can complete auth (or, for `DATABASE_URL`,
anything at all) until those rows are filled in. See "How to set each row"
for the exact manual steps — none of them can be done from this repo or by
an agent without your Vercel/Neon/Google/GitHub accounts.

## Vercel environment variables

Set per Vercel **Environment** (Production, Preview), not per branch —
`staging` and any `hotfix/**` preview both resolve through Preview.

| Variable                       | Production                                     | Preview (staging + hotfix)                                                                                                    | Read by                                                                                                |
| ------------------------------ | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`                 | `main`-backed Neon branch connection string    | `staging`-backed Neon branch (hotfix previews get their own ephemeral branch via the Neon/Vercel integration)                 | `src/db/connection.ts` — throws if unset, always                                                       |
| `BETTER_AUTH_SECRET`           | real, high-entropy (`openssl rand -base64 32`) | a separate real value (safer than reusing Production's)                                                                       | `src/lib/auth.ts` — required whenever `NODE_ENV=production`, which every Vercel build is               |
| `BETTER_AUTH_URL`              | `https://sorrelandsalt.com`                    | `https://staging.sorrelandsalt.com`                                                                                           | Better Auth reads this env var itself (`getBaseURL`) — unset today, and a build already warns about it |
| `GOOGLE_CLIENT_ID` / `_SECRET` | Production OAuth client                        | a separate client registered with the Preview callback URL, or the same client with both callback URLs registered (see below) | `src/lib/auth.ts`'s `socialProviders()` — omitted entirely, not broken, if unset                       |
| `GITHUB_CLIENT_ID` / `_SECRET` | Production OAuth client                        | same as Google                                                                                                                | same                                                                                                   |
| Admin bootstrap email          | the real admin's email                         | can differ from Production's                                                                                                  | M2.3, not built yet — reads it to promote the first matching sign-in to `admin`                        |

`vercel pull` (`migrate.yml`) resolves `DATABASE_URL` per environment
automatically once Preview/Production have it — no separate GitHub Actions
copy of `DATABASE_URL` is needed, unlike everything below.

## GitHub Actions repository secrets

Used by `deploy.yml`/`migrate.yml` to drive the Vercel CLI and, on
production only, a pre-migration Neon snapshot (`claude-docs/db.md`,
"Snapshot before production migrations"). None of these are read by
`pr-gate.yml`/`merge-queue.yml`'s own build/test/lint jobs — **no
credential is required to run tests locally or in a PR check**, per
M0.27's own acceptance criteria.

| Secret                | Status          | Where it comes from                                               |
| --------------------- | --------------- | ----------------------------------------------------------------- |
| `VERCEL_DEPLOY_TOKEN` | **Already set** | Vercel account settings → Tokens                                  |
| `VERCEL_ORG_ID`       | **Already set** | `vercel link` locally, or the Vercel project's Settings → General |
| `VERCEL_PROJECT_ID`   | **Already set** | same                                                              |
| `VERCEL_SCOPE`        | Not set         | the Vercel team/org slug                                          |
| `NEON_API_KEY`        | Not set         | Neon console → Account settings → API keys                        |
| `NEON_PROJECT_ID`     | Not set         | Neon console → the project's Settings → General                   |

## How to set each row (manual — needs your accounts)

Nothing here can be done from this session: I don't have Vercel, Neon,
Google Cloud, or GitHub-OAuth-app access, and the `gh` token this repo's
devcontainer carries isn't scoped to manage Actions secrets/variables
(confirmed — `gh secret list`/`gh variable list` both 403 here).

1. **Vercel env vars** (`DATABASE_URL`, `BETTER_AUTH_SECRET`,
   `BETTER_AUTH_URL`, the four OAuth vars, admin email): Vercel dashboard →
   Project → Settings → Environment Variables, or `vercel env add <NAME>
production` / `vercel env add <NAME> preview` from a machine with the
   Vercel CLI installed and linked to this project (this devcontainer
   doesn't have the CLI — the Vercel plugin session hint at the start of
   this conversation already flagged that).
2. **Neon connection strings**: Neon console → the project → each branch
   (`main`, `staging`) → Connection Details.
3. **Google OAuth client**: Google Cloud Console → APIs & Services →
   Credentials → Create OAuth client ID (Web application). Authorized
   redirect URIs, one row per environment:
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
   this repo drives that — `vercel.json`'s `deploymentEnabled: false` already
   stops the Git integration from deploying anything itself (CLI-driven
   `deploy.yml` is the only path, per that file's own header comment), but
   the staging alias and turning previews off in the dashboard are
   separate settings this doesn't touch.

## What's already true without any of the above

- Everything above is additive to what already works: local dev, the full
  Vitest suite, and CI's lint/typecheck/build/vitest/playwright jobs all
  run with **no** real secret, using the fixed non-secret
  `local-dev-not-a-real-secret` placeholder for `BETTER_AUTH_SECRET` where
  a production-mode build needs one at all (`claude-docs/auth.md`).
- `src/lib/auth.ts` already reads all four OAuth env var names
  (`GOOGLE_CLIENT_ID`/`_SECRET`, `GITHUB_CLIENT_ID`/`_SECRET`) and a
  provider is registered the moment both halves of a pair are set — no
  further code change is needed once real credentials land in Vercel.
- `deploy.yml`/`migrate.yml` already guard on every secret above being
  absent and skip cleanly rather than failing (`claude-docs/ci.md`
  describes the guard-skip steps) — setting these rows turns those jobs
  on; it doesn't require touching the workflow files again.
