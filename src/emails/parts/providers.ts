import { SOCIAL_PROVIDERS } from '../../lib/social-providers';
import type { ProviderId } from '../../lib/types';

export function providerList(providers: readonly ProviderId[]): string {
  const labels = SOCIAL_PROVIDERS.filter((provider) => providers.includes(provider.id)).map(
    (provider) => provider.label,
  );
  return labels.length > 1
    ? `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`
    : (labels[0] ?? '');
}
