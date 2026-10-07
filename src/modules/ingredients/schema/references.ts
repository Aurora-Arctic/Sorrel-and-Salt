import { sql } from 'drizzle-orm';
import { check, date, pgEnum, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { REFERENCE_KINDS } from './ingredient-enums';
import { auditColumns } from '../../identity/schema/users';
import { workspaces } from '../../coven/schema/workspaces';

export const referenceKind = pgEnum('reference_kind', REFERENCE_KINDS);

// The optional text columns, each refused blank when set. `url` is not among
// them: `references_url_absolute` already refuses a blank one.
const OPTIONAL_NOT_BLANK = [
  'authors',
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
  'note',
] as const;

// One source per row, in Chicago bibliography form, kept once and linked from
// every row it supports through `reference_links` (MB.151). Every field is
// text as Chicago prints it — `authors` with its role, `published` at a
// year's or a season's precision — because name order and dates are not
// mechanical across the sources; only the two days are `date`s. One table,
// two tiers, as `ingredients`: `workspace_id IS NULL` is the compendium. No
// unique index: nothing short of a librarian identifies a source, so the seed
// is idempotent by the rendered citation instead (claude-docs/db/references.md).
export const references = pgTable(
  'references',
  {
    id: uuid('id')
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    workspaceId: uuid('workspace_id').references(() => workspaces.id),
    kind: referenceKind('kind').notNull(),
    authors: text('authors'),
    title: text('title').notNull(),
    // The book of a chapter, the journal of an article, the reference work
    // of an entry, or the site of a web page.
    container: text('container'),
    contributors: text('contributors'),
    edition: text('edition'),
    volume: text('volume'),
    issue: text('issue'),
    series: text('series'),
    place: text('place'),
    publisher: text('publisher'),
    published: text('published'),
    pages: text('pages'),
    // The repository a print work was read through: Perseus, Encyclopedia.com.
    host: text('host'),
    url: text('url'),
    modified: date('modified'),
    accessed: date('accessed'),
    note: text('note'),
    // The identity the reference seed gave the row, null on any other; never
    // changed after, so a reseed knows a row an admin has since edited (MB.171).
    seedKey: text('seed_key'),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('references_seed_key_unique')
      .on(table.seedKey)
      .where(sql`${table.seedKey} is not null and ${table.deletedAt} is null`),
    // Required *and non-empty*: NOT NULL alone accepts ''. One CHECK per
    // column, so MB.153 paths the refusal to its field.
    check('references_title_not_blank', sql`btrim(title) <> ''`),
    ...OPTIONAL_NOT_BLANK.map((column) =>
      check(
        `references_${column}_not_blank`,
        sql.raw(`${column} is null or btrim(${column}) <> ''`),
      ),
    ),

    // The four that make the renderer total: every row admitted renders
    // without a branch for a missing required field (MB.151, decision 3).
    check('references_url_absolute', sql`url is null or url ~ '^https?://'`),
    check('references_accessed_needs_url', sql`accessed is null or url is not null`),
    check(
      'references_kind_needs_container',
      sql`kind not in ('chapter', 'article', 'entry') or container is not null`,
    ),
    check(
      'references_web_page_located',
      sql`kind <> 'web_page' or (url is not null and accessed is not null)`,
    ),
  ],
);
