import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAgainAs, signInAs } from './session';
import { seedCoven, withSql } from './stories/coven-ingredients';
import { insertCupboardEntry } from '../support/db/insert-cupboard-entry';
import { insertIngredient } from '../support/db/insert-ingredient';
import { makeIngredient, makeVariant } from '../support/fixtures/ingredient';

// (claude-docs/components/chip-color-field.md, "Tidying"; claude-docs/components/cupboard-entry-form.md)
test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('a chip colour typed loosely is tidied to a six-digit lower-case hex when the box is left', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signInAs(page, 'a-keeper@input-formatting.test', ['discord'], 'admin');
  await page.goto('/curator/category-groups?new');
  const adding = page.getByRole('dialog', { name: 'Add Category Group' });
  await expect(adding).toBeVisible();
  // Hydrated first, or the typing lands on server HTML that no form owns.
  await page.waitForLoadState('networkidle');

  const dark = adding.getByRole('textbox', { name: 'Dark Theme Colour' });
  await dark.fill(' 4E8BC2');
  await dark.blur();
  await expect(dark).toHaveValue('#4e8bc2');

  await dark.fill('abc');
  await dark.blur();
  await expect(dark).toHaveValue('#aabbcc');
});

test('a chip colour gains its # as it is typed, keeps a pasted one single, and Backspace clears the box', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signInAs(page, 'a-hexer@input-formatting.test', ['discord'], 'admin');
  await page.goto('/curator/category-groups?new');
  const adding = page.getByRole('dialog', { name: 'Add Category Group' });
  await expect(adding).toBeVisible();
  await page.waitForLoadState('networkidle');

  const dark = adding.getByRole('textbox', { name: 'Dark Theme Colour' });
  const caret = () => dark.evaluate((input: HTMLInputElement) => input.selectionStart);
  await dark.fill('');
  await dark.click();
  await dark.pressSequentially('4e8bc2');
  await expect(dark).toHaveValue('#4e8bc2');
  expect(await caret()).toBe(7);

  // Backspace goes all the way back to an empty box, never stuck behind the #.
  for (let i = 0; i < 6; i += 1) await page.keyboard.press('Backspace');
  await expect(dark).toHaveValue('');

  // A pasted value, however it is written, shows one #. insertText puts it in at once, as a paste does.
  await page.keyboard.insertText('##4e8bc2');
  await expect(dark).toHaveValue('#4e8bc2');

  // A character that is not a hex digit stays on screen.
  await dark.fill('');
  await dark.pressSequentially('4g');
  await expect(dark).toHaveValue('#4g');
});

test('a refused Save on the Cupboard entry form puts focus on the error summary', async ({
  page,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Formatting', 'input-formatting.test', {
    A: 'owner',
  });
  await withSql(async (sql) => {
    for (const [name, label] of [
      ['Fixture Firstwort', 'Fixture Shared Label'],
      ['Fixture Secondwort', undefined],
    ] as const) {
      const id = await insertIngredient(
        sql,
        makeIngredient({
          name,
          canonicalName: null,
          nomenclature: 'none',
          variants: [makeVariant({ form: 'Herb' })],
        }),
        coven.users.A,
      );
      await insertCupboardEntry(
        sql,
        { workspaceId: coven.id, ingredientId: id, label },
        coven.users.A,
      );
    }
  });

  await signInAgainAs(page, coven.users.A);
  await page.goto(`/coven/${coven.slug}/ingredients?query=Secondwort`);
  await page.getByRole('link', { name: /^Annotate Fixture Secondwort/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Annotate This Entry' });
  await expect(dialog).toBeVisible();
  await page.waitForLoadState('networkidle');

  await dialog.getByRole('textbox', { name: 'Label' }).fill('Fixture Shared Label');
  await dialog.getByRole('button', { name: /^Save/ }).click();

  await expect(dialog.getByRole('group', { name: /problem/i })).toBeFocused();
});

for (const width of [375, 1280]) {
  test(`at ${width}px the hex box shows the widest chip colour whole`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await signInAs(page, `a-wide-hex-${width}@input-formatting.test`, ['discord'], 'admin');
    await page.goto('/curator/category-groups?new');
    const adding = page.getByRole('dialog', { name: 'Add Category Group' });
    await expect(adding).toBeVisible();
    await page.waitForLoadState('networkidle');

    const overrun: string[] = [];
    for (const name of ['Dark Theme Colour', 'Light Theme Colour']) {
      const box = adding.getByRole('textbox', { name });
      for (const hex of [
        '#000000',
        '#888888',
        '#aaaaaa',
        '#bbbbbb',
        '#dddddd',
        '#eeeeee',
        '#ffffff',
      ]) {
        await box.fill(hex);
        // Why the check means something: the box holds the whole value, so a short scroll width is not an empty box.
        await expect(box).toHaveValue(hex);
        const { scroll, client } = await box.evaluate((input: HTMLInputElement) => ({
          scroll: input.scrollWidth,
          client: input.clientWidth,
        }));
        if (scroll > client) overrun.push(`${name} ${hex}: ${scroll} > ${client}`);
      }
    }
    expect(overrun, 'hex values wider than their box').toEqual([]);
  });
}
