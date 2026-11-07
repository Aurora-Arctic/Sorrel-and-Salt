import type { ValidationIssue } from './types';
// Separate types, not messages, so a test survives a rewording; none carries a status code (claude-docs/auth/service-session.md, "The service-level session, and the three errors").

/** Also thrown by the schema's auth scopes, so the transport maps one refusal shape. */
export class Forbidden extends Error {
  constructor(message = 'Forbidden') {
    super(message);
    // Otherwise inherited as "Error", which is what a log line shows.
    this.name = 'Forbidden';
  }
}

/** A `Forbidden` still, so every caller that maps a refusal to a 404 keeps doing so until it reads this one; `until` null is a pause with no end. */
export class AccessPaused extends Forbidden {
  readonly until: Date | null;

  constructor(until: Date | null, message = 'Your access to this coven is paused.') {
    super(message);
    this.name = 'AccessPaused';
    this.until = until;
  }
}

/** No such row, or none this reader may know about, which reads the same. */
export class NotFound extends Error {
  constructor(message = 'Not found') {
    super(message);
    this.name = 'NotFound';
  }
}

/** Carries issues rather than producing them, so this file depends on no schema library; the Zod adapter is src/lib/validation.ts. */
export class ValidationError extends Error {
  readonly issues: readonly ValidationIssue[];

  constructor(issues: readonly ValidationIssue[], message = 'Invalid input') {
    super(message);
    this.name = 'ValidationError';
    this.issues = issues;
  }
}

/** A refusal of one field whose sentence is also the error's message, for a form that shows the message rather than the field. */
export const fieldRefusal = (path: string, message: string): ValidationError =>
  new ValidationError([{ path: [path], message }], message);

/** Never read as "from the start", which would hand back a page nobody asked for. */
export class InvalidCursor extends Error {
  constructor(message = 'Invalid cursor') {
    super(message);
    this.name = 'InvalidCursor';
  }
}

/** Neither refusal nor bad input: the actor may write and the input is sound, but it was built on a stale copy. Carries the row's revision now (claude-docs/autosave.md, "The server's half"). */
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

/** Carries the seconds to wait, which the transport sends as `Retry-After`. Neither a refusal nor bad input: the same call passes once the window moves on. */
export class RateLimited extends Error {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number, message = 'Too many requests') {
    super(message);
    this.name = 'RateLimited';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
