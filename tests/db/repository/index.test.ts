import { describe, expect, it, vi } from 'vitest';
import { getTableColumns } from 'drizzle-orm';
import * as repository from '@/db/repository';

describe('repository public API', () => {
  // The provisional-account delete is the one `users` delete
  // (claude-docs/db/provisional-account-delete.md).
  it('exports exactly withAudit, the finders, the three reads that take no proof, and the provisional-account delete', () => {
    expect(Object.keys(repository).sort()).toEqual(
      [
        'deleteProvisionalUsers',
        'findMany',
        'findManyByIds',
        'findManyIncludingSoftDeleted',
        'findManyInSpell',
        'findManyOfIngredients',
        'findManyOfSpellIngredientsIncludingSoftDeleted',
        'findManyInWorkspace',
        'findManySpells',
        'findMembershipsOfUsers',
        'findOne',
        'findOneById',
        'findOneByIdInWorkspace',
        'findOneInWorkspace',
        'findOneSpell',
        'findPage',
        'findPageInWorkspace',
        'findCommonNameSuggestions',
        'findCompendiumCount',
        'findCompendiumEntryByIdentity',
        'findCompendiumEntryBySlug',
        'findCompendiumPage',
        'findCompendiumSlugRedirect',
        'findIngredientFormValues',
        'findIngredientsInSpellsIncludingSoftDeleted',
        'findOneIngredient',
        'findSimilarIngredients',
        'findUserByEmail',
        'findVocabularySuggestions',
        'findWorkspaceRole',
        'withAudit',
      ].sort(),
    );
  });
});

// `audit.ts` and `schema/users.ts` import each other, and whichever is entered
// second sees the first half-built. Entered through `audit.ts`, `users` is
// built while `auditColumns` is still undefined: the spread adds nothing and
// every write to `users` silently skips its stamps (claude-docs/db/seed-module.md, "The
// seed module"). A service's first database import is the repository, so the
// repository must enter through `users`.
describe('entering the database layer through the repository', () => {
  it('builds users with its audit columns', async () => {
    vi.resetModules();
    await import('@/db/repository');
    const { users: freshUsers } = await import('@/modules/identity/schema/users');

    expect(Object.keys(getTableColumns(freshUsers))).toEqual(
      expect.arrayContaining(['createdBy', 'updatedBy', 'deletedAt']),
    );
  });
});
