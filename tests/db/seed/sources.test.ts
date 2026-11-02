import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { truncateAllTables } from '../../support/seeded-database';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { seedAstrology } from '@/db/seed/astrology';
import { DEITIES, seedDeities } from '@/db/seed/deities';
import { SOURCES, seedSources } from '@/db/seed/sources';
import { FIXTURE_USERS } from '@/db/seed/standard';
import { WORKS } from '@/db/seed/compendium/works';
import { loadCompendium } from '@/db/seed/compendium/load';
import { citationText } from '@/lib/citation';
import type { SeedWork } from '@/db/seed/types';
import type { DocLink, DocLinkKind, ReferenceLinkRow, ReferenceRow } from './types';

// The sources seed writes compendium references keyed by citation, a tradition's source reaching every deity under it, against the real tables emptied first: one run serves every read, and a re-run over an admin's edit empties them again.
// The shape every seed shares is index.test.ts's; which sources the docs record is the docs' to review (claude-docs/db/references.md, "How the seed reads the docs").

const byLink = (a: DocLink, b: DocLink) =>
  `${a.kind}|${a.name}|${a.locator}`.localeCompare(`${b.kind}|${b.name}|${b.locator}`);

let sql: ReturnType<typeof postgres>;
let db: ReturnType<typeof drizzle>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
  db = drizzle(sql);
});

afterAll(async () => {
  await sql.end();
});

/** The vocabularies the sources link, then the sources. */
async function seedAll(): Promise<void> {
  await seedDeities(db);
  await seedAstrology(db);
  await seedSources(db);
}

// The two days as text, as Drizzle reads them: postgres.js would hand back a
// `Date`, which the renderer does not print.
const REFERENCE =
  'select *, accessed::text as accessed_day, modified::text as modified_day from "references"';

function asRead(
  row: ReferenceRow & { accessed_day: string | null; modified_day: string | null },
): ReferenceRow {
  const { accessed_day: accessed, modified_day: modified, ...rest } = row;
  return { ...rest, accessed, modified };
}

async function allReferences(): Promise<ReferenceRow[]> {
  const rows = await sql.unsafe(`${REFERENCE} order by created_at, id`);
  return (rows as unknown as Parameters<typeof asRead>[0][]).map(asRead);
}

async function allLinks(): Promise<ReferenceLinkRow[]> {
  return sql<ReferenceLinkRow[]>`select * from reference_links`;
}

/** The one seeded reference whose citation is `citation`. */
async function referenceCited(citation: string): Promise<ReferenceRow> {
  const found = (await allReferences()).filter((row) => citationText(row) === citation);
  expect(found, citation).toHaveLength(1);
  return found[0];
}

/** What a reference links, by the row's name. */
async function namesLinkedFrom(referenceId: string): Promise<DocLink[]> {
  const rows = await sql<{ kind: DocLinkKind; name: string; locator: string | null }[]>`
    select case
             when l.deity_id is not null then 'deity'
             when l.deity_tradition_id is not null then 'tradition'
             when l.celestial_body_id is not null then 'celestialBody'
             else 'zodiacSign'
           end as kind,
           coalesce(d.name, t.name, p.name, z.name) as name,
           l.locator
    from reference_links l
    left join deities d on d.id = l.deity_id
    left join deity_traditions t on t.id = l.deity_tradition_id
    left join celestial_bodies p on p.id = l.celestial_body_id
    left join zodiac_signs z on z.id = l.zodiac_sign_id
    where l.reference_id = ${referenceId} and l.deleted_at is null
  `;
  return rows.map((row) => ({ ...row })).sort(byLink);
}

const A_ID = FIXTURE_USERS.A.id;

const sourceTitled = (title: string) => {
  const source = SOURCES.find(({ reference }) => reference.title === title);
  if (!source) throw new Error(`No source titled ${title}`);
  return source;
};

describe('seedSources', () => {
  // Seeded before each test, not once for the block: the edited-database
  // tests below empty the clone and write their own rows, and a test here
  // must read a fresh seed whichever of them ran before it.
  describe('over an emptied database', () => {
    beforeEach(async () => {
      await truncateAllTables(sql);
      // Precondition: the truncated clone really starts empty, so every row read below is this run's.
      expect(await allReferences()).toEqual([]);
      expect(await allLinks()).toEqual([]);
      await seedAll();
    });

    it('writes every source as a compendium reference, keyed by its citation', async () => {
      const rows = await allReferences();
      expect(rows).toHaveLength(SOURCES.length);
      expect(rows.every((row) => row.workspace_id === null)).toBe(true);
      expect(rows.map((row) => row.seed_key).sort()).toEqual(
        SOURCES.map(({ reference }) => citationText(reference)).sort(),
      );
      expect(rows.every((row) => citationText(row) === row.seed_key)).toBe(true);
    });

    it('links a tradition’s source to the tradition and every deity under it', async () => {
      const source = SOURCES.find(({ traditions }) => traditions?.includes('Greek'));
      const greek = DEITIES.filter(({ tradition }) => tradition === 'Greek').map(
        ({ name }) => name,
      );
      if (!source) throw new Error('No Greek source');

      const linked = await namesLinkedFrom(
        (await referenceCited(citationText(source.reference))).id,
      );

      expect(linked.filter(({ kind }) => kind === 'tradition').map(({ name }) => name)).toEqual([
        'Greek',
      ]);
      expect(linked.filter(({ kind }) => kind === 'deity').map(({ name }) => name)).toEqual(
        expect.arrayContaining(greek),
      );
    });
  });

  describe('over a database an admin has edited', () => {
    beforeEach(async () => {
      await truncateAllTables(sql);
    });

    it('neither twins nor overwrites a reference an admin has since edited', async () => {
      await seedAll();
      const [edited] = await allReferences();
      const before = citationText(edited);
      await sql`
        update "references" set title = 'Retitled by an Admin', updated_by = ${BOOTSTRAP_USER_ID}
        where id = ${edited.id}
      `;
      // Precondition: the edit changed the citation, so keying by it would twin.
      expect(citationText(await referenceById(edited.id))).not.toBe(before);

      await seedSources(db);

      expect(await allReferences()).toHaveLength(SOURCES.length);
      expect((await referenceById(edited.id)).title).toBe('Retitled by an Admin');
    });

    // Unkeyed is what marks a row as not the seed's; an emptied database holds
    // no user but the bootstrap one once a seed ran, so it writes the edits.
    it('links an admin’s identical reference rather than duplicating it, and writes nothing to it', async () => {
      await seedDeities(db);
      await seedAstrology(db);
      const pluto = sourceTitled('Planetary Correspondences of Pluto').reference;
      const [admins] = await sql<{ id: string; updated_at: Date }[]>`
        insert into "references" ${sql({
          kind: pluto.kind,
          title: pluto.title,
          container: pluto.container ?? null,
          url: pluto.url ?? null,
          accessed: pluto.accessed ?? null,
          created_by: BOOTSTRAP_USER_ID,
          updated_by: BOOTSTRAP_USER_ID,
        })}
        returning id, updated_at
      `;

      await seedSources(db);

      const row = await referenceById(admins.id);
      expect(await allReferences()).toHaveLength(SOURCES.length);
      expect(row.seed_key).toBeNull();
      expect(row.updated_at).toEqual(admins.updated_at);
      expect(await namesLinkedFrom(admins.id)).toEqual([
        { kind: 'celestialBody', name: 'Pluto', locator: null },
      ]);
    });

    // The mark is provenance the seed owns until a person edits the row: it restates it either way, and a person's edit is kept and reported.
    describe('a source’s scholarly mark', () => {
      const marked = () => {
        const source = SOURCES.find(({ reference }) => reference.scholarly === true);
        if (!source) throw new Error('No source is marked scholarly');
        return source.reference;
      };
      const unmarked = () => {
        const source = SOURCES.find(({ reference }) => reference.scholarly !== true);
        if (!source) throw new Error('Every source is marked scholarly');
        return source.reference;
      };

      it('sets it on a present source no person edited, either way', async () => {
        await seedAll();
        const scholarly = await referenceCited(citationText(marked()));
        const trade = await referenceCited(citationText(unmarked()));
        await sql`update "references" set scholarly = not scholarly where id in ${sql([scholarly.id, trade.id])}`;
        // Precondition: both rows now disagree with sources.ts, and only the seed's user has stamped them, so no person edited either.
        for (const [id, wanted] of [
          [scholarly.id, true],
          [trade.id, false],
        ] as const) {
          const row = await referenceById(id);
          expect(row.scholarly).toBe(!wanted);
          expect([row.created_by, row.updated_by]).toEqual([BOOTSTRAP_USER_ID, BOOTSTRAP_USER_ID]);
        }

        expect(await seedSources(db)).toEqual([]);

        expect((await referenceById(scholarly.id)).scholarly).toBe(true);
        expect((await referenceById(trade.id)).scholarly).toBe(false);
      });

      it('keeps a person’s edit to it, and reports the source', async () => {
        await seedAll();
        const work = marked();
        const row = await referenceCited(citationText(work));
        await sql`
          insert into users (id, name, email, created_by, updated_by)
          values (${A_ID}, 'Fixture Person A', ${`${A_ID}@users.test`}, ${A_ID}, ${A_ID})`;
        await sql`update "references" set scholarly = false, updated_by = ${A_ID} where id = ${row.id}`;
        // Precondition: the row disagrees with sources.ts, and the run without the guard would set it, as the test above proves.
        expect((await referenceById(row.id)).scholarly).toBe(false);
        expect((await referenceById(row.id)).updated_by).toBe(A_ID);

        const kept = await seedSources(db);

        expect((await referenceById(row.id)).scholarly).toBe(false);
        expect(kept).toEqual([{ source: citationText(work), differs: ['scholarly'] }]);
      });
    });

    it('links a deity an admin has since renamed, found by its seed key', async () => {
      await seedDeities(db);
      await seedAstrology(db);
      await sql`update deities set name = 'Adonis Renamed', slug = 'adonis-renamed' where name = 'Adonis'`;

      await seedSources(db);

      const adonis = sourceTitled('Adonis');
      expect(
        await namesLinkedFrom((await referenceCited(citationText(adonis.reference))).id),
      ).toEqual([{ kind: 'deity', name: 'Adonis Renamed', locator: null }]);
    });
  });
  it('names no work in both its list and the compendium’s with different marks, so neither seed undoes the other', () => {
    const works: Record<string, SeedWork> = { ...WORKS, ...loadCompendium().sources };
    const compendium = new Map(
      Object.values(works).map((work) => [citationText(work), work.scholarly === true]),
    );
    const disagree = SOURCES.map(({ reference }) => reference).filter(
      (work) =>
        compendium.has(citationText(work)) &&
        compendium.get(citationText(work)) !== (work.scholarly === true),
    );
    expect(disagree.map(citationText)).toEqual([]);
  });
});

async function referenceById(id: string): Promise<ReferenceRow> {
  const [row] = await sql.unsafe(`${REFERENCE} where id = $1`, [id]);
  return asRead(row as unknown as Parameters<typeof asRead>[0]);
}
