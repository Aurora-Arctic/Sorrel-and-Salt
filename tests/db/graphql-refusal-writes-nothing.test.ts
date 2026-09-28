import { createYoga } from 'graphql-yoga';
import { describe, expect, it } from 'vitest';
import { withAudit } from '@/db/repository';
import { createBuilder } from '@/graphql/builder';
import { maskedErrors } from '@/graphql/errors';
import { ValidationError } from '@/lib/errors';
import { herbs, session, sql, useProbeTables } from '../support/db/probe-tables';

// A refusal mapped to VALIDATION is still an error response, not a success
// that carries a list: the mutation answers no data, and the write it had
// already made inside `withAudit` is rolled back with the transaction.

useProbeTables();

const REFUSED = 'Refusewort';

const scratch = createBuilder();
scratch.queryType({ fields: (t) => ({ ok: t.boolean({ resolve: () => true }) }) });
scratch.mutationType({
  fields: (t) => ({
    plant: t.string({
      args: { name: t.arg.string({ required: true }) },
      resolve: (_root, { name }) =>
        withAudit(session, async (write) => {
          const [row] = await write.insert(herbs, { name });
          // After the write, as a service's check against the database is.
          if (name === REFUSED) {
            throw new ValidationError([{ path: ['name'], message: `${name} is already planted` }]);
          }
          return row.name;
        }),
    }),
  }),
});
const yoga = createYoga({ schema: scratch.toSchema(), maskedErrors, logging: false });

async function plant(name: string) {
  const response = await yoga.fetch('http://localhost/graphql', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      query: 'mutation ($name: String!) { plant(name: $name) }',
      variables: { name },
    }),
  });
  return response.json();
}

describe('a refused mutation', () => {
  // Why the refusal below could have written: the same mutation, reaching the
  // same insert, leaves a row when nothing refuses it.
  it('writes when nothing refuses it', async () => {
    await expect(plant('Acceptwort')).resolves.toEqual({ data: { plant: 'Acceptwort' } });

    const rows = await sql`select name from repository_probe_herbs`;
    expect(rows.map((row) => row.name)).toEqual(['Acceptwort']);
  });

  it('answers no data and leaves no row', async () => {
    const result = await plant(REFUSED);

    expect(result.data).toBeNull();
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].extensions).toEqual({
      code: 'VALIDATION',
      fieldErrors: [{ path: ['name'], message: `${REFUSED} is already planted` }],
    });

    const rows = await sql`select name from repository_probe_herbs`;
    expect(rows).toHaveLength(0);
  });
});
