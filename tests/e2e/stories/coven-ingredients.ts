import { expect, type Locator, type Page } from '@playwright/test';
import postgres from 'postgres';
import { slugify } from '@/lib/slugify';
import { makeIngredient, makeVariant } from '../../support/fixtures/ingredient';
import { insertCupboardEntry } from '../../support/db/insert-cupboard-entry';
import { insertIngredient } from '../../support/db/insert-ingredient';
import type { IngredientFixture, Overrides } from '../../support/fixtures/types';
import { e2eDatabaseUrl } from '../database';
import { signInAs } from '../session';

// Rows go in through the raw client so setup does not depend on the code a story proves (CLAUDE.md, Testing).

export type Role = 'owner' | 'member' | 'viewer';

export async function withSql<T>(use: (sql: postgres.Sql) => Promise<T>): Promise<T> {
  const sql = postgres(e2eDatabaseUrl(), { onnotice: () => {} });
  try {
    return await use(sql);
  } finally {
    await sql.end();
  }
}

export interface Coven {
  id: string;
  slug: string;
  users: Record<string, string>;
}

// `signInAs` names every user alike, so each is renamed after its key.
export async function seedCoven(
  page: Page,
  name: string,
  domain: string,
  roles: Record<string, Role>,
): Promise<Coven> {
  const users: Record<string, string> = {};
  for (const key of Object.keys(roles)) {
    users[key] = (await signInAs(page, `${key.toLowerCase()}@${domain}`)).userId;
  }
  const owner = Object.keys(roles).find((key) => roles[key] === 'owner');
  if (!owner) throw new Error('A coven needs an owner to create it');
  const creator = users[owner];
  const slug = slugify(name);

  const id = await withSql((sql) =>
    sql.begin(async (tx) => {
      await tx`select set_config('app.current_user_id', ${creator}, true)`;
      for (const [key, userId] of Object.entries(users)) {
        await tx`update users set name = ${`Fixture ${key}`} where id = ${userId}`;
      }
      const [workspace] = await tx<{ id: string }[]>`
        insert into workspaces (name, slug, created_by, updated_by)
        values (${name}, ${slug}, ${creator}, ${creator})
        returning id`;
      for (const [key, role] of Object.entries(roles)) {
        await tx`
          insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
          values (${workspace.id}, ${users[key]}, ${role}, ${creator}, ${creator})`;
      }
      return workspace.id;
    }),
  );

  return { id, slug, users };
}

export interface Held {
  ingredientId: string;
  variantId: string;
}

export async function compendiumVariant(
  sql: postgres.Sql,
  name: string,
  form: string,
  canonicalName?: string,
): Promise<Held> {
  const rows = await sql<{ ingredient_id: string; id: string }[]>`
    select v.ingredient_id, v.id
    from ingredient_variants v
    join ingredients i on i.id = v.ingredient_id
    where i.workspace_id is null and i.deleted_at is null and v.deleted_at is null
      and i.name = ${name} and lower(v.form) = lower(${form})
      and (${canonicalName ?? null}::text is null or i.canonical_name = ${canonicalName ?? null})`;
  if (rows.length !== 1) {
    throw new Error(`Expected one seeded ${name} (${form}), found ${rows.length}`);
  }
  return { ingredientId: rows[0].ingredient_id, variantId: rows[0].id };
}

export async function localIngredient(
  sql: postgres.Sql,
  covenId: string,
  author: string,
  overrides: Overrides<IngredientFixture> = {},
): Promise<Held> {
  const ingredientId = await insertIngredient(
    sql,
    makeIngredient({
      variants: [makeVariant({ form: 'Root' })],
      ...overrides,
      workspaceId: covenId,
    }),
    author,
  );
  const [variant] = await sql<{ id: string }[]>`
    select id from ingredient_variants where ingredient_id = ${ingredientId} order by form limit 1`;
  return { ingredientId, variantId: variant.id };
}

const DIMENSION_OF = { g: 'weight', ml: 'volume', piece: 'count' } as const;

type StockUnit = keyof typeof DIMENSION_OF;

export interface Stock {
  quantity: number;
  unit: StockUnit;
  threshold: number;
}

// A compendium entry's jar puts the entry in the coven's cupboard first, since the list holds only what its cupboard names.
export async function insertStock(
  sql: postgres.Sql,
  covenId: string,
  held: Held,
  { quantity, unit, threshold }: Stock,
  author: string,
): Promise<string> {
  const [cupboard] = await sql<{ needed: boolean }[]>`
    select i.workspace_id is null and not exists (
      select 1 from workspace_compendium_entries e
      where e.workspace_id = ${covenId} and e.ingredient_id = i.id and e.deleted_at is null
    ) as needed
    from ingredients i where i.id = ${held.ingredientId}`;
  if (cupboard.needed) {
    await insertCupboardEntry(
      sql,
      { workspaceId: covenId, ingredientId: held.ingredientId },
      author,
    );
  }
  return sql.begin(async (tx) => {
    await tx`select set_config('app.current_user_id', ${author}, true)`;
    const [row] = await tx<{ id: string }[]>`
      insert into inventory_items (
        workspace_id, ingredient_id, variant_id, quantity_on_hand, unit, unit_dimension,
        low_stock_threshold, created_by, updated_by
      )
      values (
        ${covenId}, ${held.ingredientId}, ${held.variantId}, ${quantity}, ${unit},
        ${DIMENSION_OF[unit]}, ${threshold}, ${author}, ${author}
      )
      returning id`;
    return row.id;
  });
}

/** Raw SQL, since the spell factory imports the whole seed. */
export async function insertSpell(
  sql: postgres.Sql,
  covenId: string,
  title: string,
  visibility: 'private' | 'workspace',
  author: string,
  status: 'draft' | 'complete' = 'draft',
): Promise<string> {
  return sql.begin(async (tx) => {
    await tx`select set_config('app.current_user_id', ${author}, true)`;
    const [row] = await tx<{ id: string }[]>`
      insert into spells (workspace_id, title, visibility, status, created_by, updated_by)
      values (${covenId}, ${title}, ${visibility}, ${status}, ${author}, ${author})
      returning id`;
    return row.id;
  });
}

export async function insertStep(
  sql: postgres.Sql,
  spellId: string,
  held: Held,
  { quantity, unit, position }: { quantity: number; unit: StockUnit; position: number },
  author: string,
): Promise<string> {
  return sql.begin(async (tx) => {
    await tx`select set_config('app.current_user_id', ${author}, true)`;
    const [row] = await tx<{ id: string }[]>`
      insert into spell_steps (
        spell_id, ingredient_id, variant_id, quantity, unit, position,
        created_by, updated_by
      )
      values (
        ${spellId}, ${held.ingredientId}, ${held.variantId}, ${quantity}, ${unit},
        ${position}, ${author}, ${author}
      )
      returning id`;
    return row.id;
  });
}

// Nothing is deducted; a test that needs a deduction line writes it with `insertDeduction`.
export async function insertWorking(
  sql: postgres.Sql,
  spellId: string,
  author: string,
  {
    workedOn,
    status = 'complete',
    visibility = 'workspace',
    note = null,
    participants = [author],
  }: {
    workedOn: string;
    status?: 'draft' | 'complete';
    visibility?: 'private' | 'workspace';
    note?: string | null;
    participants?: readonly string[];
  },
): Promise<string> {
  return sql.begin(async (tx) => {
    await tx`select set_config('app.current_user_id', ${author}, true)`;
    const [row] = await tx<{ id: string }[]>`
      insert into spell_workings (
        spell_id, status, worked_on, completed_at, note, visibility, created_by, updated_by
      )
      values (
        ${spellId}, ${status}, ${workedOn}, ${status === 'complete' ? new Date() : null},
        ${note}, ${visibility}, ${author}, ${author}
      )
      returning id`;
    for (const [position, userId] of participants.entries()) {
      await tx`
        insert into spell_working_participants (working_id, user_id, position, created_by, updated_by)
        values (${row.id}, ${userId}, ${position + 1}, ${author}, ${author})`;
    }
    return row.id;
  });
}

export async function insertDeduction(
  sql: postgres.Sql,
  workingId: string,
  stepId: string,
  inventoryItemId: string,
  { quantity, unit }: { quantity: number; unit: StockUnit },
  author: string,
): Promise<void> {
  await sql.begin(async (tx) => {
    await tx`select set_config('app.current_user_id', ${author}, true)`;
    await tx`
      insert into spell_working_deductions (
        working_id, spell_step_id, inventory_item_id, quantity, unit, created_by, updated_by
      )
      values (${workingId}, ${stepId}, ${inventoryItemId}, ${quantity}, ${unit}, ${author}, ${author})`;
  });
}

interface GraphqlAnswer {
  data?: Record<string, unknown> | null;
  errors?: { message: string; extensions?: { code?: string } }[];
}

// `page.request` would not carry the session: it reaches Chromium as an extra header on the page (tests/e2e/session.ts, `holdSession`).
export async function graphqlFromPage(
  page: Page,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<GraphqlAnswer> {
  return page.evaluate(
    async ({ query, variables }) => {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/graphql-response+json, application/json',
        },
        body: JSON.stringify({ query, variables }),
      });
      return (await response.json()) as GraphqlAnswer;
    },
    { query, variables },
  );
}

// A reload starts a document without the mark.
export async function markDocument(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as unknown as { storyMark?: boolean }).storyMark = true;
  });
}

export async function stillSameDocument(page: Page): Promise<boolean> {
  return page.evaluate(() => (window as unknown as { storyMark?: boolean }).storyMark === true);
}


/** CovenCards' `IngredientCardList` (claude-docs/components/coven-cards.md). */
export function ingredientList(page: Page): Locator {
  return page.getByRole('list', { name: 'Ingredients' });
}

/** Direct items only, since a card holds lists of its own (category chips, jar lines). */
export function cardsIn(list: Locator): Locator {
  return list.locator(':scope > li');
}

export function compendiumList(page: Page): Locator {
  return page.getByRole('list', { name: 'Compendium' });
}

export function rowOf(list: Locator, name: string, canonicalName?: string): Locator {
  const row = cardsIn(list).filter({ hasText: name });
  return canonicalName ? row.filter({ hasText: canonicalName }) : row;
}

export function localBadge(row: Locator): Locator {
  return row.getByText('Local', { exact: true });
}

export function lowBadge(row: Locator): Locator {
  return row.getByRole('button', { name: /^Low Stock/ });
}

export function outBadge(row: Locator): Locator {
  return row.getByRole('button', { name: 'Out of Stock' });
}

/** FilterForm's `<search>` landmark (claude-docs/components/filter-form.md). */
export function filterOf(page: Page): Locator {
  return page.getByRole('search');
}

/** claude-docs/components/ingredient-search.md */
export function nameSearch(page: Page): Locator {
  return filterOf(page).getByRole('combobox', { name: 'Name' });
}

/** Waits for the address to carry the text so the list asserted next is the searched one. */
export async function searchCovenList(page: Page, text: string): Promise<void> {
  await nameSearch(page).fill(text);
  await nameSearch(page).press('Enter');
  await page.waitForURL((url) => [...url.searchParams.values()].includes(text));
}

/** Filters is a link until hydration, so the button waits for the script (claude-docs/components/facet-panel.md). */
export async function openFilters(page: Page): Promise<Locator> {
  const button = page.getByRole('button', { name: /^Filters/ });
  await expect(button).toBeVisible();
  if ((await button.getAttribute('aria-expanded')) !== 'true') await button.click();
  const panel = page.getByRole('dialog', { name: 'Filters' });
  await expect(panel).toBeVisible();
  return panel;
}

/** A change is held until Apply Filters (claude-docs/components/facet-panel.md); waits for the address to change. */
export async function applyFilters(page: Page, panel: Locator): Promise<void> {
  const before = page.url();
  await panel.getByRole('button', { name: 'Apply Filters' }).click();
  await page.waitForURL((url) => url.toString() !== before);
}

/** An option's name starts with the category's and carries its count (claude-docs/components/category-picker.md). */
export async function pickCategory(panel: Locator, name: string): Promise<void> {
  await panel.getByRole('combobox', { name: 'Category' }).fill(name);
  await panel
    .page()
    .getByRole('option', { name: new RegExp(`^${name}`) })
    .click();
}

/** The native radio is drawn invisible and, while the menu is shut, out of the accessibility tree, so the label is clicked. */
export async function chooseChip(group: Locator, name: string | RegExp): Promise<void> {
  await group.locator('summary').click();
  await group
    .getByRole('radio', { name })
    .locator('xpath=ancestor::label[1]')
    .click({ position: { x: 10, y: 10 } });
}

export function chipChoice(group: Locator, name: string | RegExp): Locator {
  return group.getByRole('radio', { name, includeHidden: true });
}

/** The browser reads the hidden span after the label as a space and a comma, so the name is matched on both. */
const fieldName = (label: string, form: string): RegExp => new RegExp(`^${label}\\s*, ${form}$`);

/** `choose(form)` presses a jar's button before `jar(form)` can reach its fields. */
export function stockEditor(row: Locator, name: string, coven?: string) {
  const page = row.page();
  const title = `Edit Stock, ${name}`;
  // Opened from the compendium, the eyebrow names the coven: "Edit Stock for <Coven>, <name>".
  const dialog = page.getByRole('dialog', {
    name: coven ? `Edit Stock for ${coven}, ${name}` : title,
  });
  return {
    // On an entry page the shelf's jar buttons add the form after the name, so it is matched whole; an entry with no formal name would match a jar button too.
    open: row.getByRole('button', {
      name: new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(, [^,]+)?$`),
    }),
    dialog,
    /** The button's name goes on to its amount and any mark ("Oil 30 ml Edited"), so it is matched on the start. */
    async choose(form: string) {
      await dialog.getByRole('button', { name: new RegExp(`^${form}\\b`) }).click();
    },
    jar(form: string) {
      const group = dialog.getByRole('group', { name: form, exact: true });
      return {
        group,
        quantity: group.getByRole('spinbutton', { name: fieldName('Quantity', form) }),
        unit: group.getByRole('combobox', { name: fieldName('Unit', form) }),
        threshold: group.getByRole('spinbutton', { name: fieldName('Low Stock At', form) }),
        remove: group.getByRole('button', { name: `Remove ${form}`, exact: true }),
        undo: group.getByRole('button', { name: `Undo Remove ${form}`, exact: true }),
        async pickUnit(label: string) {
          await group.getByRole('combobox', { name: fieldName('Unit', form) }).click();
          await page.getByRole('option', { name: label, exact: true }).click();
        },
      };
    },
    addForm: dialog.getByRole('combobox', { name: 'Add Form' }),
    addButton: dialog.getByRole('button', { name: 'Add', exact: true }),
    async add(form: string) {
      await dialog.getByRole('combobox', { name: 'Add Form' }).click();
      await page.getByRole('option', { name: form, exact: true }).click();
      await dialog.getByRole('button', { name: 'Add', exact: true }).click();
    },
    save: dialog.getByRole('button', { name: 'Save Stock' }),
    cancel: dialog.getByRole('button', { name: 'Cancel' }),
  };
}

/** Found by the element: the moment is its `datetime` attribute, not a name. */
export function editedAt(row: Locator): Locator {
  return row.locator('time');
}
