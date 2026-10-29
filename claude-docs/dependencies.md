# Dependencies

What is behind, what is blocked and what has no fix, as of the audit of 2026-10-12 (M10.30). It covers all 69 direct dependencies, 34 runtime and 35 dev. Each open item below ends with when to look at it again.

## How the audit is run

From a clean checkout, in this order:

- `npm outdated --json` lists each package whose installed version is behind. Compare `current` with `wanted` (the newest release the `package.json` range allows) and `latest` (the newest release at all). Behind `wanted` means the lockfile is stale, and one `npm update` moves it. Ahead only in `latest` means a major, which needs a decision.
- `npm audit --json` lists the advisories. A suggested fix that is a downgrade is not a fix; this repo answers it with No.
- The deprecation list is read from the lockfile, because `npm install` prints it only on a fresh tree:
  `jq -r '.packages | to_entries[] | select(.value.deprecated != null) | "\(.key)\t\(.value.deprecated)"' package-lock.json`

## What Dependabot covers

`.github/dependabot.yml` opens weekly npm, GitHub Actions and Docker PRs into `staging`, and groups React and Better Auth. It does not swap a deprecated package for its successor, take a major that needs code changes, move a held package, or explain an advisory with no fix. Those are tasks. The CI `audit` leg in `checks.yml` is non-blocking and only comments.

## `graphql` 17 is blocked upstream

`graphql` 17.0.2 is out. Yoga, Pothos, graphql-scalars, codegen and the typed-document-node core accept it. Two packages do not:

- `graphql-request@7.4.0` (peer `14 - 16`) is the old name of Graffle, kept on a branch with occasional releases, so a 17 range is unlikely. This repo uses only its `request()` and `ClientError`, so M10.31 replaced it with a small `fetch` wrapper (`src/lib/graphql-client.ts`).
- `@escape.tech/graphql-armor@3.2.0` (peer `^16.10.0`) has an open request for 17, issue #885 (September 2026).

**Revisit when** `graphql-armor` accepts `graphql` 17; it is the only blocker left. The pin's reasoning is [`graphql/graphql-pin.md`](graphql/graphql-pin.md).

## `msw` 3 is on hold

msw 3.0.3 is out and the move is small: subpath imports and one renamed option (M10.29). It is on hold since 2026-10-12 because its `@mswjs/interceptors` 0.45 intercepts raw TCP sockets and writes a passed-through socket's first chunk twice, which breaks postgres.js's handshake in every test that mocks HTTP while talking to Postgres (mswjs/interceptors issue #860, open). The tests stay on msw 2.15. **Revisit when** interceptors ships the fix; the finished move waits on the `feature/m10.29-msw-3` branch.

## Only prereleases ahead

- `drizzle-orm` and `drizzle-kit` `1.0.0-rc.4` (June 2026); `latest` is still 0.45 and 0.31. [`db/orm-version.md`](db/orm-version.md) holds the decision and its three triggers; none has fired. **Revisit when** `1.0` reaches the `latest` dist-tag.
- `react-hook-form` `8.0.0-beta.4` (September 2026), `yaml` `3.0.0-2`, and `prettier` `4.0.0-alpha.13` (no release since November 2025). **Revisit when** `latest` moves on any of them.

## Advisories and deprecations with no fix

`npm audit` reported 0 findings on 2026-10-29. The advisories below are no longer reported (the lockfile resolves past or away from them); each stays listed with its revisit condition in case it returns. They were all in devDependencies, and none had a real fix:

- **braces up to 3.0.3, GHSA-vfj7-8cjw-p6xm** (CVSS 8.7, September 2026): a deeply nested brace pattern from an attacker exhausts the stack. No patched version exists. It is reached through `micromatch`, `fast-glob` and `globby` under `stylelint` and `@graphql-codegen/cli`, each at its latest release, and none takes glob patterns from users. **Revisit when** a patched `braces` is published.
- **esbuild up to 0.24.2, GHSA-67mh-4wv8-2f99**, under `drizzle-kit` and its deprecated `@esbuild-kit/esm-loader`. Accepted in [`db/orm-version.md`](db/orm-version.md); `drizzle-kit@1.0.0-rc` drops `@esbuild-kit`, so it clears with the ORM move above.
- `node-domexception` is deprecated and reached through `@graphql-codegen/cli` and `sync-fetch` to `node-fetch@3`. It is upstream's to fix.
