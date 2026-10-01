## `graphql` is pinned to 16

`graphql@^16` is a direct dependency, although Yoga, Pothos and codegen all
accept 17. `graphql-request`, the client §7 chooses, accepts only `14 - 16`, and
`msw` already brings in 16. Staying on 16 keeps one copy of `graphql` in the
tree, and two copies are the classic "Cannot use GraphQLSchema from another
module or realm" failure. Move to 17 once `graphql-request` accepts it.
