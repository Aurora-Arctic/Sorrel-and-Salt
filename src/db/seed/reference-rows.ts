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
 * A work's `scholarly` mark is written with its row; `restateScholarly` keeps a present row's in step.
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

/**
 * Sets each present source a seed wrote to its work's `scholarly` mark, either way, unless a person edited the row: that one is kept
 * and returned by the name the caller gave its work. A soft-deleted source is left alone, and so is one the works do not name, so each
 * seed restates its own list. A source two names cite takes the mark if either gives it.
 */
export async function restateScholarly(
  tx: SeedTransaction,
  works: Iterable<readonly [string, SeedWork]>,
): Promise<{ source: string; differs: string[] }[]> {
  const wanted = new Map<string, { source: string; scholarly: boolean }>();
  for (const [source, work] of works) {
    const text = citationText(work);
    const scholarly = work.scholarly === true || wanted.get(text)?.scholarly === true;
    wanted.set(text, { source: wanted.get(text)?.source ?? source, scholarly });
  }
  const rows = await tx
    .select()
    .from(references)
    .where(and(isNull(references.workspaceId), isNull(references.deletedAt)));
  const kept: { source: string; differs: string[] }[] = [];
  for (const row of rows) {
    const work = row.seedKey === null ? undefined : wanted.get(row.seedKey);
    if (work === undefined || row.scholarly === work.scholarly) continue;
    if (touched(row)) {
      kept.push({ source: work.source, differs: ['scholarly'] });
      continue;
    }
    await tx
      .update(references)
      .set(applyAudit('update', { scholarly: work.scholarly }, BOOTSTRAP_SESSION))
      .where(eq(references.id, row.id));
  }
  return kept;
}
