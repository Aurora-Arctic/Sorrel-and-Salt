import type { Locator } from '@playwright/test';
import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAgainAs } from './session';
import {
  insertSpell,
  insertStep,
  insertStock,
  insertWorking,
  compendiumVariant,
  seedCoven,
  withSql,
} from './stories/coven-ingredients';
import { BAND_WIDTHS, PHONE_WIDTH, DESKTOP_WIDTH } from './breakpoints';

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

for (const [name, size] of [
  ['desktop', { width: DESKTOP_WIDTH, height: 900 }],
  ['phone', { width: PHONE_WIDTH, height: 844 }],
] as const) {
  test(`Workings sits at the bottom of the main column on a ${name}`, async ({ page }) => {
    const coven = await seedCoven(page, `Fixture Coven ${name}`, `spell-layout-${name}.test`, {
      A: 'owner',
    });
    const { A } = coven.users;
    const spellId = await withSql(async (sql) => {
      const held = await compendiumVariant(sql, "Cat's Claw", 'Bark', 'Uncaria tomentosa');
      const id = await insertSpell(sql, coven.id, 'Fixture Layout', 'workspace', A, 'complete');
      await sql`update spells set note = 'A closing note' where id = ${id}`;
      await insertStep(sql, id, held, { quantity: 2, unit: 'g', position: 0 }, A);
      await insertWorking(sql, id, A, { workedOn: '2026-03-04' });
      return id;
    });
    await signInAgainAs(page, A);
    await page.setViewportSize(size);
    await page.goto(`/coven/${coven.slug}/grimoire/${spellId}`);

    const box = (locator: ReturnType<typeof page.locator>) =>
      locator.evaluate((el) => el.getBoundingClientRect().toJSON());
    const workings = await box(page.getByRole('heading', { name: 'Workings' }));
    const steps = await box(page.getByRole('list', { name: 'Steps' }));
    const note = await box(page.getByText('A closing note'));
    const aside = await box(page.getByRole('complementary', { name: 'The Cupboard' }));

    const marker = await page
      .getByRole('list', { name: 'Workings' })
      .getByRole('listitem')
      .first()
      .evaluate((el) => getComputedStyle(el, '::before').content);
    expect(['none', 'normal']).toContain(marker);

    expect(workings.top).toBeGreaterThan(note.bottom);
    expect(workings.left).toBeLessThan(steps.left + 4);
    // Not in the side column: on a desktop it is beside it, on a phone it stands below it, the jar between the body and Workings.
    if (name === 'desktop') expect(workings.right).toBeLessThanOrEqual(aside.left);
    else {
      expect(aside.top).toBeGreaterThan(note.bottom);
      expect(aside.bottom).toBeLessThanOrEqual(workings.top);
    }
  });
}

for (const [name, size] of [
  ['desktop', { width: DESKTOP_WIDTH, height: 900 }],
  ['phone', { width: PHONE_WIDTH, height: 844 }],
] as const) {
  test(`the header's icon buttons and the title's row ${name === 'phone' ? "sit under the title's last line" : "start level with the title's first line"} on a ${name}, wrapped title`, async ({
    page,
  }) => {
    const coven = await seedCoven(page, `Fixture Coven Head ${name}`, `spell-head-${name}.test`, {
      A: 'owner',
    });
    const { A } = coven.users;
    const spellId = await withSql(async (sql) => {
      const title = 'A Fixture Spell With A Very Long Name That Must Wrap Onto Several Lines Here';
      return insertSpell(sql, coven.id, title, 'workspace', A, 'complete');
    });
    await signInAgainAs(page, A);
    await page.setViewportSize(size);
    await page.goto(`/coven/${coven.slug}/grimoire/${spellId}`);

    const title = page.getByRole('heading', { level: 1 });
    const edit = page.getByRole('link', { name: /^Edit/ }).first();
    await expect(edit).toBeVisible();
    const box = (locator: Locator) => locator.evaluate((el) => el.getBoundingClientRect().toJSON());
    const [titleBox, editBox] = [await box(title), await box(edit)];
    expect(titleBox.height).toBeGreaterThan(editBox.height * 1.5);
    if (name === 'phone') expect(editBox.top).toBeGreaterThanOrEqual(titleBox.bottom);
    else expect(Math.abs(editBox.top - titleBox.top)).toBeLessThanOrEqual(1);

    // The title also takes the head's row, with the action icons beside it or beneath it.
    const head = await box(page.locator('.spell-recipe__head'));
    const actions = await box(page.locator('.spell-recipe__actions'));
    const edited = await box(page.locator('.spell-recipe__head .last-edit'));
    expect(edited.bottom).toBeLessThanOrEqual(titleBox.top + 1);
    expect(titleBox.width).toBeGreaterThan(head.width / 2);
    expect(titleBox.left).toBeLessThanOrEqual(head.left + 1);
    if (name === 'phone') expect(actions.top).toBeGreaterThanOrEqual(titleBox.bottom);
    else {
      expect(actions.left).toBeGreaterThanOrEqual(titleBox.right - 1);
      expect(actions.top).toBeLessThan(titleBox.top + 60);
    }
  });
}

test('the moon phase sits on one line in the facts strip on a desktop', async ({ page }) => {
  const coven = await seedCoven(page, 'Fixture Coven Moon', 'spell-moon.test', { A: 'owner' });
  const { A } = coven.users;
  const spellId = await withSql(async (sql) => {
    const id = await insertSpell(sql, coven.id, 'Fixture Moon', 'workspace', A, 'complete');
    await sql`update spells set jar_description = '4 oz jar', seal_wax_color = 'Black', moon_phase = 'Waxing Gibbous', day_of_week = 'Wednesday' where id = ${id}`;
    return id;
  });
  await signInAgainAs(page, A);
  await page.setViewportSize({ width: DESKTOP_WIDTH, height: 900 });
  await page.goto(`/coven/${coven.slug}/grimoire/${spellId}`);
  // The text alone, not the drawing beside it: one rect top per line it sets.
  const lines = await page.locator('.spell-recipe__facts dd').evaluateAll((cells) =>
    cells.map((cell) => {
      const range = document.createRange();
      range.selectNodeContents(cell.lastChild!);
      return new Set([...range.getClientRects()].map((rect) => Math.round(rect.top))).size;
    }),
  );
  expect(lines).toEqual([1, 1, 1, 1]);
});

test("the side column's Quick Look eye is a 24px target with a smaller glyph, and the step carries none", async ({
  page,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Eye', 'spell-eye.test', { A: 'owner' });
  const { A } = coven.users;
  const spellId = await withSql(async (sql) => {
    const held = await compendiumVariant(sql, "Cat's Claw", 'Bark', 'Uncaria tomentosa');
    const id = await insertSpell(sql, coven.id, 'Fixture Eye', 'workspace', A, 'complete');
    await insertStep(sql, id, held, { quantity: 2, unit: 'g', position: 0 }, A);
    return id;
  });
  await signInAgainAs(page, A);
  await page.goto(`/coven/${coven.slug}/grimoire/${spellId}`);
  await expect(
    page.getByRole('list', { name: 'Steps' }).getByRole('link', { name: "Quick Look Cat's Claw" }),
  ).toHaveCount(0);
  const eye = page
    .getByRole('region', { name: 'In the Cupboard' })
    .getByRole('link', { name: "Quick Look Cat's Claw" });
  const target = await eye.evaluate((el) => el.getBoundingClientRect().toJSON());
  const glyph = await eye.locator('svg').evaluate((el) => el.getBoundingClientRect().toJSON());
  expect(target.width).toBeGreaterThanOrEqual(24);
  expect(target.height).toBeGreaterThanOrEqual(24);
  expect(glyph.width).toBeLessThan(target.width);
});

test('the badges of a draft and a complete working sit the same distance after the date on a desktop', async ({
  page,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Badges', 'spell-badges.test', { A: 'owner' });
  const { A } = coven.users;
  const spellId = await withSql(async (sql) => {
    const id = await insertSpell(sql, coven.id, 'Fixture Badges', 'workspace', A, 'complete');
    await insertWorking(sql, id, A, {
      workedOn: '2026-03-04',
      status: 'draft',
      visibility: 'private',
    });
    await insertWorking(sql, id, A, { workedOn: '2026-03-01', visibility: 'private' });
    return id;
  });
  await signInAgainAs(page, A);
  await page.setViewportSize({ width: DESKTOP_WIDTH, height: 900 });
  await page.goto(`/coven/${coven.slug}/grimoire/${spellId}`);
  const rows = page.getByRole('list', { name: 'Workings' }).getByRole('listitem');
  await expect(rows).toHaveCount(2);
  const [draft, complete] = await Promise.all(
    [0, 1].map((i) =>
      rows
        .nth(i)
        .locator('.spell-workings__head')
        .evaluate((head) => {
          const date = head.querySelector('time')!.getBoundingClientRect();
          const badge = head.querySelector('.specimen__badges .badge')!.getBoundingClientRect();
          return badge.left - date.right;
        }),
    ),
  );
  await expect(rows.nth(0).locator('.badge')).toHaveCount(2);
  await expect(rows.nth(1).locator('.badge')).toHaveCount(1);
  expect(Math.abs(draft! - complete!)).toBeLessThanOrEqual(1);
});

for (const [name, size] of [
  ['desktop', { width: DESKTOP_WIDTH, height: 900 }],
  ['phone', { width: PHONE_WIDTH, height: 844 }],
] as const) {
  test(`the jump menu stands beside the page and jumps to a section on a ${name}`, async ({
    page,
  }) => {
    const coven = await seedCoven(page, `Fixture Nav ${name}`, `spell-nav-${name}.test`, {
      A: 'owner',
    });
    const { A } = coven.users;
    const spellId = await withSql(async (sql) => {
      const held = await compendiumVariant(sql, "Cat's Claw", 'Bark', 'Uncaria tomentosa');
      const id = await insertSpell(sql, coven.id, 'Fixture Nav', 'workspace', A, 'complete');
      await insertStep(sql, id, held, { quantity: 2, unit: 'g', position: 0 }, A);
      await insertWorking(sql, id, A, { workedOn: '2026-03-04' });
      return id;
    });
    await signInAgainAs(page, A);
    await page.setViewportSize(size);
    await page.goto(`/coven/${coven.slug}/grimoire/${spellId}`);

    const nav = page.getByRole('navigation', { name: 'On This Page' });
    // The jar stands beside the recipe on a desktop, so the menu does not name it; on a phone it is
    // one entry, above Workings, and the jar section stands above Workings on the page too.
    await expect(nav.getByRole('link')).toHaveText(
      name === 'desktop'
        ? ['Steps', 'Workings']
        : ['Steps', 'Category Match', 'In the Cupboard', 'Workings'],
    );
    await expect(nav.getByText('The Cupboard', { exact: true })).toBeVisible({
      visible: name !== 'desktop',
    });
    if (name === 'phone') {
      const top = (label: string) =>
        page
          .getByRole(label === 'The Cupboard' ? 'complementary' : 'region', { name: label })
          .evaluate((el) => el.getBoundingClientRect().top);
      expect(await top('The Cupboard')).toBeLessThan(await top('Workings'));
    }
    if (name === 'desktop') {
      const navBox = await nav.evaluate((el) => el.getBoundingClientRect().toJSON());
      const stepsBox = await page
        .getByRole('list', { name: 'Steps' })
        .evaluate((el) => el.getBoundingClientRect().toJSON());
      expect(navBox.right).toBeLessThanOrEqual(stepsBox.left + 1);
      // The menu stands as far from the page as the ingredient entry page's does (a `space(6)`, 32px).
      const headLeft = await page
        .locator('.spell-recipe__head')
        .evaluate((el) => el.getBoundingClientRect().left);
      expect(headLeft - navBox.right).toBeGreaterThanOrEqual(32);
    }
    await nav.getByRole('link', { name: 'Workings' }).click();
    await expect(page).toHaveURL(/#spell-workings$/);
    await expect(page.getByRole('heading', { name: 'Workings' })).toBeInViewport();

    await page.emulateMedia({ media: 'print' });
    await expect(nav).toBeHidden();
  });
}

test('the Workings heading has a Record a Working button that opens the dialog, with or without workings', async ({
  page,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Record', 'spell-record.test', { A: 'owner' });
  const { A } = coven.users;
  const spellId = await withSql((sql) =>
    insertSpell(sql, coven.id, 'Fixture Record', 'workspace', A, 'complete'),
  );
  await signInAgainAs(page, A);
  await page.goto(`/coven/${coven.slug}/grimoire/${spellId}`);
  const section = page.getByRole('region', { name: 'Workings' });
  await expect(section.getByText('This spell has not been worked yet.')).toBeVisible();
  const button = section.getByRole('button', { name: 'Record a Working' });
  await button.click();
  await expect(page.getByRole('dialog', { name: 'Record a Working' })).toBeVisible();
});

for (const [name, size] of [
  ['desktop', { width: DESKTOP_WIDTH, height: 900 }],
  ['tablet', { width: BAND_WIDTHS.tablet, height: 900 }],
  ['phone', { width: PHONE_WIDTH, height: 844 }],
] as const) {
  test(`the Workings heading's button ends at the section's right edge on a ${name}`, async ({
    page,
  }) => {
    const coven = await seedCoven(page, `Fixture Right ${name}`, `spell-right-${name}.test`, {
      A: 'owner',
    });
    const { A } = coven.users;
    const spellId = await withSql(async (sql) => {
      const id = await insertSpell(sql, coven.id, 'Fixture Right', 'workspace', A, 'complete');
      await insertWorking(sql, id, A, { workedOn: '2026-03-04' });
      return id;
    });
    await signInAgainAs(page, A);
    await page.setViewportSize(size);
    await page.goto(`/coven/${coven.slug}/grimoire/${spellId}`);
    const section = page.getByRole('region', { name: 'Workings' });
    const sectionBox = await section.evaluate((el) => el.getBoundingClientRect().toJSON());
    const heading = await section
      .getByRole('heading', { name: 'Workings' })
      .evaluate((el) => el.getBoundingClientRect().toJSON());
    const button = await section
      .getByRole('button', { name: 'Record a Working' })
      .evaluate((el) => el.getBoundingClientRect().toJSON());
    expect(Math.abs(button.right - sectionBox.right)).toBeLessThanOrEqual(1);
    expect(heading.left).toBeLessThanOrEqual(sectionBox.left + 1);
  });
}

// The menu stands as far from the page as the ingredient entry page's does (a `space(6)`, 32px); the desktop width is asserted by the jump menu test above.
for (const width of [BAND_WIDTHS.tablet]) {
  test(`the jump menu stands at least 32px clear of the page at ${width}px`, async ({ page }) => {
    const coven = await seedCoven(page, `Fixture Gap ${width}`, `spell-gap-${width}.test`, {
      A: 'owner',
    });
    const { A } = coven.users;
    const spellId = await withSql(async (sql) => {
      const held = await compendiumVariant(sql, "Cat's Claw", 'Bark', 'Uncaria tomentosa');
      const id = await insertSpell(sql, coven.id, 'Fixture Gap', 'workspace', A, 'complete');
      await insertStep(sql, id, held, { quantity: 2, unit: 'g', position: 0 }, A);
      return id;
    });
    await signInAgainAs(page, A);
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/coven/${coven.slug}/grimoire/${spellId}`);
    const navRight = await page
      .getByRole('navigation', { name: 'On This Page' })
      .evaluate((el) => el.getBoundingClientRect().right);
    const headLeft = await page
      .locator('.spell-recipe__head')
      .evaluate((el) => el.getBoundingClientRect().left);
    expect(headLeft - navRight).toBeGreaterThanOrEqual(32);
  });
}

for (const [name, size] of [
  ['desktop', { width: DESKTOP_WIDTH, height: 900 }],
  ['phone', { width: PHONE_WIDTH, height: 844 }],
] as const) {
  test(`the date calendar floats over the Record a Working dialog's fields and the date box keeps its width on a ${name}`, async ({
    page,
  }) => {
    const coven = await seedCoven(page, `Fixture Coven Date ${name}`, `spell-date-${name}.test`, {
      A: 'owner',
    });
    const { A } = coven.users;
    const spellId = await withSql((sql) =>
      insertSpell(sql, coven.id, 'Fixture Date', 'workspace', A, 'complete'),
    );
    await signInAgainAs(page, A);
    await page.setViewportSize(size);
    await page.goto(`/coven/${coven.slug}/grimoire/${spellId}`);
    await page
      .getByRole('region', { name: 'Workings' })
      .getByRole('button', { name: 'Record a Working' })
      .click();
    const dialog = page.getByRole('dialog', { name: 'Record a Working' });
    const dateButton = dialog.getByRole('button', { name: /^Date/ });
    const note = dialog.getByRole('textbox', { name: 'Note' });
    const noteTop = async () => (await note.boundingBox())!.y;
    const widthOf = async () => (await dateButton.boundingBox())!.width;

    const before = await noteTop();
    const todayWidth = await widthOf();
    await dateButton.click();
    const calendar = page.getByRole('grid');
    await expect(calendar).toBeVisible();

    expect(await noteTop()).toBe(before);

    const box = (await page.locator('.calendar-panel').boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(size.width);
    expect(box.y + box.height).toBeLessThanOrEqual(size.height);
    const corner = await page.evaluate(
      ([x, y]) => document.elementFromPoint(x, y)?.closest('.calendar-panel') !== null,
      [box.x + box.width - 3, box.y + box.height - 3],
    );
    expect(corner).toBe(true);

    await page.getByRole('combobox', { name: /Year/ }).click();
    // The open list draws above the calendar's own layer and a press on it leaves the calendar open.
    const listed = await page.getByRole('option', { name: '2020' }).boundingBox();
    expect(listed).not.toBeNull();
    const onTop = await page.evaluate(
      ([x, y]) => document.elementFromPoint(x, y)?.closest('[role="option"]') !== null,
      [listed!.x + listed!.width / 2, listed!.y + listed!.height / 2],
    );
    expect(onTop).toBe(true);
    await page.getByRole('option', { name: '1900' }).click();
    await page.getByRole('combobox', { name: /Month/ }).click();
    await page.getByRole('option', { name: 'May' }).click();
    await calendar.getByRole('button', { name: /, 1 May 1900/ }).click();
    await expect(dateButton).toContainText('1 May 1900');
    expect(await widthOf()).toBe(todayWidth);
  });
}

test("a short jar's deduction line keeps each part whole at 375px", async ({ page }) => {
  const coven = await seedCoven(page, 'Fixture Coven Deduction', 'spell-deduction.test', {
    A: 'owner',
  });
  const { A } = coven.users;
  const spellId = await withSql(async (sql) => {
    const held = await compendiumVariant(sql, 'Rosemary', 'Herb');
    await insertStock(sql, coven.id, held, { quantity: 1, unit: 'g', threshold: 0 }, A);
    const id = await insertSpell(sql, coven.id, 'Fixture Deduction', 'workspace', A, 'complete');
    await insertStep(sql, id, held, { quantity: 3, unit: 'g', position: 0 }, A);
    return id;
  });
  await signInAgainAs(page, A);
  await page.setViewportSize({ width: PHONE_WIDTH, height: 812 });
  await page.goto(`/coven/${coven.slug}/grimoire/${spellId}`);
  await page
    .getByRole('region', { name: 'Workings' })
    .getByRole('button', { name: 'Record a Working' })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Record a Working' });
  await dialog.getByRole('button', { name: 'Complete' }).click();
  const words = dialog.getByRole('list', { name: 'Deductions' }).locator('.jar-line__words');
  await expect(words).toContainText('needs 3 g · have 1 g · short by 2 g');

  const parts = await words.locator('> span').evaluateAll((spans) =>
    spans.map((span) => {
      const range = document.createRange();
      range.selectNodeContents(span);
      const tops = new Set([...range.getClientRects()].map((rect) => Math.round(rect.top)));
      return { text: span.textContent, lines: tops.size };
    }),
  );
  expect(parts).toHaveLength(3);
  for (const part of parts) expect(part, part.text ?? '').toMatchObject({ lines: 1 });
});

test('on a phone the jump menu stands under the intent and over the facts', async ({ page }) => {
  const coven = await seedCoven(page, 'Fixture Coven Nav Order', 'spell-nav-order.test', {
    A: 'owner',
  });
  const { A } = coven.users;
  const spellId = await withSql(async (sql) => {
    const held = await compendiumVariant(sql, 'Rosemary', 'Herb');
    const id = await insertSpell(sql, coven.id, 'Fixture Nav Order', 'workspace', A, 'complete');
    await sql`update spells set intent = 'To draw a steady hand', jar_description = '4 oz jar' where id = ${id}`;
    await insertStep(sql, id, held, { quantity: 2, unit: 'g', position: 0 }, A);
    return id;
  });
  await signInAgainAs(page, A);
  await page.setViewportSize({ width: PHONE_WIDTH, height: 812 });
  await page.goto(`/coven/${coven.slug}/grimoire/${spellId}`);

  const box = (locator: Locator) => locator.evaluate((el) => el.getBoundingClientRect().toJSON());
  const intent = await box(page.getByText('To draw a steady hand'));
  const nav = await box(page.getByRole('navigation', { name: 'On This Page' }));
  const facts = await box(page.getByText('4 oz jar'));
  expect(nav.top).toBeGreaterThanOrEqual(intent.bottom);
  expect(nav.bottom).toBeLessThanOrEqual(facts.top);
});

test('on a phone the keyboard reaches the jump menu after the intent and categories, and none of it before them', async ({
  page,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Nav Focus', 'spell-nav-focus.test', {
    A: 'owner',
  });
  const { A } = coven.users;
  const spellId = await withSql(async (sql) => {
    const held = await compendiumVariant(sql, 'Rosemary', 'Herb');
    const id = await insertSpell(sql, coven.id, 'Fixture Nav Focus', 'workspace', A, 'complete');
    await sql`update spells set intent = 'To draw a steady hand', jar_description = '4 oz jar' where id = ${id}`;
    await sql`
      insert into spell_categories (spell_id, category_id, created_by, updated_by)
      select ${id}, id, ${A}, ${A} from categories where deleted_at is null limit 2`;
    await insertStep(sql, id, held, { quantity: 2, unit: 'g', position: 0 }, A);
    await insertWorking(sql, id, A, { workedOn: '2026-03-04' });
    return id;
  });
  await signInAgainAs(page, A);
  await page.setViewportSize({ width: PHONE_WIDTH, height: 812 });
  await page.goto(`/coven/${coven.slug}/grimoire/${spellId}`);

  const nav = page.getByRole('navigation', { name: 'On This Page' });
  const chips = page.getByRole('article').getByRole('list', { name: 'Categories' }).first();
  const lastChip = chips.getByRole('listitem').last();
  // The chips are drawn above the menu, so a keyboard that met the menu first would read out of
  // the order the screen shows.
  await expect(chips.getByRole('listitem')).toHaveCount(2);
  const chipsBottom = await chips.evaluate((el) => el.getBoundingClientRect().bottom);
  expect(await nav.evaluate((el) => el.getBoundingClientRect().top)).toBeGreaterThanOrEqual(
    chipsBottom,
  );

  // A click on the last chip, which takes no focus itself, starts the keyboard's sequence there.
  await lastChip.click();
  await page.keyboard.press('Tab');
  await expect(nav.getByRole('link').first()).toBeFocused();

  await lastChip.click();
  await page.keyboard.press('Shift+Tab');
  const before = await chips.evaluate((el) => {
    const active = document.activeElement;
    return {
      inMenu: document.querySelector('nav[aria-label="On This Page"]')?.contains(active) ?? false,
      precedes:
        active !== null &&
        active !== document.body &&
        (el.compareDocumentPosition(active) & Node.DOCUMENT_POSITION_PRECEDING) !== 0,
    };
  });
  expect(before).toEqual({ inMenu: false, precedes: true });
});

test('on a phone the keyboard reaches The Cupboard after the recipe and before Workings, as they stand', async ({
  page,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Side Focus', 'spell-side-focus.test', {
    A: 'owner',
  });
  const { A } = coven.users;
  const spellId = await withSql(async (sql) => {
    const held = await compendiumVariant(sql, "Cat's Claw", 'Bark', 'Uncaria tomentosa');
    const id = await insertSpell(sql, coven.id, 'Fixture Side Focus', 'workspace', A, 'complete');
    await sql`update spells set note = 'A closing note' where id = ${id}`;
    await insertStep(sql, id, held, { quantity: 2, unit: 'g', position: 0 }, A);
    await insertStock(sql, coven.id, held, { quantity: 10, unit: 'g', threshold: 0 }, A);
    await insertWorking(sql, id, A, { workedOn: '2026-03-04' });
    return id;
  });
  await signInAgainAs(page, A);
  await page.setViewportSize({ width: PHONE_WIDTH, height: 812 });
  await page.goto(`/coven/${coven.slug}/grimoire/${spellId}`);

  const side = page.getByRole('complementary', { name: 'The Cupboard' });
  const workings = page.getByRole('region', { name: 'Workings' });
  // The side column is drawn above Workings, so a keyboard that met Workings first would read out
  // of the order the screen shows.
  const sideTop = await side.evaluate((el) => el.getBoundingClientRect().top);
  expect(await workings.evaluate((el) => el.getBoundingClientRect().top)).toBeGreaterThan(sideTop);

  const where = () =>
    page.evaluate(() => {
      const active = document.activeElement;
      if (document.querySelector('aside[aria-label="The Cupboard"]')?.contains(active))
        return 'side';
      if (document.getElementById('spell-workings')?.contains(active)) return 'workings';
      return 'elsewhere';
    });

  await page.getByText('A closing note').click();
  const seen: string[] = [];
  for (let i = 0; i < 30 && !seen.includes('workings'); i++) {
    await page.keyboard.press('Tab');
    seen.push(await where());
  }
  expect(seen[0]).toBe('side');
  expect(seen).toContain('workings');
  expect(seen.slice(0, seen.indexOf('workings')).every((at) => at === 'side')).toBe(true);
});

for (const visibility of ['private', 'workspace'] as const) {
  test(`a ${visibility} spell's title breaks only between words at 375px`, async ({ page }) => {
    const coven = await seedCoven(
      page,
      `Fixture Words ${visibility}`,
      `spell-words-${visibility}.test`,
      {
        A: 'owner',
      },
    );
    const { A } = coven.users;
    const title = 'Blackthorn Threshold Warding Vow';
    const spellId = await withSql((sql) =>
      insertSpell(sql, coven.id, title, visibility, A, 'complete'),
    );
    await signInAgainAs(page, A);
    await page.setViewportSize({ width: PHONE_WIDTH, height: 812 });
    await page.goto(`/coven/${coven.slug}/grimoire/${spellId}`);

    const heading = page.getByRole('heading', { level: 1, name: title });
    await expect(heading).toBeVisible();
    // Each word's glyphs, measured as a range: a word split across lines, by a break or a hyphen, has a box on each.
    const lines = await heading.evaluate((h1) => {
      const text = [...h1.childNodes].find(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
      );
      if (!text?.textContent) return null;
      const words: Record<string, number> = {};
      const range = document.createRange();
      for (const match of text.textContent.matchAll(/\S+/g)) {
        range.setStart(text, match.index);
        range.setEnd(text, match.index + match[0].length);
        words[match[0]] = new Set(
          [...range.getClientRects()].map((rect) => Math.round(rect.top)),
        ).size;
      }
      return words;
    });
    expect(lines).toEqual({ Blackthorn: 1, Threshold: 1, Warding: 1, Vow: 1 });

    // The badges and the icon buttons wrap beneath the title rather than squeeze it.
    const titleBottom = await heading.evaluate((h1) => h1.getBoundingClientRect().bottom);
    const beside = page.locator('.spell-recipe__head .page-header > :not(h1)');
    const tops = await beside.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top));
    // The icons, and the Private badge on a private spell.
    expect(tops).toHaveLength(visibility === 'private' ? 2 : 1);
    for (const top of tops) expect(top).toBeGreaterThanOrEqual(titleBottom);
  });
}
