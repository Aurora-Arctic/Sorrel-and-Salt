import type { Locator, Page } from '@playwright/test';
import sharp from 'sharp';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations, switchColourScheme } from './axe';
import { MODAL_OPENERS, seedWorld, signIn, visit } from './axe-sweep';
import { DESKTOP_WIDTH, PHONE_WIDTH } from './breakpoints';
import { recreateE2eDatabase } from './database';
import { contrastRatio } from '@/lib/contrast';

// The names, roles and contrast the accessibility audit found missing (claude-docs/audits/accessibility.md, AX-5,
// AX-7, AX-8, AX-11 and AX-12). Each scan is narrowed to the rule the finding broke, beside a full scan where the
// page had none before.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

/** The dialog's scrolling body is a region named from the dialog's own title. */
async function expectBodyNamedByTitle(dialog: Locator) {
  await expect(dialog).toBeVisible();
  const title = (await dialog.getByRole('heading').first().textContent())?.trim() ?? '';
  // Precondition: the dialog has a title to be named by.
  expect(title).not.toBe('');
  const body = dialog.getByRole('region', { name: title });
  await expect(body).toHaveAttribute('tabindex', '0');
}

test.describe('a scrolling dialog body', () => {
  // Regression: the body took a Tab stop with no role and no name.
  test('the help screenshot names its body by its title', async ({ page }) => {
    const world = await seedWorld(page);
    await signIn(page, world, 'user');
    const dialog = await MODAL_OPENERS['help-screenshot'](page, world);

    await expectBodyNamedByTitle(dialog);
    await assertNoAccessibilityViolations(page);
  });

  test('the Quick Look names its body by its title', async ({ page }) => {
    const world = await seedWorld(page);
    await signIn(page, world, 'steward');
    const dialog = await MODAL_OPENERS['quick-look'](page, world);

    await expectBodyNamedByTitle(dialog);
    await assertNoAccessibilityViolations(page);
  });
});

// Regression: the recipe's section ids were fixed strings, written once by the page and again by the preview.
test('the spell preview opens with no id the page already holds', async ({ page }) => {
  const world = await seedWorld(page);
  await signIn(page, world, 'steward');
  const dialog = await MODAL_OPENERS['spell-preview'](page, world);
  await expect(dialog).toBeVisible();
  // Precondition: the page and the preview both draw a recipe's sections, so their ids could collide.
  await expect(dialog.getByRole('heading', { name: 'Steps', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Steps', exact: true })).toHaveCount(2);

  const repeated = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('[id]')].map((element) => element.id);
    return [...new Set(ids.filter((id, at) => ids.indexOf(id) !== at))];
  });
  expect(repeated).toEqual([]);
  await assertNoAccessibilityViolations(page, {
    onlyRules: ['duplicate-id', 'duplicate-id-aria', 'duplicate-id-active'],
  });
});

// Regression: at phone width the stacked table took its header text out of the accessibility tree.
test('the curator compendium table keeps its header text at phone width', async ({ page }) => {
  const world = await seedWorld(page);
  await signIn(page, world, 'curator');
  await page.setViewportSize({ width: PHONE_WIDTH, height: 812 });
  await visit(page, '/curator/compendium');
  const table = page.getByRole('main').getByRole('table');
  // Precondition: the table is drawn with a row, so its headers are there to be read.
  await expect(table.getByRole('row').nth(1)).toBeVisible();

  for (const colorScheme of ['light', 'dark'] as const) {
    await switchColourScheme(page, colorScheme);
    await assertNoAccessibilityViolations(page, { onlyRules: ['empty-table-header'] });
  }
});

type Rgba = [number, number, number, number];

const hex = (rgb: number[]) =>
  `#${rgb
    .slice(0, 3)
    .map((channel) => Math.round(channel).toString(16).padStart(2, '0'))
    .join('')}`;

/**
 * The worst contrast between `text`'s colour and the pixels under its box, read from a screenshot with the text
 * made transparent: axe cannot resolve a background image, so the art behind the text is measured as drawn.
 */
async function worstContrastUnder(text: Locator): Promise<{ worst: number; pixels: number }> {
  await expect(text).toBeVisible();
  const colour = await text.evaluate((element): Rgba => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext('2d')!;
    context.fillStyle = getComputedStyle(element).color;
    context.fillRect(0, 0, 1, 1);
    return [...context.getImageData(0, 0, 1, 1).data] as Rgba;
  });
  await text.evaluate((element) => {
    for (const node of [element, ...element.querySelectorAll('*')])
      (node as HTMLElement).style.setProperty('color', 'transparent', 'important');
  });
  const shot = await text.screenshot({ animations: 'disabled' });
  await text.evaluate((element) => {
    for (const node of [element, ...element.querySelectorAll('*')])
      (node as HTMLElement).style.removeProperty('color');
  });

  const { data, info } = await sharp(shot)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const alpha = colour[3] / 255;
  let worst = Infinity;
  for (let at = 0; at < data.length; at += info.channels) {
    const ground = [data[at], data[at + 1], data[at + 2]];
    const glyph = ground.map((channel, i) => colour[i] * alpha + channel * (1 - alpha));
    worst = Math.min(worst, contrastRatio(hex(glyph), hex(ground)));
  }
  return { worst, pixels: data.length / info.channels };
}

const MUTED_TEXT: { path: string; text: (page: Page) => Locator }[] = [
  {
    path: '/privacy',
    text: (page) =>
      page
        .getByRole('main')
        .getByText(/last updated/i)
        .first(),
  },
  {
    path: '/terms',
    text: (page) =>
      page
        .getByRole('main')
        .getByText(/last updated/i)
        .first(),
  },
  {
    path: '/compendium',
    text: (page) => page.getByRole('main').getByText('Reference', { exact: true }).first(),
  },
];

// Regression: the small muted text sat over the background art at under 4.5:1.
test.describe('the small muted text over the art', () => {
  for (const { path, text } of MUTED_TEXT)
    for (const width of [DESKTOP_WIDTH, PHONE_WIDTH])
      for (const colorScheme of ['light', 'dark'] as const)
        test(`keeps 4.5:1 on ${path} at ${width}px in ${colorScheme}`, async ({ page }) => {
          await page.setViewportSize({ width, height: 812 });
          await visit(page, path);
          await switchColourScheme(page, colorScheme);

          const { worst, pixels } = await worstContrastUnder(text(page));

          // Precondition: the text's box was measured, so a clean result is not an empty one.
          expect(pixels).toBeGreaterThan(0);
          expect(worst).toBeGreaterThanOrEqual(4.5);
        });
});
