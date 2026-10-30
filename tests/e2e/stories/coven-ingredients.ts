import { expect, type Locator, type Page } from '@playwright/test';
import postgres from 'postgres';
import { slugify } from '@/lib/slugify';
import { makeIngredient, makeVariant } from '../../support/fixtures/ingredient';
import { insertCupboardEntry } from '../../support/db/insert-cupboard-entry';
import { insertIngredient } from '../../support/db/insert-ingredient';
import type { IngredientFixture, Overrides } from '../../support/fixtures/types';
import { e2eDatabaseUrl } from '../database';
import { signInAs } from '../session';

// What the coven's ingredient stories share: the rows each sets up and the locators of the pages they walk. Rows
// go in through the raw client, as tests/e2e/coven.spec.ts writes its coven, so setup does not depend on the
// code a story proves (CLAUDE.md, Testing); the locators are here once so a changed name is corrected in one place.

export type Role = 'owner' | 'member' | 'viewer';

/** Opens a client on this worker's database for `use`, and always closes it. */
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
  /** Each member's user id, by the key the story gave them. */
  users: Record<string, string>;
}

/**
 * A coven named `name` with a user signed in for each of `roles` at `<key>@<domain>` and made a member in that
 * role; the first owner creates it. `page` ends signed in as the last; `signInAgainAs` switches. Users are
 * renamed after their key, "Fixture A", since `signInAs` names every user alike.
 */
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

/** A seeded compendium entry's variant of `form`, by the entry's label and, where the label is shared (five Cat's Claws), its formal name. */
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

/** A coven's own ingredient written by `author` with one variant, the invented Testwort unless `overrides` says otherwise; its form is what a stock row names. */
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

/** The units the stories stock in, each with the dimension the row must agree with. */
const DIMENSION_OF = { g: 'weight', ml: 'volume', piece: 'count' } as const;

type StockUnit = keyof typeof DIMENSION_OF;

export interface Stock {
  quantity: number;
  unit: StockUnit;
  /** The low-stock threshold, in `unit`; a zero turns the warning off. */
  threshold: number;
}

/**
 * A stock row, the coven's jar of `held`, written by `author` as `createStock` would: the threshold stated on
 * the row, and a compendium entry's jar putting the entry in the coven's cupboard first, since the list holds
 * only what its cupboard names.
 */
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

/** A spell in the coven's grimoire as raw SQL (the spell factory imports the whole seed): a draft unless `status` says otherwise. */
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

/** A step on `spellId` laying `quantity` `unit` of `held` at `position`, written by `author`. */
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

/**
 * A working of `spellId` recorded by `author`, with `participants` (user ids, in order) as raw SQL: complete unless `status` says
 * draft. Nothing is deducted; a test that needs a deduction line writes it with `insertDeduction`.
 */
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

/** A deduction of `quantity` `unit` on `workingId` for `stepId`, taken from `inventoryItemId`. */
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

/**
 * Sends `query` to /api/graphql from inside the page, as the app's own client does, so the request carries the
 * page's session. `page.request` would not: the session reaches Chromium as an extra header on the page
 * (tests/e2e/session.ts, `holdSession`), which the context's request client never sees.
 */
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

/** Marks the document so a later `expectSameDocument` proves no full reload came between: a reload starts a document without the mark. */
export async function markDocument(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as unknown as { storyMark?: boolean }).storyMark = true;
  });
}

export async function stillSameDocument(page: Page): Promise<boolean> {
  return page.evaluate(() => (window as unknown as { storyMark?: boolean }).storyMark === true);
}

// The locators of the pages the stories walk, named as a task entry or component doc names them, or as chosen
// here where neither does.

/** The coven's ingredient list: CovenCards' `IngredientCardList`, named after its page (claude-docs/components/coven-cards.md). */
export function ingredientList(page: Page): Locator {
  return page.getByRole('list', { name: 'Ingredients' });
}

/** The cards of a card list: its direct items only, since a card holds lists of its own (category chips, jar lines). */
export function cardsIn(list: Locator): Locator {
  return list.locator(':scope > li');
}

/** The compendium's list, named after its page as the coven's list is. */
export function compendiumList(page: Page): Locator {
  return page.getByRole('list', { name: 'Compendium' });
}

/**
 * One card in `list`, by the label it shows and, where the label is shared, the formal name on its secondary
 * line: found by what the row says about itself, as a table row is by its cells.
 */
export function rowOf(list: Locator, name: string, canonicalName?: string): Locator {
  const row = cardsIn(list).filter({ hasText: name });
  return canonicalName ? row.filter({ hasText: canonicalName }) : row;
}

/** The badge marking a coven's own entry, found by its word "Local", as a button is by its name. */
export function localBadge(row: Locator): Locator {
  return row.getByText('Local', { exact: true });
}

/**
 * The two stock badges, each a button drawn as an icon alone and named "Low Stock" or "Out of Stock"; its tip
 * opens from it.
 */
export function lowBadge(row: Locator): Locator {
  return row.getByRole('button', { name: /^Low Stock/ });
}

export function outBadge(row: Locator): Locator {
  return row.getByRole('button', { name: 'Out of Stock' });
}

/**
 * The filter above a list: FilterForm's `<search>` landmark (claude-docs/components/filter-form.md). It holds
 * the type-ahead named "Name", the Filters button, and on the coven's list the Compact switch.
 */
export function filterOf(page: Page): Locator {
  return page.getByRole('search');
}

/** The search row's type-ahead, labelled "Name" (claude-docs/components/ingredient-search.md). */
export function nameSearch(page: Page): Locator {
  return filterOf(page).getByRole('combobox', { name: 'Name' });
}

/**
 * Searches the coven's list for `text`: Enter applies the typed text to the paged list rather than picking a
 * suggestion, and the helper waits for the address to carry it so the list asserted next is the searched one.
 */
export async function searchCovenList(page: Page, text: string): Promise<void> {
  await nameSearch(page).fill(text);
  await nameSearch(page).press('Enter');
  await page.waitForURL((url) => [...url.searchParams.values()].includes(text));
}

/**
 * Opens the Filters panel and returns it (claude-docs/components/facet-panel.md). The button exists only once
 * the page has hydrated (before that Filters is a link), so waiting for it waits for the script.
 */
export async function openFilters(page: Page): Promise<Locator> {
  const button = page.getByRole('button', { name: /^Filters/ });
  await expect(button).toBeVisible();
  if ((await button.getAttribute('aria-expanded')) !== 'true') await button.click();
  const panel = page.getByRole('dialog', { name: 'Filters' });
  await expect(panel).toBeVisible();
  return panel;
}

/**
 * Applies what the panel holds: a change is held until Apply Filters (claude-docs/components/facet-panel.md).
 * Waits for the address to change, so the list asserted next is the filtered one.
 */
export async function applyFilters(page: Page, panel: Locator): Promise<void> {
  const before = page.url();
  await panel.getByRole('button', { name: 'Apply Filters' }).click();
  await page.waitForURL((url) => url.toString() !== before);
}

/**
 * Picks a category in the panel's CategoryPicker, the box named "Category" (claude-docs/components/category-picker.md).
 * An option's name starts with the category's and carries its count.
 */
export async function pickCategory(panel: Locator, name: string): Promise<void> {
  await panel.getByRole('combobox', { name: 'Category' }).fill(name);
  await panel
    .page()
    .getByRole('option', { name: new RegExp(`^${name}`) })
    .click();
}

/**
 * Picks a choice in one of the panel's choice chips (Toxic, Source): opens its menu, then clicks the option's
 * label, since the native radio is drawn invisible and, while the menu is shut, out of the accessibility tree.
 */
export async function chooseChip(group: Locator, name: string | RegExp): Promise<void> {
  await group.locator('summary').click();
  await group
    .getByRole('radio', { name })
    .locator('xpath=ancestor::label[1]')
    .click({ position: { x: 10, y: 10 } });
}

/** A radio in a chip's menu whether the menu is open or shut, for what it holds rather than what is shown. */
export function chipChoice(group: Locator, name: string | RegExp): Locator {
  return group.getByRole('radio', { name, includeHidden: true });
}

/**
 * A stock field's name: its label, then its form out of sight ("Quantity, Root"). The browser reads the hidden
 * span after the label as a space and a comma, so the name is matched on both.
 */
const fieldName = (label: string, form: string): RegExp => new RegExp(`^${label}\\s*, ${form}$`);

/**
 * The Edit Stock dialog, from the stock button in a coven card's foot or its Quick Look, named "Edit Stock, <name>".
 * It lists the jars held, one button per form, with the chosen jar's fields in a group named for its form:
 * `choose(form)` presses its button before `jar(form)` can reach them. Add Form, Remove and Save act on the batch.
 */
export function stockEditor(row: Locator, name: string, coven?: string) {
  const page = row.page();
  const title = `Edit Stock, ${name}`;
  // Opened from a page that is not a coven's (the compendium), the dialog's eyebrow names the
  // coven, "Edit Stock for <Coven>, <name>", so it is found by that name.
  const dialog = page.getByRole('dialog', {
    name: coven ? `Edit Stock for ${coven}, ${name}` : title,
  });
  return {
    // The button is named for the entry as the card is: the name, then the formal name when it has one. On an
    // entry page the shelf's jar buttons add the form after that, so the name is matched whole: the title,
    // then at most one more part. An entry with no formal name would match a jar button too.
    open: row.getByRole('button', {
      name: new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(, [^,]+)?$`),
    }),
    dialog,
    /**
     * Chooses a jar from the list, by its form. The button's name starts with the form and goes on to its
     * amount and any mark ("Oil 30 ml Edited"), so it is matched on the start.
     */
    async choose(form: string) {
      await dialog.getByRole('button', { name: new RegExp(`^${form}\\b`) }).click();
    },
    /** The chosen jar's fields, by its form. */
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
    /** Adds `form`, a form the coven holds no jar of, which chooses it. */
    async add(form: string) {
      await dialog.getByRole('combobox', { name: 'Add Form' }).click();
      await page.getByRole('option', { name: form, exact: true }).click();
      await dialog.getByRole('button', { name: 'Add', exact: true }).click();
    },
    save: dialog.getByRole('button', { name: 'Save', exact: true }),
    cancel: dialog.getByRole('button', { name: 'Cancel' }),
  };
}

/** When the row was last edited: a `<time>`, found by the element since the moment is its `datetime` attribute, not a name. */
export function editedAt(row: Locator): Locator {
  return row.locator('time');
}
