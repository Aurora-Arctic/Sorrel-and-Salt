import { z } from 'zod';
import { optionalText } from '../../../lib/validation';
import { INGREDIENT_ELEMENTS } from '../schema/ingredient-enums';

// What a member says over a compendium entry in their cupboard: the seven overrides of `workspace_compendium_entries`, each optional.
// The same shape serves the add (a missing key is no override) and the annotate (a missing key leaves the column, `null` hands it back).
// An empty list stays an empty list: it is an answer, the coven clearing what the compendium says on purpose.

/** Free text entries, trimmed, blank ones dropped; `[]` survives. */
const textList = z
  .array(z.string().trim())
  .nullish()
  .transform((list) => (list == null ? list : list.filter((entry) => entry !== '')));

/** The five elements and nothing typed, each once. */
const elements = z
  .array(z.enum(INGREDIENT_ELEMENTS, { error: 'Choose one of the five elements' }))
  .refine((list) => new Set(list).size === list.length, {
    error: 'Each element can be chosen once',
  })
  .nullish();

export const CupboardEntryInput = z.object({
  // Blank text is null, so a cleared label field hands the name back.
  label: optionalText(),
  description: optionalText(),
  safetyNotes: optionalText(),
  elements,
  celestialBodies: textList,
  zodiacSigns: textList,
  colors: textList,
});

export type CupboardEntryInput = z.output<typeof CupboardEntryInput>;
/** What a caller sends: every key optional. */
export type CupboardEntryValues = z.input<typeof CupboardEntryInput>;
