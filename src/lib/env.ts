/**
 * An environment variable every deploy must set, as every deploy runs at NODE_ENV=production: unset or empty there it throws, so a caller reading it at
 * load fails the build, not the first request. `next dev` and Vitest read it unset as `undefined` (claude-docs/auth/config.md, "Config").
 *
 * @throws {Error} unset at NODE_ENV=production.
 */
export function requiredInProduction(name: string): string | undefined {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error(`${name} is not set`);
  }
  return value || undefined;
}
