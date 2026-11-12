import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase, withE2eSql } from './database';
import { insertHelpArticle } from '../support/db/insert-help-article';
import { slugify } from '@/lib/slugify';
import { signInAgainAs, signInAs } from './session';
import { seedCoven } from './stories/coven-ingredients';
import { hydrated } from './waits';

// The keepers' help outline and its full-page form: every help row at every audience, written by a keeper alone
// (claude-docs/design-decisions/support.md, "Audiences, staff routes and search"; claude-docs/design/graphql.md, "Help articles").

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

const PATH = '/keepers/help';
const PARENT = 'Fixturewort Parent Guide';
const SUB_PARENT = 'Fixturewort Sub Page Guide';
const SUB_CHILD = 'Fixturewort Staff Sub Page';
const HELD_PARENT = 'Fixturewort Held Guide';
const HELD_CHILD = 'Fixturewort Held Sub Page';
const GONE_PARENT = 'Fixturewort Gone Guide';
const GONE_CHILD = 'Fixturewort Gone Sub Page';

const notAuthorized = (page: Page) =>
  page.getByRole('main').getByRole('heading', { level: 1, name: 'Not Authorized' });

const addLink = (page: Page) =>
  page.getByRole('main').getByRole('link', { name: 'Add Help Article' });

const editLink = (page: Page, title: string) =>
  page.getByRole('main').getByRole('link', { name: `Edit ${title}`, exact: true });

/** Searches the outline for the row and says whether a result is it. */
async function findRow(page: Page, title: string): Promise<boolean> {
  await page.goto(`${PATH}?q=${encodeURIComponent(title)}&shown=all`);
  // A search with no hit draws a sentence in place of the table, so the pane's heading says the search is done.
  await expect(
    page.getByRole('main').getByRole('heading', { level: 2, name: 'Search Results' }),
  ).toBeVisible();
  return (await editLink(page, title).count()) > 0;
}

const expectListed = async (page: Page, title: string) =>
  expect(await findRow(page, title), `${title} is found in the outline`).toBe(true);

const expectNotListed = async (page: Page, title: string) =>
  expect(await findRow(page, title), `${title} is not found in the outline`).toBe(false);

const title = (page: Page) => page.getByRole('main').getByRole('textbox', { name: /^Title/ });

/** The body's editor takes typed text, as a keeper writes it. */
async function writeBody(page: Page, text: string): Promise<void> {
  await page.getByRole('main').getByRole('textbox', { name: 'Body', exact: true }).click();
  await page.keyboard.type(text);
}

// A chip's radios are in its menu, out of the accessibility tree while it is shut, so the hidden ones are counted too.
const chipRadio = (page: Page, legend: RegExp, name: string) =>
  page
    .getByRole('main')
    .getByRole('group', { name: legend })
    .getByRole('radio', { name, includeHidden: true });

const audience = (page: Page, name: string) => chipRadio(page, /^Audience/, name);

/** Opens the chip's menu and presses the option's label, as a keeper does: the menu's native radio is drawn invisible. */
async function choose(page: Page, legend: RegExp, name: string): Promise<void> {
  await page.getByRole('main').getByRole('group', { name: legend }).locator('summary').click();
  await chipRadio(page, legend, name).locator('xpath=ancestor::label[1]').click();
  await expect(chipRadio(page, legend, name)).toBeChecked();
}

/** Leaves the form for the outline it returns to. */
const expectBackAtOutline = (page: Page) => expect(page).toHaveURL(/\/keepers\/help(\?|$)/);

async function openEdit(page: Page, name: string): Promise<void> {
  await expectListed(page, name);
  await editLink(page, name).click();
  await hydrated(page, FORM_TITLE);
  await expect(title(page)).toHaveValue(name);
}

const FORM_TITLE = '.help-article-form input[name="title"]';

/** Writes a public guide, and under it a staff sub page when `child` is named, as the keeper `author`. */
async function seedGuide(author: string, parent: string, child?: string): Promise<void> {
  await withE2eSql(async (sql) => {
    const parentId = await insertHelpArticle(
      sql,
      { kind: 'guide', audience: 'public', title: parent, slug: slugify(parent) },
      author,
    );
    if (child)
      await insertHelpArticle(
        sql,
        {
          kind: 'article',
          audience: 'staff',
          title: child,
          slug: slugify(child),
          parent_id: parentId,
        },
        author,
      );
  });
}

test('a keeper writes a guide on the form’s own page', async ({ page }) => {
  await signInAs(page, 'a-keeper-writes@admin-help.test', ['discord'], 'admin');

  const response = await page.goto(PATH);
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeVisible();
  // Precondition: no search finds the row yet, so the row below is one this test wrote.
  await expectNotListed(page, PARENT);
  await page.goto(PATH);
  await assertNoAccessibilityViolations(page);

  // A public guide, as only a guide holds sub pages.
  await hydrated(page, 'a[href$="/keepers/help/new"]');
  await addLink(page).click();
  await expect(page).toHaveURL(`${PATH}/new`);
  await hydrated(page, FORM_TITLE);
  await choose(page, /^Kind/, 'Guide');
  await title(page).fill(PARENT);
  await page
    .getByRole('main')
    .getByRole('textbox', { name: /^Summary/ })
    .fill('A guide the test writes.');
  await writeBody(page, 'A paragraph the test writes.');
  await assertNoAccessibilityViolations(page);
  await page.getByRole('button', { name: 'Save Guide' }).click();
  await expectBackAtOutline(page);
  await expectListed(page, PARENT);
});

test('a keeper adds a staff sub page from a guide’s pane, and a reserved title is refused at its field', async ({
  page,
}) => {
  const { userId } = await signInAs(page, 'a-keeper-subpage@admin-help.test', ['discord'], 'admin');
  await seedGuide(userId, SUB_PARENT);
  await expectNotListed(page, SUB_CHILD);

  // Added from the guide's pane, so it starts under the guide, at the narrower staff audience.
  await page.goto(PATH);
  await hydrated(page, `a[href^="${PATH}"]`);
  await page
    .getByRole('navigation', { name: 'Help Outline' })
    .getByRole('link', { name: SUB_PARENT })
    .click();
  // The pane redraws after the press, and until then its Add Sub Page belongs to the first guide.
  await expect(
    page.getByRole('main').getByRole('heading', { level: 2, name: SUB_PARENT }),
  ).toBeVisible();
  await page.getByRole('main').getByRole('link', { name: 'Add Sub Page' }).click();
  await hydrated(page, FORM_TITLE);
  await expect(page.getByRole('main').getByRole('combobox', { name: /^Parent/ })).toHaveText(
    new RegExp(SUB_PARENT),
  );
  await title(page).fill(SUB_CHILD);
  await writeBody(page, 'A sub page the test writes.');
  await choose(page, /^Audience/, 'Staff');
  await page.getByRole('button', { name: 'Save Article' }).click();
  await expectBackAtOutline(page);
  await expect(
    page.getByRole('table', { name: `Sub Pages of ${SUB_PARENT}` }).getByRole('link', {
      name: `Edit ${SUB_CHILD}`,
      exact: true,
    }),
  ).toBeVisible();

  // A title that makes a reserved address is refused beside Title, and the form stays.
  await page.goto(`${PATH}/new`);
  // Hydrated first: a title typed into the server HTML never reaches the form, which then keeps Save disabled.
  await hydrated(page, FORM_TITLE);
  await title(page).fill('Glossary');
  await writeBody(page, 'A row the service refuses.');
  await page.getByRole('button', { name: 'Save Article' }).click();
  await expect(title(page)).toHaveAttribute('aria-invalid', 'true');
  await expect(page).toHaveURL(`${PATH}/new`);
  await assertNoAccessibilityViolations(page);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Discard Changes' }).click();
  await expectBackAtOutline(page);
});

test('a parent keeps its staff audience and is not deleted while a live sub page stands under it', async ({
  page,
}) => {
  const { userId } = await signInAs(page, 'a-keeper-held@admin-help.test', ['discord'], 'admin');
  await seedGuide(userId, HELD_PARENT, HELD_CHILD);

  // The parent cannot be made narrower than its staff sub page: Keeper is held.
  await openEdit(page, HELD_PARENT);
  await expect(audience(page, 'Keeper')).toBeDisabled();
  await expect(audience(page, 'Staff')).toBeEnabled();

  // A parent with a live sub page is not deleted: the refusal says why, and the form stays.
  await page.getByRole('button', { name: 'Delete Guide' }).click();
  await assertNoAccessibilityViolations(page);
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
  await expect(title(page)).toHaveValue(HELD_PARENT);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expectBackAtOutline(page);
  await expectListed(page, HELD_PARENT);
});

test('a keeper deletes a sub page, then its parent, each after its confirmation', async ({
  page,
}) => {
  const { userId } = await signInAs(page, 'a-keeper-deletes@admin-help.test', ['discord'], 'admin');
  await seedGuide(userId, GONE_PARENT, GONE_CHILD);

  await openEdit(page, GONE_CHILD);
  await page.getByRole('button', { name: 'Delete Article' }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expectBackAtOutline(page);
  await expectNotListed(page, GONE_CHILD);

  await openEdit(page, GONE_PARENT);
  await page.getByRole('button', { name: 'Delete Guide' }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expectBackAtOutline(page);
  await expectNotListed(page, GONE_PARENT);
});

// Why each could have reached it: the curator opens Support under the same Keepers layout, the practitioner opens
// their own coven, the observer their account, and every one is signed in.
test('a curator, a practitioner and an observer get the styled not-authorized page', async ({
  page,
}) => {
  await signInAs(page, 'a-curator@admin-help.test', ['discord'], 'curator');
  expect((await page.goto('/keepers/support'))?.status()).toBe(200);
  expect((await page.goto(PATH))?.status()).toBe(403);
  await expect(notAuthorized(page)).toBeVisible();
  await expect(addLink(page)).toHaveCount(0);
  await assertNoAccessibilityViolations(page);

  const coven = await seedCoven(page, 'Fixture Coven Help Keepers', 'admin-help-coven.test', {
    A: 'owner',
    B: 'member',
  });
  await signInAgainAs(page, coven.users.B);
  expect((await page.goto(`/coven/${coven.slug}`))?.status()).toBe(200);
  expect((await page.goto(PATH))?.status()).toBe(403);
  await expect(notAuthorized(page)).toBeVisible();
  await expect(addLink(page)).toHaveCount(0);

  // A signed-in account holds an observer seat in the demo coven and nothing else.
  await signInAs(page, 'an-observer@admin-help.test');
  expect((await page.goto('/account'))?.status()).toBe(200);
  expect((await page.goto(PATH))?.status()).toBe(403);
  await expect(notAuthorized(page)).toBeVisible();
  await expect(addLink(page)).toHaveCount(0);
});

test('a signed-out visitor is sent to sign in, and back to the page afterwards', async ({
  page,
}) => {
  await page.goto(PATH);
  await expect(page).toHaveURL(`/sign-in?next=${encodeURIComponent(PATH)}`);
});
