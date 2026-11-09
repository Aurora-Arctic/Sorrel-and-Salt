import { createHash, randomBytes, randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { test, expect } from './fixtures';
import { scanBothThemes } from './axe';
import { e2eDatabaseUrl, recreateE2eDatabase } from './database';
import { latestMessageTo } from './mailpit';
import { signInAs } from './session';
import { slotUrl } from './slots';
import type { Locator, Page } from '@playwright/test';

// Sign In and Create Account opened over the page they are on: from the public bar, and as the two
// equal choices on a signed-out invitation (claude-docs/components/sign-in-dialog.md).

const run = randomUUID().slice(0, 8);
const COVEN_NAME = 'Fixture Dialog Coven';
const COVEN_SLUG = `fixture-dialog-coven-${run}`;
const INVITED = `invitee-${run}@sign-in-dialog.test`;
const TOKEN = randomBytes(24).toString('base64url');
const INVITATION = `/invite/${TOKEN}`;
const PASSWORD = 'lantern moss under the north window';
const VERIFY_LINK = /https?:\/\/[^\s\])>"]+\/verify-email\?[^\s\])>"]+/;

async function withSql<T>(work: (sql: postgres.Sql) => Promise<T>): Promise<T> {
  const sql = postgres(e2eDatabaseUrl(), { onnotice: () => {} });
  try {
    return await work(sql);
  } finally {
    await sql.end();
  }
}

test.beforeAll(async ({ browser, slot }) => {
  await recreateE2eDatabase();

  // Only the rows matter: the page and its session are thrown away.
  const setup = await browser.newPage({ baseURL: slotUrl(slot) });
  let ownerId = '';
  try {
    ownerId = (await signInAs(setup, `owner-${run}@sign-in-dialog.test`)).userId;
  } finally {
    await setup.close();
  }
  await withSql((sql) =>
    sql.begin(async (tx) => {
      await tx`select set_config('app.current_user_id', ${ownerId}, true)`;
      const [coven] = await tx`
        insert into workspaces (name, slug, created_by, updated_by)
        values (${COVEN_NAME}, ${COVEN_SLUG}, ${ownerId}, ${ownerId}) returning id`;
      await tx`
        insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
        values (${coven.id}, ${ownerId}, 'owner', ${ownerId}, ${ownerId})`;
      await tx`
        insert into invitations (workspace_id, email, role, token_hash, created_by, updated_by)
        values (${coven.id}, ${INVITED}, 'viewer',
          ${createHash('sha256').update(TOKEN).digest('hex')}, ${ownerId}, ${ownerId})`;
    }),
  );
});

const field = (dialog: Locator, label: string) => dialog.getByLabel(new RegExp(`^${label}`));

/** Reads where the page is scrolled, to prove a closed dialog left it there. */
const scrolled = (page: Page) => page.evaluate(() => window.scrollY);

/**
 * Clicks where the element is, as a person does. A locator's click first scrolls it into view, and for a link in the
 * sticky bar that scroll moves the page (the root's `scroll-padding-top` counts the bar as hidden), so the page would
 * already have moved before the dialog opened.
 */
const clickInPlace = async (page: Page, target: Locator) => {
  const box = (await target.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
};

test.describe('the sign-in dialog', () => {
  test('opens over a public page from the bar, passes axe in both themes, and Close, Escape and a click outside each leave the page as it was, and a new email account stays on it, told to check its inbox', async ({
    page,
  }) => {
    await page.goto('/help/glossary?x=1');
    await page.mouse.wheel(0, 400);
    // The wheel scrolls in a later frame; a reading before it would compare 0 with 0 and prove nothing.
    await page.waitForFunction(() => window.scrollY > 0);
    const at = await scrolled(page);
    const signIn = page.getByRole('banner').getByRole('link', { name: 'Sign In' });
    const dialog = page.getByRole('dialog', { name: 'Sign In' });

    const closers: [string, () => Promise<void>][] = [
      ['Close', () => dialog.getByRole('button', { name: 'Close' }).click()],
      ['Escape', () => page.keyboard.press('Escape')],
      ['a click outside', () => page.mouse.click(4, 4)],
    ];
    for (const [how, close] of closers) {
      await clickInPlace(page, signIn);
      await expect(dialog, how).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Continue with Email' })).toBeVisible();
      if (how === 'Close') {
        await scanBothThemes(page);
        await dialog.getByRole('button', { name: 'Continue with Email' }).click();
        await expect(field(dialog, 'Email Address')).toBeVisible();
        await scanBothThemes(page);
      }

      await close();

      await expect(dialog, how).toHaveCount(0);
      await expect(page, how).toHaveURL('/help/glossary?x=1');
      await expect(signIn, how).toBeFocused();
      expect(await scrolled(page), how).toBe(at);
    }

    // A new email account stays on this page, signed in, with the dialog turned to its inbox.
    const here = '/help/glossary?x=1';
    const address = `bar-${run}@sign-in-dialog.test`;
    await signIn.click();
    await dialog.getByRole('button', { name: 'Create an Account' }).click();
    const creating = page.getByRole('dialog', { name: 'Create an Account' });
    await creating.getByRole('button', { name: 'Continue with Email' }).click();
    await field(creating, 'Name').fill('Testwort Barholder');
    await field(creating, 'Email Address').fill(address);
    await field(creating, 'Password').fill(PASSWORD);
    await creating.getByRole('button', { name: 'Create Account' }).click();

    const inbox = page.getByRole('dialog', { name: 'Check Your Inbox' });
    await expect(inbox.getByRole('link', { name: 'Confirm Your Email' })).toHaveAttribute(
      'href',
      `/account/email?next=${encodeURIComponent(here)}`,
    );
    await expect(page).toHaveURL(here);
    await scanBothThemes(page);
    // The mailed link comes back here, through the confirmed view's Continue.
    const mailed = new URL((await latestMessageTo(address)).text.match(VERIFY_LINK)![0]);
    expect(mailed.searchParams.get('callbackURL')).toBe(
      `/account/email?verified&next=${encodeURIComponent(here)}`,
    );

    await inbox.getByRole('button', { name: 'Close' }).click();
    await expect(inbox).toHaveCount(0);
    await expect(page).toHaveURL(here);
    await expect(signIn).toHaveCount(0);
  });

  test('a signed-out invitation offers Create Account and Sign In as equal choices, and either brings the visitor back to press Accept Invitation', async ({
    page,
  }) => {
    await page.goto(INVITATION);
    const main = page.getByRole('main');
    const createAccount = main.getByRole('link', { name: 'Create Account' });
    const signIn = main.getByRole('link', { name: 'Sign In' });
    for (const choice of [createAccount, signIn]) {
      await expect(choice).toHaveAttribute(
        'href',
        `/sign-in?next=${encodeURIComponent(INVITATION)}`,
      );
    }
    // Equal choices: the same size, side by side on this desktop width.
    const [a, b] = [await createAccount.boundingBox(), await signIn.boundingBox()];
    expect(a!.width).toBeCloseTo(b!.width, 0);
    expect(a!.height).toBeCloseTo(b!.height, 0);
    expect(a!.y).toBeCloseTo(b!.y, 0);

    await createAccount.click();
    const signUp = page.getByRole('dialog', { name: 'Create an Account' });
    await expect(signUp.getByRole('button', { name: 'Continue with Email' })).toBeVisible();
    await expect(signUp.getByRole('button', { name: 'Sign In with a Passkey' })).toHaveCount(0);
    await scanBothThemes(page);
    await expect(page).toHaveURL(INVITATION);

    await signUp.getByRole('button', { name: 'Continue with Email' }).click();
    await field(signUp, 'Name').fill('Testwort Holder');
    await field(signUp, 'Email Address').fill(INVITED);
    await field(signUp, 'Password').fill(PASSWORD);
    await signUp.getByRole('button', { name: 'Create Account' }).click();

    // Back on the invitation, unverified: told to check the inbox, with nothing to accept yet.
    await expect(page).toHaveURL(INVITATION);
    await expect(main.getByRole('link', { name: 'Confirm Your Email' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Accept Invitation' })).toHaveCount(0);
    await expect(main.getByRole('alert')).toHaveCount(0);
    await scanBothThemes(page);

    // A refused link comes back with ?error=: the inbox state says so, beside the way to a new one.
    await page.goto(`${INVITATION}?error=TOKEN_EXPIRED`);
    await expect(main.getByRole('alert')).toBeVisible();
    await expect(main).not.toContainText('TOKEN_EXPIRED');
    await expect(main.getByRole('link', { name: 'Confirm Your Email' })).toBeVisible();
    await scanBothThemes(page);

    const message = await latestMessageTo(INVITED);
    const link = new URL(message.text.match(VERIFY_LINK)![0]);
    await page.goto(`${link.pathname}${link.search}`);
    // The link from an invitation lands on the invitation itself, with no confirmed view to continue from.
    await expect(page).toHaveURL(INVITATION);
    await expect(page.getByRole('button', { name: 'Accept Invitation' })).toBeVisible();

    // Signed out again, the same account comes back by Sign In.
    await page.context().clearCookies();
    await page.goto(INVITATION);
    await signIn.click();
    const signInDialog = page.getByRole('dialog', { name: 'Sign In' });
    await signInDialog.getByRole('button', { name: 'Continue with Email' }).click();
    await field(signInDialog, 'Email Address').fill(INVITED);
    await field(signInDialog, 'Password').fill(PASSWORD);
    await signInDialog.getByRole('button', { name: 'Sign In', exact: true }).click();

    // Accepting stays its own press.
    await expect(page).toHaveURL(INVITATION);
    const accept = page.getByRole('button', { name: 'Accept Invitation' });
    await expect(accept).toBeVisible();
    const seats = () =>
      withSql(
        (sql) => sql`
          select 1 from workspace_members m join users u on u.id = m.user_id
          join workspaces w on w.id = m.workspace_id
          where u.email = ${INVITED} and w.slug = ${COVEN_SLUG} and m.deleted_at is null`,
      );
    expect(await seats()).toHaveLength(0);
    await accept.click();
    // The invitation page is open to a new account; the coven is not until it agrees to the terms.
    await expect(page).toHaveURL(
      `/account/terms?next=${encodeURIComponent(`/coven/${COVEN_SLUG}`)}`,
    );
    expect(await seats()).toHaveLength(1);
    await page.getByRole('button', { name: 'Agree & Continue' }).click();
    await expect(page).toHaveURL(`/coven/${COVEN_SLUG}`);
  });

  test('stacks the two choices on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(INVITATION);
    const main = page.getByRole('main');
    const a = await main.getByRole('link', { name: 'Create Account' }).boundingBox();
    const b = await main.getByRole('link', { name: 'Sign In' }).boundingBox();
    expect(b!.y).toBeGreaterThanOrEqual(a!.y + a!.height);

    // The email form is the dialog's widest content; it still fits the phone with a gutter each side.
    await main.getByRole('link', { name: 'Create Account' }).click();
    const dialog = page.getByRole('dialog', { name: 'Create an Account' });
    await dialog.getByRole('button', { name: 'Continue with Email' }).click();
    await expect(field(dialog, 'Password')).toBeVisible();
    const box = (await dialog.boundingBox())!;
    const rem = await page.evaluate(() =>
      parseFloat(getComputedStyle(document.documentElement).fontSize),
    );
    expect(box.x).toBeCloseTo(rem, -1);
    expect(375 - (box.x + box.width)).toBeCloseTo(rem, -1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
  });
});

// The panel's other home: on /sign-in the view and the mode are in the address, so a reload shows the same view in
// the same mode, and Back and Forward walk the views without losing the mode. The dialog above holds both in state.
test('the /sign-in page keeps its view and mode through a reload, Back and Forward', async ({
  page,
}) => {
  await page.goto('/sign-in');
  const main = page.getByRole('main');
  const title = (name: string) => main.getByRole('heading', { level: 1, name, exact: true });
  await expect(title('Sign In')).toBeVisible();

  await main.getByRole('button', { name: 'Create an Account', exact: true }).click();
  await expect(title('Create an Account')).toBeVisible();
  await page.reload();
  await expect(title('Create an Account')).toBeVisible();

  await main.getByRole('button', { name: 'Continue with Email' }).click();
  await expect(title('Create an Account with Email')).toBeVisible();
  await page.reload();
  await expect(title('Create an Account with Email')).toBeVisible();

  await page.goBack();
  await expect(title('Create an Account')).toBeVisible();
  await page.goForward();
  await expect(title('Create an Account with Email')).toBeVisible();

  await main.getByRole('button', { name: 'Sign In Instead' }).click();
  await expect(title('Sign In with Email')).toBeVisible();
  await page.reload();
  await expect(title('Sign In with Email')).toBeVisible();

  // Back from a form reloaded in another mode than it was opened in still lands in the form's mode.
  await main.getByRole('button', { name: 'Back to Sign-In Options' }).click();
  await expect(title('Sign In')).toBeVisible();
  await page.reload();
  await expect(title('Sign In')).toBeVisible();
});
