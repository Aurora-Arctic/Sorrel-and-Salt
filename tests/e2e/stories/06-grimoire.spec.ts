import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../fixtures';
import { recreateE2eDatabase } from '../database';
import { signInAgainAs } from '../session';
import {
  compendiumVariant,
  insertSpell,
  insertStock,
  seedCoven,
  withSql,
} from './coven-ingredients';
import { categoryChip, pickCategoryIn } from './ingredient-dialogs';

// Stories 47 to 57 and 76 to 80: the grimoire, from naming a spell to the
// workings recorded against it. Every story here is a scaffold: the page it
// walks is not built yet, and the task named in its annotation turns its
// `fixme` into `test` and makes it pass. Each body is the flow as the finished
// page will allow it, so the page task edits locators rather than inventing a
// flow. Stories 76 to 80 are not in DESIGN.md §10 until M13.1, M13.2 and
// M13.4 add them, so the reporter prints "Not a v1 story" for them meanwhile.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

/**
 * The spell builder (M10.12), reached as a member reaches it: from the Grimoire, through the
 * New Spell at its heading, which only a role that may create a spell is shown. It opens as a
 * dialog over the grimoire under `?new=spell-<slug>`, and the dialog is what it returns.
 */
async function openBuilder(page: Page, slug: string): Promise<Locator> {
  await page.goto(`/coven/${slug}/grimoire`);
  await page.getByRole('link', { name: 'New Spell' }).click();
  await expect(page).toHaveURL(`/coven/${slug}/grimoire?new=spell-${slug}`);
  const dialog = page.getByRole('dialog', { name: 'New Spell' });
  await expect(dialog).toBeVisible();
  return dialog;
}

/** The builder's one ordered list of steps (M10.15, M10.16, M13.3). */
function stepList(page: Page): Locator {
  return page.getByRole('list', { name: 'Steps' });
}

/** The grimoire's list of spells (M10.11), named after its page. */
function grimoireList(page: Page): Locator {
  return page.getByRole('list', { name: 'Grimoire' });
}

/**
 * Adds a step through the type-ahead picker, which offers one row per form,
 * "Rosemary (Herb)", and returns the step's row in the list.
 */
async function addIngredientStep(page: Page, name: string): Promise<Locator> {
  await page.getByRole('combobox', { name: 'Search Ingredients' }).fill(name);
  await page.getByRole('option', { name }).first().click();
  return stepList(page).getByRole('listitem').filter({ hasText: name });
}

/** Chooses a step's unit: the Unit field is a combobox of the unit codes. */
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
  // Saved: nothing left to save, and the address now names the saved draft, so a reload or
  // Back opens it rather than an empty form.
  await expect(save).toBeDisabled();
  await expect(save).not.toHaveAttribute('aria-busy', 'true');
  await expect(page).toHaveURL(new RegExp(`/coven/${coven.slug}/grimoire\\?edit=[0-9a-f-]{36}$`));
  const draft = page.url();
  // Close saves what is unsaved before it closes, and asks nothing.
  await builder.getByRole('textbox', { name: 'Intent' }).fill('To see clearly');
  await builder.getByRole('button', { name: 'Close' }).click();
  await expect(page).toHaveURL(`/coven/${coven.slug}/grimoire`);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goto(draft);
  const edit = page.getByRole('dialog', { name: 'Edit Spell, Fixture Working' });
  // A saved spell opens its sections shut, each line naming what it holds.
  await edit.getByRole('button', { name: 'Open All' }).click();
  await expect(edit.getByRole('textbox', { name: 'Intent' })).toHaveValue('To see clearly');
  await edit.getByRole('button', { name: 'Close' }).click();
  await expect(page).toHaveURL(`/coven/${coven.slug}/grimoire`);
  // A new spell is a draft, listed under the grimoire's Drafts tab (M10.11).
  await page.getByRole('link', { name: 'Drafts' }).click();
  await expect(page).toHaveURL(`/coven/${coven.slug}/grimoire/drafts`);
  await expect(grimoireList(page).getByText('Fixture Working')).toBeVisible();
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
    // A pick's × takes it out again before the save.
    await categoryChip(builder, 'Cleansing').click();
    await expect(categoryChip(builder, 'Cleansing')).toHaveCount(0);
    await save.click();
    await expect(save).toBeDisabled();
    await expect(save).not.toHaveAttribute('aria-busy', 'true');
    // Saved: the spell's card in the grimoire's Drafts carries the category assigned, and only it.
    await builder.getByRole('button', { name: 'Close' }).click();
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
    // The coven holds Rosemary, so it is offered under Your Ingredients.
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
    const search = page.getByRole('combobox', { name: 'Search Ingredients' });
    await search.fill('Rose');
    const yours = page.getByRole('group', { name: 'Your Ingredients' });
    await expect(yours.getByRole('option', { name: /Rosemary \(Herb\)/ })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Compendium' })).toBeVisible();
    await search.fill('Fixture Nothing Matches');
    await expect(page.getByRole('option')).toHaveCount(0);
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
    // Saved: nothing left to save.
    await expect(save).toBeDisabled();
    await expect(save).not.toHaveAttribute('aria-busy', 'true');
    // The builder has no page to reopen a saved spell on until M13.10, so the
    // step is read where the save left it.
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
    await addIngredientStep(page, 'Rosemary (Herb)');
    await addIngredientStep(page, 'Mugwort (Herb)');
    const steps = stepList(page).getByRole('listitem');
    await expect(steps.first()).toContainText('Rosemary');
    // Keyboard alone: pick the handle up, move it one place, put it down.
    const handle = page.getByRole('button', { name: 'Move Mugwort (Herb)' });
    await handle.focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowUp');
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
    // The builder has no page to reopen a saved spell on until M13.10, so the
    // order is read where the save left it: position and layer_order together.
    const rows = await withSql(
      (sql) => sql<{ name: string; position: number; layer_order: number }[]>`
        select i.name, st.position, st.layer_order from spell_steps st
        join spells s on s.id = st.spell_id
        join ingredients i on i.id = st.ingredient_id
        where s.workspace_id = ${coven.id} and s.title = 'Fixture Working'
          and st.deleted_at is null
        order by st.position`,
    );
    expect(rows).toEqual([
      { name: 'Mugwort', position: 1, layer_order: 1 },
      { name: 'Rosemary', position: 2, layer_order: 2 },
    ]);
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
    const panel = page.getByRole('complementary', { name: 'Intent Against Ingredients' });
    await page
      .getByRole('group', { name: 'Categories', exact: true })
      .getByRole('combobox')
      .fill('Prosperity');
    await page.getByRole('option', { name: 'Prosperity' }).click();
    await expect(panel.getByRole('list', { name: 'Intended, Not Carried' })).toContainText(
      'Prosperity',
    );
    await addIngredientStep(page, 'Mugwort');
    await expect(panel.getByRole('list', { name: 'Carried, Not Intended' })).toContainText(
      'Psychic Work',
    );
    await page.getByRole('button', { name: /Remove Mugwort/ }).click();
    await expect(panel.getByRole('list', { name: 'Carried, Not Intended' })).toHaveCount(0);
  },
);

test.fixme(
  'a member is warned when an ingredient is flagged toxic or unsafe to burn',
  {
    tag: '@story-53',
    annotation: {
      type: 'fixme',
      description: 'M10.18 builds the safety warning in the spell builder',
    },
  },
  async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Fifty-Three', 'story-53.test', {
      A: 'owner',
      B: 'member',
    });
    await signInAgainAs(page, coven.users.B);
    await openBuilder(page, coven.slug);
    const step = await addIngredientStep(page, 'Belladonna');
    await expect(step.getByRole('img', { name: /Toxic/ })).toBeVisible();
    // The warning does not block the addition: the step stays and can be saved.
    await page.getByRole('textbox', { name: 'Title' }).fill('Fixture Working');
    await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled();
  },
);

test.fixme(
  'a member sees when they are adding something the coven has none of',
  {
    tag: '@story-54',
    annotation: {
      type: 'fixme',
      description: 'M10.19 builds the out-of-stock indicator in the spell builder',
    },
  },
  async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Fifty-Four', 'story-54.test', {
      A: 'owner',
      B: 'member',
    });
    await signInAgainAs(page, coven.users.B);
    await openBuilder(page, coven.slug);
    // Rosemary is in the compendium and not in this coven's cupboard.
    const step = await addIngredientStep(page, 'Rosemary');
    await expect(step.getByText('Out of Stock')).toBeVisible();
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
  // It lists as a draft.
  await page.goto(`/coven/${coven.slug}/grimoire/drafts`);
  const card = grimoireList(page).getByRole('listitem', { name: /Fixture Working/ });
  await expect(card.getByText('Draft')).toBeVisible();
  // Marking it complete is explicit, and reversible.
  await page.goto(draft);
  const edit = page.getByRole('dialog', { name: 'Edit Spell, Fixture Working' });
  await edit.getByRole('button', { name: 'Open All' }).click();
  await edit.getByRole('button', { name: 'Mark Complete' }).click();
  await expect(edit.getByRole('button', { name: 'Reopen as Draft' })).toBeVisible();
  await edit.getByRole('button', { name: 'Reopen as Draft' }).click();
  await expect(edit.getByRole('button', { name: 'Mark Complete' })).toBeVisible();
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
      // Complete, so both list on the Spells tab, the grimoire's own address.
      await insertSpell(sql, coven.id, 'Shared Working', 'workspace', A, 'complete');
      await insertSpell(sql, coven.id, 'Private Working', 'private', A, 'complete');
    });
    const path = `/coven/${coven.slug}/grimoire`;
    // Why the private spell's absence is the rule's: its author sees it.
    await signInAgainAs(page, A);
    await page.goto(path);
    await expect(grimoireList(page).getByRole('listitem')).toHaveCount(2);
    // Its author is told it is theirs alone, in a word, not a colour (M10.13).
    const item = (name: string) => grimoireList(page).getByRole('listitem', { name });
    await expect(item('Private Working').getByText('Private', { exact: true })).toBeVisible();
    await expect(item('Shared Working').getByText('Private', { exact: true })).toHaveCount(0);
    for (const reader of [B, C]) {
      await signInAgainAs(page, reader);
      await page.goto(path);
      await expect(grimoireList(page).getByRole('listitem')).toHaveCount(1);
      await expect(grimoireList(page).getByText('Shared Working')).toBeVisible();
      await expect(grimoireList(page).getByText('Private Working')).toHaveCount(0);
    }
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
    await page.getByRole('textbox', { name: 'One-Off Name' }).fill('Testwort');
    await page.getByRole('textbox', { name: 'One-Off Form' }).fill('Dried Root');
    await page.getByRole('button', { name: 'Add One-Off Ingredient' }).click();
    await expect(
      stepList(page).getByRole('listitem').filter({ hasText: 'Testwort' }),
    ).toBeVisible();
    const save = page.getByRole('button', { name: 'Save' });
    await save.click();
    await expect(save).toBeDisabled();
    await expect(save).not.toHaveAttribute('aria-busy', 'true');
    // Nowhere else: the coven's ingredients page does not list it.
    await page.goto(`/coven/${coven.slug}/ingredients`);
    await expect(page.getByRole('heading', { name: 'Ingredients', level: 1 })).toBeVisible();
    await expect(page.getByText('Testwort')).toHaveCount(0);
  },
);

test.fixme(
  'a member records that the coven made a spell, when and with whom',
  {
    tag: '@story-76',
    annotation: {
      type: 'fixme',
      description: 'M13.7 builds Record a Working on /coven/[slug]/grimoire/[id]',
    },
  },
  async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Seventy-Six', 'story-76.test', {
      A: 'owner',
      B: 'member',
    });
    const spellId = await withSql((sql) =>
      insertSpell(sql, coven.id, 'Fixture Working', 'workspace', coven.users.B),
    );
    await signInAgainAs(page, coven.users.B);
    await page.goto(`/coven/${coven.slug}/grimoire/${spellId}`);
    const record = page.getByRole('button', { name: 'Record a Working' });
    await record.click();
    const dialog = page.getByRole('dialog', { name: 'Record a Working' });
    await dialog.getByRole('combobox', { name: 'Participants' }).fill('Fixture A');
    await page.getByRole('option', { name: 'Fixture A' }).click();
    await dialog.getByRole('button', { name: 'Save' }).click();
    const workings = page.getByRole('list', { name: 'Workings' });
    await expect(workings.getByRole('listitem')).toHaveCount(1);
    await expect(workings.getByRole('listitem').first()).toContainText('Fixture A');
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
    // The coven's jar of Rosemary is kept by weight.
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
    // A volume is refused with a reason, and nothing can be saved.
    await pickUnit(step, 'ml');
    await expect(unit).toHaveAttribute('aria-invalid', 'true');
    await expect(unit).toHaveAccessibleDescription(/measured in/);
    await expect(save).toBeDisabled();
    // A weight is accepted, and the spell can be saved.
    await pickUnit(step, 'g');
    await expect(unit).not.toHaveAttribute('aria-invalid', 'true');
    await expect(save).toBeEnabled();
  },
);

test.fixme(
  'completing a working takes what it used out of the coven stock',
  {
    tag: '@story-78',
    annotation: {
      type: 'fixme',
      description: 'M13.7 builds the completion preview and Complete on the recipe page',
    },
  },
  async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Seventy-Eight', 'story-78.test', {
      A: 'owner',
      B: 'member',
    });
    const spellId = await withSql((sql) =>
      insertSpell(sql, coven.id, 'Fixture Working', 'workspace', coven.users.B),
    );
    await signInAgainAs(page, coven.users.B);
    await page.goto(`/coven/${coven.slug}/grimoire/${spellId}`);
    await page.getByRole('button', { name: 'Record a Working' }).click();
    const dialog = page.getByRole('dialog', { name: 'Record a Working' });
    await dialog.getByRole('button', { name: 'Complete' }).click();
    // The preview says what will be taken before anything is.
    await expect(dialog.getByRole('list', { name: 'Deductions' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Confirm' }).click();
    await page.goto(`/coven/${coven.slug}/ingredients`);
    await expect(page.getByRole('spinbutton', { name: 'Quantity' }).first()).toHaveValue('18');
  },
);

test.fixme(
  "a member sees a spell's workings on its recipe page and how many times it has been made on its card",
  {
    tag: '@story-79',
    annotation: {
      type: 'fixme',
      description: 'M13.8 builds the Workings section and the count on the grimoire card',
    },
  },
  async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Seventy-Nine', 'story-79.test', {
      A: 'owner',
      B: 'member',
    });
    const spellId = await withSql((sql) =>
      insertSpell(sql, coven.id, 'Fixture Working', 'workspace', coven.users.B),
    );
    await signInAgainAs(page, coven.users.B);
    await page.goto(`/coven/${coven.slug}/grimoire/${spellId}`);
    await expect(page.getByRole('list', { name: 'Workings' }).getByRole('listitem')).toHaveCount(2);
    await page.goto(`/coven/${coven.slug}/grimoire`);
    const card = grimoireList(page).getByRole('listitem', { name: /Fixture Working/ });
    await expect(card.getByText('Made 2 Times')).toBeVisible();
  },
);

test.fixme(
  "a member records a spell's steps in one order, each an instruction, an ingredient, or both",
  {
    tag: '@story-80',
    annotation: { type: 'fixme', description: 'M13.3 builds step text in the spell builder' },
  },
  async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Eighty', 'story-80.test', {
      A: 'owner',
      B: 'member',
    });
    await signInAgainAs(page, coven.users.B);
    await openBuilder(page, coven.slug);
    await page.getByRole('textbox', { name: 'Title' }).fill('Fixture Working');
    await page.getByRole('button', { name: 'Add a Step' }).click();
    const steps = stepList(page).getByRole('listitem');
    await steps.first().getByRole('textbox', { name: 'Instruction' }).fill('Light the candle');
    const withIngredient = await addIngredientStep(page, 'Rosemary');
    await withIngredient.getByRole('textbox', { name: 'Instruction' }).fill('Crush it first');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.reload();
    // A saved spell opens with its sections shut (M10.12).
    await page.getByRole('button', { name: 'Open All' }).click();
    await expect(steps).toHaveCount(2);
    await expect(steps.first().getByRole('textbox', { name: 'Instruction' })).toHaveValue(
      'Light the candle',
    );
    await expect(steps.last()).toContainText('Rosemary');
    await expect(steps.last().getByRole('textbox', { name: 'Instruction' })).toHaveValue(
      'Crush it first',
    );
  },
);
