## The service-level session, and the three errors (M1.26, MB.43)

`src/lib/session.ts` defines the `Session` every service takes:

```ts
export interface Session extends AuditSession {
  role: UserRole;
}
```

**This is not Better Auth's `sessions` row.** That row is the browser's proof
of identity and lives behind `/api/auth`; a `Session` is what the server has
already resolved out of it. Keeping the two apart is part of why MB.30 turned
the organization plugin down — calling its server API from a service would have
made every fixture user a `sessions` row and a signed cookie, and `asUser(A)`
would have stopped being a service-level value at all. `src/lib/request-session.ts`
produces one from a request (M2.7, ["Route protection"](route-protection.md)); M1.26 defined the
shape ahead of it so authorization tests could be written first, and
`tests/support/as-user.ts` produces one from a fixture user
(`claude-docs/testing/acting-as-fixture-users.md`).

- **It extends `AuditSession` rather than restating `userId`.** The identity a
  call acts under and the identity it is stamped with are one field, so
  `withAudit(session, fn)` takes a service session directly and no test needs
  a cast to get one in — a cast being exactly where the acting user stops
  being the one the test named (CLAUDE.md rule 3).
- **`role` is on the session.** M5.7 puts a Pothos auth scope on every admin
  mutation as a second, independent check on top of the service's own, and a
  schema-layer scope reads the context rather than running a query.
- **`canCreateWorkspace` is deliberately not.** Accepting an invitation flips
  the flag mid-session (M7.5), and a snapshot taken before that would deny a
  user something they had just earned. The service that gates on it reads the
  row.
- **Nothing else belongs on it.** The workspace is in the URL, not the
  session — session-held workspace context is how two tabs come to disagree
  about where a write landed (DESIGN.md §9) — and membership is not a session
  field but M6.3's `Membership` proof, which only `assertMembership` can
  produce.

`src/lib/errors.ts` carries the three ways a service ends a call it cannot
perform: two refusals and a bad value. A service **throws**; it never answers
with an empty list, a null, or a success that did nothing.

| Error             | Means                                                                  |
| ----------------- | ---------------------------------------------------------------------- |
| `Forbidden`       | The thing exists and you may not have it.                              |
| `NotFound`        | There is nothing here under that id.                                   |
| `ValidationError` | The input broke a rule; `issues` says which field and why, one by one. |

A `ValidationError`'s `issues` are `{ path, message }[]`. `path` names the
input field in the shape of the operation's input, such as `['canonicalName']`
or `['folkNames', 2]`, and is empty for a rule that belongs to no one field.
The type carries issues but does not produce them, so `errors.ts` depends on
no schema library, and a seed or a script can throw one. The adapter that turns
a failed Zod parse into issues is `src/lib/validation.ts` (M4.5). A refusal
that is not about a value, such as the last-owner guard, stays a `Forbidden`
with an explaining message.

They are types rather than message strings so a test can assert on the type:
wording gets edited, and a test pinned to a message keeps passing against a
service that has stopped checking anything.

They are two types rather than one because **the route decides which of them
the browser is shown, and it can only decide if the service said which
happened**: `/coven/[slug]` answers 404 to a non-member, since the existence of
a workspace is itself private, while `/admin` answers a styled "not authorized"
page, since everyone already knows that path exists (CLAUDE.md's domain
invariants). None of the three carries a status code or a GraphQL error code:
the transport renders a refusal, and a service called from a script has no use
for one. Over GraphQL, the code is attached on the way out by
`src/graphql/errors.ts`, the route's `maskedErrors` mapping (MB.43). Each type
leaves as `VALIDATION` (with `fieldErrors`), `FORBIDDEN` or `NOT_FOUND`, with
the service's message verbatim, and anything else leaves masked
(`graphql/errors.md`, "Errors").

Both take a message and default to a short one, because DESIGN.md §5's one-way
widen requires an _explaining_ error where a bare refusal would mislead:
narrowing a spell's visibility is refused with the reason, not with a one-word
`Forbidden`.
