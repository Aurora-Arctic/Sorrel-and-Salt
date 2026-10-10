import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { findReferencesOf } from '@/db/repository';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { A, E } from '../../support/as-user';
import { insertReference } from '../../support/db/insert-reference';

// `findReferencesOf` over a sourced table other than the ingredients (MB.208):
// a deity is global reference data, so its links read while it is live, and
// only to a compendium reference. The ingredient's arm, two-tier, is the
// ingredient services' and loaders' to prove. The sources seed links the
// deities, so the seeded template holds the links read here.

let sql: ReturnType<typeof postgres>;
let deityId: string;
let seededTitles: string[];

beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL as string);
  const [linked] = await sql<{ deity_id: string }[]>`
    select l.deity_id from reference_links l
    join "references" r on r.id = l.reference_id and r.workspace_id is null
    where l.deity_id is not null and l.deleted_at is null and r.deleted_at is null
    order by l.deity_id limit 1`;
  deityId = linked.deity_id;
  seededTitles = (
    await sql<{ title: string }[]>`
      select r.title from reference_links l join "references" r on r.id = l.reference_id
      where l.deity_id = ${deityId} and l.deleted_at is null order by r.title`
  ).map((row) => row.title);
});

afterAll(async () => {
  await sql.end();
});

const titlesOf = async (ids: string[]) =>
  (await findReferencesOf([], 'deityId', ids)).map(({ reference }) => reference.title).sort();

describe('findReferencesOf a deity', () => {
  it('reads the compendium references the seed linked to a live deity', async () => {
    // Precondition: the seed linked this deity, so an empty read would be the finder's.
    expect(seededTitles.length).toBeGreaterThan(0);

    expect(await titlesOf([deityId])).toEqual([...seededTitles].sort());
  });

  it('reads no coven’s reference linked to a deity, which no reader shares', async () => {
    const coven = await insertReference(
      sql,
      { title: 'A Coven Daybook of Fixtures', workspace_id: WORKSPACE_W_ID },
      A.id,
    );
    await sql`
      insert into reference_links (deity_id, reference_id, created_by, updated_by)
      values (${deityId}, ${coven}, ${E.id}, ${E.id})`;

    // Precondition: the link is live, so only the tier keeps it out.
    const [{ count }] = await sql<{ count: number }[]>`
      select count(*)::int as count from reference_links
      where deity_id = ${deityId} and reference_id = ${coven} and deleted_at is null`;
    expect(count).toBe(1);

    expect(await titlesOf([deityId])).not.toContain('A Coven Daybook of Fixtures');
  });

  it('reads nothing for a soft-deleted deity', async () => {
    await sql`update deities set deleted_at = now(), deleted_by = ${E.id} where id = ${deityId}`;

    expect(await titlesOf([deityId])).toEqual([]);
  });

  it('reads nothing for no ids', async () => {
    expect(await findReferencesOf([], 'deityId', [])).toEqual([]);
  });
});
