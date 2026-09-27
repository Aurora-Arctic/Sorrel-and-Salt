import SchemaBuilder from '@pothos/core';
import ScopeAuthPlugin from '@pothos/plugin-scope-auth';
import { DateTimeISOResolver } from 'graphql-scalars';
import { Forbidden } from '../lib/errors';
import type { Context } from './context';

// No ORM plugin, and object types are declared by hand against the row a
// service returns (DESIGN.md §7, "Four rules follow from dropping the Drizzle
// plugin").

export interface SchemaTypes {
  Context: Context;
  // Non-null unless a field says otherwise, as DESIGN.md §7's sketch reads:
  // a nullable field is the one that means something by it.
  DefaultFieldNullability: false;
  // The schema's second check, behind the service layer's (DESIGN.md §7).
  AuthScopes: {
    signedIn: boolean;
    admin: boolean;
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
    plugins: [ScopeAuthPlugin],
    defaultFieldNullability: false,
    scopeAuth: {
      authScopes: ({ session }) => ({
        signedIn: session !== null,
        admin: session?.role === 'admin',
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
