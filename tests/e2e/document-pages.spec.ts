import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations, assertNoSidewaysScroll } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAs } from './session';

// The public document pages against the built server: each answers a signed-out visitor, carries no
// noindex of its own, is linked from the footer in both frames, passes axe signed out and signed in,
// and is not something the compendium search can find (claude-docs/components/document-page.md).

const DOCUMENTS = [
  { path: '/privacy', title: 'Privacy Policy', link: 'Privacy' },
  { path: '/disclaimer', title: 'Disclaimer', link: 'Disclaimer' },
  { path: '/code-of-ethics', title: 'Code of Ethics', link: 'Code of Ethics' },
  { path: '/terms', title: 'Terms of Use', link: 'Terms' },
];

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

for (const { path, title, link } of DOCUMENTS) {
  test(`${path} answers a signed-out visitor, with no noindex of its own`, async ({
    page,
    request,
  }) => {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    // Off production the proxy marks every response noindex, so the page's own answer is
    // compared with the compendium's: the public surface and the document say the same thing.
    const compendium = await request.get('/compendium');
    expect(response.headers()['x-robots-tag']).toBe(compendium.headers()['x-robots-tag']);
    expect(await response.text()).not.toMatch(/<meta[^>]+name="robots"[^>]+noindex/);

    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    await expect(page.getByText(/last updated/i).locator('time')).toHaveAttribute(
      'datetime',
      /^\d{4}-\d{2}-\d{2}$/,
    );
    await expect(page.getByRole('link', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByRole('contentinfo').getByRole('link', { name: link })).toHaveAttribute(
      'href',
      path,
    );
    await assertNoSidewaysScroll(page, { restore: true });
    await assertNoAccessibilityViolations(page);
  });

  test(`${path} reads the same inside the shell, linked from its footer`, async ({ page }) => {
    await signInAs(page, `reader-${link.toLowerCase()}@document-pages.test`, ['discord']);
    await page.goto('/compendium');
    await page.getByRole('contentinfo').getByRole('link', { name: link }).click();

    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign In' })).toHaveCount(0);
    await assertNoAccessibilityViolations(page);
  });

  test(`the compendium search finds nothing for "${title}"`, async ({ page }) => {
    await page.goto(`/compendium?query=${encodeURIComponent(title)}`);
    // Preconditions: the search ran with the title as its query, and the list is the compendium's.
    await expect(page.getByRole('combobox', { name: 'Name' })).toHaveValue(title);
    await expect(page.getByText(/no entries match/i)).toBeVisible();
    // In the list itself: the footer links every document by name on every page.
    await expect(page.getByRole('main').getByRole('link', { name: title })).toHaveCount(0);
  });
}

// Signed in: the signed-out page offers its short form with no subject chosen, whatever the address asks.
test('the code of ethics opens the support form on an accessibility bug', async ({ page }) => {
  await signInAs(page, 'reporter@document-pages.test', ['discord']);
  await page.goto('/code-of-ethics');
  // The page links the support form twice; this one sits in the paragraph on accessibility bugs.
  await page
    .getByRole('paragraph')
    .filter({ hasText: 'accessibility bug' })
    .getByRole('link', { name: 'support form' })
    .click();

  await expect(page).toHaveURL(/\/support\?support=accessibility$/);
  // In the page's own form: the Support dialog beside the footer holds a second, closed copy.
  await expect(page.getByRole('main').getByRole('radio', { name: /^Accessibility/ })).toBeChecked();
});
