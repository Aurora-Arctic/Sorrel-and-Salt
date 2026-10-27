import { eq } from 'drizzle-orm';
import type { AuditWriter } from '@/db/repository';
import type { NamedWrites } from '@/db/types';
import { adminRoleChangePauses } from '@/modules/identity/schema/admin-role-change-pauses';

// Compile assertions, checked by `npm run typecheck` and run by nothing: each
// `@ts-expect-error` fails the typecheck the moment its constraint is
// loosened, which a runtime assertion cannot see. `tsconfig.json` includes
// `tests/`, which is what reads this.

// The mark itself, as a type: a table that lost it fails this assignment.
export const marked: NamedWrites = adminRoleChangePauses;

const id = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const where = eq(adminRoleChangePauses.createdBy, id);

// The table carries the `namedWrites` mark, so every generic write is refused.
export const writes = [
  (write: AuditWriter) =>
    // @ts-expect-error — the mark: no generic insert, so a pause cannot open already ended.
    write.insert(adminRoleChangePauses, { endedAt: new Date(), endedBy: id }),
  (write: AuditWriter) =>
    // @ts-expect-error — the mark: no generic update, so the ended pair is the resume's to stamp.
    write.update(adminRoleChangePauses, { endedAt: null }, where),
  (write: AuditWriter) =>
    // @ts-expect-error — nor by id.
    write.updateById(adminRoleChangePauses, id, { endedBy: id }),
  (write: AuditWriter) =>
    // @ts-expect-error — the mark: no soft delete, though the table carries deleted_at.
    write.softDelete(adminRoleChangePauses, where),
  (write: AuditWriter) =>
    // @ts-expect-error — nor by id.
    write.softDeleteByIds(adminRoleChangePauses, [id]),
  (write: AuditWriter) =>
    // @ts-expect-error — the mark: no hard delete, which deleted_at alone refuses too.
    write.delete(adminRoleChangePauses, where),
];
