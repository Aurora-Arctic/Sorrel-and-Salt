# Auth

Better Auth runs in-process as Next.js Route Handlers, with its own tables reached through the Drizzle adapter. It adds no service, no deploy and no cost (DESIGN.md §8). `/api/auth/*` is the one place outside GraphQL that carries a session, and it carries only the sign-in handshake. A citation in code names the file below, not this page.

## Files

- `tables.md`: Better Auth's adapter tables and how they are kept.
- `config.md`: `src/lib/auth.ts` settings, secrets, origins and session lifetimes, plus the one exception to the GraphQL-only rule and its boundary.
- `plugins.md`: the registered plugins, including last login method.
- `rate-limiting.md`: the limiter on `/api/auth/*` and its `rate_limits` table.
- `passwords.md`: email and password sign-up and sign-in.
- `two-factor.md`: the six-digit second step.
- `display-names.md`: how a member's name is shown.
- `admin-bootstrap.md`: the first keeper and the self-created user.
- `admin-guard.md`: the `/curator` and `/keepers` layouts and their refusal.
- `admin-users.md`: the keeper's user list and user modal.
- `impersonation.md`: a keeper signing in as another user.
- `coven-guard.md`: the guard on every `/coven/[slug]` page.
- `route-protection.md`: which pages are public and the two layers that protect the rest.
- `service-session.md`: the `Session` every service takes, and the three errors.
- `tests.md`: what the auth tests cover and what they leave to Playwright.
