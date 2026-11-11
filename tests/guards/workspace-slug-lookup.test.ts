import { describe, it } from 'vitest';
import { expectNamedOnlyIn, sourceFiles } from '../support/repo-scan';

// `findWorkspaceHoldingSlug` reads a coven by address with no Membership proof, so only the service that resolves a slug may name it; a second caller is argued for in the diff (CLAUDE.md rule 5).

const DEFINITION = 'src/db/repository/workspace-slugs.ts';
const ALLOWED = [
  DEFINITION,
  'src/db/repository/index.ts',
  'src/modules/coven/services/workspace-by-slug.ts',
  'tests/guards/workspace-slug-lookup.test.ts',
];

describe('the coven address lookup', () => {
  it('is named only by its definition, the repository index, the slug-resolving coven service and tests', () => {
    const files = sourceFiles().filter(
      (file) => !/^tests\/(?!guards\/workspace-slug-lookup)/.test(file),
    );
    expectNamedOnlyIn(files, /\bfindWorkspaceHoldingSlug\b/, ALLOWED, { definition: DEFINITION });
  });
});
