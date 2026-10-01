'use client';

import { useSyncExternalStore } from 'react';

// Runs before first paint, so a stored choice never flashes the wrong theme.
// With nothing stored it sets nothing: globals.scss resolves an absent
// data-theme through prefers-color-scheme, and stamping one here would need a
// matchMedia listener. A blocked localStorage costs persistence, not the page.
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

// Facebook sends the browser back to the redirect URI with `#_=_` appended,
// and a fragment survives every redirect whose Location carries none, so it
// reaches whatever page the sign-in lands on — where the server, which never
// sees a fragment, cannot strip it. Exactly that fragment, before first paint;
// an in-page anchor keeps its own.
const STRIP_FACEBOOK_HASH_SCRIPT = `(function(){if(location.hash==="#_=_"){try{history.replaceState(null,"",location.pathname+location.search)}catch(e){}}})()`;

const subscribeToNothing = () => () => {};

/**
 * The root layout's two pre-paint scripts, for a document the server rendered.
 * Next answers a `forbidden()` or `notFound()` thrown during render with an
 * empty error shell and has the browser render the page itself; a script React
 * creates there never runs, and React warns. The server snapshot is what the
 * server and hydration see, so the scripts exist exactly as long as the
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
    </>
  );
}
