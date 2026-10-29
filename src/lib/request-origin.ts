/**
 * This request's own base URL under `path`, as Better Auth resolves it against its allowed hosts, for a link a mail carries: a forged Host cannot send a link to
 * another site. `auth` is imported at call time, as the GraphQL route's tests build under NODE_ENV=production, where Better Auth refuses to start without secrets.
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
