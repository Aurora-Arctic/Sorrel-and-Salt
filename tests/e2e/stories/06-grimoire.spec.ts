import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../fixtures';
import { recreateE2eDatabase } from '../database';
import { signInAgainAs } from '../session';
import { insertSpell, seedCoven, withSql } from './coven-ingredients';

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

/** Adds a step for the named ingredient through the type-ahead picker. */
async function addIngredientStep(page: Page, name: string): Promise<Locator> {
  await page.getByRole('combobox', { name: 'Search Ingredients' }).fill(name);
  await page.getByRole('option', { name }).first().click();
  return stepList(page).getByRole('listitem').filter({ hasText: name });
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
  await expect(edit.getByRole('textbox', { name: 'Intent' })).toHaveValue('To see clearly');
  await edit.getByRole('button', { name: 'Close' }).click();
  await expect(page).toHaveURL(`/coven/${coven.slug}/grimoire`);
  // A new spell is a draft, listed under the grimoire's Drafts tab (M10.11).
  await page.getByRole('link', { name: 'Drafts' }).click();
  await expect(page).toHaveURL(`/coven/${coven.slug}/grimoire/drafts`);
  await expect(grimoireList(page).getByText('Fixture Working')).toBeVisible();
});

test.fixme(
  'a member assigns categories describing what the spell is meant to do',
  {
    tag: '@story-48',
    annotation: {
      type: 'fixme',
      description: 'M10.14 builds the intent category control in the spell builder',
    },
  },
  async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Forty-Eight', 'story-48.test', {
      A: 'owner',
      B: 'member',
    });
    await signInAgainAs(page, coven.users.B);
    await openBuilder(page, coven.slug);
    await page.getByRole('textbox', { name: 'Title' }).fill('Fixture Working');
    const categories = page.getByRole('combobox', { name: 'Categories' });
    await categories.fill('Protection');
    await page.getByRole('option', { name: 'Protection' }).click();
    await expect(page.getByRole('button', { name: /Remove Protection/ })).toBeVisible();
    await page.getByRole('button', { name: 'Save' }).click();
    await page.reload();
    await expect(page.getByRole('button', { name: /Remove Protection/ })).toBeVisible();
  },
);

test.fixme(
  'a member searches and filters ingredients with the same controls as the ingredients page',
  {
    tag: '@story-49',
    annotation: {
      type: 'fixme',
      description: 'M10.15 builds the ingredient picker in the spell builder',
    },
  },
  async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Forty-Nine', 'story-49.test', {
      A: 'owner',
      B: 'member',
    });
    await signInAgainAs(page, coven.users.B);
    await openBuilder(page, coven.slug);
    const search = page.getByRole('combobox', { name: 'Search Ingredients' });
    await search.fill('Rose');
    await expect(page.getByRole('group', { name: 'Your Ingredients' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Compendium' })).toBeVisible();
    await expect(page.getByRole('option', { name: /Rosemary/ }).first()).toBeVisible();
    await search.fill('Fixture Nothing Matches');
    await expect(page.getByRole('option')).toHaveCount(0);
  },
);

test.fixme(
  'a member adds an ingredient with a quantity and a unit',
  {
    tag: '@story-50',
    annotation: {
      type: 'fixme',
      description: 'M10.15 builds add and remove ingredients in the spell builder',
    },
  },
  async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Fifty', 'story-50.test', {
      A: 'owner',
      B: 'member',
    });
    await signInAgainAs(page, coven.users.B);
    await openBuilder(page, coven.slug);
    await page.getByRole('textbox', { name: 'Title' }).fill('Fixture Working');
    const step = await addIngredientStep(page, 'Rosemary');
    await step.getByRole('spinbutton', { name: 'Quantity' }).fill('2');
    await step.getByLabel('Unit').selectOption('g');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.reload();
    const saved = stepList(page).getByRole('listitem').filter({ hasText: 'Rosemary' });
    await expect(saved.getByRole('spinbutton', { name: 'Quantity' })).toHaveValue('2');
    await expect(saved.getByLabel('Unit')).toHaveValue('g');
  },
);

test.fixme(
  'a member reorders ingredients, so the layering sequence is recorded',
  {
    tag: '@story-51',
    annotation: {
      type: 'fixme',
      description: 'M10.16 builds step reordering in the spell builder',
    },
  },
  async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Fifty-One', 'story-51.test', {
      A: 'owner',
      B: 'member',
    });
    await signInAgainAs(page, coven.users.B);
    await openBuilder(page, coven.slug);
    await page.getByRole('textbox', { name: 'Title' }).fill('Fixture Working');
    await addIngredientStep(page, 'Rosemary');
    await addIngredientStep(page, 'Sage');
    const steps = stepList(page).getByRole('listitem');
    await expect(steps.first()).toContainText('Rosemary');
    // Keyboard alone: pick the handle up, move it one place, put it down.
    await steps
      .last()
      .getByRole('button', { name: /Reorder Sage/ })
      .focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Space');
    await expect(page.getByRole('status')).toContainText('Sage');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.reload();
    await expect(steps.first()).toContainText('Sage');
    await expect(steps.last()).toContainText('Rosemary');
  },
);

test.fixme(
  'a member sees the gaps between intended and derived categories in both directions',
  {
    tag: '@story-52',
    annotation: {
      type: 'fixme',
      description: 'M10.17 builds the comparison panel in the spell builder',
    },
  },
  async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Fifty-Two', 'story-52.test', {
      A: 'owner',
      B: 'member',
    });
    await signInAgainAs(page, coven.users.B);
    await openBuilder(page, coven.slug);
    const panel = page.getByRole('complementary', { name: 'Intent Against Ingredients' });
    await page.getByRole('combobox', { name: 'Categories' }).fill('Prosperity');
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

test.fixme(
  'a member saves a spell as a draft',
  {
    tag: '@story-55',
    annotation: { type: 'fixme', description: 'M10.20 builds save as draft and mark complete' },
  },
  async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Fifty-Five', 'story-55.test', {
      A: 'owner',
      B: 'member',
    });
    await signInAgainAs(page, coven.users.B);
    await openBuilder(page, coven.slug);
    await page.getByRole('textbox', { name: 'Title' }).fill('Fixture Working');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.goto(`/coven/${coven.slug}/grimoire`);
    const card = grimoireList(page).getByRole('listitem', { name: /Fixture Working/ });
    await expect(card.getByText('Draft')).toBeVisible();
    await card.getByRole('link', { name: /Fixture Working/ }).click();
    await page.getByRole('button', { name: 'Mark Complete' }).click();
    await expect(page.getByText('Complete')).toBeVisible();
  },
);

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

test.fixme(
  'a member adds a one-off ingredient by name and form, and it goes in the jar and nowhere else',
  {
    tag: '@story-57',
    annotation: {
      type: 'fixme',
      description: 'M10.15 builds the one-off ingredient entry in the spell builder',
    },
  },
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
    await page.getByRole('button', { name: 'Save' }).click();
    // Nowhere else: the coven's ingredients page does not list it.
    await page.goto(`/coven/${coven.slug}/ingredients`);
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

test.fixme(
  'a step carries a unit the jar can be measured against',
  {
    tag: '@story-77',
    annotation: {
      type: 'fixme',
      description: 'M10.15 shows the unit rule M13.2 adds, on the builder unit field',
    },
  },
  async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Seventy-Seven', 'story-77.test', {
      A: 'owner',
      B: 'member',
    });
    await signInAgainAs(page, coven.users.B);
    await openBuilder(page, coven.slug);
    const step = await addIngredientStep(page, 'Rosemary');
    // Rosemary's jar is measured by weight, so a volume is refused with a reason.
    await step.getByLabel('Unit').selectOption('ml');
    await expect(step.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
    await step.getByLabel('Unit').selectOption('g');
    await expect(step.getByRole('alert')).toHaveCount(0);
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
