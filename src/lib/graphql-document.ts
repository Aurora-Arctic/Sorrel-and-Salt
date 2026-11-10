import type { graphql as generated } from '../gql';

// What a caller writes its GraphQL document with: codegen types each call through `src/gql/gql.ts`, but at
// runtime the document is the caller's own text, so a page never ships `gql.ts`, which holds every document
// in the app (claude-docs/graphql/client-types.md, "Client types").
export const graphql = ((source: string) => source) as unknown as typeof generated;
