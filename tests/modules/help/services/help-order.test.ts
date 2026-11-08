import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { Forbidden, ValidationError } from '@/lib/errors';
import { orderHelpFaq, orderHelpGuides } from '@/modules/help';
import { assertCurator } from '@/modules/identity';
import { B, D, E, F, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertHelpArticle } from '../../../support/db/insert-help-article';

// Signed-out callers are refused at the GraphQL scope (tests/db/graphql-query-scopes.test.ts); a service is never called without a session.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate help_articles cascade`;
});

const placesOf = async (ids: readonly string[]) => {
  const rows = await sql`
    select id, position, updated_by from help_articles where id = any(${[...ids]}::uuid[])`;
  return new Map(rows.map((row) => [row.id as string, row]));
};

async function expectRefused(promise: Promise<unknown>) {
  const error = await promise.then(
    () => {
      throw new Error('accepted where it should have been refused');
    },
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(ValidationError);
  expect((error as ValidationError).message).not.toBe(new ValidationError([]).message);
}

/** Three live top-level guides, two public (the second hidden) and a keeper one, placed 1, 2, 3, written by B so a keeper's write shows in updated_by. */
async function threeGuides() {
  const first = await insertHelpArticle(sql, { position: 1 }, B.id);
  const hidden = await insertHelpArticle(sql, { position: 2, shown: false }, B.id);
  const last = await insertHelpArticle(sql, { position: 3, audience: 'keeper' }, B.id);
  return { first, hidden, last };
}

async function threeFaqs() {
  const first = await insertHelpArticle(sql, { kind: 'faq', position: 1 }, B.id);
  const hidden = await insertHelpArticle(sql, { kind: 'faq', position: 2, shown: false }, B.id);
  const last = await insertHelpArticle(sql, { kind: 'faq', position: 3 }, B.id);
  return { first, hidden, last };
}

describe('orderHelpGuides', () => {
  it('places every live top-level guide 1, 2, 3 in the order given, hidden ones included, as the keeper', async () => {
    const { first, hidden, last } = await threeGuides();

    const placed = await orderHelpGuides(asUser(E), [hidden, first, last]);

    expect(placed.map((guide) => guide.id)).toEqual([hidden, first, last]);
    const places = await placesOf([first, hidden, last]);
    expect(places.get(hidden)?.position).toBe(1);
    expect(places.get(first)?.position).toBe(2);
    expect(places.get(last)?.position).toBe(3);
    for (const id of [first, hidden]) expect(places.get(id)?.updated_by).toBe(E.id);
  });

  it('leaves sub pages, FAQ entries and soft-deleted guides where they were', async () => {
    const { first, hidden, last } = await threeGuides();
    const child = await insertHelpArticle(sql, { parent_id: first, position: 1 }, B.id);
    const faq = await insertHelpArticle(sql, { kind: 'faq', position: 1 }, B.id);
    const gone = await insertHelpArticle(sql, { position: 4, deleted_at: new Date() }, B.id);

    await orderHelpGuides(asUser(E), [hidden, first, last]);

    const places = await placesOf([child, faq, gone]);
    for (const id of [child, faq, gone]) expect(places.get(id)?.updated_by).toBe(B.id);
    expect(places.get(child)?.position).toBe(1);
    expect(places.get(gone)?.position).toBe(4);
  });

  describe('refuses a list that is not every live guide exactly once', () => {
    it('when a guide is missing', async () => {
      const { first, hidden } = await threeGuides();
      await expectRefused(orderHelpGuides(asUser(E), [hidden, first]));
    });

    it('when a guide appears twice', async () => {
      const { first, hidden, last } = await threeGuides();
      await expectRefused(orderHelpGuides(asUser(E), [first, hidden, last, first]));
    });

    it('when the list holds a sub page', async () => {
      const { first, hidden, last } = await threeGuides();
      const child = await insertHelpArticle(sql, { parent_id: first, position: 1 }, B.id);
      await expectRefused(orderHelpGuides(asUser(E), [first, hidden, last, child]));
    });

    it('when the list holds an FAQ entry', async () => {
      const { first, hidden, last } = await threeGuides();
      const faq = await insertHelpArticle(sql, { kind: 'faq', position: 1 }, B.id);
      await expectRefused(orderHelpGuides(asUser(E), [first, hidden, last, faq]));
    });

    it('when the list holds a soft-deleted guide', async () => {
      const { first, hidden, last } = await threeGuides();
      const gone = await insertHelpArticle(sql, { position: 4, deleted_at: new Date() }, B.id);
      await expectRefused(orderHelpGuides(asUser(E), [first, hidden, last, gone]));
    });

    it('when an id is not an id', async () => {
      const { first, hidden } = await threeGuides();
      await expectRefused(orderHelpGuides(asUser(E), [first, hidden, 'not-an-id']));
    });

    it('when it moves a guide out of its audience: Public, then Staff, then Keeper', async () => {
      const { first, hidden, last } = await threeGuides();
      const staff = await insertHelpArticle(sql, { position: 4, audience: 'staff' }, B.id);
      await expectRefused(orderHelpGuides(asUser(E), [first, last, hidden, staff]));
      await expectRefused(orderHelpGuides(asUser(E), [first, hidden, last, staff]));
      const places = await placesOf([first, hidden, last, staff]);
      expect([first, hidden, last, staff].map((id) => places.get(id)?.position)).toEqual([
        1, 2, 3, 4,
      ]);
    });

    it('and writes nothing when refused', async () => {
      const { first, hidden, last } = await threeGuides();
      await orderHelpGuides(asUser(E), [first, hidden]).catch(() => undefined);
      const places = await placesOf([first, hidden, last]);
      expect([first, hidden, last].map((id) => places.get(id)?.position)).toEqual([1, 2, 3]);
    });
  });

  describe('refuses anyone but a keeper, by the guides’ own ids', () => {
    it('a curator, who passes the curator check', async () => {
      const { first, hidden, last } = await threeGuides();
      expect(F.role).not.toBe('admin');
      expect(() => assertCurator(asUser(F))).not.toThrow();

      await expect(orderHelpGuides(asUser(F), [hidden, first, last])).rejects.toThrow(Forbidden);
      const places = await placesOf([first, hidden, last]);
      expect([first, hidden, last].map((id) => places.get(id)?.position)).toEqual([1, 2, 3]);
    });

    it('a practitioner and another coven’s member', async () => {
      const { first, hidden, last } = await threeGuides();
      for (const user of [B, D]) {
        expect(user.role).not.toBe('admin');
        await expect(orderHelpGuides(asUser(user), [hidden, first, last])).rejects.toThrow(
          Forbidden,
        );
      }
      const places = await placesOf([first, hidden, last]);
      expect([first, hidden, last].map((id) => places.get(id)?.position)).toEqual([1, 2, 3]);
    });
  });
});

describe('orderHelpFaq', () => {
  it('places every live FAQ entry 1, 2, 3 in the order given, hidden ones included, as the keeper', async () => {
    const { first, hidden, last } = await threeFaqs();
    const guide = await insertHelpArticle(sql, { position: 1 }, B.id);

    const placed = await orderHelpFaq(asUser(E), [hidden, last, first]);

    expect(placed.map((entry) => entry.id)).toEqual([hidden, last, first]);
    const places = await placesOf([first, hidden, last, guide]);
    expect(places.get(hidden)?.position).toBe(1);
    expect(places.get(last)?.position).toBe(2);
    expect(places.get(first)?.position).toBe(3);
    for (const id of [first, hidden, last]) expect(places.get(id)?.updated_by).toBe(E.id);
    expect(places.get(guide)?.updated_by).toBe(B.id);
  });

  it('refuses a list missing an entry, or holding a guide', async () => {
    const { first, hidden, last } = await threeFaqs();
    const guide = await insertHelpArticle(sql, { position: 1 }, B.id);
    await expectRefused(orderHelpFaq(asUser(E), [first, hidden]));
    await expectRefused(orderHelpFaq(asUser(E), [first, hidden, last, guide]));
  });

  it('refuses a curator, a practitioner and another coven’s member', async () => {
    const { first, hidden, last } = await threeFaqs();
    expect(() => assertCurator(asUser(F))).not.toThrow();
    for (const user of [F, B, D]) {
      expect(user.role).not.toBe('admin');
      await expect(orderHelpFaq(asUser(user), [last, hidden, first])).rejects.toThrow(Forbidden);
    }
    const places = await placesOf([first, hidden, last]);
    expect([first, hidden, last].map((id) => places.get(id)?.position)).toEqual([1, 2, 3]);
  });
});
