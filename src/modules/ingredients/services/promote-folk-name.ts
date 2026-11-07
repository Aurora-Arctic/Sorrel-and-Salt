import 'server-only';
import type { Session } from '../../../lib/session';
import { promoteCompendiumFolkName } from './compendium';
import { promoteWorkspaceFolkName } from './workspace-ingredients';
import type { IngredientRow } from '../types';

/**
 * A null `workspaceId` names a compendium entry and needs a site keeper; otherwise the caller must be allowed to update the coven's ingredients, which an observer is not.
 * @throws {Forbidden} the caller may not write that tier.
 * @throws {ValidationError} the new display name collides with another entry.
 * @throws {NotFound} no such ingredient in that tier, or no such live folk name on it.
 */
export function promoteFolkName(
  session: Session,
  workspaceId: string | null,
  ingredientId: string,
  folkNameId: string,
): Promise<IngredientRow> {
  return workspaceId === null
    ? promoteCompendiumFolkName(session, ingredientId, folkNameId)
    : promoteWorkspaceFolkName(session, workspaceId, ingredientId, folkNameId);
}
