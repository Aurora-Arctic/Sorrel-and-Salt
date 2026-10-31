import type { ValidationIssue } from './types';
// The ways a service ends a call it cannot perform: two refusals and a bad value, thrown rather than answered with an empty list or
// a null. Separate types, not messages, so a test survives a rewording; none carries a status code, as the route attaches that
// (claude-docs/auth/service-session.md, "The service-level session, and the three errors").

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
 * A pagination cursor that names no position in the list: malformed, forged, or from a list sorted on another column. The input is
 * wrong, not the actor refused, and never read as "from the start", which would hand back a page nobody asked for.
 */
export class InvalidCursor extends Error {
  constructor(message = 'Invalid cursor') {
    super(message);
    this.name = 'InvalidCursor';
  }
}

/**
 * A save that named the revision it read, after another save moved the row on: neither refusal, as the actor may write and the input is
 * sound, but it was built on a stale copy. Carries the row's revision now (claude-docs/components/autosave.md, "The server's half").
 */
export class StaleWrite extends Error {
  readonly currentRevision: number;

  constructor(
    currentRevision: number,
    message = 'This was changed elsewhere since you opened it.',
  ) {
    super(message);
    this.name = 'StaleWrite';
    this.currentRevision = currentRevision;
  }
}

/**
 * The caller has sent more than a path allows in its window. Carries the seconds to wait, which the transport sends as
 * `Retry-After`. Neither a refusal of the actor nor bad input: the same call passes once the window has moved on.
 */
export class RateLimited extends Error {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number, message = 'Too many requests') {
    super(message);
    this.name = 'RateLimited';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
