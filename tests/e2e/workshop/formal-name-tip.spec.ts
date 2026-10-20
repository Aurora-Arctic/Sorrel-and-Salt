import { expect, test } from '@playwright/test';

// The formal name's ⓘ opens its tip against the ⓘ, the hook's 4px away
// (InfoTip/use-tip.ts, GAP_PX), as every other tip does: below it on a phone,
// where the shell's sticky bar would cover a tip above, and beside it where
// there is room. A layout fact no story walks. It regresses a bug that reached
// staging: the page's own stylesheet still moved the bubble after Floating UI
// placed it (a translate and a margin left from the CSS placement 45735fc7
// replaced), so the tip stood 18px above the ⓘ at 1280 and touched it at 390.

const STORIES = [
  ['a coven page', 'pages--ingredient-entry--annotate-or-remove'],
  ['the public page', 'pages--ingredient-entry--compendium-entry-for-curator'],
] as const;

/** The space between two boxes on the side the tip opened, in px. */
function gap(
  tip: { x: number; y: number; width: number; height: number },
  at: { x: number; y: number; width: number; height: number },
  side: 'below' | 'beside',
): number {
  return side === 'below' ? tip.y - (at.y + at.height) : tip.x - (at.x + at.width);
}

for (const [where, story] of STORIES) {
  for (const [width, side] of [
    [1280, 'beside'],
    [390, 'below'],
  ] as const) {
    test(`opens the formal name's tip 4px ${side} its ⓘ on ${where} at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/?story=${story}&mode=preview&theme=light`);
      const button = page.getByRole('button', { name: /^About .*Name$/ });
      await expect(button).toBeVisible();
      await page.evaluate(async () => {
        await document.fonts.ready;
      });

      await button.hover();
      const tip = page.getByRole('tooltip');
      await expect(tip).toBeVisible();
      // Let the fade and the first position settle before measuring.
      await page.waitForTimeout(300);
      const box = await tip.boundingBox();
      const at = await button.boundingBox();
      if (!box || !at) throw new Error('The tip or its ⓘ has no box');

      expect(gap(box, at, side)).toBeCloseTo(4, 0);
      // On that side, not overlapping it the other way.
      if (side === 'below') {
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
      } else {
        expect(box.y).toBeLessThan(at.y + at.height / 2);
        expect(box.y + box.height).toBeGreaterThan(at.y + at.height / 2);
      }
    });
  }
}
