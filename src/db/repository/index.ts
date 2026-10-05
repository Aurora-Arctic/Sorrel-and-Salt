// CLAUDE.md rule 2: the only application code that imports the client
// (claude-docs/db/client-imports.md, "Who may import the client"). `db` is not re-exported and
// callers never see the transaction — `withAudit`'s `AuditWriter` is the sole
// write mechanism, so no write can skip audit stamping. Rule 4: every exported
// finder applies `deleted_at IS NULL` but the four named `…IncludingSoftDeleted`
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
  findOneByIdInWorkspace,
  findOneInWorkspace,
  findPage,
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
  findIngredientSuggestions,
  findManyOfIngredients,
  findOneIngredient,
  findSimilarIngredients,
  findSubstitutesIncludingSoftDeleted,
} from './ingredients';
export { findIngredientFormValues, findVocabularySuggestions } from './vocabularies';
export { findCommonNameSuggestions } from './common-names';
export { findCompendiumEntryBySlug, findCompendiumSlugRedirect } from './slugs';
export { findMembershipsOfUsers, findWorkspaceRole } from './memberships';
export { findUserByEmail } from './users';
export { deleteProvisionalUsers } from './provisional-users';
export type {
  AuditWriter,
  Claimant,
  CommonNameSuggestion,
  CompendiumScore,
  FormSuggestion,
  IngredientFilter,
  IngredientIdentity,
  IngredientRow,
  JoinedRow,
  SimilarityScore,
  SlugRedirect,
  SortPart,
  SuggestingVocabulary,
  VocabularySuggestion,
} from './types';
