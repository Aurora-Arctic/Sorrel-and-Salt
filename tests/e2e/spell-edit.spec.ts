import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAgainAs } from './session';
import { grimoireList, insertSpell, seedCoven, withSql } from './stories/coven-ingredients';
import { assertNoAccessibilityViolations } from './axe';

// Editing a saved spell from its card's pencil and from its recipe page. A viewer has no pencil and no dialog,
// and the dialog over the recipe page passes axe and closes back to it.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

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
  await grimoireList(page, 'Spells').getByRole('link', { name: 'Edit Fixture Working' }).click();
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
    grimoireList(page, 'Spells').getByRole('link', {
      name: 'Fixture Working Renamed',
      exact: true,
    }),
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
  // Sweep gap: the Edit Spell dialog over a recipe page (?edit=); the sweep's spell-builder is New Spell.
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
    grimoireList(page, 'Spells').getByRole('link', {
      name: 'Fixture Working Renamed',
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: /^Edit / })).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('the Add to Jar list opens over the Category Match chips, not beneath them', async ({
  page,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Layers', 'spell-layers.test', {
    A: 'owner',
    B: 'member',
  });
  const spellId = await withSql((sql) =>
    insertSpell(sql, coven.id, 'Fixture Layers', 'workspace', coven.users.B, 'complete'),
  );
  await signInAgainAs(page, coven.users.B);
  await page.goto(`/coven/${coven.slug}/grimoire?edit=${spellId}`);
  const edit = page.getByRole('dialog', { name: 'Edit Spell, Fixture Layers' });
  await edit.getByRole('button', { name: 'Open All' }).click();
  const jar = page.getByRole('combobox', { name: 'Add to Jar' });
  await jar.fill('Amethyst (Crystal)');
  await page
    .getByRole('option', { name: /^Amethyst \(Crystal\)/ })
    .first()
    .click();
  await edit.getByRole('combobox', { name: 'Category', exact: true }).click();
  await page.getByRole('option', { name: 'Clarity' }).first().click();
  await expect(edit.getByRole('heading', { name: 'Category Match' })).toBeVisible();

  // Points across the open list must hit the list or something in it, whatever the panel beside it draws.
  // Scrolled to the top of the window, so the list opens downward over the panel that follows it.
  await page.keyboard.press('Escape');
  await jar.evaluate((input) => input.scrollIntoView({ block: 'start' }));
  await jar.click();
  const list = page.getByRole('listbox');
  await expect(list.getByRole('option').first()).toBeVisible();
  const covered = await list.evaluate((box) => {
    const rect = box.getBoundingClientRect();
    const popup = box.closest('.combobox__popup') ?? box;
    const covered: string[] = [];
    for (let fx = 0.05; fx < 1; fx += 0.05) {
      for (let fy = 0.05; fy < 1; fy += 0.05) {
        const hit = document.elementFromPoint(rect.x + rect.width * fx, rect.y + rect.height * fy);
        if (hit === null || !popup.contains(hit)) {
          covered.push(`${fx},${fy}: ${hit?.tagName}.${hit?.className}`);
        }
      }
    }
    return covered;
  });
  expect(covered, 'points on the list drawn under another element').toEqual([]);
});

test('while the categories are on their way, a held category draws no list marker', async ({
  page,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Held', 'spell-edit-held.test', {
    A: 'owner',
  });
  const spellId = await withSql(async (sql) => {
    const id = await insertSpell(
      sql,
      coven.id,
      'Fixture Held',
      'workspace',
      coven.users.A,
      'complete',
    );
    await sql`
      insert into spell_categories (spell_id, category_id, created_by, updated_by)
      select ${id}, id, ${coven.users.A}, ${coven.users.A}
      from categories where deleted_at is null order by name limit 2`;
    return id;
  });
  await signInAgainAs(page, coven.users.A);
  const held: Array<() => Promise<void>> = [];
  await page.route('**/api/graphql', (route) => {
    const body = route.request().postDataJSON() as { operationName?: string } | null;
    if (body?.operationName !== 'PickerCategories') return route.continue();
    held.push(() => route.continue());
  });

  await page.goto(`/coven/${coven.slug}/grimoire?edit=${spellId}`);
  const edit = page.getByRole('dialog', { name: 'Edit Spell, Fixture Held' });
  await edit.getByRole('button', { name: 'Open All' }).click();
  await expect.poll(() => held.length).toBeGreaterThan(0);
  const picks = edit.getByRole('group', { name: 'Categories' }).getByRole('listitem');
  // Why the check means something: both held picks are drawn while their names are still on the way.
  await expect(picks).toHaveCount(2);
  const markers = await picks.evaluateAll((items) =>
    items.map((item) => getComputedStyle(item, '::before').content),
  );
  expect(markers).toEqual(['none', 'none']);
  await Promise.all(held.map((release) => release()));
});
