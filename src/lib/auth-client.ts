'use client';

import { createAuthClient } from 'better-auth/react';

// No baseURL: the client infers the current origin, and the app and
// /api/auth share one (src/lib/auth.ts, "baseURL"). Better Auth's client
// fetch plugin performs the OAuth hop by assigning `window.location.href`
// directly rather than returning a URL to navigate to — component tests
// mock this module rather than letting jsdom attempt that navigation.
export const authClient = createAuthClient();

export const { signIn } = authClient;
