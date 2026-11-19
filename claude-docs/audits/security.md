# Security Audit

## Purpose

This is the audit of the site's security, for task M17.34. It looks for ways a person could read or change data that is not theirs, take over an account, or weaken the site's defences. It changes no code. Each finding is proposed as a follow-up task, and a task is minted only after the owner approves it.

The audit has 20 findings: 1 Medium, 16 Low and 3 Informational. None is High.

In the code it read, the audit found no way for a person to read or change another coven's data, and no way round the service checks or the `Membership` proof they return. The `Membership` proof is the branded value that `assertMembership` hands back and that every workspace-scoped repository function demands. The Medium finding (SEC-1) is about a secret shared across environments whose strength the audit could not read.

### What The Owner Needs To Do

1. **Decide which findings become tasks.** Section "Drafted follow-up tasks" drafts one task per finding SEC-1 to SEC-17, and a doc task for SEC-18. None is minted. I need you to approve, change or skip each one.
2. **Check the sign-in secret (SEC-1).** Check how long the value of `BETTER_AUTH_SECRET` is and how it was made. The audit did not read it. If it can be guessed, SEC-1 becomes High.
3. **Read what only the owner can open.** The audit could not read these (details under "Not checked"):
   - Vercel Deployment Protection on staging and on hotfix previews.
   - The Vercel firewall rules.
   - Which secrets each Vercel environment holds, and whether `ENABLE_IMPERSONATION` is set on Preview.
   - GitHub's older branch-protection settings and the Actions permission settings.
   - The live response headers and live introspection, in a browser's Network tab. The headers to read are `Content-Security-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, `X-Powered-By`, `Strict-Transport-Security`, `X-Frame-Options`, `Referrer-Policy` and `X-Content-Type-Options`.

## Scope

- **Areas:** the nine areas the task's criteria name: authorisation and direct-id access; sign-in and sessions; tokens (invitations, support views, and printed cards); the GraphQL API; input and output handling; headers and cookies; secrets and environment variables; dependencies; and the pages open without an account.
- **Code base:** `staging` at `fe4df768a`, read on 2026-11-19 in a worktree. Where a line number is cited, it was opened and confirmed in that worktree.
- **In:** the application code under `src/`, `scripts/`, the database schema and migrations, `.github/`, `next.config.ts`, `vercel.json`, the tests that guard each control, the docs under `claude-docs/` and the rules under `.claude/rules/`, and `npm audit` output.
- **Out:** the live site. No code was changed and no test was run. No request went to a running server except 9 signed-out requests to production, and the `gh` reads of the repository's settings, both approved by the owner on 2026-11-19. The Vercel dashboard, the firewall's rules and GitHub's settings the token could not read were not read.

## Method

The `/security-review` skill is written for a branch's diff. It excludes denial of service, rate limits, outdated dependencies and missing hardening. This task's criteria ask for those areas. So the audit applied the skill's method to the whole site: find a candidate, then filter false positives with a separate pass, and keep only what holds. Hardening gaps are reported as Low.

1. **Lanes A to G.** Seven agents each took a narrow area:
   - A: authorisation in the `grimoire`, `coven`, `support`, and `identity` modules, and their resolvers.
   - B: sign-in, sessions, and tokens.
   - C: the GraphQL API, and input and output handling.
   - D: headers, cookies, secrets, dependencies, CI, and the pages open without an account.
   - E: authorisation in the `ingredients`, `vocabulary`, `documents`, and `help` modules.
   - F: three sweeps over every GraphQL operation: a ledger of the line that guards each one, the fields each mutation lets a caller set, and size caps.
   - G: token storage, rate limits, how soon access stops after it is taken away, logging, and the supply chain.

   The first pass of each of lanes A to E came back partial, by the agent's own report, and each was sent back for a second pass over what it had not read. Lanes F and G ran once, after the research, and each lists what it did not reach under "Not Checked".

2. **An independent verifier** tried to disprove each finding without the lanes' reasoning.
3. **The coordinator's own read** of SEC-1 and of the withdrawn link-filter finding, and the coordinator's reads from GitHub with `gh` on 2026-11-19.

Each finding says how sure the audit is, 1 to 10, and the kind of evidence:

- **Code:** a line of the source shows it.
- **Inference:** a conclusion drawn from code. It names what would settle it.

Severity scale:

- **High:** a person without the right can read or change another person's data, or take over an account.
- **Medium:** a weakness with a real path that needs a precondition, or a recorded decision the code or settings no longer meet.
- **Low:** a missing defence or guard with no path shown.
- **Informational:** a note that needs no task by itself.

### Published practice, and whether this audit did it

Read on 2026-11-19 by the research agent. "Status" is as it stands at the end of the audit.

| Practice                                                | Source     | Status                                                                                                        |
| ------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------- |
| Build a threat model first                              | [S1]       | Partly: the brief stated the site's rules and a do-not-report list, with no written list of actors and assets |
| Keep a coverage ledger                                  | [S2]       | Done: lane F's ledger covers all 161 GraphQL fields and 4 route handlers                                      |
| One narrow question per agent                           | [S2], [S3] | Done                                                                                                          |
| Trace each finding from source to sink                  | [S4]       | Done                                                                                                          |
| An independent pass that tries to disprove each finding | [S4], [S5] | Done: the verifier                                                                                            |
| Prove by test or reproduction                           | [S6], [S4] | Not done: the audit only read code                                                                            |
| Pair the agent with deterministic tools                 | [S1], [S7] | Partly: `npm audit` and a history search ran; no secret scanner or static analyser (SEC-17)                   |
| Variant analysis, searching for a bug's siblings        | [S4]       | Done: the mass-assignment, token variant and size-cap sweeps ran after the research                           |
| Record what was not checked                             | [S6], [S2] | Done                                                                                                          |
| Treat repository content as data                        | [S6], [S1] | Partly: only the later briefs said so in words                                                                |
| Never let the agent hold live secrets                   | [S1], [S7] | Done                                                                                                          |
| Run the same question twice and compare                 | [S2], [S3] | Not done: a second run of the same question to compare answers                                                |
| Rate-limit table, token variant sweep, size-cap sweep   | [S8]       | Done                                                                                                          |

### Limits, stated literally

- The briefs required the graphify code graph for how code connects. Lanes A and E used it for a few queries, and lane D's third item reports graph use for the proxy and `requireSession()` nodes. The other agents used text search only. A connection fact is a text search (grep) unless marked (graph).
- The graph is built from another checkout, two commits behind `staging`.
- The research agent could not read some primary sources: the OWASP ASVS page returned 404; the Yoga security page returned 404; no OWASP Web Security Testing Guide page was read; the Trail of Bits post was seen only as a list entry; the Next.js middleware advisory was not read; the Next.js proxy docs, the Vercel firewall page, the npm install-script docs and the Yoga depth and cost plugin pages were not read; Project Zero's posts were read through a secondary summary; Anthropic's in-product `/security-review` docs were not read.
- Agents read the repository's comments and docs as data, not instructions. Only the later briefs said so in words.
- Nothing was reproduced. Every finding is from reading code, so a path marked "Inference" is unproven.

## Findings

| ID     | Severity      | Finding                                                                                      | Confidence |
| ------ | ------------- | -------------------------------------------------------------------------------------------- | ---------- |
| SEC-1  | Medium        | One short sign-in secret is shared by production, staging and previews                       | 7          |
| SEC-2  | Low           | The deploy job builds pull-request code with repository secrets                              | 6          |
| SEC-3  | Low           | Staff user ids are readable without signing in                                               | 8          |
| SEC-4  | Low           | Password-reset tokens are stored unhashed                                                    | 8          |
| SEC-5  | Low           | Other sessions stay live after an email change, a passkey deletion and turning on two-factor | 8          |
| SEC-6  | Low           | Two-factor cannot be required for Keepers and Curators                                       | 8          |
| SEC-7  | Low           | Spell update writers are not scoped to spells the caller may read                            | 8          |
| SEC-8  | Low           | Impersonation on staging and previews has a two-condition gate                               | 7          |
| SEC-9  | Low           | Most text, list and id arguments have no size cap                                            | 7          |
| SEC-10 | Low           | No rate limit on the GraphQL route or the public searches                                    | 7          |
| SEC-11 | Low           | The Content-Security-Policy allows inline scripts                                            | 9          |
| SEC-12 | Low           | Several response headers are not set by the repository                                       | 8          |
| SEC-13 | Low           | Supply-chain gaps in CI and installs                                                         | 7          |
| SEC-14 | Low           | Mail contents can be logged, against a code comment                                          | 8          |
| SEC-15 | Low           | Autosaved form copies stay in the browser after sign-out                                     | 6          |
| SEC-16 | Low           | The seed script's drop refusal reads `NODE_ENV` only                                         | 7          |
| SEC-17 | Low           | No secret scanner and no static analyser run on the repository                               | 8          |
| SEC-18 | Informational | A rule names three proofless finders; the code has more                                      | 8          |
| SEC-19 | Informational | A guard test matches text only                                                               | 7          |
| SEC-20 | Informational | Smaller notes                                                                                | varies     |

### SEC-1 One Short Sign-In Secret Is Shared By Production, Staging And Previews

- **Severity:** Medium
- **Where:** `claude-docs/secrets.md` (the table row at line 18, line 35, line 37, and line 38 for rotation). `src/lib/auth-secrets.ts:24` (`verificationSigningSecret`). `src/lib/auth.ts:286` (`tokenClaims`), `:300` (`gateEmailChange`), hook call at `:748`.
- **Found:** the doc records that one value of `BETTER_AUTH_SECRET` serves both environments, that it is short and low-entropy, and that regenerating it is "free before launch". The site is public: the SEO audit records indexed production pages. The same secret signs the email-verification and email-change links (`verificationSigningSecret`). `gateEmailChange` decodes the link's claims and requires a session whose address equals the link's `email`. The audit did not read the value.
- **How it could be used:** someone who learns the secret, for example from a build on staging or a hotfix preview, or by guessing it offline from a signed value they hold, such as their own signed session cookie, can sign an email-change link for their own account that names an address they do not own. That includes an address with a pending invitation, which steps round the invite gate. Sessions are database rows, so the secret alone forges no session.
- **How sure:** 7. Code for the sharing; Inference for the guessing step. The owner can settle it by checking the value's length and how it was made. Verifier: confirmed, understated. It becomes High if the value is guessable.
- **Sources:** D-15, D-9, D-13 context, verifier D-15.
- **Recommended Fix:** generate a new random value for production and a different one for Preview, following the rotation steps in `claude-docs/secrets.md`.

### SEC-2 The Deploy Job Builds Pull-Request Code With Repository Secrets

- **Severity:** Low
- **Where:** `.github/workflows/deploy.yml:15-22` (triggers: push to `main` and `staging`; `pull_request` opened, synchronize, reopened and closed); the `resolve-target` condition at `:39-43` (a pull request qualifies only from a `hotfix/` branch); `secrets: inherit` at `:160` (on the migration job); `vercel build` at `:301`. The workshop is built for staging only (`:290-297`).
- **Found:** the job that builds a pull request's code from a `hotfix/` branch holds production-capable secrets: the Vercel token and the database and auth secret names listed in the CI table below. No job in any workflow sits behind a GitHub Environment, the GitHub setting that can hold secrets back until a named reviewer approves the run. A repository search found five `environment:` hits and none is a job key: `deploy.yml:46` is a job output, `deploy.yml:157` is an input handed to `migrate.yml`, `migrate.yml:17` and `seed-environment.yml:21` are workflow inputs, and `migrate.yml:119` is a comment saying the project chose named secrets over GitHub Environments.
- **How it could be used:** it needs write access to the repository. A fork's pull request gets no secrets, which is GitHub's behaviour (stated from memory, not read). A writer could edit the workflow anyway, so the gain is small.
- **What the coordinator read from GitHub with `gh` on 2026-11-19:** three rulesets are active (Main, Staging, Release Branches). Main and Staging block deletion and force pushes and require a pull request with 0 approvals and no code-owner review. None has a required-status-checks rule. Each has one user who can always bypass. The repository has no `CODEOWNERS` file. The older branch-protection settings and the Actions permission settings could not be read (the token was refused), so required checks may be set there. Not settled.
- **How sure:** 6. Code for the workflow; Inference for the reach. Verifier: confirmed but overstated.
- **Source:** D-13.
- **Recommended Fix:** put the build job behind a GitHub Environment with a required reviewer, or hold the secrets only in the steps that need them, and add a required-status-checks rule.

### SEC-3 Staff User Ids Are Readable Without Signing In

- **Severity:** Low
- **Where:** `src/graphql/schema/audit.ts:9-14` (`createdBy` and `updatedBy` through `exposeID`); `src/modules/ingredients/graphql/ingredient.ts:167,237`; `src/modules/ingredients/graphql/references.ts:69`. The public queries are `src/modules/ingredients/graphql/compendium.ts:86,139`.
- **Found:** the `audit` field on Compendium types returns who created and last changed a row. The Compendium queries need no session, so a signed-out caller reads the ids of the staff who curated them.
- **How it could be used:** No exploit path shown. An id alone grants nothing; it tells an outsider which accounts curate the Compendium.
- **How sure:** 8. Code. Verifier: confirmed.
- **Sources:** C-2, G-2.
- **Recommended Fix:** I need the owner to decide whether staff ids are meant to be public. If not, return null signed out or scope the field to a Curator, about 1.5h with a test.

### SEC-4 Password-Reset Tokens Are Stored Unhashed

- **Severity:** Low
- **Where:** `src/lib/auth.ts:339` (`RESET_TOKEN_SECONDS = 15 * 60`), `:430` (`randomBytes(18)` for the lockout-mail token), `:433` (`identifier: reset-password:${token}`), `:434` (expiry), `:465-466`.
- **Found:** the lockout-mail token and Better Auth's own reset token are stored as the raw value in the `verifications` table, unlike invitation and support-view tokens, which are stored as hashes. Better Auth's `password.mjs` stores `reset-password:${token}` unhashed. Single use was not confirmed.
- **How it could be used:** a reader of the database could use an unexpired reset token within its 15 minutes. That needs database read access, which already exposes more.
- **How sure:** 8. Code. Verifier: confirmed.
- **Sources:** B-1, G-5.
- **Recommended Fix:** hash the lockout-mail token before storing it, as the invitation tokens are; confirm single use of the library's token and record the answer.

### SEC-5 Other Sessions Stay Live After An Email Change, A Passkey Deletion And Turning On Two-Factor

- **Severity:** Low
- **Where:** `src/lib/auth.ts:394` (`revokeOtherSessions` on `/change-password` only) and `:466` (`revokeSessionsOnPasswordReset`).
- **Found:** a password change or reset ends the account's other sessions. An email change, a passkey deletion and turning on two-factor do not. Sessions last 7 days.
- **How it could be used:** an attacker who already holds a stolen session keeps it after the owner changes their address, deletes a passkey or turns on two-factor, for up to 7 days.
- **How sure:** 8. Code, with the passkey-delete hook not read in full.
- **Source:** G-3.
- **Recommended Fix:** revoke the other sessions after these three events.

### SEC-6 Two-Factor Cannot Be Required For Keepers And Curators

- **Severity:** Low
- **Where:** `claude-docs/auth/two-factor.md:50-56` (confirmed to exist): only `/sign-in/email` asks for the second step, so a provider or passkey sign-in makes its session with no second step (`tests/db/passkey-sign-in.test.ts`).
- **Found:** two-factor is optional for every account, including Keepers and Curators, whose accounts can change the Compendium and the site documents. Provider and passkey sign-ins never ask for it. This is by design: the doc argues a provider holds its own second factor and a passkey is one already.
- **How it could be used:** No exploit path shown.
- **How sure:** 8. Code.
- **Source:** G-4, B.
- **Recommended Fix:** decide whether Keepers and Curators must hold two-factor, or a passkey, and enforce it at the role grant.

### SEC-7 Spell Update Writers Are Not Scoped To Spells The Caller May Read

- **Severity:** Low
- **Where:** `src/db/repository/write.ts:95-152` (`updateByIdInWorkspace`, `updateRevisioned`, `softDeleteByIdInWorkspace`; the `expectedRevision === null` early return is at about `:98`). `src/modules/grimoire/services/spells.ts:82-122` (`updateSpell` reads through `readableSpells(membership)` first, `repository/spells.ts:28`, used at `:80`). Test: `tests/modules/grimoire/services/spells.test.ts:146` covers the service read only.
- **Found:** the writers AND the workspace but not the spell's visibility. The service's earlier read is the only guard. Whether `UpdateSpellInputSchema` refuses a null revision is unconfirmed.
- **How it could be used:** No exploit path shown.
- **How sure:** 8. Code. Verifier: confirmed.
- **Source:** A-1.
- **Recommended Fix:** AND `readableSpells(membership)` in the writer, about 1h.

### SEC-8 Impersonation On Staging And Previews Has A Two-Condition Gate

- **Severity:** Low
- **Where:** `src/lib/impersonation.ts:16`: `env.ENABLE_IMPERSONATION === 'true' && env.VERCEL_ENV !== 'production'`. `claude-docs/auth/impersonation.md:70-90`.
- **Found:** where the two conditions hold, a Keeper can act as another user. There is no check on the target. Production never runs it, because the flag is never set there and `VERCEL_ENV` blocks it. Where this runs outside Vercel production (including non-Vercel production), only the flag stands in the way.
- **Not settled:** whether staging and previews sit behind Vercel Deployment Protection, and whether `ENABLE_IMPERSONATION` is set on Preview.
- **How sure:** 7. Code. Verifier: confirmed.
- **Sources:** B-2, D-10.
- **Recommended Fix:** refuse impersonating a Keeper, and refuse it unless the environment is named `staging` or `preview` positively.

### SEC-9 Most Text, List And Id Arguments Have No Size Cap

- **Severity:** Low
- **Where:** the table below. `src/graphql/armor.ts` (depth 7 only); `src/graphql/builder.ts:17,27-43` (complexity limit 5000). `limitedText` (`src/lib/validation.ts:25`) is used only for the capped fields; `requiredText` and `optionalText` (`:21`, `:29`) have no cap. Help search caps plain words at 20 (`MOST_WORDS = 20`, `src/db/repository/help.ts:243`; `readQuestion` at `:245-257`) but not quoted phrases or `-word` exclusions (one `websearch_to_tsquery` at `:271`).
- **Found:** length caps exist only for a few fields. The route sets no request body limit; the platform's limit is the only bound, and the audit did not check its figure.
- **How it could be used:** a signed-in practitioner, or for the public reads a signed-out caller, sends a very large string or a list of thousands of ids or steps. The gain is database load, slow pages and storage growth. No data exposure.
- **How sure:** 7. Code for the missing caps; Inference for the effect. Verifier: confirmed but overstated.
- **Sources:** F-1, C-1.
- **Recommended Fix:** a default cap in `requiredText` and `optionalText`, `.max()` on every array, a cap on the public search `query`, and a body limit on the route, about 4 to 6 hours with tests.

| Argument or input field                                                                            | Cap                                            |
| -------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `compendium`, `compendiumFacets`: `query` and the list filters (public)                            | none                                           |
| `helpSearch(query)` (public)                                                                       | plain words 20; phrases and exclusions none    |
| `possibleDuplicates(name)`, the six `*Suggestions(query)`, `workspaceIngredients` filters          | none; minimum length 2                         |
| `workspaceId` and `id` arguments                                                                   | none, but a non-uuid is refused in the service |
| token arguments (invitation, support view)                                                         | none; hashed before lookup                     |
| `SpellInput` and `UpdateSpellInput` text, `steps`, `categoryIds`                                   | none                                           |
| `SpellStepInput`, `WorkingInput`, `WorkingParticipantInput.name`                                   | none                                           |
| `IngredientInput`, its variants, `CupboardEntryInput`, `StockInput.source`, `SaveStockInput` lists | none                                           |
| `ReferenceInput` text fields                                                                       | none (format checks only)                      |
| Help and document inputs (Keeper only), vocabulary inputs (Curator only)                           | none                                           |
| Invitation card note                                                                               | 500, by database CHECK                         |
| Coven name                                                                                         | 80                                             |
| User name                                                                                          | 100                                            |
| Pause reasons                                                                                      | `PAUSE_TEXT_MAX_LENGTH`                        |
| Support request and reply                                                                          | subject 120, message 4000, path 500            |

### SEC-10 No Rate Limit On The GraphQL Route Or The Public Searches

- **Severity:** Low
- **Where:** `src/app/api/graphql/route.ts`; `src/graphql/context.ts:34` (client address from `x-vercel-forwarded-for`); `src/lib/auth.ts:591-600` (Better Auth limits apply only when `NODE_ENV === 'production'`) and `:638` (`ipAddressHeaders`).
- **Found:** no limit on GraphQL reads, public searches, or Keeper invitation sends was found in code. Sign-up mail is limited per IP only. The table below lists every limit found.
- **Coordinator's observation, 2026-11-19:** 9 signed-out requests from the audit's container to production were each answered `429` with a Vercel challenge, so the firewall challenges a client that is not a browser. The firewall's rules were not read, so this audit cannot say what it limits.
- **How it could be used:** an attacker floods the public searches or the GraphQL route to load the database. No data exposure.
- **How sure:** 7. Code. Source: G-7.
- **Recommended Fix:** add a per-client limit on the GraphQL route and the public searches, counted in the database as the signed-out support limits are.

| Flow                                            | Limit                                                 | Source                             |
| ----------------------------------------------- | ----------------------------------------------------- | ---------------------------------- |
| Sign-in, sign-up, change-password, change-email | 3 per 10 s                                            | Better Auth special rules          |
| Request reset, send verification                | 3 per 60 s                                            | same                               |
| Passkey routes                                  | 3 per 10 s                                            | `auth.ts` custom rule              |
| Two-factor routes                               | 3 per 10 s, plus a per-challenge cap and account lock | Better Auth two-factor plugin      |
| Password sign-in lockout                        | app-level                                             | `auth.ts`                          |
| Signed-out support request                      | 10 per address, 30 per client per 24h                 | `signed-out-limits.ts`             |
| Signed-out view and reply                       | 60 views per client per 24h, 5 replies per request    | `view-link.ts:36,44`               |
| Signed-in support request                       | 10 per 24h per user                                   | `send.ts:15`                       |
| Coven invitation mail                           | 20 per 60 min per sender                              | `coven/services/invitations.ts:27` |
| Keeper invitation                               | none found                                            | `admin-invitations.ts`             |
| GraphQL, public search                          | none found                                            | this finding                       |

### SEC-11 The Content-Security-Policy Allows Inline Scripts

- **Severity:** Low
- **Where:** `src/lib/security-headers.ts:27` (`script-src 'self' 'unsafe-inline'`), comment at `:24`. Four static inline scripts at `src/app/pre-paint-scripts.tsx:40-43`.
- **Found:** the policy lets any inline script run, so it would not stop an injected one. The audit found no injection point (see "Input and output handling").
- **How it could be used:** No exploit path shown. It matters only if a script injection is found elsewhere.
- **How sure:** 9. Code. Verifier: confirmed.
- **Source:** D-1.
- **Recommended Fix:** a nonce through `src/proxy.ts`, about 6h; it makes pages dynamic, so it needs a decision on caching.

### SEC-12 Several Response Headers Are Not Set By The Repository

- **Severity:** Low
- **Where:** `src/lib/security-headers.ts`; `next.config.ts`; `vercel.json`.
- **Found:**
  - No Permissions-Policy or Cross-Origin-Opener-Policy anywhere in `src`, `next.config.ts` or `vercel.json`.
  - No `poweredByHeader: false` in `next.config.ts`, so `X-Powered-By` is sent.
  - HSTS is left to Vercel (comment at `security-headers.ts:43`). `frame-ancestors 'none'` is at `:39`, and there is no X-Frame-Options.
  - The `DOCUMENTS` pattern (`:13`) and `REFERRING_DOCUMENTS` (`:19`) exclude `workshop` and `api/`. `EVERYTHING` (`:10`) excludes only the workshop. Sources are at `:48`, `:52` and `:63`. So `/api/*` carries no Content-Security-Policy or Referrer-Policy from the repository.
- **Live headers were not read:** the firewall challenged the audit's requests, so Vercel may add some of these.
- **How it could be used:** No exploit path shown.
- **How sure:** 8. Code. Verifier: confirmed.
- **Sources:** D-2, D-3, D-4, D-5.
- **Recommended Fix:** set Permissions-Policy, Cross-Origin-Opener-Policy and X-Frame-Options, turn off `X-Powered-By`, and check the live headers.

### SEC-13 Supply-Chain Gaps In CI And Installs

- **Severity:** Low
- **Where:**
  - Actions are pinned to tags, not commit ids, for example `actions/checkout@v7`, `dorny/paths-filter@v4` and `docker/*`.
  - The project's own action `Aurora-Arctic/Sorrel-and-Salt/.github/actions/checkout-to-app@main` is used in 16 steps.
  - The Vercel CLI is installed as `vercel@59`, outside the lockfile: `deploy.yml:201` and `:414`, `migrate.yml:87`, and `seed-environment.yml` per lane D.
  - `npm audit` never fails CI: `checks.yml:397` ends `|| true`, comment at `:370`.
  - No `npm audit signatures` (0 matches in `.github`).
  - Install scripts are allowed for `@swc/core`, `esbuild`, `@esbuild-kit/core-utils/esbuild`, `drizzle-kit/esbuild`, `pre-commit` (dev), and the optional `@parcel/watcher`, `cbor-extract` and `fsevents`.
- **How it could be used:** a compromised action tag or CLI release runs in a job that holds deploy secrets. No attack was seen.
- **How sure:** 7. Code. Verifier: confirmed.
- **Sources:** D-11, G-6.
- **Recommended Fix:** pin third-party actions to commit ids, pin the CLI in the lockfile, and make `npm audit` fail the build at a set level.

### SEC-14 Mail Contents Can Be Logged, Against A Code Comment

- **Severity:** Low
- **Where:** `src/lib/mail-transport.ts:118` logs the whole message when `MAIL_TRANSPORT` is unset. `REQUIRED_TRANSPORT` is at `:10` and its use at `:107`; it forces `resend` in production and `mailtrap-sandbox` in preview. The comment "The body is never logged here" is at `:109`. The provider error body is logged at `:136` (the error object) and `:140-142` (the response body).
- **Found:** the comment is wrong where `VERCEL_ENV` is unset (local, compose, non-Vercel) and where it is `development`. A mail body can hold a reset or verification link.
- **How it could be used:** a person with read access to the logs of such a deployment reads a link. On Vercel production and preview the transport is forced, so the full-message log does not run there.
- **How sure:** 8. Code. Verifier: confirmed.
- **Source:** D-8, with lane B's and the verifier's notes.
- **Recommended Fix:** log only the recipient count and subject when `NODE_ENV` is production, and correct the comment, 0.5h.

### SEC-15 Autosaved Form Copies Stay In The Browser After Sign-Out

- **Severity:** Low
- **Where:** `src/lib/autosave/mirror.ts`: `mirrorKey` at `:10`, `writeMirror` at `:22`, `clearMirror` at `:28`, `readMirror` at `:35`. Entities are `spell` (`SpellBuilder/index.tsx:460`) and `ingredient` (`IngredientForm/index.tsx:677`).
- **Found:** keys are `autosave:<entity>:<id|new>:<userId>`. A copy is removed on a confirmed save or on read after 24 hours, not at sign-out.
- **How it could be used:** a second person on a shared browser reads the form text of a spell or ingredient left unsaved.
- **How sure:** 6. Code for the storage; Inference for the shared browser.
- **Source:** D-12.
- **Recommended Fix:** clear every `autosave:` key at sign-out.

### SEC-16 The Seed Script's Drop Refusal Reads `NODE_ENV` Only

- **Severity:** Low
- **Where:** `scripts/db-seed.ts:113-118` (the check at `:116`).
- **Found:** the refusal to drop a database reads `NODE_ENV` and not the database it would drop. The comment says "a production URL in a local shell is refused". No test covers it.
- **How it could be used:** a person running the script with a production URL and `NODE_ENV` unset drops production. It needs an operator mistake.
- **How sure:** 7. Code. Verifier: confirmed.
- **Source:** D-16.
- **Recommended Fix:** refuse when the target host is not a local one, and add a test.

### SEC-17 No Secret Scanner And No Static Analyser Run On The Repository

- **Severity:** Low
- **Where:** `.github/workflows/`.
- **Found:** neither runs in CI. The audit ran neither: none is installed in the container and the container has no Python. GitHub's own secret scanning setting could not be read.
- **How it could be used:** No exploit path shown. A committed secret or a known insecure pattern would not be caught early.
- **How sure:** 8. Code.
- **Source:** research gap 10.
- **Recommended Fix:** add a secret scanner and CodeQL (or the like) to CI.

### SEC-18 A Rule Names Three Proofless Finders; The Code Has More

- **Severity:** Informational
- **Where:** `.claude/rules/database.md:81` ("**Named exceptions take no proof.** There are three."). The other finders that take no proof: `findWorkspaceSeat`, `findWorkspaceRole` and `findMembershipsOfUsers` (`src/db/repository/memberships.ts:30,55,67`), `findInvitationByToken` and `findInvitedCoven` (`src/db/repository/invitations.ts:153,170`), and `hasAcceptedCard`.
- **Found:** they are documented in comments and in `claude-docs/db/write-path.md`, "Reads that take no proof". The rule's count is out of date. No exposure was found.
- **How sure:** 8. Code. Verifier: confirmed.
- **Source:** A-2.
- **Recommended Fix:** correct the rule, a doc change.

### SEC-19 A Guard Test Matches Text Only

- **Severity:** Informational
- **Where:** `tests/guards/shell-page-guards.test.ts`.
- **Found:** it matches text, so a guard's name in a comment or an unused import also passes.
- **How sure:** 7. Code. Source: lane E item 4. No task.

### SEC-20 Smaller Notes

- **Severity:** Informational. No task.
- **Published browser source maps (D-6):** `next.config.ts:20` `productionBrowserSourceMaps: true`. Client source only, and the repository is public.
- **Shared `unknown` bucket (D-7):** the signed-out limits share one bucket when the client address header is absent, which happens off Vercel only (`signed-out.ts:68`, `context.ts:34`).
- **Built-in default signing secret outside production (D-9):** `auth-secrets.ts` falls back to `BETTER_AUTH_DEFAULT_SECRET`. `send-count-key.ts:14-17` uses `DEVELOPMENT_KEY` outside production. `deploy.yml` requires `DATABASE_URL,BETTER_AUTH_SECRET` (about `:277`, `:303-304`).
- **Branch names in job summaries (D-14):** branch names reach job summaries as markdown at `gitflow.yml:88,102` and `.github/actions/pr-comment/action.yml:101-116`.
- **Keeper reads (A):** `usersForAdmin` (`src/modules/identity/services/privilege-changes.ts:66`) uses `isSiteAdmin` where the other Keeper reads use `assertSiteAdmin`, and `usersNamedOnRequests` does no per-id check. Callers are in `src/modules/support/graphql/support.ts:92,144,150,162`; email is gated again by `selfOrAdmin`. Confidence 8 that nothing leaks.

### Raised And Withdrawn

- **The passkey rate-limit bucket (B-3).** Withdrawn: the limiter keys on the address header set at `src/lib/auth.ts:638` (`ipAddressHeaders: ['x-vercel-forwarded-for']`), so the bucket is per client.
- **Adding a hidden Compendium entry to a cupboard by id (E-1).** Withdrawn: `shown = false` means unlisted, not confidential. The docs say so: `claude-docs/db/identity-model.md:10`, `claude-docs/db/compendium-read.md` ("Hidden entries"), `claude-docs/design-decisions/ingredients.md:1943-1957` and `.claude/rules/domain.md:22,44`.
- **The link filter accepting `/\host` (C-3, G-1).** Withdrawn as an exploit. The filter in `src/lib/link-address.ts:12-14` already allows any `https:` address, and only Keepers write these links, so the form gains nothing. One lane and the verifier disagreed on whether the form survives normalisation. The verifier read `mdast-util-to-hast` and `micromark-util-sanitize-uri`, which percent-encode the backslash to `%5C`, so the href becomes a path on the site. Hardening only: refuse a backslash as `safeReturnPath` does (`src/lib/sign-in.ts:26-38`, backslash check at `:31-32`).

## Areas With No Finding

### 1. Authorisation And Direct-Id Access

Checked, clean (lanes A, E, F):

- The one `as Membership` cast is at `src/modules/coven/services/membership.ts:110`. Repository finders are typed `Unscoped & NotSpellScoped & NotIngredientScoped`.
- `src/graphql/builder.ts:46-58` sets no default scope, but every unscoped field calls `sessionOf` and a service. Every Keeper action opens with `assertSiteAdmin`.
- Invitations grant `viewer` or `member` only, and a database CHECK rejects `owner`.
- 35 loaders are built per request (`src/graphql/loaders/define-loader.ts`, `index.ts`).
- Help reads are filtered by `readable(reach)` in SQL (`src/db/repository/help.ts`), and the public reads are cached with no viewer in the key. `/coven/[slug]/ingredients/[id]/page.tsx` uses `requireCovenMembership`, which answers 404 to a non-member.
- Guard tests that fail with the guard removed:
  - `tests/modules/coven/services/membership.test.ts` (lines 64, 75, 84, 106, 145, 270, 278), `spells.test.ts` (146, 190, 687), `spell-reads.test.ts` (67, 97, 125, 155, 190), `last-owner.test.ts:23`, `member-role.test.ts` (83, 94), `invitation-revocation.test.ts:106`, `curator-boundary.test.ts` (166, 207), `user-role.test.ts` (373, 407, 419, 432), `access-pause.test.ts:190`, `support-sender-resolve.test.ts:57`, `support-view-query.test.ts` (168, 196, 232), and the cron tests.
  - Guard tests `invitation-token-rotation`, `workspace-slug-lookup` and `soft-delete-finder-guard`.
  - `tests/modules/ingredients/services/workspace-ingredients.test.ts:133-152`, `ingredient-detail.test.ts:290-316`, `document-editing.test.ts:335-400`, `document-mailing.test.ts:620-645`, `help-writes.test.ts:90-124`, `help-staff-list.test.ts:70-104`.
- **Test gaps:** no test for `memberEmailsByMember` or the support loaders; no test calls the lane E services with a null session.
- **Ledger (lane F):** 54 Query and 107 Mutation fields (161), plus 4 route handlers, each have an enforcing line; no row without one was found. Rows with scope `NONE` are enforced by a service assertion, are public by design, or are enforced by the invitation's address match.
- **Mass assignment (lane F):** no repository file spreads a caller object. Input types are explicit field lists, and none carries `role`, `workspaceId`, `createdBy`, `updatedBy`, `deletedAt`, `canCreateWorkspace` or `demo`. Each field that names a stored state or a foreign id has a control, for example the widen-only rule for spell visibility, `assertParticipantsAreMembers` for working participants, and `refuseUncitable` for citations.
- **How soon access stops:** the session and the seat are read from the database on every request. Removing a member, changing a role, pausing, and removing a Keeper or Curator take effect on the next request. A password change or reset ends the other sessions. An email change, a passkey deletion and turning on two-factor do not (SEC-5).

### 2. Sign-In And Sessions

Checked, clean (lane B), apart from SEC-4, SEC-5, SEC-6:

- Better Auth config: `disabledPaths: ['/update-user']`, `user.changeEmail.enabled: false`, and the plugins lastLoginMethod, breachedPasswordCheck, impersonation (optional), passkey and twoFactor.
- Sensitive `additionalFields` have `input: false` (around `auth.ts:725-732`), so sign-up cannot set them.
- Password lockout: `holdLockedSignIn` and `countPasswordSignIn` at `auth.ts:511-530`, the `sign_in_failures` table, and `src/lib/held-password-paths.ts`.
- Passkeys: `pinPasskeyOrigin` at `auth.ts:242-259`, `keepAWayIn` at `:265-283` with its hook at `:754`, and the two-factor lock guards at `:384-397`.
- Sessions are read from the database with no cookie cache (`src/lib/request-session.ts`). `src/proxy.ts` does an optimistic cookie check, and a real check for `/workshop` only.
- Sign-in, sign-up and reset give the same answers whether or not an address exists. Reset ends the other sessions.
- Tests: `tests/db/two-factor.test.ts`, `passkey-account.test.ts`, `account-linking.test.ts`, `passkey-sign-in.test.ts`, `tests/lib/auth.test.ts`. No test was found for `requireOwnResend` (`auth.ts:231`) or for the `input: false` sign-up fields. `delete-passkey` and `update-passkey` use `sessionMiddleware`, not a fresh session.

### 3. Tokens

Checked, clean (lanes B, G), apart from SEC-4:

- Invitation tokens: 32 `randomBytes`, base64url, only the hex SHA-256 stored (`src/db/repository/tokens.ts`, `src/lib/invitation-token.ts`). `createInvitation` (`src/modules/coven/services/invitations.ts:50-85`) caps mail at 20 an hour and refuses `owner`.
- Support-view tokens (`src/modules/support/services/view-link.ts:60-100`): 30-day expiry, 60 reads per 24 hours per client, one `NotFound` for every bad token. The token is in the URL fragment, with `no-referrer` and no-store (`src/lib/security-headers.ts`).
- Printed cards: 16 characters from a 57-symbol alphabet (`src/lib/invitation-token.ts:12,14`), about 93 bits (code comment at `:19`). Card admin functions call `assertSiteAdmin`. Matching is in SQL (`src/db/repository/invitations.ts:636-646`).
- Cron secret: SHA-256 digests with `timingSafeEqual` (`src/lib/cron-request.ts:6-32`), 401 when unset.
- The only token in the GraphQL schema is the Keeper-only mint mutation's `tokens` (`src/modules/identity/graphql/invitation-cards.ts:99`).

| Token                           | Made by                                       | Stored                                         | Lookup                                                 | Lifetime                           | Single use                      |
| ------------------------------- | --------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------ | ---------------------------------- | ------------------------------- |
| Session                         | Better Auth                                   | `sessions.token`, raw (cookie signed)          | database equality                                      | 7 days, refreshed daily            | no                              |
| Password reset                  | Better Auth                                   | `verifications.identifier`, raw                | database equality                                      | 15 min (`auth.ts:339`)             | not confirmed                   |
| Lockout-mail reset              | `randomBytes(18)` (`auth.ts:430`)             | `verifications`, raw                           | database equality                                      | 15 min                             | not confirmed                   |
| Email verify, email change      | JWT signed with `verificationSigningSecret()` | not stored                                     | signature check                                        | 1 h (`provisional-accounts.ts:14`) | no                              |
| Invitation (address)            | `randomBytes(32)`                             | `invitations.tokenHash`, SHA-256 hex, unsalted | SQL equality (`repository/invitations.ts:156,641,692`) | 7 days                             | yes (`acceptedAt`)              |
| Invitation (card)               | 16 characters, about 93 bits                  | `invitations.tokenHash`, SHA-256 hex           | same                                                   | 7 days                             | yes; attempts recorded          |
| Support view                    | 32 bytes (`newToken()`)                       | `viewTokenHash`, SHA-256 hex                   | SQL equality (`repository/support.ts:304`)             | 30 days                            | no; 60 reads per client per 24h |
| Two-factor secret, backup codes | Better Auth                                   | `twoFactors`, encrypted with the auth secret   | decrypt                                                | until changed                      | codes yes                       |
| OAuth tokens                    | provider                                      | account table, encrypted (`auth.ts:696`)       | decrypt                                                | provider's                         | no                              |
| Cron secret                     | environment                                   | not stored                                     | SHA-256 digests with `timingSafeEqual`                 | until rotated                      | no                              |

### 4. The GraphQL API

Checked, clean (lanes C, F), apart from SEC-9 and SEC-10:

- `src/app/api/graphql/route.ts:13-25`: `graphiql: false`, `cors: false`, masked errors, Altair only when not production.
- `src/graphql/armor.ts:6-19`: depth 7; introspection and suggestions disabled in production. Complexity 5000 (`src/graphql/builder.ts:17,28`), tokens 1000, aliases 15, directives 50, batching off.
- Cross-site refusal (`src/graphql/csrf.ts:2-32`): a non-JSON content type gets 415; a request without `x-sorrel-client: web` or a same-host Origin gets 403; a GET mutation gets 405. Tested at `tests/app/api/graphql/cross-site.test.ts:59-112`. Cookies are SameSite=Lax. Better Auth's own origin check is on.
- Page size is 25 by default and 100 at most (`src/lib/cursor.ts:8,12`), with `tests/guards/pagination.test.ts`.
- `User` fields sit behind `selfOrAdmin` (`src/modules/identity/graphql/user.ts:17-36`); `WorkspaceMember.email` needs `member: ['readEmail']`.
- `unstable_cache` appears only in `src/lib/compendium-cache.ts`, `documents-cache.ts` and `help-cache.ts`, none keyed by viewer.
- **Signed-out surface (lane F):** `ok`; `compendium`, `compendiumFacets` and `ingredient`; the vocabulary reads; the five help reads; `supportDialogState`; `sendSignedOutSupportRequest`; `supportRequestByViewToken`; `replyToSupportRequestByViewToken`; `/api/auth/*`; the 3 cron routes; and `/api/graphql`. The Compendium, vocabulary and help reads are paged and public by design. Every other field uses an `authScopes` entry (`signedIn`, `admin`, `curator`) or a service that throws on a null session.

### 5. Input And Output Handling

Checked, clean (lane C):

- Every `sql.raw` takes a constant (`src/db/schema-parts.ts:93,99`, `select.ts:413,445-446`, `help.ts:52`, `predicates.ts:147`). There is no `.unsafe(` in `src` or `scripts`.
- `dangerouslySetInnerHTML` appears only for JSON-LD (`src/lib/json-ld.ts:9`, which escapes `<`), `src/app/pre-paint-scripts.tsx:40-43` and `src/emails/parts/layout.ts:213`. No `rehype-raw`.
- Redirects use `safeReturnPath`, and Better Auth validates `callbackURL` (no app test covers the latter).
- The 24 email templates pass subjects through `tidy`, so no line breaks; links come from `requestOrigin` against `allowedHosts` (`auth.ts:144-158`).
- No upload handler; `readFile` paths are fixed; every `fetch` goes to a fixed URL (`mail-transport.ts:130`, `breached-password.ts:30`, `invitation-cards/assets.ts:14`).
- Stored reference URLs have the CHECK `references_url_absolute` (`ingredients/schema/references.ts:81`).

### 6. Headers And Cookies

Checked, clean (lane D), apart from SEC-11 and SEC-12:

- The policy also has `object-src 'none'`, `base-uri 'self'`, `form-action 'self'` and `frame-ancestors 'none'`. `img-src` is `'self' data: blob:` and `connect-src` is `'self'`.
- Referrer-Policy is `strict-origin-when-cross-origin`, with `no-referrer` and no-store on `/support/request` (`REFERRING_DOCUMENTS` at `security-headers.ts:19`, `src/lib/cdn-cache-headers.ts`). `nosniff` is on every route but the workshop.
- The `src/proxy.ts` matcher excludes `api/`, `_next/` and `.well-known/workflow/`. `RETURN_PATH_HEADER` is overwritten on every request, and `x-forwarded-host` is validated by a pattern. The workshop gets its own `connect-src` policy; `tests/proxy.test.ts` covers the policy header.
- Only Better Auth's cookies are set. Browser storage holds preferences, and the support view token is in `sessionStorage`. No `Access-Control-*` header exists in `src`, and no `images.remotePatterns`.

### 7. Secrets And Environment Variables

Checked, clean (lane D), apart from SEC-1, SEC-14 and SEC-16:

- `.env.example` and `requiredInProduction` in `src/lib/env.ts`; no client code reads a secret.
- `git grep` and a full-history search found no secret. The one key-shaped hit is a `github_pat_` placeholder of `x` characters in `Docker/.env.example` (commit `87a80c034`). The coordinator searched every commit on every branch for a database address that holds a password, and read only the user and host of each match. Every match points at a local or made-up host: the compose service, `localhost`, `127.0.0.1`, example hosts, and one invented Neon host in a test fixture. The files are tests, CI workflows, compose files, `.env.example`, and docs.
- `E2E_PLAIN_SESSION_COOKIE` works only with `!VERCEL_ENV` (`src/lib/e2e-session-cookie.ts`). The seed loader takes `approved` files only (`src/db/seed/compendium.ts:77`). `seed-environment.yml` has `permissions: contents: read` and masks the database URL.

| Aspect              | Production                           | Staging                         | Hotfix preview                                    |
| ------------------- | ------------------------------------ | ------------------------------- | ------------------------------------------------- |
| Database            | main branch                          | staging branch                  | own branch per deployment                         |
| Sign-in secret      | shared value (SEC-1)                 | same                            | same                                              |
| Impersonation       | never                                | only if the Preview flag is set | same as staging                                   |
| Mail transport      | `resend` only                        | `mailtrap-sandbox` only         | same as staging                                   |
| Robots              | allows named paths                   | `Disallow: /` and noindex       | same as staging                                   |
| Workshop            | absent                               | at `/workshop`, Keepers only    | absent                                            |
| Cron                | runs                                 | none (secret unset on Preview)  | none                                              |
| Real sign-in        | Google, Discord, Facebook, Microsoft | same                            | cannot complete (redirect addresses unregistered) |
| Protection in front | none named in the repository         | none named                      | none named                                        |

### 8. Dependencies

Checked, clean (lanes D, G), apart from SEC-13: `package-lock.json` is present, CI uses `npm ci` (`deploy.yml:197`, `migrate.yml:83`, `seed-environment.yml:85`), there is no `.npmrc`, no dependency is a git address, and Dependabot runs weekly for npm, github-actions and docker into staging. `npm audit` reported 0 advisories on 2026-11-19, in a production run and an all-dependency run.

| Workflow                                 | Trigger                                                         | Permissions                                        | Fork pull request              | Secrets besides the token              |
| ---------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------- | ------------------------------ | -------------------------------------- |
| pr-gate                                  | pull_request into main, staging, release                        | contents read, packages write, pull-requests write | no secrets, read-only token    | none                                   |
| deploy                                   | push to main or staging; pull_request into main from `hotfix/*` | contents read, pull-requests write                 | no explicit guard (SEC-2)      | Vercel (3), database URLs, auth secret |
| close-task-on-merge                      | pull_request closed into staging                                | issues write, pull-requests read                   | read-only token                | none                                   |
| oversized-label                          | pull_request                                                    | pull-requests write                                | the label step fails on a fork | none                                   |
| e2e-cache                                | push to staging                                                 | per job                                            | not reachable                  | none                                   |
| neon-snapshot-prune                      | schedule, dispatch                                              | contents read                                      | not reachable                  | Neon pair                              |
| seed-environment                         | dispatch                                                        | contents read                                      | not reachable                  | Vercel, database URLs                  |
| migrate and the other reusable workflows | workflow_call                                                   | as the caller                                      | as the caller                  | migrate: Vercel, database URLs         |

No `pull_request_target` and no `workflow_run` exist, so no privileged job consumes an untrusted artifact. Untrusted fields (PR body, branch names, labels, actor) go through `env:` in every `run:` step.

### 9. The Pages Open Without An Account

Checked, clean (lanes D, E, F), apart from SEC-3 and SEC-10:

- `src/lib/public-routes.ts` lists them. The entry page reads `readCompendiumEntry(slug)` with no session; hidden entries need `includeHidden: seesReview(viewer)`, which the public route does not pass. `covensHoldingEntry` is per viewer and not cached.
- `sendSignedOutSupportRequest` (`src/modules/support/services/signed-out.ts:45-95`) has a topic allow-list, a honeypot field, a Keeper time-out check, database-counted limits (10 per address, 30 per client, 24 hours) and a hashed token. Tests: `tests/modules/support/services/support-signed-out.test.ts`, `tests/db/rate-limiting.test.ts`.
- The three cron routes use `cronRoute`; tests `tests/lib/cron-request.test.ts` and `tests/app/cron-routes.test.ts`.
- The Compendium seed loader takes `approved` files only.

## Not Checked

Merged from the lanes and the verifier, at the end of their last pass.

- **Code and tests:**
  - Whether `UpdateSpellInputSchema` refuses a null revision.
  - The loader tests; the bodies of the auth tests, `passkey-hosts.test.ts`, and the vocabulary test bodies beyond the Forbidden lines.
  - `claude-docs/auth/route-protection.md`, `plugins.md`, and `src/lib/request-session.ts` lines 200-229.
  - That no resolver returns an invitation token, and the database CHECK in the migration.
  - The `cronRoute` origin helper's source; the `setEmail` `next` argument was not traced into a link.
  - The reset endpoint (single use of reset tokens), the passkey-delete hook, and the Keeper and Curator role-removal service in full.
  - `ingredient-rows.ts:544-590` (read in part), and the `setSupportRequestIssueUrl` format check.
  - No sweep of every `(shell)` page; whether each guard has a direct-id refusal test; the signed-out `compendium` response was not exercised; whether a Keeper invitation send has any limit.
  - The `deploy.yml` workshop condition; the composite actions `job-summary` and `pr-comment` were not fully read.
- **The graph:** only lanes A and E used graphify, for a few queries; it is two commits behind.
- **Outside the repository, with what settles each:**
  1. Vercel Deployment Protection on staging and previews: the owner reads the project's Deployment Protection setting.
  2. The firewall rules: the owner reads the firewall page.
  3. Per-environment secrets, and `ENABLE_IMPERSONATION` on Preview: the owner reads the environment-variable list per environment.
  4. The older branch-protection settings and the Actions permission settings, including "Send secrets to workflows from fork pull requests": the owner reads them with a token that may.
  5. The live response headers: a browser's Network tab, signed out, on a page and an `/api` address (the headers named under "What The Owner Needs To Do").
  6. Live introspection and error output: send an introspection query to production in a browser and read the answer. Also GitHub's secret scanning setting.

## Drafted Follow-Up Tasks

None of these tasks is minted, and no task id is assigned until the owner approves it. Each estimate is scaled to the finished tasks MB.80 (2h), MB.82 (4h), MB.84 (7h) and MB.289 (6.5h), as recorded in `claude-docs/audits/seo.md:358`, and MB.206 and MB.226 (3h each, `claude-docs/tasks/v1/mb.md:7,29`). Every figure is an estimate. SEC-19 and SEC-20 get no task. SEC-9 and SEC-10 stay separate tasks because they change different code.

### Replace The Shared Sign-In Secret · 2h

_Story:_ As the site owner, I want production and Preview to hold different random sign-in secrets, so that a value learned from a preview build cannot sign a link for production.

From SEC-1.

_Acceptance criteria:_

- The value of `BETTER_AUTH_SECRET` is new for production and different for Preview, each generated randomly.
- `claude-docs/secrets.md` no longer says the value is shared or short.
- Signing in works on production and staging after the change.
- An email-verification link signed with the old value is refused.
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass.

Estimate based on: MB.80 (2h). The figure is an estimate; the work is a rotation with a doc edit and one test.

### Put The Deploy Build Behind An Environment · 3h

_Story:_ As the site owner, I want the job that builds pull-request code to hold no production secrets without a reviewer, so that a writer cannot read them by editing a workflow.

From SEC-2.

_Acceptance criteria:_

- The build job names a GitHub Environment with a required reviewer, or holds secrets only in the steps that need them.
- A required-status-checks rule exists on `main` and `staging`.
- A hotfix pull request still deploys a preview.
- `npm run format:check` and `npm run lint` pass.

Estimate based on: MB.206 (3h). The figure is an estimate; the work is workflow and settings changes.

### Scope Audit Fields To Curators · 1.5h

_Story:_ As a person reading the Compendium, I want staff ids hidden from signed-out readers, so that the accounts that curate it are not listed to outsiders.

From SEC-3.

_Acceptance criteria:_

- The owner has decided whether staff ids are public.
- If not, a signed-out `compendium` query returns null for `createdBy` and `updatedBy`.
- A Curator still reads them.
- A test fails with the scope removed.
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass.

Estimate based on: MB.80 (2h), scaled down. The figure is an estimate; the change is one field and one test.

### Hash The Lockout-Mail Reset Token · 2h

_Story:_ As an account holder, I want reset tokens stored as hashes, so that a database read does not hand out a working reset link.

From SEC-4.

_Acceptance criteria:_

- The lockout-mail token is stored as a hash and looked up by its hash.
- A test shows the stored value differs from the mailed token and the mailed token still works once.
- The repository records whether Better Auth's reset token is single use.
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass.

Estimate based on: MB.80 (2h). The figure is an estimate.

### End Other Sessions After Account Security Changes · 3h

_Story:_ As an account holder, I want my other sessions to end when I change my email, delete a passkey or turn on two-factor, so that a stolen session does not outlive the change.

From SEC-5.

_Acceptance criteria:_

- Each of the three events ends every session but the current one.
- A test for each event fails with the revocation removed.
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass.

Estimate based on: MB.206 (3h). The figure is an estimate.

### Decide Two-Factor For Keepers And Curators · 3h

_Story:_ As the site owner, I want a decision on requiring a second step for Keepers and Curators, so that staff accounts are held to the standard I choose.

From SEC-6.

_Acceptance criteria:_

- The owner has chosen to require two-factor or a passkey for Keepers and Curators, or to leave it optional.
- If required, granting either role to an account without one is refused, and a test fails with the check removed.
- `claude-docs/auth/two-factor.md` states the decision.
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass.

Estimate based on: MB.82 (4h). The figure is an estimate; the work depends on the decision.

### Scope Spell Writers To Readable Spells · 1h

_Story:_ As a coven member, I want spell updates checked against what I may read at the repository too, so that one skipped service check cannot change a private spell.

From SEC-7.

_Acceptance criteria:_

- The three writers in `write.ts` AND `readableSpells(membership)` for spells.
- A test calls the writer directly with a spell the caller cannot read and sees it refused, with the service's read removed.
- `UpdateSpellInputSchema` is recorded as refusing, or is made to refuse, a null revision.
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass.

Estimate based on: MB.80 (2h), scaled down. The figure is an estimate.

### Tighten The Impersonation Gate · 2h

_Story:_ As the site owner, I want impersonation limited to named environments and to non-Keeper targets, so that a mistaken flag cannot expose staff accounts.

From SEC-8.

_Acceptance criteria:_

- Impersonation is allowed only where `VERCEL_ENV` is `preview`, or staging by name, and the flag is set.
- Impersonating a Keeper is refused.
- The owner has recorded whether previews sit behind Deployment Protection.
- A test fails with each refusal removed.
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass.

Estimate based on: MB.80 (2h). The figure is an estimate.

### Cap The Size Of GraphQL Inputs · 5h

_Story:_ As the site owner, I want every text field and list to have a size cap and the route a body limit, so that one large request cannot slow the site.

From SEC-9.

_Acceptance criteria:_

- `requiredText` and `optionalText` carry a default cap, with named smaller caps for names and titles.
- Every array input has a `.max()`.
- The public `compendium` and help search `query` have a cap, including quoted phrases and exclusions.
- The route refuses a body over a set size.
- A test per cap fails with the cap removed.
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass.

Estimate based on: MB.82 (4h) and MB.289 (6.5h). The figure is an estimate; the change touches many validation files.

### Rate-Limit The GraphQL Route And Public Searches · 5h

_Story:_ As the site owner, I want a per-client limit on GraphQL and the public searches, so that a flood cannot load the database.

From SEC-10.

_Acceptance criteria:_

- The public searches and the GraphQL route answer a client over a set rate with a limit error.
- Keeper invitation sends are limited.
- A test fails with the limit removed.
- `claude-docs/auth/rate-limiting.md` lists the new limits.
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass.

Estimate based on: MB.82 (4h) and MB.289 (6.5h). The figure is an estimate.

### Replace Inline Scripts With A Nonce · 6h

_Story:_ As the site owner, I want the Content-Security-Policy to refuse inline scripts, so that an injected script would not run.

From SEC-11.

_Acceptance criteria:_

- `script-src` has no `'unsafe-inline'`.
- The four pre-paint scripts run under a nonce set in `src/proxy.ts`.
- The owner has accepted the effect on page caching.
- A browser test shows a script without the nonce is blocked.
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass.

Estimate based on: MB.289 (6.5h). The figure is an estimate.

### Set The Missing Response Headers · 2h

_Story:_ As the site owner, I want Permissions-Policy, Cross-Origin-Opener-Policy and X-Frame-Options set, and `X-Powered-By` off, so that the browser's defences are on.

From SEC-12.

_Acceptance criteria:_

- The owner has read the live headers and listed which are missing.
- The missing ones are set in `src/lib/security-headers.ts` or `next.config.ts`; `poweredByHeader` is false.
- `/api/*` carries the policy and Referrer-Policy it should.
- A test fails with each header removed.
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass.

Estimate based on: MB.80 (2h). The figure is an estimate.

### Harden The Supply Chain In CI · 5h

_Story:_ As the site owner, I want pinned actions, a locked CLI and an audit that can fail the build, so that a poisoned release cannot reach a job holding secrets.

From SEC-13.

_Acceptance criteria:_

- Third-party actions are pinned to commit ids, and the own action is pinned too.
- The Vercel CLI is installed from the lockfile in the four workflows.
- `npm audit` fails the build at a set level, and `npm audit signatures` runs.
- `npm run format:check` and `npm run lint` pass.

Estimate based on: MB.82 (4h). The figure is an estimate.

### Stop Logging Mail Contents · 0.5h

_Story:_ As the site owner, I want mail bodies never logged in production, so that a link in a log cannot be used.

From SEC-14.

_Acceptance criteria:_

- With `NODE_ENV` production, the transport logs only the recipient count and subject.
- The provider response body is not logged in full.
- The comment at `mail-transport.ts:109` is true.
- A test fails with the change removed.
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass.

Estimate based on: MB.80 (2h), scaled down. The figure is an estimate.

### Clear Autosaved Forms At Sign-Out · 1.5h

_Story:_ As a person on a shared browser, I want my unsaved spell and ingredient text removed when I sign out, so that the next person cannot read it.

From SEC-15.

_Acceptance criteria:_

- Signing out removes every `autosave:` key.
- A browser test shows the key is gone after sign-out.
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass.

Estimate based on: MB.80 (2h), scaled down. The figure is an estimate.

### Refuse Seed Drops On Non-Local Databases · 1h

_Story:_ As a developer, I want the seed script to refuse dropping a database that is not local, so that a wrong URL cannot wipe production.

From SEC-16.

_Acceptance criteria:_

- `drop` is refused when the target host is not local, whatever `NODE_ENV` is.
- A test covers the refusal and fails with it removed.
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass.

Estimate based on: MB.80 (2h), scaled down. The figure is an estimate.

### Add A Secret Scanner And A Static Analyser To CI · 4h

_Story:_ As the site owner, I want a secret scanner and CodeQL (or the like) in CI, so that a committed secret or known insecure pattern is caught early.

From SEC-17.

_Acceptance criteria:_

- A secret scanner runs on every pull request and fails on a finding.
- A static analyser runs on every pull request or on a schedule, and its results are visible.
- The owner has read GitHub's secret scanning setting.
- `npm run format:check` and `npm run lint` pass.

Estimate based on: MB.82 (4h). The figure is an estimate.

### Correct The Count Of Proofless Finders In The Database Rule · 1h

_Story:_ As a developer, I want the database rule to list every finder that takes no proof, so that the rule matches the code.

From SEC-18.

_Acceptance criteria:_

- `.claude/rules/database.md` names every finder listed under SEC-18, or points to `claude-docs/db/write-path.md`, "Reads that take no proof".
- The count in the rule matches the code.
- `npm run format:check` and `npm run lint` pass.

Estimate based on: MB.80 (2h), scaled down. The figure is an estimate; the change is a doc edit.

## Sources

- [S1] OWASP. "Secure Coding with AI Cheat Sheet." _OWASP Cheat Sheet Series_. https://cheatsheetseries.owasp.org/cheatsheets/Secure_Coding_with_AI_Cheat_Sheet.html
- [S2] Semgrep. "Finding vulnerabilities in modern web apps using Claude Code and OpenAI Codex." https://ai.semgrep.dev/blog/2025/finding-vulnerabilities-in-modern-web-apps-using-claude-code-and-openai-codex
- [S3] Dev.to. "Why one-shot LLM security audits keep missing real bugs" (secondary). https://dev.to/alanwest/why-one-shot-llm-security-audits-keep-missing-real-bugs-p41
- [S4] Willison, S. "From Naptime to Big Sleep" (a summary of Project Zero's work, secondary). https://feeds.simonwillison.net/2024/Nov/1/from-naptime-to-big-sleep/
- [S5] Semgrep. "Semgrep is confidently handling 60% of all triage for users without reducing coverage." https://ai.semgrep.dev/blog/2025/semgrep-is-confidently-handling-60-of-all-triage-for-users-without-reducing-coverage
- [S6] Anthropic. "claude-code-security-review" README. https://github.com/anthropics/claude-code-security-review
- [S7] OpenSSF. "Security-Focused Guide for AI Code Assistant Instructions." https://best.openssf.org/Security-Focused-Guide-for-AI-Code-Assistant-Instructions
- [S8] OWASP. "API Security Top 10, 2023 edition." https://api-security.owasp.org/editions/2023/en/0x11-t10
- [S9] OWASP. "Top 10, 2025." https://top10.owasp.org/2025
- [S10] Better Auth. "Security." https://better-auth.com/docs/reference/security
- [S11] GitHub. "Security hardening for GitHub Actions." https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions
- [S12] npm. "Generating provenance statements." https://docs.npmjs.com/generating-provenance-statements
- [S13] Next.js. "Data security." https://nextjs.org/docs/app/guides/data-security
- [S14] Vercel. "Deployment Protection." https://vercel.com/docs/deployment-protection
- [S15] Vercel. "Security overview." https://vercel.com/docs/security
- [S16] Vercel. "Managing cron jobs." https://vercel.com/docs/cron-jobs/manage-cron-jobs
- [S17] The Guild. "GraphQL Yoga: GraphiQL." (The "Prepare for production" page was seen in search results and not opened.) https://the-guild.dev/graphql/yoga-server/docs/features/graphiql
- [S18] Fastly. "CVE-2025-29927: authorization bypass in Next.js" (secondary). https://fastly.com/blog/cve-2025-29927-authorization-bypass-in-next-js
- [S19] The repository's own settings as read by the coordinator with `gh` on 2026-11-19, and the owner's approved 9 signed-out requests to production the same day.
