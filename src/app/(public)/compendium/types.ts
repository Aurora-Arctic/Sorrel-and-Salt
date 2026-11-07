import type { CompendiumSearchParams } from '../../(shell)/curator/compendium/types';

export interface PublicCompendiumPageProps {
  searchParams: Promise<PublicCompendiumSearchParams>;
}

export type PublicCompendiumSearchParams = CompendiumSearchParams;
