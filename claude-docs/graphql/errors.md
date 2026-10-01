## Errors

A service ends a call it cannot perform by throwing one of three types from
`src/lib/errors.ts` (`auth/service-session.md`, "The service-level session, and the three
errors"). None of them carries a GraphQL code, because a seed or a script has
no use for one. The code is attached on the way out, by `src/graphql/errors.ts`'s
`maskError`, which the route passes to Yoga as `maskedErrors` (MB.43;
DESIGN.md §7, "Errors"):

| Thrown            | `extensions.code` | Also carries                                      |
| ----------------- | ----------------- | ------------------------------------------------- |
| `ValidationError` | `VALIDATION`      | `extensions.fieldErrors`, one per issue, in order |
| `Forbidden`       | `FORBIDDEN`       | —                                                 |
| `NotFound`        | `NOT_FOUND`       | —                                                 |
| any other error   | masked            | —                                                 |

- **The message is the service's, verbatim.** It is what names the colliding
  entry, the ratio that failed, or why a spell cannot be made private again.
  Rewriting it at the transport is how those turn back into "Invalid input".
- **Masking stays on, in every environment.** Anything that is not one of the
  three leaves as `Unexpected error.` with `code: INTERNAL_SERVER_ERROR`, and
  no message, stack or constraint name. That includes local development:
  Yoga's own default returns the original message and stack there under
  `extensions.originalError`, so the mapping calls Yoga's `maskError` with dev
  mode forced off. The server log still gets the unmasked error, because Yoga
  logs whatever it masks.
- **A GraphQL error the schema raised on purpose passes through unchanged.**
  For example, the pagination helper's `Invalid cursor` or a validation
  failure against the document. Those are already written for the client.
- **Each error is mapped on its own.** A response's other errors, and the
  fields that resolved, are unaffected. A refusal on a non-null root field
  still nulls `data`, since the builder defaults every field to non-null.
- **A refusal is an error response, not a payload.** The mutation answers
  `data: null`. When the throw comes from inside `withAudit`, the transaction
  rolls back, so nothing was written. `tests/db/graphql-refusal-writes-nothing.test.ts`
  asserts both.
- **The mapped error carries no `originalError`.** Yoga counts a GraphQL error
  that wraps another as unexpected, and would answer a response with no
  `data` with a 500. A refusal is a 200, like every other GraphQL answer.

Auth scopes throw the same `Forbidden` a service does (`unauthorizedError` in
the builder), so a scope refusal and a service refusal look the same to the
client. On the client, `graphql-request` rejects with a `ClientError` whose
`response.errors[].extensions` carries the code and the field errors. Forms
read them back through react-hook-form's `setError` (DESIGN.md §7).

The tests: `tests/graphql/errors.test.ts` covers each type and the masking
through a Yoga instance built on a throwaway schema.
`tests/app/api/graphql/route.test.ts` shows the route itself carries the
mapping, using `me` signed out. `tests/support/msw/graphql.ts`'s
`mockGraphQLError` produces the same body for component tests
(`testing/where-tests-live.md`).
