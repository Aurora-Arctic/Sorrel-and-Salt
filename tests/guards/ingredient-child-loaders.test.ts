import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { type IngredientKey, clearIngredientChildren } from '@/modules/ingredients';
import { fromRoot } from '../support/paths';

// MB.211: an ingredient write clears its row from every child loader before
// answering, or a root field earlier in the request leaves its read of the
// old children in the answer. Both update mutations clear through
// `clearIngredientChildren`, which is built from the record of loaders
// `loaders/ingredient-children.ts` defines, so a sixth loader added there is
// cleared by both without either being edited. This holds the two ends of
// that: every loader the file defines is one the helper clears, read off the
// file's text so a loader defined outside the record fails here; and neither
// mutation names a loader of its own.

const LOADERS_FILE = 'src/modules/ingredients/loaders/ingredient-children.ts';
const MUTATION_FILES = [
  'src/modules/ingredients/graphql/compendium-entries.ts',
  'src/modules/ingredients/graphql/workspace-ingredients.ts',
];

const source = (file: string) => readFileSync(fromRoot(file), 'utf8');

/** Each loader the file defines, by the name it is defined under: a record's key or a const's. */
const defined = [...source(LOADERS_FILE).matchAll(/(\w+)\s*[:=]\s*defineLoader\b/g)].map(
  (match) => match[1],
);

/** The names `clearIngredientChildren` clears `row` from, read off a stand-in for the request's loaders. */
function clearedBy(row: IngredientKey): string[] {
  const cleared: string[] = [];
  const loaders = new Proxy(
    {},
    {
      get: (_target, name) => ({
        clear: (key: IngredientKey) => {
          expect(key).toBe(row);
          cleared.push(String(name));
        },
      }),
    },
  );
  clearIngredientChildren(loaders as Parameters<typeof clearIngredientChildren>[0], row);
  return cleared;
}

describe('MB.211: an ingredient write clears every child loader', () => {
  // The precondition: the scan finds the five loaders there are, so an
  // empty match cannot pass the assertion below.
  it('finds the child loaders the file defines', () => {
    expect(defined).toEqual(
      expect.arrayContaining([
        'categoriesByIngredient',
        'folkNamesByIngredient',
        'substitutesByIngredient',
        'deitiesByIngredient',
        'referencesByIngredient',
      ]),
    );
  });

  it('clears the row from every loader the file defines', () => {
    const row = { id: '00000000-0000-4000-8000-000000000001', workspaceId: null };
    expect(clearedBy(row).sort()).toEqual([...defined].sort());
  });

  it.each(MUTATION_FILES)('%s clears through the helper and names no loader', (file) => {
    const text = source(file);
    expect(text).toContain('clearIngredientChildren(loaders, row)');
    expect(text).not.toMatch(/ByIngredient\.clear/);
  });
});
