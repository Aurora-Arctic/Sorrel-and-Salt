// The two refusals a service may end a call with; it throws rather than
// answering with an empty list, a null, or a success that did nothing. Two
// types because the route decides which the browser sees; types rather than
// messages so a test survives a rewording. Neither carries a status code.
// See claude-docs/auth.md, "The service-level session, and the two refusals".
// `InvalidCursor`, below them, is bad input rather than a refusal.

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
