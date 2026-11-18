# Verifying the review tools before setup

Record for M17.31 (issue #1721). It checks every "Verify first" item of the local code review POC brief against the repo and the tools, before anything is installed. Nothing in the repo, the dev container setup or the workflows was changed. Every output below was produced on 2026-11-18 inside the dev container (`/home/node/worktrees/m17.31-m17.33`), unless a row says otherwise.

## Results at a glance

| #   | Check                                               | Result                                                                                                                                                                                                                                                                                                                             |
| --- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `.devcontainer/` build and `uname -m`               | Not run: the build needs `docker`, which the container lacks. Files read and `uname -m` run                                                                                                                                                                                                                                        |
| 2   | Package manager, `src/` or `app/`                   | Pass: npm, `src/`                                                                                                                                                                                                                                                                                                                  |
| 3   | `pr-gate.yml` triggers and checks                   | Pass (read). Differs from the brief: bases `main`, `staging`, `release/**` only                                                                                                                                                                                                                                                    |
| 4   | Branches Vercel and Neon deploy from                | Pass (read). Deploys are CI-only, from `main`, `staging` and `hotfix/*` PRs                                                                                                                                                                                                                                                        |
| 5   | `depcruise --affected` with `--output-type mermaid` | Fail with the `tsc` parser and the repo's TypeScript 7.0.2 (silent, 0 modules). Pass with the `swc` parser on the real `src/` (one file excluded), and with a second TypeScript 6                                                                                                                                                  |
| 6   | `gh stack` on a public scratch repo                 | Not run: the token cannot create a repository; the owner creates a public repo (Decision 3)                                                                                                                                                                                                                                        |
| 7   | A stack can target `staging`                        | Not run: no scratch repo. The docs say `--base` allows it                                                                                                                                                                                                                                                                          |
| 8   | Plannotator through port 19432                      | Fail run directly (the binary does not start on Alpine). Pass through a private glibc loader without root: `--version`, and HTTP 200 on port 19432. The owner reports the port opened in their host browser (not run by me). Unrun: the full `/plannotator-review` flow from Claude Code, and the port line in `devcontainer.json` |
| 9   | What `install.sh` does beyond the binary            | Pass (read, never run). Full list below                                                                                                                                                                                                                                                                                            |
| 10  | difftastic parses TSX structurally                  | Pass                                                                                                                                                                                                                                                                                                                               |

Three checks need a decision from the owner. They are in "Decisions", at the end.

## 1. How `.devcontainer/` is built, and `uname -m`

Command and output:

```
$ uname -m
aarch64
$ . /etc/os-release; echo "$PRETTY_NAME"
Alpine Linux v3.24
$ which docker make python3
docker not found
make not found
python3 not found
```

What the files say:

- `.devcontainer/devcontainer.json` is compose-based: `dockerComposeFile` lists `../Docker/docker-compose.yaml` and `docker-compose.yml`, service `devcontainer`. Its `postCreateCommand` is `sudo apk add --no-cache github-cli`. `forwardPorts` lists 8000, 8001, 4983, 3456, 9229, 9230, 9231, 9323, 9324, 51204 and 7900. It does not list 19432.
- `.devcontainer/docker-compose.yml` builds `Docker/Dockerfile.node`, target `development`, and mounts `..` at `/app`. It passes the GitHub token in through the `GH_TOKEN` env var.
- `Docker/Dockerfile.node` starts from a Node Alpine image, runs `apk add --no-cache libc6-compat` and `npm ci`.

Result: the dev container is **Alpine Linux (musl), aarch64, using `apk`**. The brief assumes Debian or Ubuntu with `apt`. I could not run the build because the container has no `docker`; the answer comes from the files and from the live `uname -m` and `/etc/os-release`.

## 2. Package manager, and `src/` or `app/`

```
$ ls package-lock.json; ls -d src app
package-lock.json
src
ls: cannot access 'app': No such file or directory
```

Pass: npm (lockfile is `package-lock.json`), source is in `src/`. `package.json` names `next` at a 16 range and `react` at a 19 range. The brief says Next 15.

## 3. `pr-gate.yml` triggers and checks

Read from `.github/workflows/pr-gate.yml`:

- Trigger: `pull_request`, types `opened`, `synchronize`, `reopened`, `edited`, `closed` (line 50), bases `main`, `staging` and `release/**` (line 51 on). A PR whose base is any other branch does not start the gate.
- Jobs: `changes` (path filter), `build-image`, `checks` (lint, typecheck, build, destructive DDL, migration order), `build-db-image`, `vitest`, `build-e2e-image`, `playwright`, `stories` (not required), `playwright-coverage`, `workshop` (not required), `pr-comments`, `gitflow`.
- Concurrency is per PR number.
- It has no dependency-cruiser step.
- `.github/workflows/gitflow.yml` reads `github.event.pull_request.head.ref` and `github.event.pull_request.base.ref` (lines 56 and 57). For a base other than `main`, `staging` or `release/*` the allowed-source pattern is empty and there is no violation.
- There is no `merge_group` workflow. `claude-docs/ci/aggregating-workflows.md:120` says so, and the header of `gitflow.yml` says `merge-queue.yml` was deleted and returns with a later task.

Result: pass. Brief differences are in the table near the end.

## 4. Which branches Vercel and Neon deploy from

From the repo only. No dashboard was opened.

- `vercel.json` lines 3 to 7 set `git.deploymentEnabled` to `false` for `**`: Vercel's own Git integration deploys nothing.
- `.github/workflows/deploy.yml` is the only deployer (header lines 1 to 14). It runs on a push to `main` (production), a push to `staging` (preview, aliased to staging), and a pull request into `main` from a `hotfix/*` branch (preview, aliased per hotfix) (lines 16 to 23 and 40 to 44). A feature PR gets no preview.
- Database selection uses env var names `DATABASE_URL_PRODUCTION` and `DATABASE_URL_STAGING` (`deploy.yml` lines 234 and 246), with `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` for the Vercel project. Values were not read.
- Neon: `claude-docs/design-decisions/data.md`, "Neon branch strategy", sets a persistent `staging` branch and ephemeral, automatically created branches for hotfix previews. `claude-docs/secrets.md` and `claude-docs/ci/deploy.md` carry the rest.

Result: pass. Production deploys from `main`, the preview from `staging`, hotfix previews from `hotfix/*` PRs into `main`.

## 5. `depcruise --affected` with `--output-type mermaid`

Run in a scratch npm project in the scratchpad, never in the repo: a git repo with `src/a.ts` importing `src/b.ts`, a third file `src/c.ts`, `b.ts` modified after the first commit.

First run, with the TypeScript version the repo uses (7.0.2):

```
$ npx depcruise --version
18.8.0
$ npx depcruise src --affected HEAD --output-type mermaid
flowchart LR
$ npx depcruise src --output-type json | jq -c '.summary|{totalCruised,error}'
{"totalCruised":0,"error":0}
$ npx depcruise --info        (lines for typescript and .ts)
x typescript   >=2.0.0 <7.0.0||>=7.1.0 <8.0.0   -
x .ts
```

dependency-cruiser supports TypeScript below 7.0.0, or 7.1.0 and above. The repo's `package.json` pins `typescript` at `^7.0.2`, which is in neither range. dependency-cruiser does not warn: it cruises zero modules and prints an empty graph with exit code 0.

Second run, after installing TypeScript 6 in the scratch project only:

```
$ npx depcruise src --no-config --ts-config tsconfig.json --affected HEAD --output-type mermaid
flowchart LR

subgraph 0["src"]
1["a.ts"]
2["b.ts"]
end
1-->2

style 2 fill:lime,color:black
```

`b.ts` (the changed file) is highlighted and `a.ts` (its importer) is included; `c.ts` is left out. So `--affected` and `--output-type mermaid` work together. `--affected` with no revision defaults to `main`, which does not exist in a Gitflow review against `staging`; it failed with `revision 'main' unknown`, so the review script must always pass `--affected origin/staging`.

Result for the `tsc` parser: fail with the repo's TypeScript, pass with TypeScript 6. The flags work. The repo's TypeScript is not supported by the current dependency-cruiser, and the failure is silent. A TypeScript 7.1 build exists only as `7.1.0-dev.*` snapshots on npm (`npm view typescript versions`).

### Other options tested

The brief's two jobs are separate, and the repo already does one of them.

**Job (a), import rules that fail the gate (no circular imports, no unresolvable imports, the `CLAUDE.md` layering rules).** The repo already has these:

- `.oxlintrc.json` line 84 turns on `import/no-cycle` with `{ "ignoreTypes": true }`; its `no-restricted-imports` patterns and the custom `sorrel/module-boundaries` rule (`lint/sorrel-lint.js`, `module-boundaries` at line 98; allowed edges at line 11) enforce the layering.
- `tests/guards/lint-db-client-boundary.test.ts`, `lint-loader-boundary.test.ts`, `lint-job-boundary.test.ts` and `app-imports.test.ts` prove those rules fail on a probe under `tests/support/lint-probes/`.
- `npm run typecheck` (`tsc --noEmit`) fails an import that does not resolve.

A dependency-cruiser copy of these would duplicate them, so Draft B drops job (a).

**Job (b), the affected-modules Mermaid graph.** Tested in the scratchpad, never in the repo.

- **`swc` parser (dependency-cruiser's experimental, deprecated route, set in the config as `options.parser`; it is not a CLI flag, `--parser swc` is an error).** With TypeScript 7.0.2 still installed and `@swc/core` added, it cruises `.ts` and `.tsx` and resolves the `@/` alias. `@swc/core` has a linux arm64 musl build on npm (`@swc/core-linux-arm64-musl`), and it ran in this container. On the real `src/` it cruised 2145 modules and 10539 dependencies, with two costs. (1) It stops with `Unknown statement type: UsingDeclaration` on `src/modules/documents/jobs/document-mailing.ts:20` (`using claim = createHook(...)`), so that file has to be excluded. (2) It keeps type-only edges, which `tsc` drops, so a `no-circular` rule reported 985 cycles; every one runs through a type-only edge, and a `jq` filter on `.cycle[].dependencyTypes` leaves 0 cycles through a value import. For the graph alone neither matters. `--affected HEAD~4 --output-type mermaid` on the real tree produced a graph (42 KB for the changed files and their importers; 131 KB with no limit on depth). I could not check GitHub's limit on Mermaid size in a comment.
- **`tsc` parser with a second, TypeScript 6 install.** On the real `src/`: 2136 modules, 0 errors, about 3.8 seconds. This is the only route that matches the compiler's view of types. Its cost is a second TypeScript beside the repo's.
- **What is lost without the compiler (the `swc` route):** the `using` syntax is not parsed, type-only imports are not told from value imports unless the output is filtered, and the route is deprecated and experimental, so a later release can remove it.
- **madge, skott, or a small script.** Docs only; I did not test them. I did not check whether either prints Mermaid, or whether either parses TypeScript 7 syntax. They are worth testing only if the owner rejects the routes above.

See Decision 1.

## 6 and 7. `gh stack` on a public scratch repo, and targeting `staging`

Not run. Check 6 runs on a public repository only. Sorrel & Salt becomes private only when the organisation moves to a paid plan, so a private repository on the Free plan is a state the real repository never has; the private-repository half of the check is not run. The scratch repository holds throwaway files and no Sorrel & Salt source.

The brief's order was the `Aurora-Arctic` organisation first, then the authenticated user:

```
$ gh repo create Aurora-Arctic/stack-scratch-m17-31 --private
GraphQL: Resource not accessible by personal access token (createRepository)
$ gh repo create stack-scratch-m17-31 --private
GraphQL: mjoynes-wombat-web does not have the correct permissions to execute `CreateRepository` (createRepository)
```

The token in the container cannot create a repository in either place. I did not widen scopes. No scratch repo exists, so there is nothing to delete. The `gh-stack` extension was installed to read its help and removed again (`gh extension remove gh-stack`; `gh extension list` is empty).

What I could check without a repo:

- `gh stack init --help`: "Use --base to specify a different trunk branch", for example `gh stack init --base develop my-feature`. So `gh stack init --base staging` is the documented way.
- GitHub docs, "About stacked pull requests" (`docs.github.com`, stacked pull requests page): "A stack's trunk is the base branch of the bottom pull request … it can be any branch". The same page says required reviews, required status checks and Actions are evaluated as if each PR targets the stack base.

Result: the documentation says a stack can target `staging`; I could not prove it on a real repo. The scratch repository is decided (Decision 3) and does not exist yet. The M17.33 record (`stacks.md`) lists the questions that need the repo.

## 8. Plannotator through port 19432

Two halves: getting and starting the binary (done here), and opening it in the host browser (the owner's half).

What I did, without `install.sh` running:

```
$ curl -fsSL -o plannotator <release URL>/plannotator-linux-arm64
$ curl -fsSL <release URL>/plannotator-linux-arm64.sha256
9b363302ded9719e5e7eb359e54a63a6d3d79fa77d629276cf7fc581567927cb
$ sha256sum plannotator
9b363302ded9719e5e7eb359e54a63a6d3d79fa77d629276cf7fc581567927cb
$ HOME=<scratch dir> ./plannotator --version
Error relocating .../plannotator: __pthread_key_create: symbol not found
```

- The download and its checksum are proven: the file matches the release's `.sha256`.
- The binary does **not start** in this container. It is built for glibc; the container is musl with `gcompat` and `libc6-compat`, and `gcompat` lacks `__pthread_key_create`.
- The release has no musl build: its assets are `linux-arm64`, `linux-x64`, `darwin-arm64` and `darwin-x64` (`gh api repos/backnotprop/plannotator/releases/latest`).
- So port 19432 was never opened, and `curl` against it could not be run. The env vars `PLANNOTATOR_REMOTE=1`, `PLANNOTATOR_PORT=19432` and `PLANNOTATOR_SHARE=disabled` were not exercised. `install.sh` contains no mention of `PLANNOTATOR_REMOTE` or port 19432, so the installer does not set them.
- Port 19432 is not in `forwardPorts` of `devcontainer.json`, so even a working binary would need that line added.

What the owner can do on the host to prove the browser half. This tests only the host side; it does not prove the container works:

1. On the host (macOS or glibc Linux), download the matching binary and its `.sha256` from the `backnotprop/plannotator` GitHub release page, check `sha256sum` against the file, and `chmod +x` it.
2. Run: `PLANNOTATOR_REMOTE=1 PLANNOTATOR_PORT=19432 PLANNOTATOR_SHARE=disabled ./plannotator annotate <any markdown file>`. I did not run this command, so I could not confirm that `annotate` is the right subcommand; `./plannotator --help` lists them.
3. Open `http://localhost:19432` in the host browser, and from a terminal run `curl -sI http://localhost:19432`.
4. For the container half, see Decision 2.

The owner reports that port 19432 did open in their host browser. This is the owner's observation; I did not run it. Still unrun: the full `/plannotator-review` flow from Claude Code, and adding 19432 to `forwardPorts` in `devcontainer.json`.

### Through a private glibc loader, without root

The binary needs glibc. I tested running it through a glibc loader that sits in a directory of its own, so that nothing in the container's system or `~` changes. In the scratchpad, I downloaded three Debian arm64 packages (`libc6`, `libgcc-s1`, `libstdc++6`), unpacked their `data.tar.xz` with a few lines of node and `tar -xJ` (no root, no `dpkg`), which gave 26 MB under `usr/lib`, and started the binary through that prefix's loader:

```
$ L=<scratch>/glibc/root/usr/lib
$ $L/ld-linux-aarch64.so.1 --library-path $L/aarch64-linux-gnu:$L ./plannotator --version
plannotator 0.28.67
$ PLANNOTATOR_REMOTE=1 PLANNOTATOR_PORT=19432 PLANNOTATOR_SHARE=disabled \
    $L/ld-linux-aarch64.so.1 --library-path $L/aarch64-linux-gnu:$L ./plannotator annotate t.md
  Plannotator session ready: http://localhost:19432
$ curl -sI http://127.0.0.1:19432/
HTTP/1.1 200 OK
x-plannotator-server: 1
```

I stopped the server after the `curl`; `ps` and `ss` show no `plannotator` process and nothing listening on 19432. So `annotate <file>` is a valid subcommand (`--help` lists it), and the server starts in the container. Not proved: the host browser reaching the page (port 19432 is not forwarded), and the `/plannotator-review` flow end to end. The binary was not modified, so I did not need to test whether changing a compiled single-file executable's interpreter is safe; I did not check the documentation for that, and I recommend against doing it, because it was not needed.

### The other routes, from documentation only

- **A glibc package on Alpine (`sgerrand/alpine-pkg-glibc`).** The repository is not archived; its last push is 2024-06-24 and its latest release, `2.35-r1`, is dated 2023-04-13 (`api.github.com/repos/sgerrand/alpine-pkg-glibc`). The release assets are `.apk` files and `APKINDEX.tar.gz`; I found no mention of aarch64 or arm in its README with `grep`, so I could not confirm an aarch64 build. I could not find any advice about it on the Alpine wiki page "Running glibc programs" (that page names `gcompat`, which the container already has and which fails here). Installing it writes into the system and needs root.
- **A Debian compose sidecar.** The Graphify sidecar is the pattern (`origin/feature/graphify-sidecar`). Not tested. The cost is a second compose service that needs the repo's files and `git`, plus a way for the dev container to reach it.
- **Plannotator from source, npm or bun.** The release has only glibc-linked Linux binaries (`linux-arm64`, `linux-x64`). npm has `@plannotator/opencode` (latest `0.28.67`) and the README lists `npm:@plannotator/pi-extension`; I could not check whether either runs the review server under plain Node, so this is open. Bun publishes a linux aarch64 musl build (`bun-linux-aarch64-musl.zip` in the bun releases), so a build from source on Alpine is plausible. I did not test it or read Plannotator's build steps.

Result: fail run directly; pass through a private glibc loader. See Decision 2.

## 9. What `install.sh` does beyond installing the binary

Read in full by section from the downloaded file; never piped to a shell and never run. `install.sh` is large (about 3,800 lines), so this lists what it does by default. A full install:

- Installs the binary into `$HOME/.local/bin` (`INSTALL_DIR`, line 7) after checking its SHA-256 against the release's `.sha256`. Provenance verification (`gh attestation verify`) is off unless `--verify-attestation` is passed.
- Downloads a second tool, the `sem` semantic-diff sidecar, from `Ataraxy-Labs/sem` into `<config dir>/vendor/sem/<version>` (`install_sem_sidecar`, line 1444).
- Does a sparse git checkout of the Plannotator repo and copies skills and slash commands into `${CLAUDE_CONFIG_DIR:-~/.claude}/skills` (and into Codex, OpenCode, Gemini, Kiro, Vibe and Qwen Code homes when it detects them), and writes per-agent hooks and config. It removes some older skill directories it no longer manages (line 2416 on).
- With a terminal attached, asks whether to install extra skills with `npx skills add backnotprop/plannotator/apps/skills/extra --global` (line 2669).
- Updates the Claude Code plugin through `claude plugin marketplace update` and `claude plugin update`, only when the plugin is already installed.
- Writes `install-prefs` and `install-flags.json` into the Plannotator data folder.
- Installs the T3 Code Claude hook into `~/.claude/settings.json` only with `--with-t3`.
- Does not edit shell startup files: it prints the `export PATH=…` line to add by hand (lines 1335 to 1349).
- Does not handle musl: it maps `uname -m` to `arm64` or `x64` and the OS to `linux` or `darwin` (lines 436 to 446) and never checks the C library.

`--minimal` (alias `--binary-only`, or `PLANNOTATOR_MINIMAL=1`) stops after the binary plus `install-flags.json` (lines 1390 to 1400). That is the only mode that matches the brief's aim of "install the binary".

Result: pass. This container mounts `./claude-home` at `/home/node/.claude` (`.devcontainer/docker-compose.yml`), so a full install here would write skills and hooks into the owner's Claude home. I recommend `--minimal` only.

## 10. difftastic on TSX

difftastic's `aarch64` Linux build is a glibc binary; there is no musl build. It runs on this Alpine container through `gcompat`.

```
$ ./difft --version
Difftastic 0.72.0
$ ./difft a.tsx b.tsx            # two versions of src/components/Pager/index.stories.tsx
(header line: TypeScript TSX; changed nodes marked, no fallback notice)
$ ./difft r1.tsx r2.tsx          # same code, reformatted onto different lines
(header "TypeScript TSX"; only the wrapped lines differ; exit 0)
$ DFT_UNSTABLE=yes ./difft --display json r1.tsx r3.tsx | jq -c '{language,status,chunks}'
{"language":"TypeScript TSX","status":"changed","chunks":[ … 3 chunks, token-level: "2" , ")" , "(" … ]}
$ git diff --no-index r1.tsx r3.tsx | grep -c '^[+-][^+-]'
9
```

On the same pair, a line-based diff reports 9 changed lines; difftastic reports three tokens. The language is reported as "TypeScript TSX" and no "falling back to text" notice appears. I could not force difftastic into plain-text mode to compare (`--language text` is not an option in this build).

Result: pass.

## Where the brief differs from the repo

| Brief says                                                                                  | Repo says                                                                                                                  | Correction                                                                                                |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Debian or Ubuntu dev container, `apt`                                                       | Alpine (musl), `apk`, aarch64 (check 1)                                                                                    | Every install step uses `apk` or a musl-compatible binary; glibc-only binaries need Decision 2            |
| Repo name Tarry-A-Spell                                                                     | `Aurora-Arctic/Sorrel-and-Salt`                                                                                            | Use the repo's own name                                                                                   |
| Next 15                                                                                     | `next` at a 16 range (`package.json`)                                                                                      | Next 16                                                                                                   |
| `merge-queue.yml` exists                                                                    | Deleted; `gitflow.yml` header says it returns with a later task; no `merge_group` workflow                                 | Nothing to extend today                                                                                   |
| One trunk branch, `BASE ${BASE:-main}`                                                      | Gitflow: feature work targets `staging`                                                                                    | Default base is `origin/staging`, and `depcruise --affected` must be given it (check 5)                   |
| The gate runs for every pull request                                                        | `pr-gate.yml` runs for bases `main`, `staging`, `release/**` only (check 3)                                                | A stack layer is covered only if GitHub treats it as targeting the stack base; unproved (see `stacks.md`) |
| depcruise works on the repo                                                                 | Repo uses TypeScript 7.0.2; depcruise supports below 7.0.0 or 7.1.0 and above                                              | Decision 1                                                                                                |
| Plannotator installs with `curl … \| bash`                                                  | The installer also writes skills, hooks and agent config into `~/.claude`, and the binary does not start on musl           | Never pipe it; `--minimal` only; Decision 2                                                               |
| Graphify and others install through Python (`uv`)                                           | The container has no Python                                                                                                | Out of scope here; M17.32 covers Graphify                                                                 |
| Test `gh stack` on a private scratch repo                                                   | A public scratch repo, created by the owner (check 6); the real repo is public until the organisation moves to a paid plan | Check 6 runs on a public repo only; Decision 3 (decided)                                                  |
| `git dft` alias, `scripts/review-graph.sh`, `depcruise:check` and `review:affected` scripts | None exist in the repo (`package.json` has no dependency-cruiser)                                                          | They are new files; see the drafted tasks                                                                 |

## Drafted implementation tasks

Drafts only. Nothing is minted until the owner approves them. Hours are my estimates, not measurements.

**Draft A — Make the Dev Container Able to Run the Review Tools** · 3h (estimate)

_Story:_ As the owner, I want the review tools to run inside the dev container, so that the local review loop works the same for every session.

Covers Decision 2 (decided: V, the private glibc prefix with a wrapper). Fallback if V fails in the image: W, Plannotator on the host.

_Acceptance criteria:_

- difftastic is in the dev container image and `difft --version` runs on the Alpine image, with the binary fetched from its release page and checked against its published checksum
- Plannotator is never installed with `install.sh`. The binary is fetched from the release and checked against its `.sha256`
- The three glibc libraries (`libc6`, `libgcc-s1`, `libstdc++6`, about 26 MB) are fetched at image build with pinned checksums and unpacked into a private prefix, outside the system paths
- A `plannotator` wrapper on `PATH` runs the binary through the prefix's loader and sets `PLANNOTATOR_REMOTE=1`, `PLANNOTATOR_PORT=19432` and `PLANNOTATOR_SHARE=disabled`
- Port 19432 is in `forwardPorts` in `.devcontainer/devcontainer.json`
- A test shows `plannotator --version` and an HTTP 200 on port 19432 in the container, and the exact commands are in `claude-docs/`
- `claude-docs/commands.md` lists the new commands
- No tool is installed into the repo's `package.json` unless Draft B says so

**Draft B — Show the Affected Modules in the Review** · 2h (estimate)

_Story:_ As a reviewer, I want a graph of the modules a pull request changes and the modules that import them, so that I see the reach of a change before reading the diff.

Covers Decision 1 (decided: X, dependency-cruiser with the `swc` parser; fallback Y, the `tsc` parser with a second TypeScript 6). The import rules are not in this task: Oxlint already owns them, including cycles (`import/no-cycle`, `no-restricted-imports`, `sorrel/module-boundaries`, proved by `tests/guards/`; check 5). Draft B adds only the graph, and reports no cycles.

_Acceptance criteria:_

- `--affected` is given `origin/staging` (its default is `main`, which does not exist in this flow), and the script fails if it cruises zero modules, so the silent failure in check 5 cannot recur
- The graph is Mermaid, written by one script that `npm run review:affected` calls, and it is advisory: it never fails `pr-gate.yml`
- The `swc` parser is set in the config, which excludes `src/modules/documents/jobs/document-mailing.ts` (the one file `swc` rejects) with a comment saying why, and a test fails when a new file breaks the parser
- A mechanical guard for the new mechanism lands in the same commit (`CLAUDE.md`, "The sweep-task rule")

**Draft C — Run the Gate on Every Stack Layer** · 2h (estimate, rises if the check below fails)

_Story:_ As a reviewer of a stacked pull request, I want every layer to run the full gate and the `gitflow` check, so that no layer reaches `staging` unchecked.

Depends on the scratch-repo run (Decision 3). GitHub's docs say workflows trigger as if each layer targets the stack base, which would need no change; `gitflow.yml` and `pr-gate.yml` line 299 read the layer's real base, which would.

_Acceptance criteria:_

- A run on a real two-layer stack shows which values `base.ref`, `github.base_ref` and `stack.base.ref` take for layer two, recorded in `claude-docs/`
- `pr-gate.yml` and `gitflow.yml` run for both layers; where they read the base ref, they read the value that is `staging` for every layer
- A layer whose base is its parent `feature/*` branch is not reported as a Gitflow violation
- The aggregate check names stay unchanged so the required checks still match

**Draft D — Label Oversized Pull Requests** · 2h (estimate)

_Story:_ As a reviewer, I want a pull request over a size limit labelled, so that I know to ask for a stack.

_Acceptance criteria:_

- The limit (changed lines, excluding lockfiles, `src/gql/` and generated files) is stated once, in one file
- A workflow adds an `oversized` label above it and removes the label when a later push brings it under; a PR for one task is never failed for size
- The workflow runs on `pull_request` and writes only the label, with `pull-requests: write` and nothing else
- A test or a run on a scratch PR shows both the add and the removal

## Decisions

Items 1, 2 and 3 are decided. I need you to choose for item 4 only.

1. **The affected-modules graph, and dependency-cruiser. Decided: X.** Dependency-cruiser's default parser does not support the repo's TypeScript 7.0.2 and fails silently. The import rules are already enforced by Oxlint and `tests/guards/` (check 5), so only the graph is open. Options:
   - **X, the `swc` parser.** Proved on the real `src/`: 2145 modules; needs one file excluded (`using` syntax) and is deprecated and experimental. No second TypeScript.
   - **Y, the `tsc` parser with a second TypeScript 6.** Proved on the real `src/`: 2136 modules, 0 errors. Costs a second TypeScript version in the repo.
   - **Z, hold until dependency-cruiser supports TypeScript 7.1 or above.** No graph meanwhile; docs only.
   - **madge, skott or a small script.** Docs only, untested; I list them only in case X, Y and Z are all rejected.

   Decided: X, the `swc` parser, with Y as the stated fallback if the `swc` route breaks. The reason: the graph only informs a reviewer and never gates, so the experimental parser's limits cost little, and X adds no second TypeScript. Draft B is the task for it.

2. **Plannotator in the dev container. Decided: V.** The binary does not start on Alpine and no musl build is published. Options:
   - **V, a private glibc prefix with a wrapper.** Proved in the container without root: `--version`, and HTTP 200 on port 19432. Costs 26 MB, a wrapper script, a build step that fetches three Debian packages, and the `forwardPorts` line. Not proved: the host browser and the full review flow.
   - **W, run Plannotator on the host** and send it the review file through the forwarded port. Nothing in the container; the host half in check 8 is untested.
   - **X, a glibc package on Alpine (`sgerrand/alpine-pkg-glibc`).** Docs only. I could not confirm an aarch64 build; its latest release is from 2023; it needs root and writes into the system.
   - **Y, a Debian compose sidecar** like the Graphify one. Docs only. Costs a second service that needs the repo's files and `git`.
   - **Z, Plannotator from source, npm or bun.** Docs only. Bun has an aarch64 musl build, but I did not test a build, and I could not check whether the npm packages run the server.

   Decided: V, a private glibc prefix with a wrapper, with W (run on the host) as the fallback. The reason: it is the only route proved to start the server in the container, it changes no base image, and it keeps the glibc libraries out of the system. Draft A is the task for it.

3. **The scratch repo for `gh stack`. Decided.** You create `stack-scratch-m17-31` under `Aurora-Arctic` as a public repository and give the container's token access. It holds throwaway files and no Sorrel & Salt source. Check 6 runs on it as a public repo only (check 6 explains why). Checks 6 and 7 and the `stacks.md` questions run on it in a later step, after you tell me it exists. Nothing for you to do until then except create the repository.
4. **The container build.** The dev container has no `docker`, so the build in check 1 is read from files only. I need you to choose X or Y: X, you run `docker compose build` for the dev container on the host and paste the result; or Y, accept the file reading. I recommend Y, because nothing in this task builds the image.

## Status of the scratch repo and the extension

- The scratch repository does not exist yet; you create it (Decision 3). I created no repository, so there is nothing to delete.
- The `gh-stack` extension was installed to read its help and removed. `gh extension list` is empty.
- Scratch files (the difftastic binary, the Plannotator binary, the extracted Debian libraries, the dependency-cruiser projects) are in the session's scratchpad, outside the repo and the container's system. No scratch process is running.
