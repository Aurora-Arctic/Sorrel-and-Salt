import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { parse } from 'graphql';
import { ClientError } from 'graphql-request';
import { HttpResponse } from 'msw';
import { Component, type ReactNode } from 'react';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';

import {
  graphqlQuery,
  graphqlRequest,
  makeQueryClient,
  shouldRetry,
  throwWhenEmpty,
} from '@/lib/graphql-client';
import { graphqlLink, mockGraphQLQuery } from '../support/msw/graphql';
import { server } from '../support/msw/server';
import type { OkQuery, OkQueryVariables, EchoQuery, EchoQueryVariables } from './types';

const OkDocument = parse('query Ok { ok }') as TypedDocumentNode<OkQuery, OkQueryVariables>;

const EchoDocument = parse('query Echo($word: String!) { echo(word: $word) }') as TypedDocumentNode<
  EchoQuery,
  EchoQueryVariables
>;

function Ok() {
  const { data } = useQuery(graphqlQuery(OkDocument));
  expectTypeOf(data).toEqualTypeOf<OkQuery | undefined>();
  return <p>{data === undefined ? 'Loading' : `ok: ${data.ok}`}</p>;
}

class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    return this.state.error ? <p role="alert">Boundary caught it</p> : this.props.children;
  }
}

function renderWithClient(ui: ReactNode) {
  return render(<QueryClientProvider client={makeQueryClient()}>{ui}</QueryClientProvider>);
}

/** Answers `Ok` with a GraphQL error, counting how often it was asked. */
function refuseOk() {
  const calls = { count: 0 };
  server.use(
    graphqlLink.query('Ok', () => {
      calls.count += 1;
      return HttpResponse.json({
        errors: [{ message: 'Forbidden', extensions: { code: 'FORBIDDEN' } }],
      });
    }),
  );
  return calls;
}

function clientError(status: number): ClientError {
  return new ClientError({ status, headers: new Headers(), body: '' }, { query: '{ ok }' });
}

describe('a client component', () => {
  it('runs a typed query against /api/graphql', async () => {
    mockGraphQLQuery('Ok', () => ({ ok: true }));

    renderWithClient(<Ok />);

    expect(await screen.findByText('ok: true')).toBeInTheDocument();
  });

  it('surfaces an error to the nearest error boundary, asking once', async () => {
    const calls = refuseOk();
    // React logs the caught error; it is the expected outcome here.
    vi.spyOn(console, 'error').mockImplementation(() => {});

    renderWithClient(
      <Boundary>
        <Ok />
      </Boundary>,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Boundary caught it');
    // A GraphQL error is the server's answer, so it is not retried.
    expect(calls.count).toBe(1);
  });
});

describe('graphqlRequest', () => {
  it('sends the variables and resolves to the typed data', async () => {
    mockGraphQLQuery<EchoQuery, EchoQueryVariables>('Echo', ({ word }) => ({ echo: word }));

    const data = await graphqlRequest(EchoDocument, { word: 'salt' });

    expectTypeOf(data).toEqualTypeOf<EchoQuery>();
    expect(data).toEqual({ echo: 'salt' });
  });

  it('throws the GraphQL error rather than resolving to partial data', async () => {
    refuseOk();

    await expect(graphqlRequest(OkDocument)).rejects.toBeInstanceOf(ClientError);
  });

  it('refuses to run outside the browser, where no session cookie rides along', async () => {
    vi.stubGlobal('window', undefined);

    await expect(graphqlRequest(OkDocument)).rejects.toThrow(/browser/);
  });
});

describe('graphqlQuery', () => {
  it('keys a query by its operation name and variables', () => {
    expect(graphqlQuery(OkDocument).queryKey).toEqual(['Ok', {}]);
    expect(graphqlQuery(EchoDocument, { word: 'salt' }).queryKey).toEqual([
      'Echo',
      { word: 'salt' },
    ]);
  });

  it('refuses an anonymous operation, which has nothing to key it by', () => {
    const anonymous = parse('{ ok }') as TypedDocumentNode<OkQuery, OkQueryVariables>;

    expect(() => graphqlQuery(anonymous)).toThrow(/operation name/);
  });
});

describe('the retry policy', () => {
  it('never retries an answer from the server', () => {
    // A GraphQL error arrives as a 200, and a 4xx is the request's own fault.
    expect(shouldRetry(0, clientError(200))).toBe(false);
    expect(shouldRetry(0, clientError(400))).toBe(false);
  });

  it('retries a failed fetch and a 5xx twice, then gives up', () => {
    const offline = new TypeError('Failed to fetch');

    expect(shouldRetry(0, offline)).toBe(true);
    expect(shouldRetry(1, clientError(503))).toBe(true);
    expect(shouldRetry(2, offline)).toBe(false);
    expect(shouldRetry(2, clientError(503))).toBe(false);
  });

  it('does not retry an error that is not a transport failure', () => {
    expect(shouldRetry(0, new Error('The GraphQL client runs in the browser'))).toBe(false);
  });
});

describe('the error-boundary policy', () => {
  it('throws only when there is nothing on screen to keep', () => {
    const error = new Error('down');
    const client = makeQueryClient();
    const query = (data: unknown) => {
      const key = ['Probe', { data }];
      if (data !== undefined) client.setQueryData(key, data);
      return client.getQueryCache().build(client, { queryKey: key });
    };

    expect(throwWhenEmpty(error, query(undefined))).toBe(true);
    // A failed background refetch leaves the last good answer rendered.
    expect(throwWhenEmpty(error, query({ ok: true }))).toBe(false);
  });
});

// Mutations are never retried, and their errors a form renders.
describe("the client's defaults", () => {
  it('retry and throw by the two policies for queries, and neither for mutations', () => {
    const defaults = makeQueryClient().getDefaultOptions();

    expect(defaults.queries?.retry).toBe(shouldRetry);
    expect(defaults.queries?.throwOnError).toBe(throwWhenEmpty);
    expect(defaults.mutations?.retry ?? 0).toBe(0);
    expect(defaults.mutations?.throwOnError).toBeFalsy();
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
