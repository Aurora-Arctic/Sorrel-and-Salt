import { beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { AUDIT_COLUMNS } from '../../../support/db/table-metadata';
import { helpArticleRow, insertHelpArticle } from '../../../support/db/insert-help-article';
import type { HelpArticleSeed } from '../../../support/db/insert-help-article';
import { A } from '../../../support/as-user';

// The migrated table, read through the raw client alone, so a failure here names the database
// rather than the schema file. The schema file's declaration is help-articles-schema.test.ts's.

const TABLE = 'help_articles';
const KINDS = ['faq', 'article', 'term'];
const AUDIENCES = ['public', 'staff', 'keeper'];

const SLUG_UNIQUE = 'help_articles_slug_unique';
const SEED_KEY_UNIQUE = 'help_articles_seed_key_unique';
const SEARCH_INDEX = 'help_articles_search_vector_idx';
const TERM_NO_POSITION = 'help_articles_term_no_position';
const TERM_NO_PARENT = 'help_articles_term_no_parent';
const NOT_OWN_PARENT = 'help_articles_not_own_parent';
const TERM_PUBLIC = 'help_articles_term_public';

const AUTHOR = A.id;
const THE_MILLENNIUM = '2000-01-01 00:00:00';

let sql: ReturnType<typeof postgres>;
const { indexRow } = useTestDatabase((client) => (sql = client));

const insert = (seed: HelpArticleSeed) => insertHelpArticle(sql, seed, AUTHOR);
const softDelete = (id: string) =>
  sql`update help_articles set deleted_at = now(), deleted_by = ${AUTHOR} where id = ${id}`;

describe('the help_articles table', () => {
  beforeEach(async () => {
    await sql`truncate help_articles`;
  });

  describe('columns', () => {
    it('has its own columns, the search vector and the full audit spread, each of its type', async () => {
      const columns = await sql<{ name: string; type: string; nullable: boolean }[]>`
        select a.attname as name,
               format_type(a.atttypid, a.atttypmod) as type,
               not a.attnotnull as nullable
        from pg_attribute a
        where a.attrelid = ${TABLE}::regclass and a.attnum > 0 and not a.attisdropped
      `;
      const own = Object.fromEntries(
        columns
          .filter(({ name }) => !AUDIT_COLUMNS.includes(name))
          .map(({ name, type, nullable }) => [name, { type, nullable }]),
      );

      expect(columns.map(({ name }) => name).sort()).toEqual(
        [
          'id',
          'kind',
          'audience',
          'title',
          'slug',
          'summary',
          'body',
          'position',
          'seed_key',
          'shown',
          'parent_id',
          'search_vector',
          ...AUDIT_COLUMNS,
        ].sort(),
      );
      // The vector is generated, so its nullability is the expression's and is not asserted.
      const { search_vector, ...rest } = own;
      expect(search_vector.type).toBe('tsvector');
      expect(rest).toEqual({
        id: { type: 'uuid', nullable: false },
        kind: { type: 'help_article_kind', nullable: false },
        audience: { type: 'help_audience', nullable: false },
        title: { type: 'text', nullable: false },
        slug: { type: 'text', nullable: false },
        summary: { type: 'text', nullable: true },
        body: { type: 'text', nullable: false },
        position: { type: 'integer', nullable: true },
        seed_key: { type: 'text', nullable: true },
        shown: { type: 'boolean', nullable: false },
        parent_id: { type: 'uuid', nullable: true },
      });
    });

    it('holds a kind of faq, article or term, and refuses any other', async () => {
      const [{ values }] = await sql<{ values: string[] }[]>`
        select enum_range(null::help_article_kind)::text[] as values
      `;
      expect(values).toEqual(KINDS);

      const error = await failureOf(
        sql`insert into help_articles ${sql({ ...helpArticleRow({}, AUTHOR), kind: 'guide' } as never)}`,
      );
      expect(error.code).toBe('22P02');
    });

    it('holds an audience of public, staff or keeper, public when none is named, and refuses any other', async () => {
      const [{ values }] = await sql<{ values: string[] }[]>`
        select enum_range(null::help_audience)::text[] as values
      `;
      expect(values).toEqual(AUDIENCES);

      const id = await insert({});
      const [row] = await sql`select audience from help_articles where id = ${id}`;
      expect(row.audience).toBe('public');

      const error = await failureOf(insert({ audience: 'members' as never }));
      expect(error.code).toBe('22P02');
    });

    it('takes a row of each kind and each audience', async () => {
      await insert({ kind: 'faq', position: 1, audience: 'public' });
      await insert({ kind: 'article', summary: 'Testwort in short.', audience: 'staff' });
      await insert({ kind: 'article', audience: 'keeper' });
      await insert({ kind: 'term', audience: 'public' });

      const rows = await sql`select kind, audience from help_articles order by kind, audience`;
      expect(rows.map((row) => [row.kind, row.audience])).toEqual([
        ['faq', 'public'],
        ['article', 'staff'],
        ['article', 'keeper'],
        ['term', 'public'],
      ]);
    });
  });

  describe('the parent', () => {
    it('references another help article, and refuses a parent that does not exist', async () => {
      const parent = await insert({});
      const child = await insert({ parent_id: parent });

      const [row] = await sql`select parent_id from help_articles where id = ${child}`;
      expect(row.parent_id).toBe(parent);

      const [reference] = await sql<{ table: string; columns: string[] }[]>`
        select confrelid::regclass::text as table,
               array(select attname from pg_attribute
                     where attrelid = confrelid and attnum = any(confkey))::text[] as columns
        from pg_constraint
        where conrelid = ${TABLE}::regclass and contype = 'f'
          and conkey = array[(select attnum from pg_attribute
                              where attrelid = ${TABLE}::regclass and attname = 'parent_id')]::int2[]
      `;
      expect(reference).toEqual({ table: TABLE, columns: ['id'] });

      const error = await failureOf(insert({ parent_id: crypto.randomUUID() }));
      expect(error.code).toBe('23503');
    });
  });

  describe('the CHECK constraints', () => {
    it('refuses a term with a position, and takes the same term without one', async () => {
      const term: HelpArticleSeed = { kind: 'term', slug: 'testwort', position: 3 };

      const error = await failureOf(insert(term));

      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe(TERM_NO_POSITION);
      await insert({ ...term, position: null });
      // Precondition: the CHECK is about terms; an FAQ entry keeps its position.
      await insert({ kind: 'faq', position: 3 });
    });

    it('refuses a term with a parent, and takes the same term without one', async () => {
      const parent = await insert({ kind: 'article' });
      const term: HelpArticleSeed = { kind: 'term', slug: 'testwort', parent_id: parent };

      const error = await failureOf(insert(term));

      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe(TERM_NO_PARENT);
      await insert({ ...term, parent_id: null });
      // Precondition: the parent exists and an article may sit under it, so only the CHECK refused.
      await insert({ kind: 'article', parent_id: parent });
    });

    it('refuses a row that is its own parent, on insert and on update, and takes it with no parent', async () => {
      const id = crypto.randomUUID();

      const inserted = await failureOf(insert({ id, parent_id: id }));

      expect(inserted.code).toBe('23514');
      expect(inserted.constraint_name).toBe(NOT_OWN_PARENT);
      await insert({ id, parent_id: null });

      const updated = await failureOf(
        sql`update help_articles set parent_id = ${id} where id = ${id}`,
      );
      expect(updated.code).toBe('23514');
      expect(updated.constraint_name).toBe(NOT_OWN_PARENT);
    });

    it('refuses a term for staff or for keepers, and takes the same term for the public', async () => {
      const term: HelpArticleSeed = { kind: 'term', slug: 'testwort' };

      const staff = await failureOf(insert({ ...term, audience: 'staff' }));
      const keeper = await failureOf(insert({ ...term, audience: 'keeper' }));

      expect([staff.code, keeper.code]).toEqual(['23514', '23514']);
      expect([staff.constraint_name, keeper.constraint_name]).toEqual([TERM_PUBLIC, TERM_PUBLIC]);
      await insert({ ...term, audience: 'public' });
      // Precondition: the CHECK is about terms; an article may be for staff or keepers.
      await insert({ kind: 'article', audience: 'staff' });
      await insert({ kind: 'article', audience: 'keeper' });
    });
  });

  describe('the unique indexes', () => {
    it('are partial over the live rows', async () => {
      const slug = await indexRow(TABLE, SLUG_UNIQUE);
      const seedKey = await indexRow(TABLE, SEED_KEY_UNIQUE);

      expect(slug?.unique).toBe(true);
      expect(slug?.predicate).toBe('(deleted_at IS NULL)');
      expect(seedKey?.unique).toBe(true);
      expect(seedKey?.predicate).toBe('((seed_key IS NOT NULL) AND (deleted_at IS NULL))');
    });

    it('key the slug index on the kind and the slug together', async () => {
      const slug = await indexRow(TABLE, SLUG_UNIQUE);

      expect(slug?.definition).toMatch(/\(kind, slug\)/);
    });

    it.each([
      ['an article and a term', 'article', 'term'],
      ['an FAQ entry and an article', 'faq', 'article'],
      ['an FAQ entry and a term', 'faq', 'term'],
    ] as const)('take %s under one live slug', async (_pair, first, second) => {
      await insert({ kind: first, slug: 'testwort' });
      await insert({ kind: second, slug: 'testwort' });

      const [row] =
        await sql`select count(*)::int as count from help_articles where slug = 'testwort' and deleted_at is null`;
      expect(row.count).toBe(2);
    });

    it.each(['faq', 'article', 'term'] as const)(
      'refuse a second live %s under one slug, and take it once the first is deleted',
      async (kind) => {
        const first = await insert({ kind, slug: 'testwort' });

        const second = await failureOf(insert({ kind, slug: 'testwort' }));

        expect(second.code).toBe('23505');
        expect(second.constraint_name).toBe(SLUG_UNIQUE);
        await softDelete(first);
        await insert({ kind, slug: 'testwort' });
      },
    );

    it("free a deleted row's slug for its own kind while a live row of another kind holds it", async () => {
      await insert({ kind: 'term', slug: 'testwort' });
      const article = await insert({ kind: 'article', slug: 'testwort' });
      await softDelete(article);

      await insert({ kind: 'article', slug: 'testwort' });

      const second = await failureOf(insert({ kind: 'term', slug: 'testwort' }));
      expect(second.constraint_name).toBe(SLUG_UNIQUE);
    });

    it('refuse a second live row under one seed key, and take it once the first is deleted', async () => {
      const first = await insert({ seed_key: 'help-testwort' });

      const second = await failureOf(insert({ seed_key: 'help-testwort' }));

      expect(second.code).toBe('23505');
      expect(second.constraint_name).toBe(SEED_KEY_UNIQUE);
      await softDelete(first);
      await insert({ seed_key: 'help-testwort' });
    });
  });

  describe('the updated_at trigger', () => {
    it('stamps updated_at on an update that never names it, and leaves created_at', async () => {
      // Stamped on insert, which the trigger leaves alone, so the update below is what moves it.
      const [{ id }] = await sql`
        insert into help_articles ${sql({
          ...helpArticleRow({}, AUTHOR),
          created_at: THE_MILLENNIUM,
          updated_at: THE_MILLENNIUM,
        } as never)}
        returning id
      `;
      const [before] = await sql`select updated_at from help_articles where id = ${id}`;
      expect(before.updated_at.getUTCFullYear()).toBe(2000);
      const [{ now }] = await sql`select now()::timestamp as now`;

      await sql`update help_articles set title = 'Testwort, Revised' where id = ${id}`;

      const [row] = await sql`select created_at, updated_at from help_articles where id = ${id}`;
      expect(row.created_at.getUTCFullYear()).toBe(2000);
      expect(row.updated_at.getTime()).toBeGreaterThanOrEqual(now.getTime() - 1000);
    });

    it('is the shared set_updated_at trigger', async () => {
      const [trigger] = await sql`
        select t.tgname as name, p.proname as function
        from pg_trigger t join pg_proc p on p.oid = t.tgfoid
        where t.tgrelid = ${TABLE}::regclass and not t.tgisinternal
      `;
      expect(trigger).toEqual({ name: 'set_updated_at', function: 'set_updated_at' });
    });
  });

  describe('the search vector', () => {
    it('is generated from the title, summary and body, weighted A, B and C in English', async () => {
      const id = await insert({
        title: 'Testwort Gathering',
        summary: 'Fixturebloom harvests',
        body: 'Mockroot steeping',
      });

      const [row] = await sql<{ vector: string; expected: string; generated: string }[]>`
        select h.search_vector::text as vector,
               (setweight(to_tsvector('english', 'Testwort Gathering'), 'A')
                || setweight(to_tsvector('english', 'Fixturebloom harvests'), 'B')
                || setweight(to_tsvector('english', 'Mockroot steeping'), 'C'))::text as expected,
               a.attgenerated as generated
        from help_articles h
        join pg_attribute a on a.attrelid = ${TABLE}::regclass and a.attname = 'search_vector'
        where h.id = ${id}
      `;

      expect(row.generated).toBe('s');
      expect(row.vector).toBe(row.expected);
      // Precondition: the words are stemmed by the English configuration, not kept as typed.
      expect(row.vector).toContain("'gather':2A");
      expect(row.vector).toContain("'harvest':4B");
      expect(row.vector).toContain("'steep':6C");
    });

    it('follows an edit, and holds a row with no summary', async () => {
      const id = await insert({ title: 'Testwort', summary: null, body: 'Mockroot' });

      await sql`update help_articles set title = 'Fixturebloom' where id = ${id}`;

      const [row] =
        await sql`select search_vector::text as vector from help_articles where id = ${id}`;
      expect(row.vector).toContain("'fixturebloom':1A");
      expect(row.vector).not.toContain('testwort');
      expect(row.vector).toContain("'mockroot':2C");
    });

    it('refuses a value written by hand', async () => {
      const error = await failureOf(
        sql`insert into help_articles ${sql({ ...helpArticleRow({}, AUTHOR), search_vector: 'testwort' } as never)}`,
      );

      expect(error.code).toBe('428C9');
    });

    it('is indexed with GIN', async () => {
      const index = await indexRow(TABLE, SEARCH_INDEX);

      expect(index?.unique).toBe(false);
      expect(index?.predicate).toBeNull();
      expect(index?.definition).toMatch(/USING gin \(search_vector\)$/);
    });
  });
});
