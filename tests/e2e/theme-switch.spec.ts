import { test, expect } from './fixtures';
import { DESKTOP_WIDTH, PHONE_WIDTH } from './breakpoints';

// A theme change is one cross-fade of the whole page, so no element runs a colour transition of its own on
// the swap. It reads the browser's list of running transitions, so a hover fade that would also run on the
// swap is caught too (claude-docs/components/theme-toggle.md).

/** A transition of a colour: a colour property, a shadow, an SVG paint, or `all`. */
const COLOUR = /color|shadow|^fill$|^stroke$|^all$/;

for (const width of [PHONE_WIDTH, DESKTOP_WIDTH]) {
  test(`switching theme at ${width}px starts no colour transition on any element`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/compendium');
    const toggle = page.getByRole('button', { name: 'Toggle light and dark mode' });
    await expect(toggle).toBeVisible();
    const before = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));

    const running = await page.evaluate(async (pattern) => {
      const colour = new RegExp(pattern);
      const frame = () => new Promise((done) => requestAnimationFrame(done));
      const was = document.documentElement.getAttribute('data-theme');
      document
        .querySelector<HTMLButtonElement>('button[aria-label="Toggle light and dark mode"]')!
        .click();
      // The swap may wait on the cross-fade's capture of the old page, so wait for it, then for the
      // styles it changed to be computed.
      for (let i = 0; i < 60 && document.documentElement.getAttribute('data-theme') === was; i++) {
        await frame();
      }
      await frame();
      await frame();
      return document
        .getAnimations()
        .filter((each): each is CSSTransition => each instanceof CSSTransition)
        .filter((each) => colour.test(each.transitionProperty))
        .map((each) => {
          const target = each.effect instanceof KeyframeEffect ? each.effect.target : null;
          const where = target
            ? `${target.tagName.toLowerCase()}.${[...target.classList].join('.')}`
            : '?';
          return `${where} ${each.transitionProperty}`;
        });
    }, COLOUR.source);

    // Why a transition could have been missed: the theme did change.
    expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).not.toBe(
      before,
    );
    expect(running).toEqual([]);
  });
}
