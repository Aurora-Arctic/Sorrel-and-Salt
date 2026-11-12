import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/** One failed axe rule on one element, named so a report can say where. */
export interface AxeFinding {
  rule: string;
  impact: string;
  help: string;
  selector: string;
}

// Settles first: a theme switch scanned straight after would read a colour part-way along its ease. The title
// is waited for too: a soft navigation leaves the document with no <title> for milliseconds, so axe's
// document-title rule fails. `skipRules` is for the workshop, whose story page has no level-one heading.
// `onlyRules` runs just those rules, which is how the dark theme is scanned (COLOUR_RULES).
export async function accessibilityFindings(
  page: Page,
  { skipRules = [], onlyRules }: { skipRules?: string[]; onlyRules?: string[] } = {},
): Promise<AxeFinding[]> {
  await expect(page).toHaveTitle(/\S/);
  await settleTransitions(page);
  const scan = async () => {
    const builder = new AxeBuilder({ page });
    if (onlyRules) builder.withRules(onlyRules);
    return (await builder.disableRules(skipRules).analyze()).violations;
  };
  let violations = await scan();
  // The metadata swap can also land between the wait above and the scan's read: a
  // missing title is scanned again once, after waiting for one. A page that never has a title
  // still fails, at the wait.
  if (violations.some((v) => v.id === 'document-title')) {
    await expect(page).toHaveTitle(/\S/);
    violations = await scan();
  }
  return violations.flatMap((violation) =>
    violation.nodes.map((node) => ({
      rule: violation.id,
      impact: violation.impact ?? 'unknown',
      help: violation.help,
      selector: node.target.join(' '),
    })),
  );
}

export async function assertNoAccessibilityViolations(
  page: Page,
  options: { skipRules?: string[]; onlyRules?: string[] } = {},
) {
  const findings = await accessibilityFindings(page, options);
  const summary = findings
    .map(({ rule, help, selector }) => `${rule}: ${help} (${selector})`)
    .join('\n');
  expect(findings, summary).toEqual([]);
}

// A page holds at a phone's width when the document is no wider than the window. Measured in a real
// browser, since happy-dom lays nothing out; 375px is the narrowest width a section signs off at
// (claude-docs/styling.md, "Designing a section"), and `width` checks a wider one. `restore` puts the window back to its width afterwards.
export async function assertNoSidewaysScroll(page: Page, { restore = false, width = 375 } = {}) {
  const size = restore ? page.viewportSize() : null;
  await page.setViewportSize({ width, height: 812 });
  // Two frames for what follows the window by itself: a callout or badge placed by Floating UI moves
  // on the resize event and a frame, not in the same task, so a measurement at once read the old place.
  await page.evaluate(
    () =>
      new Promise<void>((done) => {
        requestAnimationFrame(() => requestAnimationFrame(() => done()));
      }),
  );
  const { scrollWidth, clientWidth, wide } = await page.evaluate(() => {
    const root = document.documentElement;
    // What reaches past the window, named, so a failure says which element
    // rather than only by how much.
    const past = (element: Element) =>
      element.getBoundingClientRect().right > root.clientWidth + 0.5;
    // Outermost offenders only: a wide element's children are wide with it.
    const wide = [...document.querySelectorAll('body *')]
      .filter((element) => past(element) && !(element.parentElement && past(element.parentElement)))
      .slice(0, 8)
      .map((element) => {
        const { right, width } = element.getBoundingClientRect();
        const name = [element.tagName.toLowerCase(), ...element.classList].join('.');
        return `${name} (right ${Math.round(right)}, width ${Math.round(width)})`;
      });
    return { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth, wide };
  });
  expect(
    scrollWidth,
    `wider than the window: ${wide.join('; ') || 'nothing named'}`,
  ).toBeLessThanOrEqual(clientWidth);
  if (size) await page.setViewportSize(size);
}

// Every colour eases over 400ms, so each running transition finishes first. A cancelled one has stopped easing
// but its `finished` promise rejects with an AbortError (WebKit cancels one a later style change replaces), so
// the rejection is read as done; replaced transitions are waited for in turn.
export async function settleTransitions(page: Page) {
  await page.evaluate(async () => {
    // Transitions only: a scroll-driven animation (the sorrel's) never finishes.
    const running = () => document.getAnimations().filter((each) => each instanceof CSSTransition);
    while (running().length > 0) {
      await Promise.all(running().map((each) => each.finished.catch(() => undefined)));
    }
  });
}

/**
 * The rules a theme switch can change: it swaps colour tokens and no markup (`data-theme` plus Sass), so the dark
 * scan runs these two and the light scan runs every rule.
 */
export const COLOUR_RULES = ['color-contrast', 'link-in-text-block'];

// Scans the page in the dark theme (colour rules only) and then the light (every rule), the site's default
// last. A transition starts only at the
// first style change after the switch, so the scheme is read as matching and two frames pass before the settle,
// or the settle finds nothing running and axe reads a colour part-way along its ease.
export async function scanBothThemes(page: Page) {
  for (const colorScheme of ['dark', 'light'] as const) {
    await page.emulateMedia({ colorScheme });
    await page.waitForFunction(
      (scheme) => matchMedia(`(prefers-color-scheme: ${scheme})`).matches,
      colorScheme,
    );
    await page.evaluate(
      () =>
        new Promise<void>((done) => {
          requestAnimationFrame(() => requestAnimationFrame(() => done()));
        }),
    );
    await settleTransitions(page);
    await assertNoAccessibilityViolations(
      page,
      colorScheme === 'dark' ? { onlyRules: COLOUR_RULES } : {},
    );
  }
}
