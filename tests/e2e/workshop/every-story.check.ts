import AxeBuilder from '@axe-core/playwright';
import { chromium, expect, test, type Browser } from '@playwright/test';

// The every-story check: opens each story of a running Storybook and fails on a page error, a
// console error, a failed request or an accessibility violation. A MANUAL check, named `.check.ts`
// so no config's default match finds it; only playwright.workshop-check.config.ts, run by
// `npm run workshop:check`, names it (claude-docs/workshop.md, "The every-story check").
//
// It runs the page at `localhost`, which a browser treats as a secure origin: the fake API
// (.storybook/mock-api.ts) is a service worker, and a service worker registers only there. The
// browser server runs in another container, so `exposeNetwork` lets it reach this container's
// loopback. A story tagged `expects-failed-request` shows a refusal on purpose and is exempt from
// the request and console-error checks, never from the page-error or axe ones. A story tagged
// `shows-low-contrast` shows a failing colour pair on purpose and is exempt from the
// `color-contrast` axe rule only.

const BASE = process.env.WORKSHOP_CHECK_URL ?? 'http://localhost:61104';
const THEMES = (process.env.WORKSHOP_CHECK_THEMES ?? 'light,dark').split(',');
const ONLY = process.env.WORKSHOP_CHECK_ONLY; // a substring of the story id
const DETAIL = process.env.WORKSHOP_CHECK_DETAIL === '1'; // print each violating element
const WORKERS = Number(process.env.WORKSHOP_CHECK_WORKERS ?? 4);

// Rules about a whole page, which a story, one component alone, is not: the
// existing workshop specs skip the same (tests/e2e/axe.ts, `skipRules`).
const PAGE_RULES = [
  'page-has-heading-one',
  'region',
  // A composite story shows several states of one landmark side by side, which
  // a real page never does.
  'landmark-unique',
  'landmark-banner-is-top-level',
  'landmark-contentinfo-is-top-level',
];

interface IndexEntry {
  id: string;
  type: string;
  tags?: string[];
}

async function connect(): Promise<Browser> {
  const ws = process.env.PLAYWRIGHT_WS_ENDPOINT;
  if (!ws) return chromium.launch();
  return chromium.connect(ws, { exposeNetwork: '<loopback>' });
}

async function checkStory(browser: Browser, entry: IndexEntry, theme: string) {
  const problems: string[] = [];
  const lowContrast = entry.tags?.includes('shows-low-contrast') ?? false;
  const exempt = entry.tags?.includes('expects-failed-request') ?? false;
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
  if (!exempt) {
    page.on('console', (message) => {
      if (message.type() === 'error') problems.push(`console error: ${message.text()}`);
    });
    page.on('requestfailed', (request) =>
      problems.push(`request failed: ${request.method()} ${request.url()}`),
    );
    page.on('response', (response) => {
      if (response.status() >= 400)
        problems.push(`response ${response.status()}: ${response.url()}`);
    });
  }
  try {
    await page.goto(`${BASE}/iframe.html?id=${entry.id}&viewMode=story&globals=theme:${theme}`);
    await page.waitForFunction(
      () =>
        document.body.classList.contains('sb-show-main') ||
        document.body.classList.contains('sb-show-errordisplay'),
      undefined,
      { timeout: 20_000 },
    );
    if (await page.evaluate(() => document.body.classList.contains('sb-show-errordisplay')))
      problems.push(`story error: ${(await page.locator('#error-message').innerText()).trim()}`);
    await page.evaluate(async () => document.fonts.ready);
    await page.waitForTimeout(400);
    const { violations } = await new AxeBuilder({ page })
      .disableRules(lowContrast ? [...PAGE_RULES, 'color-contrast'] : PAGE_RULES)
      .analyze();
    for (const v of violations) {
      problems.push(`axe ${v.id}: ${v.help} (${v.nodes.length} node(s))`);
      if (DETAIL)
        for (const n of v.nodes)
          problems.push(
            `  ${n.target.join(' ')} :: ${n.html.slice(0, 110)} :: ${JSON.stringify(n.any[0]?.data ?? {}).slice(0, 220)}`,
          );
    }
  } catch (error) {
    problems.push(`did not render: ${(error as Error).message.split('\n')[0]}`);
  } finally {
    await context.close();
  }
  return [...new Set(problems)];
}

test('every story loads clean', async () => {
  test.setTimeout(0);
  const index = (await (await fetch(`${BASE}/index.json`)).json()) as {
    entries: Record<string, IndexEntry>;
  };
  const stories = Object.values(index.entries).filter(
    (entry) => entry.type === 'story' && (!ONLY || entry.id.includes(ONLY)),
  );
  expect(stories.length, 'stories found in index.json').toBeGreaterThan(0);

  const browser = await connect();
  const jobs = stories.flatMap((entry) => THEMES.map((theme) => ({ entry, theme })));
  const failures: string[] = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: WORKERS }, async () => {
      while (next < jobs.length) {
        const { entry, theme } = jobs[next++]!;
        const problems = await checkStory(browser, entry, theme);
        const label = `${entry.id} [${theme}]`;
        // oxlint-disable-next-line no-console -- a manual check; its output is the report
        console.log(`${problems.length ? 'FAIL' : 'ok  '} ${label}`);
        if (problems.length) failures.push(`${label}\n  ${problems.join('\n  ')}`);
      }
    }),
  );
  await browser.close();
  // oxlint-disable-next-line no-console -- a manual check; its output is the report
  console.log(`\n${jobs.length - failures.length} of ${jobs.length} story loads clean`);
  expect(failures, failures.join('\n')).toEqual([]);
});
