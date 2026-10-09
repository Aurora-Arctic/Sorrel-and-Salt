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
  `tests/db/seeded-template.test.ts`'s claim, made against the real rows every
  `db` file is cloned from (MB.183); re-proving it here would cost a second
  migrate-and-seed harness to assert something already asserted.
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
