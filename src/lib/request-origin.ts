/**
 * This request's own base URL under `path`, as Better Auth resolves it
 * against its allowed hosts, for a link a mail carries: a forged Host cannot
 * send someone a link to another site. `auth` is imported at call time: the
 * GraphQL route that hands the senders over is built under
 * NODE_ENV=production in its tests, where Better Auth refuses to start
 * without its secrets, and nothing there sends mail.
 *
 * @throws {Error} where Better Auth resolves none, which its configured `baseURL` rules out.
 */
export async function requestOrigin(request: Request, path: string): Promise<string> {
  const [{ auth }, { resolveBaseURL }] = await Promise.all([
    import('./auth'),
    import('better-auth'),
  ]);
  const origin = resolveBaseURL(auth.options.baseURL, path, request);
  if (!origin) throw new Error('No origin to build a mailed link on');
  return origin;
}
