import type { Metadata, Route } from 'next';
import type { Session } from '../lib/session';
import Welcome from '../components/Welcome';
import { getSession, sessionIsVerified } from '../lib/request-session';
import { websiteJsonLd } from '../lib/json-ld';
import { emailPagePath } from '../lib/account-email';
import { signedInLanding } from '../lib/landing';
import { SITE_NAME } from '../lib/site';
import { publicPageMetadata } from '../lib/page-metadata';

// The one public page that reads the session, with getSession() as requireSession() would redirect the
// signed-out visitors it exists for. It offers a signed-in visitor their landing, or sign-in; an
// unverified account gets the email page. See claude-docs/design-decisions/auth.md, "Where the post-sign-in landing lives".
const DESCRIPTION = 'A compendium, ingredient store and grimoire.';

export const metadata: Metadata = publicPageMetadata(SITE_NAME, DESCRIPTION, '/', {
  absolute: true,
});

async function continueTarget(session: Session): Promise<Route> {
  const landing = await signedInLanding(session);
  return (await sessionIsVerified()) ? landing : (emailPagePath(landing) as Route);
}

export default async function HomePage() {
  const session = await getSession();

  return (
    <>
      {/* `page-frame` is the layout. `welcome-page` styles nothing: it stays as the hook Backdrop's
          `body:has(.welcome-page)` reads to draw its larger front-door art, so the root layout needs no
          route awareness. */}
      <main className="page-frame welcome-page">
        {!session && (
          <script
            type="application/ld+json"
            // Our own serialiser's output, with `<` escaped (src/lib/json-ld.ts).
            dangerouslySetInnerHTML={{ __html: websiteJsonLd() }}
          />
        )}
        <Welcome landing={session ? await continueTarget(session) : undefined} />
      </main>
    </>
  );
}
