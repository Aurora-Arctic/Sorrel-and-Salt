import type { z } from 'zod';
import type { SpellInput, UpdateSpellInput } from './spell';
import type { SpellStepInput } from './spell-step';

/** A spell as the schema parses it. */
export type SpellInputValue = z.output<typeof SpellInput>;

/** An update to a spell as the schema parses it. */
export type UpdateSpellInputValue = z.output<typeof UpdateSpellInput>;

/** One step as the schema parses it. */
export type SpellStepInputValue = z.output<typeof SpellStepInput>;
