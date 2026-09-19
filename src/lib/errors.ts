// The two refusals a service may end a call with; it throws rather than
// answering with an empty list, a null, or a success that did nothing. Two
// types because the route decides which the browser sees; types rather than
// messages so a test survives a rewording. Neither carries a status code.
// See claude-docs/auth.md, "The service-level session, and the two refusals".

/**
 * The actor is known and the answer is no. Thrown by services only (rule 1).
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
