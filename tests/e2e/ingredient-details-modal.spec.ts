import type { Locator, Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations, assertNoSidewaysScroll } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAs } from './session';
import { makeIngredient } from '../support/fixtures/ingredient';
import { insertIngredient } from '../support/db/insert-ingredient';
import { ingredientSlug } from '@/lib/slugify';
import {
  ingredientList,
  localIngredient,
  nameSearch,
  rowOf,
  seedCoven,
  withSql,
} from './stories/coven-ingredients';
import { editIngredientDialog } from './stories/ingredient-dialogs';

// An entry's details in a modal over its list, opened by the Quick Look eye (claude-docs/components/ingredient-entry.md,
// "The details modal"), for what no story walks: every close returns focus, Edit opens over the details and
// closes back, a coven's save shows in both, and the open details pass axe at a phone's width.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

const NAME = 'Fixture Lookwort';
const FORMAL = 'Fixtura spectata';
const ENTRY = `${NAME}, ${FORMAL}`;

/** The Quick Look eye, named by its verb and the entry. */
const quickLook = (scope: Locator | Page, entry = ENTRY) =>
  scope.getByRole('link', { name: `Quick Look ${entry}`, exact: true });

/** The details modal, named by the entry's name alone. */
const detailsDialog = (page: Page, name = NAME) => page.getByRole('dialog', { name, exact: true });

/**
 * The details' Edit: the card's pencil, a link named as the card names it, "Edit Name, Formal"
 * (the window's icons follow the card's).
 */
const editIn = (dialog: Locator, name = NAME) =>
  dialog.getByRole('link', { name: `Edit ${name}, ${FORMAL}`, exact: true });

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
    await expect(details.getByRole('link', { name: 'See in Compendium' })).toHaveAttribute(
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
    return detailsDialog(page, longName);
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

  test('a short entry fits its window: the body overflows on neither axis, with See in Compendium outside it', async ({
    page,
  }) => {
    await page.goto(`${listPath}&entry=${slug}`);
    const details = detailsDialog(page);
    const body = details.locator('.modal-dialog__body');
    // Why it could overflow: the entry has a See in Compendium foot, which was once the body's last child.
    await expect(details.getByRole('link', { name: 'See in Compendium' })).toBeVisible();
    // Why it is short: the one caution, nothing near the window's height.
    const room = await body.evaluate((b) => b.clientHeight);
    expect(room).toBeLessThan((page.viewportSize()?.height ?? 0) / 2);
    const overflow = () =>
      body.evaluate((b) => ({
        y: b.scrollHeight - b.clientHeight,
        x: b.scrollWidth - b.clientWidth,
      }));
    await expect.poll(overflow).toEqual({ y: 0, x: 0 });
    // The scrollbar is the browser's to draw, and only for text that overflows: never forced.
    expect(await body.evaluate((b) => getComputedStyle(b).overflowY)).toBe('auto');
    // The foot is the modal's own, under the body and out of what scrolls.
    await expect(body.getByRole('link', { name: 'See in Compendium' })).toHaveCount(0);
  });

  test('a description that fits the window once opened leaves the body with nothing to scroll, during the opening and after', async ({
    page,
  }) => {
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
    const details = detailsDialog(page, midName);
    const body = details.locator('.modal-dialog__body');
    const overflow = () =>
      body.evaluate((b) => ({
        y: b.scrollHeight - b.clientHeight,
        x: b.scrollWidth - b.clientWidth,
      }));

    // Why it could scroll: the description is cut, and opening it adds height to the body.
    const bar = details.getByRole('button', { name: 'Show More' });
    await expect(bar).toBeVisible();
    const closedHeight = await body.evaluate((b) => b.clientHeight);
    // Why it should not: opened, the whole window is still taller than the body asks for.
    await bar.click();
    const samples: { y: number; x: number }[] = [];
    for (let i = 0; i < 16; i++) {
      samples.push(await overflow());
      await page.waitForTimeout(50);
    }
    await expect.poll(() => body.evaluate((b) => b.clientHeight)).toBeGreaterThan(closedHeight);
    expect(await body.evaluate((b) => b.clientHeight)).toBeLessThan(
      page.viewportSize()?.height ?? 0,
    );
    samples.push(await overflow());
    expect(samples.every((s) => s.y === 0 && s.x === 0)).toBe(true);
    // Not forced: the body's own overflow is auto, so a scrollbar shows for overflow alone.
    expect(await body.evaluate((b) => getComputedStyle(b).overflowY)).toBe('auto');
  });

  test('See in Compendium is a button in a foot outside the scrolling body, which scrolls the text under its own end', async ({
    page,
  }) => {
    const details = await openLongEntry(page);
    const open = details.getByRole('link', { name: 'See in Compendium' });
    const body = details.locator('.modal-dialog__body');

    // Why it could scroll: opened whole, the long text is taller than the window the body shows.
    await details.getByRole('button', { name: 'Show More' }).click();
    await expect
      .poll(() => body.evaluate((b) => b.scrollHeight - b.clientHeight))
      .toBeGreaterThan(0);
    // The foot is outside the element that scrolls, so its scrollbar starts under the head and
    // ends above the foot's rule instead of running down past it.
    await expect(body.getByRole('link', { name: 'See in Compendium' })).toHaveCount(0);
    await expect(open).toBeInViewport();

    // Scrolled to the end, the foot is still in view and the last text is readable above it.
    await body.evaluate((b) => b.scrollTo(0, b.scrollHeight));
    await expect(open).toBeInViewport();
    await expect(details.locator('.ingredient-summary > *:last-child')).toBeInViewport();

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
  // Who gets Edit and the unsaved close's question are the details-dialog component test's and
  // stories/04-modals.spec.ts's; this is the real save behind the details.
  test('a save from the details goes back to them, renamed there and on the list', async ({
    page,
  }) => {
    const coven = await seedCoven(page, 'Fixture Coven Details Modal', 'details-modal.test', {
      A: 'owner',
    });
    await withSql((sql) =>
      localIngredient(sql, coven.id, coven.users.A, {
        name: NAME,
        canonicalName: FORMAL,
      }),
    );
    const listPath = `/coven/${coven.slug}/ingredients`;
    const details = detailsDialog(page);

    // seedCoven leaves the owner signed in.
    await page.goto(listPath);
    await quickLook(page).click();
    await expect(editIn(details)).toBeVisible();

    const RENAMED = 'Fixture Seenwort';
    const renamedDetails = detailsDialog(page, RENAMED);
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
  });

  // A pick from the search opens its Quick Look, not its page.
  test('a pick from the search opens the details over the list, the filter kept, and a close gives the search box its focus back', async ({
    page,
  }) => {
    const coven = await seedCoven(page, 'Fixture Coven Details Pick', 'details-pick.test', {
      A: 'owner',
    });
    const { ingredientId } = await withSql((sql) =>
      localIngredient(sql, coven.id, coven.users.A, { name: NAME, canonicalName: FORMAL }),
    );
    await page.goto(`/coven/${coven.slug}/ingredients?source=local`);
    // Hydrated first: before it, the box is a plain text field with no dropdown.
    await page.waitForLoadState('networkidle');

    const search = nameSearch(page);
    await search.fill('lookwort');
    const option = page.getByRole('option', { name: new RegExp(`^${NAME}`) });
    await expect(option).toBeVisible();
    // Why the address below could have carried the typed text: it was not applied while typing.
    await expect(page).not.toHaveURL(/query=/);
    await option.click();

    const details = detailsDialog(page);
    await expect(details).toBeVisible();
    await expect(page).toHaveURL(
      new RegExp(`/coven/${coven.slug}/ingredients\\?.*entry=${ingredientId}(&|$)`),
    );
    await expect(page).toHaveURL(/[?&]source=local(&|$)/);
    await expect(page).not.toHaveURL(/query=/);

    await page.keyboard.press('Escape');
    await expect(details).toHaveCount(0);
    await expect(page).not.toHaveURL(/entry=/);
    await expect(page).toHaveURL(/[?&]source=local(&|$)/);
    await expect(search).toBeFocused();
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
    await page.context().clearCookies();
    await page.goto(`/compendium?query=${encodeURIComponent(PUBLIC_NAME)}`);
    // Why it is a visitor's: the header offers Sign In.
    await expect(page.getByRole('banner').getByRole('link', { name: 'Sign In' })).toBeVisible();

    const eye = quickLook(page, PUBLIC_ENTRY);
    await eye.click();
    const details = detailsDialog(page, PUBLIC_NAME);
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
    await expect(details.getByRole('link', { name: 'See in Compendium' })).toHaveAttribute(
      'href',
      `/compendium/ingredients/${ingredientSlug(PUBLIC_NAME, PUBLIC_FORMAL)}`,
    );
    await expect(details.getByRole('link', { name: /^Edit/ })).toHaveCount(0);
    await assertNoAccessibilityViolations(page);

    await page.keyboard.press('Escape');
    await expect(details).toHaveCount(0);
    await expect(page).not.toHaveURL(/entry=/);
    await expect(eye).toBeFocused();
  });
});
