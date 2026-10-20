import { expect, test, type Locator, type Page } from '@playwright/test';
import { assertNoAccessibilityViolations } from '../axe';

// The click-feedback callout's layout facts (M12.31, design F;
// claude-docs/components/click-feedback.md): where the callout goes and its
// two fallbacks, that nothing moves as it comes and goes, that the badge's
// press target covers no neighbour, and that reduced motion stills the fade.
// Measured in the component's Ladle stories, since no page uses it yet; what
// it says and where the focus goes are in tests/components/ClickFeedback.

const WIDTHS = [1280, 375] as const;
const THEMES = ['dark', 'light'] as const;

/**
 * The story in Ladle's bare preview, in `theme`, with its text in the web
 * font: measured before the font arrives, on a cold Ladle, a control is
 * narrower than it will be and every place taken from it is wrong. The fonts
 * are waited for once the story's controls are drawn, since a font is fetched
 * only when text first asks for it.
 */
async function openStory(page: Page, story: string, theme: string, width: number) {
  await page.setViewportSize({ width, height: 800 });
  await page.goto(`/?story=surfaces--click-feedback--${story}&mode=preview&theme=${theme}`);
  await expect(page.locator('.ladle-story-frame button').first()).toBeVisible();
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

const callout = (page: Page) => page.getByRole('alert');
const badge = (page: Page, name: string) =>
  page.getByRole('button', { name: `Show the error for ${name}` });

interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

const box = async (locator: Locator): Promise<Box> =>
  locator.evaluate((node) => {
    const { left, right, top, bottom } = node.getBoundingClientRect();
    return { left, right, top, bottom };
  });

/** Where the arrow's point stands across the page: the middle of the callout's `::after`. */
const arrowX = (locator: Locator): Promise<number> =>
  locator.evaluate((node) => {
    const style = getComputedStyle(node, '::after');
    return (
      node.getBoundingClientRect().left +
      node.clientLeft +
      parseFloat(style.left) +
      parseFloat(style.width) / 2
    );
  });

/** The badge's press target: the badge grown by its `::after`, which reaches past it. */
const pressTarget = (locator: Locator): Promise<Box> =>
  locator.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node, '::after');
    const px = (value: string) => parseFloat(value) || 0;
    return {
      left: Math.min(rect.left, rect.left + px(style.left)),
      right: Math.max(rect.right, rect.right - px(style.right)),
      top: Math.min(rect.top, rect.top + px(style.top)),
      bottom: Math.max(rect.bottom, rect.bottom - px(style.bottom)),
    };
  });

const overlaps = (a: Box, b: Box) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

/** Waits for the callout's place: hidden until the script has set it. */
async function placed(page: Page): Promise<Locator> {
  const alert = callout(page);
  await expect(alert).toBeVisible();
  await expect(alert).toHaveClass(/is-placed/);
  return alert;
}

/** Its arrow under the control's middle, and the callout below the control. */
async function expectUnder(alert: Locator, control: Locator) {
  const at = await box(control);
  const under = await box(alert);
  expect(under.top).toBeGreaterThan(at.bottom);
  // Within 2px: the callout is placed on whole pixels, the arrow on fractions.
  expect(Math.abs((await arrowX(alert)) - (at.left + at.right) / 2)).toBeLessThanOrEqual(2);
}

test.describe('the callout’s place', () => {
  test('below the control, its start under the control’s start', async ({ page }) => {
    await openStory(page, 'bordered', 'dark', 1280);
    const alert = await placed(page);
    const control = page.getByRole('button', { name: 'Remove', exact: true });

    expect(Math.abs((await box(alert)).left - (await box(control)).left)).toBeLessThanOrEqual(1);
    await expectUnder(alert, control);
  });

  test('near the right edge, its end under the control’s end', async ({ page }) => {
    await openStory(page, 'near-right-edge', 'dark', 1280);
    const alert = await placed(page);
    const control = page.getByRole('button', { name: 'Annotate', exact: true });
    const at = await box(control);
    const under = await box(alert);

    // Why the first fallback is taken: the start alignment would run past the
    // window's 16px margin.
    expect(at.left + (under.right - under.left)).toBeGreaterThan(1280 - 16);
    expect(Math.abs(under.right - at.right)).toBeLessThanOrEqual(1);
    await expectUnder(alert, control);
  });

  test('with room for neither, pinned inside its box, the arrow still under the control', async ({
    page,
  }) => {
    await openStory(page, 'pinned', 'dark', 1280);
    const alert = await placed(page);
    const control = page.getByRole('button', { name: 'Remove', exact: true });
    const bounds = await box(page.locator('[data-tip-boundary]'));
    const at = await box(control);
    const under = await box(alert);
    const width = under.right - under.left;

    // Why both alignments fail: either would leave the box.
    expect(at.left + width).toBeGreaterThan(bounds.right - 16);
    expect(at.right - width).toBeLessThan(bounds.left + 16);
    expect(under.left).toBeGreaterThanOrEqual(bounds.left + 16 - 1);
    expect(under.right).toBeLessThanOrEqual(bounds.right - 16 + 1);
    await expectUnder(alert, control);
  });

  for (const theme of THEMES) {
    test(`at 375px in ${theme}, inside the window’s margins, and axe finds nothing`, async ({
      page,
    }) => {
      await openStory(page, theme === 'dark' ? 'phone-dark' : 'phone-light', theme, 375);
      const alert = await placed(page);
      const under = await box(alert);

      expect(under.left).toBeGreaterThanOrEqual(16 - 1);
      expect(under.right).toBeLessThanOrEqual(375 - 16 + 1);
      await expectUnder(alert, page.getByRole('button', { name: 'Remove', exact: true }));
      await assertNoAccessibilityViolations(page);
    });
  }
});

for (const width of WIDTHS) {
  for (const theme of THEMES) {
    test.describe(`at ${width}px in ${theme}`, () => {
      test('nothing moves as the callout and the badge come and go', async ({ page }) => {
        await openStory(page, 'default', theme, width);
        const buttons = page.locator('.ladle-story-frame button');
        // Why a shift could happen: four controls in a wrapping row, the
        // badge and the callout drawn among them.
        await expect(buttons).toHaveCount(4);
        const before = await buttons.evaluateAll((nodes) =>
          nodes.map((node) => node.getBoundingClientRect().toJSON()),
        );
        const controls = () =>
          page
            .locator('.ladle-story-frame button:not([class*="click-feedback"])')
            .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().toJSON()));

        await page.getByRole('button', { name: 'Remove', exact: true }).click();
        await placed(page);
        expect(await controls()).toEqual(before);

        await page.getByRole('button', { name: 'Dismiss' }).click();
        await expect(callout(page)).toHaveCount(0);
        expect(await controls()).toEqual(before);
      });

      test('the badge’s press target is 24px and covers no other control', async ({ page }) => {
        await openStory(page, 'default', theme, width);
        // Each refused, and its callout closed so it covers no next control.
        for (const name of ['Leave Coven', 'Remove', 'Annotate', 'Edit']) {
          await page.getByRole('button', { name, exact: true }).click();
          await placed(page);
          await page.keyboard.press('Escape');
          await expect(callout(page)).toHaveCount(0);
        }

        const controls = page.locator('.ladle-story-frame button:not([class*="click-feedback"])');
        const names = await controls.allTextContents();
        for (const name of names) {
          const target = await pressTarget(badge(page, name));
          expect(target.right - target.left).toBeGreaterThanOrEqual(24 - 0.5);
          expect(target.bottom - target.top).toBeGreaterThanOrEqual(24 - 0.5);
          for (const other of names.filter((n) => n !== name)) {
            const neighbour = await box(page.getByRole('button', { name: other, exact: true }));
            expect(overlaps(target, neighbour), `${name}'s badge over ${other}`).toBe(false);
          }
        }
        // The borderless button's badge stands beside it, not on its corner;
        // a bordered one's overlaps its corner.
        const plain = await box(page.getByRole('button', { name: 'Annotate', exact: true }));
        expect((await box(badge(page, 'Annotate'))).left).toBeGreaterThanOrEqual(plain.right);
        const quiet = await box(page.getByRole('button', { name: 'Edit', exact: true }));
        expect((await box(badge(page, 'Edit'))).left).toBeLessThan(quiet.right);
      });

      test('axe finds nothing with the callout open', async ({ page }) => {
        await openStory(page, 'bordered', theme, width);
        await placed(page);
        await assertNoAccessibilityViolations(page);
      });
    });
  }
}

test.describe('motion', () => {
  test('the callout fades in, and out once dismissed', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await openStory(page, 'default', 'dark', 1280);
    await page.getByRole('button', { name: 'Remove', exact: true }).click();

    const name = (locator: Locator) =>
      locator.evaluate((node) => getComputedStyle(node).animationName);
    expect(await name(page.locator('.click-feedback__callout'))).toBe('list-frame-fade-in');
    await page.getByRole('button', { name: 'Dismiss' }).click();
    await expect(callout(page)).toHaveCount(0);
  });

  test('under reduced motion neither the callout nor the badge fades', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openStory(page, 'default', 'dark', 1280);
    await page.getByRole('button', { name: 'Remove', exact: true }).click();
    await placed(page);

    const name = (locator: Locator) =>
      locator.evaluate((node) => getComputedStyle(node).animationName);
    expect(await name(page.locator('.click-feedback__callout'))).toBe('none');
    expect(await name(badge(page, 'Remove'))).toBe('none');
  });
});
