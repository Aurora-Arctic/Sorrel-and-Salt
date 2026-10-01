## The IDE: Altair, local development only

A browser navigating to `/api/graphql` — a `GET` with `Accept: text/html` —
gets [Altair](https://altairgraphql.dev/) when `NODE_ENV` is not `production`.
The route serves it itself, before Yoga sees the request: the page is
same-origin, so the browser sends the session cookie it already holds and the
IDE is signed in as whoever the tab is, with nothing installed and nothing
pasted. `altair-static` renders the shell; its `<base>` points the assets at
jsDelivr, pinned to the installed package version, so there is no asset route to
serve. The endpoint is written absolute from the request's own origin, because a
relative one would resolve against that `<base>`, and the dev server answers as
`localhost` and as `sorrel-app`. Yoga's own `graphiql` is off — its
`renderGraphiQL` hook never sees the request. `altair-static` is a
`serverExternalPackages` entry in `next.config.ts`: it reads its
`dist/index.html` from disk by `__dirname`, which a bundled copy no longer has.

Every deploy, including staging and each hotfix preview, runs at
`NODE_ENV=production`, and so does the e2e server (`next start`). The rule
therefore reads "on only where the app is not publicly reachable". Two tests pin
it: a unit test with `NODE_ENV` stubbed each way, and
`tests/e2e/graphql.spec.ts` against the production build. Each fails when the
IDE is forced on. Introspection and field suggestions follow the same rule
(["Protections"](protections.md)). Using it — and querying by hand where it is
off — is [`manual-api-testing.md`](../manual-api-testing.md).
