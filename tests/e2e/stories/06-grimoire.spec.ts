import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../fixtures';
import { assertNoAccessibilityViolations } from '../axe';
import { recreateE2eDatabase } from '../database';
import { signInAgainAs } from '../session';
import {
  applyFilters,
  chooseChip,
  compendiumVariant,
  graphqlFromPage,
  insertDeduction,
  insertSpell,
  insertStep,
  insertStock,
  insertWorking,
  localIngredient,
  openFilters,
  seedCoven,
  withSql,
} from './coven-ingredients';
import { categoryChip, pickCategoryIn } from './ingredient-dialogs';
import { makeVariant } from '../../support/fixtures/ingredient';

// `test.fixme` annotations name their task; stories 76 to 80 are not in DESIGN.md §10, so the reporter prints "Not a v1 story".

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

async function openBuilder(page: Page, slug: string): Promise<Locator> {
  await page.goto(`/coven/${slug}/grimoire`);
  await page.getByRole('link', { name: 'New Spell' }).click();
  await expect(page).toHaveURL(`/coven/${slug}/grimoire?new=spell-${slug}`);
  const dialog = page.getByRole('dialog', { name: 'New Spell' });
  await expect(dialog).toBeVisible();
  return dialog;
}

function stepList(page: Page): Locator {
  return page.getByRole('list', { name: 'Steps' });
}

function grimoireList(page: Page): Locator {
  return page.getByRole('list', { name: /^(Spells|Drafts)$/ });
}

async function addIngredientStep(page: Page, name: string): Promise<Locator> {
  await page.getByRole('combobox', { name: 'Add to Jar' }).fill(name);
  // The box's first row offers the typed text as a one-off; it is not the ingredient.
  await page
    .getByRole('option', { name })
    .filter({ hasNotText: 'as a one-off ingredient' })
    .first()
    .click();
  return stepList(page).getByRole('listitem').filter({ hasText: name });
}

async function pickUnit(step: Locator, unit: string): Promise<void> {
  await step.getByRole('combobox', { name: /^Unit/ }).click();
  await step.page().getByRole('option', { name: unit, exact: true }).click();
}

test('a member names a spell and states its intent', { tag: '@story-47' }, async ({ page }) => {
  const coven = await seedCoven(page, 'Fixture Coven Forty-Seven', 'story-47.test', {
    A: 'owner',
    B: 'member',
  });
  await signInAgainAs(page, coven.users.B);
  const builder = await openBuilder(page, coven.slug);
  const save = builder.getByRole('button', { name: 'Save' });
  await expect(save).toBeDisabled();
  await builder.getByRole('textbox', { name: 'Title' }).fill('Fixture Working');
  await expect(save).toBeEnabled();
  await save.click();
  // empty form, and the same dialog is headed as the saved spell, with nothing left to save.
  await expect(page).toHaveURL(new RegExp(`/coven/${coven.slug}/grimoire\\?edit=[0-9a-f-]{36}$`));
  const drafted = page.getByRole('dialog', { name: 'Edit Spell, Fixture Working' });
  const saved = drafted.getByRole('button', { name: 'Save' });
  await expect(saved).toBeDisabled();
  await expect(saved).not.toHaveAttribute('aria-busy', 'true');
  const draft = page.url();
  await drafted.getByRole('textbox', { name: 'Intent' }).fill('To see clearly');
  await drafted.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page).toHaveURL(`/coven/${coven.slug}/grimoire`);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goto(draft);
  const edit = page.getByRole('dialog', { name: 'Edit Spell, Fixture Working' });
  await edit.getByRole('button', { name: 'Open All' }).click();
  await expect(edit.getByRole('textbox', { name: 'Intent' })).toHaveValue('To see clearly');
  await edit.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page).toHaveURL(`/coven/${coven.slug}/grimoire`);
  await page.getByRole('link', { name: 'Drafts' }).click();
  await expect(page).toHaveURL(`/coven/${coven.slug}/grimoire/drafts`);
  await expect(grimoireList(page).getByText('Fixture Working', { exact: true })).toBeVisible();
});

test(
  'a member assigns categories describing what the spell is meant to do',
  { tag: '@story-48' },
  async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Forty-Eight', 'story-48.test', {
      A: 'owner',
      B: 'member',
    });
    await signInAgainAs(page, coven.users.B);
    const builder = await openBuilder(page, coven.slug);
    const save = builder.getByRole('button', { name: 'Save' });
    await builder.getByRole('textbox', { name: 'Title' }).fill('Fixture Working');
    for (const category of ['Protection', 'Cleansing']) {
      await pickCategoryIn(builder, category);
      await expect(categoryChip(builder, category)).toBeVisible();
    }
    await categoryChip(builder, 'Cleansing').click();
    await expect(categoryChip(builder, 'Cleansing')).toHaveCount(0);
    await save.click();
    const drafted = page.getByRole('dialog', { name: 'Edit Spell, Fixture Working' });
    const saved = drafted.getByRole('button', { name: 'Save' });
    await expect(saved).toBeDisabled();
    await expect(saved).not.toHaveAttribute('aria-busy', 'true');
    await drafted.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('link', { name: 'Drafts' }).click();
    await expect(page).toHaveURL(`/coven/${coven.slug}/grimoire/drafts`);
    const card = grimoireList(page).getByRole('listitem').filter({ hasText: 'Fixture Working' });
    const chips = card.getByRole('list', { name: 'Categories' });
    await expect(chips.getByRole('listitem')).toHaveText(['Protection']);
  },
);

test(
  'a member searches and filters ingredients with the same controls as the ingredients page',
  { tag: '@story-49' },
  async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Forty-Nine', 'story-49.test', {
      A: 'owner',
      B: 'member',
    });
    await withSql(async (sql) =>
      insertStock(
        sql,
        coven.id,
        await compendiumVariant(sql, 'Rosemary', 'Herb'),
        { quantity: 20, unit: 'g', threshold: 0 },
        coven.users.A,
      ),
    );
    await signInAgainAs(page, coven.users.B);
    await openBuilder(page, coven.slug);
    const search = page.getByRole('combobox', { name: 'Add to Jar' });
    await search.fill('Rose');
    const yours = page.getByRole('group', { name: 'Your Ingredients' });
    await expect(yours.getByRole('option', { name: /Rosemary \(Herb\)/ })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Compendium' })).toBeVisible();
    await search.fill('Fixture Nothing Matches');
    await expect(page.getByRole('option')).toHaveCount(1);
    await expect(
      page.getByRole('option', { name: 'Add "Fixture Nothing Matches" as a one-off ingredient' }),
    ).toBeVisible();
  },
);

test(
  'a member adds an ingredient with a quantity and a unit',
  { tag: '@story-50' },
  async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Fifty', 'story-50.test', {
      A: 'owner',
      B: 'member',
    });
    await signInAgainAs(page, coven.users.B);
    await openBuilder(page, coven.slug);
    await page.getByRole('textbox', { name: 'Title' }).fill('Fixture Working');
    const step = await addIngredientStep(page, 'Rosemary (Herb)');
    await step.getByRole('spinbutton', { name: /^Quantity/ }).fill('2');
    await pickUnit(step, 'g');
    const save = page.getByRole('button', { name: 'Save' });
    await save.click();
    await expect(save).toBeDisabled();
    await expect(save).not.toHaveAttribute('aria-busy', 'true');
    const rows = await withSql(
      (sql) => sql<{ quantity: string; unit: string; name: string | null }[]>`
        select st.quantity, st.unit, st.name from spell_steps st
        join spells s on s.id = st.spell_id
        where s.workspace_id = ${coven.id} and s.title = 'Fixture Working'
          and st.deleted_at is null`,
    );
    expect(rows.map((row) => ({ ...row, quantity: Number(row.quantity) }))).toEqual([
      { quantity: 2, unit: 'g', name: null },
    ]);
  },
);

test(
  'a member reorders ingredients, so the layering sequence is recorded',
  { tag: '@story-51' },
  async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Fifty-One', 'story-51.test', {
      A: 'owner',
      B: 'member',
    });
    await signInAgainAs(page, coven.users.B);
    await openBuilder(page, coven.slug);
    await page.getByRole('textbox', { name: 'Title' }).fill('Fixture Working');
    const said = (text: string) => page.getByRole('status').filter({ hasText: text });
    const addToJar = page.getByRole('combobox', { name: 'Add to Jar' });
    await addIngredientStep(page, 'Rosemary (Herb)');
    await expect(said('Added Rosemary (Herb), at position 1 of 1.')).toBeAttached();
    await expect(addToJar).toBeFocused();
    await addIngredientStep(page, 'Mugwort (Herb)');
    await expect(said('Added Mugwort (Herb), at position 2 of 2.')).toBeAttached();
    await expect(addToJar).toBeFocused();
    const steps = stepList(page).getByRole('listitem');
    await expect(steps.first()).toContainText('Rosemary');
    const handle = page.getByRole('button', { name: 'Move Mugwort (Herb)', exact: true });
    // dnd-kit starts listening for the moving keys in a timer set at the lift, which can run after the lift is said, so each key waits for what the last one said.
    await handle.focus();
    await page.keyboard.press('Space');
    await expect(said('Picked up Mugwort (Herb), at position 2 of 2.')).toBeAttached();
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve)));
    await page.keyboard.press('ArrowUp');
    await expect(said('Mugwort (Herb) moved to position 1 of 2.')).toBeAttached();
    await page.keyboard.press('Space');
    await expect(
      page.getByRole('status').filter({ hasText: 'Mugwort (Herb) put down at position 1 of 2.' }),
    ).toBeAttached();
    await expect(handle).toBeFocused();
    await expect(steps.first()).toContainText('Mugwort');
    const save = page.getByRole('button', { name: 'Save' });
    await save.click();
    await expect(save).toBeDisabled();
    await expect(save).not.toHaveAttribute('aria-busy', 'true');
    const rows = await withSql(
      (sql) => sql<{ name: string; position: number }[]>`
        select i.name, st.position from spell_steps st
        join spells s on s.id = st.spell_id
        join ingredients i on i.id = st.ingredient_id
        where s.workspace_id = ${coven.id} and s.title = 'Fixture Working'
          and st.deleted_at is null
        order by st.position`,
    );
    expect(rows).toEqual([
      { name: 'Mugwort', position: 1 },
      { name: 'Rosemary', position: 2 },
    ]);

    await page.getByRole('button', { name: 'Add Instruction' }).click();
    await expect(said('Added New Instruction, at position 3 of 3.')).toBeAttached();
    await expect(steps.nth(2).getByRole('textbox', { name: 'Instruction' })).toBeFocused();
    await steps.nth(2).getByRole('button', { name: 'Close New Instruction' }).click();
    await page.getByRole('button', { name: 'Remove New Instruction' }).click();
    await expect(said('Removed New Instruction, from position 3 of 3.')).toBeAttached();
    await expect(
      page.getByRole('button', { name: 'Move Rosemary (Herb)', exact: true }),
    ).toBeFocused();
    await page.getByRole('button', { name: 'Remove Mugwort (Herb)' }).click();
    await expect(said('Removed Mugwort (Herb), from position 1 of 2.')).toBeAttached();
    await expect(
      page.getByRole('button', { name: 'Move Rosemary (Herb)', exact: true }),
    ).toBeFocused();
    await page.getByRole('button', { name: 'Remove Rosemary (Herb)' }).click();
    await expect(said('Removed Rosemary (Herb), from position 1 of 1.')).toBeAttached();
    await expect(page.getByRole('button', { name: 'Add Instruction' })).toBeFocused();
  },
);

test(
  'a member sees the gaps between intended and derived categories in both directions',
  { tag: '@story-52' },
  async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Fifty-Two', 'story-52.test', {
      A: 'owner',
      B: 'member',
    });
    await signInAgainAs(page, coven.users.B);
    await openBuilder(page, coven.slug);
    const panel = page.getByRole('region', { name: 'Category Match' });
    await page
      .getByRole('group', { name: 'Categories', exact: true })
      .getByRole('combobox')
      .fill('Prosperity');
    await page.getByRole('option', { name: 'Prosperity' }).click();
    const row = (label: string) => panel.locator('dt', { hasText: label });
    await expect(row('Missing')).toBeVisible();
    await expect(panel.getByText('Prosperity')).toBeVisible();
    await addIngredientStep(page, 'Mugwort');
    await expect(row('Extra')).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Prosperity' })).toHaveAccessibleDescription(
      'Assigned to this spell, and nothing in the jar carries it.',
    );
    await page.getByRole('button', { name: /Close Mugwort/ }).click();
    await page.getByRole('button', { name: /Remove Mugwort/ }).click();
    await expect(row('Extra')).toHaveCount(0);
  },
);

test(
  'a member is warned when an ingredient is flagged toxic or unsafe to burn',
  { tag: '@story-53' },
  async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Fifty-Three', 'story-53.test', {
      A: 'owner',
      B: 'member',
    });
    await withSql(async (sql) =>
      localIngredient(sql, coven.id, coven.users.A, {
        name: 'Fixture Toxwort',
        toxic: true,
        variants: [makeVariant({ form: 'Root' })],
      }),
    );
    await signInAgainAs(page, coven.users.B);
    await openBuilder(page, coven.slug);
    const step = await addIngredientStep(page, 'Fixture Toxwort');
    await expect(step.getByText('Toxic').first()).toBeVisible();
    await page.getByRole('textbox', { name: 'Title' }).fill('Fixture Working');
    await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled();
  },
);

test(
  "a member sees on a spell's Quick Look and its recipe page what the coven has none of",
  { tag: '@story-54' },
  async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Fifty-Four', 'story-54.test', {
      A: 'owner',
      B: 'member',
    });
    const A = coven.users.A;
    const spellId = await withSql(async (sql) => {
      const empty = await localIngredient(sql, coven.id, A, {
        name: 'Fixture Emptywort',
        nomenclature: 'none',
        variants: [makeVariant({ form: 'Root' })],
      });
      const full = await localIngredient(sql, coven.id, A, {
        name: 'Fixture Fullwort',
        nomenclature: 'none',
        variants: [makeVariant({ form: 'Root' })],
      });
      await insertStock(sql, coven.id, empty, { quantity: 0, unit: 'g', threshold: 0 }, A);
      await insertStock(sql, coven.id, full, { quantity: 50, unit: 'g', threshold: 0 }, A);
      const id = await insertSpell(sql, coven.id, 'Fixture Working', 'workspace', A, 'complete');
      await insertStep(sql, id, empty, { quantity: 2, unit: 'g', position: 0 }, A);
      await insertStep(sql, id, full, { quantity: 2, unit: 'g', position: 1 }, A);
      return id;
    });
    await signInAgainAs(page, coven.users.B);
    await page.goto(`/coven/${coven.slug}/grimoire`);
    await grimoireList(page).getByRole('link', { name: 'Quick Look Fixture Working' }).click();
    const look = page.getByRole('dialog', { name: /Fixture Working/ });
    await expect(look.getByRole('button', { name: 'Out' })).toHaveCount(1);
    const emptyStep = look.getByRole('listitem').filter({ hasText: 'Fixture Emptywort' });
    await expect(emptyStep.getByRole('button', { name: 'Out' })).toBeVisible();
    await look.getByRole('link', { name: 'See Full Recipe' }).click();
    await expect(page).toHaveURL(new RegExp(`/coven/${coven.slug}/grimoire/${spellId}$`));
    const inventory = page.getByRole('region', { name: 'In the Cupboard' });
    await expect(inventory.getByRole('button', { name: 'Out' })).toHaveCount(1);
    const emptyLine = inventory.getByRole('listitem').filter({ hasText: 'Fixture Emptywort' });
    await expect(emptyLine.getByRole('button', { name: 'Out' })).toBeVisible();
  },
);

test('a member saves a spell as a draft', { tag: '@story-55' }, async ({ page }) => {
  const coven = await seedCoven(page, 'Fixture Coven Fifty-Five', 'story-55.test', {
    A: 'owner',
    B: 'member',
  });
  await signInAgainAs(page, coven.users.B);
  const dialog = await openBuilder(page, coven.slug);
  await dialog.getByRole('textbox', { name: 'Title' }).fill('Fixture Working');
  await dialog.getByRole('button', { name: 'Save Spell' }).click();
  await expect(page).toHaveURL(new RegExp(`/coven/${coven.slug}/grimoire\\?edit=[0-9a-f-]{36}$`));
  const draft = page.url();
  await page.goto(`/coven/${coven.slug}/grimoire/drafts`);
  const card = grimoireList(page).getByRole('article', { name: /Fixture Working/ });
  await expect(card.getByText('Draft')).toBeVisible();
  await page.goto(draft);
  const edit = page.getByRole('dialog', { name: 'Edit Spell, Fixture Working' });
  await edit.getByRole('button', { name: 'Mark Complete' }).click();
  await expect(edit.getByRole('button', { name: 'Mark Complete' })).toHaveCount(0);
  await page.goto(`/coven/${coven.slug}/grimoire`);
  await grimoireList(page).getByRole('link', { name: 'Edit Fixture Working' }).click();
  const renamed = page.getByRole('dialog', { name: 'Edit Spell, Fixture Working' });
  await renamed.getByRole('button', { name: 'Open All' }).click();
  await renamed.getByRole('textbox', { name: 'Title' }).fill('Fixture Working Renamed');
  await renamed.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page).toHaveURL(`/coven/${coven.slug}/grimoire`);
  await expect(
    grimoireList(page).getByRole('link', { name: 'Fixture Working Renamed', exact: true }),
  ).toBeVisible();
});

test(
  'any member, a viewer included, reads every workspace-visible spell, and a private spell stays with its author',
  { tag: '@story-56' },
  async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Fifty-Six', 'story-56.test', {
      A: 'owner',
      B: 'member',
      C: 'viewer',
    });
    const { A, B, C } = coven.users;
    await withSql(async (sql) => {
      await insertSpell(sql, coven.id, 'Shared Working', 'workspace', A, 'complete');
      await insertSpell(sql, coven.id, 'Private Working', 'private', A, 'complete');
    });
    const path = `/coven/${coven.slug}/grimoire`;
    // Why the private spell's absence is the rule's: its author sees it.
    await signInAgainAs(page, A);
    await page.goto(path);
    await expect(grimoireList(page).getByRole('listitem')).toHaveCount(2);
    const item = (name: string) => grimoireList(page).getByRole('article', { name });
    await expect(item('Private Working').getByText('Private', { exact: true })).toBeVisible();
    await expect(item('Shared Working').getByText('Private', { exact: true })).toHaveCount(0);
    for (const reader of [B, C]) {
      await signInAgainAs(page, reader);
      await page.goto(path);
      await expect(grimoireList(page).getByRole('listitem')).toHaveCount(1);
      await expect(grimoireList(page).getByText('Shared Working', { exact: true })).toBeVisible();
      await expect(grimoireList(page).getByText('Private Working')).toHaveCount(0);
    }
  },
);

test(
  'a member deletes a shared spell from its page after being asked, naming it; the grimoire says so, and a viewer is offered no Delete',
  { tag: '@story-56' },
  async ({ page }) => {
    // The visibility lock governs widening, not existence.
    const coven = await seedCoven(page, 'Fixture Coven Fifty-Six Deletes', 'story-56-delete.test', {
      A: 'owner',
      B: 'member',
      C: 'viewer',
    });
    const { A, B, C } = coven.users;
    const { gone, kept, step } = await withSql(async (sql) => {
      const gone = await insertSpell(sql, coven.id, 'Doomed Working', 'workspace', A, 'complete');
      const kept = await insertSpell(sql, coven.id, 'Kept Working', 'workspace', A, 'complete');
      const held = await localIngredient(sql, coven.id, A);
      const step = await insertStep(sql, gone, held, { quantity: 1, unit: 'g', position: 1 }, A);
      return { gone, kept, step };
    });
    const deletedAt = async (table: 'spells' | 'spell_steps', id: string) => {
      const [row] = await withSql(
        (sql) => sql<{ deleted_at: Date | null }[]>`
          select deleted_at from ${sql(table)} where id = ${id}`,
      );
      return row.deleted_at;
    };
    const listPath = `/coven/${coven.slug}/grimoire`;
    const recipePath = `${listPath}/${gone}`;
    const dots = page.getByRole('button', { name: 'More for Doomed Working', exact: true });
    const askToDelete = async () => {
      await dots.click();
      await page.getByRole('menuitem', { name: 'Delete', exact: true }).click();
    };
    const question = page.getByRole('dialog', { name: 'Delete Spell', exact: true });

    // Why the delete could be refused: B is not the author, and the spell is complete and
    // shared. B is a member of the coven, which is what the delete asks.
    await signInAgainAs(page, B);
    await page.goto(recipePath);
    await expect(page.getByRole('heading', { level: 1, name: 'Doomed Working' })).toBeVisible();

    await test.step('the Delete asks first, naming the spell, and Cancel changes nothing', async () => {
      await askToDelete();
      await expect(question).toContainText('Doomed Working');
      await assertNoAccessibilityViolations(page);
      await question.getByRole('button', { name: 'Cancel', exact: true }).click();

      await expect(question).toHaveCount(0);
      await expect(dots).toBeFocused();
      expect(await deletedAt('spells', gone)).toBeNull();
    });

    await test.step('confirmed, the page leaves for the grimoire, which says so, with the focus on its heading', async () => {
      await askToDelete();
      await question.getByRole('button', { name: 'Delete', exact: true }).click();

      await expect(page).toHaveURL(/\/grimoire\?deleted=/);
      await expect(page.getByRole('status').filter({ hasText: 'Doomed Working' })).toHaveCount(1);
      await expect(page.getByRole('heading', { level: 1, name: 'Grimoire' })).toBeFocused();
      await expect(grimoireList(page).getByRole('listitem')).toHaveCount(1);
      await expect(grimoireList(page).getByText('Kept Working', { exact: true })).toBeVisible();
      await assertNoAccessibilityViolations(page);
      expect(await deletedAt('spells', gone)).not.toBeNull();
      expect(await deletedAt('spell_steps', step)).not.toBeNull();
      expect(await deletedAt('spells', kept)).toBeNull();
    });

    await test.step('the deleted spell has no page and opens no Edit dialog', async () => {
      const response = await page.goto(recipePath);
      expect(response?.status()).toBe(404);
      await page.goto(`${listPath}?edit=${gone}`);
      await expect(page.getByRole('heading', { level: 1, name: 'Grimoire' })).toBeVisible();
      await expect(page.getByRole('dialog')).toHaveCount(0);
    });

    await test.step('a viewer is offered no Delete, and one sent by direct id is refused', async () => {
      await signInAgainAs(page, C);
      await page.goto(`${listPath}/${kept}`);
      // Why it could be offered: the viewer reads the page the member could delete from.
      await expect(page.getByRole('heading', { level: 1, name: 'Kept Working' })).toBeVisible();
      // Print stands alone because nothing else is offered: a Delete would put both in the dots' menu.
      await expect(
        page.getByRole('button', { name: 'Print Kept Working', exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'More for Kept Working', exact: true }),
      ).toHaveCount(0);
      await expect(page.getByRole('main').getByRole('button', { name: /^Delete/ })).toHaveCount(0);

      const answer = await graphqlFromPage(
        page,
        'mutation ($w: ID!, $id: ID!) { deleteSpell(workspaceId: $w, id: $id) }',
        { w: coven.id, id: kept },
      );
      expect(answer.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
      expect(await deletedAt('spells', kept)).toBeNull();
    });
  },
);

test(
  'a member deletes a spell from its card in the grimoire list and lands back on the list, filter kept, with the spell gone',
  { tag: '@story-56' },
  async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Fifty-Six Card', 'story-56-card.test', {
      A: 'owner',
      B: 'member',
    });
    const { A, B } = coven.users;
    await withSql(async (sql) => {
      await insertSpell(sql, coven.id, 'Card Doomed Working', 'workspace', A, 'complete');
      await insertSpell(sql, coven.id, 'Card Kept Working', 'workspace', A, 'complete');
    });
    const listPath = `/coven/${coven.slug}/grimoire`;
    // Why the delete could be refused: B is not the author and the spell is shared and complete.
    await signInAgainAs(page, B);
    await page.goto(`${listPath}?query=Card`);
    await expect(grimoireList(page).getByRole('listitem')).toHaveCount(2);

    await grimoireList(page)
      .getByRole('button', { name: 'More for Card Doomed Working', exact: true })
      .click();
    await page.getByRole('menuitem', { name: 'Delete', exact: true }).click();
    const question = page.getByRole('dialog', { name: 'Delete Spell', exact: true });
    await expect(question).toContainText('Card Doomed Working');
    await assertNoAccessibilityViolations(page);
    await question.getByRole('button', { name: 'Delete', exact: true }).click();

    await expect(page).toHaveURL(/\/grimoire\?query=Card&deleted=/);
    await expect(page.getByRole('status').filter({ hasText: 'Card Doomed Working' })).toHaveCount(
      1,
    );
    await expect(grimoireList(page).getByRole('listitem')).toHaveCount(1);
    await expect(grimoireList(page).getByText('Card Kept Working', { exact: true })).toBeVisible();
    await assertNoAccessibilityViolations(page);
  },
);

test(
  'a member deletes a spell from its Edit dialog after being asked, and lands back on the list with the spell gone',
  { tag: '@story-56' },
  async ({ page }) => {
    const coven = await seedCoven(
      page,
      'Fixture Coven Fifty-Six Builder',
      'story-56-builder.test',
      {
        A: 'owner',
        B: 'member',
      },
    );
    const { A, B } = coven.users;
    const gone = await withSql(async (sql) => {
      await insertSpell(sql, coven.id, 'Builder Kept Working', 'workspace', A, 'complete');
      return insertSpell(sql, coven.id, 'Builder Doomed Working', 'workspace', A, 'complete');
    });
    const listPath = `/coven/${coven.slug}/grimoire`;
    // Why the delete could be refused: B is not the author and the spell is shared and complete.
    await signInAgainAs(page, B);
    await page.goto(`${listPath}?edit=${gone}`);
    const edit = page.getByRole('dialog', { name: 'Edit Spell, Builder Doomed Working' });
    await edit
      .getByRole('button', { name: 'Delete Spell Builder Doomed Working', exact: true })
      .click();
    await expect(page.getByText('Delete Builder Doomed Working?')).toBeVisible();
    await assertNoAccessibilityViolations(page);
    await page.getByRole('button', { name: 'Delete', exact: true }).click();

    await expect(page).toHaveURL(/\/grimoire\?deleted=/);
    await expect(
      page.getByRole('status').filter({ hasText: 'Builder Doomed Working' }),
    ).toHaveCount(1);
    await expect(grimoireList(page).getByText('Builder Doomed Working')).toHaveCount(0);
    await expect(
      grimoireList(page).getByText('Builder Kept Working', { exact: true }),
    ).toBeVisible();
    await assertNoAccessibilityViolations(page);
  },
);

test(
  'a member adds a one-off ingredient by name and form, and it goes in the jar and nowhere else',
  { tag: '@story-57' },
  async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Fifty-Seven', 'story-57.test', {
      A: 'owner',
      B: 'member',
    });
    await signInAgainAs(page, coven.users.B);
    await openBuilder(page, coven.slug);
    await page.getByRole('textbox', { name: 'Title' }).fill('Fixture Working');
    await page.getByRole('combobox', { name: 'Add to Jar' }).fill('Testwort');
    await page.getByRole('option', { name: 'Add "Testwort" as a one-off ingredient' }).click();
    const oneOff = stepList(page).getByRole('listitem').filter({ hasText: 'Testwort' });
    await oneOff.getByRole('textbox', { name: /^Form/ }).fill('Dried Root');
    await expect(oneOff).toContainText('One-Off');
    const save = page.getByRole('button', { name: 'Save' });
    // The autosave may already have saved it by now, so the press is not waited for.
    await expect(page.getByRole('status').filter({ hasText: /^Draft saved/ })).toBeVisible({
      timeout: 15_000,
    });
    await expect(save).toBeDisabled();
    await expect(save).not.toHaveAttribute('aria-busy', 'true');
    await page.goto(`/coven/${coven.slug}/ingredients`);
    await expect(page.getByRole('heading', { name: 'Ingredients', level: 1 })).toBeVisible();
    await expect(page.getByText('Testwort')).toHaveCount(0);
  },
);

test(
  'a member records that the coven made a spell, when and with whom',
  { tag: '@story-76' },
  async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Seventy-Six', 'story-76.test', {
      A: 'owner',
      B: 'member',
    });
    const spellId = await withSql((sql) =>
      insertSpell(sql, coven.id, 'Fixture Working', 'workspace', coven.users.B, 'complete'),
    );
    await signInAgainAs(page, coven.users.B);
    await page.goto(`/coven/${coven.slug}/grimoire/${spellId}`);
    const recordButton = page
      .locator('.spell-recipe__actions')
      .getByRole('button', { name: 'Record a Working' });
    await recordButton.click();
    const dialog = page.getByRole('dialog', { name: 'Record a Working' });
    await dialog.getByRole('combobox', { name: 'Participants' }).fill('Fixture A');
    await page.getByRole('option', { name: 'Fixture A' }).click();
    await dialog.getByRole('button', { name: 'Save Working' }).click();
    // The row is read from the database, not the Workings list.
    await expect(dialog).toBeHidden();
    await expect(recordButton).toBeFocused();
    await assertNoAccessibilityViolations(page);
    const kept = await withSql(
      (sql) => sql`
        select w.status, count(p.id)::int as people
        from spell_workings w
        left join spell_working_participants p on p.working_id = w.id
        where w.spell_id = ${spellId}
        group by w.status`,
    );
    expect(kept).toEqual([{ status: 'draft', people: 2 }]);
  },
);

test(
  'a step carries a unit the jar can be measured against',
  { tag: '@story-77' },
  async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Seventy-Seven', 'story-77.test', {
      A: 'owner',
      B: 'member',
    });
    await withSql(async (sql) =>
      insertStock(
        sql,
        coven.id,
        await compendiumVariant(sql, 'Rosemary', 'Herb'),
        { quantity: 20, unit: 'g', threshold: 0 },
        coven.users.A,
      ),
    );
    await signInAgainAs(page, coven.users.B);
    await openBuilder(page, coven.slug);
    const step = await addIngredientStep(page, 'Rosemary (Herb)');
    const unit = step.getByRole('combobox', { name: /^Unit/ });
    const save = page.getByRole('button', { name: 'Save' });
    await expect(unit).toHaveText('g');
    await pickUnit(step, 'ml');
    await expect(unit).toHaveAttribute('aria-invalid', 'true');
    await expect(unit).toHaveAccessibleDescription(/measured in/);
    await expect(save).toBeDisabled();
    await pickUnit(step, 'g');
    await expect(unit).not.toHaveAttribute('aria-invalid', 'true');
    await expect(save).toBeEnabled();
  },
);

test(
  'completing a working takes what it used out of the coven stock',
  { tag: '@story-78' },
  async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Seventy-Eight', 'story-78.test', {
      A: 'owner',
      B: 'member',
    });
    const spellId = await withSql(async (sql) => {
      const held = await compendiumVariant(sql, 'Rosemary', 'Herb');
      await insertStock(
        sql,
        coven.id,
        held,
        { quantity: 20, unit: 'g', threshold: 0 },
        coven.users.A,
      );
      const id = await insertSpell(
        sql,
        coven.id,
        'Fixture Working',
        'workspace',
        coven.users.B,
        'complete',
      );
      await insertStep(sql, id, held, { quantity: 2, unit: 'g', position: 0 }, coven.users.B);
      return id;
    });
    await signInAgainAs(page, coven.users.B);
    await page.goto(`/coven/${coven.slug}/grimoire/${spellId}`);
    await page
      .locator('.spell-recipe__actions')
      .getByRole('button', { name: 'Record a Working' })
      .click();
    const dialog = page.getByRole('dialog', { name: 'Record a Working' });
    await dialog.getByRole('button', { name: 'Complete' }).click();
    await expect(dialog.getByRole('list', { name: 'Deductions' })).toContainText('2 g');
    await assertNoAccessibilityViolations(page);
    await dialog.getByRole('button', { name: 'Mark Complete' }).click();
    await expect(dialog.getByText('Done')).toBeVisible();
    await page.goto(`/coven/${coven.slug}/ingredients`);
    await expect(page.getByRole('listitem').filter({ hasText: 'Herb' }).first()).toContainText(
      '18 g',
    );
  },
);

test(
  "a member sees a spell's workings on its recipe page and how many times it has been made on its card",
  { tag: '@story-79' },
  async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Seventy-Nine', 'story-79.test', {
      A: 'owner',
      B: 'member',
    });
    const { A, B } = coven.users;
    const spellId = await withSql(async (sql) => {
      const rosemary = await compendiumVariant(sql, 'Rosemary', 'Herb');
      const jar = await insertStock(
        sql,
        coven.id,
        rosemary,
        { quantity: 20, unit: 'g', threshold: 0 },
        A,
      );
      const id = await insertSpell(sql, coven.id, 'Fixture Working', 'workspace', B, 'complete');
      const step = await insertStep(sql, id, rosemary, { quantity: 2, unit: 'g', position: 1 }, B);
      const oil = await compendiumVariant(sql, 'Rosemary', 'Oil');
      await insertStep(sql, id, oil, { quantity: 1, unit: 'g', position: 2 }, B);
      const mine = await insertWorking(sql, id, B, {
        workedOn: '2026-03-04',
        note: 'First brewing',
        participants: [B, A],
      });
      await insertDeduction(sql, mine, step, jar, { quantity: 2, unit: 'g' }, B);
      await insertWorking(sql, id, A, { workedOn: '2026-02-01' });
      // A's private one, with B not on it: B must not see it or count it.
      await insertWorking(sql, id, A, {
        workedOn: '2026-01-01',
        visibility: 'private',
        note: 'Secret rite',
      });
      await insertWorking(sql, id, A, {
        workedOn: '2025-12-01',
        status: 'draft',
        visibility: 'private',
        note: 'Named rite',
        participants: [A, B],
      });
      await insertWorking(sql, id, B, {
        workedOn: '2025-11-01',
        status: 'draft',
        note: 'Waiting rite',
      });
      return id;
    });
    await signInAgainAs(page, B);
    await page.goto(`/coven/${coven.slug}/grimoire/${spellId}`);
    const workings = page.getByRole('list', { name: 'Workings' });
    await expect(workings.getByText('First brewing')).toBeVisible();
    await expect(workings.getByText('Named rite')).toBeVisible();
    await expect(workings.getByText('Secret rite')).toHaveCount(0);
    for (const note of ['Waiting rite', 'Named rite']) {
      await expect(
        workings
          .getByRole('listitem')
          .filter({ hasText: note })
          .getByRole('button', { name: 'Complete' }),
      ).toHaveCount(1);
    }
    await expect(workings.getByRole('button', { name: 'Complete' })).toHaveCount(2);
    await expect(workings.getByRole('listitem').filter({ hasText: 'Waiting rite' })).toContainText(
      /Completing takes nothing from the jars for \d+ ingredients?\./,
    );
    const first = workings.getByRole('listitem').filter({ hasText: 'First brewing' });
    await expect(first).toContainText('Recorded by Fixture B');
    await expect(first).toContainText('With Fixture A');
    await expect(first).not.toContainText('With Fixture B');
    const alone = workings.getByRole('listitem').filter({ hasText: '1 February 2026' });
    await expect(alone).toContainText('Recorded by Fixture A');
    await expect(alone).not.toContainText('With');
    await expect(
      first.getByRole('list', { name: 'Taken From the Jars' }).getByRole('listitem'),
    ).toContainText('Rosemary');
    await assertNoAccessibilityViolations(page);
    await page.goto(`/coven/${coven.slug}/grimoire`);
    const card = grimoireList(page).getByRole('article', { name: /Fixture Working/ });
    await expect(card.getByText('Made 2 times')).toBeVisible();
    await page.goto(`/coven/${coven.slug}/grimoire/${spellId}`);
    await expect(workings.getByRole('button', { name: /^Edit Working / })).toHaveCount(3);
    await first.getByRole('button', { name: /^Edit Working / }).click();
    const edit = page.getByRole('dialog', { name: /^Edit (a )?Working$/ });
    await edit.getByRole('textbox', { name: 'Note' }).fill('First brewing, revised');
    await edit.getByRole('button', { name: 'Save Working' }).click();
    await expect(workings.getByText('First brewing, revised')).toBeVisible();
    await page.goto(`/coven/${coven.slug}/grimoire/${spellId}`);
    const waiting = workings.getByRole('listitem').filter({ hasText: 'Waiting rite' });
    await waiting.getByRole('button', { name: /^Edit Working / }).click();
    const waitingEdit = page.getByRole('dialog', { name: /^Edit (a )?Working$/ });
    await waitingEdit.getByRole('button', { name: /^Delete Working/ }).click();
    await waitingEdit.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(waitingEdit).toHaveCount(0);
    await expect(workings.getByText('Waiting rite')).toHaveCount(0);
    await page.goto(`/coven/${coven.slug}/grimoire/${spellId}`);
    await expect(workings.getByRole('button', { name: /^Delete Working/ })).toHaveCount(0);
    await first.getByRole('button', { name: /^Edit Working / }).click();
    const firstEdit = page.getByRole('dialog', { name: /^Edit (a )?Working$/ });
    await firstEdit.getByRole('button', { name: /^Delete Working/ }).click();
    await firstEdit.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(firstEdit).toHaveCount(0);
    await expect(workings.getByText('First brewing')).toHaveCount(0);
    await expect(workings.getByRole('listitem')).toHaveCount(2);
    await page.goto(`/coven/${coven.slug}/grimoire`);
    await expect(card.getByText('Made once')).toBeVisible();
  },
);

test(
  "a member records a spell's steps in one order, each an instruction, an ingredient, or both",
  { tag: '@story-80' },
  async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Eighty', 'story-80.test', {
      A: 'owner',
      B: 'member',
    });
    await signInAgainAs(page, coven.users.B);
    await openBuilder(page, coven.slug);
    await page.getByRole('textbox', { name: 'Title' }).fill('Fixture Working');
    await page.getByRole('button', { name: 'Add Instruction' }).click();
    const steps = stepList(page).getByRole('listitem');
    await steps.first().getByRole('textbox', { name: 'Instruction' }).fill('Light the candle');
    const withIngredient = await addIngredientStep(page, 'Rosemary');
    await withIngredient.getByRole('textbox', { name: 'Instruction' }).fill('Crush it first');
    const save = page.getByRole('button', { name: 'Save' });
    await save.click();
    await expect(page).toHaveURL(/\?edit=[0-9a-f-]{36}$/);
    await expect(save).toBeDisabled();
    await page.reload();
    await page.getByRole('button', { name: 'Open All' }).click();
    await expect(steps).toHaveCount(2);
    await expect(steps.first()).toContainText('Light the candle');
    await steps.first().getByRole('button', { name: 'Edit Light the candle' }).click();
    await expect(steps.first().getByRole('textbox', { name: 'Instruction' })).toHaveValue(
      'Light the candle',
    );
    await expect(steps.last()).toContainText('Rosemary');
    await steps
      .last()
      .getByRole('button', { name: /^Edit Rosemary/ })
      .click();
    await expect(steps.last().getByRole('textbox', { name: 'Instruction' })).toHaveValue(
      'Crush it first',
    );
  },
);

test(
  'a member’s typing in the spell builder is saved without a press',
  { tag: '@story-81' },
  async ({ page }) => {
    // The offline save retries after 2, 5 and 15 seconds before it says it failed.
    test.setTimeout(90_000);
    const coven = await seedCoven(page, 'Fixture Coven Eighty-One', 'story-81.test', {
      A: 'owner',
      B: 'member',
    });
    await signInAgainAs(page, coven.users.B);
    await openBuilder(page, coven.slug);
    // The dialog is renamed to Edit Spell once the first save lands, so it is found by role alone.
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox', { name: 'Title' }).fill('Fixture Working');
    await expect(dialog.getByRole('status').filter({ hasText: /^Draft saved/ })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page).toHaveURL(/\?edit=[0-9a-f-]{36}$/);
    await dialog.getByRole('textbox', { name: 'Intent' }).fill('To see clearly');
    await expect(dialog.getByRole('button', { name: 'Save Spell' })).toBeDisabled({
      timeout: 15_000,
    });
    await page.reload();
    const reopened = page.getByRole('dialog', { name: 'Edit Spell, Fixture Working' });
    await reopened.getByRole('button', { name: 'Open All' }).click();
    await expect(reopened.getByRole('textbox', { name: 'Intent' })).toHaveValue('To see clearly');
    await reopened.getByRole('textbox', { name: 'Intent' }).fill('To see clearly, offline');
    await page.context().setOffline(true);
    await expect(reopened.getByText(/Could not save/)).toBeVisible({ timeout: 45_000 });
    await page.context().setOffline(false);
    await reopened.getByRole('button', { name: 'Retry' }).click();
    await expect(reopened.getByRole('status').filter({ hasText: /^Draft saved/ })).toBeVisible();
    await page.reload();
    await page.getByRole('button', { name: 'Open All' }).click();
    await expect(page.getByRole('textbox', { name: 'Intent' })).toHaveValue(
      'To see clearly, offline',
    );
  },
);

async function openSavedSpell(page: Page, slug: string, spellId: string, title: string) {
  await page.goto(`/coven/${slug}/grimoire?edit=${spellId}`);
  const dialog = page.getByRole('dialog', { name: `Edit Spell, ${title}` });
  await dialog.getByRole('button', { name: 'Open All' }).click();
  return dialog;
}

test(
  'two members edit one spell: the second save is refused, and Reload Latest or Keep My Version settles it',
  { tag: '@story-81' },
  async ({ page, browser, baseURL }) => {
    const coven = await seedCoven(page, 'Fixture Coven Eighty-One Shared', 'story-81-shared.test', {
      A: 'owner',
      B: 'member',
    });
    const spellId = await withSql((sql) =>
      insertSpell(sql, coven.id, 'Shared Working', 'workspace', coven.users.A),
    );
    await signInAgainAs(page, coven.users.B);
    const other = await browser.newContext({ baseURL });
    const otherPage = await other.newPage();
    await signInAgainAs(otherPage, coven.users.A);
    const first = await openSavedSpell(page, coven.slug, spellId, 'Shared Working');
    const second = await openSavedSpell(otherPage, coven.slug, spellId, 'Shared Working');
    const conflict = 'This spell was changed elsewhere.';

    await first.getByRole('textbox', { name: 'Intent' }).fill('Seen by B');
    await first.getByRole('button', { name: 'Save Spell' }).click();
    await expect(first.getByRole('button', { name: 'Save Spell' })).toBeDisabled();
    await second.getByRole('textbox', { name: 'Intent' }).fill('Seen by A');
    await second.getByRole('button', { name: 'Save Spell' }).click();
    await expect(second.getByText(conflict)).toBeVisible();
    await assertNoAccessibilityViolations(otherPage);

    await second.getByRole('button', { name: 'Reload Latest' }).click();
    await expect(second.getByRole('textbox', { name: 'Intent' })).toHaveValue('Seen by B');
    await expect(second.getByText(conflict)).toBeHidden();
    await expect(second.getByRole('button', { name: 'Save Spell' })).toBeDisabled();
    await second.getByRole('textbox', { name: 'Intent' }).fill('Seen by A, after reload');
    await second.getByRole('button', { name: 'Save Spell' }).click();
    await expect(second.getByRole('button', { name: 'Save Spell' })).toBeDisabled();

    await first.getByRole('textbox', { name: 'Intent' }).fill('Kept by B');
    await first.getByRole('button', { name: 'Save Spell' }).click();
    await expect(first.getByText(conflict)).toBeVisible();
    await first.getByRole('button', { name: 'Keep My Version' }).click();
    await expect(first.getByText(conflict)).toBeHidden();
    await expect(first.getByRole('button', { name: 'Save Spell' })).toBeDisabled();
    await page.reload();
    await page.getByRole('button', { name: 'Open All' }).click();
    await expect(page.getByRole('textbox', { name: 'Intent' })).toHaveValue('Kept by B');

    await second.getByRole('textbox', { name: 'Intent' }).fill('Seen by A, once more');
    await second.getByRole('button', { name: 'Save Spell' }).click();
    await expect(second.getByText(conflict)).toBeVisible();
    await other.close();
  },
);

test(
  "a member opens a spell's details over the grimoire list, from its card or a search pick",
  { tag: '@story-83' },
  async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Eighty-Three', 'story-83.test', {
      A: 'owner',
      B: 'member',
      C: 'viewer',
    });
    const spell = await withSql((sql) =>
      insertSpell(sql, coven.id, 'Fixture Working', 'workspace', coven.users.B, 'complete'),
    );
    const grimoire = `/coven/${coven.slug}/grimoire`;
    const look = page.getByRole('dialog', { name: 'Fixture Working' });

    await signInAgainAs(page, coven.users.B);
    await page.goto(grimoire);
    const eye = grimoireList(page).getByRole('link', { name: 'Quick Look Fixture Working' });
    await eye.click();
    await expect(look).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(look).toHaveCount(0);
    await expect(eye).toBeFocused();

    const title = page.getByRole('combobox', { name: 'Title' });
    await title.fill('fixture');
    await page.getByRole('option', { name: 'Fixture Working' }).click();
    await expect(page).toHaveURL(`${grimoire}?spell=${spell}`);
    await expect(look).toBeVisible();
    await expect(grimoireList(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(look).toHaveCount(0);
    await expect(title).toBeFocused();

    await eye.click();
    await look.getByRole('link', { name: 'Edit Fixture Working', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Edit Spell, Fixture Working' })).toBeVisible();

    await signInAgainAs(page, coven.users.C);
    await page.goto(grimoire);
    await grimoireList(page).getByRole('link', { name: 'Quick Look Fixture Working' }).click();
    await expect(look).toBeVisible();
    await expect(look.getByRole('link', { name: /^Edit / })).toHaveCount(0);
  },
);

test(
  'a member narrows the grimoire by moon phase, visibility and maker',
  { tag: '@story-84' },
  async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Eighty-Four', 'story-84.test', {
      A: 'owner',
      B: 'member',
    });
    await withSql(async (sql) => {
      const full = await insertSpell(
        sql,
        coven.id,
        'Shared Full Moon Working',
        'workspace',
        coven.users.A,
        'complete',
      );
      const waning = await insertSpell(
        sql,
        coven.id,
        'Shared Waning Working',
        'workspace',
        coven.users.B,
        'complete',
      );
      const mine = await insertSpell(
        sql,
        coven.id,
        'Private Full Moon Working',
        'private',
        coven.users.B,
        'complete',
      );
      await sql`update spells set moon_phase = 'Full Moon' where id in (${full}, ${mine})`;
      await sql`update spells set moon_phase = 'Waning Crescent' where id = ${waning}`;
    });
    await signInAgainAs(page, coven.users.B);
    await page.goto(`/coven/${coven.slug}/grimoire`);
    const items = grimoireList(page).getByRole('listitem');
    const item = (name: string) => grimoireList(page).getByRole('article', { name });
    await expect(items).toHaveCount(3);

    let panel = await openFilters(page);
    await panel.getByRole('combobox', { name: 'Moon Phases' }).fill('full');
    await page.getByRole('option', { name: /Full Moon/ }).click();
    await applyFilters(page, panel);
    await expect(items).toHaveCount(2);
    await expect(item('Shared Waning Working')).toHaveCount(0);

    panel = await openFilters(page);
    await chooseChip(panel.getByRole('group', { name: 'Visibility' }), /^Shared/);
    await applyFilters(page, panel);
    await expect(items).toHaveCount(1);
    await expect(item('Shared Full Moon Working')).toBeVisible();

    await page.goto(`/coven/${coven.slug}/grimoire`);
    panel = await openFilters(page);
    await panel.getByRole('combobox', { name: 'Coven Members' }).fill('Fixture B');
    await page.getByRole('option', { name: /^Fixture B/ }).click();
    // The box takes several members, so its menu stays open on the rest until it is shut.
    await panel.getByRole('button', { name: 'Show Coven Members suggestions' }).click();
    await applyFilters(page, panel);
    await expect(items).toHaveCount(2);
    await expect(item('Private Full Moon Working')).toBeVisible();
    await expect(item('Shared Waning Working')).toBeVisible();
  },
);

test(
  'a member duplicates a spell and lands in the builder on a private draft copy',
  { tag: '@story-82' },
  async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Eighty-Two', 'story-82.test', {
      A: 'owner',
      B: 'member',
      C: 'viewer',
    });
    const spell = await withSql((sql) =>
      insertSpell(sql, coven.id, 'Fixture Working', 'workspace', coven.users.A, 'complete'),
    );
    const recipe = `/coven/${coven.slug}/grimoire/${spell}`;

    // A viewer may not create a spell, so the recipe page offers no Duplicate.
    const dots = page.getByRole('button', { name: 'More for Fixture Working', exact: true });
    await signInAgainAs(page, coven.users.C);
    await page.goto(recipe);
    await expect(page.getByRole('heading', { level: 1, name: 'Fixture Working' })).toBeVisible();
    // The head's controls are drawn (Print stands alone), and a menu holding Duplicate would draw the dots.
    await expect(
      page.getByRole('button', { name: 'Print Fixture Working', exact: true }),
    ).toBeVisible();
    await expect(dots).toHaveCount(0);
    await expect(page.getByRole('main').getByRole('button', { name: /^Duplicate/ })).toHaveCount(0);

    await signInAgainAs(page, coven.users.B);
    await page.goto(recipe);
    await dots.click();
    await page.getByRole('menuitem', { name: 'Duplicate' }).click();
    const builder = page.getByRole('dialog', { name: 'Edit Spell, Fixture Working (Copy)' });
    await expect(builder).toBeVisible();
    await expect(page).toHaveURL(/\/grimoire\/drafts\?edit=[0-9a-f-]{36}$/);

    await page.keyboard.press('Escape');
    await expect(builder).toHaveCount(0);
    const copy = grimoireList(page)
      .getByRole('listitem')
      .filter({ hasText: 'Fixture Working (Copy)' });
    await expect(copy).toContainText('Private');
    await expect(copy).toContainText('Draft');
    await page.goto(`/coven/${coven.slug}/grimoire`);
    await expect(
      grimoireList(page).getByRole('listitem').filter({ hasText: 'Fixture Working' }),
    ).toHaveCount(1);
  },
);
