import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { helpArticleKind, helpAudience } from '@/modules/help/schema/help-articles';
import { HelpArticleInput } from '@/modules/help/validation/help';
import { NOUNS } from '@/components/HelpArticleForm/rules';
import { HELP_AUDIENCE_LABELS } from '@/lib/help-audience';

const sdlValues = (name: string): string[] => {
  const sdl = readFileSync('src/graphql/schema.graphql', 'utf8');
  const body = new RegExp(`enum ${name} \\{([^}]*)\\}`).exec(sdl)?.[1] ?? '';
  return body
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
};

describe('the help kind and audience lists', () => {
  it('are the same list in the schema, GraphQL, the validator and the component labels', () => {
    expect(sdlValues('HelpArticleKind').sort()).toEqual([...helpArticleKind.enumValues].sort());
    expect(sdlValues('HelpAudience').sort()).toEqual([...helpAudience.enumValues].sort());
    expect(Object.keys(NOUNS).sort()).toEqual([...helpArticleKind.enumValues].sort());
    expect(Object.keys(HELP_AUDIENCE_LABELS).sort()).toEqual([...helpAudience.enumValues].sort());
    const shape = HelpArticleInput.shape;
    for (const kind of helpArticleKind.enumValues)
      expect(shape.kind.safeParse(kind).success).toBe(true);
    for (const audience of helpAudience.enumValues)
      expect(shape.audience.safeParse(audience).success).toBe(true);
    expect(shape.kind.safeParse('other').success).toBe(false);
  });
});
