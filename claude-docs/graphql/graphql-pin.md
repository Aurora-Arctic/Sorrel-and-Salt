## `graphql` is pinned to 16

`graphql@^16` is a direct dependency, although Yoga, Pothos and codegen all
accept 17. One package does not: `@escape.tech/graphql-armor`, which accepts only `^16.10.0` (open issue #885,
"Support graphql v17"). `graphql-request`, the client §7 first chose, accepted only
`14 - 16` and was dropped for a small `fetch` wrapper (M10.31;
[`m10.31-graphql-request-dropped.md`](../design-decisions/m10.31-graphql-request-dropped.md)). `msw` 3 declares it as a peer, so the one copy is the app's own. Staying on 16 keeps one copy of `graphql` in the
tree, and two copies are the classic "Cannot use GraphQLSchema from another
module or realm" failure. Armor is the only blocker;
move to 17 when it accepts 17. The catalogue is [`dependencies.md`](../dependencies.md).
