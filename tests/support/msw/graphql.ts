import {
  graphql,
  HttpResponse,
  type GraphQLQuery,
  type GraphQLResponseBody,
  type GraphQLVariables,
} from 'msw';
import { maskError } from '@/graphql/errors';
import { Forbidden, NotFound, ValidationError } from '@/lib/errors';
import { server } from './server';
import type { MockedError } from './types';

// Scoped to /api/graphql. No base handlers: an operation nothing has mocked
// falls through to setup-msw.ts's `onUnhandledRequest: 'error'`.
export const graphqlLink = graphql.link('/api/graphql');

export function mockGraphQLQuery<
  TData extends GraphQLQuery,
  TVariables extends GraphQLVariables = GraphQLVariables,
>(operationName: string, resolveData: (variables: TVariables) => TData) {
  server.use(
    graphqlLink.query<TData, TVariables>(operationName, ({ variables }) =>
      HttpResponse.json({ data: resolveData(variables) }),
    ),
  );
}

export function mockGraphQLMutation<
  TData extends GraphQLQuery,
  TVariables extends GraphQLVariables = GraphQLVariables,
>(operationName: string, resolveData: (variables: TVariables) => TData) {
  server.use(
    graphqlLink.mutation<TData, TVariables>(operationName, ({ variables }) =>
      HttpResponse.json({ data: resolveData(variables) }),
    ),
  );
}

function thrownFor({ code, fieldErrors = [], message }: MockedError): Error {
  switch (code) {
    case 'VALIDATION':
      return new ValidationError(fieldErrors, message);
    case 'FORBIDDEN':
      return new Forbidden(message);
    case 'NOT_FOUND':
      return new NotFound(message);
  }
}

/**
 * Answers the named query or mutation the way /api/graphql answers a service
 * that threw: the body is built by the route's own mapping, so it cannot drift
 * from it. No `path` or `locations` — the helper answers for the operation,
 * not for one field in it.
 */
export function mockGraphQLError(operationName: string, error: MockedError) {
  const body: GraphQLResponseBody<GraphQLQuery> = {
    errors: [maskError(thrownFor(error), 'Unexpected error.')],
    data: null,
  };
  const resolver = () => HttpResponse.json<GraphQLResponseBody<GraphQLQuery>>(body);
  server.use(
    graphqlLink.query(operationName, resolver),
    graphqlLink.mutation(operationName, resolver),
  );
}
