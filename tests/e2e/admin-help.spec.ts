import type { Locator, Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAgainAs, signInAs } from './session';
import { seedCoven } from './stories/coven-ingredients';

// The keepers' help page: every help row at every audience, written by a keeper alone
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

/** The choices a picker in the dialog offers, by opening its list. */
async function openChoices(page: Page, dialog: Locator, label: string): Promise<Locator> {
  await dialog.getByRole('combobox', { name: new RegExp(`^${label}`) }).click();
  const list = page.getByRole('listbox', { name: `${label} choices` });
  await expect(list.getByRole('option').first()).toBeVisible();
  return list.getByRole('option');
}

async function choose(page: Page, dialog: Locator, label: string, option: string): Promise<void> {
  const options = await openChoices(page, dialog, label);
  await options.filter({ hasText: new RegExp(`^${option}$`) }).click();
}

async function openAdd(page: Page): Promise<Locator> {
  await addLink(page).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('textbox', { name: /^Title/ })).toBeVisible();
  return dialog;
}

async function openEdit(page: Page, title: string): Promise<Locator> {
  await editLink(page, title).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('textbox', { name: /^Title/ })).toHaveValue(title);
  return dialog;
}

test('a keeper writes a parent and a narrower sub page, meets a refusal at its field, and deletes both', async ({
  page,
}) => {
  await signInAs(page, 'a-keeper@admin-help.test', ['discord'], 'admin');

  const response = await page.goto(PATH);
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeVisible();
  // Precondition: the e2e database holds no help rows, so each row below is one this test wrote.
  await expect(editLink(page, PARENT)).toHaveCount(0);
  await assertNoAccessibilityViolations(page);

  // The parent: a public article, its body previewed through the renderer as it is typed.
  let dialog = await openAdd(page);
  await dialog.getByRole('textbox', { name: /^Title/ }).fill(PARENT);
  await dialog.getByRole('textbox', { name: /^Summary/ }).fill('A guide the test writes.');
  await dialog
    .getByRole('textbox', { name: /^Body/ })
    .fill('## Fixturewort Heading\n\nA paragraph the test writes.');
  await expect(
    dialog.getByRole('region', { name: 'Preview' }).getByRole('heading', {
      name: 'Fixturewort Heading',
    }),
  ).toBeVisible();
  await assertNoAccessibilityViolations(page);
  await dialog.getByRole('button', { name: 'Save Article' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(editLink(page, PARENT)).toBeVisible();

  // The sub page: under the public parent, at the narrower staff audience.
  dialog = await openAdd(page);
  await dialog.getByRole('textbox', { name: /^Title/ }).fill(CHILD);
  await dialog.getByRole('textbox', { name: /^Body/ }).fill('A sub page the test writes.');
  await choose(page, dialog, 'Parent', PARENT);
  await choose(page, dialog, 'Audience', 'Staff');
  await dialog.getByRole('textbox', { name: /^Position/ }).fill('1');
  await dialog.getByRole('button', { name: 'Save Article' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(editLink(page, CHILD)).toBeVisible();
  // Both rows are listed, the staff one beside the public one.
  await expect(editLink(page, PARENT)).toBeVisible();

  // A new row offers the parent, never the sub page, which is itself a child.
  dialog = await openAdd(page);
  const parents = await openChoices(page, dialog, 'Parent');
  await expect(parents.filter({ hasText: new RegExp(`^${PARENT}$`) })).toHaveCount(1);
  await expect(parents.filter({ hasText: new RegExp(`^${CHILD}$`) })).toHaveCount(0);
  await page.keyboard.press('Escape');

  // A reserved slug is refused beside Slug, and the dialog stays open.
  await dialog.getByRole('textbox', { name: /^Title/ }).fill('Fixturewort Reserved');
  await dialog.getByRole('textbox', { name: /^Body/ }).fill('A row the service refuses.');
  const slug = dialog.getByRole('textbox', { name: /^Slug/ });
  await slug.fill('glossary');
  await dialog.getByRole('button', { name: 'Save Article' }).click();
  await expect(slug).toHaveAttribute('aria-invalid', 'true');
  await expect(dialog).toBeVisible();
  await assertNoAccessibilityViolations(page);
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await dialog.getByRole('button', { name: 'Discard Changes' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(editLink(page, 'Fixturewort Reserved')).toHaveCount(0);

  // A parent made narrower than its staff child is refused beside Audience.
  dialog = await openEdit(page, PARENT);
  await choose(page, dialog, 'Audience', 'Keeper');
  await dialog.getByRole('button', { name: 'Save Article' }).click();
  const audience = dialog.getByRole('combobox', { name: /^Audience/ });
  await expect(audience).toHaveAttribute('aria-invalid', 'true');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await dialog.getByRole('button', { name: 'Discard Changes' }).click();
  await expect(dialog).toHaveCount(0);

  // A parent with a live child is not deleted: the refusal says why, and the row stays.
  dialog = await openEdit(page, PARENT);
  await dialog.getByRole('button', { name: 'Delete Article' }).click();
  await assertNoAccessibilityViolations(page);
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(editLink(page, PARENT)).toBeVisible();

  // The child, then the parent, each after its confirmation.
  dialog = await openEdit(page, CHILD);
  await dialog.getByRole('button', { name: 'Delete Article' }).click();
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(editLink(page, CHILD)).toHaveCount(0);

  dialog = await openEdit(page, PARENT);
  await dialog.getByRole('button', { name: 'Delete Article' }).click();
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(editLink(page, PARENT)).toHaveCount(0);

  await page.reload();
  await expect(editLink(page, PARENT)).toHaveCount(0);
  await expect(editLink(page, CHILD)).toHaveCount(0);
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
