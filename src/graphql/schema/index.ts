import { createSchema } from 'graphql-yoga';

// A stand-in until the Pothos builder owns the schema: GraphQL needs one
// Query field to be valid, and `ok` mirrors Better Auth's `/api/auth/ok`.
export const schema = createSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      ok: Boolean!
    }
  `,
  resolvers: {
    Query: {
      ok: () => true,
    },
  },
});
