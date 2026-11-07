import { and, eq, isNull } from 'drizzle-orm';
import { applyAudit } from '../audit';
import { BOOTSTRAP_SESSION, touched } from './bootstrap-admin';
import { insertMissingReturningIds } from './idempotent';
import { citationText } from '../../lib/citation';
import { references } from '../../modules/ingredients/schema/references';
import type { SeedTransaction, SeedWork } from './types';

// The compendium-tier `references` rows a reference-data seed wants, shared so a work is linked, not twinned
// (claude-docs/db/references.md, "How the seed reads the docs").

/**
 * Every wanted source's id by its citation, inserting the missing ones. A row a seed wrote answers by its key, `null` when soft-deleted (neither re-inserted
 * nor linked). A live compendium row nobody seeded whose citation matches to the letter is linked, never written to. A source wanted twice is one row.
 * A work's fields and `scholarly` mark are written with its row; `restateWorks` keeps a present row's in step.
 */
export async function insertMissingReferences(
  tx: SeedTransaction,
  wanted: readonly SeedWork[],
): Promise<Map<string, string | null>> {
  const compendium = await tx.select().from(references).where(isNull(references.workspaceId));
  const ids = new Map<string, string | null>();

  for (const row of compendium) {
    if (row.seedKey !== null) ids.set(row.seedKey, row.deletedAt === null ? row.id : null);
  }
  for (const row of compendium) {
    const citation = citationText(row);
    if (row.seedKey === null && row.deletedAt === null && !ids.has(citation)) {
      ids.set(citation, row.id);
    }
  }

  const unique = [...new Map(wanted.map((fields) => [citationText(fields), fields])).values()];

  return insertMissingReturningIds(tx, references, unique, ids, {
    keyOf: (fields) => citationText(fields),
    keyOfRow: (row) => row.seedKey as string,
    toRow: (fields) => ({
      ...fields,
      workspaceId: null,
      seedKey: citationText(fields),
    }),
  });
}

/** The columns a seed writes from a work and restates on a present row: its citation fields, in the table's order, and its mark. */
const WORK_COLUMNS = [
  'kind',
  'authors',
  'title',
  'container',
  'contributors',
  'edition',
  'volume',
  'issue',
  'series',
  'place',
  'publisher',
  'published',
  'pages',
  'host',
  'url',
  'modified',
  'accessed',
  'note',
  'scholarly',
] as const satisfies readonly (keyof SeedWork)[];

/**
 * Restates each present source's fields and `scholarly` mark unless a person edited the row, which is kept
 * and returned (claude-docs/db/references.md, "How the seed reads the docs").
 */
export async function restateWorks(
  tx: SeedTransaction,
  works: Iterable<readonly [string, SeedWork]>,
): Promise<{ source: string; differs: string[] }[]> {
  const wanted = new Map<string, { source: string; work: SeedWork }>();
  for (const [source, work] of works) {
    const text = citationText(work);
    const first = wanted.get(text);
    const mark = work.scholarly === true ? { scholarly: true as const } : {};
    wanted.set(text, {
      source: first?.source ?? source,
      work: { ...(first?.work ?? work), ...mark },
    });
  }
  const rows = await tx
    .select()
    .from(references)
    .where(and(isNull(references.workspaceId), isNull(references.deletedAt)));
  const kept: { source: string; differs: string[] }[] = [];
  for (const row of rows) {
    const found = row.seedKey === null ? undefined : wanted.get(row.seedKey);
    if (found === undefined) continue;
    const values = Object.fromEntries(
      WORK_COLUMNS.map((column) => [
        column,
        column === 'scholarly' ? found.work.scholarly === true : (found.work[column] ?? null),
      ]),
    ) as Pick<typeof references.$inferInsert, (typeof WORK_COLUMNS)[number]>;
    const differs = WORK_COLUMNS.filter((column) => (row[column] ?? null) !== values[column]);
    if (differs.length === 0) continue;
    if (touched(row)) {
      kept.push({ source: found.source, differs });
      continue;
    }
    await tx
      .update(references)
      .set(applyAudit('update', values, BOOTSTRAP_SESSION))
      .where(eq(references.id, row.id));
  }
  return kept;
}
