import type { AnonymousMinter } from '@/modules/support';

// Where a signed-out support send meets Better Auth's anonymous sign-in, which answers only on the server. It mints the
// provisional account and its session, and hands the session's cookie to `setCookies`, which the GraphQL route puts on the
// response. Handed to the service by the GraphQL context, as a service may not import `auth`; imported at call time, for the
// reason `requestOrigin` gives.

export function anonymousMinter(request: Request, setCookies: string[]): AnonymousMinter {
  return {
    async mint() {
      const { auth } = await import('./auth');
      const { headers, response } = await auth.api.signInAnonymous({
        headers: request.headers,
        returnHeaders: true,
      });
      setCookies.push(...headers.getSetCookie());
      const userId = response?.user.id;
      if (!userId) throw new Error('The anonymous sign-in returned no account.');
      return userId;
    },
  };
}
