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
    const aside = await box(page.getByRole('complementary', { name: 'The Jar' }));

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

// Each working row's badges sit in their own column and its buttons in a slot at the far right, so
// the badges start the same distance from the row's right edge whatever the row holds.
test('the badges of a draft and a complete working start at the same place on a desktop', async ({
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
        .locator('.specimen__badges .badge')
        .first()
        .evaluate((el) => el.getBoundingClientRect().left),
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
      name === 'desktop' ? ['Steps', 'Workings'] : ['Steps', 'The Jar', 'Workings'],
    );
    if (name === 'phone') {
      const top = (label: string) =>
        page
          .getByRole(label === 'The Jar' ? 'complementary' : 'region', { name: label })
          .evaluate((el) => el.getBoundingClientRect().top);
      expect(await top('The Jar')).toBeLessThan(await top('Workings'));
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
