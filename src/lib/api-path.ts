// The path of one of the app's own APIs, with a prefix that is empty in the app and `/workshop` in the
// component workshop's build (claude-docs/workshop.md, "The API prefix"). Read at the call site so a test can
// set it first; the name has no `NEXT_PUBLIC_` on purpose.

export function apiPath(path: `/${string}`): string {
  return `${process.env.WORKSHOP_API_PREFIX ?? ''}${path}`;
}
