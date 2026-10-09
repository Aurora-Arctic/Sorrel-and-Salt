import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { fromRoot } from '../../support/paths';
import { truncateAllTables } from '../../support/seeded-database';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { FORM_GROUPS, FORMS, seedForms } from '@/db/seed/forms';
import { formSlug, slugify } from '@/lib/slugify';
import type { DesignFormGroup, FormGroupRow, FormRow } from './types';

// §5's six form groups and every form under them, asserted against §5's own
// table rather than a copy, against the clone, which holds the vocabulary as
// `standard` wrote it through the same function; a re-run over an admin's
// edit empties the tables first, and the shape every seed shares is
// index.test.ts's (MB.183) — claude-docs/db/form-vocabulary-seed.md, "The form vocabulary seed".
// The regrouping's own property is asserted too: no section holds more than
// half the list.

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

/** §5's table: `| Botanical | herb, root, … |`, in the order §5 writes it. */
const DESIGN_GROUPS: DesignFormGroup[] = DESIGN_SECTION.split('\n')
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

let sql: ReturnType<typeof postgres>;
let db: ReturnType<typeof drizzle>;

async function allGroups(): Promise<FormGroupRow[]> {
  return sql<FormGroupRow[]>`select * from ingredient_form_groups order by slug`;
}

async function allForms(): Promise<FormRow[]> {
  return sql<FormRow[]>`select * from ingredient_forms order by slug`;
}

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
  db = drizzle(sql);
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
    expect((await allGroups()).filter((group) => group.description.trim() === '')).toEqual([]);
    expect((await allForms()).filter((form) => form.description.trim() === '')).toEqual([]);
  });
});

describe('seedForms(db)', () => {
  it('writes the groups before the forms, each form pointing at its own group', async () => {
    const groupSlugById = new Map((await allGroups()).map((group) => [group.id, group.slug]));
    const seeded = (await allForms()).map((form) => ({
      key: form.seed_key,
      group: groupSlugById.get(form.group_id),
    }));

    expect(seeded.sort((a, b) => String(a.key).localeCompare(String(b.key)))).toEqual(
      FORMS.map((form) => ({ key: slugify(form.name), group: slugify(form.group) })).sort((a, b) =>
        a.key.localeCompare(b.key),
      ),
    );
  });

  // M5.6a: two live forms may share a name under two groups (DESIGN.md §5),
  // so the address carries the group. The key stays the name, as every
  // database seeded before holds it, and never changes after.
  it('slugs each form by its name and its group, and keys it by its name', async () => {
    const byKey = new Map((await allForms()).map((form) => [form.seed_key, form]));
    for (const form of FORMS) {
      expect(byKey.get(slugify(form.name))?.slug, form.name).toBe(formSlug(form.name, form.group));
    }
    expect(byKey.get('bark')?.slug).toBe('bark-botanical');
  });

  describe('over a database an admin has edited', () => {
    beforeEach(async () => {
      await truncateAllTables(sql);
      // Precondition: the truncated clone really starts empty, so the rows edited are this run's.
      expect(await allForms()).toEqual([]);
    });

    // The vocabulary is the admin's (MB.35), and a description is the part of a
    // curated row most likely to be rewritten.
    it('does not overwrite a description an admin has since rewritten', async () => {
      await seedForms(db);
      await sql`
        update ingredient_forms set description = 'The bark of the root, not the stem.'
        where seed_key = 'bark'
      `;

      await seedForms(db);

      const [bark] = (await allForms()).filter((form) => form.seed_key === 'bark');
      expect(bark.description).toBe('The bark of the root, not the stem.');
    });

    // An admin's own row under a seed name and group holds the address the
    // seed's would, and the slug index would refuse a second.
    it('does not insert a form an admin wrote under its name and group', async () => {
      await seedForms(db);
      await sql`delete from ingredient_forms where seed_key = 'herb'`;
      const [botanical] =
        await sql`select id from ingredient_form_groups where seed_key = 'botanical'`;
      await sql`
        insert into ingredient_forms (name, slug, description, group_id, created_by, updated_by)
        values ('Herb', 'herb-botanical', 'Written by an admin.', ${botanical.id},
          ${BOOTSTRAP_USER_ID}, ${BOOTSTRAP_USER_ID})
      `;

      await expect(seedForms(db)).resolves.toBeUndefined();

      const herbs = (await allForms()).filter((form) => form.name === 'Herb');
      expect(herbs).toHaveLength(1);
      expect(herbs[0]).toMatchObject({ seed_key: null, description: 'Written by an admin.' });
    });

    // The seed is the backfill (claude-docs/db/ingredient-slugs.md's precedent): a
    // database seeded before M5.6a holds `slugify(name)`, and a SQL rewrite
    // would be a second slug rule.
    describe('the slugs a database seeded before M5.6a holds', () => {
      it('re-derives every live form’s slug from its name and its group’s, as the bootstrap user', async () => {
        await seedForms(db);
        await sql`update ingredient_forms set slug = seed_key`;
        // The precondition: every slug is the old rule's.
        expect((await allForms()).filter((form) => form.slug !== form.seed_key)).toEqual([]);

        await seedForms(db);

        const forms = await allForms();
        const groupNameById = new Map((await allGroups()).map((group) => [group.id, group.name]));
        for (const form of forms) {
          expect(form.slug, form.name).toBe(
            formSlug(form.name, groupNameById.get(form.group_id) as string),
          );
          expect(form.updated_by, form.name).toBe(BOOTSTRAP_USER_ID);
        }
      });

      it('writes only the rows whose slug differs', async () => {
        await seedForms(db);
        await sql`update ingredient_forms set slug = 'bark' where seed_key = 'bark'`;
        const others = (await allForms()).filter((form) => form.seed_key !== 'bark');

        await seedForms(db);

        const forms = await allForms();
        expect(forms.find((form) => form.seed_key === 'bark')?.slug).toBe('bark-botanical');
        expect(forms.filter((form) => form.seed_key !== 'bark')).toEqual(others);
      });

      it('follows a group renamed since, and leaves a deleted form as it was', async () => {
        await seedForms(db);
        await sql`update ingredient_form_groups set name = 'Oddment' where seed_key = 'curio'`;
        await sql`
          update ingredient_forms set slug = 'egg', deleted_at = now(), deleted_by = ${BOOTSTRAP_USER_ID}
          where seed_key = 'egg'
        `;
        const [deleted] = (await allForms()).filter((form) => form.seed_key === 'egg');

        await seedForms(db);

        const forms = await allForms();
        expect(forms.find((form) => form.seed_key === 'curio')?.slug).toBe('curio-oddment');
        expect(forms.find((form) => form.seed_key === 'egg')).toEqual(deleted);
      });
    });
  });
});
