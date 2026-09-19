import { join } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { MIGRATIONS_DIR, fromRoot } from '../../support/paths';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { FORM_GROUPS, FORMS, seedForms } from '@/db/seed/forms';
import { slugify } from '@/lib/slugify';

// M4.3a — the six form groups and every form DESIGN.md §5 lists under them,
// seeded as a starting set an admin may edit afterwards.
//
// Shaped like categories.test.ts (M4.3), and for the same reason: the
// vocabulary is asserted against its *source* — §5's own table, parsed below —
// rather than against a copy of it, because a copy is exactly what rots. §5
// now files each form under a group, so the grouping is asserted too, and with
// it the property the regrouping was for: no section holds more than half the
// list.
//
// The whole migration set is applied into the worker's clone rather than the
// two tables being stubbed: `ingredient_forms.group_id` is a real foreign key
// and every row carries audit ids pointing at `users`, so "the groups land
// before the forms" is only a claim if both tables are the real ones.

const DESIGN_DOC = fromRoot('claude-docs/DESIGN.md');

function migrationStatements(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .flatMap((name) =>
      readFileSync(join(MIGRATIONS_DIR, name), 'utf8')
        .split('--> statement-breakpoint')
        .map((statement) => statement.trim())
        .filter(Boolean),
    );
}

// --- DESIGN.md §5, parsed ---------------------------------------------------

// §5 carries the vocabulary as a table — one row per group, its forms in a
// comma-separated cell — and the two historical lists as a sentence beneath
// it. Parsing both rather than transcribing them means a form added to §5 and
// not to the seed fails here instead of passing quietly, exactly as
// categories.test.ts parses §6's table.
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
let preexistingTables: string[] = [];
let preexistingTypes: string[] = [];

async function tableNames(): Promise<string[]> {
  const rows = await sql`select tablename from pg_tables where schemaname = 'public'`;
  return rows.map((row) => row.tablename as string);
}

async function enumTypeNames(): Promise<string[]> {
  const rows = await sql`
    select t.typname from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typtype = 'e'
  `;
  return rows.map((row) => row.typname as string);
}

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

beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
  db = drizzle(sql);

  preexistingTables = await tableNames();
  preexistingTypes = await enumTypeNames();

  for (const statement of migrationStatements()) {
    await sql.unsafe(statement);
  }
});

beforeEach(async () => {
  await sql`delete from ingredient_forms`;
  await sql`delete from ingredient_form_groups`;
  await sql`delete from users`;
});

afterAll(async () => {
  for (const table of (await tableNames()).filter((name) => !preexistingTables.includes(name))) {
    await sql.unsafe(`drop table if exists "${table}" cascade`);
  }
  for (const type of (await enumTypeNames()).filter((name) => !preexistingTypes.includes(name))) {
    await sql.unsafe(`drop type if exists "${type}" cascade`);
  }
  await sql.unsafe('drop function if exists set_updated_at() cascade');
  await sql.end();
});

describe('the seed data matches DESIGN.md §5', () => {
  // The precondition behind every comparison below: §5 really was parsed, and
  // into the counts §5 states in words. Without this a parse that matched
  // nothing would make every "covers §5's values" test vacuously true.
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

  // The two historical lists, still required by this task's acceptance
  // criteria. They are a subset of the table above rather than a prefix of it —
  // §5 groups the vocabulary now, so `ash` and `curio` sit far apart — which is
  // why this asks for membership where the test above asks for order.
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

  // Not just "in some group §5 names" — in the group §5 files it under. The
  // grouping is what this revision of the vocabulary is for, so putting `wax`
  // under Fluid would be a silent regression the count tests below would miss.
  it('files every form under the group §5 puts it in', () => {
    const designGroupOf = new Map(
      DESIGN_GROUPS.flatMap((group) => group.forms.map((form) => [form, group.name] as const)),
    );

    for (const form of FORMS) {
      expect(form.group, form.name).toBe(designGroupOf.get(slugify(form.name)));
    }
  });

  // Each of the six is a section header a reader would notice standing empty,
  // and a vocabulary that filed everything under one would still satisfy the
  // test above.
  it('puts something in each of the six groups', () => {
    for (const group of FORM_GROUPS) {
      expect(FORMS.filter((form) => form.group === group.name).length, group.name).toBeGreaterThan(
        0,
      );
    }
  });

  // The failure the regrouping exists to prevent: the old vocabulary put 21 of
  // its 29 rows under one header, which is a dropdown section as long as the
  // dropdown. No group may hold more than half.
  it('spreads the vocabulary rather than piling it into one section', () => {
    for (const group of FORM_GROUPS) {
      const held = FORMS.filter((form) => form.group === group.name).length;

      expect(held, group.name).toBeLessThanOrEqual(FORMS.length / 2);
    }
  });

  // §5 writes its vocabulary in prose and so writes it lower case; a seeded
  // name is a rendered label — a dropdown option and the section header above
  // it — and those are Title Case, as §6's categories already are. Every test
  // above compares case-insensitively, since §5 is the lower-case source, and
  // that is exactly what leaves room for a seeded "herb" to pass all of them.
  // Each word is checked rather than the first, so a two-word name an admin
  // adds later cannot land half-cased.
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

  // A description copied from the row above satisfies "non-empty" and explains
  // nothing, which is the failure §5's requirement is actually about.
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
  // The precondition behind every count below: a fresh clone really starts at
  // zero, so the rows that follow are this seed's and not a leftover.
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

  // The vocabulary is the admin's from here on (MB.35), and a description is
  // the part of a curated row most likely to be rewritten — a seed that
  // re-asserted its own wording would undo that on the next deploy.
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

  // Idempotency keys on the slug and ignores `deleted_at`, which is stronger
  // than the partial unique index gives on its own: the index stops only a
  // second *live* row, so a slug an admin had soft-deleted would be
  // re-inserted on the next deploy. Removing a form is a decision.
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
