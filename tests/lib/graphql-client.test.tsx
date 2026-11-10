import type { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
import { useQuery } from '@tanstack/react-query';
import { screen } from '@testing-library/react';
import { HttpResponse } from 'msw/http';
import { Component, type ReactNode } from 'react';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';

import {
  graphqlQuery,
  graphqlRequest,
  makeQueryClient,
  shouldRetry,
  throwWhenEmpty,
} from '@/lib/graphql-client';
import { expectConsole } from '../support/console-guard';
import { GraphQLClientError, StaleWriteError } from '@/lib/graphql-client-error';
import { graphqlLink, mockGraphQLError, mockGraphQLQuery } from '../support/msw/graphql';
import { server } from '../support/msw/server';
import type { OkQuery, OkQueryVariables, EchoQuery, EchoQueryVariables } from './types';
import { renderWithQuery } from '../support/render-with-query';

// A document is its query text, as codegen's string mode writes it.
class TextDocument<TResult, TVariables>
  extends String
  implements DocumentTypeDecoration<TResult, TVariables>
{
  __apiType?: (variables: TVariables) => TResult;
}

const OkDocument = new TextDocument<OkQuery, OkQueryVariables>('query Ok { ok }');

const EchoDocument = new TextDocument<EchoQuery, EchoQueryVariables>(
  'query Echo($word: String!) { echo(word: $word) }',
);

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

function clientError(status: number): GraphQLClientError {
  return new GraphQLClientError({ status, errors: undefined });
}

describe('a client component', () => {
  it('runs a typed query against /api/graphql', async () => {
    mockGraphQLQuery('Ok', () => ({ ok: true }));

    renderWithQuery(<Ok />);

    expect(await screen.findByText('ok: true')).toBeInTheDocument();
  });

  it('surfaces an error to the nearest error boundary, asking once', async () => {
    const calls = refuseOk();
    // React logs the caught error; it is the expected outcome here.
    expectConsole('error', /Forbidden/);

    renderWithQuery(
      <Boundary>
        <Ok />
      </Boundary>,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Boundary caught it');
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

  it('names its operation in the body, as graphql-request did, for anything that answers by name', async () => {
    const fetchSpy = vi.fn(async () => Response.json({ data: { echo: 'salt' } }));
    vi.stubGlobal('fetch', fetchSpy);

    await graphqlRequest(EchoDocument, { word: 'salt' });

    const [, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toMatchObject({
      operationName: 'Echo',
      variables: { word: 'salt' },
    });
  });

  it('throws the GraphQL error rather than resolving to partial data', async () => {
    refuseOk();

    const error = await graphqlRequest(OkDocument).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(GraphQLClientError);
    expect(error).not.toBeInstanceOf(StaleWriteError);
  });

  it('throws StaleWriteError, carrying the revision the row is at now, for STALE_WRITE', async () => {
    mockGraphQLError('Ok', { code: 'STALE_WRITE', currentRevision: 7 });

    const error = await graphqlRequest(OkDocument).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(StaleWriteError);
    // Still a GraphQLClientError, so the form readers and the retry policy read it as one.
    expect(error).toBeInstanceOf(GraphQLClientError);
    expect((error as StaleWriteError).currentRevision).toBe(7);
  });

  it("leaves a coven page for that coven's paused page when the answer is ACCESS_PAUSED, and still throws", async () => {
    mockGraphQLError('Ok', { code: 'ACCESS_PAUSED', pausedUntil: null });
    const assign = vi.fn();
    vi.stubGlobal('location', {
      origin: window.location.origin,
      href: `${window.location.origin}/coven/whitethorn-coven/grimoire`,
      assign,
    });

    const error = await graphqlRequest(OkDocument).catch((caught: unknown) => caught);

    expect(assign).toHaveBeenCalledWith('/coven-paused/whitethorn-coven');
    expect(error).toBeInstanceOf(GraphQLClientError);
  });

  it('stays put on ACCESS_PAUSED on the create page, which is no coven', async () => {
    const assign = vi.fn();
    vi.stubGlobal('location', {
      origin: window.location.origin,
      href: `${window.location.origin}/coven/new`,
      assign,
    });
    mockGraphQLError('Ok', { code: 'ACCESS_PAUSED', pausedUntil: null });

    await graphqlRequest(OkDocument).catch(() => undefined);

    expect(assign).not.toHaveBeenCalled();
  });

  it('stays put on ACCESS_PAUSED outside a coven, and on any other refusal inside one', async () => {
    const assign = vi.fn();
    vi.stubGlobal('location', {
      origin: window.location.origin,
      href: `${window.location.origin}/account`,
      assign,
    });
    mockGraphQLError('Ok', { code: 'ACCESS_PAUSED', pausedUntil: null });
    await graphqlRequest(OkDocument).catch(() => undefined);

    vi.stubGlobal('location', {
      origin: window.location.origin,
      href: `${window.location.origin}/coven/whitethorn-coven/grimoire`,
      assign,
    });
    refuseOk();
    await graphqlRequest(OkDocument).catch(() => undefined);

    expect(assign).not.toHaveBeenCalled();
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
    const anonymous = new TextDocument<OkQuery, OkQueryVariables>('{ ok }');

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
    expect(throwWhenEmpty(error, query({ ok: true }))).toBe(false);
  });
});

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
