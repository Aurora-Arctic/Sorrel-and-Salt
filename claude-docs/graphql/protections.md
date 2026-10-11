## Protections

`src/graphql/armor.ts`'s `protections({ production })` is the route's Yoga
`plugins`. It limits what a client can ask for, because a GraphQL client
composes its own queries. Without limits, one request can cost as much compute as the
client likes, and an anonymous client can map the whole schema.

**Everywhere, local development included:**

| Limit      | Value | Enforced by                 | Refusal message                                                 |
| ---------- | ----- | --------------------------- | --------------------------------------------------------------- |
| Depth      | 7     | graphql-armor               | `Syntax Error: Query depth limit of 7 exceeded, found 8.`       |
| Cost       | 5000  | `@pothos/plugin-complexity` | `Query exceeds maximum complexity (complexity: <n>, max: 5000)` |
| Aliases    | 15    | graphql-armor               | graphql-armor's default                                         |
| Directives | 50    | graphql-armor               | graphql-armor's default                                         |
| Tokens     | 1000  | graphql-armor               | graphql-armor's default                                         |

Depth, aliases, directives and tokens come from `@escape.tech/graphql-armor`'s
`EnvelopArmorPlugin`, and are checked at validation, so a refusal is a
validation error and `data` is absent. Depth counts field levels, so `{ ok }`
is 1, and is pinned in the file although 7 is not the package default.
Introspection queries (`__schema`) do not count towards it.

**Cost belongs to the complexity plugin, not to armor.** armor's own cost
check is off (`costLimit: { enabled: false }`). It runs at validation, before
variables are bound, so it multiplied a subtree by a _literal_ `first` only:
`children(first: $n)` was priced at one row whatever `$n` held, and an unsized
connection at one row rather than the 25 it returns. It also refused a literal
`first: 1000`, which the server clamps to 100 and should answer. The
complexity plugin prices a query just before its first root resolver runs,
with variables bound, and `MAX_COST` in `src/graphql/builder.ts` is its limit:

- Every field costs 1. A field with a selection adds that selection's cost
  times a multiplier, which is 1 for an object and 10 for a bare list.
- **A connection's multiplier is the page it will fetch**, `pageSize(args)`
  from `src/lib/pagination.ts`: 25 unsized, and never more than 100, whether
  `first` is a literal, a variable, or past the maximum. It is set once, on
  every connection, through the Relay plugin's
  `defaultConnectionFieldOptions`. `edges` is given a multiplier of 1, so a
  page is not priced twice.
- So two nested pages of 10 cost 331 and are answered, two nested default
  pages (25) cost 1951 and are answered, and two nested pages of 100 cost
  30 301 and are refused, however `first` was written.
- A refusal is thrown from the root field before it resolves, so it is an
  execution error: the response carries `data: null` and no resolver ran.

**Off wherever `NODE_ENV=production`:**

- **Introspection.** `@graphql-yoga/plugin-disable-introspection` refuses
  `__schema` and `__type` at validation, one error per introspection field.
  `__typename` still works, because clients rely on it.
- **Field suggestions.** graphql-js answers a misspelt field with
  `Did you mean "ok"?`. That is a way to find field names by guessing. armor
  removes that clause and leaves the rest of the error, so `{ ko }` is still
  refused as `Cannot query field "ko" on type "Query".`

`NODE_ENV` is the same signal the IDE uses. Every deploy, including staging and
each hotfix preview, runs at `production`, so staging gets the real
protections without any configuration of its own. **A local production build
(`npm run build && npm run start`, and so every e2e run) also has
introspection and suggestions off.** That is correct, because it is the build
that ships, but it can be surprising: Altair's docs pane is empty there, and a
typo gets no hint. Use `npm run dev` for either.

The tests: `tests/app/api/graphql/armor.test.ts` drives the real route over a
throwaway schema that nests without limit and pages without running out of
rows. The real schema is one field deep, so no query against it can reach a
depth or cost limit. It runs depth and cost at `production` only, since
neither limit reads the environment, each next to the same query shape just
inside the limit, to show that the refusal comes from the limit, and prices a
variable `first` the same as a literal one. `tests/graphql/pagination.test.ts`
pins the pricing itself. `route.test.ts` checks that local development answers
introspection and suggests a misspelt field; that production does neither, and
serves no IDE, is `tests/e2e/graphql.spec.ts`'s, against `next start`.
