import { z } from 'zod';
import { curatedValueInput } from '../../../lib/validation';

// A deity tradition as an admin writes one (MB.132), a form group's shape. No
// slug (curatedValueInput says why). No colour: a tradition labels a
// suggestion, it colours no chip.
export const DeityTraditionInput = curatedValueInput('tradition');

export type DeityTraditionInput = z.output<typeof DeityTraditionInput>;
