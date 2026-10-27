import { expect, type Locator, type Page } from '@playwright/test';
import postgres from 'postgres';
import { slugify } from '@/lib/slugify';
import { makeIngredient, makeVariant } from '../../support/fixtures/ingredient';
import { insertCupboardEntry } from '../../support/db/insert-cupboard-entry';
import { insertIngredient } from '../../support/db/insert-ingredient';
import type { IngredientFixture, Overrides } from '../../support/fixtures/types';
import { e2eDatabaseUrl } from '../database';
import { signInAs } from '../session';

// What the coven's ingredient stories share: the rows each sets up, and the
// locators of the pages Waves 11 and 12 build. The rows go in through the raw
// client, as tests/e2e/coven.spec.ts writes its coven, because setup must not
// depend on the code a story is proving (CLAUDE.md, Testing). The locators are
// here once rather than in each spec because the pages are not built yet: the
// task that builds one corrects a guessed name in one place, and every story
// walking that page follows.

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
 * A coven named `name`, with a user signed in for each of `roles` at
 * `<key>@<domain>` and made a member in that role. The first owner listed
 * creates it. Each user is signed in on `page` in turn, so `page` ends signed
 * in as the last; `signInAgainAs` switches between them. The users are
 * renamed after their key, "Fixture A", because `signInAs` names every user
 * the same and a story naming an editor needs to tell them apart.
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

/**
 * A seeded compendium entry's variant of `form`, by the entry's label and,
 * where the label is shared (five Cat's Claws), its formal name.
 */
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

/**
 * A coven's own ingredient, written by `author`, with one variant: the
 * fixture's invented Testwort unless `overrides` says otherwise. Its one
 * form is what a stock row names.
 */
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
  /** The low-stock threshold, in `unit`; a zero turns the warning off (M9.8). */
  threshold: number;
}

/**
 * A stock row, the coven's jar of `held`, written by `author` as M9.3's
 * `createStock` would write it: the threshold stated on the row, never left to
 * a constant read later (M9.8), and a jar of a compendium entry putting the
 * entry in the coven's cupboard first when it is not there already (M12.15),
 * since the coven's list holds only what its cupboard names.
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

/**
 * A spell in the coven's grimoire, as raw SQL: the spell factory imports the whole seed. A
 * draft unless `status` says otherwise, as the table's default is; the Grimoire lists a
 * complete spell on its Spells tab and a draft on its Drafts tab (M10.11).
 */
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

interface GraphqlAnswer {
  data?: Record<string, unknown> | null;
  errors?: { message: string; extensions?: { code?: string } }[];
}

/**
 * Sends `query` to /api/graphql from inside the page, as the app's own client
 * sends it, so the request carries the page's session. `page.request` would
 * not: the session reaches Chromium as an extra header on the page
 * (tests/e2e/session.ts, `holdSession`), which the context's request client
 * never sees. The page must be open on the app's origin.
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

/**
 * Marks the document so a later `expectSameDocument` proves no full reload
 * came between: a reload starts a new document, which has lost the mark.
 */
export async function markDocument(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as unknown as { storyMark?: boolean }).storyMark = true;
  });
}

export async function stillSameDocument(page: Page): Promise<boolean> {
  return page.evaluate(() => (window as unknown as { storyMark?: boolean }).storyMark === true);
}

// The locators of the pages the stories walk. Each name is the one the task
// entry or a component doc gives where there is one; where neither names it,
// the choice is made here and says so, for the building task to confirm or
// correct. The coven's list (M9.6) and the compendium's (M8.18) are built.

/**
 * The coven's ingredient list (M9.6): CovenCards' `IngredientCardList`,
 * named after its page, "Ingredients" (claude-docs/components/coven-cards.md).
 */
export function ingredientList(page: Page): Locator {
  return page.getByRole('list', { name: 'Ingredients' });
}

/**
 * The cards of a card list: its direct items only, since a card holds lists
 * of its own (its category chips, and on the coven's list its jar lines).
 */
export function cardsIn(list: Locator): Locator {
  return list.locator(':scope > li');
}

/**
 * The compendium's list (M8.18), named after its page, as the coven's list
 * is. The name is this file's choice.
 */
export function compendiumList(page: Page): Locator {
  return page.getByRole('list', { name: 'Compendium' });
}

/**
 * One card in `list`, by the label it shows and, where the label is shared,
 * the formal name its secondary line carries (M8.14). Found by what the row
 * says about itself, as a table row is found by its cells: these are data,
 * not copy.
 */
export function rowOf(list: Locator, name: string, canonicalName?: string): Locator {
  const row = cardsIn(list).filter({ hasText: name });
  return canonicalName ? row.filter({ hasText: canonicalName }) : row;
}

/**
 * The badge marking a coven's own entry (M8.19: "Local entries are badged";
 * M9.7: "in every state"). Found by its word, as a button is by its name;
 * "Local" is this file's choice, after M9.7's "local only".
 */
export function localBadge(row: Locator): Locator {
  return row.getByText('Local', { exact: true });
}

/**
 * M9.8's two badges. Each is a button, drawn as an icon alone (the owner's call,
 * 2026-10-20), named "Low Stock" or "Out of Stock"; its tip opens from it.
 * "Low Stock" and "Out of Stock" are this file's choice, after the entry's "low
 * and out-of-stock badges", in title case as every label is.
 */
export function lowBadge(row: Locator): Locator {
  return row.getByRole('button', { name: /^Low Stock/ });
}

export function outBadge(row: Locator): Locator {
  return row.getByRole('button', { name: 'Out of Stock' });
}

/**
 * The filter above a list: FilterForm's `<search>` landmark
 * (claude-docs/components/filter-form.md), M8.10's search row. It holds the
 * type-ahead named "Name", the Filters button that opens the facet panel,
 * and on the coven's list the Compact switch.
 */
export function filterOf(page: Page): Locator {
  return page.getByRole('search');
}

/** The search row's type-ahead, labelled "Name" (claude-docs/components/ingredient-search.md). */
export function nameSearch(page: Page): Locator {
  return filterOf(page).getByRole('combobox', { name: 'Name' });
}

/**
 * Searches the coven's list for `text`: Enter applies the typed text to the
 * paged list rather than picking a suggestion (M8.10). Waits for the address
 * to carry the text, so the list asserted next is the searched one and not
 * the one before it.
 */
export async function searchCovenList(page: Page, text: string): Promise<void> {
  await nameSearch(page).fill(text);
  await nameSearch(page).press('Enter');
  await page.waitForURL((url) => [...url.searchParams.values()].includes(text));
}

/**
 * Opens the Filters panel and returns it (claude-docs/components/facet-panel.md).
 * The button only exists once the page has hydrated (before it, Filters is a
 * link to the open panel), so waiting for it waits for the script.
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
 * Applies what the panel holds: a change in it is held, not applied, until
 * Apply Filters (claude-docs/components/facet-panel.md). Waits for the address
 * to change, so the list asserted next is the filtered one.
 */
export async function applyFilters(page: Page, panel: Locator): Promise<void> {
  const before = page.url();
  await panel.getByRole('button', { name: 'Apply Filters' }).click();
  await page.waitForURL((url) => url.toString() !== before);
}

/**
 * Picks a category in the panel's CategoryPicker, the box named "Category"
 * with its options under their groups (claude-docs/components/category-picker.md).
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
 * Picks a choice in one of the panel's choice chips (Toxic, Source): opens its
 * menu, then clicks the option's label, since the native radio under it is
 * drawn invisible and a click on the input finds the label in the way. Shut,
 * the menu's radios are out of the accessibility tree, so the option is found
 * only once the summary has opened it.
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
 * A stock field's name, its label and then its form, which follows the label out of sight
 * ("Quantity, Root"). The browser reads the hidden span after the label as a space and a
 * comma, so the name is matched on both.
 */
const fieldName = (label: string, form: string): RegExp => new RegExp(`^${label}\\s*, ${form}$`);

/**
 * M9.9's Edit Stock dialog, opened from the stock button in a coven card's foot (or the
 * one in its Quick Look). The button is named "Edit Stock, <name>" (the formal name
 * follows when the label is shared, as the admin lists' "Edit Ingredient, <name>" does)
 * and opens a dialog of the same name: a list of the jars held, one button per form, and
 * beside it the chosen jar's fields, in a group named for its form. Only the chosen jar's
 * fields are drawn, so `choose(form)` presses its list button before `jar(form)` can
 * reach them; the dialog opens on the first jar, and Add chooses the form it adds. A
 * field carries its form after the label out of sight: "Quantity, Root". Add Form picks a
 * form not held and Add puts it in the list; Remove stages a held jar's removal until
 * Undo or Save. Save closes the dialog once the batch has been answered. A unit is a
 * combobox, picked with `pickUnit` by its label as the dialog shows it.
 */
export function stockEditor(row: Locator, name: string, coven?: string) {
  const page = row.page();
  const title = `Edit Stock, ${name}`;
  // Opened from a page that is not a coven's (the compendium), the dialog's eyebrow names the
  // coven, "Edit Stock for <Coven>, <name>" (M9.12), so it is found by that name.
  const dialog = page.getByRole('dialog', {
    name: coven ? `Edit Stock for ${coven}, ${name}` : title,
  });
  return {
    // The button is named for the entry as the card is: the name, then the formal name when it
    // has one ("Edit Stock, Rosemary, Salvia rosmarinus"). On an entry page the shelf's jar
    // buttons add the form after that ("..., Salvia rosmarinus, Oil"), so the name is matched
    // whole: the title, then at most one more part. (An entry with no formal name would
    // match a jar button too; none of these specs walks one.)
    open: row.getByRole('button', {
      name: new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(, [^,]+)?$`),
    }),
    dialog,
    /**
     * Chooses a jar from the list, by its form. The button's name starts with the form and
     * goes on to its amount and any mark ("Oil 30 ml Edited"), so it is matched on the start.
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

/**
 * When the row was last edited (M6.18): a `<time>`, whose `datetime` holds
 * the absolute moment the relative text stands for. Found by the element
 * rather than a role because the moment is an attribute, not a name.
 */
export function editedAt(row: Locator): Locator {
  return row.locator('time');
}
