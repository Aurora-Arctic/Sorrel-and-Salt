import { z } from 'zod';
import { curatedValueInput } from '../../../lib/validation';

// A deity tradition has no colour: it labels a suggestion, it colours no chip.
export const DeityTraditionInput = curatedValueInput('tradition');

export type DeityTraditionInput = z.output<typeof DeityTraditionInput>;
