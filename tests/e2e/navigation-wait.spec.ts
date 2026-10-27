import type { Locator, Page, Route } from '@playwright/test';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAgainAs, signInAs } from './session';
import { slotUrl } from './slots';
import { slugify } from '@/lib/slugify';
import {
  type Coven,
  cardsIn,
  compendiumList,
  ingredientList,
  localIngredient,
  rowOf,
  seedCoven,
  withSql,
} from './stories/coven-ingredients';

// Every wait looks the same (M12.33; claude-docs/design-decisions/m12.33-plan.md),
// against the built server with the server's answer held back, so the wait
// lasts until the test lets it end. Three navigations, each a different part
// of the page: a coven switch (the coven's body), a section link (the same),
// and a site link (the shell's whole body). During each, the pressed control
// is busy, the old page is gone, one status stands in its place, and axe
// passes; once it ends the new page is there, and after a switch the focus
// is back on the switcher, whose layout remounted under it. A run under
// reduced motion proves every moving loading mark is the one shared pulse.
//
// What this does not repeat: a direct request to a coven by a non-member is
// still a 404, which a Suspense boundary above the guard would turn into a
// 200. tests/e2e/coven-ingredients.spec.ts ("a non-member is told the page
// does not exist") and tests/e2e/coven.spec.ts prove it on every run.

/** The keyframes every loading mark pulses with under reduced motion (the owner's call). */
const PULSE = 'loading-pulse';

const HOLLOW = 'Fixture Coven Hollow';
const WILLOW = 'Fixture Coven Willow';
// Invented, so no seed can ever hold them (M1.25).
const HOLLOW_ENTRY = 'Hollowwort';
const WILLOW_ENTRY = 'Willowwort';

let hollow: Coven;
let willow: Coven;
let viewer = '';
let admin = '';

test.beforeAll(async ({ browser, slot }) => {
  await recreateE2eDatabase();

  // Only the rows matter: the page and its session are thrown away, and each
  // test signs in again for itself.
  const setup = await browser.newPage({ baseURL: slotUrl(slot) });
  try {
    hollow = await seedCoven(setup, HOLLOW, 'navigation-wait.test', { A: 'owner' });
    viewer = hollow.users.A;
    admin = (await signInAs(setup, 'admin@navigation-wait.test', ['discord'], 'admin')).userId;
    // A owns a second coven too, so the switcher has somewhere to go.
    const willowId = await withSql(async (sql) => {
      const [workspace] = await sql<{ id: string }[]>`
        insert into workspaces (name, slug, created_by, updated_by)
        values (${WILLOW}, ${slugify(WILLOW)}, ${viewer}, ${viewer})
        returning id`;
      await sql`
        insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
        values (${workspace.id}, ${viewer}, 'owner', ${viewer}, ${viewer})`;
      // The switcher offers Create Coven only to a holder of the right.
      await sql.begin(async (tx) => {
        await tx`select set_config('app.privilege_route', 'manual', true)`;
        await tx`update users set can_create_workspace = true where id = ${viewer}`;
      });
      await localIngredient(sql, hollow.id, viewer, { name: HOLLOW_ENTRY });
      await localIngredient(sql, workspace.id, viewer, { name: WILLOW_ENTRY });
      return workspace.id;
    });
    willow = { id: willowId, slug: slugify(WILLOW), users: { A: viewer } };
  } finally {
    await setup.close();
  }
});

/**
 * Holds back every React Server Components answer from the moment `hold()`
 * is called, so a client navigation stays on its way until `release()`. A
 * prefetch is held too, so none can answer the navigation early; `navigations`
 * counts only the requests a navigation made, which is how a test knows its
 * press has actually set one off.
 */
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

const switcher = (page: Page): Locator =>
  page.getByRole('combobox', { name: 'Coven', exact: true });
const covenNav = (page: Page): Locator => page.getByRole('navigation', { name: 'Coven' });
const siteNav = (page: Page): Locator => page.getByRole('navigation', { name: 'Site' });

/** The one status the waiting region carries, in the page's one main landmark. */
const statuses = (page: Page): Locator => page.getByRole('main').getByRole('status');

/** Opens a coven's Ingredients page signed in as A, its one card drawn. */
async function openIngredients(page: Page, coven: Coven, entry: string): Promise<void> {
  await signInAgainAs(page, viewer);
  const response = await page.goto(`/coven/${coven.slug}/ingredients`);
  expect(response?.status()).toBe(200);
  await expect(rowOf(ingredientList(page), entry)).toHaveCount(1);
}

/**
 * Nothing loading moves on a page at rest, so whatever moves during a wait is
 * the wait's; this also lets the last page's fade-in finish first.
 */
async function expectStill(page: Page): Promise<void> {
  await expect.poll(async () => (await runningAnimations(page)).length).toBe(0);
}

/** Picks another coven in the switcher. */
async function pickCoven(page: Page, name: string): Promise<void> {
  await switcher(page).click();
  await page.getByRole('option', { name, exact: true }).click();
}

/**
 * The page's running loading animations: each CSS animation on the
 * document's own timeline (a scroll-driven one, the sorrel's, is not a wait),
 * by its keyframes' name and whether it sits in the main landmark.
 */
function runningAnimations(page: Page) {
  return page.evaluate(() =>
    document
      .getAnimations()
      .filter(
        (animation): animation is CSSAnimation =>
          animation instanceof CSSAnimation &&
          animation.playState === 'running' &&
          animation.timeline === document.timeline,
      )
      .map((animation) => {
        const target = (animation.effect as KeyframeEffect | null)?.target;
        return {
          name: animation.animationName,
          inMain: Boolean(target instanceof Element && target.closest('main')),
        };
      }),
  );
}

test('a coven switch takes the old coven away at once, marks the switcher busy, and gives the focus back once the new coven renders', async ({
  page,
}) => {
  await openIngredients(page, hollow, HOLLOW_ENTRY);
  const server = await holdServerAnswers(page);
  // Why the switch could go: A is a member of both, and the switcher is idle.
  await expect(switcher(page)).toHaveText(HOLLOW);
  await expect(switcher(page)).not.toHaveAttribute('aria-busy', 'true');

  server.hold();
  await pickCoven(page, WILLOW);
  await expect.poll(server.navigations).toBeGreaterThan(0);

  // Control: busy, showing the pick.
  await expect(switcher(page)).toHaveAttribute('aria-busy', 'true');
  await expect(switcher(page)).toHaveText(WILLOW);
  // Region: the old coven's cards are gone, one status in their place.
  await expect(cardsIn(ingredientList(page))).toHaveCount(0);
  await expect(statuses(page)).toHaveCount(1);
  // Still the old address: the new coven has not rendered.
  expect(new URL(page.url()).pathname).toBe(`/coven/${hollow.slug}/ingredients`);
  await assertNoAccessibilityViolations(page);

  await server.release();

  await expect(page).toHaveURL(`/coven/${willow.slug}/ingredients`);
  await expect(rowOf(ingredientList(page), WILLOW_ENTRY)).toHaveCount(1);
  await expect(rowOf(ingredientList(page), HOLLOW_ENTRY)).toHaveCount(0);
  await expect(switcher(page)).not.toHaveAttribute('aria-busy', 'true');
  await expect(switcher(page)).toHaveText(WILLOW);
  await expect(switcher(page)).toBeFocused();
});

test("a section link takes the coven's page away at once and puts one status in its place", async ({
  page,
}) => {
  await openIngredients(page, hollow, HOLLOW_ENTRY);
  const server = await holdServerAnswers(page);

  server.hold();
  await covenNav(page).getByRole('link', { name: 'Members', exact: true }).click();
  await expect.poll(server.navigations).toBeGreaterThan(0);

  await expect(cardsIn(ingredientList(page))).toHaveCount(0);
  await expect(statuses(page)).toHaveCount(1);
  expect(new URL(page.url()).pathname).toBe(`/coven/${hollow.slug}/ingredients`);

  await server.release();

  await expect(page).toHaveURL(`/coven/${hollow.slug}/members`);
  await expect(page.getByRole('main').getByRole('table')).toBeVisible();
});

test("a site link takes the shell's page away at once and puts one status in its place", async ({
  page,
}) => {
  await openIngredients(page, hollow, HOLLOW_ENTRY);
  const server = await holdServerAnswers(page);

  server.hold();
  await siteNav(page).getByRole('link', { name: 'Compendium', exact: true }).click();
  await expect.poll(server.navigations).toBeGreaterThan(0);

  await expect(cardsIn(ingredientList(page))).toHaveCount(0);
  await expect(statuses(page)).toHaveCount(1);
  expect(new URL(page.url()).pathname).toBe(`/coven/${hollow.slug}/ingredients`);
  await assertNoAccessibilityViolations(page);

  await server.release();

  await expect(page).toHaveURL('/compendium');
  await expect(compendiumList(page)).toBeVisible();
});

// The three below start from a control that the wait itself takes away: the
// region they aim at holds the link that was pressed, so the swap unmounts it.
// The wait must still last until the server answers (the navigation provider
// owns it, not the link).

test("an admin nav link keeps the admin page's wait until the server answers, though the nav is swapped out", async ({
  page,
}) => {
  await signInAgainAs(page, admin);
  await page.goto('/admin/categories');
  const pills = page.getByRole('navigation', { name: 'Categories', exact: true });
  await expect(pills).toBeVisible();
  const link = page
    .getByRole('navigation', { name: 'Admin', exact: true })
    .getByRole('link', { name: 'Forms', exact: true });
  const href = await link.getAttribute('href');
  expect(href).toMatch(/^\/admin\//);
  const server = await holdServerAnswers(page);

  server.hold();
  await link.click();
  await expect.poll(server.navigations).toBeGreaterThan(0);

  await expect(statuses(page)).toHaveCount(1);
  await expect(pills).toHaveCount(0);
  // Held for a while, not flashed: the old page does not come back.
  await page.waitForTimeout(500);
  await expect(statuses(page)).toHaveCount(1);
  await expect(pills).toHaveCount(0);
  expect(new URL(page.url()).pathname).toBe('/admin/categories');
  await assertNoAccessibilityViolations(page);

  await server.release();

  await expect(page).toHaveURL(href!);
  // The arrived page is the Forms list, which has a status of its own (its
  // Group field's choices), so the wait is told gone by the table it drew.
  await expect(page.getByRole('main').getByRole('table')).toBeVisible();
  await expect(pills).toHaveCount(0);
});

test("a Contents link on the coven home keeps the coven's wait until the server answers, though the home is swapped out", async ({
  page,
}) => {
  await signInAgainAs(page, viewer);
  await page.goto(`/coven/${hollow.slug}`);
  const contents = page.getByRole('heading', { name: 'Contents', exact: true });
  await expect(contents).toBeVisible();
  const server = await holdServerAnswers(page);

  server.hold();
  await page.getByRole('main').getByRole('link', { name: 'Ingredients', exact: true }).click();
  await expect.poll(server.navigations).toBeGreaterThan(0);

  await expect(statuses(page)).toHaveCount(1);
  await expect(contents).toHaveCount(0);
  // That the wait is held for a while, not flashed, is the admin nav test's: the three share one path.
  expect(new URL(page.url()).pathname).toBe(`/coven/${hollow.slug}`);

  await server.release();

  await expect(page).toHaveURL(`/coven/${hollow.slug}/ingredients`);
  await expect(rowOf(ingredientList(page), HOLLOW_ENTRY)).toHaveCount(1);
});

test("Create Coven in the switcher keeps the shell's wait until the server answers, though the switcher is swapped out", async ({
  page,
}) => {
  await openIngredients(page, hollow, HOLLOW_ENTRY);
  const server = await holdServerAnswers(page);

  server.hold();
  await switcher(page).click();
  await page.getByRole('option', { name: 'Create Coven', exact: true }).click();
  await expect.poll(server.navigations).toBeGreaterThan(0);

  await expect(statuses(page)).toHaveCount(1);
  await expect(cardsIn(ingredientList(page))).toHaveCount(0);
  // That the wait is held for a while, not flashed, is the admin nav test's: the three share one path.
  expect(new URL(page.url()).pathname).toBe(`/coven/${hollow.slug}/ingredients`);

  await server.release();

  await expect(page).toHaveURL('/coven/new');
  await expect(page.getByRole('heading', { level: 1, name: 'Create Coven' })).toBeVisible();
});

test('under reduced motion, every loading mark of a wait pulses with the one shared keyframes', async ({
  page,
}) => {
  await openIngredients(page, hollow, HOLLOW_ENTRY);
  const server = await holdServerAnswers(page);

  // Why the names below are reduced motion's doing: with motion allowed,
  // the same wait moves with marks of other keyframes (the spinner's
  // turn, the skeleton's shimmer).
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expectStill(page);
  server.hold();
  await pickCoven(page, WILLOW);
  await expect.poll(server.navigations).toBeGreaterThan(0);
  // The bar and the spinner come after their 100ms delay.
  await expect
    .poll(async () => {
      const running = await runningAnimations(page);
      return running.some(({ inMain }) => inMain) && running.some(({ inMain }) => !inMain);
    })
    .toBe(true);
  const moving = await runningAnimations(page);
  expect(moving.some(({ name }) => name !== PULSE)).toBe(true);
  await server.release();
  await expect(page).toHaveURL(`/coven/${willow.slug}/ingredients`);
  await expect(rowOf(ingredientList(page), WILLOW_ENTRY)).toHaveCount(1);
  await expectStill(page);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  server.hold();
  await pickCoven(page, HOLLOW);
  await expect.poll(server.navigations).toBeGreaterThan(0);
  // The skeleton in the main landmark; the bar and the switcher's spinner outside it.
  await expect
    .poll(async () => {
      const running = await runningAnimations(page);
      return {
        inMain: running.some(({ inMain }) => inMain),
        outside: running.filter(({ inMain }) => !inMain).length >= 2,
        // `loading-appear` holds a mark hidden for its delay: no motion, and
        // it ends once the mark shows.
        held: running.some(({ name }) => name === 'loading-appear'),
      };
    })
    .toEqual({ inMain: true, outside: true, held: false });
  const pulsing = await runningAnimations(page);
  expect([...new Set(pulsing.map(({ name }) => name))]).toEqual([PULSE]);

  await server.release();
  await expect(page).toHaveURL(`/coven/${hollow.slug}/ingredients`);
});

// Signed out, the public frame's body answers a move between public pages
// as the shell's does (M12.47): the page gives way to the destination's
// skeleton under the frame's bar and nav, in the page's one main landmark.
// What these do not repeat: a retired slug still answers 308 on a direct
// request, which tests/e2e/compendium-entry.spec.ts proves on every run.

/** A signed-out visitor's page: the frame's way in is in the bar. */
async function expectSignedOut(page: Page): Promise<void> {
  await expect(page.getByRole('banner').getByRole('link', { name: 'Sign In' })).toBeVisible();
}

/** The public frame's chrome, which stays through a wait. */
async function expectFrameStanding(page: Page): Promise<void> {
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(siteNav(page).getByRole('link', { name: 'Compendium', exact: true })).toBeVisible();
}

/** One main landmark, one level-one heading and one status, as at every wait. */
async function expectOneWait(page: Page): Promise<void> {
  await expect(page.getByRole('main')).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(statuses(page)).toHaveCount(1);
}

/** The first card's entry on the public Compendium: its address and its name. */
async function firstEntry(page: Page): Promise<{ href: string; name: string }> {
  const link = compendiumList(page).locator('a[href^="/compendium/ingredients/"]').first();
  const href = await link.getAttribute('href');
  expect(href).toBeTruthy();
  return { href: href!, name: (await link.innerText()).trim() };
}

test("signed out, the Compendium link takes an entry's page away at once and puts the Compendium's cards in its place", async ({
  page,
}) => {
  await page.goto('/compendium');
  const { href } = await firstEntry(page);
  const response = await page.goto(href);
  expect(response?.status()).toBe(200);
  await expectSignedOut(page);
  const title = page.getByRole('heading', { level: 1 });
  await expect(title).toHaveCount(1);
  const name = await title.innerText();
  // Why a wait has something to take away: the entry's own heading is the page's.
  expect(name).not.toBe('Loading');
  const server = await holdServerAnswers(page);

  server.hold();
  await siteNav(page).getByRole('link', { name: 'Compendium', exact: true }).click();
  await expect.poll(server.navigations).toBeGreaterThan(0);

  await expect(page.getByRole('heading', { level: 1, name, exact: true })).toHaveCount(0);
  await expectOneWait(page);
  await expectFrameStanding(page);
  expect(new URL(page.url()).pathname).toBe(href);
  await assertNoAccessibilityViolations(page);

  await server.release();

  await expect(page).toHaveURL('/compendium');
  await expect(compendiumList(page)).toBeVisible();
  await expect(page.getByRole('main')).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
});

test("signed out, a card takes the Compendium away at once and puts an entry's page in its place", async ({
  page,
}) => {
  const response = await page.goto('/compendium');
  expect(response?.status()).toBe(200);
  await expectSignedOut(page);
  const { href, name } = await firstEntry(page);
  const server = await holdServerAnswers(page);

  server.hold();
  await compendiumList(page).locator(`a[href="${href}"]`).click();
  await expect.poll(server.navigations).toBeGreaterThan(0);

  await expect(compendiumList(page)).toHaveCount(0);
  await expectOneWait(page);
  await expectFrameStanding(page);
  expect(new URL(page.url()).pathname).toBe('/compendium');

  await server.release();

  await expect(page).toHaveURL(href);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(name);
  await expect(page.getByRole('main')).toHaveCount(1);
});

test("signed out under reduced motion, the public frame's wait pulses with the one shared keyframes and nothing else moves", async ({
  page,
}) => {
  await page.goto('/compendium');
  const { href } = await firstEntry(page);
  await page.goto(href);
  await expectSignedOut(page);
  const server = await holdServerAnswers(page);
  const press = () => siteNav(page).getByRole('link', { name: 'Compendium', exact: true }).click();

  // Why the name below is reduced motion's doing: with motion allowed, the
  // same wait's skeleton moves with the shimmer's keyframes.
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expectStill(page);
  server.hold();
  await press();
  await expect.poll(server.navigations).toBeGreaterThan(0);
  await expect
    .poll(async () => (await runningAnimations(page)).some(({ inMain }) => inMain))
    .toBe(true);
  expect((await runningAnimations(page)).some(({ inMain, name }) => inMain && name !== PULSE)).toBe(
    true,
  );
  await server.release();
  await expect(page).toHaveURL('/compendium');
  await expect(compendiumList(page)).toBeVisible();

  await page.goto(href);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expectStill(page);
  server.hold();
  await press();
  await expect.poll(server.navigations).toBeGreaterThan(0);
  await expect
    .poll(async () => {
      const running = await runningAnimations(page);
      return {
        inMain: running.some(({ inMain }) => inMain),
        held: running.some(({ name }) => name === 'loading-appear'),
      };
    })
    .toEqual({ inMain: true, held: false });
  const pulsing = await runningAnimations(page);
  expect([...new Set(pulsing.map(({ name }) => name))]).toEqual([PULSE]);

  await server.release();
  await expect(page).toHaveURL('/compendium');
  await expect(compendiumList(page)).toBeVisible();
});

test('signed out, a direct request for an unknown entry still answers 404 with the page the server drew', async ({
  page,
}) => {
  // Why the 404 is the slug's: the route answers a known one with 200.
  await page.goto('/compendium');
  const { href } = await firstEntry(page);
  expect((await page.request.get(href)).status()).toBe(200);

  const response = await page.goto('/compendium/ingredients/fixture-no-such-wort');

  // A route-level Suspense boundary would have sent a 200 before the page knew.
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
});
