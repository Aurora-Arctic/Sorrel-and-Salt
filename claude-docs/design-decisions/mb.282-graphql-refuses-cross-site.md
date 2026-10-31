# MB.282: the GraphQL endpoint refuses cross-site writes

## Decision

A small check in `src/graphql/csrf.ts`, called from the route before Yoga, refuses any
write that is not JSON (415) or that carries neither `x-sorrel-client: web` nor an
`Origin` matching its own host (403). The site's client sends the header.
Reads over `GET` are unchanged. Long form: `claude-docs/graphql/no-cors.md`.

## Alternatives

- **`@graphql-yoga/plugin-csrf-prevention`.** The standard package. It requires its
  header only for content types a form can send, or none, and relies on CORS preflight
  for JSON. The acceptance criterion is that a JSON write with neither header nor
  `Origin` is refused, which it does not do.
- **`SameSite=Strict` cookies alone.** Breaks arriving from an emailed link signed in,
  and does not cover a sibling subdomain on the same site.
- **Checking `Origin` only.** Refuses scripts and tools that send none; the header
  covers them without opening a hole, since a cross-site page cannot add it unpreflighted.

## Cost

Anything calling the endpoint outside the site's pages adds the header (curl, the
Node-side Playwright `request`).
