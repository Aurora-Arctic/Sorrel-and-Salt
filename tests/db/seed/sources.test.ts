import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { truncateAllTables } from '../../support/seeded-database';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { seedAstrology } from '@/db/seed/astrology';
import { DEITIES, seedDeities } from '@/db/seed/deities';
import { SOURCES, seedSources } from '@/db/seed/sources';
import { citationText } from '@/lib/citation';
import type { DocLink, DocLinkKind, ReferenceLinkRow, ReferenceRow } from './types';

// MB.156: the sources seed writes compendium references keyed by citation,
// a tradition's source reaching every deity under it, against the real tables
// emptied first: one run of the seed serves every read, and a re-run over an
// admin's edit empties them again. The shape every seed shares is
// index.test.ts's (MB.183), and which sources the docs record is the docs' to
// review — claude-docs/db/references.md, "How the seed reads the docs".

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
             when l.planet_id is not null then 'planet'
             else 'zodiacSign'
           end as kind,
           coalesce(d.name, t.name, p.name, z.name) as name,
           l.locator
    from reference_links l
    left join deities d on d.id = l.deity_id
    left join deity_traditions t on t.id = l.deity_tradition_id
    left join planets p on p.id = l.planet_id
    left join zodiac_signs z on z.id = l.zodiac_sign_id
    where l.reference_id = ${referenceId} and l.deleted_at is null
  `;
  return rows.map((row) => ({ ...row })).sort(byLink);
}

const sourceTitled = (title: string) => {
  const source = SOURCES.find(({ reference }) => reference.title === title);
  if (!source) throw new Error(`No source titled ${title}`);
  return source;
};

describe('seedSources', () => {
  beforeAll(async () => {
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
    const greek = DEITIES.filter(({ tradition }) => tradition === 'Greek').map(({ name }) => name);
    if (!source) throw new Error('No Greek source');

    const linked = await namesLinkedFrom((await referenceCited(citationText(source.reference))).id);

    expect(linked.filter(({ kind }) => kind === 'tradition').map(({ name }) => name)).toEqual([
      'Greek',
    ]);
    expect(linked.filter(({ kind }) => kind === 'deity').map(({ name }) => name)).toEqual(
      expect.arrayContaining(greek),
    );
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
        { kind: 'planet', name: 'Pluto', locator: null },
      ]);
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
});

async function referenceById(id: string): Promise<ReferenceRow> {
  const [row] = await sql.unsafe(`${REFERENCE} where id = $1`, [id]);
  return asRead(row as unknown as Parameters<typeof asRead>[0]);
}
