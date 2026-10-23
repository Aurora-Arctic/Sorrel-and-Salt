// The path of one of the app's own APIs (`/api/graphql`, `/api/auth`), with an
// optional prefix in front. The prefix is empty in the app. The component
// workshop sets `NEXT_PUBLIC_API_PREFIX=/workshop` at build time so its stories
// call `/workshop/api/...` instead: staging's Content Security Policy lets a
// workshop page reach only addresses under /workshop/, and a request there is
// answered by the workshop's mock service worker, never by the real API
// (claude-docs/workshop.md, "On staging"). Read at the call site, not here, so
// a test can set it before the module under test loads.

export function apiPath(path: `/${string}`): string {
  return `${process.env.NEXT_PUBLIC_API_PREFIX ?? ''}${path}`;
}
