import { beforeEach, describe, expect, it, vi } from 'vitest';
import { findCompendiumPage } from '@/db/repository';

// The statements a compendium search sends, read off the connection: `<%`
// means "word-similar by pg_trgm.word_similarity_threshold", whose default is
// 0.6, so the search's 0.5 has to be set in the read's own transaction — and
// only when there is a term to match (claude-docs/db.md, "The compendium read").

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

beforeEach(() => {
  logged.length = 0;
});

const PAGE = { limit: 26, inverted: false };
const isSetting = ({ query }: Logged) =>
  query.includes(`set_config('pg_trgm.word_similarity_threshold'`);
const isRead = ({ query }: Logged) => /from "ingredients"/.test(query) && query.includes('<%');

describe('the compendium search query', () => {
  it('sets the word threshold to 0.5, transaction-local, before matching', async () => {
    await findCompendiumPage({ search: 'mugwort' }, PAGE);

    const setting = logged.findIndex(isSetting);
    expect(setting).toBeGreaterThanOrEqual(0);
    expect(logged[setting].query).toMatch(/, true\)/);
    expect(logged[setting].params).toEqual(['0.5']);
    expect(logged.findIndex(isRead)).toBeGreaterThan(setting);
  });

  it('opens no transaction for a page with no term', async () => {
    await findCompendiumPage({}, PAGE);

    expect(logged.some(isSetting)).toBe(false);
    expect(logged.some(({ query }) => /^begin/i.test(query))).toBe(false);
  });
});
