'use client';

import { useSyncExternalStore } from 'react';

// Runs before first paint, so a stored choice never flashes the wrong theme. With nothing stored it
// sets nothing: globals.scss resolves an absent data-theme through prefers-color-scheme, and stamping
// one here would need a matchMedia listener. A blocked localStorage costs persistence, not the page.
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

// Facebook sends the browser back to the redirect URI with `#_=_` appended, and a fragment survives
// every redirect whose Location carries none, so it reaches whatever page the sign-in lands on, where
// the server, which never sees a fragment, cannot strip it. Exactly that fragment, before first paint;
// an in-page anchor keeps its own.
const STRIP_FACEBOOK_HASH_SCRIPT = `(function(){if(location.hash==="#_=_"){try{history.replaceState(null,"",location.pathname+location.search)}catch(e){}}})()`;

// Marks the document as one whose script runs, before first paint. A panel drawn open so that a form
// works without script (the compendium's Filters) is hidden under this mark until its component takes
// over, so it never flashes open; without script the mark never lands and the panel stays. It rides
// here because it has the same job as the theme script: set something on <html> that the first paint
// must already see, and exist only in the server's HTML.
const JS_FLAG_SCRIPT = `document.documentElement.setAttribute("data-js","")`;

// The Compact switch is on by default, so only a stored "regular" needs to reach <html> before first
// paint: the compact selectors switch themselves off under it, and a stored compact (or nothing) sets
// nothing. A blocked localStorage leaves the page compact. The key is CardDensitySwitch's
// STORAGE_KEY; keep in sync.
const CARD_DENSITY_SCRIPT = `(function(){try{if(localStorage.getItem("card-density")==="regular")document.documentElement.setAttribute("data-card-density","regular")}catch(e){}})()`;

const subscribeToNothing = () => () => {};

/**
 * The root layout's four pre-paint scripts, for a document the server rendered. Next answers a
 * `forbidden()` or `notFound()` thrown during render with an empty error shell and has the browser
 * render the page itself; a script React creates there never runs, and React warns. The server
 * snapshot is what the server and hydration see, so the scripts exist exactly as long as the
 * server's HTML does (claude-docs/auth/admin-guard.md, "The admin guard").
 */
export default function PrePaintScripts() {
  const fromServerHtml = useSyncExternalStore(
    subscribeToNothing,
    () => false,
    () => true,
  );
  if (!fromServerHtml) return null;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      <script dangerouslySetInnerHTML={{ __html: STRIP_FACEBOOK_HASH_SCRIPT }} />
      <script dangerouslySetInnerHTML={{ __html: JS_FLAG_SCRIPT }} />
      <script dangerouslySetInnerHTML={{ __html: CARD_DENSITY_SCRIPT }} />
    </>
  );
}
