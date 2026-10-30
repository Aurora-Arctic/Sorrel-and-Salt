import { z } from 'zod';
import { CalendarDay, RowId, optionalText, requiredText } from '../../../lib/validation';

// A working as the record dialog and the mutations read it: when it was made, who made it, a
// note, and who may read it. Pure, like `spell.ts`, so the form runs the schema the service does.
// It mirrors spell_workings' and spell_working_participants' CHECKs and unique indexes.

// Written out for the reason `spell.ts` gives; `public` is deferred with the notes subsystem (§13).
const VISIBILITIES = ['private', 'workspace'] as const;

// A coven member by id, or a name typed for anyone else: never both, never neither
// (spell_working_participants' one-of CHECK).
const Participant = z
  .object({
    userId: RowId.nullish(),
    name: requiredText('Write a name, or remove it').nullish(),
  })
  .superRefine((participant, context) => {
    if ((participant.userId != null) === (participant.name != null)) {
      context.addIssue({
        code: 'custom',
        message: 'Choose a member or write a name, not both',
      });
    }
  })
  // Only the field that was given, so `{ userId }` and `{ name }` are what the service reads.
  .transform(({ userId, name }) => (userId != null ? { userId } : { name: name as string }));

// Mirrors the two unique indexes on a working's participants: a member once, a name once, case aside.
function distinctParticipants(
  working: { participants?: { userId?: string; name?: string }[] },
  context: z.RefinementCtx,
) {
  const seen = new Set<string>();
  working.participants?.forEach((participant, index) => {
    // A participant that failed its own rule carries neither, or is not parsed at all, and is said so there.
    const key =
      participant.userId ?? (participant.name && `name:${participant.name.toLowerCase()}`);
    if (!key) return;
    if (seen.has(key)) {
      context.addIssue({
        code: 'custom',
        path: ['participants', index],
        message: 'Each person can be named once',
      });
    }
    seen.add(key);
  });
}

export const WorkingInput = z
  .object({
    // The day it was made, which is not the day it was recorded.
    workedOn: CalendarDay,
    // How it went; blank is none.
    note: optionalText(),
    // In order. Left out: on record, the recorder alone; on update, unchanged.
    participants: z.array(Participant).optional(),
    // Left out: the column's default on record (workspace, capped at the spell's), unchanged on update.
    visibility: z.enum(VISIBILITIES, { error: 'Choose private or coven' }).optional(),
  })
  .superRefine(distinctParticipants);
