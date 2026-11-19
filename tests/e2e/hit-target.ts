import type { Locator } from '@playwright/test';

/**
 * The size of the area where a press lands on the control, measured outward from its centre one pixel at a time, since
 * a control may be drawn smaller than its target. Zero by zero when something else lies over its centre.
 */
export function hitTarget(control: Locator): Promise<{ width: number; height: number }> {
  return control.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
    const lands = (dx: number, dy: number) => {
      const hit = document.elementFromPoint(x + dx, y + dy);
      return hit !== null && element.contains(hit);
    };
    if (!lands(0, 0)) return { width: 0, height: 0 };
    const reach = (dx: number, dy: number) => {
      let n = 0;
      while (n < 40 && lands(dx * (n + 1), dy * (n + 1))) n++;
      return n;
    };
    return { width: reach(-1, 0) + reach(1, 0) + 1, height: reach(0, -1) + reach(0, 1) + 1 };
  });
}

/**
 * Whether a person can see the control: Playwright's own visibility counts a control at opacity 0 as visible, and the
 * browser's `checkVisibility` does not.
 */
export function isSeen(control: Locator): Promise<boolean> {
  return control.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return (
      box.width > 1 &&
      box.height > 1 &&
      element.checkVisibility({ opacityProperty: true, visibilityProperty: true })
    );
  });
}
