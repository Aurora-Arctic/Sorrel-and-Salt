/** What a Better Auth call answers for a refusal; a dropped connection has none of the three. */
export interface AuthFailure {
  status?: number;
  code?: string;
  message?: string;
}

/** Better Auth answers `{ error }` for a refusal and throws for a dropped connection; this turns the throw into an empty `error`. Kept apart from `auth-client` so component tests that mock the client keep it. */
export function settled<T>(call: Promise<T>): Promise<T | { data: null; error: AuthFailure }> {
  return call.catch(() => ({ data: null, error: {} }));
}
