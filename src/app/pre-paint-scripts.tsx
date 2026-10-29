'use client';

import { useSyncExternalStore } from 'react';

// Runs before first paint, so a stored choice never flashes the wrong theme. With nothing stored it
// sets nothing: globals.scss resolves an absent data-theme through prefers-color-scheme, and stamping
// one here would need a matchMedia listener. A blocked localStorage costs persistence, not the page.
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

// Facebook returns the browser with `#_=_` appended, and a fragment survives every redirect that
// carries none, so the server (which never sees fragments) cannot strip it. Exactly that fragment is
// removed before first paint; an in-page anchor keeps its own.
const STRIP_FACEBOOK_HASH_SCRIPT = `(function(){if(location.hash==="#_=_"){try{history.replaceState(null,"",location.pathname+location.search)}catch(e){}}})()`;

// Marks the document as one whose script runs. A panel drawn open so a form works without script (the
// compendium's Filters) is hidden under this mark until its component takes over; without script the
// mark never lands and the panel stays. It rides here because it must be on <html> before first paint.
const JS_FLAG_SCRIPT = `document.documentElement.setAttribute("data-js","")`;

// The Compact switch defaults on, so only a stored "regular" reaches <html> before first paint. A
// blocked localStorage leaves the page compact. The key is CardDensitySwitch's STORAGE_KEY; keep in sync.
const CARD_DENSITY_SCRIPT = `(function(){try{if(localStorage.getItem("card-density")==="regular")document.documentElement.setAttribute("data-card-density","regular")}catch(e){}})()`;

const subscribeToNothing = () => () => {};

/**
 * The root layout's four pre-paint scripts. Next answers `forbidden()` or `notFound()` with an
 * empty error shell, where a script React creates never runs, so they live in the server's HTML.
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
