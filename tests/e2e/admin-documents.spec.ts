import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAs } from './session';

// An admin edits the site's documents in place at /admin/documents: a saved draft is the admin's alone, and a publish is what a
// reader sees, as a new version with the old one in its history. Publishing the terms asks every account to agree again, and the
// confirmation says so first (claude-docs/design-decisions/m15.59-document-editor-scope.md).

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

/** The editor's editable text. */
const editorOf = (page: Page) =>
  page.getByRole('main').getByRole('textbox', { name: 'Document Text' });

/** Puts the caret at the end of the paragraph holding `anchor`, and types `addition` there. */
async function appendTo(page: Page, anchor: string, addition: string): Promise<void> {
  await editorOf(page).getByText(anchor).click();
  await page.keyboard.press('End');
  await page.keyboard.type(addition);
}

test('an admin edits the disclaimer, saves a draft no reader sees, then publishes it', async ({
  page,
  browser,
}) => {
  await signInAs(page, 'an-admin@admin-documents.test', ['discord'], 'admin');
  const reader = await (await browser.newContext()).newPage();
  const ADDITION = ' Fixturewort sentence from the editor.';

  // The list: one link per document.
  const response = await page.goto('/admin/documents');
  expect(response?.status()).toBe(200);
  const main = page.getByRole('main');
  for (const name of ['Privacy Policy', 'Disclaimer', 'Code of Ethics', 'Terms of Use']) {
    await expect(main.getByRole('link', { name, exact: true })).toBeVisible();
  }
  await assertNoAccessibilityViolations(page);

  // Before: the seed's one version, so the public page lists no earlier one.
  await reader.goto('/disclaimer');
  await expect(reader.getByRole('main')).not.toContainText('Fixturewort');
  await expect(reader.getByRole('region', { name: 'Earlier Versions' })).toHaveCount(0);

  await main.getByRole('link', { name: 'Disclaimer', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/documents\/disclaimer$/);
  await expect(editorOf(page)).toContainText('agreeing to the terms is agreeing to it');
  const save = main.getByRole('button', { name: 'Save Draft' });
  await expect(save).toBeDisabled();
  await assertNoAccessibilityViolations(page);

  await appendTo(page, 'agreeing to the terms is agreeing to it', ADDITION);
  await expect(save).toBeEnabled();
  await save.click();
  // Saved: nothing is left unsaved, and the draft is there when the editor opens again.
  await expect(save).toBeDisabled();
  await page.reload();
  await expect(editorOf(page)).toContainText(ADDITION.trim());

  // A draft is no reader's.
  await reader.goto('/disclaimer');
  await expect(reader.getByRole('main')).not.toContainText('Fixturewort');

  await main.getByRole('button', { name: 'Publish', exact: true }).click();
  const confirmation = page.getByRole('dialog');
  await expect(confirmation).toBeVisible();
  // Only the terms ask anyone to agree again.
  await expect(confirmation).not.toContainText(/agree/i);
  await assertNoAccessibilityViolations(page);
  await confirmation.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(confirmation).toHaveCount(0);

  // Published: the reader sees the edit, with version 1 now an earlier version linked from the page.
  await reader.goto('/disclaimer');
  await expect(reader.getByRole('main')).toContainText(ADDITION.trim());
  const history = reader.getByRole('region', { name: 'Earlier Versions' }).getByRole('link');
  await expect(history).toHaveCount(1);
  await expect(history).toHaveAttribute('href', '/disclaimer/versions/1');
  await reader.goto('/disclaimer/versions/1');
  await expect(reader.getByRole('main')).not.toContainText('Fixturewort');
  await reader.context().close();
});

test('publishing the terms warns that every account will agree again, and sends an agreed account to agree', async ({
  page,
  browser,
}) => {
  await signInAs(page, 'terms-admin@admin-documents.test', ['discord'], 'admin');
  const reader = await (await browser.newContext()).newPage();
  await signInAs(reader, 'terms-reader@admin-documents.test');

  // Precondition: the reader has agreed to the terms in force, so a protected page answers them.
  await reader.goto('/account');
  await expect(reader).not.toHaveURL(/\/account\/terms/);

  await page.goto('/admin/documents/terms');
  await appendTo(
    page,
    'agreeing to these terms is agreeing to them too',
    ' Fixturewort clause from the editor.',
  );
  await page.getByRole('main').getByRole('button', { name: 'Save Draft' }).click();
  await expect(page.getByRole('main').getByRole('button', { name: 'Save Draft' })).toBeDisabled();

  await page.getByRole('main').getByRole('button', { name: 'Publish', exact: true }).click();
  const confirmation = page.getByRole('dialog');
  await expect(confirmation).toContainText(/every account/i);
  await expect(confirmation).toContainText(/agree/i);
  await assertNoAccessibilityViolations(page);
  await confirmation.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(confirmation).toHaveCount(0);

  // The reader's agreement was to the version before, so the next protected page asks again.
  await reader.goto('/account');
  await expect(reader).toHaveURL(/\/account\/terms\?next=%2Faccount$/);
  await reader.getByRole('button', { name: 'Agree & Continue' }).click();
  await expect(reader).not.toHaveURL(/\/account\/terms/);
  await reader.context().close();
});

// A curator curates the compendium and does not govern the site's documents: each page refuses them itself, whatever the nav shows.
test('a curator is refused /admin/documents with the styled not-authorised page', async ({
  page,
}) => {
  await signInAs(page, 'a-curator@admin-documents.test', ['discord'], 'curator');

  // Precondition: the curator reaches the admin pages that curate.
  expect((await page.goto('/admin/compendium'))?.status()).toBe(200);

  for (const path of ['/admin/documents', '/admin/documents/disclaimer']) {
    expect((await page.goto(path))?.status(), path).toBe(403);
    await expect(
      page.getByRole('main').getByRole('heading', { level: 1, name: 'Not Authorized' }),
    ).toBeVisible();
  }
  await assertNoAccessibilityViolations(page);
});
