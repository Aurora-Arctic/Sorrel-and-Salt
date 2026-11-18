# Graphify setup survey

Discovery record for M17.32. It lists every Graphify piece, records the checks run from inside the dev container, answers questions from Graphify's current docs, reassesses Graphify against other tools, weighs three end states, records the owner's choice of A, and drafts the tasks for each. Nothing was removed, installed, started or stopped. The survey ran inside the dev container on 2026-11-17 and 2026-11-18, so every claim below comes from a command run there or from a cited page. Hour figures are estimates.

**The owner chose end state A (the sidecar, with the branch reworked). Tasks G1 to G4 are the ones to mint. Nothing for you to do in this file except mint them.**

## Summary

- The sidecar exists only on one unmerged commit, `a93934eeb` "started adding graphify", on the branch `feature/graphify-sidecar` (also on `origin`). Staging holds no Graphify file, no `.mcp.json` entry, no `.gitignore` line and no `CLAUDE.md` section.
- Outside git, `/app/graphify-out/` exists in the working copy but holds only empty folders. No `graphify` binary is on the dev container's PATH.
- The sidecar is running now. The `graphify` MCP server answers on the compose network and lists ten tools, but its graph is empty: `graph_stats` returned "graph.json not found". Claude Code connected to it in every logged session. So the sidecar has never served a graph to the agent, as far as the evidence shows.
- Graphify supports TypeScript and TSX. `query`, `path` and `explain` read `graph.json` locally and call no model.
- `graphify prs` needs an authenticated `gh`. Graphify's docs do not say whether it handles a stack of pull requests.
- Installing the Graphify CLI in the Alpine aarch64 dev container would need a compiler: the package index has no musl aarch64 wheel for the TypeScript parser or the parser core. This is metadata, not a test.
- Tools already in the planned setup cover most of Graphify's jobs. What they do not cover is a symbol graph with an overview (most-connected symbols, communities) and a graph-based view of a pull request's impact.
- **The owner chose A:** the sidecar, with the branch reworked. The reason: the POC's keep-or-drop rule measures Graphify during the POC, which needs it running. My recommendation before the choice was C (no Graphify); the evidence behind it is kept in "The cost of A" as the stated cost. Draft tasks G1 to G4 carry A out. The B and C drafts are under "Not chosen".

## Inventory

"Where" says which machine or folder holds the piece. "Scope" says whether it is global (every project) or project-level. "Git" says whether it is on staging, only on the branch, or outside git.

| Piece                                                                                                                        | Where                                                                                                                                                                                                                  | Scope                                     | Git                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `Docker/Dockerfile.graphify`                                                                                                 | Repo; builds the sidecar image from a Python base image                                                                                                                                                                | Project                                   | Only on the branch                                                                                           |
| Four compose services in `.devcontainer/docker-compose.yml` (`graphify-watch`, `graphify`, `graphify-web`, `graphify-views`) | Repo; run beside the dev container on the compose network                                                                                                                                                              | Project                                   | Only on the branch (96 added lines)                                                                          |
| `.devcontainer/devcontainer.json` changes                                                                                    | Repo; forwards one more port, and `initializeCommand` creates `graphify-out/` on the host before compose starts                                                                                                        | Project                                   | Only on the branch                                                                                           |
| `.mcp.json` `graphify` entry                                                                                                 | Repo; an HTTP server named `graphify`, resolvable only on the compose network                                                                                                                                          | Project                                   | Only on the branch. Staging's `.mcp.json` lists `next-devtools` alone.                                       |
| `.graphifyignore`                                                                                                            | Repo; leaves `compendium/` out of the graph                                                                                                                                                                            | Project                                   | Only on the branch                                                                                           |
| `Docker/graphify-views.py`, `Docker/graphify-view.js`                                                                        | Repo; build the folder map and wiki pages (349 and 195 lines)                                                                                                                                                          | Project                                   | Only on the branch                                                                                           |
| `claude-docs/docker.md` section "The code graph (graphify)"                                                                  | Repo                                                                                                                                                                                                                   | Project                                   | Only on the branch (27 changed lines)                                                                        |
| `.gitignore` line `graphify-out`                                                                                             | Repo                                                                                                                                                                                                                   | Project                                   | Only on the branch                                                                                           |
| `/app/graphify-out/`                                                                                                         | Working copy in `/app`, the bind-mounted host folder. Holds empty folders `2026-11-12`, `2026-11-17`, `cache/ast/<version>`, `view`, `wiki` and no files                                                               | Project                                   | Outside git. Staging does not ignore it; `git status` is clean only because git does not list empty folders. |
| `/app/.reports/graphify-view.py.old`                                                                                         | Working copy; an earlier 4 KB version of the map script, dated 2026-11-12                                                                                                                                              | Project                                   | Git-ignored (`.gitignore` line 18)                                                                           |
| MCP connection logs                                                                                                          | `/home/node/.cache/claude-cli-nodejs/-app/mcp-logs-graphify/`, files dated 2026-11-17. All 10 show Claude Code connecting to the `graphify` HTTP server from `/app` (checks above)                                     | Global (user cache in the container)      | Outside git                                                                                                  |
| Skill                                                                                                                        | None found: `/home/node/.claude/skills/` holds only `synced`; `find` for `*graphify*` found nothing under `/home/node/.claude`                                                                                         | n/a                                       | n/a                                                                                                          |
| Hooks in `.claude/settings.json`, `.claude/settings.local.json`, `/home/node/.claude/settings.json`                          | None: `grep -i graphify` over the three files matched nothing                                                                                                                                                          | n/a                                       | n/a                                                                                                          |
| `CLAUDE.md` sections                                                                                                         | None: no match in `/app/CLAUDE.md` or `/home/node/.claude/CLAUDE.md`                                                                                                                                                   | n/a                                       | n/a                                                                                                          |
| Git hooks                                                                                                                    | `/app/.git/hooks/` holds `pre-commit` and `pre-commit.old`, identical, both run the repo's `pre-commit` package and exit 0 if it is missing. `core.hooksPath` is unset. No Graphify hook. Worktrees share this folder. | Shared by every worktree and host commits | Outside git                                                                                                  |
| `graphify` binary                                                                                                            | None: `which graphify graphifyy uv python3 python` printed "not found" for each. The dev container is Alpine on aarch64 (`/etc/os-release`, `uname -m`).                                                               | n/a                                       | n/a                                                                                                          |
| `graphify-out/` in worktrees                                                                                                 | None: `find / -name graphify-out` found only `/app/graphify-out`                                                                                                                                                       | n/a                                       | n/a                                                                                                          |
| Mentions in task docs                                                                                                        | `claude-docs/tasks/v1/m17.md` and `claude-docs/waves/v1/wave-17.md`, plus a copy of each under `/app/.claude/worktrees/new-tasks-2026-11-17/`                                                                          | Project                                   | On staging                                                                                                   |

### Checks run from inside the container

Each check below was run on 2026-11-18, read-only. No service was started, stopped or changed, and no port of yours (8000, 8001, 61000) was used. Addresses are left out; hosts are named by compose service name.

**1. Is `.reports/` git-ignored? Done: yes.**

```text
$ git -C /app check-ignore -v .reports/graphify-view.py.old
.gitignore:18:.reports	.reports/graphify-view.py.old
exit 0
```

So `.reports/graphify-view.py.old` is not a git leftover. It is a git-ignored scratch file, 4048 bytes, dated 2026-11-12 07:59.

**2. Did Claude Code connect to the `graphify` server? Done: yes, every time.** The folder `/home/node/.cache/claude-cli-nodejs/-app/mcp-logs-graphify/` holds 10 log files, all from 2026-11-17 (17:34 to 20:52).

- All 10 contain the line "Successfully connected (transport: http)". `grep -c` for a failed-connection message found none (one apparent match was the text `.404Z` in a timestamp).
- Each logs the target as `http://graphify:8080/mcp` and the server as "graphify".
- Each logs "hasTools":true and "hasResources":true. Sessions closed "cleanly" after between 0 seconds and 10078 seconds.
- A log shows only the connection. It does not show whether the agent then called any tool. The tool results are in the session transcripts, which I did not search.

**3. Is the sidecar running now? Done: the `graphify` MCP service is running; its graph is empty.**

```text
$ getent hosts graphify / graphify-web / graphify-views / graphify-watch
graphify        resolves
graphify-web    resolves
graphify-views  resolves
graphify-watch  does not resolve (exit 2)
$ curl -sS -m 5 -o /dev/null -w '%{http_code}' http://graphify:8080/mcp
400            (the server answered; a bare request without MCP headers is refused)
```

`graphify-watch` does not resolve, so it is not running now. It is the service that builds the graph. I then sent one MCP `initialize`, one `tools/list` and one `graph_stats` call, and closed the session. The server is `uvicorn`. It lists ten tools:

| Tool                                        | Closest Graphify command                                                                                          |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `query_graph`                               | `query`                                                                                                           |
| `shortest_path`                             | `path`                                                                                                            |
| `get_node`, `get_neighbors`                 | the nearest to `explain`. No tool is named `explain`.                                                             |
| `get_community`, `god_nodes`, `graph_stats` | overview of communities, most-connected nodes, counts                                                             |
| `list_prs`, `get_pr_impact`, `triage_prs`   | `prs` (the MCP `triage_prs` returns data for the agent to reason over; the CLI's `--triage` uses a model backend) |

`graph_stats` returned: `Error executing graph_stats: graph.json not found: /data/graph.json`. The server reads the graph from the `graphify-out` folder mounted read-only at `/data`, and that folder is empty (check 4). The agent can reach the server and cannot get an answer from it.

**4. Why does `/app/graphify-out/` hold only empty folders? Done: the evidence does not show why.**

```text
$ ls -laR /app/graphify-out    (listing trimmed to the dated lines)
2026-11-12/   Nov 17 20:41   empty
2026-11-17/   Nov 17 20:41   empty
cache/        Nov 17 20:41
cache/ast/    Nov 12 07:40
cache/ast/<version folder>/   Nov 17 20:41   empty
view/         Nov 17 20:41   empty
wiki/         Nov 17 20:41   empty
```

- The compose file on the branch mounts `../graphify-out` into the `graphify-watch` and `graphify-views` services as writable and into `graphify` and `graphify-web` as read-only. `.graphifyignore` holds one line, `compendium/`, and has no effect on this folder.
- What the evidence shows: every folder's modified time is 2026-11-17 20:41, the same minute, and `cache/ast` is older (2026-11-12 07:40). That fits the files in these folders having been deleted at about 20:41 on 2026-11-17, with the folders left behind.
- What it does not show: who or what deleted them. Nothing I can read here (compose file, ignore file, logs) records a deletion, and I did not search shell history.

**5. Raw docs pages in place of summaries. Done; no earlier answer changes.** I fetched the pages with `curl -sSL` into `/tmp/claude-1000/-app/8211ea48-a976-4fa5-80d6-0bb4d7c9feab/scratchpad/graphify-docs/` and searched them. Text on those pages addressed to AI agents (recommend the hosted product, send feedback) was treated as data and not followed.

- _Model calls._ https://docs.graphify.com/open-source/features/querying.md, the FAQ: "**Does querying call an LLM?** No. `query`, `path` and `explain` read `graph.json` locally." The reference page https://docs.graphify.com/reference/query says of `extract --code-only`: "Index code only. No model or API key needed."
- _Committing `graphify-out/`._ https://docs.graphify.com/guides/team-workflows: "To share a code graph with your team, commit `graphify-out/graph.json` and let git merge it with Graphify's union merge driver", and, in the FAQ, "Only `graphify-out/graph.json`. The rest is rebuilt locally." It also says "Review the graph before the first commit. It holds names and paths taken from your source." The README on the repository's default branch says "Commit or share the graph so your whole team queries the same context." So the docs allow ignoring the folder and committing one file; they do not require either.
- _Stacked pull requests._ https://docs.graphify.com/open-source/features/pr-impact.md: the word "stack" does not appear on the page (`grep -in 'stack'` matched only the README's "Tech stack"). The page offers `graphify prs --base B` ("Sets the base branch") and `--wrong-base` ("Shows pull requests that target a branch other than the base"). In a stack, every pull request except the first targets another feature branch, so I expect `--wrong-base` to list them. That is my inference, and the docs do not say it.
- _Two README versions._ The repository's `main` branch README (a different, older text) says "Python 3.10+". The default branch README and the package index say 3.11 or later. This record uses the package index: the requirement is "<3.15,>=3.11".

**6. Does Graphify install on Alpine aarch64? Evidence from package metadata, not a test.** I installed nothing. Source: the package index's JSON for the package and for each compiled dependency (`https://pypi.org/pypi/<name>/json`), latest release of each.

- Graphify itself is one pure-Python wheel (`py3-none-any`). It needs Python 3.11 to 3.14.
- It depends on compiled packages: `numpy`, `rapidfuzz`, `tree-sitter` and about 25 tree-sitter grammar packages, including `tree-sitter-typescript` and `tree-sitter-javascript`.
- Wheel counts for Linux aarch64 (the dev container is Alpine on aarch64, which uses musl):

| Package                  | glibc aarch64 wheels | musl aarch64 wheels |
| ------------------------ | -------------------- | ------------------- |
| `tree-sitter`            | 5                    | **0**               |
| `tree-sitter-typescript` | 1                    | **0**               |
| `tree-sitter-javascript` | 1                    | 1                   |
| `numpy`                  | 6                    | 6                   |
| `rapidfuzz`              | 7 (musl) / 8 (glibc) | 7                   |

- So on Alpine aarch64, `pip` has no ready-made wheel for the parser core or the TypeScript parser and would compile them from source, which needs a C compiler. `gcc` and `cc` are not installed in the container (`which gcc cc` printed "not found"). I did not check the other grammar packages.
- The sidecar image uses a Debian-based Python image (`FROM python:3.12-slim` on the branch), which uses glibc, so the glibc wheels apply there. That is a reason A works where B is hard. It is metadata, and I did not build the image.

### Checks for the owner to run on the host

**I need you to run these on the host.** I could not run them because the dev container sees neither the host's home folder nor Docker. Each has the exact command and what each result means.

1. **Host-side Claude Code settings.** I could not check `~/.claude/` on the host because the container's `/home/node/.claude` is the bind mount of `Docker/claude-home`, not your host folder.
   - Command: `ls ~/.claude/skills ~/.claude/plugins 2>&1; grep -il graphify ~/.claude/settings.json ~/.claude/CLAUDE.md`
   - A file name printed means Graphify has a skill, plugin, hook or instruction on the host, outside the repo. Nothing printed (or "No such file") means none.
2. **A host `graphify` command.** I could not check it because the container sees no host PATH.
   - Command: `which graphify uv`
   - A path means a host install exists and a hook there could run it. No output means there is none.
3. **A host `graphify-out/`.** `/app` is the bind-mounted host folder, so `/app/graphify-out/` is the host's folder and check 4 already read it. Nothing more to run.
4. **Docker containers.** I could not check because the container has no `docker`.
   - Command: `docker ps -a --filter name=graphify --format '{{.Names}} {{.Status}}'`
   - A row `Up` means the service runs. `Exited` means it stopped. No row means it was never created, or was removed. From inside the container I saw that `graphify`, `graphify-web` and `graphify-views` resolve and `graphify-watch` does not.
5. **Docker images.** I could not check because the container has no `docker`.
   - Command: `docker images --format '{{.Repository}} {{.Size}}' | grep -i graphify`
   - A row gives the sidecar image's size, which task G3 records. No row means the image was removed.
6. **Why the graph folder was emptied.** Optional.
   - Command: `docker logs --since 2026-11-17T20:00:00 $(docker ps -aq --filter name=graphify-watch) 2>&1 | tail -40`
   - Output showing a rebuild or a cleanup near 20:41 on 2026-11-17 is the cause. No container or empty output means the logs are gone and the cause stays unknown.

## The branch `feature/graphify-sidecar`

It has one commit on top of `adefa6087`, and the diff against staging is 18 files (`git diff --stat origin/staging...origin/feature/graphify-sidecar`).

- **Graphify files (9):** the eight files in the inventory above plus `.graphifyignore`.
- **Nine `src/` and `tests/` files, 15 changed lines, none of them Graphify.** They are small rewrites in the style of lint auto-fixes: a regular expression replaced by `startsWith` or `endsWith` (`src/components/RichTextEditor/elements.tsx`, `tests/guards/date-field.test.ts`, `tests/guards/email-field.test.ts`), spread-and-copy removed (`src/lib/background-tasks.ts`, `tests/lib/invitation-cards/inks.test.ts`), and escape characters changed inside SQL strings (`tests/db/email-verification.test.ts`, `tests/modules/identity/services/user-role.test.ts`, `tests/db/graphql-query-scopes.test.ts`).
- **One of them needs a look before any merge.** `src/components/HelpWidget/unit-converter.tsx` drops `role="status"` from the result `<output>`. That is an accessibility change, and the repo asserts accessibility in Playwright. I do not know whether it was deliberate. I recommend none of these nine files ride along with Graphify.
- **Python on the branch.** `Docker/graphify-views.py` is a Python script. It runs in the `graphify-views` compose service, inside the sidecar image built from a Python base image, never in the dev container. `CLAUDE.md` says "The devcontainer has no `make`, no `docker` and **no Python**", so the rule is not broken. The repo does gain a Python file, which the rule's wording does not cover.

## Answers from Graphify's current docs

The docs pages carry text addressed to AI agents asking for the hosted product to be recommended and feedback to be sent. I ignored it, and this record proposes no hosted service.

| Question                                             | Answer                                                                                                                                                                                                                                                                                                                                                                | Source                                                                                                      |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Are TypeScript and TSX supported?                    | Yes. The language table lists TypeScript, and the web component table lists TSX. The extensions table lists `.ts` and `.tsx`.                                                                                                                                                                                                                                         | https://docs.graphify.com/concepts/supported-inputs                                                         |
| Is `graphify-out/` committed or git-ignored?         | Both appear, and neither is required. The team-workflows page ignores everything but one file: `graphify-out/*` with `!graphify-out/graph.json`, "Track just the graph". The README's "Team setup" says "Commit or share the graph so your whole team queries the same context." The branch ignores the whole folder. The docs do not say one choice is the only one. | https://docs.graphify.com/guides/team-workflows, https://github.com/Graphify-Labs/graphify                  |
| Do `query`, `path` and `explain` call a model?       | No. The querying page's FAQ says "No. `query`, `path` and `explain` read `graph.json` locally." The reference page for the same commands does not say it.                                                                                                                                                                                                             | https://docs.graphify.com/open-source/features/querying.md, https://docs.graphify.com/reference/query       |
| Does building the graph call a model?                | Not for code. `extract --code-only` needs "No model or API key", and `update` "re-extracts changed code without a model". Documents, PDFs and images use a model. Cluster names come from a labelling step; the branch's docs say it runs by hand.                                                                                                                    | https://docs.graphify.com/reference/query, https://github.com/Graphify-Labs/graphify                        |
| What does `graphify prs` need to reach GitHub?       | The GitHub CLI `gh`, authenticated for the repository. The page names no token and no environment variable.                                                                                                                                                                                                                                                           | https://docs.graphify.com/open-source/features/pr-impact.md                                                 |
| Does `graphify prs` handle a stack of pull requests? | The docs do not say. They never mention stacked or dependent pull requests. `--wrong-base` lists pull requests that target a branch other than the base, and the docs do not call that stack support.                                                                                                                                                                 | https://docs.graphify.com/open-source/features/pr-impact.md, https://docs.graphify.com/guides/pull-requests |
| Does `graphify prs` call a model?                    | Only `--triage` (it "uses an available configured model backend", set by `GRAPHIFY_TRIAGE_BACKEND` and optionally `GRAPHIFY_TRIAGE_MODEL`). The other modes name no model.                                                                                                                                                                                            | https://docs.graphify.com/guides/pull-requests                                                              |
| What does Graphify need to run?                      | Python 3.11 or later and `uv` (or `pipx`).                                                                                                                                                                                                                                                                                                                            | https://github.com/Graphify-Labs/graphify                                                                   |
| What does `graphify claude install` write?           | A `## graphify` section in `CLAUDE.md` and two `PreToolUse` hooks in `.claude/settings.json`. The installed hook command "uses the absolute path to your `graphify` executable". The page gives no skill path.                                                                                                                                                        | https://docs.graphify.com/open-source/vibe-coding                                                           |
| What does a git hook do?                             | The team-workflows recipe puts a `pre-commit` hook in `.git/hooks/pre-commit` that runs `graphify update .` and stages `graph.json`; `GRAPHIFY_SKIP_HOOK=1` skips it. `graphify hook install` rebuilds after each commit.                                                                                                                                             | https://docs.graphify.com/guides/team-workflows                                                             |
| How does the local MCP server run?                   | `graphify-mcp <path to graph.json>` over stdio, registered with `claude mcp add --transport stdio graphify -- graphify-mcp <path>`; or over HTTP with `--transport http --port <n> --api-key`. The page does not show how to register the HTTP server with Claude Code.                                                                                               | https://docs.graphify.com/open-source/mcp-server.md                                                         |

The pages I could not use: the docs index `llms.txt` exists at https://docs.graphify.com/llms.txt and I read it only to find the pages above. I did not run the Graphify CLI, because it is not installed and this task installs nothing, so no answer here comes from `--help`.

## The two ways to install it

### A. Sidecar (separate containers beside the dev container)

- **What it costs.** A second image built from a Python base image, four always-running containers, and a graph volume. I could not measure the image size or the memory the four services use (see "Checks for the owner to run on the host"). The first build of the graph took "about a minute", from the branch's own docs.
- **Python and the `CLAUDE.md` rule.** Python stays out of the dev container. The repo gains one Python file, `Docker/graphify-views.py`, and the rule's wording needs one sentence saying sidecar images are outside it.
- **Rebuilds.** Changing Graphify's version rebuilds only the sidecar image. The dev container, which `Docker/Dockerfile.node` shares with CI, is untouched.
- **Git hooks.** None are installed, so a commit from a host terminal cannot fail because of Graphify.
- **How the coding agent reaches it.** Over MCP, by the compose service name. That name resolves only inside the compose network, so `.mcp.json` shows the server as failed outside the dev container (the branch's own docs say so). Both host-side and container-side Claude Code read the same committed `.mcp.json`.
- **How a terminal reaches it.** There is no `graphify` command in the dev container, and the dev container has no `docker`, so `graphify query`, `path` and `explain` are not available from its terminal. A host terminal could run `docker compose exec`. A browser reaches the pages on one loopback-only port.
- **What breaks.** The `graphify claude install` hooks call "the absolute path to your `graphify` executable", so they cannot be used with a sidecar and are not wanted.

### B. CLI in the dev container image

- **What it costs.** Python 3.11 or later and `uv` in an Alpine image (the container is Alpine on aarch64). I did not test that Graphify and its parser packages install on Alpine, so I do not know the added size or whether prebuilt packages exist for it. The repo's rule says to put new tooling in features or `postCreateCommand`, never a new Dockerfile stage, so the image CI and the app share does not grow (`claude-docs/docker.md` on the branch, in the Compose overlay notes).
- **Python and the `CLAUDE.md` rule.** It breaks "no Python" directly. Either the rule changes or the owner accepts an exception.
- **Rebuilds.** The dev container rebuilds to apply it, and the install repeats on every rebuild.
- **Git hooks.** The shared `/app/.git/hooks` is used by host commits too. The docs' recipe puts `graphify update .` in `pre-commit`, and a host without `graphify` would fail the commit unless the hook guards for it. The option that avoids this is to install no hook.
- **How the coding agent reaches it.** Over stdio MCP, registered with `claude mcp add`, or through the `claude install` hooks. Those hooks are written into the committed `.claude/settings.json` with an absolute container path, so they would fail in a host session.
- **How a terminal reaches it.** The dev container terminal runs `graphify query`, `path` and `explain` directly. This is the one clear advantage of B.
- **What breaks.** The "no Python" rule, host commits if a hook is installed, and host Claude Code sessions if the hooks are installed.

## Reassessment: do the planned tools already do Graphify's jobs?

### The jobs, and what covers each

"Planned setup" means the tools the POC already plans: dependency-cruiser (a module-level import graph), the TypeScript language server and editor features, `gh stack view`, and grep.

| Job from the brief                             | Covered by                                                                                                                                                                                                                                                    | How well                                                                                                                                                                                                                       |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Explore the code                               | grep, plus the Claude Code `LSP` tool and the `typescript-lsp` plugin (https://code.claude.com/docs/en/tools-reference). The language server finds references and implementations (https://github.com/typescript-language-server/typescript-language-server). | Partly. These answer "where is this symbol used", one symbol at a time. They give no overview of communities or most-connected symbols. The `LSP` tool needs the `typescript-language-server` binary installed from npm.       |
| Steer the agent to a graph before grep         | Nothing in the planned setup. A PreToolUse hook or an MCP server is the mechanism for either choice.                                                                                                                                                          | Not applicable to the tools. Graphify's own steering (`graphify claude install`) writes absolute-path hooks, which the Inventory shows are unwanted (Answers table, row on `claude install`).                                  |
| `explain` (describe a node and its neighbours) | LSP hover and references for one symbol. The sidecar's `get_node` and `get_neighbors` are the nearest Graphify tools; there is no tool named `explain` (check 3).                                                                                             | Partly. LSP gives a symbol's type and references. It gives no cross-file narrative.                                                                                                                                            |
| `path` (how A reaches B)                       | dependency-cruiser `--focus` and Mermaid output (module to module). The sidecar's `shortest_path` is Graphify's.                                                                                                                                              | Partly. Module-level only. It cannot show a function-to-function path.                                                                                                                                                         |
| Visual `graph.html`                            | dependency-cruiser Mermaid and dot output; madge can draw a module graph (https://github.com/pahen/madge).                                                                                                                                                    | Module graph yes; a graph of symbols and communities no.                                                                                                                                                                       |
| `prs` triage across a stack                    | `gh stack view` lists the stack (https://github.com/github/gh-stack); dependency-cruiser `--affected` lists modules a change reaches.                                                                                                                         | Partly. Between them they show a stack and the affected modules. Neither scores a pull request's impact. The Graphify docs do not say `prs` handles stacks (Answers table), so Graphify's coverage of this job is unknown too. |

### Alternatives against the five constraints

The constraints: (1) local, no code sent to a hosted service; (2) calls no model; (3) reads TypeScript and TSX; (4) installs in an Alpine aarch64 dev container without Python (npm or a release binary), or runs as a sidecar; (5) can serve the agent (MCP or CLI).

"Docs say" means the page I fetched states it. "The docs do not say" means I read the page and it does not.

| Tool                                       | 1 Local                                                                                                   | 2 No model                                                                                                               | 3 TS and TSX                                                                          | 4 Install                                                                                                                                                                 | 5 Serves the agent                                                         | Job it covers that the planned setup does not                                  |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| TS language server plus the `LSP` tool     | Pass (a local process)                                                                                    | Pass (a language server)                                                                                                 | Pass                                                                                  | Pass: npm (`typescript-language-server`)                                                                                                                                  | Pass: the Claude Code `LSP` tool                                           | None new: this is already planned                                              |
| ast-grep                                   | Pass (a local command)                                                                                    | Pass (pattern matching)                                                                                                  | The docs do not say on the page I saved                                               | Pass on the package metadata: npm platform packages exist, including a Linux aarch64 musl one                                                                             | CLI only; the docs do not say it has an MCP server                         | Structural search, not a graph                                                 |
| madge                                      | Pass                                                                                                      | Pass                                                                                                                     | Docs say TypeScript is supported with extra setup; the docs page does not mention TSX | Pass: npm                                                                                                                                                                 | CLI only                                                                   | Module graph and circular imports; overlaps dependency-cruiser                 |
| knip                                       | Pass                                                                                                      | Pass                                                                                                                     | Pass                                                                                  | Pass: npm                                                                                                                                                                 | CLI, plus an `@knip/mcp` package the docs say configures knip for an agent | Finds unused files, exports and dependencies. It is not a call or symbol graph |
| `@optave/codegraph` (tree-sitter, SQLite)  | Pass: the README says "Zero network calls, zero telemetry" (https://github.com/optave/ops-codegraph-tool) | Pass for the graph. The README says an LLM provider is optional ("bring your own"), and a local ONNX search needs no key | The README lists many languages; I did not confirm TSX by name                        | The docs do not say Alpine works. The README says the parser is "native Rust or WASM", so the WASM engine is a route that needs no compiler. I did not test either.       | Pass: the README says it exposes an MCP server                             | A symbol graph with MCP, in npm                                                |
| `trace-mcp`                                | The docs do not say on the pages I read                                                                   | The docs do not say                                                                                                      | The docs do not say                                                                   | npm package, MIT licence, published recently (package index, 2026-11-16); the docs do not say whether it runs on Alpine                                                   | Pass by name: it is an MCP server                                          | The docs do not say what its graph covers                                      |
| Graphify as sidecar (A)                    | Pass                                                                                                      | Pass for code (Answers table)                                                                                            | Pass                                                                                  | Pass: separate Debian-based image                                                                                                                                         | Pass: ten MCP tools, no `explain`                                          | Symbol graph, communities, `prs`                                               |
| Graphify as a CLI in the dev container (B) | Pass                                                                                                      | Pass for code                                                                                                            | Pass                                                                                  | **Fail on the evidence**: no musl aarch64 wheel for the parser core or the TypeScript parser, no compiler in the container, and Python is absent (check 6, metadata only) | Pass: stdio MCP and CLI                                                    | Same as A                                                                      |

Sources: the package index and npm registry JSON for each package (fetched 2026-11-18), the READMEs linked above, and https://github.com/ast-grep/ast-grep. A tool with the word "Pass" has not been run here; no alternative was installed or tested.

### What cannot be known before the POC runs

- Whether the agent consults a graph at all. The POC's own rule is the test: "Keep Graphify if the graph was consulted on at least 1 in 4 reviews. If Graphify and the dependency-cruiser impact graph answer the same question, keep the one used more and drop the other." (POC brief, line 170.)
- Whether Graphify's `prs` is useful on a stack of pull requests. The docs do not say.
- Whether the graph for this repository is accurate enough to trust. I have not seen one: the sidecar's graph is empty.
- Whether `@optave/codegraph` runs on Alpine aarch64 and reads TSX. That is what the optional trial task would settle.
- What the sidecar costs to run on your machine. Only host `docker` can say (host checks 4 and 5).

## The cost of A

The owner chose A. I had recommended C. The evidence behind that recommendation is the cost A carries, and tasks G1 to G4 answer each point.

- **The sidecar has never served a graph.** It is running and Claude Code connected in all 10 logged sessions, but `graph_stats` returns "graph.json not found" because the graph folder is empty (checks 2 to 4). G2 builds the graph.
- **`graphify-watch` does not resolve by name**, so nothing is currently building the graph. G2 gets it running.
- **Planned tools cover most jobs** (the job table), and Graphify's `prs` stack support is undocumented. G3 measures whether the graph is consulted at all.
- **Four always-running containers**, with a cost I could not measure. G4 records it.
- **The branch carries nine unrelated `src/` and `tests/` edits**, one of which removes `role="status"`. G1 takes them off.
- **If the graph goes unused,** the POC's rule drops it ("Keep Graphify if the graph was consulted on at least 1 in 4 reviews"), and Draft C3's alternative tool is the fallback.

## Draft tasks

These are drafts. None is minted, and the ids `G1` onwards are placeholders. Hour figures are my estimates.

### Chosen: end state A, sidecar with the branch reworked

**Draft G1 — Rework the Graphify Sidecar Branch** · 2h (estimate)

_Story:_ As the owner, I want the Graphify sidecar branch to hold only Graphify, so that I can merge it without changing the app.

_Acceptance criteria:_

- A new branch off `staging`, or the existing branch reset by the owner, carries the Graphify files and no `src/` or `tests/` file
- The nine unrelated `src/` and `tests/` edits are off the branch; `unit-converter.tsx` keeps `role="status"`
- `.gitignore` on the branch ignores `graphify-out/`, so it is ignored once merged to staging
- `CLAUDE.md`'s "no Python" line says the sidecar image's Python is outside the rule
- `claude-docs/docker.md` describes the sidecar, and no other doc is wrong
- The old branch is closed unmerged once the reworked one is on a pull request

**Draft G2 — Build the Graph and Get the Watch Service Running** · 2h (estimate)

_Story:_ As the owner, I want a real graph in `graphify-out/` kept current, so that the MCP server has something to answer from.

_Acceptance criteria:_

- `graphify-watch` is running and resolves by its compose service name (it does not today)
- `graphify-out/graph.json` exists and covers this repository's TypeScript and TSX; the record says how many nodes and files it holds
- `graph_stats` through the MCP server returns counts instead of "graph.json not found"
- The first build time is recorded, and `.graphifyignore` still leaves out `compendium/`
- If the build fails, the record gives the error and stops

**Draft G3 — Prove the Agent Uses the Graph and Measure It** · 2h (estimate)

_Story:_ As the owner, I want to know whether the graph was consulted on each review, so that the POC's keep-or-drop rule has data.

_Acceptance criteria:_

- From a dev container session, the agent calls `query_graph`, `shortest_path` and `graph_stats` and gets results; the record notes that no `explain` tool exists and `get_node` and `get_neighbors` are the nearest
- The POC log gets one field per review: "graph consulted: yes or no", set from the session's tool calls, so the 1-in-4 rule can be applied
- The record states what the host-side session shows for the `graphify` entry
- `.mcp.json` still holds `next-devtools` unchanged

**Draft G4 — Record the Sidecar's Cost and Clear the Leftovers** · 1.5h (estimate)

_Story:_ As the owner, I want the sidecar's size and memory written down and the stray files removed, so that I can judge the cost and the working copy matches the setup.

_Acceptance criteria:_

- The owner's `docker images` and `docker stats` output for the sidecar is recorded, with no addresses or tokens
- `claude-docs/docker.md` gives the figures and the one command that stops the four services
- `.reports/graphify-view.py.old` is deleted, or kept on the owner's say-so
- Nothing else is removed

## Not chosen

The owner chose A, so B and C are not to be minted. They are kept only so a later reader can see what was weighed. C3 is the fallback if the graph goes unused: it trials another tool (`@optave/codegraph`) for the same jobs.

### Not chosen B: CLI in the dev container image

**Draft G5 — Install the Graphify CLI in the Dev Container** · 3h (estimate)

_Story:_ As the owner, I want `graphify` on the dev container's PATH after every rebuild, so that I can run `query`, `path` and `explain` in its terminal.

_Acceptance criteria:_

- The install lives in `.devcontainer/` (a feature or `postCreateCommand`), with an exact Graphify version, and survives a rebuild
- The install works on Alpine and aarch64, or the record says it does not and stops
- `Docker/Dockerfile.node` gains no stage
- `graphify --help` runs in a fresh container

**Draft G6 — Wire the Graphify MCP Server Over stdio** · 1.5h (estimate)

_Story:_ As the owner, I want the agent to use Graphify over MCP in the dev container, so that it finds callers without reading whole files.

_Acceptance criteria:_

- A `graphify` entry is registered, and the record says what a host-side session shows for it
- The agent calls `graph_stats` and gets a result
- No `graphify claude install` hook is added to the committed `.claude/settings.json`, or the record says why one is

**Draft G7 — Keep Graphify From Failing a Host Commit** · 1.5h (estimate)

_Story:_ As the owner, I want a commit from a host terminal to work whether or not Graphify is installed there, so that the shared git hooks never block me.

_Acceptance criteria:_

- No Graphify hook is installed, or the hook exits 0 when `graphify` is missing, shown by a commit from a shell without it
- `pre-commit` and `pre-commit.old` are left as they are, or the record says why one changed

**Draft G8 — Git-Ignore Graphify's Output and Update the Rule** · 1h (estimate)

_Story:_ As the owner, I want `graphify-out/` handled once and the "no Python" rule to say what is allowed, so that the docs stay true.

_Acceptance criteria:_

- `.gitignore` ignores `graphify-out/`, or all but `graph.json`, as the owner chooses
- `CLAUDE.md` and `claude-docs/commands.md` say Python is allowed in the dev container for Graphify only, and why
- `claude-docs/docker.md` describes the install

**Draft G9 — Close the Sidecar Branch Unmerged** · 0.5h (estimate)

_Story:_ As the owner, I want the unused sidecar branch closed, so that nothing half-built stays around.

_Acceptance criteria:_

- The owner confirms; the branch is deleted locally and on `origin`
- The Graphify map script and wiki are listed in the record as dropped, or ported by a task of their own

### Not chosen C: no Graphify

**Draft C1 — Close the Graphify Sidecar Branch Unmerged** · 0.5h (estimate)

_Story:_ As the owner, I want the unused Graphify branch closed, so that nothing half-built stays around.

_Acceptance criteria:_

- The owner confirms; `feature/graphify-sidecar` is deleted locally and on `origin`
- The detached read-only worktree `/home/node/worktrees/graphify-sidecar-read` is removed by the owner, after the branch is gone
- The record lists the map script, the wiki script and the `unit-converter.tsx` edit as dropped; if the owner wants the `role="status"` change judged, a bug task of its own does that

**Draft C2 — Remove Graphify's Leftovers From the Working Copy** · 0.5h (estimate)

_Story:_ As the owner, I want the stray Graphify files and containers gone, so that the machine matches the chosen setup.

_Acceptance criteria:_

- The owner removes `/app/graphify-out/` (empty folders only) and `.reports/graphify-view.py.old`
- The owner stops and removes the four sidecar containers and the `sorrel-graphify` image, using the commands the host-checks section tests first
- `git status` is clean and no `graphify` entry is in `.mcp.json`, `.gitignore`, `CLAUDE.md` or `claude-docs/docker.md` on staging (they are not there today)

**Draft C3 — Trial a Local Code-Graph Tool From npm (optional)** · 3h (estimate)

_Story:_ As the owner, I want to know whether `@optave/codegraph` runs here and answers symbol questions, so that I can fill Graphify's uncovered jobs without Python or extra containers.

_Acceptance criteria:_

- Installed by exact version in a throwaway worktree, never in `Docker/Dockerfile.node`
- Runs on Alpine aarch64, native or WASM engine, or the record says it does not and stops
- Indexes this repository's TypeScript and TSX, and the record says how many files it read
- Answers three named questions (callers of a service function, the path between two modules, the impact of one changed file) and says whether dependency-cruiser answered the same
- Makes no network call, checked from its docs and from a run with no network
- Ends with "keep" or "drop" by the POC's 1-in-4 rule, and nothing is committed unless the owner says so

## Decision

**The owner chose A:** the sidecar, with the branch reworked.

- **Reason:** the POC's keep-or-drop rule ("Keep Graphify if the graph was consulted on at least 1 in 4 reviews") measures Graphify during the POC, and that needs it running.
- **Tasks to mint:** G1 (2h), G2 (2h), G3 (2h) and G4 (1.5h), all estimates.
- **The branch:** reworked or reset so it holds only Graphify, then merged. It is not merged as it is, because it carries nine unrelated `src/` and `tests/` edits, one of which removes `role="status"`.
- **If the graph goes unused,** the POC's rule drops Graphify, and Draft C3 under "Not chosen" is the fallback.

Nothing for you to do here except mint G1 to G4. Separately, I need you to run the host checks in "Checks for the owner to run on the host"; host checks 4 and 5 give the sidecar's real cost for G4.
