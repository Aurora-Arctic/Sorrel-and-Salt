import { z } from 'zod';
import { curatedValueInput } from '../../../lib/validation';

// A planet or a zodiac sign as an admin writes one (MB.95): a curated value's
// name and description, and nothing else. One shape for both, each schema
// saying its own noun.

export const PlanetInput = curatedValueInput('planet');

export const ZodiacSignInput = curatedValueInput('sign');

/** Either vocabulary's input: the two schemas parse the one shape. */
export type AstrologyValueInput = z.output<typeof PlanetInput>;
