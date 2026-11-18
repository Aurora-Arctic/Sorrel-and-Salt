import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAgainAs, signInAs } from './session';
import { compendiumList, rowOf, seedCoven, withSql } from './stories/coven-ingredients';
import { HELD } from '../support/cupboard-wording';
import { insertCupboardEntry } from '../support/db/insert-cupboard-entry';
import { insertIngredient } from '../support/db/insert-ingredient';
import { makeIngredient } from '../support/fixtures/ingredient';
import { ingredientSlug } from '@/lib/slugify';

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

const NAME = 'Fixture Countwort';
const OWN = 'Fixture Coven Counted';
// The check names the entry, then counts and names the covens holding it.
const COUNTED = new RegExp(`^${HELD}: ${NAME}\\. In 1 coven: ${OWN}$`);

// Regression: the plus beside an entry's pencil carried no coven count, where the card's counts every coven holding it.
test('the plus counts the covens holding an entry on every surface that draws it, as the card does', async ({
  page,
  browser,
  baseURL,
}) => {
  const coven = await seedCoven(page, OWN, 'plus-count.test', { A: 'owner' });
  const A = coven.users.A;

  const admin = await browser.newPage({ baseURL });
  let id = '';
  try {
    const { userId } = await signInAs(admin, 'admin@plus-count.test', ['discord'], 'admin');
    id = await withSql(async (sql) => {
      const entry = await insertIngredient(
        sql,
        makeIngredient({ name: NAME, canonicalName: null, nomenclature: 'none' }),
        userId,
      );
      await insertCupboardEntry(sql, { workspaceId: coven.id, ingredientId: entry }, A);
      return entry;
    });
  } finally {
    await admin.close();
  }

  await signInAgainAs(page, A);

  await test.step('the card counts the coven holding the entry', async () => {
    // Why the surfaces below could have counted it: the viewer's coven holds the entry, and the card says so.
    await page.goto(`/compendium?query=${encodeURIComponent(NAME)}`);
    await expect(
      rowOf(compendiumList(page), NAME).getByRole('button', { name: COUNTED }),
    ).toBeVisible();
  });

  await test.step('the Quick Look dialog’s plus counts it', async () => {
    await rowOf(compendiumList(page), NAME)
      .getByRole('link', { name: `Quick Look ${NAME}`, exact: true })
      .click();
    const dialog = page.getByRole('dialog', { name: NAME, exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: COUNTED })).toBeVisible();
  });

  await test.step('the compendium entry page’s plus counts it', async () => {
    await page.goto(`/compendium/ingredients/${ingredientSlug(NAME, null)}`);
    await expect(page.getByRole('heading', { level: 1, name: NAME })).toBeVisible();
    await expect(page.getByRole('main').getByRole('button', { name: COUNTED })).toBeVisible();
  });

  await test.step('the coven ingredient page’s plus counts it', async () => {
    await page.goto(`/coven/${coven.slug}/ingredients/${id}`);
    await expect(page.getByRole('heading', { level: 1, name: NAME })).toBeVisible();
    await expect(page.getByRole('main').getByRole('button', { name: COUNTED })).toBeVisible();
  });
});
