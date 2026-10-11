import type { Metadata } from 'next';
import { requireAdminSession } from '../../lib/request-session';

export const metadata: Metadata = {
  title: 'Admin — Sorrel & Salt',
};

export default async function AdminPage() {
  await requireAdminSession();

  // A `<p>` stays in `main` whatever the index becomes: tests/e2e/admin.spec.ts
  // measures it against the reading measure on this layout (MB.115, 1d.9).
  return (
    <main>
      <h1>Admin</h1>
      <p>
        Here you curate what every coven reads from: the compendium, its categories, and the
        vocabularies of forms, planets, zodiac signs and deities, with the groups that organise
        categories, forms and deities. You also manage who uses the site, and can see who changed
        whose privileges.
      </p>
    </main>
  );
}
