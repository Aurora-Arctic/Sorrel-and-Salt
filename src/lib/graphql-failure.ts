import type { ErrorOption } from 'react-hook-form';
import { GraphQLClientError } from './graphql-client-error';
import type { Failure, ValidationIssue } from './types';

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
  if (!(error instanceof GraphQLClientError)) return { alert: GENERIC_FAILURE };
  const first = error.errors?.[0];
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

/**
 * Every issue a failed request carries, for a form that places each field
 * error at once and joins the rest into its alert, where `readGraphqlFailure`
 * answers the first field it finds. A VALIDATION refusal gives its own list;
 * anything else is one issue with no path, carrying the sentence the
 * single-field reader would have put in the alert.
 */
export function readGraphqlIssues(error: unknown): ValidationIssue[] {
  if (error instanceof GraphQLClientError) {
    const extensions = error.errors?.[0]?.extensions as
      { code?: string; fieldErrors?: ValidationIssue[] } | undefined;
    if (extensions?.code === 'VALIDATION' && extensions.fieldErrors?.length) {
      return extensions.fieldErrors;
    }
  }
  return [{ path: [], message: readGraphqlFailure(error).alert ?? GENERIC_FAILURE }];
}

/**
 * Places every issue a failed save carries on a react-hook-form form: each
 * one `toField` names a field for beside that field, the rest, each distinct
 * message once, joined into one
 * sentence on the form's `root`, which its alert region shows. Both as
 * `type: 'server'`, so the next submit or an edit to the field clears them
 * as it clears the resolver's own. Answers whether it set any error.
 *
 * `toField` sees the whole issue, path and message, so each form keeps its
 * own reading of a path: a flat form names a field only for a one-segment
 * path it shows, the ingredient form follows a path into its lists. It may
 * also answer `false` for an issue the form takes up itself, which is
 * placed nowhere: the ingredient form's redirect question (MB.82) asks
 * rather than errs.
 *
 * Every error at once rather than `readGraphqlFailure`'s first, as the four
 * admin forms placed them before MB.115, each with its own copy of this loop.
 * Generic over the field names rather than the form's values, so a form's
 * own `setError` passes as it is: TypeScript cannot work a form's values
 * back out of its field paths, and infers the names straight from them.
 */
export function placeServerIssues<Name extends string>(
  error: unknown,
  setError: (name: Name | 'root', error: ErrorOption) => void,
  toField: (issue: ValidationIssue) => NoInfer<Name> | undefined | false,
): boolean {
  let placed = false;
  const unplaced: string[] = [];
  for (const issue of readGraphqlIssues(error)) {
    const field = toField(issue);
    if (field === false) continue;
    if (field === undefined) {
      // Each distinct message once: a rule the schema and the service both state (a step that
      // is not the spell's) would otherwise print twice, run together.
      if (!unplaced.includes(issue.message)) unplaced.push(issue.message);
    }
    else {
      setError(field, { type: 'server', message: issue.message });
      placed = true;
    }
  }
  if (unplaced.length > 0) {
    setError('root', { type: 'server', message: unplaced.join(' ') });
    placed = true;
  }
  return placed;
}
