'use step';

import { and, eq } from 'drizzle-orm';
import { withAudit } from '@/db/repository';
import { SYSTEM_ACTOR_ID } from '@/lib/system-actor';
import { jobNotes } from './job-notes';

/** Marks the note done as the System actor; false when it already was, and then nothing is written. */
export async function markDone(noteId: string): Promise<boolean> {
  const rows = await withAudit({ userId: SYSTEM_ACTOR_ID }, (write) =>
    write.update(jobNotes, { done: true }, and(eq(jobNotes.id, noteId), eq(jobNotes.done, false))!),
  );
  return rows.length > 0;
}
