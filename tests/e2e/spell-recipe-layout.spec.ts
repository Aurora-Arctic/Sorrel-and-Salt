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

// The recipe page's screen layout: Workings closes the main column, under the body, and never
// stands in the side column that holds the jar panels.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

for (const [name, size] of [
  ['desktop', { width: 1280, height: 900 }],
  ['phone', { width: 390, height: 844 }],
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

    // The rows carry no list marker.
    const marker = await page
      .getByRole('list', { name: 'Workings' })
      .getByRole('listitem')
      .first()
      .evaluate((el) => getComputedStyle(el, '::before').content);
    expect(['none', 'normal']).toContain(marker);

    // Under the body, in the body's column.
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
  ['desktop', { width: 1280, height: 900 }],
  ['phone', { width: 390, height: 844 }],
] as const) {
  test(`the header's icon buttons start level with the title's first line on a ${name}, wrapped title`, async ({
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
    // The title wraps, and the button sits at its top rather than its middle.
    expect(titleBox.height).toBeGreaterThan(editBox.height * 1.5);
    expect(Math.abs(editBox.top - titleBox.top)).toBeLessThanOrEqual(1);
  });
}

// The facts strip gives the moon phase's cell the room its name and drawing need, so the phase never
// wraps at desktop width.
test('the moon phase sits on one line in the facts strip on a desktop', async ({ page }) => {
  const coven = await seedCoven(page, 'Fixture Coven Moon', 'spell-moon.test', { A: 'owner' });
  const { A } = coven.users;
  const spellId = await withSql(async (sql) => {
    const id = await insertSpell(sql, coven.id, 'Fixture Moon', 'workspace', A, 'complete');
    await sql`update spells set jar_description = '4 oz jar', seal_wax_color = 'Black', moon_phase = 'Waxing Gibbous', day_of_week = 'Wednesday' where id = ${id}`;
    return id;
  });
  await signInAgainAs(page, A);
  await page.setViewportSize({ width: 1280, height: 900 });
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

// Each working row's badges sit right after its date, whatever else the row holds, so the gap from
// the date to the first badge is the same on a draft row and a complete one.
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
  await page.setViewportSize({ width: 1280, height: 900 });
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
  // The draft row has the extra Draft badge and the extra Complete button, the complete row neither.
  await expect(rows.nth(0).locator('.badge')).toHaveCount(2);
  await expect(rows.nth(1).locator('.badge')).toHaveCount(1);
  expect(Math.abs(draft! - complete!)).toBeLessThanOrEqual(1);
});

for (const [name, size] of [
  ['desktop', { width: 1280, height: 900 }],
  ['phone', { width: 390, height: 844 }],
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
    // The group label and its list go with the links on a desktop, and stand over them below it.
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
      // Left of the body, not above it.
      const navBox = await nav.evaluate((el) => el.getBoundingClientRect().toJSON());
      const stepsBox = await page
        .getByRole('list', { name: 'Steps' })
        .evaluate((el) => el.getBoundingClientRect().toJSON());
      expect(navBox.right).toBeLessThanOrEqual(stepsBox.left + 1);
    }
    await nav.getByRole('link', { name: 'Workings' }).click();
    await expect(page).toHaveURL(/#spell-workings$/);
    await expect(page.getByRole('heading', { name: 'Workings' })).toBeInViewport();

    await page.emulateMedia({ media: 'print' });
    await expect(nav).toBeHidden();
  });
}

for (const [name, size] of [
  ['desktop', { width: 1280, height: 900 }],
  ['tablet', { width: 800, height: 900 }],
  ['phone', { width: 390, height: 844 }],
] as const) {
  test(`the title takes the head's row with its action icons beside it on a ${name}`, async ({
    page,
  }) => {
    const coven = await seedCoven(page, `Fixture Head ${name}`, `spell-head-${name}.test`, {
      A: 'owner',
    });
    const { A } = coven.users;
    const spellId = await withSql(async (sql) => {
      const held = await compendiumVariant(sql, "Cat's Claw", 'Bark', 'Uncaria tomentosa');
      const id = await insertSpell(
        sql,
        coven.id,
        'Fixture Layout With A Fairly Long Title',
        'workspace',
        A,
        'complete',
      );
      await insertStep(sql, id, held, { quantity: 2, unit: 'g', position: 0 }, A);
      return id;
    });
    await signInAgainAs(page, A);
    await page.setViewportSize(size);
    await page.goto(`/coven/${coven.slug}/grimoire/${spellId}`);

    const box = (locator: ReturnType<typeof page.locator>) =>
      locator.evaluate((el) => el.getBoundingClientRect().toJSON());
    const head = await box(page.locator('.spell-recipe__head'));
    const title = await box(page.getByRole('heading', { level: 1 }));
    const actions = await box(page.locator('.spell-recipe__actions'));
    const edited = await box(page.locator('.spell-recipe__head .last-edit'));
    // The Edited line stands over the title, not beside it, and the title keeps most of the row
    // with the icons at its end, on the title's first line.
    expect(edited.bottom).toBeLessThanOrEqual(title.top + 1);
    expect(title.width).toBeGreaterThan(head.width / 2);
    expect(title.left).toBeLessThanOrEqual(head.left + 1);
    expect(actions.left).toBeGreaterThanOrEqual(title.right - 1);
    expect(actions.top).toBeLessThan(title.top + 60);
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
  ['desktop', { width: 1280, height: 900 }],
  ['tablet', { width: 800, height: 900 }],
  ['phone', { width: 390, height: 844 }],
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

// The menu stands as far from the page as the ingredient entry page's does (a `space(6)`, 32px).
for (const width of [1280, 800]) {
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
  ['desktop', { width: 1280, height: 900 }],
  ['phone', { width: 390, height: 844 }],
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

    // The field after the date has not moved down.
    expect(await noteTop()).toBe(before);

    // The calendar's box is whole: inside the window, and its far corner is the calendar, not the dialog's edge.
    const box = (await page.locator('.date-field__panel').boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(size.width);
    expect(box.y + box.height).toBeLessThanOrEqual(size.height);
    const corner = await page.evaluate(
      ([x, y]) => document.elementFromPoint(x, y)?.closest('.date-field__panel') !== null,
      [box.x + box.width - 3, box.y + box.height - 3],
    );
    expect(corner).toBe(true);

    // A short date, 1 May 1900, takes no less room than today's.
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
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`/coven/${coven.slug}/grimoire/${spellId}`);
  await page
    .getByRole('region', { name: 'Workings' })
    .getByRole('button', { name: 'Record a Working' })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Record a Working' });
  await dialog.getByRole('button', { name: 'Complete' }).click();
  const words = dialog.getByRole('list', { name: 'Deductions' }).locator('.jar-line__words');
  await expect(words).toContainText('needs 3 g · have 1 g · short by 2 g');

  // Every part (needs, have, short by) stands on one line, so no unit sits alone under its number.
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
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`/coven/${coven.slug}/grimoire/${spellId}`);

  const box = (locator: Locator) => locator.evaluate((el) => el.getBoundingClientRect().toJSON());
  const intent = await box(page.getByText('To draw a steady hand'));
  const nav = await box(page.getByRole('navigation', { name: 'On This Page' }));
  const facts = await box(page.getByText('4 oz jar'));
  // The reader learns what the spell is for before the five links that jump past it.
  expect(nav.top).toBeGreaterThanOrEqual(intent.bottom);
  expect(nav.bottom).toBeLessThanOrEqual(facts.top);
});
