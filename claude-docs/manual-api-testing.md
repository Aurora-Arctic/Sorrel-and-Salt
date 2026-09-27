# Manual API testing

How to run a GraphQL query by hand, signed in, against `/api/graphql`. The
shape of the answer follows from one fact: the only credential the API accepts
is Better Auth's session cookie — `better-auth.session_token` locally,
`__Secure-better-auth.session_token` on https — and it is `httpOnly` and
`SameSite=Lax`. Sign-in never goes through GraphQL; the endpoint only _reads_
that cookie (`graphql.md`, "The request context"). So every way of querying by
hand is a way of getting that cookie onto the request.

## Locally: open the endpoint

1. `npm run dev`, sign in at `http://localhost:8000` with any provider.
2. Open `http://localhost:8000/api/graphql` in the same browser.

That is [Altair](https://altairgraphql.dev/), served by the app itself
(`graphql.md`, "The IDE"). The page is same-origin, so the browser sends the
session cookie it already holds: the IDE is signed in as whoever the tab is,
with nothing installed and nothing pasted. _Docs_ and autocompletion work because
introspection is on under `next dev`.

**Switching identity** is switching the browser's cookie: sign out and in
again, or keep a second browser profile per identity. The fixture users A–E have
no OAuth account, so they cannot sign in; their cookies would have to be
minted — a `sessions` row plus the signed cookie
([`design-decisions/mb.30-organization-plugin.md`](design-decisions/mb.30-organization-plugin.md),
"Test harness") — and pasted into DevTools → Application → Cookies. Nothing does
that yet; a `dev:session` script is the natural follow-up if it is needed often.

## Staging: the Altair browser extension

Staging serves no IDE, answers no introspection and suggests no field names
(`graphql.md`, "Protections"), but it answers queries. The extension's docs
pane and autocompletion are therefore empty; the schema is the code, or
introspection under `npm run dev`. A local production build behaves the same
way. Use the
[Altair browser extension](https://altairgraphql.dev/docs/): sign in at
`https://staging.sorrelandsalt.com` on a tab, then point the extension at
`https://staging.sorrelandsalt.com/api/graphql`. Its manifest holds host
permissions for every `http` and `https` origin, and Chrome treats a request
from an extension with host permissions as _same-site_, so the browser attaches
the `SameSite=Lax` cookie itself and applies no CORS — the endpoint's `cors:
false` is not in the way. The same works against `localhost:8000`. Firefox has
the same permission model; only Chrome's same-site treatment has been checked.

## Any desktop client: paste the cookie

Altair desktop, Insomnia, Bruno and Postman all work the same way, because none
of them can obtain the cookie: it is `httpOnly`, so only DevTools → Application →
Cookies shows its value. Copy it into a `Cookie:` header —
`better-auth.session_token=<value>` — in the tool's environment or cookie jar,
and paste again when the seven-day session lapses. Altair desktop takes it as a
`headers` entry in an environment; Postman and Insomnia in their cookie
managers; Bruno in its cookie jar or a collection header.

## Seeing the error shapes

Each service error leaves the route with an `extensions.code`, and anything
else leaves masked (`graphql.md`, "Errors"). Two of those shapes can be reached
from the live schema by hand:

- **`FORBIDDEN`**: query `{ me { id } }` with no session cookie, from a private
  window's Altair or from a terminal:

  ```sh
  curl -s localhost:8000/api/graphql -H 'content-type: application/json' \
    -d '{"query":"{ me { id } }"}'
  ```

  The answer is `data: null` and one error, `"message": "Forbidden"`,
  `"extensions": { "code": "FORBIDDEN" }`. Before MB.43 the same query
  answered `Unexpected error.`

- **Masked**: query `{ me { id } }` signed in, with the database stopped
  (`docker compose -f Docker/docker-compose.yaml stop postgres`, from the host). The answer is `Unexpected error.` with
  `code: INTERNAL_SERVER_ERROR` and no `originalError`, even under `next dev`.
  The connection error, with its stack, is in the dev server's terminal.

`VALIDATION` and `NOT_FOUND` have no production field that raises them until
Wave 8's mutations land. Until then, `tests/graphql/errors.test.ts` is where
they are exercised.

## Why the tools' OAuth features do not help

Every one of these clients has an "OAuth 2.0" helper. It runs an
authorization-code flow against Google (or Microsoft, or Facebook) and yields a
_provider_ token, and that is not our credential. Better Auth does accept a
provider ID token — `POST /api/auth/sign-in/social` with `idToken` verifies it
and answers with the session cookie, for Google, Facebook and Microsoft but not
Discord — so a tool _could_ sign in that way. It needs our client id **and
secret** inside the tool, a callback URL registered on the provider app, and it
can only ever be a real account. Opening the served page is the same result with
none of that. Better Auth's `bearer` plugin is not a route either: it rewrites an
`Authorization: Bearer` header into the same cookie, so it grants nothing a
`Cookie:` header does not.
