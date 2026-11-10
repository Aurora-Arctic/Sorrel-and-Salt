import { MintCards } from '@/components/AdminCards';
import { readCardsFilter } from '@/components/AdminCards/filter-params';
import { requireAdminSession } from '@/lib/request-session';
import { readListPlace } from '@/app/(shell)/_admin/list-page';
import type { CardsPageProps } from '../../invitation-cards/types';

export default async function CardsAction({ searchParams }: CardsPageProps) {
  await requireAdminSession();
  const params = await searchParams;
  const { after, before } = readListPlace(params);
  return <MintCards cursor={{ after, before }} filter={readCardsFilter(params)} />;
}
