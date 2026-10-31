import { MintCards } from '../../../../../../components/AdminCards';
import { requireAdminSession } from '../../../../../../lib/request-session';
import { readListPlace } from '../../../list-page';
import type { CardsPageProps } from '../../invitation-cards/types';

// Mint Cards, beside the page's heading while Invitation Cards is open: a link to the tab's `?mint`, keeping its page.
export default async function CardsAction({ searchParams }: CardsPageProps) {
  await requireAdminSession();
  const { after, before } = readListPlace(await searchParams);
  return <MintCards cursor={{ after, before }} />;
}
