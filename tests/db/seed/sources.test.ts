import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { fromRoot } from '../../support/paths';
import { truncateAllTables } from '../../support/seeded-database';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { PLANETS, ZODIAC_SIGNS, seedAstrology } from '@/db/seed/astrology';
import { DEITIES, DEITY_TRADITIONS, seedDeities } from '@/db/seed/deities';
import { SOURCES, seedSources } from '@/db/seed/sources';
import { citationText, renderCitation } from '@/lib/citation';
import type { CitationFields } from '@/lib/types';
import type { DocLink, DocLinkKind, ReferenceLinkRow, ReferenceRow } from './types';

// MB.156: the sources the deity and astrology seed docs record, asserted
// against the docs themselves rather than a copy, through the one renderer,
// against the real tables emptied first (claude-docs/db/references.md, "How
// the seed reads the docs").

const DEITY_DOC = readFileSync(fromRoot('claude-docs/db/deity-vocabulary-seed.md'), 'utf8');
const ASTROLOGY_DOC = readFileSync(fromRoot('claude-docs/db/astrology-vocabulary-seed.md'), 'utf8');

/** A citation as the docs spell it: the renderer's parts, italic ones between underscores. */
function markdownOf(fields: CitationFields): string {
  return renderCitation(fields)
    .map((part) => (part.italic ? `_${part.text}_` : part.text))
    .join('');
}

// --- the docs, parsed -------------------------------------------------------

/** Every citation the docs record, each with the links its place in them gives it. */
const DOC_SOURCES = new Map<string, DocLink[]>();

function record(citation: string, link?: DocLink): void {
  const links = DOC_SOURCES.get(citation) ?? [];
  if (link) links.push(link);
  DOC_SOURCES.set(citation, links);
}

/** A per-deity citation and its locator, which follows ` · `. */
function splitLocator(line: string): [string, string | null] {
  const at = line.lastIndexOf(' · ');
  return at === -1 ? [line, null] : [line.slice(0, at), line.slice(at + 3)];
}

function slice(doc: string, from: string, to?: string): string[] {
  const start = doc.indexOf(from);
  const end = to === undefined ? doc.length : doc.indexOf(to, start);
  if (start === -1 || end === -1) throw new Error(`A seed doc no longer reads "${from}" … "${to}"`);
  return doc.slice(start, end).split('\n');
}

// The deity doc's "Sources": the bullets before the first tradition chose
// which deities to list and link nothing; a tradition's own bullets link it;
// a deity's nested bullets link that deity, each with its locator.
{
  let tradition: string | null = null;
  let deity: string | null = null;
  let perDeity = false;

  for (const line of slice(DEITY_DOC, '### Sources', '#### What the sources did not carry')) {
    const bold = /^- \*\*(.+?)\*\*/.exec(line);
    if (line.startsWith('#### ')) {
      [tradition, deity, perDeity] = [line.slice(5), null, false];
    } else if (line === 'Per-deity:') {
      perDeity = true;
    } else if (perDeity && bold) {
      deity = bold[1];
    } else if (perDeity && deity && line.startsWith('  - ')) {
      const [citation, locator] = splitLocator(line.slice(4));
      record(citation, { kind: 'deity', name: deity, locator });
    } else if (!perDeity && line.startsWith('- ')) {
      record(
        line.slice(2),
        tradition ? { kind: 'tradition', name: tradition, locator: null } : undefined,
      );
    }
  }
}

// The astrology doc's "Sources": each bullet, and its nested "Linked to:" line.
{
  const planetNames = new Set(PLANETS.map(({ name }) => name));
  let citation: string | null = null;

  for (const line of slice(ASTROLOGY_DOC, '**Sources.**')) {
    if (line.startsWith('- ')) {
      citation = line.slice(2);
      record(citation);
    } else if (citation && line.startsWith('  - Linked to: ')) {
      for (const name of line.slice('  - Linked to: '.length).replace(/\.$/, '').split(', ')) {
        const kind: DocLinkKind = planetNames.has(name) ? 'planet' : 'zodiacSign';
        record(citation, { kind, name, locator: null });
      }
    }
  }
}

const DOC_LINKS = [...DOC_SOURCES.values()].flat();
const countOfKind = (kind: DocLinkKind) => DOC_LINKS.filter((link) => link.kind === kind).length;

/** The links the literal gives a source, in the docs' shape. */
function literalLinks(index: number): DocLink[] {
  const { traditions = [], deities = [], planets = [], zodiacSigns = [] } = SOURCES[index];
  return [
    ...traditions.map((name): DocLink => ({ kind: 'tradition', name, locator: null })),
    ...deities.map(({ name, locator }): DocLink => ({
      kind: 'deity',
      name,
      locator: locator ?? null,
    })),
    ...planets.map((name): DocLink => ({ kind: 'planet', name, locator: null })),
    ...zodiacSigns.map((name): DocLink => ({ kind: 'zodiacSign', name, locator: null })),
  ];
}

const byLink = (a: DocLink, b: DocLink) =>
  `${a.kind}|${a.name}|${a.locator}`.localeCompare(`${b.kind}|${b.name}|${b.locator}`);

describe('the sources the seed docs record', () => {
  // Precondition: both docs really were parsed, into the counts they hold.
  it('parses 278 sources, 182 tradition links, 272 deity links, 45 planet links and 12 sign links', () => {
    expect(DOC_SOURCES.size).toBe(278);
    expect(countOfKind('tradition')).toBe(182);
    expect(countOfKind('deity')).toBe(272);
    expect(countOfKind('planet')).toBe(45);
    expect(countOfKind('zodiacSign')).toBe(12);
    expect(DOC_LINKS.filter(({ locator }) => locator !== null).length).toBeGreaterThan(0);
  });

  it('names only rows the vocabulary seeds write', () => {
    const names: Record<DocLinkKind, Set<string>> = {
      tradition: new Set(DEITY_TRADITIONS.map(({ name }) => name)),
      deity: new Set(DEITIES.map(({ name }) => name)),
      planet: new Set(PLANETS.map(({ name }) => name)),
      zodiacSign: new Set(ZODIAC_SIGNS.map(({ name }) => name)),
    };
    const unknown = DOC_LINKS.filter((link) => !names[link.kind].has(link.name));

    expect(unknown).toEqual([]);
  });

  it('transcribes every citation the docs record, rendered to the doc’s own text, and nothing else', () => {
    const rendered = SOURCES.map(({ reference }) => markdownOf(reference));

    expect(new Set(rendered).size).toBe(rendered.length);
    expect([...rendered].sort()).toEqual([...DOC_SOURCES.keys()].sort());
  });

  it('links each source to the rows its place in the docs names', () => {
    SOURCES.forEach(({ reference }, index) => {
      const citation = markdownOf(reference);

      expect(literalLinks(index).sort(byLink), citation).toEqual(
        [...(DOC_SOURCES.get(citation) ?? [])].sort(byLink),
      );
    });
  });

  it('gives no deity link a blank locator', () => {
    const locators = SOURCES.flatMap(({ deities = [] }) => deities.map(({ locator }) => locator));

    expect(locators.filter((locator) => locator !== undefined && locator.trim() === '')).toEqual(
      [],
    );
  });
});

// --- database ---------------------------------------------------------------

let sql: ReturnType<typeof postgres>;
let db: ReturnType<typeof drizzle>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
  db = drizzle(sql);
});

beforeEach(async () => {
  await truncateAllTables(sql);
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

/** Every link the literal implies, each tradition's reaching its deities. */
function expectedLinkCount(): number {
  return SOURCES.reduce(
    (total, { traditions = [], deities = [], planets = [], zodiacSigns = [] }) => {
      const reached = new Set(deities.map(({ name }) => name));
      for (const tradition of traditions) {
        for (const deity of DEITIES.filter((row) => row.tradition === tradition))
          reached.add(deity.name);
      }
      return total + traditions.length + reached.size + planets.length + zodiacSigns.length;
    },
    0,
  );
}

const sourceTitled = (title: string) => {
  const source = SOURCES.find(({ reference }) => reference.title === title);
  if (!source) throw new Error(`No source titled ${title}`);
  return source;
};

describe('seedSources', () => {
  it('starts from empty tables', async () => {
    expect(await allReferences()).toEqual([]);
    expect(await allLinks()).toEqual([]);
  });

  it('writes every source as a compendium reference, keyed by its citation', async () => {
    await seedAll();

    const rows = await allReferences();
    expect(rows).toHaveLength(SOURCES.length);
    expect(rows.every((row) => row.workspace_id === null)).toBe(true);
    expect(rows.map((row) => row.seed_key).sort()).toEqual(
      SOURCES.map(({ reference }) => citationText(reference)).sort(),
    );
    expect(rows.every((row) => citationText(row) === row.seed_key)).toBe(true);
  });

  it('writes every link, a tradition’s source reaching each deity filed under it', async () => {
    await seedAll();

    expect(await allLinks()).toHaveLength(expectedLinkCount());
  });

  it('links a tradition’s source to the tradition and every deity under it', async () => {
    await seedAll();
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

  it('links a per-deity citation to its deity alone, with its locator', async () => {
    await seedAll();
    const adonis = sourceTitled('Adonis');
    const grimm = sourceTitled('Teutonic Mythology');

    expect(
      await namesLinkedFrom((await referenceCited(citationText(adonis.reference))).id),
    ).toEqual([{ kind: 'deity', name: 'Adonis', locator: null }]);

    const eostre = (
      await namesLinkedFrom((await referenceCited(citationText(grimm.reference))).id)
    ).find(({ name }) => name === 'Eostre');
    expect(eostre?.locator).toMatch(/^vol\. 1, chap\. 13, "Goddesses/);
  });

  it('links each planet and sign source to the bodies the astrology doc names', async () => {
    await seedAll();
    const pluto = sourceTitled('Planetary Correspondences of Pluto');

    expect(await namesLinkedFrom((await referenceCited(citationText(pluto.reference))).id)).toEqual(
      [{ kind: 'planet', name: 'Pluto', locator: null }],
    );
  });

  it('stamps every reference and link as the bootstrap user, with no tombstone', async () => {
    await seedAll();

    for (const row of [...(await allReferences()), ...(await allLinks())]) {
      expect(row.created_by).toBe(BOOTSTRAP_USER_ID);
      expect(row.updated_by).toBe(BOOTSTRAP_USER_ID);
      expect(row.deleted_at).toBeNull();
    }
  });

  it('publishes the bootstrap user as app.current_user_id, as withAudit would', async () => {
    await seedDeities(db);
    await seedAstrology(db);
    await sql`create table seed_sources_probe (acting_user text)`;
    await sql.unsafe(`
      create function seed_sources_probe() returns trigger language plpgsql as $$
      begin
        insert into seed_sources_probe values (current_setting('app.current_user_id', true));
        return new;
      end
      $$
    `);
    await sql.unsafe(`
      create trigger seed_sources_probe after insert on "references"
      for each row execute function seed_sources_probe()
    `);

    await seedSources(db);

    const rows = await sql<
      { acting_user: string | null }[]
    >`select acting_user from seed_sources_probe`;
    expect(rows).toHaveLength(SOURCES.length);
    expect(rows.every((row) => row.acting_user === BOOTSTRAP_USER_ID)).toBe(true);
  });

  it('is idempotent: re-running adds nothing', async () => {
    await seedAll();
    const [references, links] = [await allReferences(), await allLinks()];

    await seedSources(db);

    expect(await allReferences()).toEqual(references);
    expect(await allLinks()).toEqual(links);
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

  it('resurrects no reference or link an admin has since deleted', async () => {
    await seedAll();
    const [reference] = await allReferences();
    const [link] = (await allLinks()).filter((row) => row.reference_id !== reference.id);
    await sql`update "references" set deleted_at = now(), deleted_by = ${BOOTSTRAP_USER_ID} where id = ${reference.id}`;
    await sql`update reference_links set deleted_at = now(), deleted_by = ${BOOTSTRAP_USER_ID} where id = ${link.id}`;

    await seedSources(db);

    expect(await allReferences()).toHaveLength(SOURCES.length);
    expect(await allLinks()).toHaveLength(expectedLinkCount());
    expect((await referenceById(reference.id)).deleted_at).not.toBeNull();
    expect((await allLinks()).find((row) => row.id === link.id)?.deleted_at).not.toBeNull();
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

async function referenceById(id: string): Promise<ReferenceRow> {
  const [row] = await sql.unsafe(`${REFERENCE} where id = $1`, [id]);
  return asRead(row as unknown as Parameters<typeof asRead>[0]);
}
