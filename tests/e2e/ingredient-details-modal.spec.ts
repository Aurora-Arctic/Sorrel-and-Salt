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
// it the focus back, the details show the entry's sections on every list, the name itself still reaches the entry's page, Edit
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

/** The details' Edit: the cards' pencil, named for the entry it edits. */
const editIn = (dialog: Locator, name = NAME) =>
  dialog.getByRole('link', { name: `Edit ${name}`, exact: true });

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
        await insertIngredient(
          sql,
          makeIngredient({
            name: NAME,
            canonicalName: FORMAL,
            safetyNotes: 'Fixture admin caution.',
          }),
          userId,
        );
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
    // The entry's sections, read with the curator's session.
    await expect(
      details.getByRole('region', { name: 'Caution' }).getByText('Fixture admin caution.'),
    ).toBeVisible();
    await expect(details.getByRole('link', { name: 'View Page' })).toHaveAttribute(
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

  /** Seeds a compendium entry with a long description, and opens its details over the admin list. */
  const openLongEntry = async (page: Page): Promise<Locator> => {
    const longName = 'Fixture Longwort';
    const sentence =
      'Fixture Longwort is a fictional herb of the fixture hedgerows, gathered in the dark of the moon and dried in bundles under the eaves.';
    await withSql(async (sql) => {
      const [held] =
        await sql`select 1 from ingredients where name = ${longName} and workspace_id is null`;
      const [admin] = await sql`select id from users order by created_at desc limit 1`;
      if (!held)
        await insertIngredient(
          sql,
          makeIngredient({
            name: longName,
            canonicalName: 'Fixtura longa',
            description: Array.from({ length: 12 }, () => sentence).join('\n\n'),
          }),
          String(admin?.id),
        );
    });
    await page.goto(`/admin/compendium?query=${encodeURIComponent(longName)}`);
    await quickLook(page, `${longName}, Fixtura longa`).click();
    return detailsDialog(page, `${longName}, Fixtura longa`);
  };

  test('a long description is cut behind a full-width Show More bar, which opens it whole and closes it again', async ({
    page,
  }) => {
    const details = await openLongEntry(page);
    const bar = details.getByRole('button', { name: 'Show More' });
    const paragraph = details.locator(`#${(await bar.getAttribute('aria-controls')) ?? ''}`);

    // Why it could be cut: the whole text is longer than the six lines it shows.
    await expect(bar).toHaveAttribute('aria-expanded', 'false');
    const closed = (await paragraph.evaluate((p) => p.parentElement?.clientHeight)) ?? 0;
    const whole = await paragraph.evaluate((p) => p.scrollHeight);
    expect(whole).toBeGreaterThan(closed);
    // The bar is the full width of the text, so the whole of it is the target.
    const barBox = await bar.boundingBox();
    const textBox = await paragraph.boundingBox();
    expect(Math.round(barBox?.width ?? 0)).toBe(Math.round(textBox?.width ?? -1));

    // Six lines are showing, not five: the clip is six line heights tall.
    const lineHeight = await paragraph.evaluate((p) => parseFloat(getComputedStyle(p).lineHeight));
    expect(Math.round(closed / lineHeight)).toBe(6);
    const gapClosed =
      (barBox?.y ?? 0) -
      (await details
        .locator('.ingredient-summary__description-clip')
        .evaluate((c) => c.getBoundingClientRect().bottom));

    // Pointed at, the label is not underlined and the chevron grows in the label's own colour.
    await bar.hover();
    const chevron = bar.locator('svg');
    await expect.poll(() => chevron.evaluate((c) => getComputedStyle(c).scale)).toBe('1.25');
    expect(await bar.evaluate((b) => getComputedStyle(b).textDecorationLine)).toBe('none');
    expect(await chevron.evaluate((c) => getComputedStyle(c).color)).toBe(
      await bar.evaluate((b) => getComputedStyle(b).color),
    );

    await bar.click();
    const less = details.getByRole('button', { name: 'Show Less' });
    await expect(less).toHaveAttribute('aria-expanded', 'true');
    await expect(less).toBeFocused();
    // Open, the whole text is in view: the clip has grown to hold it.
    await expect
      .poll(() => paragraph.evaluate((p) => p.parentElement?.clientHeight ?? 0))
      .toBeGreaterThanOrEqual(whole);

    // Open, the bar stands further from the text than it did under the fade.
    await expect
      .poll(
        async () =>
          ((await less.boundingBox())?.y ?? 0) -
          (await paragraph.evaluate((p) => p.getBoundingClientRect().bottom)),
      )
      .toBeGreaterThan(gapClosed + 4);

    await less.click();
    await expect(details.getByRole('button', { name: 'Show More' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await expect
      .poll(() => paragraph.evaluate((p) => p.parentElement?.clientHeight ?? 0))
      .toBeLessThan(whole);
  });

  test('a short entry fits its window: the body overflows on neither axis, and the bar still runs edge to edge', async ({
    page,
  }) => {
    await page.goto(`${listPath}&entry=${slug}`);
    const details = detailsDialog(page);
    const body = details.locator('.modal-dialog__body');
    // Why it could overflow: the foot bar is in the body, with the margins that take it to the edges.
    const bar = details.locator('.ingredient-details-foot');
    await expect(bar).toBeVisible();
    // Why it is short: the one caution, nothing near the window's height.
    const room = await body.evaluate((b) => b.clientHeight);
    expect(room).toBeLessThan((page.viewportSize()?.height ?? 0) / 2);
    const overflow = () =>
      body.evaluate((b) => ({
        y: b.scrollHeight - b.clientHeight,
        x: b.scrollWidth - b.clientWidth,
      }));
    await expect.poll(overflow).toEqual({ y: 0, x: 0 });
    // Edge to edge: the bar is as wide as the dialog.
    const dialogBox = await details.boundingBox();
    const barBox = await bar.boundingBox();
    expect(Math.abs((barBox?.width ?? 0) - (dialogBox?.width ?? 1))).toBeLessThan(2);
  });

  test('a description that fits the window once opened leaves the body with nothing to scroll, during the opening and after, with the scrollbars drawn', async ({
    page,
  }) => {
    // Chromium's headless mode hides scrollbars; draw them, so one would take its width from the text.
    const session = await page.context().newCDPSession(page);
    await session.send('Emulation.setScrollbarsHidden', { hidden: false });
    await page.setViewportSize({ width: 1280, height: 1000 });
    const midName = 'Fixture Midwort';
    const midFormal = 'Fixtura media';
    const sentence =
      'Fixture Midwort is a fictional herb of the fixture hedgerows, gathered in the dark of the moon and dried in bundles under the eaves.';
    await withSql(async (sql) => {
      const [held] =
        await sql`select 1 from ingredients where name = ${midName} and workspace_id is null`;
      const [admin] = await sql`select id from users order by created_at desc limit 1`;
      if (!held)
        await insertIngredient(
          sql,
          makeIngredient({
            name: midName,
            canonicalName: midFormal,
            description: Array.from({ length: 3 }, () => sentence).join(' '),
          }),
          String(admin?.id),
        );
    });
    await page.goto(`/admin/compendium?query=${encodeURIComponent(midName)}`);
    await quickLook(page, `${midName}, ${midFormal}`).click();
    const details = detailsDialog(page, `${midName}, ${midFormal}`);
    const body = details.locator('.modal-dialog__body');
    const overflow = () =>
      body.evaluate((b) => ({
        y: b.scrollHeight - b.clientHeight,
        x: b.scrollWidth - b.clientWidth,
        gutter: b.getBoundingClientRect().width - b.clientWidth,
      }));

    // Why it could scroll: the description is cut, and opening it adds height to the body.
    const bar = details.getByRole('button', { name: 'Show More' });
    await expect(bar).toBeVisible();
    const closedHeight = await body.evaluate((b) => b.clientHeight);
    // Why it should not: opened, the whole window is still taller than the body asks for.
    await bar.click();
    const samples: { y: number; x: number; gutter: number }[] = [];
    for (let i = 0; i < 16; i++) {
      samples.push(await overflow());
      await page.waitForTimeout(50);
    }
    await expect
      .poll(() => body.evaluate((b) => b.clientHeight))
      .toBeGreaterThan(closedHeight + 20);
    expect(await body.evaluate((b) => b.clientHeight)).toBeLessThan(
      (page.viewportSize()?.height ?? 0) - 120,
    );
    samples.push(await overflow());
    expect(samples.every((s) => s.y === 0 && s.x === 0 && s.gutter === 0)).toBe(true);
  });

  test('View Page is a centred button in a bar fixed to the foot of the window, with the text scrolling under it', async ({
    page,
  }) => {
    const details = await openLongEntry(page);
    const open = details.getByRole('link', { name: 'View Page' });
    const body = details.locator('.modal-dialog__body');
    const bottomOf = async (el: Locator) =>
      (await el.evaluate((node) => node.getBoundingClientRect().bottom)) ?? 0;

    // Why it could scroll: opened whole, the long text is taller than the window the body shows.
    await details.getByRole('button', { name: 'Show More' }).click();
    await expect
      .poll(() => body.evaluate((b) => b.scrollHeight - b.clientHeight))
      .toBeGreaterThan(100);
    const dialogBottom = await bottomOf(details);
    const barAtTop = await bottomOf(open);
    expect(barAtTop).toBeLessThanOrEqual(dialogBottom + 1);
    // The button stands in the middle of the dialog (its width, two thirds of the bar, is the style's).
    const box = await open.boundingBox();
    const bodyBox = await body.boundingBox();
    const centre = (box?.x ?? 0) + (box?.width ?? 0) / 2;
    expect(Math.abs(centre - ((bodyBox?.x ?? 0) + (bodyBox?.width ?? 0) / 2))).toBeLessThan(2);

    // Scrolled to the end, the bar has not moved and the last text stands clear above it.
    await body.evaluate((b) => b.scrollTo(0, b.scrollHeight));
    expect(Math.abs((await bottomOf(open)) - barAtTop)).toBeLessThan(2);
    const lastText = details.locator('.ingredient-summary > *:last-child');
    const barTop = (await open.boundingBox())?.y ?? 0;
    expect((await lastText.boundingBox())?.y ?? 0).toBeLessThan(barTop);
    expect(await bottomOf(lastText)).toBeLessThanOrEqual(barTop);

    // It still goes to the entry's page.
    await open.click();
    await expect(page).toHaveURL(/\/compendium\/ingredients\/fixture-longwort/);
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
      localIngredient(sql, coven.id, coven.users.A, {
        name: NAME,
        canonicalName: FORMAL,
        safetyNotes: 'Fixture coven caution.',
        folkNames: ['Fixture Covenbane'],
      }),
    );
    const listPath = `/coven/${coven.slug}/ingredients`;
    const details = detailsDialog(page);

    await test.step('a viewer reads the details, with no Edit', async () => {
      await signInAgainAs(page, coven.users.C);
      await page.goto(listPath);
      await quickLook(page).click();
      // Why Edit could be there: the details are open, with their other action.
      await expect(details.getByRole('link', { name: 'View Page' })).toBeVisible();
      await expect(editIn(details)).toHaveCount(0);
      // The entry's sections, read for the coven.
      await expect(
        details.getByRole('region', { name: 'Caution' }).getByText('Fixture coven caution.'),
      ).toBeVisible();
      await expect(
        details.getByRole('list', { name: 'Folk Names' }).getByText('Fixture Covenbane'),
      ).toBeVisible();
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
      await editIn(renamedDetails, RENAMED).click();
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
    await expect(details.getByRole('link', { name: 'View Page' })).toHaveAttribute(
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
