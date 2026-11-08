import { beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { buildLoaders, createLoaders } from '@/graphql/loaders';
import type { Session } from '@/lib/session';
import { helpChildrenByParent } from '@/modules/help';
import { B, E, F, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertHelpArticle } from '../../../support/db/insert-help-article';

// The query count, observed at the repository: the children finder is wrapped so the test counts calls without changing what it answers.
const repository = vi.hoisted(() => ({ findHelpArticleChildren: vi.fn() }));
vi.mock('@/db/repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/db/repository')>();
  for (const [name, spy] of Object.entries(repository)) {
    spy.mockImplementation(actual[name as keyof typeof repository]);
  }
  return { ...actual, ...repository };
});

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

/** Each parent's children by audience, titled after the parent, so a slot answered with a neighbour's children shows. */
let parents: string[];

beforeEach(async () => {
  await sql`truncate help_articles cascade`;
  repository.findHelpArticleChildren.mockClear();
  parents = [];
  for (const n of ['one', 'two', 'three']) {
    const parentId = await insertHelpArticle(
      sql,
      { title: `Testwort Parent ${n}`, slug: `testwort-parent-${n}` },
      E.id,
    );
    parents.push(parentId);
    await insertHelpArticle(
      sql,
      { title: `Testwort ${n} Public B`, parent_id: parentId, position: 2 },
      E.id,
    );
    await insertHelpArticle(
      sql,
      { title: `Testwort ${n} Public A`, parent_id: parentId, position: 1 },
      E.id,
    );
    await insertHelpArticle(
      sql,
      { title: `Testwort ${n} Staff`, parent_id: parentId, audience: 'staff', position: 3 },
      E.id,
    );
    await insertHelpArticle(
      sql,
      { title: `Testwort ${n} Keeper`, parent_id: parentId, audience: 'keeper', position: 4 },
      E.id,
    );
    await insertHelpArticle(
      sql,
      { title: `Testwort ${n} Gone`, parent_id: parentId, position: 0, deleted_at: new Date() },
      E.id,
    );
  }
});

const loadAll = async (session: Session | null) => {
  const loader = buildLoaders({ helpChildrenByParent }, session).helpChildrenByParent;
  const answers = await Promise.all(parents.map((id) => loader.load(id)));
  return answers.map((children) => children.map((child) => child.title));
};

describe('helpChildrenByParent', () => {
  it('is one of the request’s loaders', () => {
    expect(createLoaders(null)).toHaveProperty('helpChildrenByParent');
  });

  it('answers three parents’ children in one query, each parent its own, in position order', async () => {
    const titles = await loadAll(null);

    expect(repository.findHelpArticleChildren).toHaveBeenCalledTimes(1);
    expect(titles).toEqual(
      ['one', 'two', 'three'].map((n) => [`Testwort ${n} Public A`, `Testwort ${n} Public B`]),
    );
  });

  it.each([
    ['a signed-out request', null, ['Public A', 'Public B']],
    ['a practitioner', asUser(B), ['Public A', 'Public B']],
    ['a curator', asUser(F), ['Public A', 'Public B', 'Staff']],
    ['a keeper', asUser(E), ['Public A', 'Public B', 'Staff', 'Keeper']],
  ])(
    'answers %s the children its audience admits, never a deleted one',
    async (_who, session, expected) => {
      const titles = await loadAll(session);

      expect(titles).toEqual(
        ['one', 'two', 'three'].map((n) => expected.map((suffix) => `Testwort ${n} ${suffix}`)),
      );
    },
  );

  // What a module-level loader would get wrong: its cache outlives the request, so a keeper's answer reaches the next reader.
  it('never serves one request’s answer to another', async () => {
    await loadAll(asUser(E));
    const signedOut = await loadAll(null);

    expect(repository.findHelpArticleChildren).toHaveBeenCalledTimes(2);
    expect(signedOut.flat().some((title) => title.endsWith('Keeper'))).toBe(false);
  });
});

describe('helpChildrenByParent and hidden rows', () => {
  it('answers no hidden child, to a keeper either, and no child of a hidden parent', async () => {
    await insertHelpArticle(
      sql,
      { title: 'Testwort one Hidden', parent_id: parents[0], position: 5, shown: false },
      E.id,
    );
    await sql`update help_articles set shown = false where id = ${parents[1]}`;

    const titles = await loadAll(asUser(E));

    expect(titles[0]).not.toContain('Testwort one Hidden');
    expect(titles[1]).toEqual([]);
    // Precondition: the shown parent's shown children are answered as before.
    expect(titles[2]).toEqual([
      'Testwort three Public A',
      'Testwort three Public B',
      'Testwort three Staff',
      'Testwort three Keeper',
    ]);
  });
});
