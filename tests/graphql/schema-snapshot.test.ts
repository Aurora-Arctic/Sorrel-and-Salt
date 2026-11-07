import { printSchema } from 'graphql';
import { describe, expect, it } from 'vitest';
import { schema } from '@/graphql/schema';
import { fromRoot } from '../support/paths';

// One of the two permitted snapshots (DESIGN.md §11); Vitest never writes one under `CI` nor overwrites one without `-u` (claude-docs/graphql/schema.md, "The SDL snapshot").
const SDL_FILE = fromRoot('src/graphql/schema.graphql');

describe('the GraphQL SDL', () => {
  it('matches the committed schema.graphql', async () => {
    await expect(`${printSchema(schema)}\n`).toMatchFileSnapshot(SDL_FILE);
  });
});
