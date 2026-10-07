import { z } from 'zod';
import { MIN_CHIP_CONTRAST, chipContrast, formatRatio } from '../../../lib/contrast';
import { MAX_HUE_DISTANCE, hueDistance, isAchromatic } from '../../../lib/group-colors';
import type { GroupColorColumn } from '../../../lib/types';
import { IngredientFormGroupInput } from './ingredient-form-group';

// A category group as an admin writes one (M5.6b): a form group's name and
// description, and the chip's two colours. Each colour is held to 4.5:1
// against the harder of its own theme's surfaces (MB.36) here rather than by
// a CHECK, so the refusal can name the column and the ratio, beside the
// picker that chose it (MB.43); and here rather than in the service alone, so
// the form refuses before the request. Refused, never corrected: the admin
// gets the colour they chose or an error, as `unitConvert` refuses (§11).

const WHERE: Record<GroupColorColumn, string> = {
  colorDark: 'The dark theme colour reads {ratio}:1 on the dark card',
  colorLight: 'The light theme colour reads {ratio}:1 on the light page',
};

const WHOLE = /^#[0-9a-f]{6}$/i;

const color = (column: GroupColorColumn) =>
  z
    .string({ error: 'Choose a colour, as a hex like #4e8bc2' })
    .regex(WHOLE, { error: 'Choose a colour, as a hex like #4e8bc2' })
    .transform((hex) => hex.toLowerCase())
    .superRefine((hex, context) => {
      const ratio = chipContrast(column, hex);
      if (ratio >= MIN_CHIP_CONTRAST) return;
      context.addIssue({
        code: 'custom',
        message: `${WHERE[column].replace('{ratio}', formatRatio(ratio))} — it needs at least ${MIN_CHIP_CONTRAST}:1`,
      });
    });

// The pair is one family, the owner's call: one hue to within
// MAX_HUE_DISTANCE, as every seeded pair keeps to within a degree, or two
// greys. Read only once both colours have passed their own checks, and
// refused beside the second picker, under the pair.
export const CategoryGroupInput = IngredientFormGroupInput.extend({
  colorDark: color('colorDark'),
  colorLight: color('colorLight'),
}).superRefine(({ colorDark, colorLight }, context) => {
  // Zod runs this whether or not a colour failed its own check: a pair with a
  // colour already refused has nothing further to hear.
  const settled = (column: GroupColorColumn, hex: string) =>
    WHOLE.test(hex) && chipContrast(column, hex) >= MIN_CHIP_CONTRAST;
  if (!settled('colorDark', colorDark) || !settled('colorLight', colorLight)) return;
  const greys = [colorDark, colorLight].filter(isAchromatic).length;
  if (greys === 2) return;
  const message =
    greys === 1
      ? 'One colour is grey and the other is not — give them the same hue'
      : hueDistance(colorDark, colorLight) > MAX_HUE_DISTANCE
        ? `The two colours are ${Math.round(hueDistance(colorDark, colorLight))}° apart in hue — keep them within ${MAX_HUE_DISTANCE}° of each other`
        : undefined;
  if (message) context.addIssue({ code: 'custom', path: ['colorLight'], message });
});

export type CategoryGroupInput = z.output<typeof CategoryGroupInput>;
