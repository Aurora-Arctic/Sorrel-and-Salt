import { boolean, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { auditColumns } from '@/modules/identity/schema/users';

// The scratch table of the test-only workflow; the test creates and drops it.
export const jobNotes = pgTable('workflow_probe_notes', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  done: boolean('done').notNull().default(false),
  ...auditColumns,
});
