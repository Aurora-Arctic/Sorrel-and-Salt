import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { suggestDeities, suggestForms, suggestPlanets } from '@/modules/vocabulary';
import { B, asUser } from '../../../support/as-user';
import type { Logged } from '../../../support/db/types';

// The statements suggestPlanets actually sends, as duplicates-plan.test.ts
// reads findPossibleDuplicates': the thresholds and the operators are only
// visible in the SQL, since a `similarity() > n` written by mistake returns
// the same rows. Unlike that test there is no EXPLAIN here: nineteen planets,
// thirteen signs and seventy-eight forms fit a few pages, and the planner will
// never reach for a trigram index over a table that small, so an index-scan
// assertion could only fail (claude-docs/db/astrology-vocabularies.md, "The
// astrology vocabularies").

const logged = vi.hoisted(() => [] as Logged[]);

vi.mock('@/db/connection', async () => {
  const { drizzle } = await import('drizzle-orm/postgres-js');
  const { default: connect } = await import('postgres');
  return {
    db: drizzle(connect(process.env.DATABASE_URL as string), {
      logger: { logQuery: (query, params) => logged.push({ query, params }) },
    }),
  };
});

let sql: ReturnType<typeof postgres>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string);
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  logged.length = 0;
});

/** Every statement the service sent, in order, from one call. */
async function statementsFor(query: string): Promise<Logged[]> {
  await suggestPlanets(asUser(B), WORKSPACE_W_ID, query, { limit: 26, inverted: false });
  return [...logged];
}

/** The one statement reading the vocabulary, which is the match itself. */
function match(statements: Logged[]): Logged {
  const reads = statements.filter(({ query }) => /from "planets"/.test(query));
  expect(reads).toHaveLength(1);
  return reads[0];
}

describe('the suggestion query', () => {
  describe('the thresholds are set explicitly, per transaction', () => {
    it('sets similarity to 0.4 and word similarity to 0.6 before matching, inside a transaction', async () => {
      const statements = await statementsFor('moon');
      const setting = statements.findIndex(({ query }) =>
        query.includes(`set_config('pg_trgm.similarity_threshold'`),
      );

      expect(setting).toBeGreaterThanOrEqual(0);
      expect(statements[setting].query).toContain(`set_config('pg_trgm.word_similarity_threshold'`);
      expect(statements[setting].query).toMatch(/, true\)/);
      expect(statements[setting].params).toEqual(['0.4', '0.6']);
      expect(statements.indexOf(match(statements))).toBeGreaterThan(setting);
    });

    it('matches a name with % and <%, a description with <% alone, never a similarity() comparison', async () => {
      const { query } = match(await statementsFor('moon'));

      expect(query).toMatch(/"planets"\."name" % \$\d+/);
      expect(query).toMatch(/\$\d+ <% "planets"\."name"/);
      expect(query).toMatch(/\$\d+ <% "planets"\."description"/);
      expect(query).not.toMatch(/"planets"\."description" %/);
      expect(query).not.toMatch(/similarity\([^)]*\)\s*[<>]=?/);
    });

    it('matches an in-use value the way it matches a name', async () => {
      const { query } = match(await statementsFor('moon'));

      expect(query).toMatch(/"entry"\."value" % \$\d+/);
      expect(query).toMatch(/\$\d+ <% "entry"\."value"/);
    });

    // A list's entries are the in-use values, not the list (MB.136).
    it('reads each entry of the planets list, unnested', async () => {
      const { query } = match(await statementsFor('moon'));

      expect(query).toMatch(
        /from "ingredients" cross join lateral unnest\("ingredients"\."planets"\) as "entry"\("value"\)/,
      );
      expect(query).not.toMatch(/"ingredients"\."planet"/);
    });
  });

  // The two scopes, in the statement itself and not in a filter after it
  // (CLAUDE.md rule 7).
  describe('what the statement excludes', () => {
    it('reads the compendium tier and the proof’s workspace, live rows only', async () => {
      const { query, params } = match(await statementsFor('moon'));

      expect(query).toMatch(
        /"ingredients"\."workspace_id" is null or "ingredients"\."workspace_id" = \$\d+/,
      );
      expect(params).toContain(WORKSPACE_W_ID);
      expect(query).toMatch(/"planets"\."deleted_at" is null/);
      expect(query).toMatch(/"ingredients"\."deleted_at" is null/);
    });

    it('folds an in-use value before comparing it with the curated names', async () => {
      const { query } = match(await statementsFor('moon'));

      expect(query).toMatch(
        /lower\(btrim\("entry"\."value"\)\) not in \(select lower\("planets"\."name"\)/,
      );
      expect(query).toMatch(/group by lower\(btrim\("entry"\."value"\)\)/);
    });
  });

  it('matches nothing by similarity when there is no `query`, and still sets the thresholds', async () => {
    const statements = await statementsFor('  ');
    const { query } = match(statements);

    expect(query).not.toMatch(/ % \$\d+| <% /);
    expect(statements.some(({ query }) => query.includes('pg_trgm.similarity_threshold'))).toBe(
      true,
    );
  });
});

describe('the form suggestion query', () => {
  async function formStatement(query: string): Promise<Logged> {
    await suggestForms(asUser(B), WORKSPACE_W_ID, query, { limit: 26, inverted: false });
    const reads = logged.filter(({ query }) => /from "ingredient_forms"/.test(query));
    expect(reads).toHaveLength(1);
    return reads[0];
  }

  it('sets both thresholds before matching', async () => {
    const statement = await formStatement('salve');
    const setting = logged.findIndex(({ query }) =>
      query.includes(`set_config('pg_trgm.similarity_threshold'`),
    );

    expect(setting).toBeGreaterThanOrEqual(0);
    expect(logged[setting].params).toEqual(['0.4', '0.6']);
    expect(logged.indexOf(statement)).toBeGreaterThan(setting);
  });

  it('matches a name with % and <%, a description with <% alone, never a similarity() comparison', async () => {
    const { query } = await formStatement('salve');

    expect(query).toMatch(/"ingredient_forms"\."name" % \$\d+/);
    expect(query).toMatch(/\$\d+ <% "ingredient_forms"\."name"/);
    expect(query).toMatch(/\$\d+ <% "ingredient_forms"\."description"/);
    expect(query).not.toMatch(/"ingredient_forms"\."description" %/);
    expect(query).toMatch(/"ingredients"\."form" % \$\d+/);
    expect(query).not.toMatch(/similarity\([^)]*\)\s*[<>]=?/);
  });

  // The claimants are a second read of `ingredients`, and scoped as the first.
  it('scopes both reads of ingredients, and reads a form as curated only while its group is live', async () => {
    const { query } = await formStatement('salve');
    const scope = /"ingredients"\."workspace_id" is null or "ingredients"\."workspace_id" = \$\d+/g;

    expect(query.match(scope)).toHaveLength(2);
    expect(query.match(/"ingredients"\."deleted_at" is null/g)).toHaveLength(2);
    expect(query).toMatch(/"ingredient_forms"\."deleted_at" is null/);
    expect(query).toMatch(/"ingredient_form_groups"\."deleted_at" is null/);
  });
});

// 216 deities is still a sequential scan for every query measured, so the
// shape is asserted here rather than a probe of `deities_trgm`.
describe('the deity suggestion query', () => {
  async function deityStatement(query: string): Promise<Logged> {
    await suggestDeities(asUser(B), WORKSPACE_W_ID, query, { limit: 26, inverted: false });
    const reads = logged.filter(({ query }) => /from "deities"/.test(query));
    expect(reads).toHaveLength(1);
    return reads[0];
  }

  it('sets both thresholds before matching', async () => {
    const statement = await deityStatement('hekate');
    const setting = logged.findIndex(({ query }) =>
      query.includes(`set_config('pg_trgm.similarity_threshold'`),
    );

    expect(setting).toBeGreaterThanOrEqual(0);
    expect(logged[setting].params).toEqual(['0.4', '0.6']);
    expect(logged.indexOf(statement)).toBeGreaterThan(setting);
  });

  it('matches a name with % and <%, a description with <% alone, never a similarity() comparison', async () => {
    const { query } = await deityStatement('hekate');

    expect(query).toMatch(/"deities"\."name" % \$\d+/);
    expect(query).toMatch(/\$\d+ <% "deities"\."name"/);
    expect(query).toMatch(/\$\d+ <% "deities"\."description"/);
    expect(query).not.toMatch(/"deities"\."description" %/);
    expect(query).toMatch(/"entry"\."value" % \$\d+/);
    expect(query).not.toMatch(/similarity\([^)]*\)\s*[<>]=?/);
  });

  it('reads each entry of the deities list, unnested, scoped and live', async () => {
    const { query, params } = await deityStatement('hekate');

    expect(query).toMatch(
      /from "ingredients" cross join lateral unnest\("ingredients"\."deities"\) as "entry"\("value"\)/,
    );
    expect(query).toMatch(
      /"ingredients"\."workspace_id" is null or "ingredients"\."workspace_id" = \$\d+/,
    );
    expect(params).toContain(WORKSPACE_W_ID);
    expect(query).toMatch(/"ingredients"\."deleted_at" is null/);
  });

  // A deity is curated only while its tradition is live (MB.127).
  it('reads a deity as curated only while its tradition is live too', async () => {
    const { query } = await deityStatement('hekate');

    expect(query).toMatch(/"deities"\."deleted_at" is null/);
    expect(query).toMatch(/"deity_traditions"\."deleted_at" is null/);
    expect(query).toMatch(
      /lower\(btrim\("entry"\."value"\)\) not in \(select lower\("deities"\."name"\)/,
    );
  });
});
