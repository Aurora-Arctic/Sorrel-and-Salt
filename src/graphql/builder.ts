import SchemaBuilder from '@pothos/core';
import ComplexityPlugin from '@pothos/plugin-complexity';
import RelayPlugin from '@pothos/plugin-relay';
import ScopeAuthPlugin from '@pothos/plugin-scope-auth';
import { DateTimeISOResolver } from 'graphql-scalars';
import { Forbidden } from '../lib/errors';
import { pageSize } from '../lib/pagination';
// For its side effect: `t.pagedConnection` on every field builder.
import './pagination';
import type { Context } from './context';

// No ORM plugin, and object types are declared by hand against the row a
// service returns (DESIGN.md §7, "Four rules follow from dropping the Drizzle
// plugin").

/**
 * The most a query may cost, in the complexity plugin's units: 1 a field, and
 * a connection's selection times the page it will fetch. So two nested pages
 * of 10 are answered and two of 100 refused, however `first` is written.
 */
export const MAX_COST = 5000;

export interface SchemaTypes {
  Context: Context;
  // Non-null unless a field says otherwise, as DESIGN.md §7's sketch reads:
  // a nullable field is the one that means something by it.
  DefaultFieldNullability: false;
  // A connection's edges and nodes are never null: a page holds rows.
  DefaultEdgesNullability: { list: false; items: false };
  DefaultNodeNullability: false;
  // The schema's second check, behind the service layer's (DESIGN.md §7).
  // `self` takes a user id and holds when it is the session's own.
  AuthScopes: {
    signedIn: boolean;
    admin: boolean;
    self: string;
  };
  Scalars: {
    // `DateTimeISO` rather than graphql-scalars' `DateTime`, which hands the
    // serializer's caller a Date and leaves the string to JSON.stringify.
    DateTime: { Input: Date; Output: Date };
    ID: { Input: string; Output: string };
  };
}

/**
 * A builder under the schema's configuration. The app has one, `builder`
 * below; a factory so a test can build a throwaway schema under the same
 * scopes and scalars without registering types on the real one.
 */
export function createBuilder() {
  const created = new SchemaBuilder<SchemaTypes>({
    plugins: [ScopeAuthPlugin, ComplexityPlugin, RelayPlugin],
    defaultFieldNullability: false,
    // Cost is priced here rather than by graphql-armor, which runs before
    // variables are bound and so prices `first: $n` at one row
    // (claude-docs/graphql.md, "Protections").
    complexity: {
      limit: { complexity: MAX_COST },
    },
    relay: {
      // Connections only: no `Node` interface, no global ids, no `node` query.
      nodeQueryOptions: false,
      nodesQueryOptions: false,
      edgesFieldOptions: {
        nullable: { list: false, items: false },
        // The page is priced once, on the connection field below; the list
        // default would count it again.
        complexity: { field: 1, multiplier: 1 },
      },
      nodeFieldOptions: { nullable: false },
      // Every connection costs the page it will actually fetch: 25 unsized,
      // never more than 100, whether `first` is a literal or a variable.
      defaultConnectionFieldOptions: {
        complexity: (args) => ({ field: 1, multiplier: pageSize(args) }),
      },
    },
    scopeAuth: {
      authScopes: ({ session }) => ({
        signedIn: session !== null,
        admin: session?.role === 'admin',
        self: (userId) => session?.userId === userId,
      }),
      // A service's own refusal type, so the transport maps one shape
      // whichever check said no.
      unauthorizedError: () => new Forbidden(),
    },
  });
  created.addScalarType('DateTime', DateTimeISOResolver);
  return created;
}

export const builder = createBuilder();
