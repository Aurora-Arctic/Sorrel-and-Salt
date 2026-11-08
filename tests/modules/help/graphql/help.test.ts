import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { assertCurator } from '@/modules/identity';
import { B, C, E, F, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertHelpArticle } from '../../../support/db/insert-help-article';
import { run } from '../../../support/graphql/run';

// Transport half: each field reaches the wire, and one refusal per error code. Which rows each reader is answered is
// services/help-reads.test.ts's and help-search.test.ts's; the null-session and non-keeper sweeps are tests/db/graphql-query-scopes.test.ts's.

const FIELDS = 'id kind audience title slug summary body position parentId';

const FAQ = /* GraphQL */ `
  query ($first: Int, $after: String) {
    helpFaq(first: $first, after: $after) {
      edges { node { ${FIELDS} } }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

const INDEX = /* GraphQL */ `
  query ($first: Int, $after: String) {
    helpArticles(first: $first, after: $after) {
      edges {
        node {
          slug
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const ARTICLE = /* GraphQL */ `
  query ($slug: String!) {
    helpArticle(slug: $slug) { ${FIELDS} children { slug audience parentId } }
  }
`;

const GLOSSARY = /* GraphQL */ `
  query ($first: Int, $after: String) {
    helpGlossary(first: $first, after: $after) {
      edges {
        node {
          title
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const SEARCH = /* GraphQL */ `
  query ($query: String!, $first: Int, $after: String) {
    helpSearch(query: $query, first: $first, after: $after) {
      edges {
        node {
          slug
          kind
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const STAFF_ARTICLE = /* GraphQL */ `
  query ($slug: String!) {
    staffHelpArticle(slug: $slug) {
      slug
      audience
      children {
        slug
        audience
      }
    }
  }
`;

const STAFF_LIST = /* GraphQL */ `
  query ($first: Int, $after: String) {
    staffHelpArticles(first: $first, after: $after) {
      edges {
        node {
          slug
          audience
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const CREATE = /* GraphQL */ `
  mutation ($input: HelpArticleInput!) {
    createHelpArticle(input: $input) { ${FIELDS} }
  }
`;

const UPDATE = /* GraphQL */ `
  mutation ($id: ID!, $input: HelpArticlePatch!) {
    updateHelpArticle(id: $id, input: $input) { ${FIELDS} }
  }
`;

const DELETE = /* GraphQL */ `
  mutation ($id: ID!) {
    deleteHelpArticle(id: $id)
  }
`;

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

const codeOf = (result: Awaited<ReturnType<typeof run>>) =>
  (result.errors?.[0]?.extensions as { code?: string } | undefined)?.code;

let parentId: string;
let staffId: string;

beforeEach(async () => {
  await sql`truncate help_articles cascade`;
  await insertHelpArticle(
    sql,
    {
      kind: 'faq',
      title: 'Testwort Second Question',
      slug: 'testwort-second-question',
      position: 2,
    },
    E.id,
  );
  await insertHelpArticle(
    sql,
    {
      kind: 'faq',
      title: 'Testwort First Question',
      slug: 'testwort-first-question',
      summary: 'A fixture summary.',
      body: 'The first fixture answer.',
      position: 1,
    },
    E.id,
  );
  parentId = await insertHelpArticle(
    sql,
    { title: 'Testwort Guide', slug: 'testwort-guide', position: 1 },
    E.id,
  );
  await insertHelpArticle(
    sql,
    { title: 'Testwort Guide Public Page', slug: 'testwort-guide-public', parent_id: parentId },
    E.id,
  );
  await insertHelpArticle(
    sql,
    {
      title: 'Testwort Guide Staff Page',
      slug: 'testwort-guide-staff',
      audience: 'staff',
      parent_id: parentId,
    },
    E.id,
  );
  staffId = await insertHelpArticle(
    sql,
    { title: 'Testwort Queue Notes', slug: 'testwort-queue-notes', audience: 'staff' },
    E.id,
  );
  await insertHelpArticle(
    sql,
    { title: 'Testwort Grant Notes', slug: 'testwort-grant-notes', audience: 'keeper' },
    E.id,
  );
  await insertHelpArticle(
    sql,
    { kind: 'term', title: 'Testwort Mallow', slug: 'testwort-mallow' },
    E.id,
  );
  await insertHelpArticle(
    sql,
    { kind: 'term', title: 'Testwort Amber', slug: 'testwort-amber' },
    E.id,
  );
});

describe('the public help reads', () => {
  it('pages the FAQ signed out, in position order, with every field', async () => {
    const first = await run<{
      helpFaq: {
        edges: { node: Record<string, unknown> }[];
        pageInfo: { hasNextPage: boolean; endCursor: string };
      };
    }>(null, FAQ, { first: 1 });

    expect(first.errors).toBeUndefined();
    expect(first.data?.helpFaq.edges).toEqual([
      {
        node: {
          id: expect.any(String),
          kind: 'faq',
          audience: 'public',
          title: 'Testwort First Question',
          slug: 'testwort-first-question',
          summary: 'A fixture summary.',
          body: 'The first fixture answer.',
          position: 1,
          parentId: null,
        },
      },
    ]);
    expect(first.data?.helpFaq.pageInfo.hasNextPage).toBe(true);

    const second = await run<{ helpFaq: { edges: { node: { slug: string } }[] } }>(null, FAQ, {
      first: 1,
      after: first.data?.helpFaq.pageInfo.endCursor,
    });
    expect(second.data?.helpFaq.edges.map((edge) => edge.node.slug)).toEqual([
      'testwort-second-question',
    ]);
  });

  it('answers the article index and the glossary signed out, as connections', async () => {
    const index = await run<{ helpArticles: { edges: { node: { slug: string } }[] } }>(
      null,
      INDEX,
      { first: 10 },
    );
    expect(index.errors).toBeUndefined();
    expect(index.data?.helpArticles.edges.map((edge) => edge.node.slug)).toEqual([
      'testwort-guide',
    ]);

    const glossary = await run<{
      helpGlossary: {
        edges: { node: { title: string } }[];
        pageInfo: { hasNextPage: boolean; endCursor: string };
      };
    }>(null, GLOSSARY, { first: 1 });
    expect(glossary.errors).toBeUndefined();
    expect(glossary.data?.helpGlossary.edges.map((edge) => edge.node.title)).toEqual([
      'Testwort Amber',
    ]);
    expect(glossary.data?.helpGlossary.pageInfo.hasNextPage).toBe(true);
  });

  it('answers one article with its public children, signed out', async () => {
    const result = await run<{
      helpArticle: { id: string; children: { slug: string; audience: string; parentId: string }[] };
    }>(null, ARTICLE, { slug: 'testwort-guide' });

    expect(result.errors).toBeUndefined();
    expect(result.data?.helpArticle.id).toBe(parentId);
    expect(result.data?.helpArticle.children).toEqual([
      { slug: 'testwort-guide-public', audience: 'public', parentId },
    ]);
  });

  it('answers NOT_FOUND for a staff article asked for by its slug, signed out', async () => {
    // Precondition: the slug is a live row, which a keeper is answered.
    expect(codeOf(await run(asUser(E), STAFF_ARTICLE, { slug: 'testwort-queue-notes' }))).toBe(
      undefined,
    );

    expect(codeOf(await run(null, ARTICLE, { slug: 'testwort-queue-notes' }))).toBe('NOT_FOUND');
  });

  it('answers the article when a term and an FAQ entry share its slug', async () => {
    await insertHelpArticle(
      sql,
      { kind: 'term', title: 'Testwort Guide', slug: 'testwort-guide' },
      E.id,
    );
    await insertHelpArticle(
      sql,
      { kind: 'faq', title: 'Testwort Guide Question', slug: 'testwort-guide', position: 9 },
      E.id,
    );
    // Rewriting the article moves its tuple behind the other two, so a read that ignores the kind
    // cannot find the article by luck of heap order.
    await sql`update help_articles set body = body || '' where id = ${parentId}`;

    const result = await run<{ helpArticle: { id: string; kind: string } }>(null, ARTICLE, {
      slug: 'testwort-guide',
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.helpArticle).toMatchObject({ id: parentId, kind: 'article' });
  });

  it('answers NOT_FOUND for a slug only a term or an FAQ entry holds, signed out', async () => {
    for (const slug of ['testwort-mallow', 'testwort-first-question']) {
      expect(codeOf(await run(null, ARTICLE, { slug })), slug).toBe('NOT_FOUND');
    }
  });
});

describe('helpSearch', () => {
  it('answers a signed-out search with public rows of every kind', async () => {
    const result = await run<{ helpSearch: { edges: { node: { slug: string; kind: string } }[] } }>(
      null,
      SEARCH,
      { query: 'testwort', first: 50 },
    );

    expect(result.errors).toBeUndefined();
    const kinds = new Set(result.data?.helpSearch.edges.map((edge) => edge.node.kind));
    expect(kinds).toEqual(new Set(['faq', 'article', 'term']));
    const slugs = result.data?.helpSearch.edges.map((edge) => edge.node.slug);
    expect(slugs).not.toContain('testwort-queue-notes');
    expect(slugs).not.toContain('testwort-guide-staff');
  });

  it('answers an empty connection to a whitespace query', async () => {
    const result = await run<{ helpSearch: { edges: unknown[] } }>(null, SEARCH, {
      query: '   ',
      first: 50,
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.helpSearch.edges).toEqual([]);
  });
});

describe('the staff help reads', () => {
  it('answers a curator a staff article with its staff children', async () => {
    const result = await run<{
      staffHelpArticle: { slug: string; audience: string; children: { slug: string }[] };
    }>(asUser(F), STAFF_ARTICLE, { slug: 'testwort-guide' });

    expect(result.errors).toBeUndefined();
    expect(result.data?.staffHelpArticle.children.map((child) => child.slug).sort()).toEqual([
      'testwort-guide-public',
      'testwort-guide-staff',
    ]);
  });

  it.each([
    ['a signed-out caller', null],
    ['a practitioner', asUser(B)],
    ['an observer', asUser(C)],
  ])('answers FORBIDDEN to %s asking for a staff row by slug', async (_who, session) => {
    // Preconditions: the slug is a staff row a curator is answered, and the caller holds no site role.
    expect(codeOf(await run(asUser(F), STAFF_ARTICLE, { slug: 'testwort-queue-notes' }))).toBe(
      undefined,
    );
    expect(session?.role ?? null).not.toBe('curator');
    expect(session?.role ?? null).not.toBe('admin');

    const result = await run(session, STAFF_ARTICLE, { slug: 'testwort-queue-notes' });

    expect(result.data ?? null).toBeNull();
    expect(codeOf(result)).toBe('FORBIDDEN');
  });

  it('answers NOT_FOUND to a curator asking for a keeper row, and the row to a keeper', async () => {
    expect(assertCurator(asUser(F))).toEqual({ userId: F.id });
    const keeper = await run<{ staffHelpArticle: { audience: string } }>(asUser(E), STAFF_ARTICLE, {
      slug: 'testwort-grant-notes',
    });
    expect(keeper.data?.staffHelpArticle.audience).toBe('keeper');

    expect(codeOf(await run(asUser(F), STAFF_ARTICLE, { slug: 'testwort-grant-notes' }))).toBe(
      'NOT_FOUND',
    );
  });

  it('pages the staff list for a curator, leaving out keeper rows', async () => {
    const result = await run<{
      staffHelpArticles: { edges: { node: { slug: string; audience: string } }[] };
    }>(asUser(F), STAFF_LIST, { first: 100 });

    expect(result.errors).toBeUndefined();
    const audiences = new Set(
      result.data?.staffHelpArticles.edges.map((edge) => edge.node.audience),
    );
    expect(audiences).toEqual(new Set(['public', 'staff']));
  });
});

describe('the help writes', () => {
  it('creates an article, deriving its slug, and answers every field', async () => {
    const result = await run<{ createHelpArticle: Record<string, unknown> }>(asUser(E), CREATE, {
      input: {
        kind: 'article',
        audience: 'staff',
        title: 'Testwort Ledger Care',
        summary: 'A fixture summary.',
        body: 'How the fixture ledger is kept.',
        position: 3,
        parentId: null,
      },
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.createHelpArticle).toEqual({
      id: expect.any(String),
      kind: 'article',
      audience: 'staff',
      title: 'Testwort Ledger Care',
      slug: 'testwort-ledger-care',
      summary: 'A fixture summary.',
      body: 'How the fixture ledger is kept.',
      position: 3,
      parentId: null,
    });
  });

  it('answers VALIDATION on the title for a title that makes a reserved address', async () => {
    const result = await run(asUser(E), CREATE, {
      input: { kind: 'article', title: 'Glossary', body: 'Fixture.' },
    });

    expect(codeOf(result)).toBe('VALIDATION');
    const extensions = result.errors?.[0]?.extensions as
      { fieldErrors?: { path: string[] }[] } | undefined;
    expect(extensions?.fieldErrors?.map((error) => error.path)).toContainEqual(['title']);
  });

  it('refuses a slug in the input, since the address is derived from the title alone', async () => {
    const result = await run(asUser(E), CREATE, {
      input: { kind: 'article', title: 'Testwort Typed', slug: 'testwort-typed', body: 'Fixture.' },
    });

    // The schema holds no slug field, so the variables fail before any resolver runs.
    expect(result.errors?.[0]?.message).toContain('slug');
    expect(result.data ?? null).toBeNull();
    const created = await run<{ createHelpArticle: { slug: string } }>(asUser(E), CREATE, {
      input: { kind: 'article', title: 'Testwort Typed', body: 'Fixture.' },
    });
    expect(created.data?.createHelpArticle.slug).toBe('testwort-typed');
  });

  it('updates and deletes a row by id', async () => {
    const updated = await run<{ updateHelpArticle: { title: string; audience: string } }>(
      asUser(E),
      UPDATE,
      { id: staffId, input: { title: 'Testwort Queue Notes Renamed', audience: 'keeper' } },
    );
    expect(updated.errors).toBeUndefined();
    expect(updated.data?.updateHelpArticle).toMatchObject({
      title: 'Testwort Queue Notes Renamed',
      audience: 'keeper',
    });

    const deleted = await run<{ deleteHelpArticle: string }>(asUser(E), DELETE, { id: staffId });
    expect(deleted.errors).toBeUndefined();
    expect(deleted.data?.deleteHelpArticle).toBe(staffId);
    const [row] = await sql`select deleted_at from help_articles where id = ${staffId}`;
    expect(row.deleted_at).not.toBeNull();
  });

  it('answers FORBIDDEN to a curator writing by id, and leaves the row', async () => {
    expect(assertCurator(asUser(F))).toEqual({ userId: F.id });

    const result = await run(asUser(F), UPDATE, { id: staffId, input: { title: 'Fixture Taken' } });

    expect(codeOf(result)).toBe('FORBIDDEN');
    const [row] = await sql`select title from help_articles where id = ${staffId}`;
    expect(row.title).toBe('Testwort Queue Notes');
  });

  it('answers NOT_FOUND for an id with no live row', async () => {
    await sql`update help_articles set deleted_at = now(), deleted_by = ${E.id} where id = ${staffId}`;

    expect(codeOf(await run(asUser(E), UPDATE, { id: staffId, input: { title: 'Fixture' } }))).toBe(
      'NOT_FOUND',
    );
  });
});

const SET_SHOWN = /* GraphQL */ `
  mutation ($id: ID!, $shown: Boolean!) {
    setHelpArticleShown(id: $id, shown: $shown) {
      id
      shown
    }
  }
`;

const KEEPER_LIST = /* GraphQL */ `
  query (
    $first: Int
    $listing: HelpListing
    $query: String
    $kind: HelpArticleKind
    $audience: HelpAudience
  ) {
    keeperHelpArticles(
      first: $first
      listing: $listing
      query: $query
      kind: $kind
      audience: $audience
    ) {
      edges {
        node {
          title
          shown
        }
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`;

const CHILDREN = /* GraphQL */ `
  mutation ($id: ID!, $childIds: [ID!]) {
    updateHelpArticle(id: $id, input: { childIds: $childIds }) {
      id
    }
  }
`;

describe('showing and hiding help rows', () => {
  let shyId: string;

  beforeEach(async () => {
    shyId = await insertHelpArticle(
      sql,
      { title: 'Testwort Shy Guide', slug: 'testwort-shy-guide', shown: false },
      E.id,
    );
  });

  it.each([
    ['signed out', null],
    ['a practitioner', asUser(B)],
  ])(
    'answers NOT_FOUND for a hidden public article asked for by its slug, %s',
    async (_who, session) => {
      // Preconditions: the row is live and public, and once shown the same reader is answered it.
      const [row] = await sql`select audience, deleted_at from help_articles where id = ${shyId}`;
      expect(row).toEqual({ audience: 'public', deleted_at: null });

      expect(codeOf(await run(session, ARTICLE, { slug: 'testwort-shy-guide' }))).toBe('NOT_FOUND');

      await sql`update help_articles set shown = true where id = ${shyId}`;
      const shown = await run<{ helpArticle: { id: string } }>(session, ARTICLE, {
        slug: 'testwort-shy-guide',
      });
      expect(shown.errors).toBeUndefined();
      expect(shown.data?.helpArticle.id).toBe(shyId);
    },
  );

  it('answers NOT_FOUND to a curator asking for a hidden staff article by its slug', async () => {
    await sql`update help_articles set audience = 'staff' where id = ${shyId}`;
    expect(assertCurator(asUser(F))).toEqual({ userId: F.id });

    expect(codeOf(await run(asUser(F), STAFF_ARTICLE, { slug: 'testwort-shy-guide' }))).toBe(
      'NOT_FOUND',
    );
  });

  it('shows a row as a keeper, answering its flag', async () => {
    const result = await run<{ setHelpArticleShown: { id: string; shown: boolean } }>(
      asUser(E),
      SET_SHOWN,
      { id: shyId, shown: true },
    );

    expect(result.errors).toBeUndefined();
    expect(result.data?.setHelpArticleShown).toEqual({ id: shyId, shown: true });
  });

  it('answers FORBIDDEN to a curator showing a row by id, and leaves it hidden', async () => {
    expect(assertCurator(asUser(F))).toEqual({ userId: F.id });

    expect(codeOf(await run(asUser(F), SET_SHOWN, { id: shyId, shown: true }))).toBe('FORBIDDEN');
    const [row] = await sql`select shown from help_articles where id = ${shyId}`;
    expect(row.shown).toBe(false);
  });

  it('lists the hidden rows to a keeper by the listing filter, and refuses a curator', async () => {
    const result = await run<{
      keeperHelpArticles: { edges: { node: { title: string; shown: boolean } }[] };
    }>(asUser(E), KEEPER_LIST, { first: 25, listing: 'hidden' });

    expect(result.errors).toBeUndefined();
    expect(result.data?.keeperHelpArticles.edges.map(({ node }) => node)).toEqual([
      { title: 'Testwort Shy Guide', shown: false },
    ]);
    expect(codeOf(await run(asUser(F), KEEPER_LIST, { first: 25 }))).toBe('FORBIDDEN');
  });

  it('answers VALIDATION naming childIds for a child the parent may not take', async () => {
    const faqId = await insertHelpArticle(sql, { kind: 'faq', title: 'Testwort Question' }, E.id);

    const result = await run(asUser(E), CHILDREN, { id: shyId, childIds: [faqId] });

    expect(codeOf(result)).toBe('VALIDATION');
    const extensions = result.errors?.[0]?.extensions as
      { fieldErrors?: { path: string[] }[] } | undefined;
    expect(extensions?.fieldErrors?.map((error) => error.path)).toContainEqual(['childIds']);
  });
});

const ORDER_GUIDES = /* GraphQL */ `
  mutation ($ids: [ID!]!) {
    orderHelpGuides(ids: $ids) {
      id
      position
    }
  }
`;

describe('ordering the guides', () => {
  const guideIds = async () =>
    (
      await sql`
        select id from help_articles
        where kind = 'article' and parent_id is null and deleted_at is null
        order by position nulls last, title`
    ).map((row) => row.id as string);

  it('places every top-level guide as a keeper, answering the new positions', async () => {
    const ids = (await guideIds()).reverse();
    expect(ids.length).toBe(3);

    const result = await run<{ orderHelpGuides: { id: string; position: number }[] }>(
      asUser(E),
      ORDER_GUIDES,
      { ids },
    );

    expect(result.errors).toBeUndefined();
    expect(result.data?.orderHelpGuides).toEqual(
      ids.map((id, index) => ({ id, position: index + 1 })),
    );
  });

  it('answers FORBIDDEN to a curator ordering the guides by their ids, and moves nothing', async () => {
    const before = await guideIds();
    expect(assertCurator(asUser(F))).toEqual({ userId: F.id });

    expect(codeOf(await run(asUser(F), ORDER_GUIDES, { ids: [...before].reverse() }))).toBe(
      'FORBIDDEN',
    );
    expect(await guideIds()).toEqual(before);
  });

  it('answers VALIDATION to a list missing a guide', async () => {
    const [, ...some] = await guideIds();
    expect(codeOf(await run(asUser(E), ORDER_GUIDES, { ids: some }))).toBe('VALIDATION');
  });
});
