import { graphql, isObjectType, type GraphQLSchema } from 'graphql';
import { describe, expect, it } from 'vitest';
import type { ingredients } from '@/modules/ingredients/schema/ingredients';
import { builder, createBuilder } from '@/graphql/builder';
import { createLoaders } from '@/graphql/loaders';
import { noInvitationSender, noSender } from '../support/email-verification';
import { schema } from '@/graphql/schema';
import type { Context } from '@/graphql/types';

const AUDIT_FIELDS = ['createdAt', 'createdBy', 'updatedAt', 'updatedBy', 'deletedAt', 'deletedBy'];

function context(session: Context['session']): Context {
  return {
    session,
    loaders: createLoaders(session),
    emailVerification: noSender,
    invitations: noInvitationSender,
  };
}

describe('the Pothos schema', () => {
  it('names one DateTime scalar, serialized as an ISO 8601 string', async () => {
    const scratch = createBuilder();
    const at = new Date('2026-09-27T12:34:56.789Z');
    scratch.queryType({
      fields: (t) => ({ at: t.field({ type: 'DateTime', resolve: () => at }) }),
    });

    const result = await graphql({
      schema: scratch.toSchema(),
      source: '{ at }',
      contextValue: context(null),
    });

    expect(result).toEqual({ data: { at: '2026-09-27T12:34:56.789Z' } });
  });
});

describe('AuditInfo', () => {
  // The sweep over every type the schema will ever carry: a later task that
  // spreads audit columns flat onto its own type fails here, not in review.
  it('is the only type carrying an audit column', () => {
    const carriers = auditShapedTypes(schema);
    // Precondition: the sweep sees the one type that does carry them.
    expect(carriers).toContain('AuditInfo');

    expect(carriers.filter((name) => name !== 'AuditInfo')).toEqual([]);
  });
});

function auditShapedTypes(target: GraphQLSchema): string[] {
  return Object.values(target.getTypeMap())
    .filter((type) => isObjectType(type) && !type.name.startsWith('__'))
    .filter((type) =>
      Object.keys((type as { getFields(): object }).getFields()).some((field) =>
        AUDIT_FIELDS.includes(field),
      ),
    )
    .map((type) => type.name);
}

// Never called: `tsc` checks these, and nothing is registered on the builder.
// Each `@ts-expect-error` is the assertion — `npm run typecheck` fails the
// moment the line beneath it compiles.
export function typeAssertions() {
  type Row = typeof ingredients.$inferSelect;

  // The positive control: a hand-declared type over the service's row compiles.
  builder.objectRef<Row>('Typed').implement({
    fields: (t) => ({ name: t.exposeString('name') }),
  });

  // The same declaration once the column under `name` is no longer text.
  type Retyped = Omit<Row, 'name'> & { name: number };
  builder.objectRef<Retyped>('Retyped').implement({
    fields: (t) => ({
      // @ts-expect-error `name` is a number now, and exposeString demands a string
      name: t.exposeString('name'),
    }),
  });

  builder.objectRef<Row>('WrongShape').implement({
    fields: (t) => ({
      label: t.string({
        // @ts-expect-error a resolver returning a number for a String field
        resolve: () => 42,
      }),
    }),
  });
}
