import type { CompendiumSearchParams } from '../../(shell)/curator/compendium/types';

export interface PublicCompendiumPageProps {
  searchParams: Promise<PublicCompendiumSearchParams>;
}

/** The address: the admin list's filters, which the public page reads all but No Refs of. */
export type PublicCompendiumSearchParams = CompendiumSearchParams;
