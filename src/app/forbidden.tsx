import NotAuthorized from '../components/NotAuthorized';

// What `forbidden()` renders, with a 403. At the root because the `/admin`
// layout throws it, and a segment's own boundary sits inside its layout
// (claude-docs/auth/admin-guard.md, "The admin guard"). `page-frame` is the
// centred column every page with no AppShell sits in.
export default function ForbiddenPage() {
  return (
    <main className="page-frame">
      <NotAuthorized />
    </main>
  );
}
