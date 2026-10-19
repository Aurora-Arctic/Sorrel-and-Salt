import type { Metadata } from 'next';
import Welcome from '../components/Welcome';
import { getSession } from '../lib/request-session';
import { websiteJsonLd } from '../lib/json-ld';
import { signedInLanding } from '../lib/landing';
import { SITE_NAME, siteUrl } from '../lib/site';

// The one public page that reads the session — with getSession(), never
// requireSession(), which would redirect the signed-out visitors it exists
// for — and reads it for one thing: which way in to offer, where a signed-in
// visitor belongs (their first coven, or their role's landing) or the sign-in
// page.
// See claude-docs/design-decisions/mb.57-post-sign-in-landing.md.
const DESCRIPTION = 'A compendium, ingredient store and grimoire.';

// The site's name alone, absolute so the layout's template does not add it twice.
// Canonical is the bare origin. The same for every visitor; only a signed-out one
// is shown the `WebSite` markup below (MB.84).
export const metadata: Metadata = {
  title: { absolute: SITE_NAME },
  description: DESCRIPTION,
  alternates: { canonical: siteUrl('/') },
  openGraph: {
    title: SITE_NAME,
    description: DESCRIPTION,
    url: siteUrl('/'),
    siteName: SITE_NAME,
    type: 'website',
  },
  twitter: { card: 'summary', title: SITE_NAME, description: DESCRIPTION },
};

export default async function HomePage() {
  const session = await getSession();

  return (
    // `page-frame` is the layout. `welcome-page` styles nothing: it stays as
    // the hook Backdrop's `body:has(.welcome-page)` reads to draw its larger
    // front-door art, so the root layout needs no route awareness.
    <main className="page-frame welcome-page">
      {!session && (
        <script
          type="application/ld+json"
          // Our own serialiser's output, with `<` escaped (src/lib/json-ld.ts).
          dangerouslySetInnerHTML={{ __html: websiteJsonLd() }}
        />
      )}
      <Welcome landing={session ? await signedInLanding(session) : undefined} />
    </main>
  );
}
