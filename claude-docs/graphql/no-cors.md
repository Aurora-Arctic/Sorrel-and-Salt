## No CORS

`cors: false`, so the endpoint sends no `Access-Control-*` headers at all.
Yoga's default is not neutral: it echoes back whatever `Origin` a request
carries and adds `Access-Control-Allow-Credentials: true`. That lets any origin
read a response made with the visitor's cookie. The client is same-origin, so it
needs no grant. Staging and the hotfix previews share `sorrelandsalt.com` with
production, so an open grant would also let one environment's pages read
another's responses.

## Refusing a write from another site

Having no CORS grant stops another site reading a response. It does not stop that
site sending one: a form on its page can post to this endpoint with the visitor's
cookie attached, and the mutation runs. So `src/graphql/csrf.ts` refuses, before
Yoga runs and so before any resolver, every request that is not `GET`, `HEAD` or
`OPTIONS` unless both of these hold:

- Its `content-type` is `application/json` (else 415). A form cannot send that
  type without a preflight, and the endpoint never answers a preflight with a grant.
- It carries `x-sorrel-client: web`, which the site's own client adds, or an
  `Origin` whose host is this request's host (else 403).

`GET` is left alone: Yoga refuses a mutation sent over `GET`, so a read is all it
can do. `/api/auth/*` is a separate route and unaffected.

By hand, add the header to a `curl` (`-H 'x-sorrel-client: web'`); Altair is
served from this origin and sends its own `Origin`.

The standard `@graphql-yoga/plugin-csrf-prevention` was not used: it asks for its
header only on form-style content types and lets a JSON post through, so it would
not refuse a JSON post that carries neither the header nor an `Origin`.
