import { z } from 'zod';
import { curatedValueInput } from '../../../lib/validation';

// A form group as an admin writes one (M5.6b). No slug (curatedValueInput says
// why). No colour: a form group sections a dropdown, it colours no chip.
export const IngredientFormGroupInput = curatedValueInput('group');

export type IngredientFormGroupInput = z.output<typeof IngredientFormGroupInput>;
