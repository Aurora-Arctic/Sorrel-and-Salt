import { randomBytes, randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';
import postgres from 'postgres';
import type { UserRole } from '@/lib/session';
import { e2eDatabaseUrl } from './database';
import { SESSION_COOKIE, signed } from './session-cookie';
import { browserUrl, plainSessionCookie } from './slots';

// A signed-in browser without a provider round trip, which CI cannot make:
// the rows a Discord sign-in would leave, written straight to this worker's
// slot database — the one its server reads — and the session cookie Better
// Auth would have set, signed with the secret the served build shares with
// this runner (claude-docs/testing/e2e.md, "E2E").

/**
 * The address every e2e server is given as ADMIN_BOOTSTRAP_EMAIL, CI's own placeholder on the
 * reserved `.invalid` domain: set by playwright.config.ts rather than left to a developer's
 * `.env.local`, so a spec can sign in as the primary admin the same way locally as on CI.
 */
export const PRIMARY_ADMIN_EMAIL = 'placeholder@admin-bootstrap.invalid';

/**
 * Gives `page` the session cookie. A browser never sends a `Secure` cookie to
 * the plain-http origin a remote browser reaches the server on, so Chromium
 * gets it as an extra request header. WebKit sends no such header either, so
 * under the audit the cookie goes in the context's jar instead, plain-named and
 * not `Secure`. A cookie is shared across ports, so the host alone is enough
 * for whichever slot's server the page reaches, and a second call replaces the
 * first, as a second sign-in does.
 */
async function holdSession(page: Page, value: string): Promise<void> {
  if (!plainSessionCookie) {
    // On the context, so a tab the page opens (a link with target=_blank) is signed in too.
    await page.context().setExtraHTTPHeaders({ cookie: `${SESSION_COOKIE}=${value}` });
    return;
  }
  await page.context().addCookies([
    {
      name: SESSION_COOKIE,
      value,
      domain: new URL(browserUrl(0)).hostname,
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
}

/**
 * Makes `page` a browser signed in to a new user holding one account per provider named, with the
 * site role given. The user is verified unless `emailVerified` says otherwise, as for an account an
 * admin approves unverified; signed in as itself, such a user reaches only `/account/email`. The rows
 * go to this worker's slot database unless `database` names the server's own, as the
 * compendium-cache server's is. How the cookie reaches the browser is `holdSession`'s.
 */
export async function signInAs(
  page: Page,
  email: string,
  providers: readonly string[] = ['discord'],
  role: UserRole = 'user',
  { emailVerified = true, database }: { emailVerified?: boolean; database?: string } = {},
): Promise<{ userId: string }> {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret)
    throw new Error('BETTER_AUTH_SECRET must be set for the runner and the server alike');

  const sql = postgres(e2eDatabaseUrl(database), { onnotice: () => {} });
  const userId = randomUUID();
  const token = randomBytes(24).toString('base64url');
  try {
    await sql.begin(async (tx) => {
      // Made by hand, so it declares the route a `psql` fix declares: the
      // privilege trigger refuses an undeclared change to `role` or
      // `can_create_workspace` (claude-docs/db/write-path.md, "app.current_user_id, published per transaction").
      await tx`select set_config('app.privilege_route', 'manual', true)`;
      // Stamped as its own creator, as the sign-up hook stamps one. A curator or an admin holds the
      // creation flag, as the users CHECK asks.
      await tx`
        insert into users (id, name, email, email_verified, role, can_create_workspace, created_by, updated_by)
        values (${userId}, 'Fixture Person', ${email}, ${emailVerified}, ${role}, ${role !== 'user'}, ${userId}, ${userId})
      `;
      for (const [index, providerId] of providers.entries()) {
        await tx`
          insert into accounts (account_id, provider_id, user_id, updated_at)
          values (${`${providerId}-${index}-${userId}`}, ${providerId}, ${userId}, now())
        `;
      }
      await tx`
        insert into sessions (token, user_id, expires_at, updated_at)
        values (${token}, ${userId}, now() + interval '1 day', now())
      `;
    });
  } finally {
    await sql.end();
  }

  await holdSession(page, signed(token, secret));
  return { userId };
}

/**
 * Makes `page` a browser signed in again to a user `signInAs` already made, on a new session, so a
 * spec can switch back to one: the email index is unique, so `signInAs` cannot make the same address twice.
 */
export async function signInAgainAs(
  page: Page,
  userId: string,
  { database }: { database?: string } = {},
): Promise<void> {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret)
    throw new Error('BETTER_AUTH_SECRET must be set for the runner and the server alike');

  const sql = postgres(e2eDatabaseUrl(database), { onnotice: () => {} });
  const token = randomBytes(24).toString('base64url');
  try {
    await sql`
      insert into sessions (token, user_id, expires_at, updated_at)
      values (${token}, ${userId}, now() + interval '1 day', now())
    `;
  } finally {
    await sql.end();
  }

  await holdSession(page, signed(token, secret));
}
