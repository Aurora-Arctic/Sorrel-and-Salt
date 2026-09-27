import { builder } from '../builder';
import './audit';
// A module's GraphQL registrations are imported here for their side effect
// (`import '@/modules/<name>/graphql';`) once the module has any.

// GraphQL needs one Query field to be valid. `ok` mirrors Better Auth's
// `/api/auth/ok` and stands until the first real query field replaces it.
builder.queryType({
  fields: (t) => ({
    ok: t.boolean({ resolve: () => true }),
  }),
});

export const schema = builder.toSchema();
