import { emailVerificationSender } from '../lib/email-verification';
import { sessionFromHeaders } from '../lib/request-session';
import { createLoaders } from './loaders';
import type { Context } from './types';

/** Yoga's `context` option, called once per request. */
export async function createContext({ request }: { request: Request }): Promise<Context> {
  const session = await sessionFromHeaders(request.headers);
  return {
    session,
    loaders: createLoaders(session),
    emailVerification: emailVerificationSender(request),
  };
}
