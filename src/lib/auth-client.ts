'use client';

import { createAuthClient } from 'better-auth/react';
import { adminClient, lastLoginMethodClient } from 'better-auth/client/plugins';
import { apiPath } from './api-path';
import { LAST_USED_PROVIDER_COOKIE } from './sign-in';

// No baseURL: the client infers the current origin, which the app and /api/auth share. Better Auth's client assigns `window.location.href` for the OAuth hop,
// so component tests mock this module. `adminClient` is for the two impersonation calls alone: its other methods name endpoints never mounted, and where
// impersonation is off the two answer 404 (claude-docs/auth/impersonation.md).
export const authClient = createAuthClient({
  basePath: apiPath('/api/auth'),
  plugins: [lastLoginMethodClient({ cookieName: LAST_USED_PROVIDER_COOKIE }), adminClient()],
});

export const { signIn, signOut, linkSocial, unlinkAccount, getLastUsedLoginMethod, useSession } =
  authClient;
export const { impersonateUser, stopImpersonating } = authClient.admin;
