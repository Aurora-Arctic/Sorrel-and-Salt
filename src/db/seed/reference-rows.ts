import { isNull } from 'drizzle-orm';
import { insertMissingReturningIds } from './idempotent';
import { citationText } from '../../lib/citation';
import { references } from '../../modules/ingredients/schema/references';
import type { CitationFields } from '../../lib/types';
import type { SeedTransaction } from './types';

// The compendium-tier `references` rows a reference-data seed wants, shared by
// the sources seed and the compendium seed so both key a
// work on one citation and a work the one wrote is linked, not twinned, by
// the other (claude-docs/db/references.md, "How the seed reads the docs").

/**
 * Every wanted source's id by its citation, inserting the missing ones. A
 * row a seed wrote answers by its key, live or not — `null` when
 * soft-deleted, so it is neither re-inserted nor linked anew. A live
 * compendium row nobody seeded, whose citation is the source's to the
 * letter, is linked rather than duplicated, and never written to. A source
 * wanted twice is one row.
 */
export async function insertMissingReferences(
  tx: SeedTransaction,
  wanted: readonly CitationFields[],
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
