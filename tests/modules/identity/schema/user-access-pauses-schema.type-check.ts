import { eq } from 'drizzle-orm';
import type { AuditWriter } from '@/db/repository';
import type { NamedWrites } from '@/db/types';
import { userAccessPauses } from '@/modules/identity/schema/user-access-pauses';

// Compile assertions, checked by `npm run typecheck` and run by nothing: each `@ts-expect-error` fails the typecheck the moment
// its constraint is loosened, which a runtime assertion cannot see. `tsconfig.json` includes `tests/`, which is what reads this.

export const marked: NamedWrites = userAccessPauses;

const id = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const where = eq(userAccessPauses.userId, id);

export const writes = [
  (write: AuditWriter) =>
    // @ts-expect-error — the mark: no generic insert, so a pause cannot be set already lifted or past the one-live slot's closing.
    write.insert(userAccessPauses, { userId: id, liftedAt: new Date(), liftedBy: id }),
  (write: AuditWriter) =>
    // @ts-expect-error — the mark: no generic update, so the lifted pair is the lift's to stamp.
    write.update(userAccessPauses, { liftedAt: null }, where),
  (write: AuditWriter) =>
    // @ts-expect-error — nor by id, so a pause's end cannot be moved.
    write.updateById(userAccessPauses, id, { until: new Date() }),
  (write: AuditWriter) =>
    // @ts-expect-error — the mark: no soft delete, so the history is kept.
    write.softDelete(userAccessPauses, where),
  (write: AuditWriter) =>
    // @ts-expect-error — nor by id.
    write.softDeleteByIds(userAccessPauses, [id]),
  (write: AuditWriter) =>
    // @ts-expect-error — the mark: no hard delete, which deleted_at alone refuses too.
    write.delete(userAccessPauses, where),
];
