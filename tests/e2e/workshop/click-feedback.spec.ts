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

  for (const story of ['borderless', 'near-right-edge']) {
    test(`in ${story}, refused as it mounts, the badge stands beside the borderless control`, async ({
      page,
    }) => {
      await openStory(page, story, 'dark', 1280);
      await placed(page);
      const control = page.getByRole('button', { name: 'Annotate', exact: true });
      const mark = badge(page, 'Annotate');
      await expect(mark).toHaveClass(/is-placed/);

      // Why it could go wrong: the story reports before the control's first
      // render is over, and the side is read from the control as it reports.
      expect((await box(mark)).left - (await box(control)).right).toBeGreaterThanOrEqual(8 - 0.5);
    });
  }

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
        // The borderless button’s badge stands beside it, 8px clear, not on its corner;
        // a bordered one's overlaps its corner.
        const plain = await box(page.getByRole('button', { name: 'Annotate', exact: true }));
        expect((await box(badge(page, 'Annotate'))).left - plain.right).toBeGreaterThanOrEqual(
          8 - 0.5,
        );
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

/** What one frame showed of a piece. */
interface Frame {
  /** In the page at all. */
  present: boolean;
  /** Present and not `visibility: hidden`: what a person could see. */
  visible: boolean;
  opacity: number;
  /** An animation on it is running, not finished or idle. */
  running: boolean;
}

type Piece = 'callout' | 'badge';
const PIECES: Record<Piece, string> = {
  callout: '.click-feedback__callout',
  badge: '.click-feedback__badge',
};

/**
 * Starts reading each piece's drawn state once a frame, on the page's own
 * clock, until `takeFrames` collects them: a fade is a matter of frames, which
 * no Playwright wait between them could catch.
 */
async function sampleFrames(page: Page): Promise<void> {
  await page.evaluate((pieces) => {
    const record: Record<string, unknown[]> = { callout: [], badge: [] };
    const store = window as unknown as { fadeFrames: typeof record; fadeSampling: boolean };
    store.fadeFrames = record;
    store.fadeSampling = true;
    const tick = () => {
      for (const [piece, selector] of Object.entries(pieces)) {
        const node = document.querySelector<HTMLElement>(selector);
        if (!node) {
          record[piece].push({ present: false, visible: false, opacity: 0, running: false });
          continue;
        }
        const style = getComputedStyle(node);
        record[piece].push({
          present: true,
          visible: style.visibility !== 'hidden',
          opacity: parseFloat(style.opacity),
          running: node.getAnimations().some((animation) => animation.playState === 'running'),
        });
      }
      if (store.fadeSampling) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, PIECES);
}

async function takeFrames(page: Page): Promise<Record<Piece, Frame[]>> {
  return page.evaluate(() => {
    const store = window as unknown as {
      fadeFrames: Record<Piece, Frame[]>;
      fadeSampling: boolean;
    };
    store.fadeSampling = false;
    return store.fadeFrames;
  });
}

/**
 * Holds back each piece's place by `frames` frames: `is-placed` is taken off
 * as the script sets it, before any frame can draw it, and put back after.
 * Floating UI places within the press's own task in the workshop, but a slower
 * page (`next dev`) can land it frames later, and a fade that started at the
 * mount would then be spent before the piece is seen.
 */
async function holdPlacement(page: Page, frames: number): Promise<void> {
  await page.evaluate(
    ({ selector, frames }) => {
      const held = new WeakSet<Element>();
      const released = new WeakSet<Element>();
      const hold = () => {
        for (const node of document.querySelectorAll(selector)) {
          if (released.has(node)) continue;
          node.classList.remove('is-placed');
          if (held.has(node)) continue;
          held.add(node);
          let left = frames;
          const wait = () => {
            if (--left > 0) return void requestAnimationFrame(wait);
            released.add(node);
            node.classList.add('is-placed');
          };
          requestAnimationFrame(wait);
        }
      };
      new MutationObserver(hold).observe(document.body, {
        subtree: true,
        childList: true,
        attributeFilter: ['class'],
      });
    },
    { selector: `${PIECES.callout}.is-placed, ${PIECES.badge}.is-placed`, frames },
  );
}

/** Strictly between gone and full, with room for rounding at either end. */
const midway = (frame: Frame) => frame.visible && frame.opacity > 0.05 && frame.opacity < 0.95;

/** Waits out a fade: the piece at full opacity, or gone. */
const settle = (page: Page) => page.waitForTimeout(500);

test.describe('motion', () => {
  test('the callout and the badge fade in once placed, and out as they go', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await openStory(page, 'then-succeeds', 'dark', 1280);
    // Longer than the fade: placed late, a fade started at the mount is over.
    await holdPlacement(page, 15);

    await sampleFrames(page);
    await page.getByRole('button', { name: 'Remove', exact: true }).click();
    await placed(page);
    await settle(page);
    const arriving = await takeFrames(page);

    for (const piece of ['callout', 'badge'] as const) {
      const frames = arriving[piece];
      // Why the hold matters: each was in the page, hidden, before it showed.
      expect(
        frames.findIndex((frame) => frame.present),
        `${piece} hidden a while first`,
      ).toBeLessThan(frames.findIndex((frame) => frame.visible) - 5);
      const first = frames.find((frame) => frame.visible);
      expect(first, `${piece} shown`).toBeDefined();
      // Why it could look faded in when it was not: hidden until placed, so a
      // fade spent before the place lands is never seen.
      expect(first!.running, `${piece}'s fade still running as it shows`).toBe(true);
      expect(frames.some(midway), `${piece} seen partway in`).toBe(true);
      expect(frames[frames.length - 1]!.opacity, `${piece} arrives in full`).toBe(1);
    }

    await sampleFrames(page);
    // A later try that succeeds: the badge goes, and the press outside it
    // closes the callout.
    await page.getByRole('button', { name: 'Succeed' }).click();
    await expect(page.locator(PIECES.callout)).toHaveCount(0);
    await expect(page.locator(PIECES.badge)).toHaveCount(0);
    const leaving = await takeFrames(page);

    for (const piece of ['callout', 'badge'] as const) {
      const frames = leaving[piece];
      // Why a jump would pass unnoticed: it is drawn, and seen, as it goes.
      expect(frames[0]!.visible, `${piece} shown as it starts to go`).toBe(true);
      expect(frames.some(midway), `${piece} seen partway out`).toBe(true);
    }
  });

  test('the callout fades out once dismissed, and again on Escape', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await openStory(page, 'default', 'dark', 1280);
    const remove = page.getByRole('button', { name: 'Remove', exact: true });

    await remove.click();
    await placed(page);
    await settle(page);
    await sampleFrames(page);
    await page.getByRole('button', { name: 'Dismiss' }).click();
    await expect(page.locator(PIECES.callout)).toHaveCount(0);
    expect((await takeFrames(page)).callout.some(midway), 'seen partway out').toBe(true);

    await badge(page, 'Remove').click();
    await placed(page);
    await settle(page);
    await sampleFrames(page);
    await page.keyboard.press('Escape');
    await expect(page.locator(PIECES.callout)).toHaveCount(0);
    expect((await takeFrames(page)).callout.some(midway), 'seen partway out').toBe(true);
  });

  test('under reduced motion neither fades: each shows in full at once', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openStory(page, 'then-succeeds', 'dark', 1280);

    await sampleFrames(page);
    await page.getByRole('button', { name: 'Remove', exact: true }).click();
    await placed(page);
    await settle(page);
    const arriving = await takeFrames(page);
    console.log('PROBE', JSON.stringify(arriving.callout.slice(0, 14)));
    for (const piece of ['callout', 'badge'] as const) {
      const shown = arriving[piece].filter((frame) => frame.visible);
      // Why the check could pass vacuously: each was seen.
      expect(shown.length, `${piece} shown`).toBeGreaterThan(0);
      expect(
        shown.every((frame) => frame.opacity === 1 && !frame.running),
        `${piece} in full`,
      ).toBe(true);
    }

    await page.getByRole('button', { name: 'Succeed' }).click();
    // Gone at once: no fade holds it in the page.
    await expect(page.locator(PIECES.callout)).toHaveCount(0, { timeout: 100 });
    await expect(page.locator(PIECES.badge)).toHaveCount(0, { timeout: 100 });
  });
});
