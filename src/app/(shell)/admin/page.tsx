import { AdminContents } from '../../../components/AdminNav';
import PageHeader from '../../../components/PageHeader';
import { requireCuratorSession } from '../../../lib/request-session';

export default async function AdminPage() {
  const { role } = await requireCuratorSession();
  const managesPeople = role === 'admin';

  // A head with a lede, then a table of contents in the nav's own sections.
  return (
    <main>
      <PageHeader
        title="Admin"
        lede={
          <>
            Here you curate what every coven reads from
            {managesPeople && ', and manage who uses the site'}. Pick a page below, or from the
            admin links at the top of any admin page.
          </>
        }
      />
      <AdminContents managesPeople={managesPeople} />
    </main>
  );
}
