import type { Page, Route } from '@playwright/test';
import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAgainAs } from './session';
import { type Coven, seedCoven, withSql } from './stories/coven-ingredients';

// The demo coven's warning belongs to the demo coven: once a switch to another coven starts, it is gone while
// that coven loads, and switching into the demo coven shows no warning until the demo coven arrives.

const DEMO_SLUG = 'sorrel-and-salt-demo';
const DEMO_NAME = 'Sorrel & Salt Demo';

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

/** Holds back every server-component answer from `hold()` until `release()`. */
async function holdServerAnswers(page: Page) {
  const held: Route[] = [];
  let holding = false;
  let navigations = 0;
  await page.route('**/*', async (route) => {
    const request = route.request();
    const headers = request.headers();
    const rsc = headers.rsc === '1' || new URL(request.url()).searchParams.has('_rsc');
    if (!holding || !rsc) return route.fallback();
    if (headers['next-router-prefetch'] !== '1') navigations += 1;
    held.push(route);
  });
  return {
    hold() {
      holding = true;
      navigations = 0;
    },
    navigations: () => navigations,
    async release() {
      holding = false;
      for (const route of held.splice(0)) await route.fallback();
    },
  };
}

const demoNotice = (page: Page) => page.getByRole('region', { name: 'Demo Coven' });

test('the demo warning leaves when a switch to another coven starts, and is not there when switching into the demo coven', async ({
  page,
}) => {
  const other: Coven = await seedCoven(page, 'Fixture Coven Demo Switch', 'demo-switch.test', {
    A: 'owner',
  });
  const viewer = other.users.A;
  await withSql(async (sql) => {
    const [demo] = await sql`select id from workspaces where demo and deleted_at is null`;
    await sql`
      insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
      values (${demo.id}, ${viewer}, 'viewer', ${viewer}, ${viewer})`;
  });

  await signInAgainAs(page, viewer);
  await page.goto(`/coven/${DEMO_SLUG}/ingredients`);
  const switcher = page.getByRole('combobox', { name: 'Coven', exact: true });
  // Why the warning could stay: the demo coven shows it at rest.
  await expect(demoNotice(page)).toHaveCount(1);

  const server = await holdServerAnswers(page);
  server.hold();
  await switcher.click();
  await page.getByRole('option', { name: 'Fixture Coven Demo Switch', exact: true }).click();
  await expect.poll(server.navigations).toBeGreaterThan(0);
  await expect(switcher).toHaveAttribute('aria-busy', 'true');
  // Still the demo coven's address: the other coven has not rendered.
  expect(new URL(page.url()).pathname).toBe(`/coven/${DEMO_SLUG}/ingredients`);
  await expect(demoNotice(page)).toHaveCount(0);
  await server.release();
  await expect(page).toHaveURL(`/coven/${other.slug}/ingredients`);
  await expect(demoNotice(page)).toHaveCount(0);

  // The reverse: nothing of the demo coven shows while it loads, and it shows once it has.
  server.hold();
  await switcher.click();
  await page.getByRole('option', { name: DEMO_NAME, exact: true }).click();
  await expect.poll(server.navigations).toBeGreaterThan(0);
  await expect(demoNotice(page)).toHaveCount(0);
  await server.release();
  await expect(page).toHaveURL(`/coven/${DEMO_SLUG}/ingredients`);
  await expect(demoNotice(page)).toHaveCount(1);
});
