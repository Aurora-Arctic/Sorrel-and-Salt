import type { Browser, Locator, Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAgainAs, signInAs } from './session';
import {
  type Held,
  insertSpell,
  insertStock,
  localIngredient,
  seedCoven,
  withSql,
} from './stories/coven-ingredients';
import { openEditIngredient } from './stories/ingredient-dialogs';
import { insertIngredient } from '../support/db/insert-ingredient';
import { makeIngredient, makeVariant } from '../support/fixtures/ingredient';

// Link to the Compendium in the edit dialog of a coven's own entry (M8.17): a
// search of the whole compendium beneath the form, then a question over it,
// which makes the own entry the compendium entry picked, its jars and spell
// layers moved onto it. Unlike the page's Similar block (similar-in-the-compendium.spec.ts),
// it is offered on an entry with a formal name, and reaches an entry of
// another name. No story walks it, so this gate spec proves it.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

/** A compendium entry of `name` in `forms`, written by an admin of `domain`. */
async function compendiumEntry(
  browser: Browser,
  baseURL: string | undefined,
  name: string,
  forms: string[],
  domain: string,
): Promise<string> {
  const admin = await browser.newPage({ baseURL });
  try {
    const { userId } = await signInAs(admin, `admin@${domain}`, ['discord'], 'admin');
    return await withSql((sql) =>
      insertIngredient(
        sql,
        makeIngredient({
          name,
          nomenclature: 'none',
          variants: forms.map((form) => makeVariant({ form })),
        }),
        userId,
      ),
    );
  } finally {
    await admin.close();
  }
}

/**
 * The coven's own Testwort, with a formal name, in `form`: a jar of it, and a
 * spell with it as a layer, all by the owner A. B, a member, is signed in.
 */
async function heldTestwort(page: Page, domain: string, form: string) {
  const coven = await seedCoven(page, `Fixture Coven ${domain}`, domain, {
    A: 'owner',
    B: 'member',
  });
  const author = coven.users.A;
  const held = await withSql(async (sql) => {
    const own = await localIngredient(sql, coven.id, author, {
      name: 'Testwort',
      canonicalName: 'Fixtura testalis',
      nomenclature: 'botanical',
      variants: [makeVariant({ form })],
    });
    await insertStock(sql, coven.id, own, { quantity: 20, unit: 'g', threshold: 5 }, author);
    const spellId = await insertSpell(sql, coven.id, 'Fixture Working', 'workspace', author);
    await sql.begin(async (tx) => {
      await tx`select set_config('app.current_user_id', ${author}, true)`;
      await tx`
        insert into spell_ingredients (
          spell_id, ingredient_id, variant_id, layer_order, created_by, updated_by
        )
        values (${spellId}, ${own.ingredientId}, ${own.variantId}, 1, ${author}, ${author})`;
    });
    return own;
  });
  await signInAgainAs(page, coven.users.B);
  return { coven, held };
}

/** Where the coven's jar and its spell layer point now. */
async function whereHeld(covenId: string, held: Held) {
  return withSql(async (sql) => {
    const [jar] = await sql<{ ingredient_id: string }[]>`
      select ingredient_id from inventory_items
      where workspace_id = ${covenId} and deleted_at is null`;
    const [layer] = await sql<{ ingredient_id: string }[]>`
      select l.ingredient_id from spell_ingredients l
      join spells s on s.id = l.spell_id
      where s.workspace_id = ${covenId} and l.deleted_at is null`;
    const [own] = await sql<{ gone: boolean }[]>`
      select deleted_at is not null as gone from ingredients where id = ${held.ingredientId}`;
    return { jar: jar.ingredient_id, layer: layer.ingredient_id, ownGone: own.gone };
  });
}

/**
 * Opens Edit on the entry's page and picks `target` in Link to the
 * Compendium's search, running axe first with its suggestions open when asked.
 */
async function pickInLinkSearch(
  page: Page,
  url: string,
  target: string,
  { axe = false }: { axe?: boolean } = {},
): Promise<Locator> {
  await page.goto(url);
  const dialog = await openEditIngredient(
    page,
    page.getByRole('main'),
    'Testwort',
    'Fixtura testalis',
  );
  const search = dialog.getByRole('region', { name: 'Link to the Compendium' });
  const box = search.getByRole('combobox', { name: 'Compendium Entry' });
  await box.click();
  await box.fill(target);
  const option = page.getByRole('listbox').getByRole('option', { name: new RegExp(`^${target}`) });
  await expect(option).toBeVisible();
  if (axe) await assertNoAccessibilityViolations(page);
  await option.click();
  return search;
}

test('a member links an own entry with a formal name to a compendium entry of another name, jar and spell layer moving', async ({
  page,
  browser,
  baseURL,
}) => {
  const domain = 'coven-link.test';
  const compendiumId = await compendiumEntry(
    browser,
    baseURL,
    'Fixture Linkroot',
    ['Root'],
    domain,
  );
  const { coven, held } = await heldTestwort(page, domain, 'Root');
  // Before the link, the jar and the layer are the own entry's.
  expect(await whereHeld(coven.id, held)).toEqual({
    jar: held.ingredientId,
    layer: held.ingredientId,
    ownGone: false,
  });

  const search = await pickInLinkSearch(
    page,
    `/coven/${coven.slug}/ingredients/${held.ingredientId}`,
    'Fixture Linkroot',
    { axe: true },
  );
  await search.getByRole('button', { name: 'Link', exact: true }).click();
  const question = page.getByRole('group', { name: /Link Testwort to Fixture Linkroot/ });
  await expect(question).toBeVisible();
  await question.getByRole('button', { name: 'Link', exact: true }).click();

  await expect(page).toHaveURL(`/coven/${coven.slug}/ingredients/${compendiumId}`);
  expect(await whereHeld(coven.id, held)).toEqual({
    jar: compendiumId,
    layer: compendiumId,
    ownGone: true,
  });
});

test('a refused link shows in the question and moves nothing', async ({
  page,
  browser,
  baseURL,
}) => {
  const domain = 'coven-link-refused.test';
  // The coven's jar is of a Leaf, a form the compendium entry does not have.
  await compendiumEntry(browser, baseURL, 'Fixture Refusedroot', ['Root'], domain);
  const { coven, held } = await heldTestwort(page, domain, 'Leaf');
  const url = `/coven/${coven.slug}/ingredients/${held.ingredientId}`;

  const search = await pickInLinkSearch(page, url, 'Fixture Refusedroot');
  await search.getByRole('button', { name: 'Link', exact: true }).click();
  const question = page.getByRole('group', { name: /Link Testwort to Fixture Refusedroot/ });
  await question.getByRole('button', { name: 'Link', exact: true }).click();

  await expect(question.getByRole('alert')).toBeVisible();
  await expect(page).toHaveURL(`${url}?edit`);
  expect(await whereHeld(coven.id, held)).toEqual({
    jar: held.ingredientId,
    layer: held.ingredientId,
    ownGone: false,
  });
});
