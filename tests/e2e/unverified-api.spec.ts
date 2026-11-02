import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { seedCoven, withSql } from './stories/coven-ingredients';

// An unverified account reaches the email page and the public pages and nothing else, and that holds for the API as for the pages:
// signed in on the email page, it cannot read a coven it belongs to by calling the endpoint the page's own client uses.
test.beforeAll(async () => {
  await recreateE2eDatabase();
});

const GRIMOIRE = `query ($id: ID!) { grimoire(workspaceId: $id, first: 1) { edges { node { id } } } }`;

/** The answer to the grimoire query, sent from inside the page so it carries the page's cookie. */
function readGrimoire(page: Page, id: string) {
  return page.evaluate(
    async ([query, workspaceId]) => {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query, variables: { id: workspaceId } }),
      });
      return (await response.json()) as {
        data?: unknown;
        errors?: { message: string; extensions?: { code?: string } }[];
      };
    },
    [GRIMOIRE, id],
  );
}

test('an unverified account on the email page cannot read a coven it belongs to through the API', async ({
  page,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Unverified Api', 'unverified-api.test', {
    A: 'owner',
  });
  await page.goto('/account/email');

  // Why it could have been read: the account is the coven's owner, and verified the same call answers.
  const verified = await readGrimoire(page, coven.id);
  expect(verified.errors).toBeUndefined();

  await withSql((sql) => sql`update users set email_verified = false where id = ${coven.users.A}`);
  await page.goto('/account/email');
  await expect(page.getByRole('heading', { level: 1, name: 'Your Email' })).toBeVisible();

  const refused = await readGrimoire(page, coven.id);
  expect(refused.data ?? null).toBeNull();
  expect(refused.errors?.[0].extensions?.code).toBe('FORBIDDEN');
});
