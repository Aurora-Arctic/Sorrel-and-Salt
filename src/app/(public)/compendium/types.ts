import type { CompendiumSearchParams } from '../../(shell)/admin/compendium/types';

export interface PublicCompendiumPageProps {
  // A promise in Next 16: awaited before use.
  searchParams: Promise<PublicCompendiumSearchParams>;
}

/** The address: the admin list's filters, which the public page reads all but No Refs of. */
export type PublicCompendiumSearchParams = CompendiumSearchParams;
