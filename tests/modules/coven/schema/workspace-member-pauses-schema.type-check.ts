import { eq } from 'drizzle-orm';
import type { AuditWriter } from '@/db/repository';
import type { NamedWrites } from '@/db/types';
import type { Membership } from '@/modules/coven';
import { workspaceMemberPauses } from '@/modules/coven/schema/workspace-member-pauses';

// Run by `npm run typecheck` only: each `@ts-expect-error` fails it the moment its constraint is loosened.

export const marked: NamedWrites = workspaceMemberPauses;

const id = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const where = eq(workspaceMemberPauses.userId, id);
declare const membership: Membership;

export const writes = [
  (write: AuditWriter) =>
    // @ts-expect-error — the mark: no generic insert, so a pause cannot be set already lifted or past the one-live slot's closing.
    write.insertInWorkspace(membership, workspaceMemberPauses, {
      userId: id,
      liftedAt: new Date(),
      liftedBy: id,
    }),
  (write: AuditWriter) =>
    // @ts-expect-error — the mark: no generic update, so the lifted pair is the lift's to stamp.
    write.updateInWorkspace(membership, workspaceMemberPauses, { liftedAt: null }, where),
  (write: AuditWriter) =>
    // @ts-expect-error — nor by id, so a pause's end cannot be moved.
    write.updateByIdInWorkspace(membership, workspaceMemberPauses, id, { until: new Date() }),
  (write: AuditWriter) =>
    // @ts-expect-error — the mark: no soft delete, so the history is kept.
    write.softDeleteInWorkspace(membership, workspaceMemberPauses, where),
  (write: AuditWriter) =>
    // @ts-expect-error — nor by id.
    write.softDeleteByIdInWorkspace(membership, workspaceMemberPauses, id),
  (write: AuditWriter) =>
    // @ts-expect-error — the mark: no hard delete, which deleted_at alone refuses too.
    write.delete(workspaceMemberPauses, where),
];
