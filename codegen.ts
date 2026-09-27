import type { CodegenConfig } from '@graphql-codegen/cli';

// Client types for the browser's half of the API. The schema source is the
// committed SDL snapshot rather than the Pothos module, so codegen needs no
// database, no env and no TypeScript loader, and every contract change passes
// through one reviewable file first: claude-docs/graphql.md, "Client types".
const config: CodegenConfig = {
  schema: 'src/graphql/schema.graphql',
  documents: ['src/**/*.{ts,tsx}', '!src/gql/**'],
  // Until M3.7 writes the first document; with none, codegen would fail.
  ignoreNoDocuments: true,
  generates: {
    'src/gql/': {
      preset: 'client',
      config: {
        // What each custom scalar is on the wire. `strictScalars` fails the
        // run on an unmapped one rather than typing it `any`.
        strictScalars: true,
        scalars: { DateTime: 'string' },
        enumsAsTypes: true,
        useTypeImports: true,
      },
    },
  },
};

export default config;
