/**
 * The pages a signed-out visitor may reach. An entry is an exact path, or a path ending `/*` for everything beneath it, so
 * `/sign-in` does not admit `/sign-in-help`.
 */
export const PUBLIC_ROUTES = [
  '/',
  '/sign-in',
  '/forgot-password',
  '/reset-password',
  '/access-paused', // where a paused account's pages send it; the page reads the session itself
  '/invite/*',
  '/i/*', // a card's short link, accepting like /invite/*
  '/email/*', // public/email/: a mail client fetches its images and fonts with no cookie
  '/compendium', // the one public surface, read by anyone, indexed by search engines
  '/compendium/*',
  '/support', // offers a signed-out visitor Sign In and holds no data
  '/support/request', // a mailed view link: the token in the fragment is the authority, so it needs no session
  '/support/request/*', // the old path form, left public so it answers 404 rather than sending a visitor to sign in
  '/privacy',
  '/privacy/versions/*',
  '/disclaimer',
  '/disclaimer/versions/*',
  '/about',
  '/terms',
  '/terms/versions/*',
  '/code-of-ethics',
  '/code-of-ethics/versions/*',
  '/help',
  '/help/glossary',
  '/help/search',
  // What a crawler or a browser asks for with no cookie and no page to ask it.
  // The icon files are listed ahead of their existence so the first favicon request
  // is never redirected to sign-in.
  '/robots.txt',
  '/sitemap.xml',
  '/llms.txt',
  '/.well-known/*', // ai-catalog.json and ard.json
  '/favicon.ico',
  '/icon.png',
  '/icon.svg',
  '/apple-icon.png',
  '/manifest.webmanifest',
  '/opengraph-image', // the site share card for `/`; the compendium's cards sit under /compendium/*
];

/** A public help article is /help/<slug> or /help/<parent>/<slug>; /help/staff and everything beneath it is for curators and keepers. */
const HELP_ARTICLE = /^\/help\/(?!staff(?:\/|$))[^/]+(?:\/[^/]+)?$/;

export function isPublic(pathname: string): boolean {
  return (
    HELP_ARTICLE.test(pathname) ||
    PUBLIC_ROUTES.some((route) =>
      route.endsWith('/*') ? pathname.startsWith(route.slice(0, -1)) : pathname === route,
    )
  );
}

/** The areas Sign Out reloads in place, each page only where a signed-out visitor may read it: the compendium, the public help pages, and the site documents with their versions. */
const STAY_ON = [
  '/compendium',
  '/help',
  '/privacy',
  '/disclaimer',
  '/about',
  '/terms',
  '/code-of-ethics',
];

/**
 * Where Sign Out lands: the compendium, help or document page the visitor is on, which loads again signed out, or `/`
 * from any other page.
 */
export function signOutDestination(pathname: string): string {
  const stays =
    isPublic(pathname) &&
    STAY_ON.some((root) => pathname === root || pathname.startsWith(`${root}/`));
  return stays ? pathname : '/';
}
