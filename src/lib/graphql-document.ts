import type { graphql as generated } from '../gql';

// What a caller writes its GraphQL document with. Codegen reads each call's text and types it through
// `src/gql/gql.ts`; at runtime the document is the caller's own text, so a page downloads only the
// documents its code holds, and not `gql.ts`, which maps every document in the app and so ships them all.
// claude-docs/graphql/client-types.md, "Client types".
export const graphql = ((source: string) => source) as unknown as typeof generated;
