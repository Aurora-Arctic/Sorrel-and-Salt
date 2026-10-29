import { test, expect } from './fixtures';
import type { Locator, Page } from '@playwright/test';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAgainAs } from './session';
import { insertSpell, seedCoven, withSql } from './stories/coven-ingredients';

// Editing a saved spell, from its card's pencil and from its recipe page. Story 55 holds
// the same flow after Mark Complete; this walks it now, and what no story walks: a
// viewer has no pencil and no dialog, and the dialog opened over the recipe page passes axe and
// closes back to the recipe page.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

const grimoireList = (page: Page): Locator => page.getByRole('list', { name: 'Grimoire' });

test('a member edits a saved spell from its card and its recipe page, and a viewer cannot', async ({
  page,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Edit', 'spell-edit.test', {
    A: 'owner',
    B: 'member',
    C: 'viewer',
  });
  const spellId = await withSql((sql) =>
    insertSpell(sql, coven.id, 'Fixture Working', 'workspace', coven.users.B, 'complete'),
  );
  const grimoire = `/coven/${coven.slug}/grimoire`;
  const recipe = `${grimoire}/${spellId}`;
  await signInAgainAs(page, coven.users.B);

  // From the card's pencil: change the title and add a step, close, and the card shows it.
  await page.goto(grimoire);
  await grimoireList(page).getByRole('link', { name: 'Edit Fixture Working' }).click();
  await expect(page).toHaveURL(`${grimoire}?edit=${spellId}`);
  const edit = page.getByRole('dialog', { name: 'Edit Spell, Fixture Working' });
  await edit.getByRole('button', { name: 'Open All' }).click();
  await edit.getByRole('textbox', { name: 'Title' }).fill('Fixture Working Renamed');
  await page.getByRole('combobox', { name: 'Add to Jar' }).fill('Rosemary (Herb)');
  await page.getByRole('option', { name: 'Rosemary (Herb)' }).first().click();
  await edit.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page).toHaveURL(grimoire);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(
    grimoireList(page).getByRole('link', { name: 'Fixture Working Renamed', exact: true }),
  ).toBeVisible();

  // The recipe page reads the same change, and its Edit opens the dialog over it.
  await page.goto(recipe);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Fixture Working Renamed' }),
  ).toBeVisible();
  await expect(page.getByRole('list', { name: 'Steps' })).toContainText('Rosemary');
  await page.getByRole('link', { name: 'Edit Fixture Working Renamed' }).click();
  await expect(page).toHaveURL(`${recipe}?edit=${spellId}`);
  await expect(
    page.getByRole('dialog', { name: 'Edit Spell, Fixture Working Renamed' }),
  ).toBeVisible();
  await assertNoAccessibilityViolations(page);
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page).toHaveURL(recipe);
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // A viewer reads the same spell and is offered neither control; ?edit opens nothing.
  await signInAgainAs(page, coven.users.C);
  await page.goto(`${recipe}?edit=${spellId}`);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Fixture Working Renamed' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: /^Edit / })).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goto(`${grimoire}?edit=${spellId}`);
  await expect(
    grimoireList(page).getByRole('link', { name: 'Fixture Working Renamed', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: /^Edit / })).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
