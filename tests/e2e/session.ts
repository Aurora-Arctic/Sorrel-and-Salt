import { randomBytes, randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';
import postgres from 'postgres';
import type { UserRole } from '@/lib/session';
import { e2eDatabaseUrl } from './database';
import { SESSION_COOKIE, signed } from './session-cookie';
import { browserUrl } from './slots';

// A signed-in browser without a provider round trip, which CI cannot make: the rows a Discord sign-in
// would leave go straight to this worker's slot database, with a session cookie signed by the build's
// secret (claude-docs/testing/e2e.md, "E2E").

/**
 * The address every e2e server gets as ADMIN_BOOTSTRAP_EMAIL, on the reserved `.invalid` domain: set by
 * playwright.config.ts, not `.env.local`, so a spec signs in as the primary admin the same way everywhere.
 */
export const PRIMARY_ADMIN_EMAIL = 'placeholder@admin-bootstrap.invalid';

/**
 * Gives `page` the session cookie, in the context's jar so a followed redirect keeps it and every engine sends it. The
 * e2e servers name it without `__Secure-` (tests/e2e/servers.ts), since no browser sends a `Secure` cookie to a
 * plain-http origin. Cookies ignore ports, so the host alone serves any slot.
 */
async function holdSession(page: Page, value: string): Promise<void> {
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
 * Makes `page` a browser signed in to a new user with one account per provider named and the site role given.
 * The user is verified unless `emailVerified` says otherwise; rows go to this worker's slot database unless
 * `database` names the server's own. How the cookie arrives is `holdSession`'s.
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
 * Makes `page` a browser signed in again to a user `signInAs` already made, on a new session: the email
 * index is unique, so `signInAs` cannot make the same address twice.
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
