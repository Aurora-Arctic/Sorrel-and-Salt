import type { Locator, Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations, assertNoSidewaysScroll } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAs, signInAgainAs } from './session';
import { makeIngredient } from '../support/fixtures/ingredient';
import { insertIngredient } from '../support/db/insert-ingredient';
import { ingredientSlug } from '@/lib/slugify';
import {
  ingredientList,
  localIngredient,
  rowOf,
  seedCoven,
  withSql,
} from './stories/coven-ingredients';
import { discardQuestion, editIngredientDialog } from './stories/ingredient-dialogs';

// M12.5: an entry's details in a modal over its list, opened by the Quick Look
// eye, left of the name on the admin Compendium list and at the card's foot on
// a coven's Ingredients and the public compendium (claude-docs/components/ingredient-entry.md, "The details modal"). This
// proves what no story walks: the eye opens the details and every close gives
// it the focus back, the name itself still reaches the entry's page, Edit
// opens the edit modal over the details and closes back to them, a coven's
// Edit is an owner's and a member's and not a viewer's, a save there shows in
// the details and the list, an unsaved close asks first, and the open details
// pass axe and hold at a phone's width. On the public compendium a visitor with no
// account opens them too, and reads the entry's sections there.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

const NAME = 'Fixture Lookwort';
const FORMAL = 'Fixtura spectata';
const ENTRY = `${NAME}, ${FORMAL}`;

/** The Quick Look eye, named by its verb and the entry. */
const quickLook = (scope: Locator | Page, entry = ENTRY) =>
  scope.getByRole('link', { name: `Quick Look ${entry}`, exact: true });

/** The details modal, named by its eyebrow and the entry. */
const detailsDialog = (page: Page, entry = ENTRY) =>
  page.getByRole('dialog', { name: `Ingredient, ${entry}`, exact: true });

const editIn = (dialog: Locator) => dialog.getByRole('link', { name: 'Edit', exact: true });

test.describe('on the admin Compendium list', () => {
  const slug = ingredientSlug(NAME, FORMAL);
  const listPath = `/admin/compendium?query=${encodeURIComponent(NAME)}`;

  test.beforeEach(async ({ page }, testInfo) => {
    // One admin per test, as an address names one user.
    const email = `admin-${testInfo.testId}@details-modal.test`;
    const { userId } = await signInAs(page, email, ['discord'], 'admin');
    await withSql(async (sql) => {
      const [held] =
        await sql`select 1 from ingredients where name = ${NAME} and workspace_id is null`;
      if (!held)
        await insertIngredient(sql, makeIngredient({ name: NAME, canonicalName: FORMAL }), userId);
    });
  });

  test('Quick Look opens the details, and Escape and Close give the eye its focus back', async ({
    page,
  }) => {
    await page.goto(listPath);
    const eye = quickLook(page);
    const details = detailsDialog(page);
    // Why it could open: the eye links to the list with the entry's details asked for.
    await expect(eye).toHaveAttribute('href', new RegExp(`entry=${slug}`));

    await eye.click();
    await expect(details).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`[?&]entry=${slug}`));
    await expect(details.getByRole('link', { name: 'Open Full Page' })).toHaveAttribute(
      'href',
      `/compendium/ingredients/${slug}`,
    );
    await assertNoAccessibilityViolations(page);

    await page.keyboard.press('Escape');
    await expect(details).toHaveCount(0);
    await expect(page).not.toHaveURL(/entry=/);
    await expect(eye).toBeFocused();

    await eye.click();
    await expect(details).toBeVisible();
    await details.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(details).toHaveCount(0);
    await expect(eye).toBeFocused();
  });

  test("the name itself still opens the entry's page", async ({ page }) => {
    await page.goto(listPath);

    await page.getByRole('link', { name: NAME, exact: true }).click();

    await expect(page).toHaveURL(new RegExp(`/compendium/ingredients/${slug}$`));
    await expect(detailsDialog(page)).toHaveCount(0);
  });

  test('Edit opens the edit modal over the details, and closing it goes back to them', async ({
    page,
  }) => {
    await page.goto(`${listPath}&entry=${slug}`);
    const details = detailsDialog(page);
    await expect(details).toBeVisible();

    await editIn(details).click();
    const editing = editIngredientDialog(page, NAME, FORMAL);
    await expect(editing).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`entry=${slug}&edit=${slug}`));

    await editing.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(editing).toHaveCount(0);
    await expect(details).toBeVisible();
    await expect(page).not.toHaveURL(/edit=/);
    await expect(editIn(details)).toBeFocused();
  });
});

test.describe("on a coven's Ingredients", () => {
  test("Edit is an owner's and a member's, not a viewer's; a save shows in the details and the list, and an unsaved close asks first", async ({
    page,
  }) => {
    const coven = await seedCoven(page, 'Fixture Coven Details Modal', 'details-modal.test', {
      A: 'owner',
      B: 'member',
      C: 'viewer',
    });
    await withSql((sql) =>
      localIngredient(sql, coven.id, coven.users.A, { name: NAME, canonicalName: FORMAL }),
    );
    const listPath = `/coven/${coven.slug}/ingredients`;
    const details = detailsDialog(page);

    await test.step('a viewer reads the details, with no Edit', async () => {
      await signInAgainAs(page, coven.users.C);
      await page.goto(listPath);
      await quickLook(page).click();
      // Why Edit could be there: the details are open, with their other action.
      await expect(details.getByRole('link', { name: 'Open Full Page' })).toBeVisible();
      await expect(editIn(details)).toHaveCount(0);
    });

    for (const key of ['B', 'A'] as const) {
      await test.step(`${key === 'A' ? 'the owner' : 'a member'} gets Edit in the details`, async () => {
        await signInAgainAs(page, coven.users[key]);
        await page.goto(listPath);
        await quickLook(page).click();
        await expect(editIn(details)).toBeVisible();
      });
    }

    const RENAMED = 'Fixture Seenwort';
    const renamedDetails = detailsDialog(page, `${RENAMED}, ${FORMAL}`);
    await test.step('a save goes back to the details, renamed there and on the list', async () => {
      await editIn(details).click();
      const editing = editIngredientDialog(page, NAME, FORMAL);
      await expect(editing).toBeVisible();
      await editing.getByRole('button', { name: 'Open All' }).click();
      await editing.getByRole('textbox', { name: 'Name', exact: true }).fill(RENAMED);
      await editing.getByRole('button', { name: 'Save Ingredient', exact: true }).click();

      await expect(editing).toHaveCount(0);
      await expect(renamedDetails).toBeVisible();
      await expect(rowOf(ingredientList(page), RENAMED)).toHaveCount(1);
      await expect(rowOf(ingredientList(page), NAME)).toHaveCount(0);
    });

    await test.step('closing an edit with a change asks before discarding it', async () => {
      await editIn(renamedDetails).click();
      const editing = editIngredientDialog(page, RENAMED, FORMAL);
      await expect(editing).toBeVisible();
      await editing.getByRole('button', { name: 'Open All' }).click();
      await editing.getByRole('textbox', { name: 'Name', exact: true }).fill('Fixture Unsavedwort');

      await editing.getByRole('button', { name: 'Close', exact: true }).click();
      const question = discardQuestion(editing);
      await expect(question.keep).toBeFocused();
      await question.discard.click();

      await expect(editing).toHaveCount(0);
      await expect(renamedDetails).toBeVisible();
      await expect(rowOf(ingredientList(page), RENAMED)).toHaveCount(1);
    });
  });

  test('the open details pass axe and hold at a phone width', async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Details Phone', 'details-phone.test', {
      A: 'owner',
    });
    await withSql((sql) =>
      localIngredient(sql, coven.id, coven.users.A, { name: NAME, canonicalName: FORMAL }),
    );
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(`/coven/${coven.slug}/ingredients`);

    await quickLook(page).click();
    const details = detailsDialog(page);
    await expect(details).toBeVisible();
    await expect(editIn(details)).toBeVisible();

    await assertNoAccessibilityViolations(page);
    await assertNoSidewaysScroll(page);
  });
});

test.describe('on the public compendium', () => {
  const PUBLIC_NAME = 'Fixture Peerwort';
  const PUBLIC_FORMAL = 'Fixtura publica';
  const PUBLIC_ENTRY = `${PUBLIC_NAME}, ${PUBLIC_FORMAL}`;

  test("a visitor with no account opens Quick Look and reads the entry's sections", async ({
    page,
  }, testInfo) => {
    // An admin stamps the seeded entry, then signs out: the rest is a visitor's.
    const { userId } = await signInAs(
      page,
      `admin-${testInfo.testId}@details-public.test`,
      ['discord'],
      'admin',
    );
    await withSql((sql) =>
      insertIngredient(
        sql,
        makeIngredient({
          name: PUBLIC_NAME,
          canonicalName: PUBLIC_FORMAL,
          safetyNotes: 'Fixture public caution.',
          folkNames: ['Fixture Peerbane'],
          elements: ['fire'],
        }),
        userId,
      ),
    );
    // The session rides a header or a cookie (holdSession); both go.
    await page.context().setExtraHTTPHeaders({});
    await page.context().clearCookies();
    await page.goto(`/compendium?query=${encodeURIComponent(PUBLIC_NAME)}`);
    // Why it is a visitor's: the header offers Sign In.
    await expect(page.getByRole('banner').getByRole('link', { name: 'Sign In' })).toBeVisible();

    const eye = quickLook(page, PUBLIC_ENTRY);
    await eye.click();
    const details = detailsDialog(page, PUBLIC_ENTRY);
    await expect(details).toBeVisible();
    await expect(page).toHaveURL(/[?&]entry=/);

    await expect(
      details.getByRole('region', { name: 'Caution' }).getByText('Fixture public caution.'),
    ).toBeVisible();
    await expect(
      details.getByRole('list', { name: 'Folk Names' }).getByText('Fixture Peerbane'),
    ).toBeVisible();
    await expect(details.getByRole('heading', { name: 'Correspondences' })).toBeVisible();
    // An empty block or row is left out here, where the page says "None recorded".
    await expect(details.getByRole('heading', { name: 'Categories' })).toHaveCount(0);
    await expect(details.getByText('None recorded')).toHaveCount(0);
    await expect(details.getByRole('link', { name: 'Open Full Page' })).toHaveAttribute(
      'href',
      `/compendium/ingredients/${ingredientSlug(PUBLIC_NAME, PUBLIC_FORMAL)}`,
    );
    await expect(editIn(details)).toHaveCount(0);
    await assertNoAccessibilityViolations(page);

    await page.keyboard.press('Escape');
    await expect(details).toHaveCount(0);
    await expect(page).not.toHaveURL(/entry=/);
    await expect(eye).toBeFocused();
  });
});
