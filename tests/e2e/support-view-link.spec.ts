import { randomUUID } from 'node:crypto';
import { test, expect } from './fixtures';
import postgres from 'postgres';
import type { Page } from '@playwright/test';
import { e2eDatabaseUrl, recreateE2eDatabase } from './database';
import { latestMessageTo } from './mailpit';

// Against the built server: the link a signed-out sender's receipt carries holds its token in the URL fragment, which the
// browser never sends to the server or in a Referer header. The page reads it, drops it from the address bar, and keeps it
// in that tab's sessionStorage, so a reload in the tab opens the request again and another tab does not. A token the
// server no longer honours is dropped from the tab, any other token opens nothing, the page is never stored, and the old
// path form is a 404 (claude-docs/design-decisions/m15.48-mailed-link.md, "A link in each mail that opens the request").
// Which tokens the query honours is tests/modules/support/services/support-view-query.test.ts's.

const SUBJECT = 'The Testwort jar will not open';
const VIEW_LINK = /https?:\/\/\S+\/support\/request#([A-Za-z0-9_-]{32,})/;
/** The page has settled on its not-found state: a page heading, but not the request's, and no reply box. */
async function expectNoRequest(page: Page) {
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: SUBJECT })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Reply' })).toHaveCount(0);
}

/** Whether any of the page's sessionStorage entries holds `token`. */
const tabHolds = (page: Page, token: string) =>
  page.evaluate((held) => Object.values(window.sessionStorage).includes(held), token);

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('the receipt’s link opens the request from its fragment with no session, takes a reply, and holds it through a reload in that tab alone', async ({
  page,
  browser,
}) => {
  // Unique per run, so mail an earlier run left in Mailpit, carrying a token from a recreated database, is never the newest.
  const address = `visitor-${randomUUID()}@support-view-link.test`;
  await page.goto('/support');
  await page.getByRole('radio', { name: /^Account/ }).check();
  await page.getByRole('textbox', { name: 'Email' }).fill(address);
  await page.getByRole('textbox', { name: 'Subject' }).fill(SUBJECT);
  await page.getByRole('textbox', { name: 'Message' }).fill('It sticks at the lid.');
  await page.getByRole('button', { name: 'Send Request' }).click();
  await expect(page.getByText(/within 5 working days/)).toBeVisible();

  const receipt = await latestMessageTo(address, 20_000);
  const token = receipt.text.match(VIEW_LINK)?.[1];
  expect(token, receipt.text).toBeDefined();

  // A fresh browser, with no cookie, as the visitor opening the mail on another device.
  const elsewhere = await browser.newContext();
  const visitor = await elsewhere.newPage();
  expect(await elsewhere.cookies()).toEqual([]);

  const opened = await visitor.goto(`/support/request#${token}`);
  expect(opened?.status()).toBe(200);
  expect(await opened?.headerValue('cache-control')).toContain('no-store');
  expect(await opened?.headerValue('referrer-policy')).toBe('no-referrer');
  await expect(visitor.getByRole('heading', { name: SUBJECT })).toBeVisible();
  // The token leaves the address bar once read, so it is not kept in history or shown over a shoulder.
  expect(new URL(visitor.url()).hash).toBe('');
  expect(await tabHolds(visitor, token!)).toBe(true);
  expect(await elsewhere.cookies()).toEqual([]);
  const robots = await visitor.locator('meta[name="robots"]').getAttribute('content');
  expect(robots).toMatch(/noindex/);

  // A reply from the page, still with no session.
  const body = 'The Testwort lid is still stuck.';
  await visitor.getByRole('textbox', { name: 'Reply' }).fill(body);
  // Waits on the mutation itself, then on the reply in the thread: the reply box holds the same text until it clears.
  const posted = visitor.waitForResponse(
    (response) =>
      response.url().endsWith('/api/graphql') &&
      (response.request().postData() ?? '').includes('replyToSupportRequestByViewToken'),
  );
  await visitor.getByRole('button', { name: 'Reply' }).click();
  const answer = await (await posted).json();
  expect(answer.errors).toBeUndefined();
  expect(answer.data).toEqual({ replyToSupportRequestByViewToken: true });
  await expect(visitor.getByRole('listitem').filter({ hasText: body })).toBeVisible();
  expect(await elsewhere.cookies()).toEqual([]);

  // A reload in the same tab opens the request again from the tab's store, with the reply, and no fragment comes back.
  await visitor.reload();
  await expect(visitor.getByRole('heading', { name: SUBJECT })).toBeVisible();
  await expect(visitor.getByRole('listitem').filter({ hasText: body })).toBeVisible();
  expect(new URL(visitor.url()).hash).toBe('');

  // Another tab in the same browser holds nothing: the token is the tab's, in no cookie or localStorage.
  const otherTab = await elsewhere.newPage();
  await otherTab.goto('/support/request');
  await expectNoRequest(otherTab);
  expect(await otherTab.evaluate(() => Object.values(window.localStorage))).not.toContain(token);
  expect(await elsewhere.cookies()).toEqual([]);
  await otherTab.close();

  // Once the token stops opening the request (here, the request closes), a reload shows nothing and the tab lets it go.
  const sql = postgres(e2eDatabaseUrl(), { onnotice: () => {} });
  try {
    await sql`update support_requests set status = 'closed' where sender_email = ${address}`;
  } finally {
    await sql.end();
  }
  await visitor.reload();
  await expectNoRequest(visitor);
  expect(await tabHolds(visitor, token!)).toBe(false);

  // A token no mail carried opens nothing. From a blank page, so the visit is a full load, not a hash change.
  await visitor.goto('about:blank');
  await visitor.goto(`/support/request#${token!.slice(0, -1)}${token!.endsWith('x') ? 'y' : 'x'}`);
  await expectNoRequest(visitor);

  // The old form, with the token in the path the server sees, is gone.
  const oldForm = await visitor.goto(`/support/request/${token}`);
  expect(oldForm?.status()).toBe(404);
  await elsewhere.close();
});
