## Tests and the two copies of `graphql`

`graphql` ships a CommonJS build and an ESM build, and a schema made by one
fails the other's `instanceof` ("Cannot use GraphQLSchema from another module
or realm"). Under Vitest, Pothos and Yoga are externalized, so Node gives them
the CommonJS build. A test file is transformed by Vite, which would take the
ESM one. `vitest.config.mts` aliases a bare `graphql` import to the CommonJS
entry, so test code and the packages share one copy. `next build` bundles
consistently and needs no such alias. `tests/e2e/graphql.spec.ts` runs against
the production build.
