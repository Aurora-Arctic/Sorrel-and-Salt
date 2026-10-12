// CLAUDE.md rule 2: the only application code that imports the client
// (claude-docs/db/client-imports.md, "Who may import the client"). `db` is not re-exported and
// callers never see the transaction — `withAudit`'s `AuditWriter` is the sole
// write mechanism, so no write can skip audit stamping. Rule 4: every exported
// finder applies `deleted_at IS NULL` but the five named `…IncludingSoftDeleted`
// hatches, and the two read builders are not re-exported here — guarded by
// tests/guards/soft-delete-finder-guard.test.ts.
// Import this file, never a sibling: the rest of the folder is internal.

export { withAudit } from './write';
export {
  findMany,
  findManyByIds,
  findManyIncludingSoftDeleted,
  findManyInWorkspace,
  findOne,
  findOneById,
  findOneBySlug,
  findOneByIdInWorkspace,
  findOneInWorkspace,
  findPage,
  findPageCount,
  findPageInWorkspace,
} from './finders';
export {
  findIngredientsInSpellsIncludingSoftDeleted,
  findManyInSpell,
  findManyOfSpellIngredientsIncludingSoftDeleted,
  findManySpells,
  findOneSpell,
} from './spells';
export {
  findCompendiumCount,
  findCompendiumEntryByIdentity,
  findCompendiumPage,
  findDeitiesOfIngredients,
  findIngredientSuggestions,
  findManyOfIngredients,
  findManyOfVariants,
  findOneIngredient,
  findSimilarIngredients,
  findSubstitutesIncludingSoftDeleted,
  findWorkspaceIngredientByIdentity,
} from './ingredients';
export { findManyReferences, findReferenceSuggestions, findReferencesOf } from './references';
export {
  findAstrologyValueCount,
  findAstrologyValues,
  findCategoryCount,
  findCategoryPage,
  findCompendiumFormRenameClashes,
  findCuratedRowsByIds,
  findCuratedRowsByName,
  findDeityCount,
  findDeityPage,
  findGroupCount,
  findGroupPage,
  findIngredientFormValueCount,
  findIngredientFormValues,
  findVocabularySuggestions,
} from './vocabularies';
export { findCommonNameSuggestions } from './common-names';
export { findCompendiumEntryBySlug, findCompendiumSlugRedirect } from './slugs';
export {
  findMemberByEmail,
  findMemberPage,
  findMembershipsOfUsers,
  findWorkspaceRole,
} from './memberships';
export {
  findCoMemberNamesIncludingSoftDeleted,
  findPrivilegeChangeCount,
  findPrivilegeChangePage,
  findProvidersOfUsers,
  findUserByEmail,
  findUserCount,
  findUserPage,
} from './users';
export {
  findInvitationByToken,
  findPendingInvitationsInWorkspace,
  findPendingSiteInvitationCount,
  findPendingSiteInvitationPage,
} from './invitations';
export { findOpenAdminRoleChangePause } from './admin-roles';
export { deleteProvisionalUsers } from './provisional-users';
export type { PrivilegeDeclaration, PrivilegeRoute } from '../types';
export type {
  AstrologyList,
  AstrologyValueFilter,
  AstrologyVocabulary,
  AuditWriter,
  CategoryFilter,
  CitingLink,
  Claimant,
  CommonNameSuggestion,
  CompendiumScore,
  DeityFilter,
  DeitySuggestion,
  FormSuggestion,
  GroupFilter,
  IngredientFilter,
  IngredientFormValueFilter,
  IngredientIdentity,
  IngredientRow,
  InvitableRole,
  InvitationRow,
  JoinedRow,
  LinkedProvider,
  PrivilegeChangeFilter,
  ReferenceLinkRow,
  ReferenceRow,
  SimilarityScore,
  SiteInvitationFilter,
  SiteInvitationRow,
  SiteInvitationValues,
  SlugRedirect,
  SortPart,
  SuggestingVocabulary,
  UserFilter,
  VocabularySuggestion,
  WorkspaceInvitationValues,
} from './types';
