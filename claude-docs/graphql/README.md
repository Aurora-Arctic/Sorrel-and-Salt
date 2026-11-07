# GraphQL

The one application-data path from the browser (CLAUDE.md rule 1). DESIGN.md §7 is the specification; these files are the current shape. A citation in code names the file below, not this page.

## Files

- `endpoint.md`: the Yoga route at `/api/graphql`, and how a request reaches the schema.
- `two-transports.md`: the two ways in (server components and the browser) and where each ends.
- `schema.md`: the code-first Pothos schema and the rules the SDL cannot show.
- `pagination.md`: cursor pagination for every list query.
- `loaders.md`: DataLoaders built per request.
- `errors.md`: the three service errors and what the API returns for each.
- `protections.md`: depth, cost and introspection limits.
- `client.md`: the browser's `fetch` wrapper and TanStack Query.
- `client-types.md`: how the browser's documents are typed.
- `manual-api-testing.md`: running a query by hand, signed in.
