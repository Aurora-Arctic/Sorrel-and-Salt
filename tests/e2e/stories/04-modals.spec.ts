import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../fixtures';
import { assertNoAccessibilityViolations } from '../axe';
import { recreateE2eDatabase } from '../database';
import { insertIngredient } from '../../support/db/insert-ingredient';
import { makeIngredient } from '../../support/fixtures/ingredient';
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
  describedIds,
  destinationMenu,
  discardQuestion,
  editIngredientControl,
  expectFieldError,
  openAddIngredient,
  openEditIngredient,
  openEditIngredientFromMenu,
  pickCategoryIn,
  shellAddIngredient,
  shellEditControls,
} from './ingredient-dialogs';

// Stories 28–34: the add and edit dialogs of a coven's ingredient. Stories 28–32 open the
// dialog from the coven's home, its members page and /account, and read each save back
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
 * The save's announcement ("announces the save in the status region"),
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

// Story 28's covens: B writes to the first two and only views the third.
const FIRST = 'Fixture Coven Story 28';
const SECOND = 'Fixture Second Coven Story 28';
const VIEWED = 'Fixture Viewed Coven Story 28';

/**
 * An add dialog's accessible name for `coven`: the whole phrase, "Add
 * Ingredient to <coven>". The coven's name is data, so it is escaped.
 */
function namesCoven(coven: string): RegExp {
  return new RegExp(`^Add Ingredient to ${coven.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
}

test(
  'a member opens Add Ingredient from the shell, adding to the coven it is on',
  {
    tag: '@story-28',
  },
  async ({ page }) => {
    const coven = await seedCoven(page, FIRST, 'story-28.test', {
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
        // Opened by the address, so a reload keeps it and Back leaves it.
        await expect(page).toHaveURL(new RegExp(`\\?new=ingredient-coven-${coven.slug}$`));
        // In one coven, so there is nothing to choose: no chevron, and the
        // dialog names the coven it adds to.
        await expect(destinationMenu(page).toggle).toHaveCount(0);
        await expect(dialog).toHaveAccessibleName(namesCoven(FIRST));
        await expect(nameField(dialog)).toBeVisible();
        if (path === '/account') await assertNoAccessibilityViolations(page);

        // The page behind is inert while the dialog is open: walking back
        // past the dialog's first control never reaches the bar's own. The
        // dialog is drawn inside the bar, beside its button, so the bar's
        // controls are what the banner holds outside the dialog.
        for (let press = 0; press < 8; press += 1) {
          await page.keyboard.press('Shift+Tab');
          const onBar = (await holdsFocus(page.getByRole('banner'))) && !(await holdsFocus(dialog));
          expect(onBar).toBe(false);
        }

        // Untouched, so Escape closes at once, and the focus goes back to the button.
        // From Cancel, which has no tip: the walk above can end on an ⓘ, whose tip
        // opens on focus and takes the first Escape for itself (info-tip.md).
        await dialog.getByRole('button', { name: 'Cancel' }).focus();
        await page.keyboard.press('Escape');
        await expect(dialog).toHaveCount(0);
        await expect(page).not.toHaveURL(/[?&]new/);
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

    const second = await seedCoven(page, SECOND, 'story-28-second.test', {
      G: 'owner',
    });
    const viewed = await seedCoven(page, VIEWED, 'story-28-viewed.test', {
      H: 'owner',
    });
    await joinCoven(second, coven.users.B, 'member');
    await joinCoven(viewed, coven.users.B, 'viewer');
    await signInAgainAs(page, coven.users.B);

    await test.step('in more than one coven, the chevron lists the covens written to and a choice opens its dialog', async () => {
      await page.goto(`/coven/${coven.slug}`);
      const destinations = destinationMenu(page);
      await destinations.toggle.click();
      await expect(destinations.toggle).toHaveAttribute('aria-expanded', 'true');
      // The covens B writes to, in order; the one B only views is not a destination.
      await expect(destinations.choices).toHaveText([`to ${FIRST}`, `to ${SECOND}`]);
      await expect(destinations.choice(`to ${VIEWED}`)).toHaveCount(0);

      // On the first coven's page, choosing the second adds to the second.
      await destinations.choice(`to ${SECOND}`).click();
      await expect(destinations.menu).toHaveCount(0);
      const dialog = page.getByRole('dialog', { name: 'Add Ingredient' });
      await expect(dialog).toBeVisible();
      await expect(dialog).toHaveAccessibleName(namesCoven(SECOND));

      await nameField(dialog).fill('Wexilroot');
      await saveIngredient(dialog).click();
      await expect(dialog).toHaveCount(0);
      expect(await savedRows(second.id, 'Wexilroot')).toHaveLength(1);
      expect(await savedRows(coven.id, 'Wexilroot')).toHaveLength(0);
    });

    await test.step('the main part adds to the coven the address names, and never to one the member only views', async () => {
      await page.goto(`/coven/${second.slug}`);
      let dialog = await openAddIngredient(page);
      await expect(dialog).toHaveAccessibleName(namesCoven(SECOND));
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);

      // B reads the viewed coven: the page is theirs to see, not to write to.
      expect((await page.goto(`/coven/${viewed.slug}`))?.status()).toBe(200);
      dialog = await openAddIngredient(page);
      await expect(dialog).not.toHaveAccessibleName(namesCoven(VIEWED));
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

    await test.step("an admin in no coven has the compendium alone, on every page, and it opens the compendium's dialog", async () => {
      await signInAs(page, 'e@story-28-admin.test', ['discord'], 'admin');
      for (const path of ['/account', '/admin/categories']) {
        await page.goto(path);
        // One destination, so a plain button with nothing to choose.
        await expect(destinationMenu(page).toggle).toHaveCount(0);
        await shellAddIngredient(page).click();
        await expect(page).toHaveURL(/\/admin\/compendium\?new(?:[=&]|$)/);
        await expect(page.getByRole('dialog', { name: 'Add Ingredient' })).toBeVisible();
      }
    });
  },
);

test(
  'a member saves a name-only stub, and Save & Add Another keeps the dialog for the next',
  {
    tag: '@story-29',
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

    // A name the compendium already bears is a question, not a copy.
    await test.step("a name the compendium bears asks first: Create Anyway saves the coven's own, its + puts the entry in the cupboard and turns into its Quick Look, the form left open", async () => {
      await withSql(async (sql) => {
        for (const name of ['Ostrelvine', 'Kaelmoss']) {
          await insertIngredient(
            sql,
            makeIngredient(
              name === 'Kaelmoss'
                ? { name, canonicalName: 'Kaelmossia testalis', nomenclature: 'botanical' }
                : { name, nomenclature: 'none' },
            ),
            coven.users.A,
          );
        }
      });
      await page.goto(`/coven/${coven.slug}`);
      let dialog = await openAddIngredient(page);
      await nameField(dialog).fill('Ostrelvine');
      await saveIngredient(dialog).click();

      const own = dialog.getByRole('button', { name: 'Create Anyway', exact: true });
      await expect(own).toBeVisible();
      await expect(
        dialog.getByRole('button', { name: /^Add to My Ingredients: Ostrelvine/ }),
      ).toBeVisible();
      // The save waits on the question: nothing was written.
      expect(await savedRows(coven.id, 'Ostrelvine')).toHaveLength(0);
      await assertNoAccessibilityViolations(page);

      await own.click();
      await saveIngredient(dialog).click();
      await expect(dialog).toHaveCount(0);
      expect(await savedRows(coven.id, 'Ostrelvine')).toHaveLength(1);

      dialog = await openAddIngredient(page);
      await nameField(dialog).fill('Kaelmossia testalis');
      await saveIngredient(dialog).click();
      // The Create Anyway save above left the page on Ostrelvine's own; the + must not move it.
      const before = page.url();
      await dialog.getByRole('button', { name: /^Add to My Ingredients: Kaelmoss/ }).click();

      // The + shows the check, then turns into the eye, and the row moves under In This
      // Coven; the form stays open with what was typed, and the page is not left.
      await expect(
        dialog
          .getByRole('list', { name: 'In This Coven' })
          .getByRole('button', { name: /^Quick Look Kaelmoss/ }),
      ).toBeVisible();
      await expect(dialog).toBeVisible();
      await expect(nameField(dialog)).toHaveValue('Kaelmossia testalis');
      expect(page.url()).toBe(before);
      const [held] = await withSql(
        (sql) => sql<{ label: string | null; jars: number; copies: number }[]>`
          select e.label,
            (select count(*)::int from inventory_items where workspace_id = ${coven.id}
              and ingredient_id = e.ingredient_id) as jars,
            (select count(*)::int from ingredients where workspace_id = ${coven.id}
              and lower(name) = 'kaelmossia testalis' and deleted_at is null) as copies
          from workspace_compendium_entries e
          join ingredients i on i.id = e.ingredient_id
          where e.workspace_id = ${coven.id} and i.name = 'Kaelmoss' and e.deleted_at is null`,
      );
      // The + sends no label: the name typed asked a question, it did not relabel the entry.
      expect(held).toEqual({ label: null, jars: 0, copies: 0 });
    });
  },
);

test(
  'a member files a new ingredient under categories through the picker',
  {
    tag: '@story-30',
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

test(
  'errors show beside their fields on leaving one and on submit',
  {
    tag: '@story-31',
  },
  async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Story 31', 'story-31.test', {
      A: 'owner',
      B: 'member',
    });
    await page.goto(`/coven/${coven.slug}`);

    await test.step('leaving Name blank once edited marks it, linking its error, and filling it clears the mark', async () => {
      const dialog = await openAddIngredient(page);
      const name = nameField(dialog);
      // What Name describes while valid, so the error is what the mark adds.
      await expect(name).not.toHaveAttribute('aria-invalid', 'true');
      const valid = await describedIds(name);

      // Left untouched, Name stays quiet: an error shows only once the field
      // is both edited and left, or the form submitted.
      await name.focus();
      await page.keyboard.press('Tab');
      await expect(name).not.toHaveAttribute('aria-invalid', 'true');

      // Edited to a blank, which the schema trims to nothing, and left.
      await name.fill('   ');
      await page.keyboard.press('Tab');
      await expectFieldError(name, valid);

      await name.fill('Dorvenmoss');
      await page.keyboard.press('Tab');
      await expect(name).not.toHaveAttribute('aria-invalid', 'true');

      await dialog.getByRole('button', { name: 'Close', exact: true }).click();
      await discardQuestion(dialog).discard.click();
      await expect(dialog).toHaveCount(0);
    });

    await test.step('pressing another control while Name is blank still reaches it, the error drawn once the button is up', async () => {
      const dialog = await openAddIngredient(page);
      const name = nameField(dialog);
      await name.fill('   ');

      // The press leaves Name; were its error drawn at once, the controls
      // below would slide down before the button came up and the click would
      // miss Classification.
      await dialog.getByRole('combobox', { name: 'Classification', exact: true }).click();
      await expect(
        page.getByRole('listbox', { name: 'Classification choices', exact: true }),
      ).toBeVisible();
      await expect(name).toHaveAttribute('aria-invalid', 'true');

      await page.keyboard.press('Escape');
      await dialog.getByRole('button', { name: 'Close', exact: true }).click();
      await discardQuestion(dialog).discard.click();
      await expect(dialog).toHaveCount(0);
    });

    await test.step('a submit with a field missing marks it and focuses it, saving nothing, until each is filled', async () => {
      const dialog = await openAddIngredient(page);
      const name = nameField(dialog);
      const formal = dialog.getByRole('textbox', { name: 'Formal Name', exact: true });
      const validName = await describedIds(name);
      // A botanical entry needs a formal name (§5), so both are missing. The
      // schema checks the formal name only once every field passes on its
      // own, so a submit marks the name first, and the formal name the next.
      await dialog
        .getByRole('textbox', { name: 'Description', exact: true })
        .fill('Grows by fixture light.');
      await pickClassification(dialog, 'Botanical');
      const validFormal = await describedIds(formal);

      await saveIngredient(dialog).click();
      await expectFieldError(name, validName);
      await expect(name).toBeFocused();
      await expect(dialog).toBeVisible();

      await name.fill('Dorvenmoss');
      await saveIngredient(dialog).click();
      await expect(name).not.toHaveAttribute('aria-invalid', 'true');
      await expectFieldError(formal, validFormal);
      await expect(formal).toBeFocused();
      await expect(dialog).toBeVisible();
      const described = await withSql(
        (sql) => sql`
          select id from ingredients
          where workspace_id = ${coven.id} and description = 'Grows by fixture light.'`,
      );
      expect(described).toHaveLength(0);

      await formal.fill('Dorvena fixtura');
      await saveIngredient(dialog).click();
      await expect(dialog).toHaveCount(0);
      const [row] = await savedRows(coven.id, 'Dorvenmoss');
      expect(row).toMatchObject({ nomenclature: 'botanical', canonical_name: 'Dorvena fixtura' });
    });
  },
);

test(
  'closing with unsaved input asks before discarding it',
  {
    tag: '@story-32',
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
      // Its ring drawn too: after a pointer press the browser drew none for a
      // scripted focus, so the focus was there and could not be seen.
      await expect(question.keep).toHaveCSS('outline-style', 'solid');
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

    // Leaving the page: a reload raises the browser's own question,
    // whose wording is the browser's, and a link in the site asks the form's.
    await test.step('a reload with unsaved input raises the browser’s question', async () => {
      const reopened = await openAddIngredient(page);
      await nameField(reopened).fill('Halvenseed');
      const asked = page.waitForEvent('dialog').then(async (raised) => {
        const kind = raised.type();
        await raised.accept();
        return kind;
      });
      await page.reload();
      expect(await asked).toBe('beforeunload');
      expect(await savedRows(coven.id, 'Halvenseed')).toHaveLength(0);
    });

    await test.step('a link away from a page form with a typed name asks Discard or Keep Editing', async () => {
      await withSql((sql) =>
        sql.begin(async (tx) => {
          // A grant made by hand declares its route, as accounts-setup.ts's does:
          // the privilege trigger refuses an undeclared change to the right.
          await tx`select set_config('app.privilege_route', 'manual', true)`;
          await tx`update users set can_create_workspace = true where id = ${coven.users.B}`;
        }),
      );
      await page.goto('/coven/new');
      const covenName = page.getByRole('textbox', { name: 'Name' });
      await covenName.fill('Fixture Unmade Coven Story 32');
      const away = page
        .getByRole('navigation', { name: 'Site' })
        .getByRole('link', { name: 'Compendium' });
      const discard = page.getByRole('button', { name: 'Discard Changes' });
      const keep = page.getByRole('button', { name: 'Keep Editing' });

      await away.click();
      // Its own dialog over the page, not a card in the page's form.
      await expect(page.getByRole('dialog', { name: 'Discard Changes?' })).toBeVisible();
      await expect(keep).toBeFocused();
      await keep.click();
      await expect(keep).toHaveCount(0);
      await expect(page).toHaveURL(/\/coven\/new$/);
      await expect(covenName).toHaveValue('Fixture Unmade Coven Story 32');

      await away.click();
      await discard.click();
      await expect(page).toHaveURL(/\/compendium$/);
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

test(
  "a member opens an entry's edit pre-filled, from its row and its page, never the shell",
  { tag: '@story-33' },
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
      const dialog = await openEditIngredientFromMenu(page, 'Testwort', 'Fixtura testalis');
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
      // The page's Edit is an icon of its own, which a viewer is not drawn.
      await expect(
        page.getByRole('main').getByRole('link', { name: 'Edit Testwort', exact: true }),
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

test(
  "a saved edit shows in the list and on the entry's page without a reload",
  { tag: '@story-34' },
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
      // Closed: a coven's save closes its dialog, where the admin edit stays open.
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
      const dialog = await openEditIngredientFromMenu(page, 'Fixture Mendwort', 'Fixtura testalis');
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
