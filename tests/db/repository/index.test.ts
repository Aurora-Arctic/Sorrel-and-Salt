import { describe, expect, it, vi } from 'vitest';
import { getTableColumns } from 'drizzle-orm';
import * as repository from '@/db/repository';

describe('repository public API', () => {
  // The provisional-account delete is the one `users` delete
  // (claude-docs/db/provisional-account-delete.md).
  it('exports exactly withAudit, the finders, the four reads that take no proof, the three that take the admin proof, and the provisional-account delete', () => {
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
        'findAdminInvitationByToken',
        'findOpenAdminRoleChangePause',
        'findOne',
        'findOneById',
        'findOneByIdInWorkspace',
        'findOneBySlug',
        'findOneInWorkspace',
        'findOneSpell',
        'findPage',
        'findPageInWorkspace',
        'findProvidersOfUsers',
        'findCategoryCount',
        'findCategoryPage',
        'findCommonNameSuggestions',
        'findCompendiumCount',
        'findCompendiumEntryByIdentity',
        'findCompendiumEntryBySlug',
        'findCompendiumPage',
        'findCompendiumSlugRedirect',
        'findCuratedRowsByIds',
        'findCuratedRowsByName',
        'findDeitiesOfIngredients',
        'findIngredientFormValueCount',
        'findIngredientFormValues',
        'findIngredientSuggestions',
        'findIngredientsInSpellsIncludingSoftDeleted',
        'findOneIngredient',
        'findManyReferences',
        'findReferenceSuggestions',
        'findReferencesOfIngredients',
        'findSimilarIngredients',
        'findSubstitutesIncludingSoftDeleted',
        'findUserByEmail',
        'findUserPage',
        'findVocabularySuggestions',
        'findWorkspaceRole',
        'withAudit',
      ].sort(),
    );
  });
});

// `audit.ts` takes the column its stamps reference rather than importing
// `users`, so no import order leaves `users` half-built (claude-docs/db/seed-module.md,
// "The seed module"). A service's first database import is the repository, so
// this pins that entering there builds `users` with its audit columns. Were the
// cycle back, loading the repository here throws: one half reads the other
// before it is initialised.
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
