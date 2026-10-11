## Acting as a fixture user, and asserting a refusal (M1.26)

**`tests/support/as-user.ts`** is the one line an authorization test opens with:

```ts
await expect(spells.create(asUser(C), { workspaceId: W.id, title: 'x' })).rejects.toThrow(
  Forbidden,
);
```

- **`asUser(user)` returns the `Session` a service would have received had that
  user signed in** — `{ userId, role }`, the shape `src/lib/session.ts` defines
  and `claude-docs/auth/service-session.md` explains. It extends `AuditSession`,
  so `withAudit(asUser(A), …)` typechecks with no cast. A fresh object comes
  back per call, so a service that mutates what it is handed cannot carry that
  mutation into the next assertion.
- **The cast is re-exported, not redeclared.** `A`, `B`, `C`, `D` and `E` are
  bindings taken straight from `src/db/seed/standard.ts`'s `FIXTURE_USERS` —
  the same constant the seed inserts. A second copy of the ids in the test
  harness would drift from the database without a single test failing: every
  assertion would stay true of a user nobody had seeded. The parameter is the
  user row rather than a letter for the same reason — there is no mapping in
  the middle to fall out of step, and a user a test creates mid-run acts
  through the same helper.
- **It never touches the database.** Whether A exists is the seed's, which is
  reviewed rather than tested since MB.225 ([`layer-ownership.md`](layer-ownership.md),
  "What a test may assert", rule 1): every `db` file is cloned from the rows
  it inserts, so a missing user fails the first test that acts as one.
- **An id alone cannot make a session** — the role has to come off the row.
  `tests/support/as-user.type-check.ts` holds that as a `@ts-expect-error`
  compile assertion, which `npm run typecheck` reads and nothing runs (MB.224).
- **One non-admin stands for every one where the check reads the site role
  alone.** A refusal that `assertSiteAdmin` or the `admin` scope decides is
  asserted once, as A — an owner, the highest workspace role, and still no
  site role — with its precondition (A's role is `user`, and E's same call
  succeeds), never as A, B, C and D in turn: the four would fail in the same
  diff for the same reason (MB.227). A refusal that turns on a workspace role
  keeps a fixture per role it distinguishes.

What any of these tests may assert at all — state, never copy — is
[`layer-ownership.md`](layer-ownership.md)'s "What a test may assert".

**Assert the type, never the message.** `Forbidden` and `NotFound`
(`src/lib/errors.ts`) exist so a refusal test survives a reworded message, and
so the two refusals stay distinguishable — see
`claude-docs/auth/service-session.md` for why a route needs to know which one
happened.

`tests/lib/errors.test.ts` holds what the style rests on: `Forbidden` and
`NotFound` are distinct `Error` classes that name themselves, and a bare
`Forbidden` carries the sentinel message `'Forbidden'`. A refusal that must
explain itself — a spell narrowed from `workspace` to `private` — is asserted
as the class and as a message other than `new Forbidden().message`, never by
its words. What the style catches is a service that checks nothing and answers
an unauthorized read with an empty list or an unauthorized write with a
success: only an assertion that demands a rejection tells those from success,
and a `NotFound` does not satisfy one written for a `Forbidden`.

**Over GraphQL, assert the code, never the type.** A resolver test runs its
operation through `tests/support/graphql/run.ts` (MB.185): `run(session, query,
variables)` posts it to Yoga built on the route's schema and the route's own
`maskedErrors`, with a fresh set of loaders, and answers the body the browser
would receive. A fourth argument replaces part of that context (MB.186):
loaders a test spies on or shares between operations, to read a cache either
side of a write, or a sender that records what it was asked to mail.
A refusal is read off `errors[0].extensions.code` — `FORBIDDEN`,
`NOT_FOUND`, `VALIDATION` with its `fieldErrors` — because the wire carries no
`originalError`, and a test that reads one through bare `graphql()` is watching
the service, a second copy of its test. Which roles are refused is the service
test's; a GraphQL file keeps one refusal per error code per field, with its
precondition, and reads `extensions.code` without the message beside it
([`layer-ownership.md`](layer-ownership.md), "The owning layer").
