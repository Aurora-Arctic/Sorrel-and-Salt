import { z } from 'zod';
import { curatedValueInput, requiredRowId } from '../../../lib/validation';

// A curated deity as an admin writes one, a form's shape with its tradition in place of a group. No slug (curatedValueInput says why), and no `endRedirect`,
// since a deity is no part of an entry's address. `otherNames` is the whole list the form shows; repeats are refused by `otherNameRepeats` below and the service
// (claude-docs/db/categories.md, "Vocabulary schema details").
export const DeityInput = curatedValueInput('deity').extend({
  traditionId: requiredRowId('Choose a tradition'),
  otherNames: z.array(z.string().trim()).nullish(),
});

export type DeityInput = z.output<typeof DeityInput>;

/** The refusal of an other name a deity already holds, naming that deity. */
export const otherNameHeldBy = (deity: string) => `${deity} already has this other name`;

/** The index of every entry of `names` that repeats an earlier one, case folded as the unique index folds it, passing over blanks, which are dropped before the write. */
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
