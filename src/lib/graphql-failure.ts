import { ClientError } from 'graphql-request';
import type { Failure } from './types';

// One reader for a failed GraphQL request from the browser, shared by every
// form and button that sends one. Before MB.116 each of them unpacked the
// error itself, ten times over, and declared the fallback sentence eleven
// times. Client-safe: nothing here touches the server.
// claude-docs/graphql/errors.md, "Errors", describes the shape it reads.

/** The one sentence for a request that got no usable answer: a network fault, a crash, a refusal with no message. */
export const GENERIC_FAILURE = "That didn't work. Please try again.";

/**
 * What a failed request leaves to say: beside one of the form's fields, or in
 * its alert region.
 *
 * `fields` names the fields the form draws its own error under. A VALIDATION
 * issue whose path starts with one of them comes back as `field`; every other
 * failure comes back as `alert`, carrying the server's own sentence where it
 * sent one and `GENERIC_FAILURE` where it did not. A form with no fields of
 * its own, a button say, passes none and always gets an `alert`.
 */
export function readGraphqlFailure(error: unknown, fields: readonly string[] = []): Failure {
  if (!(error instanceof ClientError)) return { alert: GENERIC_FAILURE };
  const first = error.response.errors?.[0];
  const extensions = first?.extensions as
    { code?: string; fieldErrors?: { path: (string | number)[]; message: string }[] } | undefined;
  if (extensions?.code === 'VALIDATION') {
    const issue = extensions.fieldErrors?.find(
      ({ path }) => typeof path[0] === 'string' && fields.includes(path[0]),
    );
    if (issue) return { field: { name: String(issue.path[0]), message: issue.message } };
  }
  return { alert: first?.message || GENERIC_FAILURE };
}
