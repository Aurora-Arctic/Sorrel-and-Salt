// The two refusals a service may end a call with. A service that cannot do what
// it was asked throws — it never answers with an empty list, a null, or a
// success that did nothing.
//
// Two types rather than one because the route decides which the browser sees
// and can only decide if the service said which happened; types rather than
// message strings so a test asserts on something editing the wording cannot
// break. Neither carries a status or GraphQL error code: the transport renders
// a refusal, and a service called from a script has no transport.
// See claude-docs/auth.md, "The service-level session, and the two refusals".

/**
 * The call was understood, the actor is known, and the answer is no.
 *
 * Thrown by services — never by resolvers or pages, which have no
 * authorization rules of their own (CLAUDE.md rule 1).
 */
export class Forbidden extends Error {
  constructor(message = 'Forbidden') {
    super(message);
    // `name` is inherited as "Error" otherwise, which is what a log line and a
    // stack trace show — the one place an instanceof check cannot help a human.
    this.name = 'Forbidden';
  }
}

/**
 * There is no such row — or none this reader is permitted to know about, which
 * is the same answer from the outside and a deliberate one.
 */
export class NotFound extends Error {
  constructor(message = 'Not found') {
    super(message);
    this.name = 'NotFound';
  }
}
