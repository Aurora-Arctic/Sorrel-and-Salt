import NotAuthorized from '@/components/NotAuthorized';

// What `forbidden()` renders, with a 403. It is in the shell's route group because the `/curator` and `/keepers` layouts
// and the coven invitations page throw it and a segment's own boundary sits inside its layout, so the bar still shows
// (claude-docs/auth/admin-guard.md, "The admin guard"). `NotAuthorized` draws the centred `main` itself.
export default function ForbiddenPage() {
  return <NotAuthorized />;
}
