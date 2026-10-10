import { z } from 'zod';
import { curatedValueInput, requiredRowId } from '../../../lib/validation';

// A curated deity as an admin writes one (MB.132), a form's shape with its
// tradition in place of a group. No slug (curatedValueInput says why). No
// `endRedirect`, which a form's input carries: a deity is no part of a
// compendium entry's address, so its rename ends no redirect.
export const DeityInput = curatedValueInput('deity').extend({
  traditionId: requiredRowId('Choose a tradition'),
});

export type DeityInput = z.output<typeof DeityInput>;
