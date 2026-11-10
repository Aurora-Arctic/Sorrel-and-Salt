import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, inject, it } from 'vitest';
import { REPO_ROOT } from '../support/paths';

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
    const files = inject('repoFiles').filter(
      (file) => /\.[cm]?tsx?$/.test(file) && !file.includes('__lint-probe'),
    );
    // Precondition: the definition is in the listing, so an empty result means no other file.
    expect(files).toContain(DEFINITION);

    const naming = files
      .filter((file) =>
        /\bfindWorkspaceHoldingSlug\b/.test(readFileSync(join(REPO_ROOT, file), 'utf8')),
      )
      .filter((file) => !/^tests\/(?!guards\/workspace-slug-lookup)/.test(file));

    expect(naming.sort()).toEqual([...ALLOWED].sort());
  });
});
