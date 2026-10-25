import type { z } from 'zod';
import type { SpellInput } from './spell';
import type { SpellStepInput } from './spell-step';

/** A spell as the schema parses it. */
export type SpellInputValue = z.output<typeof SpellInput>;

/** One step as the schema parses it. */
export type SpellStepInputValue = z.output<typeof SpellStepInput>;
