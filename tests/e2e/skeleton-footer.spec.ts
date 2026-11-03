import type { Page, Route } from '@playwright/test';
import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAs } from './session';

// A skeleton taller than the page it is laid over still pushes the footer down: while a navigation from the short
// Keepers index is on its way, everything the waiting main draws ends above the footer's top.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

/** Holds back every React Server Components answer once `hold()` is called, until `release()`. */
async function holdServerAnswers(page: Page) {
  const held: Route[] = [];
  let holding = false;
  await page.route('**/*', async (route) => {
    const request = route.request();
    const rsc = request.headers().rsc === '1' || new URL(request.url()).searchParams.has('_rsc');
    if (!holding || !rsc) return route.fallback();
    held.push(route);
  });
  return {
    hold() {
      holding = true;
    },
    async release() {
      holding = false;
      for (const route of held.splice(0)) await route.fallback();
    },
  };
}

/** The lowest edge, in page coordinates, of the waiting main and everything it draws, and the footer's top edge. */
const edges = (page: Page) =>
  page.evaluate(() => {
    const main = document.querySelector('main:has(output)');
    const footer = document.querySelector('footer');
    if (!main || !footer) throw new Error('No waiting main or no footer');
    const bottoms = [main, ...main.querySelectorAll('*')].map(
      (element) => element.getBoundingClientRect().bottom,
    );
    return {
      skeletonBottom: Math.max(...bottoms) + window.scrollY,
      footerTop: footer.getBoundingClientRect().top + window.scrollY,
    };
  });

/** A link to press: in the named navigation, or in the page's main when `nav` is absent. */
type Press = { nav?: string; link: string };

// From the Keepers index, which is shorter than each skeleton below: the documents editor (an admin section), the
// compendium curation page by way of the Curator index (an admin section), and the public compendium (the site's main).
const destinations: readonly { name: string; presses: readonly Press[] }[] = [
  { name: 'the documents editor', presses: [{ nav: 'Keepers', link: 'Documents' }] },
  {
    name: 'the compendium curation page',
    presses: [{ nav: 'Site', link: 'Curator' }, { link: 'Compendium' }],
  },
  { name: 'the public compendium', presses: [{ nav: 'Site', link: 'Compendium' }] },
];

for (const [index, { name, presses }] of destinations.entries()) {
  test(`the skeleton for ${name} ends above the footer while it waits`, async ({ page }) => {
    await signInAs(page, `admin-${index}@skeleton-footer.test`, ['discord'], 'admin');
    expect((await page.goto('/keepers'))?.status()).toBe(200);
    const server = await holdServerAnswers(page);
    for (const [step, { nav, link }] of presses.entries()) {
      const area = nav ? page.getByRole('navigation', { name: nav }) : page.getByRole('main');
      const last = step === presses.length - 1;
      if (last) server.hold();
      await area.getByRole('link', { name: link, exact: true }).click();
      // The page in between arrives in full before the next press: its own heading, and no wait.
      if (!last) await expect(page.getByRole('heading', { level: 1, name: link })).toBeVisible();
    }
    await expect(page.getByRole('main').getByRole('status')).toHaveCount(1);

    const { skeletonBottom, footerTop } = await edges(page);
    expect(skeletonBottom).toBeLessThanOrEqual(footerTop);
    await server.release();
  });
}
