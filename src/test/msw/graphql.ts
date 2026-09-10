import { graphql, HttpResponse, type GraphQLQuery, type GraphQLVariables } from 'msw';
import { server } from './server';

// Scoped to /api/graphql so a handler here never accidentally intercepts an
// unrelated request. No handlers are registered until a test calls one of
// the helpers below — an operation nothing has overridden falls through to
// vitest.setup.ts's `onUnhandledRequest: 'error'`, which is what makes an
// unmocked operation fail loudly instead of silently hitting the network.
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
