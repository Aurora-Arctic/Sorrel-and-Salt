import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAs } from './session';

// Publishing the terms, or the disclaimer or code of ethics they include, asks every account to agree again (claude-docs/design-decisions/support.md, "A keeper editor for the site's documents").
// The Email Updates tab mails one email per change (claude-docs/design-decisions/support.md, "One joint email about every changed document").

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

const DOCUMENT_KEYS = ['terms', 'disclaimer', 'code-of-ethics', 'privacy', 'about'] as const;

const editorOf = (page: Page) =>
  page.getByRole('main').getByRole('textbox', { name: 'Document Text' });

const toolbarOf = (page: Page) =>
  page.getByRole('main').getByRole('toolbar', { name: 'Document Text Formatting' });

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
  const member = await (await browser.newContext()).newPage();
  await signInAs(member, 'disclaimer-reader@admin-documents.test');
  await member.goto('/account');
  await expect(member).not.toHaveURL(/\/account\/terms/);

  await page.goto('/keepers');
  await page
    .getByRole('navigation', { name: 'Keepers' })
    .getByRole('link', { name: 'Documents' })
    .click();
  await expect(page).toHaveURL(/\/keepers\/documents\/terms$/);
  const main = page.getByRole('main');
  const tabs = main.getByRole('navigation', { name: 'Documents' }).getByRole('link');
  await expect(tabs).toHaveText([
    'Terms of Use',
    'Disclaimer',
    'Code of Ethics',
    'Privacy Policy',
    'About Us',
    'Email Updates',
  ]);
  for (const [index, key] of DOCUMENT_KEYS.entries()) {
    await expect(tabs.nth(index)).toHaveAttribute('href', `/keepers/documents/${key}`);
  }
  await expect(tabs.nth(DOCUMENT_KEYS.length)).toHaveAttribute('href', '/keepers/documents');
  await expect(tabs.nth(0)).toHaveAttribute('aria-current', 'page');
  await expect(editorOf(page)).toBeVisible();
  // The scan covers the editor's toolbar too, so it waits for it.
  await expect(toolbarOf(page).getByRole('button').first()).toBeVisible();
  await assertNoAccessibilityViolations(page);

  await reader.goto('/disclaimer');
  await expect(reader.getByRole('main')).not.toContainText('Fixturewort');
  await expect(reader.getByRole('region', { name: 'Earlier Versions' })).toHaveCount(0);

  await main
    .getByRole('navigation', { name: 'Documents' })
    .getByRole('link', { name: 'Disclaimer', exact: true })
    .click();
  await expect(page).toHaveURL(/\/keepers\/documents\/disclaimer$/);
  await expect(tabs.nth(1)).toHaveAttribute('aria-current', 'page');
  await expect(editorOf(page)).toContainText('agreeing to the terms is agreeing to it');
  const save = main.getByRole('button', { name: 'Save Draft' });
  await expect(save).toBeDisabled();
  await assertNoAccessibilityViolations(page);

  await appendTo(page, 'agreeing to the terms is agreeing to it', ADDITION);
  await expect(save).toBeEnabled();
  await save.click();
  await expect(save).toBeDisabled();
  await page.reload();
  await expect(editorOf(page)).toContainText(ADDITION.trim());

  await reader.goto('/disclaimer');
  await expect(reader.getByRole('main')).not.toContainText('Fixturewort');

  await main.getByRole('button', { name: 'Publish', exact: true }).click();
  const confirmation = page.getByRole('dialog');
  await expect(confirmation).toBeVisible();
  await assertNoAccessibilityViolations(page);
  await confirmation.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(confirmation).toHaveCount(0);

  await reader.goto('/disclaimer');
  await expect(reader.getByRole('main')).toContainText(ADDITION.trim());
  const history = reader.getByRole('region', { name: 'Earlier Versions' }).getByRole('link');
  await expect(history).toHaveCount(1);
  await expect(history).toHaveAttribute('href', '/disclaimer/versions/1');
  await reader.goto('/disclaimer/versions/1');
  await expect(reader.getByRole('main')).not.toContainText('Fixturewort');
  await reader.context().close();

  await member.goto('/account');
  await expect(member).toHaveURL(/\/account\/terms\?next=%2Faccount$/);
  const changed = member.getByRole('main').getByRole('list').getByRole('link');
  await expect(changed).toHaveCount(1);
  await expect(changed).toHaveAttribute('href', '/disclaimer');
  await assertNoAccessibilityViolations(member);
  await member.getByRole('button', { name: 'Agree & Continue' }).click();
  await expect(member).toHaveURL(/\/account$/);
  await member.context().close();
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

  await page.goto('/keepers/documents/terms');
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

  await reader.goto('/account');
  await expect(reader).toHaveURL(/\/account\/terms\?next=%2Faccount$/);
  await reader.getByRole('button', { name: 'Agree & Continue' }).click();
  await expect(reader).not.toHaveURL(/\/account\/terms/);
  await reader.context().close();
});

test('the editor’s toolbar takes one tab stop, and the arrow keys move between its buttons', async ({
  page,
}) => {
  await signInAs(page, 'toolbar-admin@admin-documents.test', ['discord'], 'admin');
  await page.goto('/keepers/documents/privacy');
  const buttons = toolbarOf(page).getByRole('button');
  // Precondition: buttons enough for an arrow to move between.
  await expect(buttons.first()).toBeVisible();
  expect(await buttons.count()).toBeGreaterThan(2);
  // Hydrated first: the editor loads as a separate chunk, and before it hydrates the toolbar is server HTML whose
  // arrow keys do nothing.
  await page.waitForLoadState('networkidle');
  const focusInToolbar = () =>
    toolbarOf(page).evaluate((toolbar) => toolbar.contains(document.activeElement));

  await buttons.first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(buttons.nth(1)).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(buttons.first()).toBeFocused();
  await page.keyboard.press('End');
  await expect(buttons.last()).toBeFocused();
  await page.keyboard.press('Home');
  await expect(buttons.first()).toBeFocused();

  await page.keyboard.press('ArrowRight');
  await expect(buttons.nth(1)).toBeFocused();
  await page.keyboard.press('Tab');
  expect(await focusInToolbar()).toBe(false);
  await page.keyboard.press('Shift+Tab');
  await expect(buttons.nth(1)).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  expect(await focusInToolbar()).toBe(false);
});

// A curator curates the compendium and does not govern the site's documents: each page refuses them itself, whatever the nav shows.
test('a curator is refused every document editor and the Email Updates page with the styled not-authorised page', async ({
  page,
}) => {
  await signInAs(page, 'a-curator@admin-documents.test', ['discord'], 'curator');

  // Precondition: the curator reaches the admin pages that curate.
  expect((await page.goto('/curator/compendium'))?.status()).toBe(200);

  for (const path of [
    '/keepers/documents/privacy',
    '/keepers/documents/disclaimer',
    '/keepers/documents',
  ]) {
    expect((await page.goto(path))?.status(), path).toBe(403);
    await expect(
      page.getByRole('main').getByRole('heading', { level: 1, name: 'Not Authorized' }),
    ).toBeVisible();
  }
  await assertNoAccessibilityViolations(page);
});

// One email covers every document changed since the last (claude-docs/design-decisions/support.md, "One joint email about every changed document").
test('an admin publishes the privacy policy and the code of ethics, then emails every account one email about both', async ({
  page,
}) => {
  // Two publishes, a fresh agreement and a mailing in one flow: more than the default 30 seconds on CI under coverage.
  test.setTimeout(90_000);
  await signInAs(page, 'mail-admin@admin-documents.test', ['discord'], 'admin');
  const main = page.getByRole('main');

  async function publish(key: string, anchor: string, addition: string): Promise<void> {
    await page.goto(`/keepers/documents/${key}`);
    await appendTo(page, anchor, addition);
    await main.getByRole('button', { name: 'Save Draft' }).click();
    await expect(main.getByRole('button', { name: 'Save Draft' })).toBeDisabled();
    await main.getByRole('button', { name: 'Publish', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Publish', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }

  await publish(
    'privacy',
    'Until then the old email stays',
    ' Fixturewort promise from the editor.',
  );
  await expect(main.getByRole('button', { name: 'Email Every Account' })).toHaveCount(0);
  await publish(
    'code-of-ethics',
    'Everyone is welcome here, and bigotry is not.',
    ' Fixturewort duty from the editor.',
  );
  await page.goto('/keepers/documents');
  await expect(page).toHaveURL(/\/account\/terms\?next=/);
  await page.getByRole('button', { name: 'Agree & Continue' }).click();
  await expect(page).toHaveURL(/\/keepers\/documents$/);
  await expect(
    main
      .getByRole('navigation', { name: 'Documents' })
      .getByRole('link', { name: 'Email Updates' }),
  ).toHaveAttribute('aria-current', 'page');
  await expect(main.getByRole('progressbar')).toHaveCount(0);

  // The other tests in this file may have published the disclaimer and the terms first, so every summary on the page is written.
  const email = main.getByRole('button', { name: 'Email Every Account' });
  const privacy = main.getByRole('textbox', { name: 'Summary of the Privacy Policy' });
  const ethics = main.getByRole('textbox', { name: 'Summary of the Code of Ethics' });
  await expect(privacy).toBeVisible();
  await expect(ethics).toBeVisible();
  await expect(email).toBeDisabled();
  await assertNoAccessibilityViolations(page);
  await privacy.fill('A new promise about your email.');
  await ethics.fill('A new duty to name your sources.');
  for (const summary of await main.getByRole('textbox', { name: /^Summary of the / }).all()) {
    if ((await summary.inputValue()) === '') await summary.fill('A Fixturewort change.');
  }
  await expect(email).toBeEnabled();

  await email.click();
  const confirmation = page.getByRole('dialog', { name: 'Email Every Account' });
  await expect(confirmation).toContainText('Privacy Policy');
  await expect(confirmation).toContainText('Code of Ethics');
  await assertNoAccessibilityViolations(page);
  await confirmation.getByRole('button', { name: 'Send Emails' }).click();
  await expect(confirmation).toHaveCount(0);

  const progress = main.getByRole('progressbar', {
    name: /Privacy Policy.*Code of Ethics|Code of Ethics.*Privacy Policy/,
  });
  await expect(progress).toHaveCount(1);
  await expect(main.getByRole('textbox', { name: /^Summary of the / })).toHaveCount(0);
  await expect(main.getByRole('button', { name: 'Email Every Account' })).toHaveCount(0);
  await page.reload();
  await expect(progress).toHaveCount(1);
  await expect(main.getByRole('button', { name: 'Email Every Account' })).toHaveCount(0);
  await assertNoAccessibilityViolations(page);
});

async function newLineAfter(page: Page, anchor: string): Promise<void> {
  await editorOf(page).getByText(anchor).click();
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
}

/** Pastes as Chromium does: a `paste` event, then, unless handled there, the `beforeinput` that inserts it. */
async function paste(page: Page, data: Record<string, string>): Promise<void> {
  await editorOf(page).evaluate((element, types) => {
    const transfer = new DataTransfer();
    for (const [type, value] of Object.entries(types)) transfer.setData(type, value);
    const handled = !element.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true, cancelable: true }),
    );
    if (handled) return;
    element.dispatchEvent(
      new InputEvent('beforeinput', {
        inputType: 'insertFromPaste',
        dataTransfer: transfer,
        bubbles: true,
        cancelable: true,
      }),
    );
  }, data);
}

const PASTED_MARKDOWN = [
  '## Fixturewort Pasted Heading',
  '',
  'A pasted Fixturewort claim.[^77]',
  '',
  '[^77]: A pasted Fixturewort source.',
].join('\n');

const pastedHeading = (page: Page) =>
  editorOf(page).getByRole('heading', { name: 'Fixturewort Pasted Heading' });
const pastedSource = (page: Page) =>
  editorOf(page).getByRole('listitem').filter({ hasText: 'A pasted Fixturewort source.' });

test('markdown pasted from a code editor is read as markdown, not as its highlighted HTML', async ({
  page,
}) => {
  await signInAs(page, 'paste-code-admin@admin-documents.test', ['discord'], 'admin');
  await page.goto('/keepers/documents/privacy');
  await page.waitForLoadState('networkidle');

  await newLineAfter(page, 'Changes to This Policy');
  const highlighted = PASTED_MARKDOWN.split('\n')
    .map((line) => `<div><span style="color: #569cd6;">${line}</span></div>`)
    .join('');
  await paste(page, {
    'text/plain': PASTED_MARKDOWN,
    'text/html': `<meta charset="utf-8"><div style="font-family: Consolas, monospace; white-space: pre;">${highlighted}</div>`,
    'vscode-editor-data': JSON.stringify({
      version: 1,
      isFromEmptySelection: false,
      mode: 'markdown',
    }),
  });

  await expect(pastedHeading(page)).toBeVisible();
  await expect(pastedSource(page)).toHaveCount(1);
  await expect(page.getByRole('main').getByRole('button', { name: 'Save Draft' })).toBeEnabled();
});

test('a monospace rendering of markdown is read as markdown, and a web page’s HTML is read as HTML', async ({
  page,
}) => {
  await signInAs(page, 'paste-html-admin@admin-documents.test', ['discord'], 'admin');
  await page.goto('/keepers/documents/privacy');
  await page.waitForLoadState('networkidle');

  await newLineAfter(page, 'Changes to This Policy');
  await paste(page, {
    'text/plain': PASTED_MARKDOWN,
    'text/html': `<pre><code>${PASTED_MARKDOWN}</code></pre>`,
  });
  await expect(pastedHeading(page)).toBeVisible();
  await expect(pastedSource(page)).toHaveCount(1);

  await newLineAfter(page, 'A pasted Fixturewort claim.');
  await paste(page, {
    'text/plain': '## Fixturewort Web Heading',
    'text/html': '<h3>Fixturewort Rich Heading</h3><p>From a <strong>web</strong> page.</p>',
  });
  await expect(
    editorOf(page).getByRole('heading', { level: 3, name: 'Fixturewort Rich Heading' }),
  ).toBeVisible();
  await expect(
    editorOf(page).getByRole('heading', { name: 'Fixturewort Web Heading' }),
  ).toHaveCount(0);
});

// A save's text is measured against the text being saved: an edit that puts the text back as it was before is still a change once the save lands.
test('an edit made while a draft save is in flight, typed or pasted, is saved after it', async ({
  page,
}) => {
  await signInAs(page, 'in-flight-admin@admin-documents.test', ['discord'], 'admin');
  await page.goto('/keepers/documents/privacy');
  await page.waitForLoadState('networkidle');
  const save = page.getByRole('main').getByRole('button', { name: /^Sav(e|ing) Draft$/ });
  const heading = editorOf(page).getByRole('heading', { name: /^Changes to This Polic/ });
  const SAVED_HEADING = '## Changes to This Policy\n';

  const bodies: string[] = [];
  let landed = 0;
  let release = () => {};
  page.on('response', (response) => {
    const request = response.request();
    if (!request.url().endsWith('/api/graphql')) return;
    if (
      (request.postDataJSON() as { operationName?: string } | null)?.operationName ===
      'SaveDocumentDraft'
    )
      landed += 1;
  });
  await page.route('**/api/graphql', async (route) => {
    const request = route.request().postDataJSON() as {
      operationName?: string;
      variables: { body: string };
    } | null;
    if (request?.operationName !== 'SaveDocumentDraft') return route.continue();
    bodies.push(request.variables.body);
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    // A released save takes a moment to reach the server, so the test has to wait for it to land, not for the button.
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    return route.continue();
  });

  async function editInFlight(
    change: () => Promise<void>,
    revert: () => Promise<void>,
  ): Promise<void> {
    const sent = bodies.length;
    await heading.click();
    await page.keyboard.press('End');
    await change();
    await expect.poll(() => bodies.length, { timeout: 10_000 }).toBe(sent + 1);
    await expect(save).toHaveAttribute('aria-busy', 'true');
    await revert();
    release();
    await expect.poll(() => bodies.length, { timeout: 10_000 }).toBe(sent + 2);
    expect(bodies[bodies.length - 2]).not.toContain(SAVED_HEADING);
    expect(bodies[bodies.length - 1]).toContain(SAVED_HEADING);
    release();
    // Save Draft is disabled while a save is in flight too, so the test waits for the save to land before it reads the button.
    await expect.poll(() => landed, { timeout: 10_000 }).toBe(sent + 2);
    await expect(save).toBeDisabled();
  }

  await editInFlight(
    () => page.keyboard.type('X'),
    () => page.keyboard.press('Backspace'),
  );
  await editInFlight(
    () => page.keyboard.press('Backspace'),
    () => paste(page, { 'text/plain': 'y' }),
  );

  await page.reload();
  await expect(
    editorOf(page).getByRole('heading', { name: 'Changes to This Policy', exact: true }),
  ).toBeVisible();
});

test('a bare address typed into the link dialog becomes an https link, and stays one on the published page', async ({
  page,
  browser,
}) => {
  await signInAs(page, 'link-admin@admin-documents.test', ['discord'], 'admin');
  await page.goto('/keepers/documents/privacy');
  await page.waitForLoadState('networkidle');

  await appendTo(page, 'Changes to This Policy', ' Fixturelink');
  await expect(editorOf(page).getByRole('heading', { name: /Fixturelink$/ })).toBeVisible();
  for (let i = 0; i < 'Fixturelink'.length; i++) await page.keyboard.press('Shift+ArrowLeft');
  // The selection is read back, then given a beat: the editor copies the browser’s selection into its own on a throttle of about
  // 100ms, and the Link button reads the editor’s copy, which would still be one letter short if it ran first.
  await expect
    .poll(() => page.evaluate(() => window.getSelection()?.toString()))
    .toBe('Fixturelink');
  await page.waitForTimeout(300);
  await toolbarOf(page).getByRole('button', { name: 'Link' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add Link' });
  const address = dialog.getByRole('textbox', { name: 'Address' });
  await address.fill('example.com');
  await address.blur();
  await expect(address).toHaveValue('https://example.com');
  await dialog.getByRole('button', { name: 'Add Link' }).click();
  await expect(dialog).toHaveCount(0);

  const main = page.getByRole('main');
  // The autosave can send part-way through the typing, and Save Draft is disabled while any save is in flight, so the
  // test waits for the response to the save that carries the link, not for the button.
  const saved = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/graphql') &&
      Boolean(response.request().postData()?.includes('](https://example.com)')) &&
      response.request().postDataJSON().operationName === 'SaveDocumentDraft',
  );
  await main.getByRole('button', { name: 'Save Draft' }).click();
  await saved;
  await page.reload();
  await expect(editorOf(page).getByRole('link', { name: 'Fixturelink' })).toHaveAttribute(
    'href',
    'https://example.com',
  );

  await main.getByRole('button', { name: 'Publish', exact: true }).click();
  const confirmation = page.getByRole('dialog');
  await confirmation.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(confirmation).toHaveCount(0);

  const reader = await (await browser.newContext()).newPage();
  await reader.goto('/privacy');
  await expect(
    reader.getByRole('main').getByRole('link', { name: 'Fixturelink', exact: true }),
  ).toHaveAttribute('href', 'https://example.com');
  await reader.context().close();
});

test('the Pull Quote button turns the paragraph holding the caret into a quote, and a second press undoes it', async ({
  page,
}) => {
  await signInAs(page, 'pull-quote-admin@admin-documents.test', ['discord'], 'admin');
  await page.goto('/keepers/documents/privacy');
  const pullQuote = toolbarOf(page).getByRole('button', { name: 'Pull Quote' });
  await expect(pullQuote).toBeVisible();
  await editorOf(page).getByText('Your email changes only when you verify the new one.').click();
  // Precondition: the caret sits in an ordinary paragraph.
  await expect(pullQuote).toHaveAttribute('aria-pressed', 'false');

  await pullQuote.click();
  await expect(pullQuote).toHaveAttribute('aria-pressed', 'true');
  await pullQuote.click();
  await expect(pullQuote).toHaveAttribute('aria-pressed', 'false');
});

test('moving to another document keeps the same tab row and never marks Terms of Use as current on the way', async ({
  page,
}) => {
  await signInAs(page, 'tab-admin@admin-documents.test', ['discord'], 'admin');
  await page.goto('/keepers/documents/privacy');
  const tabs = page.getByRole('main').getByRole('navigation').first();
  const terms = tabs.getByRole('link', { name: 'Terms of Use' });
  await expect(tabs.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  // Precondition: Terms is not current to start with, so a mark later is a change this click caused.
  await expect(terms).not.toHaveAttribute('aria-current', 'page');

  const tabRow = await tabs.elementHandle();

  // Records every moment Terms of Use carries the current-page mark, however brief, from now on.
  await page.evaluate(() => {
    const seen: string[] = [];
    (window as unknown as { termsSeen: string[] }).termsSeen = seen;
    const watch = () => {
      for (const link of document.querySelectorAll('a[aria-current="page"]')) {
        if (link.textContent?.includes('Terms of Use')) seen.push('Terms of Use');
      }
    };
    new MutationObserver(watch).observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['aria-current'],
    });
  });

  await tabs.getByRole('link', { name: 'About Us' }).click();
  await expect(page).toHaveURL(/\/keepers\/documents\/about$/);
  await expect(tabs.getByRole('link', { name: 'About Us' })).toHaveAttribute(
    'aria-current',
    'page',
  );

  // The tab row is the same element throughout, not a skeleton's copy that replaced it and was replaced in turn.
  expect(await tabRow!.evaluate((row) => row.isConnected)).toBe(true);
  expect(
    await page.evaluate(() => (window as unknown as { termsSeen: string[] }).termsSeen),
  ).toEqual([]);
});

test('the editor link dialog spaces its field and buttons as every other form modal does', async ({
  page,
}) => {
  await signInAs(page, 'link-layout@admin-documents.test', ['discord'], 'admin');
  await page.goto('/keepers/documents/privacy');
  await page.waitForLoadState('networkidle');
  await appendTo(page, 'Changes to This Policy', ' Fixturelink');
  await expect(editorOf(page).getByRole('heading', { name: /Fixturelink$/ })).toBeVisible();
  for (let i = 0; i < 'Fixturelink'.length; i++) await page.keyboard.press('Shift+ArrowLeft');
  await expect
    .poll(() => page.evaluate(() => window.getSelection()?.toString()))
    .toBe('Fixturelink');
  await page.waitForTimeout(300);
  await toolbarOf(page).getByRole('button', { name: 'Link' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add Link' });
  await expect(dialog).toBeVisible();

  // A `.form` holding a field and `.modal__actions` is every other form modal's shape; one is built beside the
  // real controls, and the real gaps must equal its gaps.
  const gaps = await dialog.evaluate((root) => {
    const field = root.querySelector('.field')!;
    const add = [...root.querySelectorAll('button')].find((b) => b.textContent === 'Add Link')!;
    const actions = add.parentElement!;
    const title = root.querySelector('h2')!;
    const real = {
      titleToField: field.getBoundingClientRect().top - title.getBoundingClientRect().bottom,
      fieldToActions: actions.getBoundingClientRect().top - field.getBoundingClientRect().bottom,
    };
    const probe = document.createElement('div');
    probe.className = 'form';
    probe.innerHTML =
      '<div class="field"><label class="field__label">Probe</label><input class="input"></div><div class="modal__actions"><button class="btn btn--solid">Probe</button></div>';
    field.parentElement!.parentElement!.prepend(probe);
    const bottom = (el: Element) => el.getBoundingClientRect().bottom;
    const top = (el: Element) => el.getBoundingClientRect().top;
    const probeField = probe.querySelector('.field')!;
    const probeActions = probe.querySelector('.modal__actions')!;
    const result = {
      ...real,
      probeTitleToField: top(probeField) - bottom(title),
      probeFieldToActions: top(probeActions) - bottom(probeField),
    };
    probe.remove();
    return result;
  });
  expect(gaps.titleToField).toBeCloseTo(gaps.probeTitleToField, 0);
  expect(gaps.fieldToActions).toBeCloseTo(gaps.probeFieldToActions, 0);
});
