// The three ways a service ends a call it cannot perform — two refusals and a
// bad value — thrown rather than answered with an empty list, a null, or a
// success that did nothing. Separate types because the route decides what the
// browser sees; types rather than messages so a test survives a rewording.
// Neither type carries a status code or a GraphQL error code: a seed or a
// script has no use for one. The code is attached on the way out, by
// src/graphql/errors.ts in the /api/graphql route. See claude-docs/auth.md,
// "The service-level session, and the three errors". `InvalidCursor`, below
// them, is bad input the pagination helper reports on its own.

/**
 * The actor is known and the answer is no. Thrown by services (rule 1), and
 * by the schema's auth scopes so the transport maps one refusal shape.
 */
export class Forbidden extends Error {
  constructor(message = 'Forbidden') {
    super(message);
    // Otherwise inherited as "Error", which is what a log line shows.
    this.name = 'Forbidden';
  }
}

/**
 * No such row — or none this reader may know about, which reads the same.
 */
export class NotFound extends Error {
  constructor(message = 'Not found') {
    super(message);
    this.name = 'NotFound';
  }
}

/** One rule a value broke, pathed to the input field it is about. */
export interface ValidationIssue {
  /** In the shape of the operation's input — `['folkNames', 2]`; empty for no one field. */
  path: (string | number)[];
  message: string;
}

/**
 * The input broke a rule, and each issue says which field and why. It carries
 * issues rather than producing them, so this file depends on no schema
 * library; the Zod adapter is src/lib/validation.ts.
 */
export class ValidationError extends Error {
  readonly issues: readonly ValidationIssue[];

  constructor(issues: readonly ValidationIssue[], message = 'Invalid input') {
    super(message);
    this.name = 'ValidationError';
    this.issues = issues;
  }
}

/**
 * A pagination cursor that names no position in the list: malformed,
 * forged, or from a list sorted on another column. The client's input is
 * wrong rather than the actor refused, so it is neither refusal above; never
 * read as "from the start", which would hand back a page nobody asked for.
 */
export class InvalidCursor extends Error {
  constructor(message = 'Invalid cursor') {
    super(message);
    this.name = 'InvalidCursor';
  }
}
