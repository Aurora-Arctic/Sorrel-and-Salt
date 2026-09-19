import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { fromRoot } from '../../support/paths';
import { truncateAllTables } from '../../support/seeded-database';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { FORM_GROUPS, FORMS, seedForms } from '@/db/seed/forms';
import { slugify } from '@/lib/slugify';

// §5's six form groups and every form under them, asserted against §5's own
// table rather than a copy, against the real tables emptied first —
// claude-docs/db.md, "The form vocabulary seed". The regrouping's own property
// is asserted too: no section holds more than half the list.

const DESIGN_DOC = fromRoot('claude-docs/DESIGN.md');

// --- DESIGN.md §5, parsed ---------------------------------------------------

// §5 carries the vocabulary as a table and the two historical lists as a
// sentence beneath it; both are parsed rather than transcribed.
function designSection5(): string {
  const doc = readFileSync(DESIGN_DOC, 'utf8');
  const start = doc.indexOf('**`ingredient_forms`**');

  if (start === -1) throw new Error('DESIGN.md §5 no longer has an `ingredient_forms` paragraph');

  return doc.slice(start, doc.indexOf('**`ingredient_form_groups`**', start));
}

const DESIGN_SECTION = designSection5();

function commaList(text: string): string[] {
  return text
    .split(/,\s*|\s+and\s+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function listBetween(from: string, to: string): string[] {
  const start = DESIGN_SECTION.indexOf(from);
  const end = DESIGN_SECTION.indexOf(to, start);

  if (start === -1 || end === -1) {
    throw new Error(`DESIGN.md §5 no longer reads "${from}" … "${to}"`);
  }

  return commaList(DESIGN_SECTION.slice(start + from.length, end));
}

interface DesignGroup {
  name: string;
  forms: string[];
}

/** §5's table: `| Botanical | herb, root, … |`, in the order §5 writes it. */
const DESIGN_GROUPS: DesignGroup[] = DESIGN_SECTION.split('\n')
  .filter((line) => line.startsWith('|'))
  .map((line) => line.split('|').map((cell) => cell.trim()))
  .filter((cells) => cells[1] !== 'Group' && !cells[1].startsWith('---'))
  .map((cells) => ({ name: cells[1], forms: commaList(cells[2]) }));

const DESIGN_VALUES = DESIGN_GROUPS.flatMap((group) => group.forms);

/** The vocabulary as MB.28 first wrote it, still required to be present. */
const DESIGN_ORIGINALS = listBetween('as MB.28 first wrote it — ', ' — and seventeen more');

/** What the animal-derived and whole-organism cases added (M4.4a, MB.28). */
const DESIGN_ADDITIONS = listBetween('whole-organism cases (', ').');

// --- database ---------------------------------------------------------------

interface GroupRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  created_by: string;
  updated_by: string;
  deleted_at: Date | null;
}

interface FormRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  group_id: string;
  created_by: string;
  updated_by: string;
  deleted_at: Date | null;
}

let sql: ReturnType<typeof postgres>;
let db: ReturnType<typeof drizzle>;

async function allGroups(): Promise<GroupRow[]> {
  return sql<GroupRow[]>`select * from ingredient_form_groups order by slug`;
}

async function allForms(): Promise<FormRow[]> {
  return sql<FormRow[]>`select * from ingredient_forms order by slug`;
}

async function countOf(table: string): Promise<number> {
  const [{ count }] = await sql<{ count: string }[]>`select count(*) from ${sql(table)}`;
  return Number(count);
}

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

describe('the seed data matches DESIGN.md §5', () => {
  // Precondition: §5 really was parsed, into the counts it states — otherwise
  // every "covers §5" test below is vacuously true.
  it('parses §5’s own table and sentence, not an empty match', () => {
    expect(DESIGN_GROUPS.map((group) => group.name)).toEqual([
      'Botanical',
      'Animal',
      'Mineral',
      'Substance',
      'Fluid',
      'Curio',
    ]);
    expect(DESIGN_VALUES.length).toBeGreaterThan(60);
    expect(DESIGN_ORIGINALS).toHaveLength(12);
    expect(DESIGN_ADDITIONS).toHaveLength(17);
  });

  it('seeds every form §5’s table lists, in §5’s order, and nothing else', () => {
    expect(FORMS.map((form) => slugify(form.name))).toEqual(DESIGN_VALUES);
  });

  it('names each form as §5 writes it, differing only in case', () => {
    expect(FORMS.map((form) => form.name.toLowerCase())).toEqual(DESIGN_VALUES);
  });

  // Membership rather than order: §5 groups the vocabulary now, so `ash` and
  // `curio` sit far apart.
  it('keeps the vocabulary MB.28 first wrote, and the additions after it', () => {
    const seeded = new Set(FORMS.map((form) => slugify(form.name)));

    expect(DESIGN_ORIGINALS.filter((value) => !seeded.has(value))).toEqual([]);
    expect(DESIGN_ADDITIONS.filter((value) => !seeded.has(value))).toEqual([]);
  });

  it('seeds §5’s six groups, and slugs each by the shared rule', () => {
    const designNames = DESIGN_GROUPS.map((group) => group.name);

    expect(FORM_GROUPS.map((group) => group.name)).toEqual(designNames);
    expect(FORM_GROUPS.map((group) => slugify(group.name))).toEqual(designNames.map(slugify));
  });

  // In the group §5 files it under, not merely some group: `wax` under Fluid
  // would pass the count tests below.
  it('files every form under the group §5 puts it in', () => {
    const designGroupOf = new Map(
      DESIGN_GROUPS.flatMap((group) => group.forms.map((form) => [form, group.name] as const)),
    );

    for (const form of FORMS) {
      expect(form.group, form.name).toBe(designGroupOf.get(slugify(form.name)));
    }
  });

  // A vocabulary filed entirely under one group would still pass the test above.
  it('puts something in each of the six groups', () => {
    for (const group of FORM_GROUPS) {
      expect(FORMS.filter((form) => form.group === group.name).length, group.name).toBeGreaterThan(
        0,
      );
    }
  });

  // The old vocabulary put 21 of 29 rows under one header; no group may hold more than half.
  it('spreads the vocabulary rather than piling it into one section', () => {
    for (const group of FORM_GROUPS) {
      const held = FORMS.filter((form) => form.group === group.name).length;

      expect(held, group.name).toBeLessThanOrEqual(FORMS.length / 2);
    }
  });

  // §5 writes lower case and a seeded name is a rendered label. Every test
  // above compares case-insensitively, which is what would let a seeded "herb"
  // through — so every word is checked, not only the first.
  it('writes every name in Title Case, as a rendered label', () => {
    const sentenceCased = (name: string) => name.split(' ').filter((word) => !/^[A-Z]/.test(word));

    for (const { name } of [...FORM_GROUPS, ...FORMS]) {
      expect(sentenceCased(name), name).toEqual([]);
    }
  });
});

describe('every row explains itself', () => {
  it('gives each group a non-empty description', () => {
    expect(FORM_GROUPS.filter((group) => group.description.trim() === '')).toEqual([]);
  });

  it('gives each form a non-empty description', () => {
    expect(FORMS.filter((form) => form.description.trim() === '')).toEqual([]);
  });

  // A description copied from the row above is non-empty and explains nothing.
  it('gives no two forms the same description', () => {
    const descriptions = FORMS.map((form) => form.description);

    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  it('writes them through to the database', async () => {
    await seedForms(db);

    expect((await allGroups()).filter((group) => group.description.trim() === '')).toEqual([]);
    expect((await allForms()).filter((form) => form.description.trim() === '')).toEqual([]);
  });
});

describe('seedForms(db)', () => {
  // Precondition: the truncated clone really starts at zero.
  it('starts from two empty tables', async () => {
    expect(await countOf('ingredient_form_groups')).toBe(0);
    expect(await countOf('ingredient_forms')).toBe(0);

    await seedForms(db);

    expect(await countOf('ingredient_form_groups')).toBe(DESIGN_GROUPS.length);
    expect(await countOf('ingredient_forms')).toBe(DESIGN_VALUES.length);
  });

  it('writes the groups before the forms, each form pointing at its own group', async () => {
    await seedForms(db);

    const groupSlugById = new Map((await allGroups()).map((group) => [group.id, group.slug]));
    const seeded = (await allForms()).map((form) => ({
      slug: form.slug,
      group: groupSlugById.get(form.group_id),
    }));

    expect(seeded).toEqual(
      FORMS.map((form) => ({ slug: slugify(form.name), group: slugify(form.group) })).sort((a, b) =>
        a.slug.localeCompare(b.slug),
      ),
    );
  });

  it('stamps every row as the bootstrap user, with no tombstone', async () => {
    await seedForms(db);

    for (const row of [...(await allGroups()), ...(await allForms())]) {
      expect(row.created_by, row.slug).toBe(BOOTSTRAP_USER_ID);
      expect(row.updated_by, row.slug).toBe(BOOTSTRAP_USER_ID);
      expect(row.deleted_at, row.slug).toBeNull();
    }
  });

  it('is idempotent: re-running adds nothing and moves nothing', async () => {
    await seedForms(db);
    const groups = await allGroups();
    const forms = await allForms();

    await expect(seedForms(db)).resolves.toBeUndefined();

    expect(await allGroups()).toEqual(groups);
    expect(await allForms()).toEqual(forms);
  });

  // The vocabulary is the admin's (MB.35), and a description is the part of a
  // curated row most likely to be rewritten.
  it('does not overwrite a description an admin has since rewritten', async () => {
    await seedForms(db);
    await sql`
      update ingredient_forms set description = 'The bark of the root, not the stem.'
      where slug = 'bark'
    `;

    await seedForms(db);

    const [bark] = (await allForms()).filter((form) => form.slug === 'bark');
    expect(bark.description).toBe('The bark of the root, not the stem.');
  });

  // Keyed on the slug, ignoring `deleted_at`: the partial index stops only a second live row.
  it('does not resurrect a form an admin has since deleted', async () => {
    await seedForms(db);
    await sql`
      update ingredient_forms set deleted_at = now(), deleted_by = ${BOOTSTRAP_USER_ID}
      where slug = 'curio'
    `;

    await seedForms(db);

    const curio = (await allForms()).filter((form) => form.slug === 'curio');
    expect(curio).toHaveLength(1);
    expect(curio[0].deleted_at).not.toBeNull();
  });

  it('publishes the bootstrap user as app.current_user_id, as withAudit would', async () => {
    await sql`create table seed_forms_probe (slug text, acting_user text)`;
    await sql.unsafe(`
      create function seed_forms_probe() returns trigger language plpgsql as $$
      begin
        insert into seed_forms_probe (slug, acting_user)
        values (new.slug, current_setting('app.current_user_id', true));
        return new;
      end
      $$
    `);
    await sql.unsafe(`
      create trigger seed_forms_probe after insert on ingredient_form_groups
      for each row execute function seed_forms_probe()
    `);

    await seedForms(db);

    const rows = await sql<{ acting_user: string | null }[]>`
      select acting_user from seed_forms_probe
    `;
    expect(rows).toHaveLength(DESIGN_GROUPS.length);
    expect(rows.every((row) => row.acting_user === BOOTSTRAP_USER_ID)).toBe(true);
  });
});
