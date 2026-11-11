import { PothosValidationError } from '@pothos/core';
import { createYoga } from 'graphql-yoga';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBuilder } from '@/graphql/builder';
import { maskedErrors } from '@/graphql/errors';
import {
  AccessPaused,
  Forbidden,
  InUse,
  NotFound,
  RateLimited,
  StaleWrite,
  ValidationError,
} from '@/lib/errors';

// A throwaway schema, since no production field throws each type; tests/app/api/graphql/route.test.ts asserts the route carries the mapping.

const ISSUES = [
  { path: ['canonicalName'], message: 'A botanical name is required' },
  { path: ['folkNames', 2], message: 'A folk name cannot be blank' },
];

// What a raw database failure looks like: the constraint name is the leak.
const CONSTRAINT = 'ingredients_workspace_identity_key_unique';

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
    stale: t.boolean({
      resolve: () => {
        throw new StaleWrite(7, 'This was changed elsewhere');
      },
    }),
    paused: t.boolean({
      resolve: () => {
        throw new AccessPaused(new Date('2031-02-03T04:05:06.000Z'));
      },
    }),
    pausedOpenEnded: t.boolean({
      resolve: () => {
        throw new AccessPaused(null);
      },
    }),
    inUse: t.boolean({
      resolve: () => {
        throw new InUse('"Testcraft" is filed on 1 compendium entry', {
          categories: ['testcraft'],
        });
      },
    }),
    limited: t.boolean({
      resolve: () => {
        throw new RateLimited(86400, 'Too many today');
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
  return { status: response.status, headers: response.headers, body: await response.json() };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('service errors over GraphQL', () => {
  // Why the refusals below could have been something else: the schema
  // answers, so an error is the resolver's and not a broken instance.
  it('answers a field that does not throw', async () => {
    await expect(run('{ ok }')).resolves.toMatchObject({
      status: 200,
      body: { data: { ok: true } },
    });
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

  it('answers an InUse with IN_USE, its message and the compendium filter for the entries holding the row', async () => {
    const { body } = await run('{ inUse }');

    expect(body.data).toBeNull();
    expect(body.errors).toEqual([
      {
        message: '"Testcraft" is filed on 1 compendium entry',
        locations: [{ line: 1, column: 3 }],
        path: ['inUse'],
        extensions: { code: 'IN_USE', heldBy: { categories: ['testcraft'] } },
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

  it('answers a StaleWrite with STALE_WRITE and the revision the row is at now', async () => {
    const { body } = await run('{ stale }');

    expect(body.data).toBeNull();
    expect(body.errors).toEqual([
      {
        message: 'This was changed elsewhere',
        locations: [{ line: 1, column: 3 }],
        path: ['stale'],
        extensions: { code: 'STALE_WRITE', currentRevision: 7 },
      },
    ]);
  });

  // Its own code rather than FORBIDDEN, so a client can tell a paused member, who holds a seat, from a stranger.
  it('answers an AccessPaused with ACCESS_PAUSED and when the pause ends, or null for none', async () => {
    const dated = await run('{ paused }');
    const open = await run('{ pausedOpenEnded }');

    expect(dated.body.data).toBeNull();
    expect(dated.body.errors[0].extensions).toEqual({
      code: 'ACCESS_PAUSED',
      pausedUntil: '2031-02-03T04:05:06.000Z',
    });
    expect(dated.body.errors[0].message).toMatch(/paused/i);
    expect(open.body.errors[0].extensions).toEqual({ code: 'ACCESS_PAUSED', pausedUntil: null });
  });

  it('answers a RateLimited with RATE_LIMITED, status 429 and the seconds to wait in Retry-After', async () => {
    const { status, headers, body } = await run('{ limited }');

    expect(status).toBe(429);
    expect(headers.get('retry-after')).toBe('86400');
    expect(body.errors[0].message).toBe('Too many today');
    expect(body.errors[0].extensions.code).toBe('RATE_LIMITED');
  });

  it('masks anything else: no message, no stack, no constraint name', async () => {
    const { body } = await run('{ crashed }');
    const serialised = JSON.stringify(body);

    expect(body.data).toBeNull();
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0].message).toBe('Unexpected error.');
    expect(body.errors[0].extensions.code).not.toMatch(
      /^(VALIDATION|FORBIDDEN|NOT_FOUND|STALE_WRITE)$/,
    );
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

  it('maps each error in a response on its own', async () => {
    const { body } = await run('{ ok refusedPart crashedPart }');

    expect(body.data).toEqual({ ok: true, refusedPart: null, crashedPart: null });
    expect(
      body.errors.map((error: { extensions: { code: string } }) => error.extensions.code),
    ).toEqual(['FORBIDDEN', 'INTERNAL_SERVER_ERROR']);
  });
});
