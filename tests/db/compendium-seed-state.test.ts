import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { failureOf, useTestDatabase } from '../support/db/database';
import { ingredientColumns, makeIngredient } from '../support/fixtures';
import { FIXTURE_USERS } from '@/db/seed/standard';

// Migration 0081 (M14.5): the three columns that let the compendium seed tell
// a changed file from an unchanged one and keep its hands off a reviewed
// entry. They are state about the row, not content of it, so the updated_at
// trigger ignores them (claude-docs/db/updated-at.md, "updated_at is the
// database's"). Behaviour, not the function's text: a later migration may
// rewrite the body again, as 0079 and 0081 did, and this test must keep
// holding it to the same promise.

const A = FIXTURE_USERS.A.id;
const B = FIXTURE_USERS.B.id;
const THE_MILLENNIUM = '2000-01-01 00:00:00';
const A_HASH = 'a'.repeat(64);
const ANOTHER_HASH = 'b'.repeat(64);

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

/** A compendium row stamped in 2000 by A, so a bumped stamp is unmistakable. */
async function insertBackdated(extra: Record<string, unknown> = {}): Promise<string> {
  const id = randomUUID();
  await sql`insert into ingredients ${sql({
    id,
    ...ingredientColumns(makeIngredient()),
    created_by: A,
    updated_by: A,
    created_at: THE_MILLENNIUM,
    updated_at: THE_MILLENNIUM,
    ...extra,
  })}`;
  return id;
}

async function stampsOf(id: string) {
  const [row] = await sql<{ updated_at: Date; updated_by: string }[]>`
    select updated_at, updated_by from ingredients where id = ${id}
  `;
  return row;
}

beforeEach(async () => {
  await sql`truncate table ingredients cascade`;
});

describe('the compendium seed state columns', () => {
  describe('refuse', () => {
    it('a hash of 63 characters', async () => {
      const error = await failureOf(insertBackdated({ seed_content_hash: 'a'.repeat(63) }));
      expect(error.constraint_name).toBe('ingredients_seed_content_hash_is_sha256');
    });

    it('a hash that is not lower-case hex', async () => {
      const error = await failureOf(insertBackdated({ seed_content_hash: 'A'.repeat(64) }));
      expect(error.constraint_name).toBe('ingredients_seed_content_hash_is_sha256');
      const notHex = await failureOf(insertBackdated({ seed_content_hash: 'g'.repeat(64) }));
      expect(notHex.constraint_name).toBe('ingredients_seed_content_hash_is_sha256');
    });

    it('a review mark with only its time, and one with only its reviewer', async () => {
      const timeOnly = await failureOf(insertBackdated({ curator_reviewed_at: new Date() }));
      expect(timeOnly.constraint_name).toBe('ingredients_curator_review_both_or_neither');
      const reviewerOnly = await failureOf(insertBackdated({ curator_reviewed_by: A }));
      expect(reviewerOnly.constraint_name).toBe('ingredients_curator_review_both_or_neither');
    });

    it('a reviewer who is not a user', async () => {
      const error = await failureOf(
        insertBackdated({ curator_reviewed_at: new Date(), curator_reviewed_by: randomUUID() }),
      );
      expect(error.constraint_name).toBe('ingredients_curator_reviewed_by_users_id_fk');
    });
  });

  it('accept a well-formed hash and a whole review mark', async () => {
    const id = await insertBackdated({
      seed_content_hash: A_HASH,
      curator_reviewed_at: new Date(),
      curator_reviewed_by: A,
    });
    const [row] =
      await sql`select seed_content_hash, curator_reviewed_by from ingredients where id = ${id}`;
    expect(row).toEqual({ seed_content_hash: A_HASH, curator_reviewed_by: A });
  });
});

describe('the updated_at trigger and the seed state columns', () => {
  // Precondition for every case below: the row starts stamped in 2000 by A,
  // so "unchanged" is a year the clock cannot produce, not a race with it.
  async function expectUntouched(id: string) {
    const { updated_at, updated_by } = await stampsOf(id);
    expect(updated_at.getFullYear()).toBe(2000);
    expect(updated_by).toBe(A);
  }

  it('leaves updated_at and updated_by alone when only the hash changes', async () => {
    const id = await insertBackdated({ seed_content_hash: A_HASH });
    await sql`update ingredients set seed_content_hash = ${ANOTHER_HASH}, updated_by = ${B} where id = ${id}`;
    await expectUntouched(id);
    const [row] = await sql`select seed_content_hash from ingredients where id = ${id}`;
    expect(row.seed_content_hash).toBe(ANOTHER_HASH);
  });

  it('leaves them alone when only the review time changes', async () => {
    const id = await insertBackdated({
      curator_reviewed_at: THE_MILLENNIUM,
      curator_reviewed_by: A,
    });
    await sql`update ingredients set curator_reviewed_at = now(), updated_by = ${B} where id = ${id}`;
    await expectUntouched(id);
  });

  it('leaves them alone when only the reviewer changes', async () => {
    const id = await insertBackdated({
      curator_reviewed_at: THE_MILLENNIUM,
      curator_reviewed_by: A,
    });
    await sql`update ingredients set curator_reviewed_by = ${B}, updated_by = ${B} where id = ${id}`;
    await expectUntouched(id);
    const [row] = await sql`select curator_reviewed_by from ingredients where id = ${id}`;
    expect(row.curator_reviewed_by).toBe(B);
  });

  it('leaves them alone when a review mark is set from nothing', async () => {
    const id = await insertBackdated();
    await sql`
      update ingredients set curator_reviewed_at = now(), curator_reviewed_by = ${B}, updated_by = ${B}
      where id = ${id}
    `;
    await expectUntouched(id);
  });

  it('still bumps both when a content column changes', async () => {
    const id = await insertBackdated({ seed_content_hash: A_HASH });
    await sql`update ingredients set name = 'Renamed Testwort', updated_by = ${B} where id = ${id}`;
    const { updated_at, updated_by } = await stampsOf(id);
    expect(updated_at.getFullYear()).not.toBe(2000);
    expect(updated_by).toBe(B);
  });
});
