## `graphql` is pinned to 16

`graphql@^16` is a direct dependency, although Yoga, Pothos and codegen all
accept 17. Two packages do not. `graphql-request`, the client §7 chooses,
accepts only `14 - 16`; M10.31 removes it for a small `fetch` wrapper. And
`@escape.tech/graphql-armor` accepts only `^16.10.0` (open issue #885,
"Support graphql v17"). `msw` already brings in 16. Staying on 16 keeps one copy of `graphql` in the
tree, and two copies are the classic "Cannot use GraphQLSchema from another
module or realm" failure. Once M10.31 has merged, armor is the only blocker;
move to 17 when it accepts 17. The catalogue is [`dependencies.md`](../dependencies.md).
