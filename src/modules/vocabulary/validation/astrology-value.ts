import { z } from 'zod';
import { curatedValueInput } from '../../../lib/validation';

export const CelestialBodyInput = curatedValueInput('celestial body');

export const ZodiacSignInput = curatedValueInput('sign');

export type AstrologyValueInput = z.output<typeof CelestialBodyInput>;
