import { readFileSync } from 'node:fs';
import { buildSchema, type DocumentNode, Kind, print } from 'graphql';
import { createYoga } from 'graphql-yoga';
import { describe, expect, it } from 'vitest';
import { MAX_DEPTH, protections } from '@/graphql/armor';
import * as documents from '@/gql/graphql';
import { fromRoot } from '../support/paths';

// DESIGN.md §7's depth limit holds for the browser's own documents too: a document the server refuses
// is a screen that cannot save. graphql-armor counts a fragment spread as a level of its own
// (`flattenFragments` is off), which the type checker cannot see, so a fragment that nests deep enough
// makes a save refused. Each operation codegen typed is sent through the server's own protections over
// the committed SDL, with no resolvers: the depth rule refuses at validation, before anything runs.

const yoga = createYoga({
  schema: buildSchema(readFileSync(fromRoot('src/graphql/schema.graphql'), 'utf8')),
  plugins: protections({ production: true }),
  logging: false,
});

const operations = Object.entries(documents).filter(
  (entry): entry is [string, DocumentNode] =>
    typeof entry[1] === 'object' &&
    entry[1] !== null &&
    (entry[1] as DocumentNode).kind === Kind.DOCUMENT &&
    (entry[1] as DocumentNode).definitions.some((d) => d.kind === Kind.OPERATION_DEFINITION),
);

async function depthErrorsOf(query: string): Promise<string[]> {
  const response = await yoga.fetch('http://localhost/graphql', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const { errors = [] } = (await response.json()) as { errors?: { message: string }[] };
  return errors.map((e) => e.message).filter((message) => message.includes('depth limit'));
}

describe(`every client document is within the depth limit of ${MAX_DEPTH}`, () => {
  // Preconditions: codegen's operations were found, and these protections refuse past the limit,
  // counting a spread as a level of its own, so a pass is not a rule left out. Through a spread at
  // `steps`, `variant { formChoice { id } }` is 7 deep and `variant { formChoice { group { icon } } }`
  // is 8; written out, the deeper one is 6.
  it('finds the operations, and refuses a spread that makes a valid document eight deep', async () => {
    expect(operations.length).toBeGreaterThan(50);
    expect(operations.map(([name]) => name)).toContain('SpellBuilderStepsDocument');

    const read = (selection: string) =>
      `query { spell(workspaceId: "w", id: "s") { steps { ...Step } } } fragment Step on SpellStep { ${selection} }`;
    expect(await depthErrorsOf(read('variant { formChoice { id } }'))).toEqual([]);
    expect(await depthErrorsOf(read('variant { formChoice { group { icon } } }'))).toEqual([
      `Syntax Error: Query depth limit of ${MAX_DEPTH} exceeded, found ${MAX_DEPTH + 1}.`,
    ]);
    expect(
      await depthErrorsOf(
        'query { spell(workspaceId: "w", id: "s") { steps { variant { formChoice { group { icon } } } } } }',
      ),
    ).toEqual([]);
  });

  it.each(operations)('%s', async (_name, document) => {
    expect(await depthErrorsOf(print(document))).toEqual([]);
  });
});
