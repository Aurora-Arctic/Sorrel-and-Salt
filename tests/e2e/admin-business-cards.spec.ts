import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import type { Download, Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAs } from './session';

// (claude-docs/components/business-cards.md)
test.beforeAll(async () => {
  await recreateE2eDatabase();
});

// The browser runs remotely, so a download is copied here before it is read.
const saveAndRead = async (download: Download, to: string) => {
  await download.saveAs(to);
  return readFile(to);
};

const PATH = '/keepers/business-cards';

const notAuthorized = (page: Page) =>
  page.getByRole('main').getByRole('heading', { level: 1, name: 'Not Authorized' });

test('a keeper opens Business Cards from the Keepers index and from the Keepers nav', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await signInAs(page, 'a-keeper@business-cards.test', ['discord'], 'admin');

  await page.goto('/keepers');
  await page.getByRole('main').getByRole('link', { name: 'Business Cards' }).click();
  await expect(page).toHaveURL(PATH);
  await expect(
    page.getByRole('main').getByRole('heading', { level: 1, name: 'Business Cards' }),
  ).toBeVisible();

  await page.goto('/keepers/support');
  const nav = page.getByRole('navigation', { name: 'Keepers' });
  await nav.getByRole('link', { name: 'Business Cards' }).click();
  await expect(page).toHaveURL(PATH);
  await expect(nav.getByRole('link', { name: 'Business Cards' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await assertNoAccessibilityViolations(page);
});

test('Generate waits for a name, an email address and a phone number, and builds the sheet without asking the server for anything', async ({
  page,
}, testInfo) => {
  await signInAs(page, 'a-printer@business-cards.test', ['discord'], 'admin');
  await page.goto(PATH);
  const main = page.getByRole('main');
  const generate = main.getByRole('button', { name: 'Generate' });
  const backs = main.getByRole('switch', { name: 'Include Backs' });
  await expect(backs).not.toBeChecked();
  await expect(generate).toBeDisabled();

  await main.getByRole('textbox', { name: 'Name' }).fill('Testwort Hollin');
  await main.getByRole('textbox', { name: 'Phone' }).fill('202-555-0199');
  await expect(generate).toBeDisabled();
  await main.getByRole('textbox', { name: 'Email' }).fill('testwort at example');
  await main.getByRole('textbox', { name: 'Email' }).blur();
  await expect(generate).toBeDisabled();
  await expect(main.getByRole('textbox', { name: 'Email' })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await main.getByRole('textbox', { name: 'Email' }).fill('testwort@example.test');
  await expect(generate).toBeEnabled();

  // Every request from here on: the PDF is built from the fonts and pictures fetched when the page opened, and
  // writes nothing anywhere, since a write would be a request. The router's own link prefetches are left out:
  // they start when a link scrolls into view or the browser is idle, which on a slow machine is after this
  // point, and Generate does not cause them.
  const requests: string[] = [];
  page.on('request', (request) => {
    const headers = request.headers();
    const prefetch = headers['next-router-prefetch'] || headers['next-router-segment-prefetch'];
    if (/^https?:/.test(request.url()) && !prefetch) requests.push(request.url());
  });

  const frontsOnly = page.waitForEvent('download');
  await generate.click();
  const fronts = await frontsOnly;
  expect(fronts.suggestedFilename()).toBe('business-cards-testwort-hollin.pdf');
  const frontsPdf = await PDFDocument.load(
    await saveAndRead(fronts, testInfo.outputPath('fronts.pdf')),
  );
  expect(frontsPdf.getPageCount()).toBe(1);

  await backs.click();
  await expect(backs).toBeChecked();
  const withBacks = page.waitForEvent('download');
  await generate.click();
  const both = await withBacks;
  const bothPdf = await PDFDocument.load(await saveAndRead(both, testInfo.outputPath('both.pdf')));
  expect(bothPdf.getPageCount()).toBe(2);

  expect(requests).toEqual([]);
  await assertNoAccessibilityViolations(page);
});

// The page refuses anyone but a keeper itself, whatever the nav shows. Why each could have reached it: the keeper above
// opens the same address, the curator opens Support under the same Keepers layout, and every account is signed in.
test('a curator and a signed-in account that is not a keeper get the styled not-authorized page', async ({
  page,
}) => {
  await signInAs(page, 'a-curator@business-cards.test', ['discord'], 'curator');
  expect((await page.goto('/keepers/support'))?.status()).toBe(200);
  expect((await page.goto(PATH))?.status()).toBe(403);
  await expect(notAuthorized(page)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generate' })).toHaveCount(0);

  await signInAs(page, 'not-a-keeper@business-cards.test');
  expect((await page.goto('/account'))?.status()).toBe(200);
  expect((await page.goto(PATH))?.status()).toBe(403);
  await expect(notAuthorized(page)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generate' })).toHaveCount(0);
});

test('a signed-out visitor is sent to sign in, and back to the page afterwards', async ({
  page,
}) => {
  await page.goto(PATH);
  await expect(page).toHaveURL(`/sign-in?next=${encodeURIComponent(PATH)}`);
});

test('the phone number is laid out as it is typed, deletes through its brackets, and keeps a pasted foreign number in its own form', async ({
  page,
}) => {
  await signInAs(page, 'a-dialler@business-cards.test', ['discord'], 'admin');
  await page.goto(PATH);
  const phone = page.getByRole('main').getByRole('textbox', { name: 'Phone' });

  await phone.click();
  await phone.pressSequentially('2025550123');
  await expect(phone).toHaveValue('(202) 555-0123');

  // Backspace works straight through the digits and the brackets the mask added.
  for (let i = 0; i < 7; i += 1) await page.keyboard.press('Backspace');
  await expect(phone).toHaveValue('(202)');
  await page.keyboard.press('Backspace');
  await expect(phone).toHaveValue('20');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');
  await expect(phone).toHaveValue('');

  // A digit typed in the middle leaves the caret beside it.
  await phone.pressSequentially('202555012');
  await expect(phone).toHaveValue('(202) 555-012');
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.type('9');
  await expect(phone).toHaveValue('(290) 255-5012');
  expect(await phone.evaluate((input: HTMLInputElement) => input.selectionStart)).toBe(3);

  // A pasted number with a country code keeps that country's form. insertText puts the whole text in at
  // once, as a paste does; the page is not a secure origin, so the real clipboard is not there to use.
  await phone.fill('');
  await page.keyboard.insertText('+44 7700 900123');
  await expect(phone).toHaveValue('+44 7700 900123');
});
