import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden, NotFound, ValidationError } from '@/lib/errors';
import { resolvePage } from '@/lib/pagination';
import type { Session } from '@/lib/session';
import {
  createReference,
  createWorkspaceIngredient,
  referencesOf,
  suggestReferences,
  updateReference,
} from '@/modules/ingredients';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertReference } from '../../../support/db/insert-reference';

// MB.153: a reference written in its tier — the compendium's under the
// SiteAdmin proof alone, a coven's under its Membership, whoever cites it —
// and the picker's search, scoped to the compendium and the current coven
// (DESIGN.md §5, "References"). Both tables are emptied per test, so every
// row a result could come from is one this file wrote.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate ingredients, "references" cascade`;
});

const BOOK = {
  kind: 'book' as const,
  authors: 'Testwort, Fixtura',
  title: 'A Herbal of Fixture Covens',
  place: 'Testford',
  publisher: 'Fixture Press',
  published: '1988',
};

/** The issues a refused write carried, by path and message. */
async function refusal(write: Promise<unknown>) {
  const error = await write.catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(ValidationError);
  return (error as ValidationError).issues;
}

/** A reference's row as the table holds it. */
async function rowOf(id: string) {
  const [row] = await sql`
    select workspace_id, authors, title, place, created_by, updated_by
    from "references" where id = ${id}`;
  return row;
}

describe('createReference', () => {
  it('writes a compendium reference for a site admin', async () => {
    const created = await createReference(asUser(E), null, BOOK);

    expect(created).toMatchObject({ workspaceId: null, title: BOOK.title, kind: 'book' });
    expect(await rowOf(created.id)).toMatchObject({ workspace_id: null, created_by: E.id });
  });

  it('writes a coven’s reference for its member, in the coven of the proof', async () => {
    const created = await createReference(asUser(B), WORKSPACE_W_ID, BOOK);

    expect(await rowOf(created.id)).toMatchObject({
      workspace_id: WORKSPACE_W_ID,
      created_by: B.id,
    });
  });

  // The same input the admin's write above saves: the proof is what refuses,
  // checked before the input is read.
  it('refuses a compendium reference to anyone but a site admin, before reading the input', async () => {
    await expect(createReference(asUser(A), null, BOOK)).rejects.toThrow(Forbidden);
    await expect(createReference(asUser(B), null, { kind: 'book' } as never)).rejects.toThrow(
      Forbidden,
    );
  });

  it.each([
    ['a viewer of the coven', C],
    ['a member of another coven', D],
    ['a site admin, who reaches no coven', E],
  ])('refuses a coven’s reference to %s', async (_who, user) => {
    await expect(createReference(asUser(user), WORKSPACE_W_ID, BOOK)).rejects.toThrow(Forbidden);
  });

  // DESIGN.md §5's CHECKs, refused by the shared schema before the table sees
  // them: each issue on the field that failed, never a constraint's name.
  it.each([
    [
      'a web page with no address or day',
      { kind: 'web_page', title: 'Testwort' },
      ['url', 'accessed'],
    ],
    ['a chapter with no book', { kind: 'chapter', title: 'On Testwort' }, ['container']],
    ['an article with no journal', { kind: 'article', title: 'On Testwort' }, ['container']],
    ['an entry with no reference work', { kind: 'entry', title: 'Testwort' }, ['container']],
    ['a book with no date', { kind: 'book', title: 'Fixtures' }, ['published']],
    ['a relative address', { ...BOOK, url: 'example.org/a' }, ['url']],
    ['a day read with no address', { ...BOOK, accessed: '2026-10-06' }, ['accessed']],
    ['a blank title', { ...BOOK, title: '  ' }, ['title']],
  ])('refuses %s, pathed to the field', async (_case, input, fields) => {
    const issues = await refusal(createReference(asUser(B), WORKSPACE_W_ID, input as never));

    expect(issues.map((issue) => issue.path)).toEqual(fields.map((field) => [field]));
    for (const { message } of issues) expect(message).not.toMatch(/references_|violates/);
  });
});

describe('updateReference', () => {
  it('replaces a compendium reference for a site admin, clearing a field left out', async () => {
    const id = await insertReference(
      sql,
      { authors: 'Testwort, Fixtura', place: 'Testford' },
      E.id,
    );

    const { authors: _, ...withoutAuthors } = BOOK;
    const updated = await updateReference(asUser(E), null, id, {
      ...withoutAuthors,
      title: 'A Second Herbal',
    });

    expect(updated).toMatchObject({ title: 'A Second Herbal', authors: null });
    expect(await rowOf(id)).toMatchObject({ authors: null, place: 'Testford', updated_by: E.id });
  });

  it('replaces a coven’s reference for its member', async () => {
    const id = await insertReference(sql, { workspace_id: WORKSPACE_W_ID }, A.id);

    await updateReference(asUser(B), WORKSPACE_W_ID, id, { ...BOOK, title: 'Retitled' });

    expect(await rowOf(id)).toMatchObject({ title: 'Retitled', updated_by: B.id });
  });

  // The precondition: B's ingredient cites it, and B reads it there. Citing a
  // reference is not owning it, under either argument a member could send.
  it('refuses a member the compendium reference their ingredient cites, by direct id', async () => {
    const id = await insertReference(sql, { title: 'Compendium Herbal' }, E.id);
    const ingredient = await createWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, {
      name: 'Testwort',
      references: [{ referenceId: id }],
    });
    const [cited] = await referencesOf(asUser(B), [ingredient]);
    expect(cited).toEqual([
      expect.objectContaining({ reference: expect.objectContaining({ id }) }),
    ]);

    await expect(
      updateReference(asUser(B), WORKSPACE_W_ID, id, { ...BOOK, title: 'Hijacked' }),
    ).rejects.toThrow(NotFound);
    await expect(
      updateReference(asUser(B), null, id, { ...BOOK, title: 'Hijacked' }),
    ).rejects.toThrow(Forbidden);
    expect(await rowOf(id)).toMatchObject({ title: 'Compendium Herbal', updated_by: E.id });
  });

  it('refuses another coven’s reference, by direct id under either coven', async () => {
    const id = await insertReference(
      sql,
      { workspace_id: WORKSPACE_W_ID, title: 'W Herbal' },
      A.id,
    );

    await expect(updateReference(asUser(D), WORKSPACE_X_ID, id, BOOK)).rejects.toThrow(NotFound);
    await expect(updateReference(asUser(D), WORKSPACE_W_ID, id, BOOK)).rejects.toThrow(Forbidden);
    expect(await rowOf(id)).toMatchObject({ title: 'W Herbal' });
  });

  it('refuses a coven’s reference to a site admin, who writes only the compendium', async () => {
    const id = await insertReference(
      sql,
      { workspace_id: WORKSPACE_W_ID, title: 'W Herbal' },
      A.id,
    );

    await expect(updateReference(asUser(E), null, id, BOOK)).rejects.toThrow(NotFound);
    await expect(updateReference(asUser(E), WORKSPACE_W_ID, id, BOOK)).rejects.toThrow(Forbidden);
  });

  it('refuses a viewer', async () => {
    const id = await insertReference(sql, { workspace_id: WORKSPACE_W_ID }, A.id);

    await expect(updateReference(asUser(C), WORKSPACE_W_ID, id, BOOK)).rejects.toThrow(Forbidden);
  });

  it('answers NotFound for a soft-deleted reference and for an id that is not one', async () => {
    const id = await insertReference(sql, { workspace_id: WORKSPACE_W_ID }, A.id);
    await sql`update "references" set deleted_at = now(), deleted_by = ${A.id} where id = ${id}`;

    await expect(updateReference(asUser(B), WORKSPACE_W_ID, id, BOOK)).rejects.toThrow(NotFound);
    await expect(updateReference(asUser(B), WORKSPACE_W_ID, 'not-an-id', BOOK)).rejects.toThrow(
      NotFound,
    );
  });

  it('refuses an update that breaks the shared schema, pathed to the field', async () => {
    const id = await insertReference(sql, { workspace_id: WORKSPACE_W_ID }, A.id);

    const issues = await refusal(
      updateReference(asUser(B), WORKSPACE_W_ID, id, { kind: 'chapter', title: 'On Testwort' }),
    );
    expect(issues.map((issue) => issue.path)).toEqual([['container']]);
  });
});

describe('suggestReferences', () => {
  async function titles(session: Session, workspaceId: string, query: string) {
    const page = await resolvePage({ first: 10 }, (request) =>
      suggestReferences(session, workspaceId, query, request),
    );
    return page.edges.map((edge) => edge.node.title);
  }

  const anyPage = { limit: 11, inverted: false };

  it('offers the compendium’s references and this coven’s, never another coven’s', async () => {
    await insertReference(sql, { title: 'Testwort in the Compendium' }, E.id);
    await insertReference(sql, { workspace_id: WORKSPACE_W_ID, title: 'Testwort at W' }, A.id);
    await insertReference(sql, { workspace_id: WORKSPACE_X_ID, title: 'Testwort at X' }, D.id);
    // The precondition: X's reference matches the query, as its own member sees.
    expect(await titles(asUser(D), WORKSPACE_X_ID, 'testwort')).toContain('Testwort at X');

    expect((await titles(asUser(B), WORKSPACE_W_ID, 'testwort')).sort()).toEqual([
      'Testwort at W',
      'Testwort in the Compendium',
    ]);
    expect((await titles(asUser(B), WORKSPACE_W_ID, '')).sort()).toEqual([
      'Testwort at W',
      'Testwort in the Compendium',
    ]);
  });

  it('matches the authors, the title and the container, accent-folded', async () => {
    await insertReference(sql, { title: 'Perkūnas', kind: 'entry', container: 'Fixturalis' }, E.id);
    await insertReference(sql, { title: 'Fixtures', authors: 'Mockley, Nettle' }, E.id);
    await insertReference(
      sql,
      { title: 'On Grinding', kind: 'chapter', container: 'The Mortar Reader' },
      E.id,
    );
    await insertReference(sql, { title: 'Unrelated' }, E.id);

    expect(await titles(asUser(B), WORKSPACE_W_ID, 'perkunas')).toEqual(['Perkūnas']);
    expect(await titles(asUser(B), WORKSPACE_W_ID, 'mockley')).toEqual(['Fixtures']);
    expect(await titles(asUser(B), WORKSPACE_W_ID, 'mortar')).toEqual(['On Grinding']);
  });

  it('lists everything by title on a blank query, and leaves out a soft-deleted reference', async () => {
    await insertReference(sql, { title: 'Bitterroot' }, E.id);
    const gone = await insertReference(sql, { title: 'Cinderbark' }, E.id);
    await insertReference(sql, { workspace_id: WORKSPACE_W_ID, title: 'Asheleaf' }, A.id);
    await sql`update "references" set deleted_at = now(), deleted_by = ${E.id} where id = ${gone}`;

    expect(await titles(asUser(C), WORKSPACE_W_ID, ' ')).toEqual(['Asheleaf', 'Bitterroot']);
  });

  it('refuses someone outside the coven, a site admin included', async () => {
    await expect(suggestReferences(asUser(D), WORKSPACE_W_ID, '', anyPage)).rejects.toThrow(
      Forbidden,
    );
    await expect(suggestReferences(asUser(E), WORKSPACE_W_ID, '', anyPage)).rejects.toThrow(
      Forbidden,
    );
  });
});
