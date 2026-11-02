import { and, eq, isNull } from 'drizzle-orm';
import { applyAudit } from '../audit';
import { BOOTSTRAP_SESSION, touched } from './bootstrap-admin';
import { insertMissingReturningIds } from './idempotent';
import { citationText } from '../../lib/citation';
import { references } from '../../modules/ingredients/schema/references';
import type { SeedTransaction, SeedWork } from './types';

// The compendium-tier `references` rows a reference-data seed wants, shared by
// the sources seed and the compendium seed so both key a
// work on one citation and a work the one wrote is linked, not twinned, by
// the other (claude-docs/db/references.md, "How the seed reads the docs").

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
 * Sets each present source a seed wrote to its work's fields and `scholarly` mark, either way, unless a person edited the row: that one
 * is kept and returned by the name the caller gave its work, with the columns that differ. A row's key is its rendered citation, so
 * only a field the citation does not print differs, or every field once a migration has rewritten a key to a work's new citation.
 * A soft-deleted source is left alone, and so is one the works do not name, so each seed restates its own list. A source two names
 * cite takes the mark if either gives it.
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
