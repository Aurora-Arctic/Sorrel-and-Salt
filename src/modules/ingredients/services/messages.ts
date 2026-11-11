import 'server-only';
import { NotFound } from '../../../lib/errors';
import { isRowId } from '../../../lib/validation';

export const NO_COMPENDIUM_ENTRY = 'No such compendium entry';
export const NO_COVEN_INGREDIENT = 'No such ingredient in this coven';
export const NO_INGREDIENT = 'No such ingredient';
export const NO_SOURCE = 'No such source';

/** An id that is not a uuid names nothing, and would be a driver error at the comparison. */
export function assertRowId(id: string, message: string): void {
  if (!isRowId(id)) throw new NotFound(message);
}
