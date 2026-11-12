import { test, expect } from './fixtures';
import { recreateE2eDatabase, withE2eSql } from './database';
import { holdPageScripts } from './hold-server-answers';
import { signInAs } from './session';
import { hydrated } from './waits';

// Text typed into a form's server HTML, before its scripts arrive, is the form's once it hydrates: Save
// opens for it and saves it. Each case holds the page's scripts, types, then lets them load. The two forms
// bind their fields differently (react-hook-form's register, and plain state), so a fix in one form alone
// leaves the other red.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('a title typed before the help form hydrates is saved with the article', async ({ page }) => {
  const typed = 'Fixturewort Typed Early';
  await signInAs(page, 'a-keeper@pre-hydration.test', ['discord'], 'admin');
  const scripts = await holdPageScripts(page);
  await page.goto('/keepers/help/new', { waitUntil: 'commit' });
  const title = page.getByRole('main').getByRole('textbox', { name: /^Title/ });
  await expect(title).toBeVisible();
  // Precondition: the page is still waiting on its scripts, so what follows is typed into server HTML.
  await expect.poll(scripts.held, 'the scripts are held').toBeGreaterThan(0);
  await title.fill(typed);

  scripts.release();
  await hydrated(page, '.help-article-form input[name="title"]');
  await expect(title).toHaveValue(typed);
  await expect(page.getByRole('button', { name: 'Save Article' })).toBeEnabled();

  // The body's editor exists only once hydrated, so it is written now.
  await page.getByRole('main').getByRole('textbox', { name: 'Body', exact: true }).click();
  await page.keyboard.type('A body written after hydration.');
  await page.getByRole('button', { name: 'Save Article' }).click();
  await expect(page).toHaveURL(/\/keepers\/help(\?|$)/);
  const saved = await withE2eSql(
    (sql) => sql`select 1 from help_articles where title = ${typed} and deleted_at is null`,
  );
  expect(saved, 'one live article carries the typed title').toHaveLength(1);
});

test('a name typed before the account page hydrates is saved', async ({ page }) => {
  const typed = 'Fixturewort Early Name';
  const { userId } = await signInAs(page, 'a-member@pre-hydration.test');
  const scripts = await holdPageScripts(page);
  await page.goto('/account', { waitUntil: 'commit' });
  const name = page.getByRole('textbox', { name: /^Name/ });
  await expect(name).toBeVisible();
  // Precondition: the page is still waiting on its scripts, and the name is not already the typed one.
  await expect.poll(scripts.held, 'the scripts are held').toBeGreaterThan(0);
  await expect(name).not.toHaveValue(typed);
  await name.fill(typed);

  scripts.release();
  await hydrated(page, '.name-form input');
  await expect(name).toHaveValue(typed);
  const save = page.getByRole('button', { name: 'Save Name' });
  await expect(save).toBeEnabled();
  await save.click();
  await expect(save).toBeDisabled();
  const [user] = await withE2eSql((sql) => sql`select name from users where id = ${userId}`);
  expect(user?.name, 'the saved name is the typed one').toBe(typed);
});
