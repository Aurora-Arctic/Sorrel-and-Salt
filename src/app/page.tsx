import Welcome from '../components/Welcome';
import { getSession } from '../lib/request-session';
import { postSignInLanding } from '../lib/sign-in';

// The one public page that reads the session — with getSession(), never
// requireSession(), which would redirect the signed-out visitors it exists
// for — and reads it for one thing: which way in to offer, the landing for a
// signed-in visitor's role or the sign-in page.
// See claude-docs/design-decisions/mb.57-post-sign-in-landing.md.
export default async function HomePage() {
  const session = await getSession();

  return (
    <main className="welcome-page">
      <Welcome landing={session ? postSignInLanding(session.role) : undefined} />
    </main>
  );
}
