import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAs } from './session';
import { holdServerAnswers } from './hold-server-answers';

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

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

type Press = { nav?: string; link: string };

// From the Keepers index, which is shorter than each skeleton below: the documents editor (a keeper section), the
// compendium curation page by way of the Curator index (a keeper section), and the public compendium (the site's main).
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
    const server = await holdServerAnswers(page, { prefetch: 'hold' });
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
