import NotAuthorized from '../../components/NotAuthorized';

// What `forbidden()` renders, with a 403. It is in the shell's route group because the `/admin` layout
// throws it and a segment's own boundary sits inside its layout, so the bar still shows
// (claude-docs/auth/admin-guard.md, "The admin guard"). `page-frame` is the centred column.
export default function ForbiddenPage() {
  return (
    <main className="page-frame">
      <NotAuthorized />
    </main>
  );
}
