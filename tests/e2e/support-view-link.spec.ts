import { randomUUID } from 'node:crypto';
import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { latestMessageTo } from './mailpit';

// Against the built server: the link a signed-out sender's receipt carries holds its token in the URL fragment, which the
// browser never sends to the server or in a Referer header. The page reads it, drops it from the address bar, and asks
// for the request, so a reload shows nothing and the page is never stored. Any other token shows the same nothing, and the
// old path form is a 404 (claude-docs/design-decisions/m15.48-mailed-link.md, "A link in each mail that opens the
// request"). Which tokens the query honours is tests/modules/support/services/support-view-query.test.ts's.

const SUBJECT = 'The Testwort jar will not open';
const VIEW_LINK = /https?:\/\/\S+\/support\/request#([A-Za-z0-9_-]{32,})/;
/** What the page says when it has no request to show. */
const OPEN_THE_LATEST = /latest email/i;

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('the receipt’s link opens the request from its fragment with no session, takes a reply, and shows nothing on a reload', async ({
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

  // With the token gone from the address, a reload has nothing to ask for, and says to open the latest email.
  await visitor.reload();
  await expect(visitor.getByText(OPEN_THE_LATEST)).toBeVisible();
  await expect(visitor.getByRole('heading', { name: SUBJECT })).toHaveCount(0);

  // A token no mail carried shows the same nothing. From a blank page, so the visit is a full load, not a hash change.
  await visitor.goto('about:blank');
  await visitor.goto(`/support/request#${token!.slice(0, -1)}${token!.endsWith('x') ? 'y' : 'x'}`);
  await expect(visitor.getByText(OPEN_THE_LATEST)).toBeVisible();
  await expect(visitor.getByRole('heading', { name: SUBJECT })).toHaveCount(0);

  // The old form, with the token in the path the server sees, is gone.
  const oldForm = await visitor.goto(`/support/request/${token}`);
  expect(oldForm?.status()).toBe(404);
  await elsewhere.close();
});
