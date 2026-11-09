import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations, assertNoSidewaysScroll } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAs } from './session';

// The public document pages against the built server (claude-docs/components/document-page.md).

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
    await expect(page.getByRole('link', { name: 'Sign In', exact: true })).toBeVisible();
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
    await expect(page.getByRole('link', { name: 'Sign In', exact: true })).toHaveCount(0);
    await assertNoAccessibilityViolations(page);
  });

  test(`the compendium search finds nothing for "${title}"`, async ({ page }) => {
    await page.goto(`/compendium?query=${encodeURIComponent(title)}`);
    // Preconditions: the search ran with the title as its query, and the list is the compendium's.
    await expect(page.getByRole('combobox', { name: 'Name' })).toHaveValue(title);
    await expect(page.getByText(/no entries match/i)).toBeVisible();
    await expect(page.getByRole('main').getByRole('link', { name: title })).toHaveCount(0);
  });
}

test('/privacy draws the access cards under Who Can See What', async ({ page }) => {
  await page.goto('/privacy');
  const article = page.getByRole('main');
  await expect(article.getByRole('heading', { name: 'Who Can See What' })).toBeVisible();

  // The On This Page menu folds in a <details>, a group too, so its groups are left out of the count.
  const menuGroups = page.getByRole('navigation', { name: 'On This Page' }).getByRole('group');
  await expect
    .poll(async () => (await article.getByRole('group').count()) - (await menuGroups.count()))
    .toBe(11);
  await expect(article.getByText('{access-cards}')).toHaveCount(0);
  await assertNoAccessibilityViolations(page);
});

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

  await expect(page).toHaveURL(/\/code-of-ethics\?support=accessibility$/);
  const dialog = page.getByRole('dialog', { name: 'Contact Support' });
  await expect(dialog.getByRole('radio', { name: /^Accessibility/ })).toBeChecked();
});

// The keeper's edit icon: only a verified site keeper is offered the editor, on a document's current page and nowhere else.
const EDITABLE = [...DOCUMENTS, { path: '/about', title: 'About Us', link: 'About' }];
const VIEWERS = [
  { who: 'a signed-out visitor', role: null, offered: false },
  { who: 'a member', role: 'user', offered: false },
  { who: 'a curator', role: 'curator', offered: false },
  { who: 'a keeper', role: 'admin', offered: true },
] as const;

for (const { path, title } of EDITABLE) {
  const key = path.slice(1);
  for (const { who, role, offered } of VIEWERS) {
    test(`${path} ${offered ? 'offers' : 'does not offer'} the editor to ${who}`, async ({
      page,
    }) => {
      if (role) {
        await signInAs(page, `edit-${role}-${key}@document-pages.test`, ['discord'], role);
        // Precondition: the viewer is signed in, so the footer's Sign In link is gone.
        await page.goto(path);
        await expect(page.getByRole('link', { name: 'Sign In', exact: true })).toHaveCount(0);
      } else {
        await page.goto(path);
        await expect(page.getByRole('link', { name: 'Sign In', exact: true })).toBeVisible();
      }
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
      const edit = page.getByRole('link', { name: `Edit ${title}` });
      if (offered) {
        await expect(edit).toHaveAttribute('href', `/keepers/documents/${key}`);
      } else {
        await expect(edit).toHaveCount(0);
      }
    });
  }
}

test('a keeper sees no editor icon on an earlier version of a document', async ({ page }) => {
  await signInAs(page, 'edit-version-keeper@document-pages.test', ['discord'], 'admin');
  // Precondition: the same keeper is offered the icon on the current page.
  await page.goto('/terms');
  await expect(page.getByRole('link', { name: 'Edit Terms of Use' })).toBeVisible();
  await page.goto('/terms/versions/1');
  await expect(page.getByRole('heading', { level: 1, name: 'Terms of Use' })).toBeVisible();
  await expect(page.getByRole('link', { name: /^Edit / })).toHaveCount(0);
});
