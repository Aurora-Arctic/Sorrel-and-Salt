import postgres from 'postgres';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { e2eDatabaseUrl, recreateE2eDatabase } from './database';

// A document's earlier published versions each have a page of their own, `/<document>/versions/<number>`; a draft, or a number
// never published, is a 404 (claude-docs/design-decisions/m15.59-document-editor-scope.md, "History"). The seed publishes each
// document as version 1.

const DOCUMENTS = [
  { path: '/privacy', title: 'Privacy Policy' },
  { path: '/disclaimer', title: 'Disclaimer' },
  { path: '/code-of-ethics', title: 'Code of Ethics' },
  { path: '/terms', title: 'Terms of Use' },
];

const BOOTSTRAP_USER_ID = '00000000-0000-0000-0000-000000000001';

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

for (const { path, title } of DOCUMENTS) {
  test(`${path}/versions/1 shows the seeded version, dated as the page is`, async ({
    page,
    request,
  }) => {
    expect((await request.get(`${path}/versions/1`)).status()).toBe(200);

    await page.goto(path);
    const current = await page
      .getByText(/last updated/i)
      .locator('time')
      .getAttribute('datetime');
    expect(current).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    await page.goto(`${path}/versions/1`);
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    await expect(page.getByText(/last updated/i).locator('time')).toHaveAttribute(
      'datetime',
      current!,
    );
    await expect(page.getByRole('navigation', { name: 'On This Page' })).toBeVisible();
    await assertNoAccessibilityViolations(page);
  });
}

test('a version number never published, or not a number, is a 404', async ({ request }) => {
  for (const address of ['/privacy/versions/2', '/privacy/versions/0', '/privacy/versions/abc']) {
    expect((await request.get(address)).status(), address).toBe(404);
  }
});

test('a draft is a 404 by its number, and its text is not on the document page', async ({
  page,
  request,
}) => {
  const sql = postgres(e2eDatabaseUrl(), { onnotice: () => {} });
  try {
    const [document] =
      await sql`select id from documents where key = 'privacy' and deleted_at is null`;
    // Precondition: the seeded document is there for the draft to belong to.
    expect(document).toBeTruthy();
    await sql`
      insert into document_versions ${sql({
        document_id: document!.id as string,
        number: 2,
        body: '## Fixture Draft Section\n\nFixture draft text.',
        status: 'draft',
        published_at: null,
        created_by: BOOTSTRAP_USER_ID,
        updated_by: BOOTSTRAP_USER_ID,
      })}`;
  } finally {
    await sql.end();
  }

  expect((await request.get('/privacy/versions/2')).status()).toBe(404);
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Fixture Draft Section' })).toHaveCount(0);
});
