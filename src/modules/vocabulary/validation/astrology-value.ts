import { z } from 'zod';

// A planet or a zodiac sign as an admin writes one (MB.95): a name and the
// description the table requires non-blank. No slug: it is derived from the
// name by src/lib/slugify.ts, never written beside it, so one in the input is
// dropped. One shape for both, each schema saying its own noun.

function astrologyValueInput(noun: string) {
  return z.object({
    name: z
      .string({ error: `Give the ${noun} a name` })
      .trim()
      .min(1, { error: `Give the ${noun} a name` }),
    description: z
      .string({ error: `Describe the ${noun}` })
      .trim()
      .min(1, { error: `Describe the ${noun}` }),
  });
}

export const PlanetInput = astrologyValueInput('planet');

export const ZodiacSignInput = astrologyValueInput('sign');

/** Either vocabulary's input: the two schemas parse the one shape. */
export type AstrologyValueInput = z.output<typeof PlanetInput>;
