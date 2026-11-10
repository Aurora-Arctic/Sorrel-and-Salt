import { eq } from 'drizzle-orm';
import type { AuditWriter } from '@/db/repository';
import type { NamedWrites } from '@/db/types';
import { workspaceSlugs } from '@/modules/coven/schema/workspace-slugs';

// Run by `npm run typecheck` only: each `@ts-expect-error` fails it the moment its constraint is loosened.

export const marked: NamedWrites = workspaceSlugs;

const id = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const where = eq(workspaceSlugs.slug, 'fixture-address');

export const writes = [
  (write: AuditWriter) =>
    // @ts-expect-error — the mark: no generic insert, so an address is recorded only by the rename and creation writers.
    write.insert(workspaceSlugs, { workspaceId: id, slug: 'fixture-address' }),
  (write: AuditWriter) =>
    // @ts-expect-error — nor a generic update, so an address never moves to another coven.
    write.updateById(workspaceSlugs, id, { workspaceId: id }),
  (write: AuditWriter) =>
    // @ts-expect-error — nor a hard delete, so an old address is kept.
    write.delete(workspaceSlugs, where),
];
