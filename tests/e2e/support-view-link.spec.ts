import { randomUUID } from 'node:crypto';
import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { latestMessageTo } from './mailpit';

// Against the built server: the link a signed-out sender's receipt carries opens that one request with no session, and
// any other token is a 404 (claude-docs/design-decisions/m15.48-mailed-link.md, "A link in each mail that opens the
// request"). Which tokens the service honours is tests/modules/support/services/support-view-link.test.ts's.

const SUBJECT = 'The Testwort jar will not open';

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('the receipt’s link opens the request with no session and takes a reply, and a token no mail carried is a 404', async ({
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
  const link = receipt.text.match(/https?:\/\/\S+\/support\/request\/[A-Za-z0-9_-]+/)?.[0];
  expect(link, receipt.text).toBeDefined();
  const path = new URL(link!).pathname;

  // A fresh browser, with no cookie, as the visitor opening the mail on another device.
  const elsewhere = await browser.newContext();
  const visitor = await elsewhere.newPage();
  expect(await elsewhere.cookies()).toEqual([]);

  const opened = await visitor.goto(path);
  expect(opened?.status()).toBe(200);
  // The token is in the path, so the page tells the browser to send no referrer from it.
  expect(await opened?.headerValue('referrer-policy')).toBe('no-referrer');
  await expect(visitor.getByRole('heading', { name: SUBJECT })).toBeVisible();
  expect(await elsewhere.cookies()).toEqual([]);
  const robots = await visitor.locator('meta[name="robots"]').getAttribute('content');
  expect(robots).toMatch(/noindex/);

  // A reply from the page, still with no session: it is posted, and shows on the request when the page is opened again.
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
  const inThread = visitor.getByRole('listitem').filter({ hasText: body });
  await expect(inThread).toBeVisible();
  await visitor.goto(path);
  await expect(inThread).toBeVisible();
  expect(await elsewhere.cookies()).toEqual([]);

  const wrong = await visitor.goto(`${path.slice(0, -1)}${path.endsWith('x') ? 'y' : 'x'}`);
  expect(wrong?.status()).toBe(404);
  const missing = await visitor.goto('/support/request/not-a-token');
  expect(missing?.status()).toBe(404);
  await elsewhere.close();
});
