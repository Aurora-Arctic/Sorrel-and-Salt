import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { Forbidden, NotFound, ValidationError } from '@/lib/errors';
import { slugify } from '@/lib/slugify';
import type { PageRequest } from '@/lib/types';
import {
  createHelpArticle,
  deleteHelpArticle,
  listStaffHelpArticles,
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
    select kind, audience, title, slug, position, parent_id, deleted_at, created_by, updated_by
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
      position: null,
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

  it('runs a slug the keeper gives through slugify too', async () => {
    const created = await createHelpArticle(asUser(E), {
      ...article,
      title: 'Testwort Hidden Title',
      slug: '  Testwort Custom Address! ',
    });

    expect(created.slug).toBe(slugify('  Testwort Custom Address! '));
  });

  it.each(['glossary', 'staff', 'search'])(
    'refuses the reserved slug %s on create, from the title or given',
    async (word) => {
      const title = word[0].toUpperCase() + word.slice(1);
      // Precondition: the title derives the reserved word, and nothing else holds it.
      expect(slugify(title)).toBe(word);
      expect(await liveCount()).toBe(0);

      await expectRefusedAt(createHelpArticle(asUser(E), { ...article, title }), 'slug');
      await expectRefusedAt(
        createHelpArticle(asUser(E), { ...article, title: 'Testwort Elsewhere', slug: title }),
        'slug',
      );
      expect(await liveCount()).toBe(0);
    },
  );

  it.each(['glossary', 'staff', 'search'])(
    'refuses the reserved slug %s on rename',
    async (word) => {
      const id = await insertHelpArticle(
        sql,
        { title: 'Testwort Renamable', slug: 'testwort-renamable' },
        E.id,
      );

      await expectRefusedAt(updateHelpArticle(asUser(E), id, { slug: word }), 'slug');
      expect((await rowOf(id)).slug).toBe('testwort-renamable');
    },
  );

  it('refuses a slug a live row of the same kind holds, on create and on rename, and frees it once that row is deleted', async () => {
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
      'slug',
    );
    await expectRefusedAt(updateHelpArticle(asUser(E), other, { slug: 'testwort-twin' }), 'slug');
    expect((await rowOf(other)).slug).toBe('testwort-other');

    await sql`update help_articles set deleted_at = now(), deleted_by = ${E.id} where id = ${twin}`;
    const created = await createHelpArticle(asUser(E), { ...article, title: 'Testwort Twin' });
    expect(created.slug).toBe('testwort-twin');
  });

  it('refuses a second term under a live term’s slug', async () => {
    await insertHelpArticle(
      sql,
      { kind: 'term', title: 'Testwort Twin', slug: 'testwort-twin' },
      E.id,
    );

    await expectRefusedAt(
      createHelpArticle(asUser(E), { kind: 'term', title: 'Testwort Twin', body: 'Twice.' }),
      'slug',
    );
  });

  it.each([
    ['a term', { kind: 'term' as const }],
    ['an FAQ entry', { kind: 'faq' as const, position: 1 }],
  ])(
    'creates %s under a live article’s slug, since a slug is unique within its kind',
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

  it('creates an article under a live term’s slug', async () => {
    await insertHelpArticle(
      sql,
      { kind: 'term', title: 'Testwort Twin', slug: 'testwort-twin' },
      E.id,
    );

    const created = await createHelpArticle(asUser(E), { ...article, title: 'Testwort Twin' });

    expect(created.slug).toBe('testwort-twin');
  });

  it('renames a term to a live article’s slug', async () => {
    await insertHelpArticle(sql, { title: 'Testwort Twin', slug: 'testwort-twin' }, E.id);
    const term = await insertHelpArticle(
      sql,
      { kind: 'term', title: 'Testwort Other', slug: 'testwort-other' },
      E.id,
    );

    const renamed = await updateHelpArticle(asUser(E), term, { slug: 'testwort-twin' });

    expect(renamed.slug).toBe('testwort-twin');
    expect((await rowOf(term)).slug).toBe('testwort-twin');
  });

  it.each([
    ['a term', { kind: 'term' as const }],
    ['an FAQ entry', { kind: 'faq' as const, position: 1 }],
  ])('refuses %s a reserved slug on create', async (_kind, shape) => {
    for (const title of ['Glossary', 'Staff', 'Search']) {
      await expectRefusedAt(
        createHelpArticle(asUser(E), { ...shape, title, body: 'Reserved.' }),
        'slug',
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
