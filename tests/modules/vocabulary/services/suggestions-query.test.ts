import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { suggestPlanets } from '@/modules/vocabulary';
import { B, asUser } from '../../../support/as-user';

// The statements suggestPlanets actually sends, as duplicates-plan.test.ts
// reads findPossibleDuplicates': the thresholds and the operators are only
// visible in the SQL, since a `similarity() > n` written by mistake returns
// the same rows. Unlike that test there is no EXPLAIN here: nineteen planets
// and thirteen signs fit two pages, and the planner will never reach for
// `planets_trgm` over a table that small, so an index-scan assertion could
// only fail (claude-docs/db.md, "The astrology vocabularies").

interface Logged {
  query: string;
  params: unknown[];
}

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
async function statementsFor(term: string): Promise<Logged[]> {
  await suggestPlanets(asUser(B), WORKSPACE_W_ID, term, { limit: 26, inverted: false });
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

      expect(query).toMatch(/"ingredients"\."planet" % \$\d+/);
      expect(query).toMatch(/\$\d+ <% "ingredients"\."planet"/);
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
        /lower\(btrim\("ingredients"\."planet"\)\) not in \(select lower\("planets"\."name"\)/,
      );
      expect(query).toMatch(/group by lower\(btrim\("ingredients"\."planet"\)\)/);
    });
  });

  it('matches nothing by similarity when there is no term, and still sets the thresholds', async () => {
    const statements = await statementsFor('  ');
    const { query } = match(statements);

    expect(query).not.toMatch(/ % \$\d+| <% /);
    expect(statements.some(({ query }) => query.includes('pg_trgm.similarity_threshold'))).toBe(
      true,
    );
  });
});
