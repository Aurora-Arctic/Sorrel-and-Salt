import { CuratorContents } from '@/components/AdminNav';
import { CURATOR_LEDE } from './head';
import PageHeader from '@/components/PageHeader';
import { requireCuratorSession } from '@/lib/request-session';

export default async function CuratorPage() {
  await requireCuratorSession();

  return (
    <main className="admin-index">
      <PageHeader title="Curator" lede={CURATOR_LEDE} />
      <CuratorContents />
    </main>
  );
}
