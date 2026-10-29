/**
 * This request's own base URL under `path`, as Better Auth resolves it against its allowed hosts, so a forged Host cannot redirect a mailed link.
 * `auth` is imported at call time, as Better Auth refuses to start without secrets under NODE_ENV=production. @throws {Error} where none resolves.
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
