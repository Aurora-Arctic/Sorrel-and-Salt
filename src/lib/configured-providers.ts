// The one server-side read of which providers hold credentials, for a server component to pass as a `configured` prop: the env var names behind it never reach the client bundle,
// only the ids do. The one exemption from the restricted import of social-providers-config.ts (.oxlintrc.json).
// oxlint-disable-next-line no-restricted-imports
import { configuredProviders } from './social-providers-config';
import type { ProviderId } from './types';

export function providersToPass(): ProviderId[] {
  return configuredProviders();
}
