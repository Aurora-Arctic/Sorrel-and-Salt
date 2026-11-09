import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAgainAs, signInAs } from './session';
import { seedCoven } from './stories/coven-ingredients';

// The keepers' help outline and its full-page form: every help row at every audience, written by a keeper alone
// (claude-docs/design-decisions/support.md, "Audiences, staff routes and search"; claude-docs/design/graphql.md, "Help articles").

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

const PATH = '/keepers/help';
const PARENT = 'Fixturewort Parent Guide';
const CHILD = 'Fixturewort Staff Sub Page';

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
  await expect(title(page)).toHaveValue(name);
}

test('a keeper writes a parent and a narrower sub page, meets a refusal at its field, and deletes both', async ({
  page,
}) => {
  // Writes two rows and scans each form with axe, which outlasts the default budget under CI coverage.
  test.setTimeout(60_000);
  await signInAs(page, 'a-keeper@admin-help.test', ['discord'], 'admin');

  const response = await page.goto(PATH);
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeVisible();
  // Precondition: no search finds the rows yet, so each row below is one this test wrote.
  await expectNotListed(page, PARENT);
  await expectNotListed(page, CHILD);
  await page.goto(PATH);
  await assertNoAccessibilityViolations(page);

  // The parent: a public guide, written on the form's own page, as only a guide holds sub pages.
  await addLink(page).click();
  await expect(page).toHaveURL(`${PATH}/new`);
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

  // The sub page: added from the guide's pane, so it starts under the guide, at the narrower staff audience.
  await page.goto(PATH);
  await page
    .getByRole('navigation', { name: 'Help Outline' })
    .getByRole('link', { name: PARENT })
    .click();
  // The pane redraws after the press, and until then its Add Sub Page belongs to the first guide.
  await expect(
    page.getByRole('main').getByRole('heading', { level: 2, name: PARENT }),
  ).toBeVisible();
  await page.getByRole('main').getByRole('link', { name: 'Add Sub Page' }).click();
  await expect(page.getByRole('main').getByRole('combobox', { name: /^Parent/ })).toHaveText(
    new RegExp(PARENT),
  );
  await title(page).fill(CHILD);
  await writeBody(page, 'A sub page the test writes.');
  await choose(page, /^Audience/, 'Staff');
  await page.getByRole('button', { name: 'Save Article' }).click();
  await expectBackAtOutline(page);
  await expect(
    page.getByRole('table', { name: `Sub Pages of ${PARENT}` }).getByRole('link', {
      name: `Edit ${CHILD}`,
      exact: true,
    }),
  ).toBeVisible();

  // A title that makes a reserved address is refused beside Title, and the form stays.
  await page.goto(`${PATH}/new`);
  // Hydrated first: a title typed into the server HTML never reaches the form, which then keeps Save disabled.
  await page.waitForLoadState('networkidle');
  await title(page).fill('Glossary');
  await writeBody(page, 'A row the service refuses.');
  await page.getByRole('button', { name: 'Save Article' }).click();
  await expect(title(page)).toHaveAttribute('aria-invalid', 'true');
  await expect(page).toHaveURL(`${PATH}/new`);
  await assertNoAccessibilityViolations(page);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Discard Changes' }).click();
  await expectBackAtOutline(page);

  // The parent cannot be made narrower than its staff sub page: Keeper is held.
  await openEdit(page, PARENT);
  await expect(audience(page, 'Keeper')).toBeDisabled();
  await expect(audience(page, 'Staff')).toBeEnabled();

  // A parent with a live sub page is not deleted: the refusal says why, and the form stays.
  await page.getByRole('button', { name: 'Delete Guide' }).click();
  await assertNoAccessibilityViolations(page);
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
  await expect(title(page)).toHaveValue(PARENT);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expectBackAtOutline(page);
  await expectListed(page, PARENT);

  // The sub page, then the parent, each after its confirmation.
  await openEdit(page, CHILD);
  await page.getByRole('button', { name: 'Delete Article' }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expectBackAtOutline(page);
  await expectNotListed(page, CHILD);

  await openEdit(page, PARENT);
  await page.getByRole('button', { name: 'Delete Guide' }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expectBackAtOutline(page);
  await expectNotListed(page, PARENT);
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
