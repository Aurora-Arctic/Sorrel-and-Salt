// CLAUDE.md rule 2: the only application code that imports the client
// (claude-docs/db/client-imports.md, "Who may import the client"). `db` is not re-exported and
// callers never see the transaction — `withAudit`'s `AuditWriter` is the sole
// write mechanism, so no write can skip audit stamping. Rule 4: every exported
// finder applies `deleted_at IS NULL` but the seven named `…IncludingSoftDeleted`
// hatches and the coven Ingredients list's three readers, which admit a
// retired compendium entry the coven's cupboard still names through an
// internal hatch (M12.32), and the two read builders are not re-exported
// here — guarded by tests/guards/soft-delete-finder-guard.test.ts.
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
  findPageCountInReadableSpells,
  findPageInReadableSpells,
  findPageInWorkspace,
} from './finders';
export {
  findFormsInSpellsIncludingSoftDeleted,
  findIngredientsInSpellsIncludingSoftDeleted,
  findManyInSpell,
  findManyInSpells,
  findManyOfSpellIngredientsIncludingSoftDeleted,
  findOneSpell,
} from './spells';
export { findGrimoireCategoryCounts, findGrimoireCount, findGrimoirePage } from './grimoire';
export {
  findCompendiumCount,
  findCompendiumEntryByIdentity,
  findCompendiumPage,
  findDeitiesOfIngredients,
  findIngredientSuggestions,
  findManyIngredients,
  findManyOfIngredients,
  findManyOfVariants,
  findCompendiumReview,
  findOneIngredient,
  findReadableVariant,
  findReadableVariants,
  findSimilarIngredients,
  findSubstitutesIncludingSoftDeleted,
  findWorkspaceIngredientByIdentity,
  findWorkspaceIngredientCount,
  findWorkspaceIngredientPage,
} from './ingredients';
export { findCompendiumFacets, findWorkspaceIngredientFacets } from './ingredient-facets';
export {
  findCompendiumMatchPage,
  findCompendiumMatchesByName,
  countCovensUsing,
  findCupboardEntriesOf,
  findCupboardEntry,
  findCupboardEntryByLabel,
  findCupboardEntryIncludingSoftDeleted,
  findWorkspaceIngredientByName,
} from './cupboard-entries';
export {
  COVEN_STOCK_LOCK_NAMESPACE,
  findStockById,
  findStockByIds,
  findStockOfIngredients,
  findStockOfVariants,
} from './stock';
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
  findDeityOtherNameHolders,
  findDeityOtherNames,
  findDeityPage,
  findGroupCount,
  findGroupPage,
  findIngredientFormValueCount,
  findIngredientFormValues,
  findVocabularySuggestions,
} from './vocabularies';
export { findCommonNameSuggestions } from './common-names';
export {
  findCompendiumEntryBySlug,
  findCompendiumSlugRedirect,
  findCompendiumSlugs,
} from './slugs';
export {
  findMemberByEmail,
  findMemberEmails,
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
  findInvitationInWorkspace,
  findInvitedCoven,
  findReceivedInvitation,
  findReceivedInvitationCount,
  findReceivedInvitationCovens,
  findReceivedInvitationInviters,
  findReceivedInvitationPage,
  findPendingWorkspaceInvitationCount,
  findPendingWorkspaceInvitationPage,
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
  CompendiumFacets,
  CompendiumScore,
  GrimoireQuery,
  SuggestionGroup,
  SuggestionGroupTag,
  CupboardEntryRow,
  DeityFilter,
  DeitySuggestion,
  FacetCount,
  ReviewFacetValue,
  FormSuggestion,
  GroupFilter,
  IngredientFacets,
  WorkspaceIngredientFacets,
  WorkspaceListEdge,
  IngredientFilter,
  IngredientFormValueFilter,
  IngredientIdentity,
  CompendiumReviewRow,
  IngredientRow,
  InvitableRole,
  InvitableSiteRole,
  InvitationRow,
  InvitedCoven,
  JoinedRow,
  LinkedProvider,
  PrivilegeChangeFilter,
  ReceivedInvitationCoven,
  ReceivedInvitationInviter,
  ReferenceLinkRow,
  ReferenceRow,
  SimilarityScore,
  SiteInvitationFilter,
  SiteInvitationRow,
  SiteInvitationValues,
  SlugRedirect,
  CompendiumSlugEntry,
  SortPart,
  StockRow,
  VariantRow,
  SuggestingVocabulary,
  UserFilter,
  VocabularySuggestion,
  WorkspaceInvitationValues,
} from './types';
