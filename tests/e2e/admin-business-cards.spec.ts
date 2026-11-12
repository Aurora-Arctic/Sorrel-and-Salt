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
  // Sweep gap: the Business Cards page as a keeper arrives from the index
  await assertNoAccessibilityViolations(page);
});

test('Generate refuses empty or wrong boxes without building, and with them filled builds the sheet without asking the server for anything', async ({
  page,
}, testInfo) => {
  await signInAs(page, 'a-printer@business-cards.test', ['discord'], 'admin');
  await page.goto(PATH);
  const main = page.getByRole('main');
  const generate = main.getByRole('button', { name: 'Generate' });
  const backs = main.getByRole('switch', { name: 'Include Backs' });
  await expect(backs).not.toBeChecked();
  await expect(generate).toBeEnabled();

  // A press with the boxes empty builds nothing and marks each box that needs fixing.
  let downloads = 0;
  page.on('download', () => {
    downloads += 1;
  });
  await generate.click();
  const name = main.getByRole('textbox', { name: 'Name' });
  const phone = main.getByRole('textbox', { name: 'Phone' });
  const email = main.getByRole('textbox', { name: 'Email' });
  for (const box of [name, email, phone]) await expect(box).toHaveAttribute('aria-invalid', 'true');
  await expect(generate).toBeEnabled();

  await name.fill('Testwort Hollin');
  await phone.fill('202-555-0199');
  await email.fill('testwort at example');
  await generate.click();
  await expect(email).toHaveAttribute('aria-invalid', 'true');
  await expect(generate).toBeEnabled();
  expect(downloads).toBe(0);
  await email.fill('testwort@example.test');
  await expect(email).not.toHaveAttribute('aria-invalid', 'true');

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
  // Sweep gap: the page after Generate refuses empty or wrong boxes
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

test('the phone number can be edited from its middle: Backspace, Delete, typing over a selection, deleting across a bracket, and after a click', async ({
  page,
}) => {
  await signInAs(page, 'a-middler@business-cards.test', ['discord'], 'admin');
  await page.goto(PATH);
  const phone = page.getByRole('main').getByRole('textbox', { name: 'Phone' });
  const caret = () => phone.evaluate((input: HTMLInputElement) => input.selectionStart);
  const select = (start: number, end = start) =>
    phone.evaluate(
      (input: HTMLInputElement, [a, b]) => input.setSelectionRange(a, b),
      [start, end],
    );
  const fresh = async () => {
    await phone.fill('');
    await phone.click();
    await phone.pressSequentially('2025550123');
    await expect(phone).toHaveValue('(202) 555-0123');
  };

  // Backspace with the caret after the second 5, reached by clicking and then moving.
  await fresh();
  await phone.click({ position: { x: 2, y: 5 } });
  await select(8);
  await page.keyboard.press('Backspace');
  await expect(phone).toHaveValue('(202) 550-123');
  expect(await caret()).toBe(7);

  // Delete with the caret before a digit in the middle.
  await fresh();
  await select(7);
  await page.keyboard.press('Delete');
  await expect(phone).toHaveValue('(202) 550-123');
  expect(await caret()).toBe(7);

  // Select 555 with Shift and the arrow keys, and type 7 over it.
  await fresh();
  await page.keyboard.press('Home');
  for (let i = 0; i < 6; i += 1) await page.keyboard.press('ArrowRight');
  for (let i = 0; i < 3; i += 1) await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.type('7');
  await expect(phone).toHaveValue('(202) 701-23');
  expect(await caret()).toBe(7);

  // Select a digit, ") " and a digit, and delete them.
  await fresh();
  await select(3, 7);
  await page.keyboard.press('Backspace');
  await expect(phone).toHaveValue('(205) 501-23');
  expect(await caret()).toBe(3);

  // A click into the middle, then a typed digit.
  await fresh();
  const box = await phone.boundingBox();
  await phone.click({ position: { x: 60, y: (box?.height ?? 10) / 2 } });
  const clicked = await caret();
  expect(clicked).toBeGreaterThan(0);
  expect(clicked).toBeLessThan(14);
  await page.keyboard.type('9');
  expect((await phone.inputValue()).replace(/\D/g, '')).toHaveLength(11);
});

test('the phone number survives a run of Backspace, typing and an arrow key without leaving the field', async ({
  page,
}) => {
  await signInAs(page, 'a-runner@business-cards.test', ['discord'], 'admin');
  await page.goto(PATH);
  const phone = page.getByRole('main').getByRole('textbox', { name: 'Phone' });
  const caret = () => phone.evaluate((input: HTMLInputElement) => input.selectionStart);
  const expectState = async (value: string, at: number) => {
    await expect(phone).toHaveValue(value);
    expect(await caret()).toBe(at);
  };

  await phone.fill('2025550123');
  await phone.blur();
  await expect(phone).toHaveValue('(202) 555-0123');
  // A real click focuses the box; a pixel cannot name a character, so the caret is then set after the third 5.
  await phone.click();
  await phone.evaluate((input: HTMLInputElement) => input.setSelectionRange(9, 9));

  await page.keyboard.press('Backspace');
  await expectState('(202) 550-123', 8);
  await page.keyboard.type('7');
  await expectState('(202) 557-0123', 9);
  await page.keyboard.press('Backspace');
  await expectState('(202) 550-123', 8);
  await page.keyboard.press('ArrowLeft');
  expect(await caret()).toBe(7);
  await page.keyboard.type('8');
  await expectState('(202) 585-0123', 8);
});

test('the phone number survives a run of Delete, typing and an arrow key without leaving the field', async ({
  page,
}) => {
  await signInAs(page, 'a-deleter@business-cards.test', ['discord'], 'admin');
  await page.goto(PATH);
  const phone = page.getByRole('main').getByRole('textbox', { name: 'Phone' });
  const caret = () => phone.evaluate((input: HTMLInputElement) => input.selectionStart);
  const expectState = async (value: string, at: number) => {
    await expect(phone).toHaveValue(value);
    expect(await caret()).toBe(at);
  };

  await phone.fill('2025550123');
  await phone.blur();
  await expect(phone).toHaveValue('(202) 555-0123');
  await phone.click();
  await phone.evaluate((input: HTMLInputElement) => input.setSelectionRange(8, 8));

  // Delete removes the third 5; the caret stays.
  await page.keyboard.press('Delete');
  await expectState('(202) 550-123', 8);
  await page.keyboard.type('7');
  await expectState('(202) 557-0123', 9);
  // The next character is the "-" the mask added, so Delete takes the digit after it.
  await page.keyboard.press('Delete');
  await expectState('(202) 557-123', 9);
  await page.keyboard.press('ArrowRight');
  expect(await caret()).toBe(10);
  await page.keyboard.type('8');
  await expectState('(202) 557-8123', 11);
});
