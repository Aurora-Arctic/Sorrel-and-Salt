import { z } from 'zod';
import { curatedValueInput } from '../../../lib/validation';
import { FORM_GROUP_ICONS } from '../schema/form-group-icons';

// A form group as an admin writes one. No slug (curatedValueInput says
// why). No colour: a form group sections a dropdown, it colours no chip. The
// icon that stands for it is one of the six or none, the generic:
// null and absent both mean none, since the service writes the group whole
// and GraphQL hands a null over as absent.
export const IngredientFormGroupInput = curatedValueInput('group').extend({
  icon: z
    .enum(FORM_GROUP_ICONS, { error: 'Choose one of the six icons, or none' })
    .nullable()
    .optional(),
});

export type IngredientFormGroupInput = z.output<typeof IngredientFormGroupInput>;
