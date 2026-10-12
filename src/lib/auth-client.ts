'use client';

import { createAuthClient } from 'better-auth/react';
import { adminClient, lastLoginMethodClient } from 'better-auth/client/plugins';
import { LAST_USED_PROVIDER_COOKIE } from './sign-in';

// No baseURL: the client infers the current origin, and the app and
// /api/auth share one (src/lib/auth.ts, "baseURL"). Better Auth's client
// fetch plugin performs the OAuth hop by assigning `window.location.href`
// directly rather than returning a URL to navigate to — component tests
// mock this module rather than letting jsdom attempt that navigation.
//
// `adminClient` for the two impersonation calls alone (MB.53). Its other
// methods name endpoints the server never mounts, and where impersonation is
// off the two it uses answer 404 (claude-docs/auth/impersonation.md).
export const authClient = createAuthClient({
  plugins: [lastLoginMethodClient({ cookieName: LAST_USED_PROVIDER_COOKIE }), adminClient()],
});

export const { signIn, signOut, linkSocial, unlinkAccount, getLastUsedLoginMethod, useSession } =
  authClient;
export const { impersonateUser, stopImpersonating } = authClient.admin;
