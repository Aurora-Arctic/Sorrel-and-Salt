import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { Forbidden, NotFound, ValidationError } from '@/lib/errors';
import { slugify } from '@/lib/slugify';
import type { PageRequest } from '@/lib/types';
import {
  createHelpArticle,
  deleteHelpArticle,
  listKeeperHelpArticles,
  listStaffHelpArticles,
  readKeeperHelpArticle,
  setHelpArticleShown,
  updateHelpArticle,
} from '@/modules/help';
import { assertCurator } from '@/modules/identity';
import { B, E, F, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertHelpArticle } from '../../../support/db/insert-help-article';

// Signed-out callers are refused at the GraphQL scope (tests/db/graphql-query-scopes.test.ts); a service is never called without a session.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

const PAGE: PageRequest = { limit: 101, inverted: false };
const NOWHERE = '00000000-0000-4000-8000-000000000000';

beforeEach(async () => {
  await sql`truncate help_articles cascade`;
});

/** The refusal is a `ValidationError` naming `field`, with a message of its own rather than the default. */
async function expectRefusedAt(promise: Promise<unknown>, field: string) {
  const error = await promise.then(
    () => {
      throw new Error(`accepted where ${field} should have been refused`);
    },
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(ValidationError);
  const refusal = error as ValidationError;
  expect(refusal.issues.map((issue) => issue.path[0])).toContain(field);
  expect(refusal.message).not.toBe(new ValidationError([]).message);
}

async function expectExplained(promise: Promise<unknown>) {
  const error = await promise.then(
    () => {
      throw new Error('accepted where it should have been refused');
    },
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(ValidationError);
  expect((error as ValidationError).message).not.toBe(new ValidationError([]).message);
}

const rowOf = async (id: string) => {
  const [row] = await sql`
    select kind, audience, title, slug, position, parent_id, shown, deleted_at, created_by, updated_by
    from help_articles where id = ${id}`;
  return row;
};

const liveCount = async () => {
  const [{ count }] =
    await sql`select count(*)::int as count from help_articles where deleted_at is null`;
  return count as number;
};

const article = { kind: 'article' as const, body: 'How the fixture reads.' };

describe('the help writes are a keeper’s alone', () => {
  it('creates as a keeper, through the audited writer', async () => {
    const created = await createHelpArticle(asUser(E), {
      ...article,
      title: 'Testwort Ledger',
    });

    expect(created).toMatchObject({
      kind: 'article',
      audience: 'public',
      title: 'Testwort Ledger',
      slug: 'testwort-ledger',
      position: 1,
      parentId: null,
    });
    expect(await rowOf(created.id)).toMatchObject({ created_by: E.id, updated_by: E.id });
  });

  it.each([
    ['the curator', F],
    ['a practitioner', B],
  ])('refuses %s a create, leaving no row behind', async (_who, user) => {
    // Preconditions: the keeper's same call succeeds, and F passes the curator check, so the refusal is the keeper line.
    expect(assertCurator(asUser(F))).toEqual({ userId: F.id });
    expect(user.role).not.toBe('admin');

    await expect(
      createHelpArticle(asUser(user), { ...article, title: 'Testwort Refused' }),
    ).rejects.toThrow(Forbidden);
    expect(await liveCount()).toBe(0);

    await createHelpArticle(asUser(E), { ...article, title: 'Testwort Accepted' });
    expect(await liveCount()).toBe(1);
  });

  it.each([
    ['the curator', F],
    ['a practitioner', B],
  ])('refuses %s an update and a delete by direct id', async (_who, user) => {
    const id = await insertHelpArticle(
      sql,
      { title: 'Testwort Standing', slug: 'testwort-standing' },
      E.id,
    );

    await expect(updateHelpArticle(asUser(user), id, { title: 'Testwort Taken' })).rejects.toThrow(
      Forbidden,
    );
    await expect(deleteHelpArticle(asUser(user), id)).rejects.toThrow(Forbidden);

    // The row is as it was, by direct read and in the keeper's list.
    expect(await rowOf(id)).toMatchObject({ title: 'Testwort Standing', deleted_at: null });
    const listed = (await listStaffHelpArticles(asUser(E), PAGE)).map((entry) => entry.node);
    expect(listed).toEqual([expect.objectContaining({ id, title: 'Testwort Standing' })]);

    // Precondition: the id was right, as the keeper's same calls take it.
    await updateHelpArticle(asUser(E), id, { title: 'Testwort Renamed' });
    expect((await rowOf(id)).title).toBe('Testwort Renamed');
    await expect(deleteHelpArticle(asUser(E), id)).resolves.toBe(id);
    expect((await rowOf(id)).deleted_at).not.toBeNull();
  });
});

describe('the slug', () => {
  it('is derived from the title through slugify', async () => {
    const title = 'Testwort Pouches & Jars, Part 2';
    const created = await createHelpArticle(asUser(E), { ...article, title });

    expect(created.slug).toBe(slugify(title));
    expect((await rowOf(created.id)).slug).toBe(slugify(title));
  });

  it('takes no typed slug, on create or on update: the address comes from the title alone', async () => {
    // The input types hold no slug; a caller that sends one anyway has it dropped by the parse, never stored.
    const created = await createHelpArticle(asUser(E), {
      ...article,
      title: 'Testwort Plain Title',
      slug: 'testwort-typed-address',
    } as never);
    expect((await rowOf((created as { id: string }).id)).slug).toBe('testwort-plain-title');

    const id = await insertHelpArticle(
      sql,
      { title: 'Testwort Standing', slug: 'testwort-standing' },
      E.id,
    );
    await updateHelpArticle(asUser(E), id, { slug: 'testwort-typed-address' } as never);
    expect((await rowOf(id)).slug).toBe('testwort-standing');
  });

  it('re-derives the slug from every title change, and keeps it through a save that leaves the title alone', async () => {
    const id = await insertHelpArticle(
      sql,
      { title: 'Testwort Old Name', slug: 'testwort-old-name' },
      E.id,
    );

    await updateHelpArticle(asUser(E), id, { body: 'A new body.' });
    expect((await rowOf(id)).slug).toBe('testwort-old-name');

    const renamed = await updateHelpArticle(asUser(E), id, { title: 'Testwort New Name' });
    expect(renamed.slug).toBe('testwort-new-name');
    expect((await rowOf(id)).slug).toBe('testwort-new-name');
  });

  it('refuses a title that makes no address, on the title, on create and on rename', async () => {
    await expectRefusedAt(createHelpArticle(asUser(E), { ...article, title: '!!!' }), 'title');
    expect(await liveCount()).toBe(0);

    const id = await insertHelpArticle(
      sql,
      { title: 'Testwort Renamable', slug: 'testwort-renamable' },
      E.id,
    );
    await expectRefusedAt(updateHelpArticle(asUser(E), id, { title: '???' }), 'title');
    expect(await rowOf(id)).toMatchObject({
      title: 'Testwort Renamable',
      slug: 'testwort-renamable',
    });
  });

  it.each(['glossary', 'staff', 'search'])(
    'refuses a title that makes the reserved address %s, on the title, on create and on rename',
    async (word) => {
      const title = word[0].toUpperCase() + word.slice(1);
      // Precondition: the title derives the reserved word, and nothing else holds it.
      expect(slugify(title)).toBe(word);
      expect(await liveCount()).toBe(0);

      await expectRefusedAt(createHelpArticle(asUser(E), { ...article, title }), 'title');
      expect(await liveCount()).toBe(0);

      const id = await insertHelpArticle(
        sql,
        { title: 'Testwort Renamable', slug: 'testwort-renamable' },
        E.id,
      );
      await expectRefusedAt(updateHelpArticle(asUser(E), id, { title }), 'title');
      expect(await rowOf(id)).toMatchObject({
        title: 'Testwort Renamable',
        slug: 'testwort-renamable',
      });
    },
  );

  it('refuses, on the title, a title whose address a live row of the same kind holds, on create and on rename, and frees it once that row is deleted', async () => {
    const twin = await insertHelpArticle(
      sql,
      { title: 'Testwort Twin', slug: 'testwort-twin' },
      E.id,
    );
    const other = await insertHelpArticle(
      sql,
      { title: 'Testwort Other', slug: 'testwort-other' },
      E.id,
    );

    await expectRefusedAt(
      createHelpArticle(asUser(E), { ...article, title: 'Testwort Twin' }),
      'title',
    );
    // A title that differs only in case and punctuation makes the same address.
    await expectRefusedAt(
      updateHelpArticle(asUser(E), other, { title: 'testwort: twin!' }),
      'title',
    );
    expect(await rowOf(other)).toMatchObject({ title: 'Testwort Other', slug: 'testwort-other' });

    await sql`update help_articles set deleted_at = now(), deleted_by = ${E.id} where id = ${twin}`;
    const created = await createHelpArticle(asUser(E), { ...article, title: 'Testwort Twin' });
    expect(created.slug).toBe('testwort-twin');
  });

  it('lets a row keep its own address through a title change that makes the same one', async () => {
    const id = await insertHelpArticle(
      sql,
      { title: 'Testwort Steady', slug: 'testwort-steady' },
      E.id,
    );

    await expect(
      updateHelpArticle(asUser(E), id, { title: 'Testwort steady!' }),
    ).resolves.toMatchObject({ title: 'Testwort steady!', slug: 'testwort-steady' });
  });

  it('refuses a second term under a live term’s title, on the title', async () => {
    await insertHelpArticle(
      sql,
      { kind: 'term', title: 'Testwort Twin', slug: 'testwort-twin' },
      E.id,
    );

    await expectRefusedAt(
      createHelpArticle(asUser(E), { kind: 'term', title: 'Testwort Twin', body: 'Twice.' }),
      'title',
    );
  });

  it.each([
    ['a term', { kind: 'term' as const }],
    ['an FAQ entry', { kind: 'faq' as const, position: 1 }],
  ])(
    'creates %s under a live article’s address, since an address is unique within its kind',
    async (_kind, shape) => {
      const twin = await insertHelpArticle(
        sql,
        { title: 'Testwort Twin', slug: 'testwort-twin' },
        E.id,
      );

      const created = await createHelpArticle(asUser(E), {
        ...shape,
        title: 'Testwort Twin',
        body: 'The same address, another kind.',
      });

      expect(created.slug).toBe('testwort-twin');
      expect(created.kind).toBe(shape.kind);
      // The article still holds the slug alongside it.
      expect((await rowOf(twin)).slug).toBe('testwort-twin');
      expect(await liveCount()).toBe(2);
    },
  );

  it('creates an article under a live term’s address', async () => {
    await insertHelpArticle(
      sql,
      { kind: 'term', title: 'Testwort Twin', slug: 'testwort-twin' },
      E.id,
    );

    const created = await createHelpArticle(asUser(E), { ...article, title: 'Testwort Twin' });

    expect(created.slug).toBe('testwort-twin');
  });

  it('renames a term to a live article’s title', async () => {
    await insertHelpArticle(sql, { title: 'Testwort Twin', slug: 'testwort-twin' }, E.id);
    const term = await insertHelpArticle(
      sql,
      { kind: 'term', title: 'Testwort Other', slug: 'testwort-other' },
      E.id,
    );

    const renamed = await updateHelpArticle(asUser(E), term, { title: 'Testwort Twin' });

    expect(renamed.slug).toBe('testwort-twin');
    expect((await rowOf(term)).slug).toBe('testwort-twin');
  });

  it.each([
    ['a term', { kind: 'term' as const }],
    ['an FAQ entry', { kind: 'faq' as const, position: 1 }],
  ])('refuses %s a title that makes a reserved address, on the title', async (_kind, shape) => {
    for (const title of ['Glossary', 'Staff', 'Search']) {
      await expectRefusedAt(
        createHelpArticle(asUser(E), { ...shape, title, body: 'Reserved.' }),
        'title',
      );
    }
    expect(await liveCount()).toBe(0);
  });
});

describe('the structure rules', () => {
  let parentId: string;

  beforeEach(async () => {
    parentId = await insertHelpArticle(
      sql,
      { title: 'Testwort Parent', slug: 'testwort-parent' },
      E.id,
    );
  });

  it('accepts a child of a live top-level article', async () => {
    const child = await createHelpArticle(asUser(E), {
      ...article,
      title: 'Testwort Child',
      parentId,
      position: 1,
    });

    expect(child).toMatchObject({ parentId, position: 1 });
  });

  it.each([
    ['an FAQ entry', { kind: 'faq' as const }],
    ['a glossary term', { kind: 'term' as const }],
    ['a deleted article', { deleted_at: new Date() }],
  ])('refuses %s as a parent', async (_what, seed) => {
    const notParent = await insertHelpArticle(sql, seed, E.id);

    await expectRefusedAt(
      createHelpArticle(asUser(E), { ...article, title: 'Testwort Orphan', parentId: notParent }),
      'parentId',
    );
    await expectRefusedAt(
      updateHelpArticle(asUser(E), parentId, { parentId: notParent }),
      'parentId',
    );
    expect((await rowOf(parentId)).parent_id).toBeNull();
  });

  it('refuses a parent id no row holds', async () => {
    await expectRefusedAt(
      createHelpArticle(asUser(E), { ...article, title: 'Testwort Orphan', parentId: NOWHERE }),
      'parentId',
    );
  });

  it('nests one level deep: no child under a child, and no parent under another', async () => {
    const childId = await insertHelpArticle(
      sql,
      { title: 'Testwort Child', slug: 'testwort-child', parent_id: parentId },
      E.id,
    );
    const otherTop = await insertHelpArticle(
      sql,
      { title: 'Testwort Other Top', slug: 'testwort-other-top' },
      E.id,
    );

    await expectRefusedAt(
      createHelpArticle(asUser(E), { ...article, title: 'Testwort Grandchild', parentId: childId }),
      'parentId',
    );
    // The parent has a child, so placing it under another would make a second level.
    await expectRefusedAt(
      updateHelpArticle(asUser(E), parentId, { parentId: otherTop }),
      'parentId',
    );
    expect((await rowOf(parentId)).parent_id).toBeNull();

    // Precondition: the top-level article with no children may take that parent.
    await expect(updateHelpArticle(asUser(E), otherTop, { parentId })).resolves.toMatchObject({
      parentId,
    });
  });

  it('gives a term no parent, no position and no audience but public', async () => {
    const term = { kind: 'term' as const, title: 'Testwort Mallow', body: 'A fixture word.' };

    await expectRefusedAt(createHelpArticle(asUser(E), { ...term, parentId }), 'parentId');
    await expectRefusedAt(createHelpArticle(asUser(E), { ...term, position: 1 }), 'position');
    await expectRefusedAt(createHelpArticle(asUser(E), { ...term, audience: 'staff' }), 'audience');

    // Precondition: the same term with none of them is written.
    const created = await createHelpArticle(asUser(E), term);
    expect(created).toMatchObject({
      kind: 'term',
      parentId: null,
      position: null,
      audience: 'public',
    });

    await expectRefusedAt(updateHelpArticle(asUser(E), created.id, { position: 2 }), 'position');
    await expectRefusedAt(updateHelpArticle(asUser(E), created.id, { parentId }), 'parentId');
    expect(await rowOf(created.id)).toMatchObject({ position: null, parent_id: null });
  });

  it.each([
    ['a term', 'term' as const, 'Testwort Sorrel'],
    ['an FAQ entry', 'faq' as const, 'Testwort Question'],
  ])('gives %s no summary, as the form draws none', async (_what, kind, title) => {
    const row = { kind, title, body: 'A fixture answer.' };

    await expectRefusedAt(createHelpArticle(asUser(E), { ...row, summary: 'A line.' }), 'summary');

    // Precondition: the same row with no summary, or a null one, is written.
    const created = await createHelpArticle(asUser(E), { ...row, summary: null });
    expect(created).toMatchObject({ kind, summary: null });

    await expectRefusedAt(
      updateHelpArticle(asUser(E), created.id, { summary: 'A line.' }),
      'summary',
    );
    const [stored] = await sql`select summary from help_articles where id = ${created.id}`;
    expect(stored.summary).toBeNull();
    // An update that leaves the summary out, or clears it, still saves.
    await expect(
      updateHelpArticle(asUser(E), created.id, { body: 'A second answer.', summary: null }),
    ).resolves.toMatchObject({ summary: null });
  });

  it('still gives an article a summary', async () => {
    const created = await createHelpArticle(asUser(E), {
      ...article,
      title: 'Testwort Summary',
      summary: 'A line.',
    });
    expect(created).toMatchObject({ summary: 'A line.' });
  });

  it('refuses to delete a parent with live children, and deletes it once they are gone', async () => {
    const childId = await insertHelpArticle(
      sql,
      { title: 'Testwort Child', slug: 'testwort-child', parent_id: parentId },
      E.id,
    );

    await expectExplained(deleteHelpArticle(asUser(E), parentId));
    expect((await rowOf(parentId)).deleted_at).toBeNull();

    await deleteHelpArticle(asUser(E), childId);
    await expect(deleteHelpArticle(asUser(E), parentId)).resolves.toBe(parentId);
    expect((await rowOf(parentId)).deleted_at).not.toBeNull();
  });
});

describe('the audience order: public, then staff, then keeper', () => {
  it('gives a child its parent’s audience or a narrower one, never a wider', async () => {
    const staffParent = await insertHelpArticle(
      sql,
      { title: 'Testwort Staff Parent', slug: 'testwort-staff-parent', audience: 'staff' },
      E.id,
    );

    await expectRefusedAt(
      createHelpArticle(asUser(E), {
        ...article,
        title: 'Testwort Wide Child',
        audience: 'public',
        parentId: staffParent,
      }),
      'audience',
    );
    await expect(
      createHelpArticle(asUser(E), {
        ...article,
        title: 'Testwort Equal Child',
        audience: 'staff',
        parentId: staffParent,
      }),
    ).resolves.toMatchObject({ audience: 'staff' });
    const narrow = await createHelpArticle(asUser(E), {
      ...article,
      title: 'Testwort Narrow Child',
      audience: 'keeper',
      parentId: staffParent,
    });
    expect(narrow.audience).toBe('keeper');

    // Widening the child past its parent is refused on update too.
    await expectRefusedAt(
      updateHelpArticle(asUser(E), narrow.id, { audience: 'public' }),
      'audience',
    );
    expect((await rowOf(narrow.id)).audience).toBe('keeper');
  });

  it('refuses moving a public article under a staff parent', async () => {
    const staffParent = await insertHelpArticle(
      sql,
      { title: 'Testwort Staff Parent', slug: 'testwort-staff-parent', audience: 'staff' },
      E.id,
    );
    const open = await insertHelpArticle(
      sql,
      { title: 'Testwort Open', slug: 'testwort-open' },
      E.id,
    );

    await expectRefusedAt(
      updateHelpArticle(asUser(E), open, { parentId: staffParent }),
      'audience',
    );
    expect((await rowOf(open)).parent_id).toBeNull();
  });

  it('refuses making a parent narrower than a live child, with no cascade', async () => {
    const parentId = await insertHelpArticle(
      sql,
      { title: 'Testwort Parent', slug: 'testwort-parent' },
      E.id,
    );
    const staffChild = await insertHelpArticle(
      sql,
      {
        title: 'Testwort Staff Child',
        slug: 'testwort-staff-child',
        audience: 'staff',
        parent_id: parentId,
      },
      E.id,
    );

    await expectRefusedAt(
      updateHelpArticle(asUser(E), parentId, { audience: 'keeper' }),
      'audience',
    );
    expect((await rowOf(parentId)).audience).toBe('public');

    // Equal to the child is allowed, and the child is left as it was.
    await updateHelpArticle(asUser(E), parentId, { audience: 'staff' });
    expect((await rowOf(parentId)).audience).toBe('staff');
    expect((await rowOf(staffChild)).audience).toBe('staff');
  });

  it('lets a deleted child not hold its parent back', async () => {
    const parentId = await insertHelpArticle(
      sql,
      { title: 'Testwort Parent', slug: 'testwort-parent' },
      E.id,
    );
    await insertHelpArticle(
      sql,
      { title: 'Testwort Gone Child', parent_id: parentId, deleted_at: new Date() },
      E.id,
    );

    await expect(
      updateHelpArticle(asUser(E), parentId, { audience: 'keeper' }),
    ).resolves.toMatchObject({ audience: 'keeper' });
  });
});

describe('a soft-deleted article reaches no writer', () => {
  it('answers NotFound to an update or a delete of a deleted row, and leaves it as it was', async () => {
    const id = await insertHelpArticle(
      sql,
      {
        title: 'Testwort Gone',
        slug: 'testwort-gone',
        deleted_at: new Date('2026-01-02T00:00:00Z'),
      },
      E.id,
    );

    await expect(updateHelpArticle(asUser(E), id, { title: 'Testwort Back' })).rejects.toThrow(
      NotFound,
    );
    await expect(deleteHelpArticle(asUser(E), id)).rejects.toThrow(NotFound);

    const row = await rowOf(id);
    expect(row.title).toBe('Testwort Gone');
    expect(row.deleted_at).toEqual(new Date('2026-01-02T00:00:00Z'));
  });

  it('answers NotFound for an id no row holds', async () => {
    await expect(updateHelpArticle(asUser(E), NOWHERE, { title: 'Testwort' })).rejects.toThrow(
      NotFound,
    );
    await expect(deleteHelpArticle(asUser(E), NOWHERE)).rejects.toThrow(NotFound);
  });
});

describe('the glossary marks in a body', () => {
  const marked = (term: string) => `A fixture word, [[${term}]], in a body.`;

  it.each([
    ['an article', { kind: 'article' as const }],
    ['an FAQ entry', { kind: 'faq' as const, position: 1 }],
    ['a term', { kind: 'term' as const }],
  ])(
    'refuses to create %s that marks a term no glossary row holds, naming it',
    async (_name, shape) => {
      const error = await createHelpArticle(asUser(E), {
        ...shape,
        title: 'Testwort Marked',
        body: marked('Testwort Absent'),
      }).then(
        () => {
          throw new Error('accepted a mark of a term that does not exist');
        },
        (reason: unknown) => reason,
      );

      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).message).toContain('Testwort Absent');
      expect((error as ValidationError).issues.map((issue) => issue.path[0])).toContain('body');
      expect(await liveCount()).toBe(0);
    },
  );

  it('accepts the same body once the term exists, by title in any case or by shown text', async () => {
    const body = 'A [[testwort absent]] and [[Testwort Absent|absentees]] and [[testwort-absent]].';
    await expect(
      createHelpArticle(asUser(E), { ...article, title: 'Testwort Marked', body }),
    ).rejects.toThrow(ValidationError);

    await insertHelpArticle(
      sql,
      { kind: 'term', title: 'Testwort Absent', slug: 'testwort-absent' },
      E.id,
    );
    const created = await createHelpArticle(asUser(E), {
      ...article,
      title: 'Testwort Marked',
      body,
    });

    expect(created.body).toBe(body);
  });

  it('names every term that is missing, and none that is there', async () => {
    await insertHelpArticle(sql, { kind: 'term', title: 'Testwort Present' }, E.id);

    const error = await createHelpArticle(asUser(E), {
      ...article,
      title: 'Testwort Marked',
      body: '[[Testwort Present]] [[Testwort One]] [[Testwort Two|two]]',
    }).catch((reason: unknown) => reason as ValidationError);

    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).message).toContain('Testwort One');
    expect((error as ValidationError).message).toContain('Testwort Two');
    expect((error as ValidationError).message).not.toContain('Testwort Present');
  });

  it('refuses an update whose new body marks a missing term, and leaves the row as it was', async () => {
    const created = await createHelpArticle(asUser(E), { ...article, title: 'Testwort Marked' });

    await expectRefusedAt(
      updateHelpArticle(asUser(E), created.id, { body: marked('Testwort Absent') }),
      'body',
    );

    expect((await rowOf(created.id)).title).toBe('Testwort Marked');
    const [{ body }] = await sql`select body from help_articles where id = ${created.id}`;
    expect(body).toBe(article.body);
  });

  it('does not check a body the update leaves alone', async () => {
    const id = await insertHelpArticle(
      sql,
      { kind: 'article', title: 'Testwort Old', body: marked('Testwort Deleted') },
      E.id,
    );

    const updated = await updateHelpArticle(asUser(E), id, { title: 'Testwort Renamed' });

    expect(updated.title).toBe('Testwort Renamed');
  });

  it('reads a mark in code as written, not as a mark', async () => {
    const created = await createHelpArticle(asUser(E), {
      ...article,
      title: 'Testwort Marked',
      body: 'Type `[[Testwort Absent]]` to mark it.',
    });

    expect(created.body).toContain('[[Testwort Absent]]');
  });
});

describe('the widget tags in a body', () => {
  it.each([
    ['an article', { kind: 'article' as const }],
    ['an FAQ entry', { kind: 'faq' as const, position: 1 }],
  ])(
    'refuses to create %s that names a widget the list does not hold, naming it',
    async (_name, shape) => {
      const error = await createHelpArticle(asUser(E), {
        ...shape,
        title: 'Testwort Widgeted',
        body: 'Intro.\n\n::widget[testwort-gadget]',
      }).then(
        () => {
          throw new Error('accepted a tag naming no widget');
        },
        (reason: unknown) => reason,
      );

      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).message).toContain('testwort-gadget');
      expect((error as ValidationError).issues.map((issue) => issue.path[0])).toContain('body');
      expect(await liveCount()).toBe(0);
    },
  );

  it('accepts a body that names a widget the list holds', async () => {
    const body = 'Intro.\n\n::widget[unit-converter]';

    const created = await createHelpArticle(asUser(E), {
      ...article,
      title: 'Testwort Widgeted',
      body,
    });

    expect(created.body).toBe(body);
  });

  it('refuses an update whose new body names an unknown widget, and leaves the row as it was', async () => {
    const created = await createHelpArticle(asUser(E), { ...article, title: 'Testwort Widgeted' });

    await expectRefusedAt(
      updateHelpArticle(asUser(E), created.id, { body: '::widget[testwort-gadget]' }),
      'body',
    );

    const [{ body }] = await sql`select body from help_articles where id = ${created.id}`;
    expect(body).toBe(article.body);
  });

  it('reads a tag in code as written, not as a tag', async () => {
    const created = await createHelpArticle(asUser(E), {
      ...article,
      title: 'Testwort Widgeted',
      body: 'Type `::widget[testwort-gadget]` to place one.',
    });

    expect(created.body).toContain('::widget[testwort-gadget]');
  });
});

describe('the position', () => {
  it.each([
    ['a negative number', -1],
    ['a fraction', 1.5],
  ])('refuses %s, on create and on update', async (_what, position) => {
    const id = await insertHelpArticle(
      sql,
      { title: 'Testwort Ordered', slug: 'testwort-ordered', position: 2 },
      E.id,
    );

    await expectRefusedAt(
      createHelpArticle(asUser(E), { ...article, title: 'Testwort Misplaced', position }),
      'position',
    );
    await expectRefusedAt(updateHelpArticle(asUser(E), id, { position }), 'position');
    expect((await rowOf(id)).position).toBe(2);
    expect(await liveCount()).toBe(1);

    // Precondition: zero, the lowest whole number, is taken.
    await expect(updateHelpArticle(asUser(E), id, { position: 0 })).resolves.toMatchObject({
      position: 0,
    });
  });

  it('puts a new top-level page given no position after every guide, of any audience or flag', async () => {
    await insertHelpArticle(
      sql,
      {
        title: 'Testwort Keeper Guide',
        slug: 'testwort-keeper-guide',
        audience: 'keeper',
        position: 4,
      },
      E.id,
    );
    await insertHelpArticle(
      sql,
      { title: 'Testwort Hidden Guide', slug: 'testwort-hidden-guide', shown: false, position: 6 },
      E.id,
    );
    const parentId = await insertHelpArticle(
      sql,
      { title: 'Testwort Parent', slug: 'testwort-parent', position: 2 },
      E.id,
    );
    // A sub page's or an FAQ entry's higher number is another list's, so it does not count.
    await insertHelpArticle(
      sql,
      { title: 'Testwort Deep', slug: 'testwort-deep', parent_id: parentId, position: 9 },
      E.id,
    );
    await insertHelpArticle(
      sql,
      { kind: 'faq', title: 'Testwort Asked', slug: 'testwort-asked', position: 9 },
      E.id,
    );

    const created = await createHelpArticle(asUser(E), { ...article, title: 'Testwort Newest' });
    expect(created).toMatchObject({ parentId: null, position: 7 });
  });

  it('puts a sub page that leaves its guide, given no position, after every guide', async () => {
    const parentId = await insertHelpArticle(
      sql,
      { title: 'Testwort Parent', slug: 'testwort-parent', position: 3 },
      E.id,
    );
    const child = await insertHelpArticle(
      sql,
      { title: 'Testwort Leaver', slug: 'testwort-leaver', parent_id: parentId, position: 1 },
      E.id,
    );

    await expect(updateHelpArticle(asUser(E), child, { parentId: null })).resolves.toMatchObject({
      parentId: null,
      position: 4,
    });
  });

  it('keeps a guide where it stands when an update gives no position', async () => {
    await insertHelpArticle(
      sql,
      { title: 'Testwort Later', slug: 'testwort-later', position: 5 },
      E.id,
    );
    const id = await insertHelpArticle(
      sql,
      { title: 'Testwort Steady', slug: 'testwort-steady', position: 2 },
      E.id,
    );

    await expect(
      updateHelpArticle(asUser(E), id, { body: 'A second body.' }),
    ).resolves.toMatchObject({ position: 2 });
  });
});

describe('showing and hiding a row', () => {
  let id: string;

  beforeEach(async () => {
    // Written by the curator, so a keeper's change shows in `updated_by`.
    id = await insertHelpArticle(sql, { title: 'Testwort Shy', slug: 'testwort-shy' }, F.id);
  });

  it('hides and shows a row as a keeper, through the audited writer', async () => {
    expect(await rowOf(id)).toMatchObject({ shown: true, updated_by: F.id });

    await expect(setHelpArticleShown(asUser(E), id, false)).resolves.toMatchObject({
      id,
      shown: false,
    });
    // A flag change is a person's edit: `updated_by` moves, so the seed leaves the row (src/db/seed/bootstrap-admin.ts, `touched`).
    expect(await rowOf(id)).toMatchObject({
      shown: false,
      updated_by: E.id,
      title: 'Testwort Shy',
      deleted_at: null,
    });

    await setHelpArticleShown(asUser(E), id, true);
    expect((await rowOf(id)).shown).toBe(true);
  });

  it.each([
    ['the curator', F],
    ['a practitioner', B],
  ])('refuses %s by direct id, leaving the row shown', async (_who, user) => {
    // Preconditions: F passes the curator check, so the refusal is the keeper line, and the row is live and shown.
    expect(assertCurator(asUser(F))).toEqual({ userId: F.id });
    expect(user.role).not.toBe('admin');
    expect(await rowOf(id)).toMatchObject({ shown: true, deleted_at: null });

    await expect(setHelpArticleShown(asUser(user), id, false)).rejects.toThrow(Forbidden);
    expect(await rowOf(id)).toMatchObject({ shown: true, updated_by: F.id });

    // Precondition: the id was right, as the keeper's same call takes it.
    await setHelpArticleShown(asUser(E), id, false);
    expect((await rowOf(id)).shown).toBe(false);
  });

  it('answers NotFound for a deleted row, an id no row holds and an id that is no id', async () => {
    const gone = await insertHelpArticle(
      sql,
      { title: 'Testwort Gone', deleted_at: new Date() },
      E.id,
    );

    await expect(setHelpArticleShown(asUser(E), gone, false)).rejects.toThrow(NotFound);
    expect((await rowOf(gone)).shown).toBe(true);
    await expect(setHelpArticleShown(asUser(E), NOWHERE, false)).rejects.toThrow(NotFound);
    await expect(setHelpArticleShown(asUser(E), 'not-an-id', false)).rejects.toThrow(NotFound);
  });

  it('hides a parent and leaves each child’s own flag as it was', async () => {
    const child = await insertHelpArticle(
      sql,
      { title: 'Testwort Shy Child', parent_id: id },
      E.id,
    );

    await setHelpArticleShown(asUser(E), id, false);

    expect((await rowOf(id)).shown).toBe(false);
    expect((await rowOf(child)).shown).toBe(true);
  });
});

describe('the keeper list', () => {
  const titlesOf = async (filter: Parameters<typeof listKeeperHelpArticles>[1]) =>
    (await listKeeperHelpArticles(asUser(E), filter, PAGE)).map((entry) => entry.node.title);

  beforeEach(async () => {
    const guide = await insertHelpArticle(sql, { title: 'Testwort Almanac Guide' }, E.id);
    await insertHelpArticle(sql, { title: 'Testwort Hidden Guide', shown: false }, E.id);
    await insertHelpArticle(
      sql,
      { title: 'Testwort Keeper Guide', audience: 'keeper', shown: false },
      E.id,
    );
    await insertHelpArticle(
      sql,
      { title: 'Testwort Almanac Page', audience: 'staff', parent_id: guide },
      E.id,
    );
    await insertHelpArticle(sql, { kind: 'faq', title: 'Testwort Almanac Question' }, E.id);
    await insertHelpArticle(sql, { kind: 'term', title: 'Testwort Bramble' }, E.id);
    await insertHelpArticle(sql, { title: 'Testwort Gone Guide', deleted_at: new Date() }, E.id);
  });

  it('lists every live row of every kind and audience, shown and hidden, A to Z, by default', async () => {
    expect(await titlesOf({})).toEqual([
      'Testwort Almanac Guide',
      'Testwort Almanac Page',
      'Testwort Almanac Question',
      'Testwort Bramble',
      'Testwort Hidden Guide',
      'Testwort Keeper Guide',
    ]);
    expect(await titlesOf({ listing: 'all' })).toEqual(await titlesOf({}));
  });

  it('lists the shown rows or the hidden rows alone', async () => {
    expect(await titlesOf({ listing: 'hidden' })).toEqual([
      'Testwort Hidden Guide',
      'Testwort Keeper Guide',
    ]);
    expect(await titlesOf({ listing: 'shown' })).toEqual([
      'Testwort Almanac Guide',
      'Testwort Almanac Page',
      'Testwort Almanac Question',
      'Testwort Bramble',
    ]);
  });

  it('narrows by kind, by audience and by words in the title, each with the others', async () => {
    expect(await titlesOf({ kind: 'faq' })).toEqual(['Testwort Almanac Question']);
    expect(await titlesOf({ audience: 'keeper' })).toEqual(['Testwort Keeper Guide']);
    expect(await titlesOf({ query: 'almanac' })).toEqual([
      'Testwort Almanac Guide',
      'Testwort Almanac Page',
      'Testwort Almanac Question',
    ]);
    expect(await titlesOf({ query: 'almanac', kind: 'article', audience: 'staff' })).toEqual([
      'Testwort Almanac Page',
    ]);
    expect(await titlesOf({ query: 'guide', listing: 'hidden', audience: 'public' })).toEqual([
      'Testwort Hidden Guide',
    ]);
  });

  it('matches words in the body as well as the title', async () => {
    await insertHelpArticle(
      sql,
      { title: 'Testwort Quiet Page', body: 'Mentions the Marshlight once.' },
      E.id,
    );

    // Precondition: no title holds the word, so a match can only come from the body.
    expect((await titlesOf({})).filter((title) => /marshlight/i.test(title))).toEqual([]);
    expect(await titlesOf({ query: 'marshlight' })).toEqual(['Testwort Quiet Page']);
  });

  it('lists the top-level rows alone, with no sub page among them', async () => {
    // Precondition: the unfiltered list holds a sub page.
    expect(await titlesOf({})).toContain('Testwort Almanac Page');

    expect(await titlesOf({ kind: 'article', topLevel: true })).toEqual([
      'Testwort Almanac Guide',
      'Testwort Hidden Guide',
      'Testwort Keeper Guide',
    ]);
  });

  it('orders by position, a row with none last, as readers meet them', async () => {
    await sql`update help_articles set position = 2 where title = 'Testwort Keeper Guide'`;
    await sql`update help_articles set position = 1 where title = 'Testwort Hidden Guide'`;

    // Precondition: A to Z puts them another way.
    expect(await titlesOf({ kind: 'article', topLevel: true })).toEqual([
      'Testwort Almanac Guide',
      'Testwort Hidden Guide',
      'Testwort Keeper Guide',
    ]);
    expect(await titlesOf({ kind: 'article', topLevel: true, order: 'position' })).toEqual([
      'Testwort Hidden Guide',
      'Testwort Keeper Guide',
      'Testwort Almanac Guide',
    ]);
  });

  it('pages through the cursor helper, two rows at a time, to the list read whole', async () => {
    const whole = await titlesOf({});
    const walked: string[] = [];
    let after: PageRequest['after'];
    for (let pages = 0; pages < 10; pages += 1) {
      const entries = await listKeeperHelpArticles(
        asUser(E),
        {},
        { limit: 2, inverted: false, after },
      );
      if (entries.length === 0) break;
      walked.push(...entries.map((entry) => entry.node.title));
      after = entries[entries.length - 1].cursor;
    }

    expect(walked).toEqual(whole);
  });

  it.each([
    ['the curator', F],
    ['a practitioner', B],
  ])('refuses %s', async (_who, user) => {
    // Precondition: F passes the curator check, so the refusal is the keeper line.
    expect(assertCurator(asUser(F))).toEqual({ userId: F.id });

    await expect(listKeeperHelpArticles(asUser(user), {}, PAGE)).rejects.toThrow(Forbidden);
    await expect(listKeeperHelpArticles(asUser(user), { listing: 'hidden' }, PAGE)).rejects.toThrow(
      Forbidden,
    );
  });
});

describe('a parent choosing its children', () => {
  let parentId: string;

  const childrenOf = async (id: string) =>
    (await readKeeperHelpArticle(asUser(E), id)).children.map((child) => child.id);

  const top = (title: string, seed: Parameters<typeof insertHelpArticle>[1] = {}) =>
    insertHelpArticle(sql, { title, ...seed }, E.id);

  beforeEach(async () => {
    parentId = await top('Testwort Parent', { slug: 'testwort-parent', position: 3 });
  });

  it('makes the listed articles its children, each positioned by its place in the list', async () => {
    const first = await top('Testwort First');
    const second = await top('Testwort Second');

    await updateHelpArticle(asUser(E), parentId, { childIds: [second, first] });

    expect(await rowOf(second)).toMatchObject({
      parent_id: parentId,
      position: 1,
      updated_by: E.id,
    });
    expect(await rowOf(first)).toMatchObject({ parent_id: parentId, position: 2 });
    expect(await childrenOf(parentId)).toEqual([second, first]);
  });

  it('takes its children on create too', async () => {
    const first = await top('Testwort First');

    const created = await createHelpArticle(asUser(E), {
      ...article,
      title: 'Testwort New Parent',
      childIds: [first],
    });

    expect(await rowOf(first)).toMatchObject({ parent_id: created.id, position: 1 });
  });

  it('reorders its children by the list, and reads them back in that order for the editor', async () => {
    const one = await top('Testwort One', { parent_id: parentId, position: 1 });
    const two = await top('Testwort Two', { parent_id: parentId, position: 2 });
    const three = await top('Testwort Three', { parent_id: parentId, position: 3 });
    expect(await childrenOf(parentId)).toEqual([one, two, three]);

    await updateHelpArticle(asUser(E), parentId, { childIds: [three, one, two] });

    expect(await childrenOf(parentId)).toEqual([three, one, two]);
    expect((await rowOf(three)).position).toBe(1);
    expect((await rowOf(one)).position).toBe(2);
    expect((await rowOf(two)).position).toBe(3);
  });

  it('releases a live child left out of the list to the top level, after the last top-level article', async () => {
    await top('Testwort Last Top', { position: 7 });
    const kept = await top('Testwort Kept', { parent_id: parentId, position: 1 });
    const released = await top('Testwort Released', { parent_id: parentId, position: 2 });

    await updateHelpArticle(asUser(E), parentId, { childIds: [kept] });

    expect(await rowOf(released)).toMatchObject({ parent_id: null, position: 8, updated_by: E.id });
    expect(await rowOf(kept)).toMatchObject({ parent_id: parentId, position: 1 });
    expect(await childrenOf(parentId)).toEqual([kept]);
  });

  it('releases every child for an empty list, and leaves the children alone when childIds is left out', async () => {
    const child = await top('Testwort Child', { parent_id: parentId, position: 1 });

    await updateHelpArticle(asUser(E), parentId, { title: 'Testwort Parent Renamed' });
    expect((await rowOf(child)).parent_id).toBe(parentId);

    await updateHelpArticle(asUser(E), parentId, { childIds: [] });
    expect((await rowOf(child)).parent_id).toBeNull();
    expect(await childrenOf(parentId)).toEqual([]);
  });

  it('moves an article another parent holds, leaving that parent its other children', async () => {
    const otherParent = await top('Testwort Other Parent');
    const moved = await top('Testwort Moved', { parent_id: otherParent, position: 1 });
    const stays = await top('Testwort Stays', { parent_id: otherParent, position: 2 });

    await updateHelpArticle(asUser(E), parentId, { childIds: [moved] });

    expect(await rowOf(moved)).toMatchObject({ parent_id: parentId, position: 1 });
    expect(await childrenOf(otherParent)).toEqual([stays]);
  });

  it('lets a parent narrow its audience in the save that releases its wider child', async () => {
    const wide = await top('Testwort Wide Child', { parent_id: parentId, position: 1 });
    // Precondition: with the child still beneath it, the parent may not narrow.
    await expectRefusedAt(
      updateHelpArticle(asUser(E), parentId, { audience: 'staff' }),
      'audience',
    );

    await updateHelpArticle(asUser(E), parentId, { audience: 'staff', childIds: [] });

    expect(await rowOf(parentId)).toMatchObject({ audience: 'staff' });
    expect((await rowOf(wide)).parent_id).toBeNull();
  });

  it.each([
    ['an FAQ entry', { kind: 'faq' as const }],
    ['a glossary term', { kind: 'term' as const }],
    ['a deleted article', { deleted_at: new Date() }],
  ])('refuses %s as a child', async (_what, seed) => {
    const notChild = await insertHelpArticle(sql, seed, E.id);

    await expectRefusedAt(
      updateHelpArticle(asUser(E), parentId, { childIds: [notChild] }),
      'childIds',
    );
    expect((await rowOf(notChild)).parent_id).toBeNull();
  });

  it('refuses an id no row holds, the article itself and an id listed twice', async () => {
    const child = await top('Testwort Child');

    await expectRefusedAt(
      updateHelpArticle(asUser(E), parentId, { childIds: [NOWHERE] }),
      'childIds',
    );
    await expectRefusedAt(
      updateHelpArticle(asUser(E), parentId, { childIds: [parentId] }),
      'childIds',
    );
    await expectRefusedAt(
      updateHelpArticle(asUser(E), parentId, { childIds: [child, child] }),
      'childIds',
    );
    expect(await rowOf(parentId)).toMatchObject({ parent_id: null });
    expect((await rowOf(child)).parent_id).toBeNull();
  });

  it('refuses an article with live children of its own, since help nests one level', async () => {
    const holder = await top('Testwort Holder');
    await top('Testwort Held', { parent_id: holder });

    await expectRefusedAt(
      updateHelpArticle(asUser(E), parentId, { childIds: [holder] }),
      'childIds',
    );
    expect((await rowOf(holder)).parent_id).toBeNull();
  });

  it('refuses a child wider than the parent', async () => {
    const staffParent = await top('Testwort Staff Parent', { audience: 'staff' });
    const publicChild = await top('Testwort Public Child');
    const keeperChild = await top('Testwort Keeper Child', { audience: 'keeper' });

    await expectRefusedAt(
      updateHelpArticle(asUser(E), staffParent, { childIds: [publicChild] }),
      'childIds',
    );
    expect((await rowOf(publicChild)).parent_id).toBeNull();

    // Precondition: a narrower child is taken.
    await updateHelpArticle(asUser(E), staffParent, { childIds: [keeperChild] });
    expect((await rowOf(keeperChild)).parent_id).toBe(staffParent);
  });

  it('refuses children on an article that has a parent, and on a row that is not an article', async () => {
    const child = await top('Testwort Child', { parent_id: parentId });
    const free = await top('Testwort Free');
    const faq = await insertHelpArticle(sql, { kind: 'faq', title: 'Testwort Question' }, E.id);

    await expectRefusedAt(updateHelpArticle(asUser(E), child, { childIds: [free] }), 'childIds');
    await expectRefusedAt(
      createHelpArticle(asUser(E), {
        ...article,
        title: 'Testwort New Child',
        parentId,
        childIds: [free],
      }),
      'childIds',
    );
    await expectRefusedAt(updateHelpArticle(asUser(E), faq, { childIds: [free] }), 'childIds');
    expect((await rowOf(free)).parent_id).toBeNull();
  });

  it('refuses a parent with live children taking a parent of its own', async () => {
    await top('Testwort Child', { parent_id: parentId });
    const other = await top('Testwort Other');

    await expectRefusedAt(updateHelpArticle(asUser(E), parentId, { parentId: other }), 'parentId');
    expect((await rowOf(parentId)).parent_id).toBeNull();
  });

  it('writes nothing of a save it refuses: not the parent’s own fields, nor any child’s place', async () => {
    const one = await top('Testwort One', { parent_id: parentId, position: 1 });
    const two = await top('Testwort Two', { parent_id: parentId, position: 2 });
    const free = await top('Testwort Free');
    const faq = await insertHelpArticle(sql, { kind: 'faq', title: 'Testwort Question' }, E.id);
    const before = await Promise.all([parentId, one, two, free, faq].map(rowOf));

    // The refused id is last, so a write that ran child by child would have moved the others first.
    await expectRefusedAt(
      updateHelpArticle(asUser(E), parentId, {
        title: 'Testwort Parent Renamed',
        childIds: [free, two, faq],
      }),
      'childIds',
    );

    expect(await Promise.all([parentId, one, two, free, faq].map(rowOf))).toEqual(before);
  });

  it.each([
    ['the curator', F],
    ['a practitioner', B],
  ])(
    'refuses %s a save of children by direct id, leaving every child where it was',
    async (_who, user) => {
      const child = await top('Testwort Child', { parent_id: parentId, position: 1 });
      const free = await top('Testwort Free');
      // Precondition: F passes the curator check, so the refusal is the keeper line.
      expect(assertCurator(asUser(F))).toEqual({ userId: F.id });

      await expect(updateHelpArticle(asUser(user), parentId, { childIds: [free] })).rejects.toThrow(
        Forbidden,
      );
      await expect(readKeeperHelpArticle(asUser(user), parentId)).rejects.toThrow(Forbidden);
      expect((await rowOf(child)).parent_id).toBe(parentId);
      expect((await rowOf(free)).parent_id).toBeNull();

      // Precondition: the keeper's same call is taken.
      await updateHelpArticle(asUser(E), parentId, { childIds: [free] });
      expect((await rowOf(free)).parent_id).toBe(parentId);
    },
  );
});

describe('the keeper’s read of one row for editing', () => {
  it('answers a hidden row with every live child, of every audience and hidden too, in position order', async () => {
    const parentId = await insertHelpArticle(
      sql,
      { title: 'Testwort Hidden Parent', shown: false },
      E.id,
    );
    const second = await insertHelpArticle(
      sql,
      { title: 'Testwort Keeper Page', audience: 'keeper', parent_id: parentId, position: 2 },
      E.id,
    );
    const first = await insertHelpArticle(
      sql,
      { title: 'Testwort Hidden Page', shown: false, parent_id: parentId, position: 1 },
      E.id,
    );
    await insertHelpArticle(
      sql,
      { title: 'Testwort Gone Page', parent_id: parentId, position: 0, deleted_at: new Date() },
      E.id,
    );

    const read = await readKeeperHelpArticle(asUser(E), parentId);

    expect(read).toMatchObject({ id: parentId, shown: false });
    expect(read.children.map((child) => child.id)).toEqual([first, second]);
  });

  it('answers NotFound for a deleted row and an id that is no id', async () => {
    const gone = await insertHelpArticle(
      sql,
      { title: 'Testwort Gone', deleted_at: new Date() },
      E.id,
    );

    await expect(readKeeperHelpArticle(asUser(E), gone)).rejects.toThrow(NotFound);
    await expect(readKeeperHelpArticle(asUser(E), 'not-an-id')).rejects.toThrow(NotFound);
  });
});
