# Take the new version (PR #1542): turn off the new read mode, and enforce channel binding

## Context

PR #1542 is Dependabot's bump of the `postgres` package (postgres.js, our Postgres driver) to its next major version. CI fails 223 tests in 16 files, all with `Error: read ENOTCONN`.

- **Why:** the new major version opens an unencrypted connection in Node's custom read mode (`onread`) by default. msw, the library that fakes outside web services in tests, intercepts every socket, including database ones. Its passthrough swaps in a socket that ignores that read mode, so the first read fails.
- **The same fault can make tests flaky:** a pool that opens a second connection after msw starts fails the same way. That was reproduced with two concurrent transactions.
- **Production never uses the read mode.** Neon URLs use `sslmode=require`, which starts unencrypted and then upgrades to TLS, and that path never sets `onread`.
- **Channel binding.** 4.0.0 also reads `channel_binding` from the URL itself. Channel binding is a login check tied to the server's TLS certificate. Today `src/db/connection-url.ts` strips `channel_binding` from every URL, because the old major version forwarded it to the server, which refused it with `42704`. Under the new version the strip only throws the setting away: Neon's `channel_binding=require` would be enforced if we let it through.

Decisions you made:

- Option 3: `onread: false` everywhere.
- No upstream issue.
- The repo-wide fix goes in this PR.
- Keep the existing worktrees.
- Channel binding only: credentials in Vercel and GitHub stay as they are.

**Finding that shrinks the work:** every Vitest project that touches the database (`db`, `db-mocking` and `workflow`) already redirects `import postgres from 'postgres'` to one wrapper, [tests/support/db/bounded-postgres.ts](tests/support/db/bounded-postgres.ts). The redirect is a Vite plugin in [tests/support/db-project.mts:55](tests/support/db-project.mts#L55), and it covers both `connection.ts` and each test file's own client. So the "shared helper plus guard" already exists, and it can't be bypassed in those projects: one option added to `bounded()` fixes every Vitest client. The 17 per-file edits in `/home/node/worktrees/pr-1542-b` are not needed. Playwright specs build real clients, but nothing there uses msw.

## Steps

Two agents, one after the other, in one new worktree, `/home/node/worktrees/postgres-4`. It's on a local branch from the PR head (`1742dc7b7`), with `node_modules` copied from `/home/node/worktrees/pr-1542` (which already has the new version), the copied tsc cache deleted, and `.env.local` copied in. Each agent commits each green step. The two existing worktrees are left as they are.

- **Opus agent: the tests.** It writes the tests in step 1 and the test change in step 4, runs them, and confirms they fail for the stated reason. Then it commits and stops.
- **Sonnet agent: the implementation.** It does the code in steps 2–4 and the docs in step 5, until the Opus agent's tests pass. It must not weaken those tests.

1. **Regression test first, and watch it fail (Opus).** The test starts msw and only then opens a client, and runs two concurrent transactions on it, expecting both to succeed. Without the fix it fails with `ENOTCONN`. It goes where the `db-mocking` project's list reaches, following the test-location rules.
2. **Test harness fix.** In [tests/support/db/bounded-postgres.ts](tests/support/db/bounded-postgres.ts), add `onread: false` to the options in `bounded()`. A one-line comment says why: msw's socket passthrough ignores Node's `onread` mode.
3. **App client.** In [src/db/connection.ts:22](src/db/connection.ts#L22), use `postgres(url, { onread: false })` with no environment check, so local, test and Neon all read the same way. [scripts/probe-database.ts:117](scripts/probe-database.ts#L117) gets the same option, so the probe connects the way the app does.
4. **Channel binding.** In [src/db/connection-url.ts](src/db/connection-url.ts), remove `'channel_binding'` from `CLIENT_ONLY_PARAMS`, and rewrite the comments that say postgres.js forwards it or never enforces it. The driver now reads it, enforces `require`, and defaults to `prefer`.
   - Opus updates the existing `withoutClientOnlyParams` test so that `channel_binding=require` survives the strip, before Sonnet changes the list.
   - Confirm that `drizzle-kit` resolves the same package (`npm ls postgres`). Otherwise `drizzle.config.ts` would forward the setting to the server again.
5. **Docs.** Correct every doc this makes wrong, with no version numbers in the text:
   - [claude-docs/db.md](claude-docs/db.md): the connection options.
   - `claude-docs/testing/db-harness.md`: the bounded client and why it sets `onread: false`.
   - [claude-docs/secrets.md:285-292](claude-docs/secrets.md#L285): "`channel_binding=require` can stay" becomes "is enforced".
   - [claude-docs/ci/deploy.md:203-216](claude-docs/ci/deploy.md#L203): the strip paragraph, and what the probe's `CHANNEL_BINDING_REQUIRED` error means.
   - Copy this approved plan into `claude-docs/design-decisions/postgres-driver-read-mode-and-channel-binding.md`.

## Verification

- Run, in one command:
  - the new regression test
  - the 17 msw files: the 16 that failed in CI, plus `admin-role.test.ts`
  - the `connection-url` test

  First check whether `npm test` takes the Vitest lock itself.

- Run `npm run pre-commit`: lint, format and type checks on the changed files.
- Check that the driver reads channel binding instead of forwarding it. Run `scripts/probe-database.ts` three times, each against a scratch database `sorrel_pg4`, never the shared `sorrel`:

  | URL ending                                                 | Expected result                                                             |
  | ---------------------------------------------------------- | --------------------------------------------------------------------------- |
  | `?channel_binding=require`                                 | `CHANNEL_BINDING_REQUIRED`, because local Postgres has no TLS. Not `42704`. |
  | `?channel_binding=prefer`                                  | connects                                                                    |
  | `?channel_binding=require`, run with `drizzle-kit migrate` | `CHANNEL_BINDING_REQUIRED`, not `42704`                                     |

  Then drop `sorrel_pg4`.

- No full suites, and no local e2e run: no spec is touched, and CI runs Playwright.
- The Sonnet agent stops with local commits and reports. **Pushing is your call.** Pushing to `dependabot/npm_and_yarn/staging/postgres-4.0.0` puts the work on PR #1542, and Dependabot then stops rebasing that branch.
- After merge, on staging:
  - The migrate job's probe should report a successful connection.
  - Sign in.
  - Save and reload a record with a date.

  If Neon's staging URL carries `channel_binding=require` and the connection fails, the probe names `CHANNEL_BINDING_REQUIRED`.
