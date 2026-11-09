import { readFileSync } from 'node:fs';
import { buildSchema, printSchema } from 'graphql';
import { describe, expect, it } from 'vitest';
import { schema } from '@/graphql/schema';
import { fromRoot } from '../support/paths';

// One of the two permitted snapshots (DESIGN.md §11); Vitest never writes one under `CI` nor overwrites one without `-u` (claude-docs/graphql/schema.md, "The SDL snapshot").
const SDL_FILE = fromRoot('src/graphql/schema.graphql');

describe('the GraphQL SDL', () => {
  it('matches the committed schema.graphql', async () => {
    await expect(`${printSchema(schema)}\n`).toMatchFileSnapshot(SDL_FILE);
  });

  // The help contract reaches the committed file, so codegen and the browser see it, not only the built schema.
  it('commits the help queries, mutations and types', () => {
    const committed = buildSchema(readFileSync(SDL_FILE, 'utf8'));
    const queries = Object.keys(committed.getQueryType()?.getFields() ?? {});
    const mutations = Object.keys(committed.getMutationType()?.getFields() ?? {});

    expect(queries).toEqual(
      expect.arrayContaining([
        'helpFaq',
        'helpArticles',
        'helpArticle',
        'helpGlossary',
        'helpSearch',
        'staffHelpArticle',
        'staffHelpArticles',
        'keeperHelpArticles',
      ]),
    );
    expect(mutations).toEqual(
      expect.arrayContaining([
        'createHelpArticle',
        'updateHelpArticle',
        'deleteHelpArticle',
        'setHelpArticleShown',
      ]),
    );
    for (const name of [
      'HelpArticle',
      'HelpArticleKind',
      'HelpAudience',
      'HelpArticleInput',
      'HelpArticlePatch',
      'HelpListing',
    ]) {
      expect(committed.getType(name), name).toBeDefined();
    }
  });
});
