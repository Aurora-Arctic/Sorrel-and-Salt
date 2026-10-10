import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';
import postgres from 'postgres';
import { e2eDatabaseUrl } from './database';

// A signed-in browser without a provider round trip, which CI cannot make:
// the rows a Discord sign-in would leave, written straight to this worker's
// slot database — the one its server reads — and the session cookie Better
// Auth would have set, signed with the secret the served build shares with
// this runner (claude-docs/testing/e2e.md, "E2E").

// A production build's base URL forces https (src/lib/auth.ts, "baseURL"),
// so Better Auth names the cookie with the `__Secure-` prefix.
const SESSION_COOKIE = '__Secure-better-auth.session_token';

/**
 * The address every e2e server is given as ADMIN_BOOTSTRAP_EMAIL, CI's own
 * placeholder on the reserved `.invalid` domain: set by playwright.config.ts
 * rather than left to a developer's `.env.local`, so a spec can sign in as
 * the primary admin (MB.59) the same way locally as on CI.
 */
export const PRIMARY_ADMIN_EMAIL = 'placeholder@admin-bootstrap.invalid';

/** better-call's `signCookieValue`: `<value>.<base64 HMAC-SHA256>`, percent-encoded. */
function signed(value: string, secret: string): string {
  const signature = createHmac('sha256', secret).update(value).digest('base64');
  return encodeURIComponent(`${value}.${signature}`);
}

/**
 * Makes `page` a browser signed in to a new user holding one account per
 * provider named, with the site role given. The user is verified unless
 * `emailVerified` says otherwise, as for an account an admin approves
 * unverified (MB.205); signed in as itself, such a user reaches only
 * `/account/email`. The rows go to this worker's slot database unless
 * `database` names the server's own, as the compendium-cache server's is.
 * The cookie rides as a request header rather than in the
 * cookie jar: a `Secure` cookie is never sent to the plain-http origin the
 * remote browser reaches the server on.
 */
export async function signInAs(
  page: Page,
  email: string,
  providers: readonly string[] = ['discord'],
  role: 'user' | 'admin' = 'user',
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
      // Stamped as its own creator, as the sign-up hook stamps one.
      await tx`
        insert into users (id, name, email, email_verified, role, can_create_workspace, created_by, updated_by)
        values (${userId}, 'Fixture Person', ${email}, ${emailVerified}, ${role}, ${role === 'admin'}, ${userId}, ${userId})
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

  await page.setExtraHTTPHeaders({ cookie: `${SESSION_COOKIE}=${signed(token, secret)}` });
  return { userId };
}
