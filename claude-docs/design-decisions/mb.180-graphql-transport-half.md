# MB.180 — The GraphQL file holds the transport's half

**Status:** decided · **Date:** 2026-10-07

The owner's call, taken while scoping the test-suite consolidation
([`mb.180-plan.md`](mb.180-plan.md)): a resolver test proves what only the
transport can show, and the service test owns the rule. This record says what
the suite had been doing instead, what a resolver test can catch, and the two
backstops the change was accepted with. `claude-docs/testing/layer-ownership.md`
carries the rule as a table; `graphql/schema.md` points here.

## Where things stood

`claude-docs/graphql/schema.md` said, of each mutation family, that its test
"runs the three mutations through Yoga with the route's `maskedErrors`, so each
refusal is asserted as the browser receives it" (its lines 528–530, 567 and
610). Read as a doctrine, that sentence asked every resolver file to repeat
every refusal its service makes, and the files did: of the 119 tests under
`tests/modules/ingredients/graphql/`, 75 re-ran a scenario a service,
repository or validation test already proves — the same role refused at the
same row, the same Zod issue, the same search — against their own headers.
`workspace-ingredients.test.ts` opens by saying "The service's own rules are
workspace-ingredients.test.ts's; this file holds the transport's half", and
then holds most of the service's half too.

Two harness styles had grown up beside each other. `workspace-ingredients`,
`compendium-entries` and `references` run Yoga with the route's `maskedErrors`
and assert `extensions.code`, which is the wire. `ingredient`, `duplicates`,
`common-names`, `ingredient-suggestions` and `compendium` call bare
`graphql()` and assert `originalError instanceof Forbidden` — the service's
own observation, seen through a resolver, which is a second copy of the
service test with a slower setup and no new witness.

Every one of those tests runs the real service on Postgres. The resolver's
code path is the same for every caller: it forwards the session and the
arguments, and the service decides. A refusal repeated for a second role or a
second entity exercises no line the first did not.

## What a resolver test can catch

The transport has faults of its own, and they are what its tests are for:

- forgetting to forward the session, or the workspace id, so the service
  answers the wrong question or none;
- the wrong auth scope on a field — `admin` where `signedIn` was meant, or
  none at all;
- an SDL shape the service refuses, such as an input the schema admits but
  Zod does not, or a required argument the SDL made optional;
- an error-to-code mapping wrong for one path, where
  `tests/graphql/errors.test.ts` proves the generic mapping and a field's
  own test proves that field reaches it;
- a loader answering a stale row after the mutation that changed it.

None of these is a rule. Each is a wiring fault, and one test per fault per
field finds it.

## Decision

A GraphQL test file holds the transport's half alone:

- **One refusal per error code per field**, with the precondition that would
  have let it succeed, run through Yoga with the route's `maskedErrors` and
  asserted as `extensions.code`. The precondition is what CLAUDE.md's Testing
  section asks of every authorization test: a test that stays green with the
  guard removed proves nothing.
- **The service test owns the rule.** Which roles are refused at which rows,
  direct-id and with preconditions, is proved once, in
  `tests/modules/*/services/`, and nowhere above it.
- The GraphQL file additionally holds **SDL-level refusals**, **auth-scope
  refusals** — a separate gate, since `authScopes: { admin: true }` refuses
  before the service runs, and no service test reaches it — **loader cache
  clearing**, **one read per page**, **edge fields**, and **any mode no
  service test reaches**, such as the compendium-only `workspaceId: null`
  until MB.187 gives it a service twin.

## Pros and cons, as weighed

Pros:

- The files' own headers and CLAUDE.md rule 1 already said so: two
  transports, one set of rules, because both end at the same service
  function. The change makes the suite match its stated intent rather than
  changing the intent.
- One owner per rule. A reviewer checking a refusal reads one file, and a
  rule that changes is changed in one test.
- Growth at that layer halves. Every new service refusal had been costing two
  tests; it now costs one, plus a resolver test only when a new error code
  appears at a field.
- The real guard is untouched: the service tests, direct-id and
  precondition-asserting, are the constraint the plan never deletes.

Cons:

- A wire regression affecting only one scenario would pass. A resolver that
  special-cased a role — refused owners where the service refuses viewers,
  say — would be caught by the one kept refusal only if it was that role's.
  This is a review concern as much as a test one: a resolver may hold no
  authorization, and a diff that adds some is the bug.
- The time saved is small: roughly 5 s of summed worker time across the
  ingredients files. The payoff is count and growth, not the clock.
- The per-field sections in `graphql/schema.md` must be rewritten, since
  each one names what its test file asserts.
- The class-asserting files must move harness, or the one refusal each keeps
  is a pure duplicate of the service test rather than a wire observation.

## Backstops

The owner accepted the change with two backstops, so that what the per-file
tests stop repeating is still made impossible somewhere:

1. **The field sweep grows.** `tests/db/graphql-query-scopes.test.ts`, which
   already classifies every `Query` field and probes it signed-out, gains the
   same loop over every `Mutation` field, and for every workspace-taking
   field the null-workspace variant. Its first test asserts the probe table
   equals the schema's field list, so a new field cannot forget its gate
   whatever its own file asserts.
2. **One harness.** The six class-asserting resolver files move onto a shared
   Yoga harness, `tests/support/graphql/run.ts` (MB.185), so the one kept
   refusal per code at every field is the wire observation — `extensions.code`
   through the route's `maskedErrors` — and not the thrown type.

## What it rules out

- A GraphQL test that re-runs a service scenario for a second role or a
  second entity. The service test has it.
- `originalError instanceof` assertions in a resolver test. The wire has no
  `originalError`; a test that reads one is observing the service.
- A validation case re-sent through a mutation when
  `tests/graphql/errors.test.ts` already proves that a `ValidationError` maps
  to `VALIDATION` with one `fieldErrors` entry per issue. A field keeps one
  such case, to prove it reaches the mapping, and
  `tests/modules/*/validation/` keeps the rest.

## Consequences

- **MB.185** applies the rule to the ingredients GraphQL files and
  **MB.186** to vocabulary, identity and coven, each rewriting
  `graphql/schema.md`'s per-field sentences to say what the file now holds,
  and each naming every deleted test's owner in its PR body.
- `claude-docs/testing/layer-ownership.md` carries the rule, in the table
  every later consolidation task cites.
- The alternative — keeping every refusal mirrored at the resolver, which is
  what the schema.md sentences read as — was rejected because the suite's own
  headers said it was never the intent, and because the mirrored tests
  watched the service, not the wire.
