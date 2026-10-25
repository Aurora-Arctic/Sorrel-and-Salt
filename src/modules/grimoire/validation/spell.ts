import { z } from 'zod';
import { optionalText, requiredText } from '../../../lib/validation';
import type { SpellVisibility } from '../types';
import { SpellStepInput } from './spell-step';

// A spell as the builder and the mutation both read it. Pure: it imports no
// server-only module, so the form runs the same schema the service does
// (claude-docs/validation.md).

const VISIBILITIES = ['private', 'workspace'] as const satisfies readonly SpellVisibility[];

export const SpellInput = z.object({
  // The only required field: a spell is a workspace and a title.
  title: requiredText('Give the spell a title'),
  // Listed here because the table's enum would pull the database schema into
  // the browser; the `satisfies` and the test keep it equal to the column.
  // `public` is deferred with the notes subsystem (§13).
  visibility: z.enum(VISIBILITIES, { error: 'Choose private or workspace' }).optional(),
  // The spell's single free-text note; blank is none.
  note: optionalText(),
  // The recipe, in order: a step's place is its index.
  steps: z.array(SpellStepInput).default([]),
});
