// The path of one of the app's own APIs (`/api/graphql`, `/api/auth`), with an
// optional prefix in front. The prefix is empty in the app. The component
// workshop sets `WORKSHOP_API_PREFIX=/workshop` at build time so its stories
// call `/workshop/api/...` instead: staging's Content Security Policy lets a
// workshop page reach only addresses under /workshop/, and a request there is
// answered by the workshop's mock service worker, never by the real API
// (claude-docs/workshop.md, "On staging"). Read at the call site, not here, so
// a test can set it before the module under test loads. The name has no
// NEXT_PUBLIC_ on purpose: Next builds every NEXT_PUBLIC_ variable into the
// live site's browser code, so setting one on Vercel would send the real
// site's requests to the wrong address. Only the workshop's Vite build
// replaces this name, and in the app's browser code it is undefined.

export function apiPath(path: `/${string}`): string {
  return `${process.env.WORKSHOP_API_PREFIX ?? ''}${path}`;
}
