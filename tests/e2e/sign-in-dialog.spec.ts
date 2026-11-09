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

test.describe('the sign-in dialog', () => {
  test('opens over a public page from the bar, passes axe in both themes, and Close, Escape and a click outside each leave the page as it was', async ({
    page,
  }) => {
    await page.goto('/help/glossary?x=1');
    await page.mouse.wheel(0, 400);
    const at = await scrolled(page);
    const signIn = page.getByRole('banner').getByRole('link', { name: 'Sign In' });
    const dialog = page.getByRole('dialog', { name: 'Sign In' });

    const closers: [string, () => Promise<void>][] = [
      ['Close', () => dialog.getByRole('button', { name: 'Close' }).click()],
      ['Escape', () => page.keyboard.press('Escape')],
      ['a click outside', () => page.mouse.click(4, 4)],
    ];
    for (const [how, close] of closers) {
      await signIn.click();
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
    await expect(main).toContainText(INVITED);
    await expect(main.getByRole('link', { name: 'Confirm Your Email' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Accept Invitation' })).toHaveCount(0);
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
  });
});
