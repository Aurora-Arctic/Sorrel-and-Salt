import { PothosValidationError } from '@pothos/core';
import { createYoga } from 'graphql-yoga';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBuilder } from '@/graphql/builder';
import { maskedErrors } from '@/graphql/errors';
import { Forbidden, NotFound, ValidationError } from '@/lib/errors';

// The route's mapping, run through a real Yoga instance so what is asserted is
// the response body a browser receives. No production field throws each type
// yet, so the schema is a throwaway; tests/app/api/graphql/route.test.ts
// asserts the route itself carries the mapping.

const ISSUES = [
  { path: ['canonicalName'], message: 'A botanical name is required' },
  { path: ['folkNames', 2], message: 'A folk name cannot be blank' },
];

// What a raw database failure looks like: the constraint name is the leak.
const CONSTRAINT = 'ingredients_workspace_canonical_key_unique';

const scratch = createBuilder();
scratch.queryType({
  fields: (t) => ({
    ok: t.boolean({ resolve: () => true }),
    invalid: t.boolean({
      resolve: () => {
        throw new ValidationError(ISSUES, 'That ingredient already exists');
      },
    }),
    forbidden: t.boolean({
      resolve: () => {
        throw new Forbidden('Visibility widens only: a shared spell cannot be made private');
      },
    }),
    notFound: t.boolean({
      resolve: () => {
        throw new NotFound('No such spell');
      },
    }),
    crashed: t.boolean({
      resolve: () => {
        throw new Error(`duplicate key value violates unique constraint "${CONSTRAINT}"`);
      },
    }),
    // Nullable, so one failing field leaves its siblings standing.
    refusedPart: t.boolean({
      nullable: true,
      resolve: () => {
        throw new Forbidden();
      },
    }),
    crashedPart: t.boolean({
      nullable: true,
      resolve: () => {
        throw new Error('the finder failed');
      },
    }),
    // A GraphQL error thrown on purpose, as the pagination helper does for a
    // bad cursor: already client-facing, so the mapping leaves it alone.
    badArgument: t.boolean({
      resolve: () => {
        throw new PothosValidationError('Invalid cursor');
      },
    }),
  }),
});
const schema = scratch.toSchema();

function yoga() {
  return createYoga({ schema, maskedErrors, logging: false });
}

async function run(query: string) {
  const response = await yoga().fetch('http://localhost/graphql', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  return { status: response.status, body: await response.json() };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('service errors over GraphQL', () => {
  // Why the refusals below could have been something else: the schema
  // answers, so an error is the resolver's and not a broken instance.
  it('answers a field that does not throw', async () => {
    await expect(run('{ ok }')).resolves.toEqual({ status: 200, body: { data: { ok: true } } });
  });

  it('answers a ValidationError with VALIDATION and one field error per issue', async () => {
    const { status, body } = await run('{ invalid }');

    expect(status).toBe(200);
    expect(body.data).toBeNull();
    expect(body.errors).toEqual([
      {
        message: 'That ingredient already exists',
        locations: [{ line: 1, column: 3 }],
        path: ['invalid'],
        extensions: { code: 'VALIDATION', fieldErrors: ISSUES },
      },
    ]);
  });

  it('answers a Forbidden with FORBIDDEN and its explaining message', async () => {
    const { body } = await run('{ forbidden }');

    expect(body.data).toBeNull();
    expect(body.errors).toEqual([
      {
        message: 'Visibility widens only: a shared spell cannot be made private',
        locations: [{ line: 1, column: 3 }],
        path: ['forbidden'],
        extensions: { code: 'FORBIDDEN' },
      },
    ]);
  });

  it('answers a NotFound with NOT_FOUND', async () => {
    const { body } = await run('{ notFound }');

    expect(body.data).toBeNull();
    expect(body.errors).toEqual([
      {
        message: 'No such spell',
        locations: [{ line: 1, column: 3 }],
        path: ['notFound'],
        extensions: { code: 'NOT_FOUND' },
      },
    ]);
  });

  it('masks anything else: no message, no stack, no constraint name', async () => {
    const { body } = await run('{ crashed }');
    const serialised = JSON.stringify(body);

    expect(body.data).toBeNull();
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0].message).toBe('Unexpected error.');
    expect(body.errors[0].extensions.code).not.toMatch(/^(VALIDATION|FORBIDDEN|NOT_FOUND)$/);
    expect(serialised).not.toContain(CONSTRAINT);
    expect(serialised).not.toContain('duplicate key');
    expect(serialised).not.toMatch(/\bat \S+ \(/);
  });

  // Yoga's own default hands the original message and stack back under
  // `extensions.originalError` when NODE_ENV is development. The server log
  // keeps them; the response does not, wherever it runs.
  it('masks anything else in local development too', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const { body } = await run('{ crashed }');
    const serialised = JSON.stringify(body);

    expect(body.errors[0].message).toBe('Unexpected error.');
    expect(body.errors[0].extensions).not.toHaveProperty('originalError');
    expect(serialised).not.toContain(CONSTRAINT);
  });

  it('leaves an error the schema raised for the client as it was', async () => {
    const { body } = await run('{ badArgument }');

    expect(body.errors[0].message).toBe('Invalid cursor');
    expect(body.errors[0].extensions ?? {}).not.toHaveProperty('code', 'INTERNAL_SERVER_ERROR');
  });

  // A refusal is one error among a response's others; the fields that
  // resolved still answer.
  it('maps each error in a response on its own', async () => {
    const { body } = await run('{ ok refusedPart crashedPart }');

    expect(body.data).toEqual({ ok: true, refusedPart: null, crashedPart: null });
    expect(
      body.errors.map((error: { extensions: { code: string } }) => error.extensions.code),
    ).toEqual(['FORBIDDEN', 'INTERNAL_SERVER_ERROR']);
  });
});
