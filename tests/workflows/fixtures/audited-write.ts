import { markDone } from './audited-write-steps';

// A workflow that exists only for the tests: it does what a job does, one audited write as the
// System actor, so a real run can be asserted on without a production job that writes through
// `withAudit`.
export async function auditedWriteWorkflow(noteId: string): Promise<boolean> {
  'use workflow';
  return markDone(noteId);
}
