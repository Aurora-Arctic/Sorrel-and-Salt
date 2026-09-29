// Entered through `users` before anything reaches `../audit`: the two import
// each other, and entered through `audit.ts` first, `users` is built with no
// audit columns and every write to it skips its stamps (claude-docs/db.md,
// "The seed module").
import '../../modules/identity/schema/users';

// CLAUDE.md rule 2: the only application code that imports the client
// (claude-docs/db.md, "Who may import the client"). `db` is not re-exported and
// callers never see the transaction — `withAudit`'s `AuditWriter` is the sole
// write mechanism, so no write can skip audit stamping. Rule 4: every exported
// finder applies `deleted_at IS NULL`, and the two read builders are not
// re-exported here — guarded by tests/guards/soft-delete-finder-guard.test.ts.
// Import this file, never a sibling: the rest of the folder is internal.

export { withAudit, type AuditWriter } from './write';
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
export { findManyInSpell, findManySpells, findOneSpell } from './spells';
export {
  findCompendiumPage,
  findManyOfIngredients,
  findOneIngredient,
  findSimilarIngredients,
  type IngredientFilter,
} from './ingredients';
export {
  findIngredientFormValues,
  findVocabularySuggestions,
  type FormSuggestion,
  type SuggestingVocabulary,
  type VocabularySuggestion,
} from './vocabularies';
export { findCommonNameSuggestions, type CommonNameSuggestion } from './common-names';
export type { Claimant } from './suggestion-page';
export { findMembershipsOfUsers, findWorkspaceRole } from './memberships';
export { findUserByEmail } from './users';
export { deleteProvisionalUsers } from './provisional-users';
