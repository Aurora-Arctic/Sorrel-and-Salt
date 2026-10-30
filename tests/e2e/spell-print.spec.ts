import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAgainAs } from './session';
import {
  insertSpell,
  insertStep,
  compendiumVariant,
  seedCoven,
  withSql,
} from './stories/coven-ingredients';

// The spell recipe page's print layout (M10.22): a Print Spell button any role can press, and
// under print media a one-page sheet with the Ingredients summary, the steps, formal names on shared
// labels, and none of the page's controls or the shell's bar.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('a viewer prints a one-page recipe with the summary first and no controls', async ({
  page,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Print', 'spell-print.test', {
    A: 'owner',
    C: 'viewer',
  });
  const { A, C } = coven.users;
  const spellId = await withSql(async (sql) => {
    // Two compendium entries share the label Cat's Claw: a formal name tells them apart on paper.
    const first = await compendiumVariant(sql, "Cat's Claw", 'Bark', 'Uncaria tomentosa');
    const second = await compendiumVariant(sql, "Cat's Claw", 'Leaf', 'Dolichandra unguis-cati');
    const id = await insertSpell(sql, coven.id, 'Fixture Working', 'workspace', A, 'complete');
    await insertStep(sql, id, first, { quantity: 2, unit: 'g', position: 0 }, A);
    await insertStep(sql, id, second, { quantity: 3, unit: 'ml', position: 1 }, A);
    return id;
  });
  await signInAgainAs(page, C);
  await page.goto(`/coven/${coven.slug}/grimoire/${spellId}`);

  // On screen: the button is there for a viewer, reachable by keyboard, and presses to print.
  const print = page.getByRole('button', { name: /^Print Spell/ });
  await expect(print).toBeVisible();
  await print.focus();
  await expect(print).toBeFocused();
  await expect(page.getByRole('heading', { name: 'Ingredients' })).toBeHidden();
  await page.evaluate(() => {
    (window as unknown as { printed: number }).printed = 0;
    window.print = () => {
      (window as unknown as { printed: number }).printed += 1;
    };
  });
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => (window as unknown as { printed: number }).printed)).toBe(1);

  // In print: the controls and the shell's bar are gone, the summary shows the formal names.
  await page.emulateMedia({ media: 'print' });
  await expect(print).toBeHidden();
  await expect(page.getByRole('banner')).toBeHidden();
  await expect(page.getByRole('link', { name: /Back to Grimoire/ })).toBeHidden();
  const summary = page.getByRole('list', { name: 'Ingredients' });
  await expect(summary).toBeVisible();
  await expect(summary.getByRole('listitem')).toHaveText([
    /2 g\s+Cat's Claw \(Bark\)\s+\(Uncaria tomentosa\)/,
    /3 ml\s+Cat's Claw \(Leaf\)\s+\(Dolichandra unguis-cati\)/,
  ]);
  const above = await Promise.all([
    summary.evaluate((el) => el.getBoundingClientRect().top),
    page.getByRole('list', { name: 'Steps' }).evaluate((el) => el.getBoundingClientRect().top),
  ]);
  expect(above[0]).toBeLessThan(above[1]);

  const pdf = (await page.pdf()).toString('latin1');
  expect(pdf.match(/\/Type\s*\/Page[^s]/g)).toHaveLength(1);
});
