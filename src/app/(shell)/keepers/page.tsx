import { AdminContents } from '../../../components/AdminNav';
import PageHeader from '../../../components/PageHeader';
import { requireCuratorSession } from '../../../lib/request-session';

export default async function KeepersPage() {
  const { role } = await requireCuratorSession();
  const managesPeople = role === 'admin';

  return (
    <main className="admin-index">
      <PageHeader
        title="Keepers"
        lede={
          <>
            Here you answer the help requests people send
            {managesPeople && ', and manage who uses the site'}. Pick a page below, or from the
            links at the top of any Keepers page.
          </>
        }
      />
      <AdminContents managesPeople={managesPeople} />
    </main>
  );
}
