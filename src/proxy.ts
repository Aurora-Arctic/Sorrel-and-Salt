import { getSessionCookie } from 'better-auth/cookies';
import { type NextRequest, NextResponse } from 'next/server';
import { RETURN_PATH_HEADER, signInPath } from './lib/sign-in';

// Route protection's first layer: deny by default, so a route nobody thought
// about is protected rather than open. The check is optimistic — is a session
// cookie present — and never touches the database; `requireSession()` in the
// page is the check that does. See claude-docs/auth.md, "Route protection".

/**
 * The pages a signed-out visitor may reach. An entry is an exact path, or a
 * path ending `/*` for everything beneath it — so `/sign-in` does not admit
 * `/sign-in-help`, and `/invite/*` does not admit `/invites`.
 */
const PUBLIC_ROUTES = [
  '/', // the entry page
  '/sign-in',
  '/invite/*', // accepting an invitation
];

function isPublic(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) =>
    route.endsWith('/*') ? pathname.startsWith(route.slice(0, -1)) : pathname === route,
  );
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  const returnPath = `${pathname}${search}`;

  if (!isPublic(pathname) && !getSessionCookie(request)) {
    return NextResponse.redirect(new URL(signInPath(returnPath), request.url));
  }

  // Set on every request the proxy passes, so a client-supplied value never
  // survives to the page.
  const headers = new Headers(request.headers);
  headers.set(RETURN_PATH_HEADER, returnPath);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Everything except what is never a page: Next's own assets, and `/api/*`,
  // which answers for itself — Better Auth's handshake, and GraphQL refusing in
  // its own error shape rather than redirecting a fetch. Nothing else is
  // exempt, so a file dropped into public/ is a protected page to this matcher
  // until it gets its own entry here — which is why the backdrop's images are
  // imported by their stylesheet and served under /_next/ instead. A named
  // prefix, never a file-extension pattern: what is public is listed, as in
  // PUBLIC_ROUTES. Must be a literal: Next reads it at build time.
  matcher: ['/((?!api/|_next/).*)'],
};
