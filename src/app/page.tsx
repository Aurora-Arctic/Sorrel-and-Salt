import Welcome from '../components/Welcome';
import { getSession } from '../lib/request-session';
import { signedInLanding } from '../lib/landing';

// The one public page that reads the session — with getSession(), never
// requireSession(), which would redirect the signed-out visitors it exists
// for — and reads it for one thing: which way in to offer, where a signed-in
// visitor belongs (their first coven, or their role's landing) or the sign-in
// page.
// See claude-docs/design-decisions/mb.57-post-sign-in-landing.md.
export default async function HomePage() {
  const session = await getSession();

  return (
    // `page-frame` is the layout. `welcome-page` styles nothing: it stays as
    // the hook Backdrop's `body:has(.welcome-page)` reads to draw its larger
    // front-door art, so the root layout needs no route awareness.
    <main className="page-frame welcome-page">
      <Welcome landing={session ? await signedInLanding(session) : undefined} />
    </main>
  );
}
