import { printSchema } from 'graphql';
import { describe, expect, it } from 'vitest';
import { schema } from '@/graphql/schema';
import { fromRoot } from '../support/paths';

// One of the two permitted snapshots (DESIGN.md §11): the schema is a
// contract, so a change to it is a diff to this committed file. Vitest writes
// a missing snapshot locally but never under `CI`, and never overwrites one
// without `-u`, so a schema change fails until someone regenerates the file on
// purpose — claude-docs/graphql.md, "The SDL snapshot".
const SDL_FILE = fromRoot('src/graphql/schema.graphql');

describe('the GraphQL SDL', () => {
  it('matches the committed schema.graphql', async () => {
    await expect(`${printSchema(schema)}\n`).toMatchFileSnapshot(SDL_FILE);
  });
});
