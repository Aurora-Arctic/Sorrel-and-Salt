# Dependencies

What is behind, what is blocked and what has no fix, as of the audit of 2026-10-12 (M10.30), with the items below rechecked on 2026-10-30. It covers all 69 direct dependencies, 34 runtime and 35 dev. Each open item below ends with when to look at it again.

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
- `@escape.tech/graphql-armor@3.2.0` depends on `graphql@^16.10.0` as a hard `dependencies` entry in each sub-package (checked on `graphql-armor` and `graphql-armor-max-depth`), not a peer range, so installing `graphql` 17 would put a second copy of 16 under armor, the "another module or realm" failure. It has an open request for 17, issue #885 (September 2026), and its `latest` is still 3.2.0, published 2025-12-29 (checked 2026-10-30).

**Revisit when** an armor release accepts `graphql` 17, or #885 closes; armor is the only blocker left. The pin's reasoning is [`graphql/graphql-pin.md`](graphql/graphql-pin.md).

## `postgres` 4 is held

`postgres` 4.0.0 was released on 2026-10-29. It rewrites the pool, connection, protocol and socket layer, and changes behaviour the repo could rely on: `infer: false` is now the default, a `Date` written to a `timestamp` column outside UTC is taken as UTC, `sql.array()` is removed, a transaction the server rolled back now rejects, and the package is ES-module only. `drizzle-orm` 0.45's peer range is `>=3`, so the range allows it, but drizzle has said nothing about postgres 4. The repo stays on 3. **Revisit when** 4.0.1 or later ships, or `drizzle-orm` says postgres 4 works.

## Only prereleases ahead

- `drizzle-orm` and `drizzle-kit` `1.0.0-rc.4` (June 2026); `latest` is still 0.45 and 0.31. [`db/orm-version.md`](db/orm-version.md) holds the decision and its three triggers; none has fired. **Revisit when** `1.0` reaches the `latest` dist-tag.
- `react-hook-form` `8.0.0-beta.4` (September 2026), `yaml` `3.0.0-2`, and `prettier` `4.0.0-alpha.13` (no release since November 2025). **Revisit when** `latest` moves on any of them.

## Advisories and deprecations with no fix

`npm audit` reported 0 findings on 2026-10-29. The advisories below are no longer reported (the lockfile resolves past or away from them); each stays listed with its revisit condition in case it returns. They were all in devDependencies, and none had a real fix:

- **braces up to 3.0.3, GHSA-vfj7-8cjw-p6xm** (CVSS 8.7, September 2026): a deeply nested brace pattern from an attacker exhausts the stack. No patched version exists. It is reached through `micromatch`, `fast-glob` and `globby` under `stylelint` and `@graphql-codegen/cli`, each at its latest release, and none takes glob patterns from users. **Revisit when** a patched `braces` is published.
- **esbuild up to 0.24.2, GHSA-67mh-4wv8-2f99**, under `drizzle-kit` and its deprecated `@esbuild-kit/esm-loader`. Accepted in [`db/orm-version.md`](db/orm-version.md); `drizzle-kit@1.0.0-rc` drops `@esbuild-kit`, so it clears with the ORM move above.
- `tsconfck`, under `vite-tsconfig-paths`, is deprecated as "unmaintained" (seen 2026-10-30). It is upstream's to fix; **revisit when** `vite-tsconfig-paths` moves to another resolver.
- `node-domexception` is deprecated and reached through `@graphql-codegen/cli` and `sync-fetch` to `node-fetch@3`. It is upstream's to fix.

## `qrcode` draws the cards' codes

`qrcode` supplies the module matrix (`QRCode.create`) for an invitation card's code (M15.19). The repo draws the SVG itself, because the package draws squares only. It is used in the browser, where the admin's page renders each card and builds the batch's PDF, and takes no part in any server path.
