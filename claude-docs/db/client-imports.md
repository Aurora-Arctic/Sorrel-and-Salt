## Who may import the client (M1.17)

CLAUDE.md rule 2 — only `src/db/repository/` may import `db` — is enforced
by a `no-restricted-imports` entry in `.oxlintrc.json`. It bans every
relative shape `connection.ts` can be reached by (`./connection`,
`../connection`, `**/db/connection`, with or without the `.ts`), type-only imports included,
so a new importer fails `npm run lint` and the pr-gate lint job.

Exemptions are `// oxlint-disable-next-line no-restricted-imports` comments on
the import itself, not config: oxlint 1.82 **ignores** a rule set to `"off"`
or `"allow"` inside an `overrides` block, so a per-file exemption there would
look like it worked and silently do nothing. Six files carry one:

| File                                       | Why it needs a client, not a writer                                                                                                                                                                                                                             |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/db/repository/write.ts`               | The choke point itself — the rule exists to protect it. `withAudit` opens the transaction every write runs in.                                                                                                                                                  |
| `src/db/repository/select.ts`              | The choke point again: `selectFrom`, the one read query builder.                                                                                                                                                                                                |
| `src/db/repository/provisional-users.ts`   | The choke point again: the one `users` hard delete, which runs outside `withAudit` (see "The provisional-account delete").                                                                                                                                      |
| `src/lib/auth.ts`                          | Better Auth's `drizzleAdapter(db, …)` takes the Drizzle client. It runs its own inserts through its adapter and database hooks (`claude-docs/auth.md`), so there is no session to hand `withAudit`; the user-create hook stamps `createdBy`/`updatedBy` itself. |
| `scripts/db-seed.ts`                       | The seed CLI constructs the handle it passes to `seed(db, …)`, which writes as the bootstrap user rather than through a session.                                                                                                                                |
| `tests/db/test-database-isolation.test.ts` | The connection _is_ the subject: it asserts `db` points at this worker's `sorrel_test_<n>` clone (M1.9).                                                                                                                                                        |

That list is pinned by `tests/guards/lint-db-client-boundary.test.ts`, which
lints deliberate violations written to a temp directory and asserts the exemption
set is exactly those six. Adding a seventh turns that test red, so it has to be
argued for in the diff rather than appearing quietly beside an import. The
violations are written at test time rather than committed as fixtures because
oxlint skips anything matching the config's `ignorePatterns` even when the
path is passed explicitly — `--no-ignore` does not override it — so a
committed fixture would have to be lintable by `npm run lint`, and would then
fail the very check it exists to prove.
