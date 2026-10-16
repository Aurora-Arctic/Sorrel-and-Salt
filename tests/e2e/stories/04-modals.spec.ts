import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../fixtures';
import { assertNoAccessibilityViolations } from '../axe';
import { recreateE2eDatabase } from '../database';
import { signInAgainAs, signInAs } from '../session';
import {
  type Coven,
  type Role,
  graphqlFromPage,
  ingredientList,
  localIngredient,
  markDocument,
  rowOf,
  seedCoven,
  stillSameDocument,
  withSql,
} from './coven-ingredients';
import {
  categoryChip,
  covenSelect,
  describedIds,
  discardQuestion,
  editIngredientControl,
  expectFieldError,
  openAddIngredient,
  openEditIngredient,
  pickCategoryIn,
  shellAddIngredient,
  shellEditControls,
} from './ingredient-dialogs';

// Stories 28–34: the add and edit dialogs of a coven's ingredient. Scaffolds:
// M8.16 builds the add dialog's coven behaviour and unskips stories 28–32;
// M8.17 builds the coven edit and unskips 33 and 34, each named in its
// annotation. M8.16 lands before the coven's list (M9.6) and the entry's
// page (M8.19), so stories 28–32 open the dialog from pages that exist now,
// the coven's home, its members page and /account, and read each save back
// in SQL. Each story writes its own coven, and its ingredients' invented
// names share no word, so the form's duplicate warning never holds a save
// meant to go through.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

/** The form's Name box, exact because "Formal Name" also contains the word. */
function nameField(dialog: Locator): Locator {
  return dialog.getByRole('textbox', { name: 'Name', exact: true });
}

function saveIngredient(dialog: Locator): Locator {
  return dialog.getByRole('button', { name: 'Save Ingredient', exact: true });
}

/**
 * The save's announcement (M8.16: "announces the save in the status region"),
 * found by the name it carries: the saved entry's own name is data, not copy.
 */
function savedStatus(page: Page, name: string): Locator {
  return page.getByRole('status').filter({ hasText: name });
}

/** Picks `kind` in the form's Classification, as tests/e2e/admin-compendium.spec.ts does. */
async function pickClassification(dialog: Locator, kind: string): Promise<void> {
  await dialog.getByRole('combobox', { name: 'Classification', exact: true }).click();
  await dialog
    .page()
    .getByRole('listbox', { name: 'Classification choices', exact: true })
    .getByRole('option', { name: kind, exact: true })
    .click();
}

/** The live rows of `name` in `covenId`, read under the raw client. */
async function savedRows(covenId: string, name: string) {
  return withSql(
    (sql) => sql<
      {
        id: string;
        nomenclature: string;
        canonical_name: string | null;
        description: string | null;
      }[]
    >`
      select id, nomenclature, canonical_name, description from ingredients
      where workspace_id = ${covenId} and name = ${name} and deleted_at is null`,
  );
}

/** Whether focus is anywhere inside `scope` now. */
async function holdsFocus(scope: Locator): Promise<boolean> {
  return scope.evaluate((element) => element.contains(document.activeElement));
}

/**
 * Makes `userId` a member of `coven` in `role`, stamped by its owner, as
 * `seedCoven` writes its own members: a user `seedCoven` made for one coven
 * joins another without signing in again under a second address.
 */
async function joinCoven(coven: Coven, userId: string, role: Role): Promise<void> {
  const owner = Object.values(coven.users)[0];
  await withSql((sql) =>
    sql.begin(async (tx) => {
      await tx`select set_config('app.current_user_id', ${owner}, true)`;
      await tx`
        insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
        values (${coven.id}, ${userId}, ${role}, ${owner}, ${owner})`;
    }),
  );
}

const CREATE = `mutation ($w: ID!, $name: String!) {
  createWorkspaceIngredient(workspaceId: $w, input: { name: $name, variants: [] }) { id }
}`;

test.fixme(
  'a member opens Add Ingredient from the shell, adding to the coven it is on',
  {
    tag: '@story-28',
    annotation: { type: 'fixme', description: 'M8.16 builds the coven add dialog' },
  },
  async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Story 28', 'story-28.test', {
      A: 'owner',
      C: 'viewer',
      B: 'member',
    });
    // Signed in as B, the last `seedCoven` made: a member of this coven alone.

    await test.step('every page showing the shell opens the dialog, and closing it returns the focus', async () => {
      for (const path of [`/coven/${coven.slug}`, `/coven/${coven.slug}/members`, '/account']) {
        await page.goto(path);
        await expect(shellAddIngredient(page)).toBeEnabled();
        const dialog = await openAddIngredient(page);
        // In one coven, so there is nothing to choose.
        await expect(covenSelect(dialog).box).toHaveCount(0);
        await expect(nameField(dialog)).toBeVisible();
        if (path === '/account') await assertNoAccessibilityViolations(page);

        // The page behind is inert while the dialog is open: walking back
        // out of it never reaches the bar's own controls.
        for (let press = 0; press < 3; press += 1) {
          await page.keyboard.press('Shift+Tab');
          expect(await holdsFocus(page.getByRole('banner'))).toBe(false);
        }

        // Untouched, so Escape closes at once, and the focus goes back to the button.
        await page.keyboard.press('Escape');
        await expect(dialog).toHaveCount(0);
        await expect(shellAddIngredient(page)).toBeFocused();
      }
    });

    await test.step("off a coven's pages, the dialog adds to the member's only coven", async () => {
      // On /account from the step before, which names no coven.
      const dialog = await openAddIngredient(page);
      await nameField(dialog).fill('Vorpelleaf');
      await saveIngredient(dialog).click();
      await expect(dialog).toHaveCount(0);
      await expect(savedStatus(page, 'Vorpelleaf')).toBeVisible();
      expect(await savedRows(coven.id, 'Vorpelleaf')).toHaveLength(1);
    });

    const second = await seedCoven(page, 'Fixture Second Coven Story 28', 'story-28-second.test', {
      G: 'owner',
    });
    const viewed = await seedCoven(page, 'Fixture Viewed Coven Story 28', 'story-28-viewed.test', {
      H: 'owner',
    });
    await joinCoven(second, coven.users.B, 'member');
    await joinCoven(viewed, coven.users.B, 'viewer');
    await signInAgainAs(page, coven.users.B);

    await test.step('in more than one coven, a Coven select is set to the current one, with a viewed coven disabled', async () => {
      await page.goto(`/coven/${second.slug}`);
      const dialog = await openAddIngredient(page);
      const select = covenSelect(dialog);
      await expect(select.box).toHaveValue('Fixture Second Coven Story 28');
      await select.box.click();
      await expect(select.choice('Fixture Coven Story 28')).toBeEnabled();
      await expect(select.choice('Fixture Second Coven Story 28')).toBeEnabled();
      await expect(select.choice('Fixture Viewed Coven Story 28')).toBeDisabled();
      await page.keyboard.press('Escape');

      await nameField(dialog).fill('Wexilroot');
      await saveIngredient(dialog).click();
      await expect(dialog).toHaveCount(0);
      expect(await savedRows(second.id, 'Wexilroot')).toHaveLength(1);
      expect(await savedRows(coven.id, 'Wexilroot')).toHaveLength(0);
    });

    await test.step('on a coven the member only views, the select is never set to it', async () => {
      // B reads the viewed coven: the page is theirs to see, not to write to.
      expect((await page.goto(`/coven/${viewed.slug}`))?.status()).toBe(200);
      const dialog = await openAddIngredient(page);
      await expect(covenSelect(dialog).box).not.toHaveValue('Fixture Viewed Coven Story 28');
      await page.keyboard.press('Escape');
    });

    await test.step('a viewer who can write to no coven has no Add Ingredient, and a create sent straight is refused', async () => {
      await signInAgainAs(page, coven.users.C);
      // C reads the coven and its shell: what is missing is the button alone.
      expect((await page.goto(`/coven/${coven.slug}`))?.status()).toBe(200);
      await expect(page.getByRole('banner')).toBeVisible();
      await expect(shellAddIngredient(page)).toHaveCount(0);

      const answer = await graphqlFromPage(page, CREATE, { w: coven.id, name: 'Quorrelbud' });
      expect(answer.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
      expect(await savedRows(coven.id, 'Quorrelbud')).toHaveLength(0);
    });

    await test.step("an admin in no coven has none off the admin pages, and on them it opens the compendium's", async () => {
      await signInAs(page, 'e@story-28-admin.test', ['discord'], 'admin');
      await page.goto('/account');
      await expect(page.getByRole('banner')).toBeVisible();
      await expect(shellAddIngredient(page)).toHaveCount(0);

      await page.goto('/admin/categories');
      await shellAddIngredient(page).click();
      await expect(page).toHaveURL(/\/admin\/compendium\?new(?:[=&]|$)/);
      await expect(page.getByRole('dialog', { name: 'Add Ingredient' })).toBeVisible();
    });
  },
);

test.fixme(
  'a member saves a name-only stub, and Save & Add Another keeps the dialog for the next',
  {
    tag: '@story-29',
    annotation: { type: 'fixme', description: 'M8.16 builds the coven add dialog' },
  },
  async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Story 29', 'story-29.test', {
      A: 'owner',
      B: 'member',
    });

    await test.step('a name alone saves, closing the dialog without asking', async () => {
      await page.goto(`/coven/${coven.slug}`);
      const dialog = await openAddIngredient(page);
      await nameField(dialog).fill('Zyxbloom');
      await saveIngredient(dialog).click();
      await expect(dialog).toHaveCount(0);
      await expect(savedStatus(page, 'Zyxbloom')).toBeVisible();

      const [row] = await savedRows(coven.id, 'Zyxbloom');
      expect(row).toMatchObject({ nomenclature: 'none', canonical_name: null, description: null });
      const [held] = await withSql(
        (sql) => sql<{ variants: number; categories: number }[]>`
          select
            (select count(*)::int from ingredient_variants where ingredient_id = ${row.id}) as variants,
            (select count(*)::int from ingredient_categories where ingredient_id = ${row.id}) as categories`,
      );
      expect(held).toEqual({ variants: 0, categories: 0 });
    });

    await test.step('Save & Add Another saves, clears the form and puts the focus on Name', async () => {
      const dialog = await openAddIngredient(page);
      await nameField(dialog).fill('Qelmthorn');
      await dialog.getByRole('button', { name: 'Save & Add Another', exact: true }).click();
      await expect(savedStatus(page, 'Qelmthorn')).toBeVisible();
      await expect(dialog).toBeVisible();
      await expect(nameField(dialog)).toHaveValue('');
      await expect(nameField(dialog)).toBeFocused();
      expect(await savedRows(coven.id, 'Qelmthorn')).toHaveLength(1);

      // Cleared, so nothing is left to lose: Escape closes without asking.
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
    });
  },
);

test.fixme(
  'a member files a new ingredient under categories through the picker',
  {
    tag: '@story-30',
    annotation: { type: 'fixme', description: 'M8.16 builds the coven add dialog' },
  },
  async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Story 30', 'story-30.test', {
      A: 'owner',
      B: 'member',
    });

    await page.goto(`/coven/${coven.slug}`);
    const dialog = await openAddIngredient(page);
    await nameField(dialog).fill('Plimsbark');

    await test.step('each pick shows as a chip, and its × takes it out', async () => {
      for (const category of ['Protection', 'Love', 'Prosperity']) {
        await pickCategoryIn(dialog, category);
        await expect(categoryChip(dialog, category)).toBeVisible();
      }
      await categoryChip(dialog, 'Love').click();
      await expect(categoryChip(dialog, 'Love')).toHaveCount(0);
      await expect(categoryChip(dialog, 'Protection')).toBeVisible();
      await expect(categoryChip(dialog, 'Prosperity')).toBeVisible();
      await assertNoAccessibilityViolations(page);
    });

    await test.step('the save files the ingredient under the picks left', async () => {
      await saveIngredient(dialog).click();
      await expect(dialog).toHaveCount(0);
      const [row] = await savedRows(coven.id, 'Plimsbark');
      const filed = await withSql(
        (sql) => sql<{ name: string }[]>`
          select c.name from ingredient_categories ic
          join categories c on c.id = ic.category_id
          where ic.ingredient_id = ${row.id} and ic.variant_id is null
          order by c.name`,
      );
      expect(filed.map(({ name }) => name)).toEqual(['Prosperity', 'Protection']);
    });
  },
);

test.fixme(
  'errors show beside their fields on leaving one and on submit',
  {
    tag: '@story-31',
    annotation: { type: 'fixme', description: 'M8.16 builds the coven add dialog' },
  },
  async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Story 31', 'story-31.test', {
      A: 'owner',
      B: 'member',
    });
    await page.goto(`/coven/${coven.slug}`);

    await test.step('leaving Name empty marks it, linking its error, and filling it clears the mark', async () => {
      const dialog = await openAddIngredient(page);
      const name = nameField(dialog);
      // What Name describes while valid, so the error is what the mark adds.
      await expect(name).not.toHaveAttribute('aria-invalid', 'true');
      const valid = await describedIds(name);

      await name.fill('D');
      await name.fill('');
      await page.keyboard.press('Tab');
      await expectFieldError(name, valid);

      await name.fill('Dorvenmoss');
      await page.keyboard.press('Tab');
      await expect(name).not.toHaveAttribute('aria-invalid', 'true');

      await dialog.getByRole('button', { name: 'Close', exact: true }).click();
      await discardQuestion(dialog).discard.click();
      await expect(dialog).toHaveCount(0);
    });

    await test.step('a submit with fields missing marks each, focuses the first and saves nothing', async () => {
      const dialog = await openAddIngredient(page);
      const name = nameField(dialog);
      const formal = dialog.getByRole('textbox', { name: 'Formal Name', exact: true });
      const validName = await describedIds(name);
      // A botanical entry needs a formal name (§5), so both are missing.
      await dialog
        .getByRole('textbox', { name: 'Description', exact: true })
        .fill('Grows by fixture light.');
      await pickClassification(dialog, 'Botanical');
      const validFormal = await describedIds(formal);

      await saveIngredient(dialog).click();
      await expectFieldError(name, validName);
      await expectFieldError(formal, validFormal);
      await expect(name).toBeFocused();
      await expect(dialog).toBeVisible();
      const described = await withSql(
        (sql) => sql`
          select id from ingredients
          where workspace_id = ${coven.id} and description = 'Grows by fixture light.'`,
      );
      expect(described).toHaveLength(0);

      await name.fill('Dorvenmoss');
      await formal.fill('Dorvena fixtura');
      await saveIngredient(dialog).click();
      await expect(dialog).toHaveCount(0);
      const [row] = await savedRows(coven.id, 'Dorvenmoss');
      expect(row).toMatchObject({ nomenclature: 'botanical', canonical_name: 'Dorvena fixtura' });
    });
  },
);

test.fixme(
  'closing with unsaved input asks before discarding it',
  {
    tag: '@story-32',
    annotation: { type: 'fixme', description: 'M8.16 builds the coven add dialog' },
  },
  async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Story 32', 'story-32.test', {
      A: 'owner',
      B: 'member',
    });
    await page.goto(`/coven/${coven.slug}`);
    const dialog = await openAddIngredient(page);
    const name = nameField(dialog);
    const question = discardQuestion(dialog);
    const close = dialog.getByRole('button', { name: 'Close', exact: true });
    await name.fill('Halvenseed');

    await test.step('Escape asks, and Keep Editing goes back to the field with its input', async () => {
      await page.keyboard.press('Escape');
      await expect(question.discard).toBeVisible();
      await expect(question.keep).toBeFocused();
      await question.keep.click();
      await expect(question.keep).toHaveCount(0);
      await expect(name).toBeFocused();
      await expect(name).toHaveValue('Halvenseed');
    });

    await test.step('the Close button asks the same question', async () => {
      await close.click();
      await expect(question.keep).toBeFocused();
      await question.keep.click();
      await expect(close).toBeFocused();
      await expect(name).toHaveValue('Halvenseed');
    });

    await test.step('a click outside asks too, and Discard Changes closes, saving nothing', async () => {
      // Over the backdrop, beside the dialog, as tests/e2e/admin-compendium.spec.ts clicks it.
      await page.mouse.click(8, 300);
      await expect(question.discard).toBeVisible();
      await question.discard.click();
      await expect(dialog).toHaveCount(0);
      await expect(shellAddIngredient(page)).toBeFocused();
      expect(await savedRows(coven.id, 'Halvenseed')).toHaveLength(0);
    });

    await test.step('the discarded input is gone, so the next close asks nothing', async () => {
      const reopened = await openAddIngredient(page);
      await expect(nameField(reopened)).toHaveValue('');
      await page.keyboard.press('Escape');
      await expect(reopened).toHaveCount(0);
    });
  },
);

/** The fixture's Testwort as the edit stories seed it: a coven's own entry with something in each field read back. */
const TESTWORT = {
  description: 'A fixture root kept for the edit stories.',
  folkNames: ['Fixture Root'],
  categories: ['Protection'],
};

/** A coven with a member, B, signed in, and a viewer, holding the fixture's Testwort. */
async function covenWithTestwort(page: Page, story: number) {
  const coven = await seedCoven(page, `Fixture Coven Story ${story}`, `story-${story}.test`, {
    A: 'owner',
    C: 'viewer',
    B: 'member',
  });
  const { ingredientId } = await withSql((sql) =>
    localIngredient(sql, coven.id, coven.users.A, TESTWORT),
  );
  return { coven, ingredientId };
}

async function ingredientRow(ingredientId: string) {
  const [row] = await withSql(
    (sql) => sql<{ name: string; description: string | null }[]>`
      select name, description from ingredients where id = ${ingredientId}`,
  );
  return row;
}

const UPDATE = `mutation ($id: ID!, $w: ID!, $input: IngredientUpdateInput!) {
  updateIngredient(id: $id, workspaceId: $w, input: $input) { id }
}`;

/** A whole update, as `IngredientUpdateInput` takes one: every field sent, empty but the name. */
const REFUSED_UPDATE = {
  name: 'Fixture Refusedwort',
  canonicalName: '',
  nomenclature: 'none',
  description: '',
  safetyNotes: '',
  toxic: false,
  categoryIds: [],
  celestialBodies: [],
  colors: [],
  deities: [],
  elements: [],
  folkNames: [],
  references: [],
  substitutes: [],
  variants: [],
  zodiacSigns: [],
};

test.fixme(
  "a member opens an entry's edit pre-filled, from its row and its page, never the shell",
  {
    tag: '@story-33',
    annotation: {
      type: 'fixme',
      description: "M8.17 builds the coven edit, after M9.6's list and M8.19's entry page",
    },
  },
  async ({ page }) => {
    const { coven, ingredientId } = await covenWithTestwort(page, 33);
    const elsewhere = await seedCoven(page, 'Fixture Other Coven Story 33', 'story-33-other.test', {
      D: 'owner',
    });
    await signInAgainAs(page, coven.users.B);

    await test.step("the row's Edit opens the form pre-filled, and the shell offers none", async () => {
      await page.goto(`/coven/${coven.slug}/ingredients`);
      const row = rowOf(ingredientList(page), 'Testwort', 'Fixtura testalis');
      await expect(row).toBeVisible();
      await expect(shellEditControls(page)).toHaveCount(0);

      const dialog = await openEditIngredient(page, row, 'Testwort', 'Fixtura testalis');
      await expect(nameField(dialog)).toHaveValue('Testwort');
      await expect(dialog.getByRole('textbox', { name: 'Formal Name', exact: true })).toHaveValue(
        'Fixtura testalis',
      );
      // The select-only box is no input: what it shows of its choice is its text (claude-docs/components/combobox.md).
      await expect(
        dialog.getByRole('combobox', { name: 'Classification', exact: true }),
      ).toHaveText('Botanical');
      await expect(dialog.getByRole('textbox', { name: 'Description', exact: true })).toHaveValue(
        TESTWORT.description,
      );
      await expect(
        dialog
          .getByRole('group', { name: 'Folk Names', exact: true })
          .getByRole('button', { name: 'Remove Fixture Root', exact: true }),
      ).toBeVisible();
      await expect(categoryChip(dialog, 'Protection')).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Edit Root', exact: true })).toBeVisible();
      await assertNoAccessibilityViolations(page);

      // Unchanged, so Escape closes at once, and the focus goes back to the row's Edit.
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      await expect(editIngredientControl(row, 'Testwort', 'Fixtura testalis')).toBeFocused();
    });

    await test.step('a change asks before it is discarded, and discarding saves nothing', async () => {
      const row = rowOf(ingredientList(page), 'Testwort', 'Fixtura testalis');
      const dialog = await openEditIngredient(page, row, 'Testwort', 'Fixtura testalis');
      await dialog
        .getByRole('textbox', { name: 'Description', exact: true })
        .fill('Changed, then dropped.');
      await page.keyboard.press('Escape');
      await expect(discardQuestion(dialog).keep).toBeFocused();
      await discardQuestion(dialog).discard.click();
      await expect(dialog).toHaveCount(0);
      expect(await ingredientRow(ingredientId)).toEqual({
        name: 'Testwort',
        description: TESTWORT.description,
      });
    });

    await test.step("the entry's page has its own Edit, opening the same form", async () => {
      expect((await page.goto(`/coven/${coven.slug}/ingredients/${ingredientId}`))?.status()).toBe(
        200,
      );
      await expect(shellEditControls(page)).toHaveCount(0);
      const dialog = await openEditIngredient(
        page,
        page.getByRole('main'),
        'Testwort',
        'Fixtura testalis',
      );
      await expect(nameField(dialog)).toHaveValue('Testwort');
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
    });

    await test.step('a viewer reads the entry with no Edit, and an update sent straight is refused', async () => {
      await signInAgainAs(page, coven.users.C);
      await page.goto(`/coven/${coven.slug}/ingredients`);
      const row = rowOf(ingredientList(page), 'Testwort', 'Fixtura testalis');
      // C reads the row: what is missing is its Edit alone.
      await expect(row).toBeVisible();
      await expect(editIngredientControl(row, 'Testwort', 'Fixtura testalis')).toHaveCount(0);
      await page.goto(`/coven/${coven.slug}/ingredients/${ingredientId}`);
      await expect(page.getByRole('heading', { level: 1, name: 'Testwort' })).toBeVisible();
      await expect(
        editIngredientControl(page.getByRole('main'), 'Testwort', 'Fixtura testalis'),
      ).toHaveCount(0);

      const answer = await graphqlFromPage(page, UPDATE, {
        id: ingredientId,
        w: coven.id,
        input: REFUSED_UPDATE,
      });
      expect(answer.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
      expect((await ingredientRow(ingredientId)).name).toBe('Testwort');
    });

    await test.step("another coven's member is refused by direct id, under either coven", async () => {
      await signInAgainAs(page, elsewhere.users.D);
      // D writes to their own coven, so a refusal is the coven's, not the role's.
      expect((await page.goto(`/coven/${elsewhere.slug}`))?.status()).toBe(200);
      const underTheirs = await graphqlFromPage(page, UPDATE, {
        id: ingredientId,
        w: coven.id,
        input: REFUSED_UPDATE,
      });
      expect(underTheirs.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
      const underOwn = await graphqlFromPage(page, UPDATE, {
        id: ingredientId,
        w: elsewhere.id,
        input: REFUSED_UPDATE,
      });
      expect(underOwn.errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
      expect((await ingredientRow(ingredientId)).name).toBe('Testwort');
    });
  },
);

test.fixme(
  "a saved edit shows in the list and on the entry's page without a reload",
  {
    tag: '@story-34',
    annotation: {
      type: 'fixme',
      description: "M8.17 builds the coven edit, after M9.6's list and M8.19's entry page",
    },
  },
  async ({ page }) => {
    const { coven, ingredientId } = await covenWithTestwort(page, 34);
    const list = ingredientList(page);

    await test.step('a save from the row shows in the list at once', async () => {
      await page.goto(`/coven/${coven.slug}/ingredients`);
      await markDocument(page);
      const row = rowOf(list, 'Testwort', 'Fixtura testalis');
      const dialog = await openEditIngredient(page, row, 'Testwort', 'Fixtura testalis');
      await nameField(dialog).fill('Fixture Mendwort');
      await dialog
        .getByRole('textbox', { name: 'Description', exact: true })
        .fill('Mended by fixture hands.');
      await saveIngredient(dialog).click();
      // Closed, as M8.16's coven save closes it; the admin edit stays open,
      // so M8.17 confirms which a coven's edit does.
      await expect(dialog).toHaveCount(0);

      await expect(rowOf(list, 'Fixture Mendwort', 'Fixtura testalis')).toBeVisible();
      await expect(rowOf(list, 'Testwort')).toHaveCount(0);
      expect(await stillSameDocument(page)).toBe(true);
      expect(await ingredientRow(ingredientId)).toEqual({
        name: 'Fixture Mendwort',
        description: 'Mended by fixture hands.',
      });

      const reopened = await openEditIngredient(
        page,
        rowOf(list, 'Fixture Mendwort', 'Fixtura testalis'),
        'Fixture Mendwort',
        'Fixtura testalis',
      );
      await expect(nameField(reopened)).toHaveValue('Fixture Mendwort');
      await expect(reopened.getByRole('textbox', { name: 'Description', exact: true })).toHaveValue(
        'Mended by fixture hands.',
      );
      await page.keyboard.press('Escape');
      await expect(reopened).toHaveCount(0);
    });

    await test.step("a save from the entry's page shows on the page, then in the list", async () => {
      await page.goto(`/coven/${coven.slug}/ingredients/${ingredientId}`);
      await markDocument(page);
      const dialog = await openEditIngredient(
        page,
        page.getByRole('main'),
        'Fixture Mendwort',
        'Fixtura testalis',
      );
      await nameField(dialog).fill('Fixture Wardwort');
      await saveIngredient(dialog).click();
      await expect(dialog).toHaveCount(0);
      await expect(page.getByRole('heading', { level: 1, name: 'Fixture Wardwort' })).toBeVisible();
      expect(await stillSameDocument(page)).toBe(true);

      await page.goto(`/coven/${coven.slug}/ingredients`);
      await expect(rowOf(list, 'Fixture Wardwort', 'Fixtura testalis')).toBeVisible();
      await expect(rowOf(list, 'Fixture Mendwort')).toHaveCount(0);
    });
  },
);
