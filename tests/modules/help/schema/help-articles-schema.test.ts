import { existsSync, globSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getTableName } from 'drizzle-orm';
import { AUDIT_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import { REPO_ROOT, fromRoot } from '../../../support/paths';
import { helpArticleKind, helpArticles, helpAudience } from '@/modules/help/schema/help-articles';

// The Drizzle declaration, read without a database; the migrated table is help-articles-table.test.ts's.

const SCHEMA_FILE = 'src/modules/help/schema/help-articles.ts';
const SLUG_UNIQUE = 'help_articles_slug_unique';
const SEED_KEY_UNIQUE = 'help_articles_seed_key_unique';
const SEARCH_INDEX = 'help_articles_search_vector_idx';

describe('help_articles schema', () => {
  const { byName, byIndexName, checks, nonAuditForeignKeys } = tableFacts(helpArticles);

  it('has its columns, the search vector and the full audit spread, and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual(
      [
        'id',
        'kind',
        'audience',
        'title',
        'slug',
        'summary',
        'search_terms',
        'body',
        'position',
        'seed_key',
        'shown',
        'parent_id',
        'search_vector',
        ...AUDIT_COLUMNS,
      ].sort(),
    );
  });

  it('declares the kind, audience, title, slug and body required, and the rest nullable', () => {
    for (const column of ['kind', 'audience', 'title', 'slug', 'body']) {
      expect(byName[column].notNull, column).toBe(true);
    }
    for (const column of ['summary', 'search_terms', 'position', 'seed_key', 'parent_id']) {
      expect(byName[column].notNull, column).toBe(false);
    }
    expect(byName.audience.default).toBe('public');
  });

  it('declares the kinds and the audiences as enums', () => {
    expect(helpArticleKind.enumName).toBe('help_article_kind');
    expect(helpArticleKind.enumValues).toEqual(['faq', 'article', 'term']);
    expect(helpAudience.enumName).toBe('help_audience');
    expect(helpAudience.enumValues).toEqual(['public', 'staff', 'keeper']);
  });

  it('declares the search vector as a generated column', () => {
    expect(byName.search_vector.getSQLType()).toBe('tsvector');
    expect(byName.search_vector.generated?.type).toBe('always');
  });

  it('declares the slug and seed-key indexes unique and partial, and the search index GIN', () => {
    expect(Object.keys(byIndexName).sort()).toEqual(
      [SEARCH_INDEX, SEED_KEY_UNIQUE, SLUG_UNIQUE].sort(),
    );
    for (const name of [SLUG_UNIQUE, SEED_KEY_UNIQUE]) {
      expect(byIndexName[name].config.unique, name).toBe(true);
      expect(byIndexName[name].config.where, name).toBeDefined();
    }
    expect(byIndexName[SEARCH_INDEX].config.method).toBe('gin');
    expect(byIndexName[SEARCH_INDEX].config.unique).toBe(false);
  });

  it('declares the slug index over the kind and the slug, so a slug is unique within its kind', () => {
    const columns = byIndexName[SLUG_UNIQUE].config.columns.map((column) =>
      'name' in column ? column.name : undefined,
    );

    expect(columns).toEqual(['kind', 'slug']);
  });

  it('declares its four CHECK constraints', () => {
    expect(checks.map((check) => check.name).sort()).toEqual(
      [
        'help_articles_not_own_parent',
        'help_articles_term_no_parent',
        'help_articles_term_no_position',
        'help_articles_term_public',
      ].sort(),
    );
  });

  it('references itself through the parent, and nothing else but its audit stamps', () => {
    expect(
      nonAuditForeignKeys.map((fk) => [
        fk.column,
        getTableName(fk.foreignTable),
        fk.foreignColumnNames,
      ]),
    ).toEqual([['parent_id', 'help_articles', ['id']]]);
  });
});

describe('where help_articles is declared', () => {
  const sources = globSync('src/**/*.ts', { cwd: REPO_ROOT }).filter(
    (file) => !file.startsWith('src/db/migrations/'),
  );
  const declaring = (pattern: RegExp) =>
    sources.filter((file) => pattern.test(readFileSync(fromRoot(file), 'utf8'))).sort();

  it('is in the help module alone, with its two enums', () => {
    // Precondition: the scan reads the schema files, so an empty result is not a scan of nothing.
    expect(declaring(/pgTable\(\s*'documents'/)).toEqual([
      'src/modules/documents/schema/documents.ts',
    ]);

    expect(declaring(/pgTable\(\s*'help_articles'/)).toEqual([SCHEMA_FILE]);
    expect(declaring(/pgEnum\(\s*'help_article_kind'/)).toEqual([SCHEMA_FILE]);
    expect(declaring(/pgEnum\(\s*'help_audience'/)).toEqual([SCHEMA_FILE]);
  });

  it('sits in a module with its own index', () => {
    expect(existsSync(fromRoot('src/modules/help/index.ts'))).toBe(true);
  });
});
