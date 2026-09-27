import { sessionFromHeaders } from '../lib/request-session';
import type { Session } from '../lib/session';
import { createLoaders, type Loaders } from './loaders';

/** What every resolver receives: who is asking, and this request's loaders. */
export interface Context {
  /** `null` when signed out: the endpoint answers, and a scope or service refuses. */
  session: Session | null;
  loaders: Loaders;
}

/** Yoga's `context` option, called once per request. */
export async function createContext({ request }: { request: Request }): Promise<Context> {
  const session = await sessionFromHeaders(request.headers);
  return { session, loaders: createLoaders(session) };
}
