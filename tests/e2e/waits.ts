import type { Page } from '@playwright/test';

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
export function pauseBetweenPolls(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
