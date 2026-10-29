import { AdminContents } from '../../../components/AdminNav';
import { requireCuratorSession } from '../../../lib/request-session';

export default async function AdminPage() {
  const { role } = await requireCuratorSession();
  const managesPeople = role === 'admin';

  // A lede, then a table of contents in the nav's own sections. The lede stays a `<p>` in `main`:
  // tests/e2e/admin.spec.ts measures it against the reading measure on this layout.
  return (
    <main>
      <h1>Admin</h1>
      <p className="lede">
        Here you curate what every coven reads from
        {managesPeople && ', and manage who uses the site'}. Pick a page below, or from the admin
        links at the top of any admin page.
      </p>
      <AdminContents managesPeople={managesPeople} />
    </main>
  );
}
