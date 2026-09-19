import { graphql, HttpResponse, type GraphQLQuery, type GraphQLVariables } from 'msw';
import { server } from './server';

// Scoped to /api/graphql. No base handlers: an operation nothing has mocked
// falls through to vitest.setup.ts's `onUnhandledRequest: 'error'`.
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
