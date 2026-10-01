import NotAuthorized from '../components/NotAuthorized';

// What `forbidden()` renders, with a 403. At the root because the `/admin`
// layout throws it, and a segment's own boundary sits inside its layout
// (claude-docs/auth/admin-guard.md, "The admin guard").
export default function ForbiddenPage() {
  return (
    <main className="not-authorized-page">
      <NotAuthorized />
    </main>
  );
}
