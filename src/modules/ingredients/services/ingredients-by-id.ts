import 'server-only';
import { findManyIngredients } from '../../../db/repository';
import { inIdOrder } from '../../../lib/in-id-order';
import type { Session } from '../../../lib/session';
import { RowId } from '../../../lib/validation';
import type { Membership } from '@/modules/coven';
import { proofFor } from './ingredient-rows';
import { seesReview } from './compendium-filter';
import type { IngredientKey, IngredientRow } from '../types';

/**
 * Each ingredient named, in order: a DataLoader's batch. A ref is the row that holds the id and so names the coven it is read in. Anything not
 * readable is null, never an error, so an id learns nothing from the difference: missing, soft-deleted, another coven's, or a coven the caller holds no seat in.
 */
export async function ingredientsOf(
  session: Session,
  refs: readonly IngredientKey[],
): Promise<(IngredientRow | null)[]> {
  const curates = seesReview(session);
  const covens = [...new Set(refs.flatMap((ref) => ref.workspaceId ?? []))];
  const proofs = await Promise.all(covens.map((workspaceId) => proofFor(session, workspaceId)));
  const memberships = proofs.filter((proof): proof is Membership => proof !== undefined);

  // An id is whatever a row carried, but one that is not a uuid would be a
  // driver error rather than an ingredient nobody holds.
  const ids = [...new Set(refs.map((ref) => ref.id).filter((id) => RowId.safeParse(id).success))];
  const rows = await findManyIngredients(memberships, ids);

  // The read is scoped to every coven the batch proves at once, so a ref
  // claiming one coven could be answered with a row of another it also names:
  // the row has to be the compendium's or the ref's own coven's.
  return inIdOrder(
    refs.map((ref) => ref.id),
    rows,
    () => null,
  ).map((found, i) => {
    if (!found) return null;
    if (found.workspaceId === refs[i].workspaceId) return found;
    // The compendium's row, hidden ones for a curator or a ref made in a coven (whose cupboard may hold it) alone.
    const readable = found.shown || curates || refs[i].workspaceId !== null;
    return found.workspaceId === null && readable ? found : null;
  });
}
