import NotAuthorized from '../../components/NotAuthorized';
import PageFrame from '@/components/PageFrame';

// What `forbidden()` renders, with a 403. It is in the shell's route group because the `/curator` and `/keepers` layouts
// throws it and a segment's own boundary sits inside its layout, so the bar still shows
// (claude-docs/auth/admin-guard.md, "The admin guard"). `page-frame` is the centred column.
export default function ForbiddenPage() {
  return (
    <PageFrame>
      <NotAuthorized />
    </PageFrame>
  );
}
