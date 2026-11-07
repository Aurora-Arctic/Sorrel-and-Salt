# Day 1

This guide is for an engineer opening the repository for the first time. It holds two things only: an order to read the other docs in, and one diagram of a request's path through the code. Every fact it points at lives in the doc it links, so when a fact changes, that doc changes and this guide stays true. Reading it through, with the sections it links, takes two to three hours.

Each section says what the next stretch of reading is for, names the files worth opening, and ends in a **Read next** line: one file and one heading in it. Follow the Read next lines in order and you will have read the core of the project once, in an order where each part leans only on the parts before it.

## Before you start

The site is Sorrel & Salt, a reference and workbook for people who make spells from herbs, oils, resins and other ingredients. Three words name its three parts, and the code, the routes, the tests and the conversation all use them the same way: the **compendium** is the shared reference of what ingredients exist, a workspace's **ingredients** are what it has in stock, and its **grimoire** is the spells it makes. A workspace is called a _coven_ on screen and in the URL, and _workspace_ everywhere else. The roles inside a coven, and the site-wide roles above them, follow the same split between the screen name and the code name.

Learn those words before anything else. Most reviews that come back with a naming comment trace to one of them.

Three documents outrank everything else, in this order. `claude-docs/DESIGN.md` is the specification: what the site is, how it is built, and why. `CLAUDE.md` at the root is the short list of rules every change keeps, written for both people and coding agents. The files under `.claude/rules/` are the long form of `CLAUDE.md`'s lines, one file per area. When two of them disagree, the higher one wins and the lower one is the one to fix. `claude-docs/README.md` says which doc is the home of which kind of fact.

You do not need to read `DESIGN.md` end to end today. It is long, and the sections this guide points at are the ones you need first.

**Read next:** [`CLAUDE.md`](../CLAUDE.md), "Vocabulary".

## The first hour

The first hour gets the site running on your machine. Everything runs inside containers: a Postgres database, the app, a mail catcher and a shared browser for the end-to-end tests. Nothing connects to the hosted database, and you do not need a particular Node version on your own machine.

The order is short. Install the dependencies with `npm ci`. Run `npm run setup`, which copies each committed example file to the git-ignored file the stack reads: the root `.env.example` to `.env.local`, `Docker/.env.example` to `Docker/.env`, and the two `.vscode/*.example.json` files to their working names. It never overwrites a file you already have, so it is safe to run again; a second run reports every file as kept. Then either open the folder in VS Code and choose "Reopen in Container", or run `make docker-up` on the host. Once the database is up, `npm run db:migrate` and `npm run db:seed` give it its tables and a starting data set, and `npm run dev` serves the site on port 8000.

`.env.local` is where your own settings go. Its comments say what each variable is for, and most can stay blank on day one: mail is written to the server log, sign-in providers stay hidden, and the daily job routes refuse every call. Which values each deployed environment uses is in `claude-docs/secrets.md`.

When something does not start, `claude-docs/testing/debugging.md` is the first place to look. It has the port each service uses, how to attach a debugger, and what does not work inside the container and why.

The devcontainer has no Python and no Docker, so scripts are written in Node, and the npm scripts are the commands. `make` targets wrap the same scripts for the host. `claude-docs/commands.md` is the full table of both.

**Read next:** [`commands.md`](commands.md), "The app".

## How the site works

With the site running, read how it is put together. The site is one Next.js app, deployed to Vercel, over one Postgres database. It is invite-gated: signing in earns an account and an observer seat in the demo coven, and nothing more. The compendium is the one part anyone can read without an account; everything a coven owns is private to its members, down to whether the coven exists at all.

A coven's members hold one of three roles, and what each role may do is checked on the server, in one place, on every request. Site keepers and curators look after the compendium and the shared vocabularies, and have no access to any coven but the demo one. The specification's overview and architecture sections describe the whole shape in a few pages each; read them now and leave the data model, the API reference and the user stories for when a task needs them.

As you read, keep two questions in mind, because the next section answers them in code: where is a request allowed or refused, and where does it touch the database?

**Read next:** [`DESIGN.md`](DESIGN.md), "3. Architecture".

## A request's path

Every request takes one of two routes, and both end in the same services. A page load is rendered on the server: the page calls a service directly. Anything the browser starts after the page has loaded, every save and every read that is not a navigation, goes to the one GraphQL endpoint at `/api/graphql`. There is no third route: no server actions and no hand-written API routes, with a short named list of exceptions in `CLAUDE.md`'s first rule.

```text
Browser
  │
  ├── page load ──────────────► src/proxy.ts
  │                             deny by default: a protected page with no
  │                             session cookie is sent to sign-in
  │                                   │
  │                                   ▼
  │                             a page under src/app/
  │                             requireSession() (src/lib/request-session.ts)
  │                             reads the session from the database
  │                                   │
  └── save, or a read ────────► src/app/api/graphql/route.ts
      after the page loaded     GraphQL Yoga: protections, cross-site check,
                                context with the session (src/graphql/context.ts)
                                      │
                                      ▼
                                a resolver under src/graphql/schema/
                                no authorisation here, only shapes;
                                related rows come through per-request loaders
                                      │
        ┌─────────────────────────────┘
        ▼
  a service under src/modules/<module>/services/
  the authorisation check lives here:
  assertMembership(session, workspaceId, permission) returns a Membership proof,
  assertSiteAdmin / assertCurator for the site tier
        │
        ▼
  src/db/repository/  (callers import its index.ts)
  every workspace finder and writer takes the proof and filters by its workspace;
  deleted rows are filtered here; lists page through one cursor helper;
  every write runs inside withAudit(session, fn), one transaction with the actor recorded
        │
        ▼
  Postgres
```

Three things in that picture are the ones new engineers most often get wrong. The check belongs in the service, never in a resolver or a page. Only the repository may import the database client. And filtering happens in SQL, so a row the caller may not see never leaves the database. The modules doc explains the boundary between modules, and the database and GraphQL rule files explain each step of the lower half.

**Read next:** [`modules.md`](modules.md), "The boundary".

## The repo map

Now match the diagram to folders. `src/app/` holds the routes and pages, `src/components/` the shared components, `src/graphql/` the schema and its resolvers, `src/modules/` the domain code, `src/db/` the schema, migrations, repository and seed, and `src/lib/` the helpers several layers share. Each module under `src/modules/` owns its own tables and services, and another module reaches it only through its public entry, `@/modules/<name>`. The modules doc names each module and what it owns.

Outside `src/`: `tests/` mirrors `src/` for the Vitest tests and holds the Playwright specs under `tests/e2e/`; `scripts/` holds the Node scripts the npm commands run; `compendium/` holds the compendium's seed entries as markdown files; `Docker/` and `.devcontainer/` hold the local stack; `.github/` holds the workflows. `claude-docs/` is the project's documentation, with the specification and the task breakdown at its top. One folder in it is a frozen record kept for history; the documentation index names it, and nothing current depends on it.

A type lives in a type-only file beside the code that uses it, and every slug comes from one helper. The modules doc says where each kind of file goes, which is the question you will have on your first task.

**Read next:** [`modules.md`](modules.md), "Layout".

## Dev tooling

The day-to-day tools are the npm scripts. `npm run pre-commit` lints, formats and type-checks the files you changed, and runs on every commit through a hook. `npm run codegen` regenerates the GraphQL types in `src/gql/` from the schema, and its output is committed. `npm run db:generate` writes a migration from a schema change, `npm run db:migrate` applies it, and `npm run check:destructive-ddl` flags a migration that drops or narrows something.

The component workshop is a Storybook of every shared component, run with its own command; the workshop doc says how to add a story. Drizzle Studio browses the local database. Altair, a GraphQL client, opens at `/api/graphql` in a browser on the dev server, signed in as you; the manual API testing doc says how to use it against staging too.

Debugging works from VS Code inside the container: `.vscode/launch.json`, which `npm run setup` made, attaches to the dev server, to Vitest and to Playwright. The debugging doc gives each port and each recipe, and the list of what does not work in the container.

**Read next:** [`testing/debugging.md`](testing/debugging.md), "Port map".

## Tests

The project is written test-first: the failing test comes before the code that makes it pass, and a bug fix starts with a test that reproduces the bug. Read the testing rule file for the process and what a test may assert; it is short, and reviews hold every test to it.

There are two runners. Vitest runs the unit, component, database and guard tests, in six projects; a test that touches Postgres goes in the database project and runs against a real local Postgres, never a mock and never the hosted database. Playwright runs the end-to-end specs, each worker with its own database and server, and the story suite, which proves each user story by a browser flow. Six fixture users, A to F, stand for the roles every authorisation test needs, and an authorisation test proves both that access is refused and that it would have succeeded without the guard.

While you work, run the test files your change touches, by name. The full suites take long enough that they run when the task is finished, not on every save. Every local Playwright run sets the placeholder auth secret on its command line, so the real one is never read for a test.

The guard tests under `tests/guards/` are worth a look on day one. Each turns a rule into a test that fails when the rule is broken, and their failure messages tell you which rule you have tripped.

**Read next:** [`../.claude/rules/testing.md`](../.claude/rules/testing.md), "Process".

## PR checks

A pull request runs one aggregating workflow, the PR gate. It filters by the paths the PR changes and then runs the jobs that apply: lint, type-check, build, the migration checks, Vitest, Playwright and the story suite, with formatting, the dependency audit and the branch-flow check on every PR. Some jobs are required to merge; the story suite and the workshop check run and report but never block.

Running `npm run pre-commit` before you push catches most of what the first jobs would. The rest, a failing test or a build that breaks only in production mode, shows in the job's log, and the CI docs say how to run the same checks locally through `act` when you need to reproduce one.

**Read next:** [`ci/aggregating-workflows.md`](ci/aggregating-workflows.md), "Aggregating workflows".

## Deploys and branches

Branches follow Gitflow. A task's work goes on a `feature/*` branch, which merges into `staging`; staging merges into `main` through a `release/*` branch; an urgent fix to production goes on a `hotfix/*` branch off `main`, and a `main-sync/*` branch brings it back to staging. Both `staging` and `main` are protected, and a workflow refuses a PR into a branch the flow does not allow.

Nobody deploys from a laptop. Every deploy runs in CI: a merge into `staging` deploys staging, a merge into `main` deploys production, and the deploy workflow migrates the database first. Migrations only ever move forward and are written so the old code and the new code both run against the database in between, which is why removing a column takes two PRs.

**Read next:** [`ci/deploy.md`](ci/deploy.md), "Deploy".

## Task tracking and skills

Work is tracked as GitHub issues on the project board; `claude-docs/TASKS.md` and the files it indexes are the reasoning behind each one. Every board action goes through one script, `scripts/task-board.mjs`, rather than through `gh` by hand. A task moves forward through its statuses as the work does: in progress when you start, in review when its PR opens, done when the PR merges. A PR covers one task and opens with `Closes #N`. The repository is public, so every issue and comment is too; a comment names a variable or a file, never a value.

The repository also ships skills: step-by-step instructions a coding agent follows for routine jobs such as starting a task, opening a PR, cutting a release or logging a bug. Each lives in `.claude/skills/<name>/`. Even if you never use an agent, read the start-task and create-pr skills once; they are the most exact description of how a task becomes a merged PR here.

**Read next:** [`task-tracking.md`](task-tracking.md), "Status".

## The rules you will trip over

Some rules are easy to break without noticing, because the code compiles and the page renders either way. `CLAUDE.md` lists them as domain invariants, and every one has bitten someone. The ones that most often come up in a first review:

- The compendium is the one public surface of data, and nothing a coven owns follows it out; a coven's address answers a non-member with a 404.
- A spell's visibility, once the spell is complete, only widens.
- A unit converts within one dimension only, and a refusal is a result the caller handles, never a guess.
- An ingredient's identity is its formal name, and each form it comes in is a variant beneath it.
- A cached value must never depend on who is viewing.
- A comment says what the code is, never its history; history goes in `claude-docs/`.

Two habits prevent most of the rest. Before writing a database call, read the database rule file. Before adding a page, read the components rule file and check the page calls `requireSession()` if it is not one of the open ones.

When a rule costs more than it buys on a real task, say so in the PR with the code it made harder and the change you recommend, and keep to the rule meanwhile.

**Read next:** [`CLAUDE.md`](../CLAUDE.md), "Domain invariants that are easy to get wrong".

## Where to look next

You have now read the core once. From here, read by task: open the doc for the area your first task touches, and the rule file for that area, before you write code. The documentation index says which doc is the home of each kind of fact, so you can find the one place a fact is stated rather than a copy of it. The writing rule file says how the docs, the comments and the PR bodies are written, and a review will hold yours to it.

When a doc and the code disagree, find out which one is wrong before changing either, and correct the doc in the PR that makes it wrong.

**Read next:** [`README.md`](README.md), "What lives where, and what to read".

### Prerequisites

Node is pinned at 26.6.0 in `Docker/Dockerfile.node`, and npm 10 cannot read the lockfile. This matters only for a run outside the container.
