import { markDone } from './audited-write-steps';

export async function auditedWriteWorkflow(noteId: string): Promise<boolean> {
  'use workflow';
  return markDone(noteId);
}
