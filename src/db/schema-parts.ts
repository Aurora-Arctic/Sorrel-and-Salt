import { sql } from 'drizzle-orm';
import { check, index, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import type { ExtraConfigColumn } from 'drizzle-orm/pg-core';
import type { LiveTable, SeedKeyedTable, VocabularyTable } from './types';

// The columns and indexes several tables declare alike, each built by one function so a table cannot drift from its siblings. Client-free,
// and nothing here may change a name: every builder produces what the migrations created (claude-docs/db/soft-delete.md, "Soft-delete filtering and the partial-index convention").

/** The surrogate key: a uuid the database generates, so an insert never names one. */
export function idColumn() {
  return uuid('id')
    .default(sql`pg_catalog.gen_random_uuid()`)
    .primaryKey();
}

/**
 * A unique index over the live rows alone, partial per CLAUDE.md rule 4:
 * without the predicate, deleting a row would reserve its key for good.
 */
export function liveUnique(
  name: string,
  table: LiveTable,
  ...columns: [ExtraConfigColumn | SQL, ...(ExtraConfigColumn | SQL)[]]
) {
  return uniqueIndex(name)
    .on(...columns)
    .where(sql`${table.deletedAt} is null`);
}

/**
 * The identity the reference seed gave the row, null on any other; never
 * changed after, so a reseed knows a row an admin has since edited.
 */
export function seedKeyColumn() {
  return text('seed_key');
}

/** One live row per seed key; a row no seed wrote holds none, so the nulls are left out. */
export function seedKeyUnique(name: string, table: SeedKeyedTable) {
  return uniqueIndex(name)
    .on(table.seedKey)
    .where(sql`${table.seedKey} is not null and ${table.deletedAt} is null`);
}

/**
 * What every admin-curated vocabulary row is: a display name, the slug that
 * addresses it, a description and the seed's key. A table adds its own
 * columns beside these, and spreads `...auditColumns` after them.
 */
export function vocabularyColumns() {
  return {
    id: idColumn(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description').notNull(),
    seedKey: seedKeyColumn(),
  };
}

/**
 * A vocabulary table's indexes, named `<prefix>_…`: the seed key's unique; the slug's, partial per rule 4; the CHECK refusing a blank description;
 * and where the autofill searches, the trigram index matched by `%` and `<%` under per-transaction thresholds, never `similarity()`
 * (claude-docs/db/member-autofill.md, "The member's autofill").
 */
export function vocabularyIndexes(
  prefix: string,
  table: VocabularyTable,
  { trigram }: { trigram: boolean },
) {
  return [
    seedKeyUnique(`${prefix}_seed_key_unique`, table),
    liveUnique(`${prefix}_slug_unique`, table, table.slug),
    check(`${prefix}_description_not_blank`, sql`btrim(description) <> ''`),
    ...(trigram
      ? [
          index(`${prefix}_trgm`).using(
            'gin',
            sql`${table.name} gin_trgm_ops`,
            sql`${table.description} gin_trgm_ops`,
          ),
        ]
      : []),
  ];
}
