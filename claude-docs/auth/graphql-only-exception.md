## The one exception to the GraphQL-only rule, and its boundary

CLAUDE.md rule 1 says every mutation and every read without a navigation goes
through `/api/graphql`. `/api/auth/*` is the one deliberate exception, and
it is narrower than it looks:

- **What it carries.** OAuth callbacks are browser redirects from Google and
  GitHub carrying query params, and the session cookie is set on an HTTP
  response — neither can travel over a GraphQL POST. `/api/auth/*` exists
  only to complete that handshake and manage the resulting session
  (sign-in, callback, sign-out, session read/refresh).
- **What it never carries.** No ingredient, workspace, spell, or compendium
  data is readable or writable through it. `src/app/api/auth/[...all]/
route.ts` does exactly one thing — hand every request straight to Better
  Auth's own handler (`toNextJsHandler(auth)`, `src/lib/auth.ts`) — and
  imports nothing from `src/modules/*/services/` or `src/graphql/`. There is no code
  path by which an auth endpoint could reach application data.
- **The rule this doesn't relax.** "Application data access" (CLAUDE.md rule 1)
  means the compendium, ingredients, and grimoire — not the protocol handshake
  that establishes who you are. Every later feature still goes through
  `/api/graphql`; nothing about this exception widens as the app grows. The two
  transports that do carry application data, and the rules that bind them, are
  [`graphql/two-transports.md`](../graphql/two-transports.md)'s "The two
  transports".
