import type { Locator, Page } from '@playwright/test';
import postgres from 'postgres';
import { slugify } from '@/lib/slugify';
import { makeIngredient, makeVariant } from '../../support/fixtures/ingredient';
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

export type StockUnit = keyof typeof DIMENSION_OF;

export interface Stock {
  quantity: number;
  unit: StockUnit;
  /** The low-stock threshold, in `unit`; a zero turns the warning off (M9.8). */
  threshold: number;
}

/**
 * A stock row, the coven's jar of `held`, written by `author` as M9.3's
 * `createStock` would write it: the threshold stated on the row, never left to
 * a constant read later (M9.8).
 */
export async function insertStock(
  sql: postgres.Sql,
  covenId: string,
  held: Held,
  { quantity, unit, threshold }: Stock,
  author: string,
): Promise<string> {
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

/** A spell in the coven's grimoire, as raw SQL: the spell factory imports the whole seed. */
export async function insertSpell(
  sql: postgres.Sql,
  covenId: string,
  title: string,
  visibility: 'private' | 'workspace',
  author: string,
): Promise<string> {
  return sql.begin(async (tx) => {
    await tx`select set_config('app.current_user_id', ${author}, true)`;
    const [row] = await tx<{ id: string }[]>`
      insert into spells (workspace_id, title, visibility, created_by, updated_by)
      values (${covenId}, ${title}, ${visibility}, ${author}, ${author})
      returning id`;
    return row.id;
  });
}

export interface GraphqlAnswer {
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

// The locators of unbuilt pages. Each name is the one the task entry or a
// component doc gives where there is one; where neither names it, the choice
// is made here and says so, for the building task to confirm or correct.

/**
 * The coven's ingredient list (M9.6): a list named after its page,
 * "Ingredients", the CovenNav section's label (claude-docs/components/coven-nav.md).
 * A list of cards rather than a table, since M9.6 composes M8.14's
 * `IngredientCard`. The name is this file's choice.
 */
export function ingredientList(page: Page): Locator {
  return page.getByRole('list', { name: 'Ingredients' });
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
  const row = list.getByRole('listitem').filter({ hasText: name });
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
 * M9.8's two badges. Low Stock is a button (its tip opens from it) named "Low
 * Stock" and the jar's quantity; Out of Stock is its words alone. "Low Stock"
 * and "Out of Stock" are this file's choice, after the entry's "low and
 * out-of-stock badges", in title case as every label is.
 */
export function lowBadge(row: Locator): Locator {
  return row.getByRole('button', { name: /^Low Stock/ });
}

export function outBadge(row: Locator): Locator {
  return row.getByText('Out of Stock', { exact: true });
}

/**
 * The filter above a list: FilterForm's `<search>` landmark
 * (claude-docs/components/filter-form.md). The coven's list narrows by its
 * search box on submit (M8.10: "the workspace ingredients … consumers keep
 * narrowing their list by `query`"), a searchbox labelled "Name" as the
 * admin compendium's is (claude-docs/components/compendium-list.md).
 */
export function filterOf(page: Page): Locator {
  return page.getByRole('search');
}

export async function searchCovenList(page: Page, text: string): Promise<void> {
  const search = filterOf(page);
  await search.getByRole('searchbox', { name: 'Name' }).fill(text);
  await search.getByRole('button', { name: 'Search' }).click();
}

/**
 * Picks a category in the filter's CategoryPicker, the box named "Category"
 * with its options under their groups (claude-docs/components/category-picker.md;
 * M8.11 binds the picker to the search rather than building a second one).
 * An option's name starts with the category's and may carry its qualifier.
 */
export async function pickCategory(page: Page, name: string): Promise<void> {
  const box = filterOf(page).getByRole('combobox', { name: 'Category' });
  await box.fill(name);
  await page.getByRole('option', { name: new RegExp(`^${name}`) }).click();
}

/**
 * M9.9's inline edit of a stock row. "Edit Stock, <name>" follows the admin
 * lists' "Edit Ingredient, <name>" (tests/e2e/admin-compendium.spec.ts), so
 * two rows' buttons never share a name; the fields carry the entry's three
 * words, Quantity, Unit and threshold, the last as "Low-Stock Threshold", and
 * Save and Cancel close it. Every name here is this file's choice.
 */
export function stockEditor(row: Locator, name: string) {
  return {
    open: row.getByRole('button', { name: `Edit Stock, ${name}` }),
    quantity: row.getByRole('spinbutton', { name: 'Quantity' }),
    unit: row.getByRole('combobox', { name: 'Unit' }),
    threshold: row.getByRole('spinbutton', { name: 'Low-Stock Threshold' }),
    save: row.getByRole('button', { name: 'Save' }),
    cancel: row.getByRole('button', { name: 'Cancel' }),
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
