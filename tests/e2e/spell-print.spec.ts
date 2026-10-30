import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAgainAs } from './session';
import {
  insertSpell,
  insertStep,
  insertWorking,
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

test('the printed recipe names the coven over a rule, leads with the intent and categories, indents the summary and leaves out Workings', async ({
  page,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Layout', 'spell-print-layout.test', {
    A: 'owner',
  });
  const { A } = coven.users;
  const spellId = await withSql(async (sql) => {
    const held = await compendiumVariant(sql, "Cat's Claw", 'Bark', 'Uncaria tomentosa');
    const id = await insertSpell(sql, coven.id, 'Fixture Layout', 'workspace', A, 'complete');
    await sql`update spells set intent = 'To draw a steady hand' where id = ${id}`;
    await sql`
      insert into spell_categories (spell_id, category_id, created_by, updated_by)
      select ${id}, id, ${A}, ${A} from categories where deleted_at is null limit 1`;
    await insertStep(sql, id, held, { quantity: 2, unit: 'g', position: 0 }, A);
    await insertWorking(sql, id, A, { workedOn: '2026-03-04', note: 'Worked under a waxing moon' });
    return id;
  });
  await signInAgainAs(page, A);
  await page.goto(`/coven/${coven.slug}/grimoire/${spellId}`);

  // On screen the section is there, so its absence in print is the print rules' doing.
  const workings = page.getByRole('heading', { name: 'Workings' });
  await expect(workings).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  await expect(workings).toBeHidden();
  await expect(page.getByText('Worked under a waxing moon')).toBeHidden();

  // The coven's name stands as plain text (no box) with a rule beneath it.
  const row = page.getByRole('region', { name: 'Context' });
  const selector = row.getByRole('combobox', { name: 'Coven' });
  await expect(selector).toBeVisible();
  await expect(selector).toContainText('Fixture Coven Layout');
  const edges = await selector.evaluate((el) => {
    const style = getComputedStyle(el);
    const rowStyle = getComputedStyle(el.closest('section')!);
    return {
      box: parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth),
      rule: parseFloat(rowStyle.borderBottomWidth),
    };
  });
  expect(edges.box).toBe(0);
  expect(edges.rule).toBeGreaterThan(0);
  const ruleBelow = await row.evaluate(
    (el) =>
      el.getBoundingClientRect().bottom -
      el.querySelector('[role="combobox"]')!.getBoundingClientRect().bottom,
  );
  expect(ruleBelow).toBeGreaterThanOrEqual(0);

  // The intent and the categories come first, then the summary, then the steps.
  const tops = await Promise.all(
    [
      page.getByText('To draw a steady hand'),
      page.getByRole('list', { name: 'Categories' }),
      page.getByRole('heading', { name: 'Ingredients' }),
      page.getByRole('list', { name: 'Steps' }),
    ].map((locator) => locator.evaluate((el) => el.getBoundingClientRect().top)),
  );
  expect(tops).toEqual([...tops].sort((a, b) => a - b));
  expect(new Set(tops).size).toBe(4);

  // The summary's lines sit in from the heading.
  const indent = await page.evaluate(() => {
    const heading = [...document.querySelectorAll('h2')].find(
      (h) => h.textContent === 'Ingredients',
    )!;
    const line = heading.parentElement!.querySelector('li')!;
    return line.getBoundingClientRect().left - heading.getBoundingClientRect().left;
  });
  expect(indent).toBeGreaterThanOrEqual(24);
});
