import { beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { AUDIT_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import { referenceKind, references } from '@/modules/ingredients/schema/references';
import { workspaces } from '@/modules/coven/schema/workspaces';
import { FIXTURE_USERS, WORKSPACE_W_ID } from '@/db/seed/standard';
import type { ReferenceFields } from './types';

// DESIGN.md §5's `references` (MB.151): one source per row, in Chicago
// bibliography form, two-tiered as ingredients are. The table task, MB.152:
// nothing reads or writes it until MB.153.
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
const CHECKS = [
  ...NOT_BLANK.map(notBlankCheck),
  CHECK_URL_ABSOLUTE,
  CHECK_ACCESSED_NEEDS_URL,
  CHECK_KIND_NEEDS_CONTAINER,
  CHECK_WEB_PAGE_LOCATED,
].sort();

const WORKSPACE_FK = 'references_workspace_id_workspaces_id_fk';

describe('references schema', () => {
  const { byName, indexes, checks, primaryKeys, foreignKeyByColumn, nonAuditForeignKeys } =
    tableFacts(references);

  // The full six: a reference is content, edited in place and kept for v2's history.
  it('has DESIGN.md §5 columns and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual([...OWN_COLUMNS, ...AUDIT_COLUMNS].sort());
  });

  it('keys on a surrogate id', () => {
    expect(byName.id.primary).toBe(true);
    expect(byName.id.hasDefault).toBe(true);
    expect(primaryKeys).toEqual([]);
  });

  it('requires the kind and the title, and nothing else of its own', () => {
    expect(byName.kind.notNull).toBe(true);
    expect(byName.title.notNull).toBe(true);
    for (const column of ['workspace_id', ...OPTIONAL_TEXT, ...DATES]) {
      expect(byName[column].notNull, column).toBe(false);
    }
  });

  // As printed, never structured: a name order or a season is not mechanical.
  it('holds the title and every optional field as text, and the two days as dates', () => {
    for (const column of ['title', ...OPTIONAL_TEXT]) {
      expect(byName[column].getSQLType(), column).toBe('text');
    }
    for (const column of DATES) {
      expect(byName[column].getSQLType(), column).toBe('date');
    }
  });

  it('declares reference_kind as the five kinds MB.151 settled', () => {
    expect(referenceKind.enumName).toBe('reference_kind');
    expect(referenceKind.enumValues).toEqual(KINDS);
  });

  // `workspace_id IS NULL` is the compendium tier, as on `ingredients`.
  it('points the tier at workspaces and nothing else', () => {
    expect(foreignKeyByColumn.workspace_id.foreignTable).toBe(workspaces);
    expect(nonAuditForeignKeys.map((fk) => fk.column)).toEqual(['workspace_id']);
  });

  // Two rows may be the same book: nothing short of a librarian identifies a
  // source. The one index is the seed's key for its own rows (MB.171).
  it('declares no index but the seed key’s', () => {
    expect(indexes.map((index) => index.config.name)).toEqual(['references_seed_key_unique']);
  });

  it('declares a blank CHECK per text column beside the four that make the renderer total', () => {
    expect(checks.map((check) => check.name).sort()).toEqual(CHECKS);
  });
});

const AUTHOR = FIXTURE_USERS.A.id;
const ABSENT = '99999999-9999-9999-9999-999999999999';

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
const catalogue = useTestDatabase((client) => (sql = client));

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
  describe('catalogue introspection', () => {
    it('carries the six audit columns beside its own', async () => {
      expect(await catalogue.columnNames('references')).toEqual(
        [...OWN_COLUMNS, ...AUDIT_COLUMNS].sort(),
      );
    });

    it('stores the kind as reference_kind, in MB.151’s order', async () => {
      const rows = await sql`
        select e.enumlabel from pg_enum e
        join pg_type t on t.oid = e.enumtypid
        where t.typname = 'reference_kind'
        order by e.enumsortorder
      `;

      expect(rows.map((row) => row.enumlabel)).toEqual(KINDS);
    });

    it('carries no index beyond the primary key and the seed key', async () => {
      const rows = await sql`
        select c.relname from pg_index i join pg_class c on c.oid = i.indexrelid
        where i.indrelid = '"references"'::regclass
      `;

      expect(rows.map((row) => row.relname).sort()).toEqual([
        'references_pkey',
        'references_seed_key_unique',
      ]);
    });

    it('declares exactly the CHECKs the schema does', async () => {
      const rows = await sql`
        select conname from pg_constraint
        where conrelid = '"references"'::regclass and contype = 'c'
        order by conname
      `;

      expect(rows.map((row) => row.conname)).toEqual(CHECKS);
    });
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

    it('refuses a missing title', async () => {
      const error = await failureOf(addReference({ kind: 'book' }));

      // 23502 is not_null_violation.
      expect(error.code).toBe('23502');
      expect(error.column_name).toBe('title');
    });

    it('refuses a kind outside the five', async () => {
      const error = await failureOf(addReference({ ...BOOK, kind: 'other' }));

      // 22P02 is invalid_text_representation: the enum cast refusing the value.
      expect(error.code).toBe('22P02');
    });

    it('refuses a workspace id no workspace holds', async () => {
      const error = await failureOf(addReference({ ...BOOK, workspace_id: ABSENT }));

      // 23503 is foreign_key_violation.
      expect(error.code).toBe('23503');
      expect(error.constraint_name).toBe(WORKSPACE_FK);
    });
  });

  // 23514 is check_violation, named: each refusal is the CHECK MB.153's field
  // error is pathed from, where NOT NULL alone would accept ''.
  describe('text is non-blank when set', () => {
    it.each(NOT_BLANK)('refuses a blank %s', async (column) => {
      const error = await failureOf(addReference({ ...MINIMAL.chapter, [column]: '   ' }));

      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe(notBlankCheck(column));
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
    it('takes an http or https url', async () => {
      await addReference({ ...BOOK, url: 'http://example.org/a' });
      await addReference({ ...BOOK, url: 'https://example.org/Greek_Mythology/' });
    });

    it.each(['ftp://example.org/a', 'www.example.org', 'javascript:alert(1)'])(
      'refuses %s as not an absolute http(s) url',
      async (url) => {
        const error = await failureOf(addReference({ ...BOOK, url }));

        expect(error.code).toBe('23514');
        expect(error.constraint_name).toBe(CHECK_URL_ABSOLUTE);
      },
    );

    it('refuses an accessed date without a url', async () => {
      const error = await failureOf(addReference({ ...BOOK, accessed: '2026-10-06' }));

      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe(CHECK_ACCESSED_NEEDS_URL);
    });

    it.each(['chapter', 'article', 'entry'])('refuses a %s without a container', async (kind) => {
      const error = await failureOf(addReference({ ...MINIMAL[kind], container: null }));

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
