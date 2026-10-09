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
- **It never touches the database.** Whether A exists is
  `tests/db/seed/standard.test.ts`'s claim, made against real rows; re-proving
  it here would cost a second migrate-and-seed harness to assert something
  already asserted.
- **`tests/support/as-user.test.ts` loops over `FIXTURE_USERS` rather than naming
  five cases**, so a sixth fixture user is covered the day it is added. It
  also carries a `@ts-expect-error` compile assertion that an id alone cannot
  make a session — the role has to come off the row.

**Assert the type, never the message.** `Forbidden` and `NotFound`
(`src/lib/errors.ts`) exist so a refusal test survives a reworded message, and
so the two refusals stay distinguishable — see
`claude-docs/auth/service-session.md` for why a route needs to know which one
happened.

`tests/lib/errors.test.ts` proves the assertion style can actually fail, which is
the only thing that makes it worth writing. Three of its cases assert that an
_inner_ expectation rejects:

```ts
const silentNoOp = async (): Promise<string[]> => [];

await expect(expect(silentNoOp()).rejects.toThrow(Forbidden)).rejects.toThrow();
```

That is the bug the pair exists to catch — a service that checks nothing and
answers an unauthorized read with an empty list or an unauthorized write with a
success. Both look like success to a caller, and only an assertion that
demands a rejection tells them apart. A `NotFound` is held to the same
standard: it does not satisfy a test written for a `Forbidden`.

**Over GraphQL, assert the code, never the type.** A resolver test runs its
operation through `tests/support/graphql/run.ts` (MB.185): `run(session, query,
variables)` posts it to Yoga built on the route's schema and the route's own
`maskedErrors`, with a fresh set of loaders, and answers the body the browser
would receive. A refusal is read off `errors[0].extensions.code` — `FORBIDDEN`,
`NOT_FOUND`, `VALIDATION` with its `fieldErrors` — because the wire carries no
`originalError`, and a test that reads one through bare `graphql()` is watching
the service, a second copy of its test. Which roles are refused is the service
test's; a GraphQL file keeps one refusal per error code per field, with its
precondition ([`layer-ownership.md`](layer-ownership.md), "The owning layer").
