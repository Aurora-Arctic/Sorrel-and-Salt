import { beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { AUDIT_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import { referenceKind, references } from '@/modules/ingredients/schema/references';
import { FIXTURE_USERS, WORKSPACE_W_ID } from '@/db/seed/standard';
import type { ReferenceFields } from './types';

// DESIGN.md §5's `references` (MB.151): one source per row, in Chicago
// bibliography form, two-tiered as ingredients are.
const KINDS = ['book', 'chapter', 'article', 'entry', 'web_page'];

// Text as Chicago prints it, nullable, and non-blank when set.
const OPTIONAL_TEXT = [
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
  'url',
  'note',
];
const DATES = ['modified', 'accessed'];
// `seed_key` is the reference seed's own (MB.171), outside the blank CHECKs.
const OWN_COLUMNS = ['id', 'workspace_id', 'kind', 'title', ...OPTIONAL_TEXT, ...DATES, 'seed_key'];

// `url` has no blank CHECK of its own: the http(s) CHECK already refuses one.
const NOT_BLANK = ['title', ...OPTIONAL_TEXT.filter((column) => column !== 'url')];
const notBlankCheck = (column: string) => `references_${column}_not_blank`;

const CHECK_URL_ABSOLUTE = 'references_url_absolute';
const CHECK_ACCESSED_NEEDS_URL = 'references_accessed_needs_url';
const CHECK_KIND_NEEDS_CONTAINER = 'references_kind_needs_container';
const CHECK_WEB_PAGE_LOCATED = 'references_web_page_located';

describe('references schema', () => {
  const { byName } = tableFacts(references);

  // The full six: a reference is content, edited in place and kept for v2's history.
  it('has DESIGN.md §5 columns and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual([...OWN_COLUMNS, ...AUDIT_COLUMNS].sort());
  });
});

const AUTHOR = FIXTURE_USERS.A.id;

// The least each kind needs, so a test varies one field against a row that
// is otherwise accepted.
const BOOK: ReferenceFields = { kind: 'book', title: 'A Herbal of Fixture Covens' };
const MINIMAL: Record<string, ReferenceFields> = {
  book: BOOK,
  chapter: { kind: 'chapter', title: 'On Testwort', container: 'The Fixture Reader' },
  article: {
    kind: 'article',
    title: 'A Note on Testwort',
    container: 'Journal of Invented Botany',
  },
  entry: { kind: 'entry', title: 'Testwort', container: 'Encyclopaedia Fixturalis' },
  web_page: {
    kind: 'web_page',
    title: 'Testwort',
    url: 'https://example.org/testwort',
    accessed: '2026-10-06',
  },
};

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

async function addReference(fields: ReferenceFields): Promise<string> {
  const [inserted] = await sql`
    insert into "references" ${sql({ ...fields, created_by: AUTHOR, updated_by: AUTHOR })}
    returning id
  `;
  return inserted.id as string;
}

beforeEach(async () => {
  await sql`truncate "references" cascade`;
});

describe('references table', () => {
  // A closed list is the database's and the code's alike.
  it('holds the five kinds MB.151 settled, as the code declares them', async () => {
    const [row] = await sql`select enum_range(null::reference_kind)::text[] as kinds`;

    expect(row.kinds).toEqual(referenceKind.enumValues);
    expect(row.kinds).toEqual(KINDS);
  });

  describe('a row of each kind', () => {
    it('takes the least each kind needs, in either tier', async () => {
      for (const kind of KINDS) {
        await addReference(MINIMAL[kind]);
        await addReference({ ...MINIMAL[kind], workspace_id: WORKSPACE_W_ID });
      }

      const [{ count }] = await sql`select count(*)::int as count from "references"`;
      expect(count).toBe(KINDS.length * 2);
    });

    it('takes every field filled', async () => {
      await addReference({
        kind: 'book',
        authors: 'Testwort, Fixtura, ed.',
        title: 'A Herbal of Fixture Covens',
        container: 'Collected Fixtures',
        contributors: 'Translated by Mock Fixture',
        edition: '2nd ed.',
        volume: '2 vols.',
        issue: '4',
        series: 'Handbooks of Invented Botany',
        place: 'Testford',
        publisher: 'Fixture Press',
        published: 'Summer/Autumn 1988',
        pages: '399–412',
        host: 'Invented Digital Library',
        url: 'http://example.org/herbal',
        modified: '2024-12-28',
        accessed: '2026-10-06',
        note: 'Each entry names the herb’s _Fixtura_.',
      });
    });

    // Two rows may be the same book; the seed is idempotent by citation instead.
    it('takes the same source twice', async () => {
      const first = await addReference(BOOK);
      const second = await addReference(BOOK);

      expect(second).not.toBe(first);
    });

    it('refuses a kind outside the five', async () => {
      const error = await failureOf(addReference({ ...BOOK, kind: 'other' }));

      // 22P02 is invalid_text_representation: the enum cast refusing the value.
      expect(error.code).toBe('22P02');
    });
  });

  // 23514 is check_violation, named: each refusal is the CHECK MB.153's field
  // error is pathed from, where NOT NULL alone would accept ''.
  describe('text is non-blank when set', () => {
    it('refuses a blank title', async () => {
      const error = await failureOf(addReference({ ...MINIMAL.chapter, title: '   ' }));

      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe(notBlankCheck('title'));
    });

    // The refusal above, for every other text column: each CHECK reads its
    // own column, so a copied CHECK naming the wrong one fails here.
    it('carries a blank CHECK on each text column, over that column', async () => {
      const rows = await sql`
        select conname, pg_get_constraintdef(oid) as definition from pg_constraint
        where conrelid = '"references"'::regclass and contype = 'c'
          and conname like '%_not_blank'
      `;
      const definitionOf = Object.fromEntries(rows.map((row) => [row.conname, row.definition]));

      for (const column of NOT_BLANK) {
        expect(definitionOf[notBlankCheck(column)], column).toContain(`btrim(${column})`);
      }
      expect(rows).toHaveLength(NOT_BLANK.length);
    });

    it('refuses a blank url as not absolute', async () => {
      const error = await failureOf(addReference({ ...BOOK, url: '  ' }));

      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe(CHECK_URL_ABSOLUTE);
    });
  });

  // The CHECKs that make MB.153's renderer total: every row admitted renders
  // without a branch for a missing required field.
  describe('the renderer is total over every row', () => {
    // An http(s) url is taken above, by every web page and the filled row.
    it('refuses a url that is not absolute http(s)', async () => {
      for (const url of ['ftp://example.org/a', 'www.example.org', 'javascript:alert(1)']) {
        const error = await failureOf(addReference({ ...BOOK, url }));

        expect(error.code, url).toBe('23514');
        expect(error.constraint_name).toBe(CHECK_URL_ABSOLUTE);
      }
    });

    it('refuses an accessed date without a url', async () => {
      const error = await failureOf(addReference({ ...BOOK, accessed: '2026-10-06' }));

      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe(CHECK_ACCESSED_NEEDS_URL);
    });

    it('refuses a chapter without a container', async () => {
      const error = await failureOf(addReference({ ...MINIMAL.chapter, container: null }));

      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe(CHECK_KIND_NEEDS_CONTAINER);
    });

    // Why the refusal above is the kind's: a book and a web page need none.
    it('takes a book or a web page without a container', async () => {
      await addReference({ ...MINIMAL.book, container: null });
      await addReference({ ...MINIMAL.web_page, container: null });
    });

    it('refuses a web page without a url or an accessed date', async () => {
      for (const missing of [{ url: null, accessed: null }, { accessed: null }]) {
        const error = await failureOf(addReference({ ...MINIMAL.web_page, ...missing }));

        expect(error.code).toBe('23514');
        expect(error.constraint_name).toBe(CHECK_WEB_PAGE_LOCATED);
      }
    });
  });
});
