import type { Locator } from '@playwright/test';
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

// The spell recipe page's print layout (M10.22): a Print menu item any role can choose, and
// under print media a one-page sheet with the Ingredients summary, the steps, formal names on shared
// labels, and none of the page's controls or the shell's bar.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('a viewer prints a one-page recipe with the summary beside the steps and no controls', async ({
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

  // On screen: the menu is there for a viewer, reachable by keyboard, and Print in it prints.
  const more = page.getByRole('button', { name: /^More for/ });
  await expect(more).toBeVisible();
  await more.focus();
  await expect(more).toBeFocused();
  await page.evaluate(() => {
    (window as unknown as { printed: number }).printed = 0;
    window.print = () => {
      (window as unknown as { printed: number }).printed += 1;
    };
  });
  await page.keyboard.press('Enter');
  await page.getByRole('menuitem', { name: 'Print' }).click();
  expect(await page.evaluate(() => (window as unknown as { printed: number }).printed)).toBe(1);

  // In print: the controls and the shell's bar are gone, the summary shows the formal names.
  await page.emulateMedia({ media: 'print' });
  await expect(more).toBeHidden();
  await expect(page.getByRole('banner')).toBeHidden();
  await expect(page.getByRole('link', { name: /Back to Grimoire/ })).toBeHidden();
  const summary = page.getByRole('list', { name: 'Ingredients' });
  await expect(summary).toBeVisible();
  await expect(summary.getByRole('listitem')).toHaveText([
    /2 g\s+Cat's Claw \(Bark\)\s+\(Uncaria tomentosa\)/,
    /3 ml\s+Cat's Claw \(Leaf\)\s+\(Dolichandra unguis-cati\)/,
  ]);
  const left = await Promise.all([
    summary.evaluate((el) => el.getBoundingClientRect().right),
    page.getByRole('list', { name: 'Steps' }).evaluate((el) => el.getBoundingClientRect().left),
  ]);
  expect(left[0]).toBeLessThanOrEqual(left[1]);

  const pdf = (await page.pdf()).toString('latin1');
  expect(pdf.match(/\/Type\s*\/Page[^s]/g)).toHaveLength(1);
});

test('the printed recipe names the coven with no line under it, leads with the intent and categories, sets the facts across the top over the Ingredients beside the steps and leaves out Workings', async ({
  page,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Layout', 'spell-print-layout.test', {
    A: 'owner',
  });
  const { A } = coven.users;
  const spellId = await withSql(async (sql) => {
    const held = await compendiumVariant(sql, "Cat's Claw", 'Bark', 'Uncaria tomentosa');
    const id = await insertSpell(sql, coven.id, 'Fixture Layout', 'workspace', A, 'complete');
    await sql`update spells set intent = 'To draw a steady hand', jar_description = '4 oz jar', seal_wax_color = 'Black' where id = ${id}`;
    await sql`
      insert into spell_categories (spell_id, category_id, created_by, updated_by)
      select ${id}, id, ${A}, ${A} from categories where deleted_at is null limit 1`;
    await insertStep(sql, id, held, { quantity: 2, unit: 'g', position: 0 }, A);
    const second = await compendiumVariant(sql, 'Rosemary', 'Herb');
    await insertStep(sql, id, second, { quantity: 125, unit: 'ml', position: 1 }, A);
    const third = await compendiumVariant(sql, 'Selenite', 'Crystal');
    const bare = await insertStep(sql, id, third, { quantity: 1, unit: 'g', position: 2 }, A);
    await sql`update spell_steps set quantity = null, unit = null where id = ${bare}`;
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

  // The coven's name stands as plain text (no box) and nothing draws a line under it.
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
  expect(edges.rule).toBe(0);
  const lineUnder = await row.evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      shadow: style.boxShadow,
      image: style.backgroundImage,
      after: getComputedStyle(el, '::after').content,
    };
  });
  expect(lineUnder.shadow).toBe('none');
  expect(lineUnder.image).toBe('none');
  expect(['none', 'normal']).toContain(lineUnder.after);

  // The intent and the categories lead, then the facts run across the top, over the Ingredients
  // column and the steps.
  const box = (locator: Locator) => locator.evaluate((el) => el.getBoundingClientRect().toJSON());
  const intent = await box(page.getByText('To draw a steady hand'));
  const categories = await box(page.getByRole('list', { name: 'Categories' }));
  const facts = await box(page.getByText('Seal Wax'));
  const heading = await box(page.getByRole('heading', { name: 'Ingredients' }));
  const ingredients = await box(page.getByRole('list', { name: 'Ingredients' }));
  const steps = await box(page.getByRole('list', { name: 'Steps' }));
  expect(intent.top).toBeLessThan(categories.top);
  expect(categories.bottom).toBeLessThanOrEqual(facts.top);
  expect(facts.bottom).toBeLessThanOrEqual(heading.top);
  expect(facts.bottom).toBeLessThanOrEqual(steps.top);

  // The Ingredients column stands to the left of the steps, the two side by side.
  expect(ingredients.right).toBeLessThanOrEqual(steps.left);
  expect(Math.min(ingredients.bottom, steps.bottom)).toBeGreaterThan(
    Math.max(heading.top, steps.top),
  );

  // The Ingredients heading starts level with the first step.
  const firstStep = await box(
    page.getByRole('list', { name: 'Steps' }).getByRole('listitem').first(),
  );
  expect(Math.abs(heading.top - firstStep.top)).toBeLessThanOrEqual(1);

  // Amounts share one right-aligned column and names one left-aligned column beside it, so the numbers
  // line up, and a line with no amount keeps its name in that column.
  const columns = await page.evaluate(() => {
    const lines = [...document.querySelectorAll('ul[aria-label="Ingredients"] > li')];
    return lines.map((li) => {
      const [need, name] = [li.children[0]!, li.children[1]!];
      return {
        needRight: need.getBoundingClientRect().right,
        needText: need.textContent,
        nameLeft: name.getBoundingClientRect().left,
      };
    });
  });
  expect(columns).toHaveLength(3);
  expect(columns.filter((c) => c.needText).length).toBe(2);
  const amounts = columns.filter((c) => c.needText).map((c) => c.needRight);
  expect(Math.abs(amounts[0]! - amounts[1]!)).toBeLessThanOrEqual(1);
  const lefts = columns.map((c) => c.nameLeft);
  expect(Math.max(...lefts) - Math.min(...lefts)).toBeLessThanOrEqual(1);
  expect(Math.min(...lefts)).toBeGreaterThan(Math.max(...amounts));

  // The summary's lines start flush with the heading.
  const indent = await page.evaluate(() => {
    const heading = [...document.querySelectorAll('h2')].find(
      (h) => h.textContent === 'Ingredients',
    )!;
    const line = heading.parentElement!.querySelector('li')!;
    return line.getBoundingClientRect().left - heading.getBoundingClientRect().left;
  });
  expect(Math.abs(indent)).toBeLessThanOrEqual(1);
});
