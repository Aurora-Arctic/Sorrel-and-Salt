import { builder } from '../builder';
import './audit';
// Each module registers its types and fields as its index loads, so importing
// the index is the registration; `@/modules/<name>/graphql` is internal and a
// deep import of it fails lint and tests/guards/module-boundaries.test.ts.
import '@/modules/identity';
import '@/modules/coven';

// `ok` mirrors Better Auth's `/api/auth/ok`: a probe that answers without a
// session or the database, which the route's tests and e2e spec query.
builder.queryType({
  fields: (t) => ({
    ok: t.boolean({ resolve: () => true }),
  }),
});

export const schema = builder.toSchema();
