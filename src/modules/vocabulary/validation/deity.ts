import { z } from 'zod';
import { curatedValueInput, requiredRowId } from '../../../lib/validation';

// A curated deity as an admin writes one, a form's shape with its
// tradition in place of a group. No slug (curatedValueInput says why). No
// `endRedirect`, which a form's input carries: a deity is no part of a
// compendium entry's address, so its rename ends no redirect.
//
// `otherNames` is the whole list the form shows, as an entry's
// `folkNames` is: each trimmed, and an absent list read as an empty one by
// the service, since a save brings the stored names to the list sent. A plain
// object, with no refinement, so the form can still `omit` and `extend` it;
// the repeat refusals are `otherNameRepeats` below and the service's.
export const DeityInput = curatedValueInput('deity').extend({
  traditionId: requiredRowId('Choose a tradition'),
  otherNames: z.array(z.string().trim()).nullish(),
});

export type DeityInput = z.output<typeof DeityInput>;

/** The refusal of an other name a deity already holds, naming that deity. */
export const otherNameHeldBy = (deity: string) => `${deity} already has this other name`;

/**
 * The index of every entry of `names` that repeats an earlier one, case
 * folded as the unique index folds it — the second "Bast" of a list — with
 * blanks passed over, since they are dropped before the write.
 */
export function otherNameRepeats(names: readonly string[]): number[] {
  const seen = new Set<string>();
  return names.flatMap((name, index) => {
    if (name === '') return [];
    const key = name.toLowerCase();
    if (seen.has(key)) return [index];
    seen.add(key);
    return [];
  });
}
