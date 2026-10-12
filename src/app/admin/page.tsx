import { AdminContents } from '../../components/AdminNav';
import { requireAdminSession } from '../../lib/request-session';

export default async function AdminPage() {
  await requireAdminSession();

  // A lede, then a table of contents in the nav's own sections (MB.115). The
  // lede stays a `<p>` in `main`: tests/e2e/admin.spec.ts measures it against
  // the reading measure on this layout.
  return (
    <main>
      <h1>Admin</h1>
      <p className="lede">
        Here you curate what every coven reads from, and manage who uses the site. Pick a page
        below, or from the admin links at the top of any admin page.
      </p>
      <AdminContents />
    </main>
  );
}
