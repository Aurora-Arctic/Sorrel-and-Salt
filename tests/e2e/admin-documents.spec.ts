import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAs } from './session';

// A keeper edits the site's documents in place, one tab each under /keepers/documents: a saved draft is the keeper's alone, and a publish is what a
// reader sees, as a new version with the old one in its history. Publishing the terms, or the disclaimer or code of ethics they include, asks every
// account to agree again, and the confirmation says so first (claude-docs/design-decisions/m15.59-document-editor-scope.md). The Email Updates tab
// emails every account one email about every document changed since the last (claude-docs/design-decisions/m15.79-joint-document-mailing.md).

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

// The four documents, in the order their tabs and the footer list them.
const DOCUMENT_KEYS = ['terms', 'disclaimer', 'code-of-ethics', 'privacy'] as const;

/** The editor's editable text. */
const editorOf = (page: Page) =>
  page.getByRole('main').getByRole('textbox', { name: 'Document Text' });

/** The editor's formatting toolbar. */
const toolbarOf = (page: Page) =>
  page.getByRole('main').getByRole('toolbar', { name: 'Document Text Formatting' });

/** Puts the caret at the end of the paragraph holding `anchor`, and types `addition` there. */
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
  // A signed-in account that has agreed to everything in force, so a protected page answers it.
  const member = await (await browser.newContext()).newPage();
  await signInAs(member, 'disclaimer-reader@admin-documents.test');
  await member.goto('/account');
  await expect(member).not.toHaveURL(/\/account\/terms/);

  // The nav's Documents opens the terms of use's editor, under a tab row with one tab per document in the footer's order, then Email Updates.
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

  // Before: the seed's one version, so the public page lists no earlier one.
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
  // Saved: nothing is left unsaved, and the draft is there when the editor opens again.
  await expect(save).toBeDisabled();
  await page.reload();
  await expect(editorOf(page)).toContainText(ADDITION.trim());

  // A draft is no reader's.
  await reader.goto('/disclaimer');
  await expect(reader.getByRole('main')).not.toContainText('Fixturewort');

  await main.getByRole('button', { name: 'Publish', exact: true }).click();
  const confirmation = page.getByRole('dialog');
  await expect(confirmation).toBeVisible();
  await assertNoAccessibilityViolations(page);
  await confirmation.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(confirmation).toHaveCount(0);

  // Published: the reader sees the edit, with version 1 now an earlier version linked from the page.
  await reader.goto('/disclaimer');
  await expect(reader.getByRole('main')).toContainText(ADDITION.trim());
  const history = reader.getByRole('region', { name: 'Earlier Versions' }).getByRole('link');
  await expect(history).toHaveCount(1);
  await expect(history).toHaveAttribute('href', '/disclaimer/versions/1');
  await reader.goto('/disclaimer/versions/1');
  await expect(reader.getByRole('main')).not.toContainText('Fixturewort');
  await reader.context().close();

  // The terms include the disclaimer, so the account's agreement was to the version before: its next protected page is the
  // acceptance page, which links the disclaimer alone as changed, and agreeing returns it to the page it asked for.
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

  // The reader's agreement was to the version before, so the next protected page asks again.
  await reader.goto('/account');
  await expect(reader).toHaveURL(/\/account\/terms\?next=%2Faccount$/);
  await reader.getByRole('button', { name: 'Agree & Continue' }).click();
  await expect(reader).not.toHaveURL(/\/account\/terms/);
  await reader.context().close();
});

// The toolbar is one stop in the tab order, and the arrow keys move between its buttons, as the WAI-ARIA toolbar pattern has it:
// a keyboard user passes it with one Tab, and comes back to the button they left.
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
  /** Whether focus is on one of the toolbar's buttons. */
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

  // One stop: Tab leaves the toolbar from any button, and Shift+Tab comes back to the button left, not the first or last.
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

// A published change is emailed to every account only when a keeper asks, on the Email Updates page: one email covers every document
// changed since the last, each with its own summary, and the mailing it starts is recorded on the page
// (claude-docs/design-decisions/m15.79-joint-document-mailing.md).
test('an admin publishes the privacy policy and the code of ethics, then emails every account one email about both', async ({
  page,
}) => {
  await signInAs(page, 'mail-admin@admin-documents.test', ['discord'], 'admin');
  const main = page.getByRole('main');

  /** Appends `addition` to the paragraph holding `anchor` in the `key` document, and publishes it. */
  async function publish(key: string, anchor: string, addition: string): Promise<void> {
    await page.goto(`/keepers/documents/${key}`);
    await appendTo(page, anchor, addition);
    await main.getByRole('button', { name: 'Save Draft' }).click();
    await expect(main.getByRole('button', { name: 'Save Draft' })).toBeDisabled();
    await main.getByRole('button', { name: 'Publish', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Publish', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }

  // Publishing mails nothing: the editor offers no email, and the change waits on the Email Updates page.
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
  // The code of ethics is one of the documents an account agrees to, so the keeper too agrees again before the next page answers.
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

  // Each changed document asks for its own summary, and the button waits for every one. The other tests in this file may have published
  // the disclaimer and the terms first, so every summary on the page is written.
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

  // Recorded: one mailing covers both documents, nothing is left to send, and the page reads the same again.
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

/** Puts the caret in a new, empty paragraph after the one holding `anchor`. */
async function newLineAfter(page: Page, anchor: string): Promise<void> {
  await editorOf(page).getByText(anchor).click();
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
}

/**
 * Pastes into the text at the caret as Chromium does: a `paste` event carrying each type in `data`, then, unless it was
 * handled there, the `beforeinput` that inserts it, which is where the editor reads anything but plain text.
 */
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

// Markdown pasted from a code editor, a heading, a sentence with a footnote mark and the footnote's text.
const PASTED_MARKDOWN = [
  '## Fixturewort Pasted Heading',
  '',
  'A pasted Fixturewort claim.[^77]',
  '',
  '[^77]: A pasted Fixturewort source.',
].join('\n');

/** The pasted heading, and the pasted footnote's text as an entry of the Sources list. */
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
  // What VS Code puts on the clipboard: the text, its highlighted rendering, and its own editor data.
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

  // A code block's rendering with no editor data of its own: the text is the markdown.
  await newLineAfter(page, 'Changes to This Policy');
  await paste(page, {
    'text/plain': PASTED_MARKDOWN,
    'text/html': `<pre><code>${PASTED_MARKDOWN}</code></pre>`,
  });
  await expect(pastedHeading(page)).toBeVisible();
  await expect(pastedSource(page)).toHaveCount(1);

  // A web page's rich text: the HTML is what was copied, and its plain text is only a fallback.
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

// An edit made while a save is in flight is measured against the text being saved, not the text saved before it: one that puts the
// text back as it was before is still a change once that save lands, and the autosave sends it on its own.
test('an edit made while a draft save is in flight, typed or pasted, is saved after it', async ({
  page,
}) => {
  await signInAs(page, 'in-flight-admin@admin-documents.test', ['discord'], 'admin');
  await page.goto('/keepers/documents/privacy');
  await page.waitForLoadState('networkidle');
  const save = page.getByRole('main').getByRole('button', { name: /^Sav(e|ing) Draft$/ });
  const heading = editorOf(page).getByRole('heading', { name: /^Changes to This Polic/ });
  // The heading as the document holds it, ended by its line break.
  const SAVED_HEADING = '## Changes to This Policy\n';

  // Every save is held until the test lets it go.
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

  /** Makes `change` at the end of the heading, waits for the autosave to send it, and makes `revert` while it is held. */
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
    // The text is back as it was before the held save: the autosave sends it again on its own.
    await expect.poll(() => bodies.length, { timeout: 10_000 }).toBe(sent + 2);
    expect(bodies[bodies.length - 2]).not.toContain(SAVED_HEADING);
    expect(bodies[bodies.length - 1]).toContain(SAVED_HEADING);
    release();
    // Save Draft is disabled while a save is in flight too, so the test waits for the save to land before it reads the button.
    await expect.poll(() => landed, { timeout: 10_000 }).toBe(sent + 2);
    await expect(save).toBeDisabled();
  }

  // Typed: an `X` added, then deleted again.
  await editInFlight(
    () => page.keyboard.type('X'),
    () => page.keyboard.press('Backspace'),
  );
  // Pasted: the heading's last letter deleted, then pasted back.
  await editInFlight(
    () => page.keyboard.press('Backspace'),
    () => paste(page, { 'text/plain': 'y' }),
  );

  await page.reload();
  await expect(
    editorOf(page).getByRole('heading', { name: 'Changes to This Policy', exact: true }),
  ).toBeVisible();
});
