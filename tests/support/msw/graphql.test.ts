import { createYoga } from 'graphql-yoga';
import { describe, it, expect } from 'vitest';
import { createBuilder } from '@/graphql/builder';
import { maskedErrors } from '@/graphql/errors';
import { Forbidden, NotFound, ValidationError } from '@/lib/errors';
import { mockGraphQLError, mockGraphQLMutation, mockGraphQLQuery } from './graphql';

async function postGraphQL(query: string) {
  const response = await fetch('/api/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  return response.json();
}

describe('MSW GraphQL handler stub', () => {
  it('lets a test override a single query operation response', async () => {
    mockGraphQLQuery('GetPing', () => ({ ping: 'pong' }));

    const { data } = await postGraphQL('query GetPing { ping }');
    expect(data).toEqual({ ping: 'pong' });
  });

  it('lets a test override a single mutation operation response', async () => {
    mockGraphQLMutation('SendPing', () => ({ sendPing: true }));

    const { data } = await postGraphQL('mutation SendPing { sendPing }');
    expect(data).toEqual({ sendPing: true });
  });

  it('fails loudly on an operation with no override, rather than hitting the network', async () => {
    await expect(postGraphQL('query GetPing { ping }')).rejects.toThrow();
  });

  it("resets the previous test's override, so the same operation fails loudly again here", async () => {
    await expect(postGraphQL('query GetPing { ping }')).rejects.toThrow();
  });
});

// The route's answer to each thrown type, from a real Yoga instance under the
// route's mapping: the reference the helper is held to, so the two cannot
// drift apart the way a hand-written fixture would.
const FIELD_ERRORS = [
  { path: ['canonicalName'], message: 'That ingredient already exists' },
  { path: ['folkNames', 0], message: 'A folk name cannot be blank' },
];

const scratch = createBuilder();
scratch.queryType({
  fields: (t) => ({
    invalid: t.boolean({
      resolve: () => {
        throw new ValidationError(FIELD_ERRORS, 'Check the highlighted fields');
      },
    }),
    forbidden: t.boolean({
      resolve: () => {
        throw new Forbidden('Visibility widens only');
      },
    }),
    notFound: t.boolean({
      resolve: () => {
        throw new NotFound();
      },
    }),
  }),
});
const routeLike = createYoga({ schema: scratch.toSchema(), maskedErrors, logging: false });

async function routeAnswer(query: string) {
  const response = await routeLike.fetch('http://localhost/graphql', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  return response.json();
}

// The helper answers for the operation, not for a field in it, so it carries
// no `path` or `locations`; nothing a form reads is in either.
function withoutPosition({ errors, ...rest }: { errors: Record<string, unknown>[] }) {
  return {
    ...rest,
    errors: errors.map(({ path: _path, locations: _locations, ...error }) => error),
  };
}

describe('mockGraphQLError', () => {
  it('answers a VALIDATION error the way the route does', async () => {
    mockGraphQLError('CreateIngredient', {
      code: 'VALIDATION',
      fieldErrors: FIELD_ERRORS,
      message: 'Check the highlighted fields',
    });

    const mocked = await postGraphQL('mutation CreateIngredient { createIngredient }');
    const real = await routeAnswer('{ invalid }');

    // Why this could pass vacuously: the reference really is a field error.
    expect(real.errors[0].extensions.fieldErrors).toEqual(FIELD_ERRORS);
    expect(mocked).toEqual(withoutPosition(real));
  });

  it('answers FORBIDDEN the way the route does', async () => {
    mockGraphQLError('GetSpell', { code: 'FORBIDDEN', message: 'Visibility widens only' });

    const mocked = await postGraphQL('query GetSpell { spell }');
    const real = await routeAnswer('{ forbidden }');

    expect(real.errors[0].extensions.code).toBe('FORBIDDEN');
    expect(mocked).toEqual(withoutPosition(real));
  });

  it('answers NOT_FOUND with the default message the route would', async () => {
    mockGraphQLError('GetSpell', { code: 'NOT_FOUND' });

    const mocked = await postGraphQL('query GetSpell { spell }');
    const real = await routeAnswer('{ notFound }');

    expect(real.errors[0].extensions.code).toBe('NOT_FOUND');
    expect(mocked).toEqual(withoutPosition(real));
  });

  it('answers a query and a mutation of that name alike', async () => {
    mockGraphQLError('Either', { code: 'FORBIDDEN' });

    const asQuery = await postGraphQL('query Either { either }');
    const asMutation = await postGraphQL('mutation Either { either }');

    expect(asQuery.errors[0].extensions.code).toBe('FORBIDDEN');
    expect(asMutation).toEqual(asQuery);
  });
});
