import { CuratorContents } from '../../../components/AdminNav';
import PageHeader from '../../../components/PageHeader';
import { requireCuratorSession } from '../../../lib/request-session';

export default async function CuratorPage() {
  await requireCuratorSession();

  // A head with a lede, then a table of contents in the nav's own sections.
  return (
    <main className="admin-index">
      <PageHeader
        title="Curator"
        lede="Here you curate what every coven reads from. Pick a page below, or from the links at the top of any Curator page."
      />
      <CuratorContents />
    </main>
  );
}
