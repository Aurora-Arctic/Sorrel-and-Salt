import { expect, type Locator, type Page } from '@playwright/test';

/** Waits until React has hydrated the element, so a click is the app's navigation and not a full page load. */
export async function hydrated(page: Page, selector: string): Promise<void> {
  await page.waitForFunction((target) => {
    const element = document.querySelector(target);
    return !!element && Object.keys(element).some((key) => key.startsWith('__reactProps$'));
  }, selector);
}

/** A wait that is itself the requirement (a timer, a throttle, a debounce); the reason says why no state can stand in for it. */
export async function requiredDelay(ms: number, reason: string): Promise<void> {
  void reason;
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** The pause between two polls of something outside the browser (a database, a mail server) that has no state to wait on. */
export function pauseBetweenPolls(ms: number, reason: string): Promise<void> {
  void reason;
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** Runs the page's faked clock on in `step` ms steps until the assertion holds, for timers that chain (retries) or fire after a debounce. */
export async function runClockUntil(
  page: Page,
  assertion: () => void | Promise<void>,
  { step = 3_000, timeout = 20_000 }: { step?: number; timeout?: number } = {},
): Promise<void> {
  await expect(async () => {
    await page.clock.runFor(step);
    await assertion();
  }).toPass({ timeout });
}

/** Polls a reading until two reads in a row are equal and not null, and returns it, for values that move for a moment after the page looks ready. */
export async function settled<T>(read: () => Promise<T>): Promise<T> {
  const state: { last: string; value: T | undefined } = { last: '', value: undefined };
  await expect
    .poll(async () => {
      state.value = await read();
      const now = JSON.stringify(state.value);
      const same = state.value != null && now === state.last;
      state.last = now;
      return same;
    })
    .toBe(true);
  return state.value as T;
}

type Box = NonNullable<Awaited<ReturnType<Locator['boundingBox']>>>;

/** A floating element's box once it holds still, since Floating UI places it a moment after it is visible. */
export const settledBox = (element: Locator): Promise<Box | null> =>
  settled(() => element.boundingBox());
