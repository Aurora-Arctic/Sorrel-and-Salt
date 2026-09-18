// M1.26 — the two refusals a service is allowed to end a call with.
//
// A service that cannot do what it was asked **throws**; it never answers with
// an empty list, a null, or a success that did nothing (CLAUDE.md's Testing
// section, and every "rejected with Forbidden, not a silent no-op" acceptance
// criterion in TASKS.md). The two types exist so a test can assert on the type
// rather than on a message string: wording is edited, and a test pinned to it
// keeps passing against a service that has stopped checking anything.
//
// They are two types rather than one because they answer different questions,
// and the answer decides what a caller may safely say out loud:
//
//   - `Forbidden` — the thing exists and you may not have it.
//   - `NotFound`  — there is nothing here under that id.
//
// Which of the two a *route* shows is the route's decision, not the service's:
// `/coven/[slug]` answers 404 to a non-member, because the existence of a
// workspace is itself private, while `/admin` answers a styled "not
// authorized" page, because everyone already knows that path exists
// (CLAUDE.md's domain invariants). A route can only make that choice if the
// service told it which case it was.
//
// Neither type carries a status code or a GraphQL error code. The transport
// decides how a refusal is rendered — §7's resolvers and §9's pages map these
// on their way out — and a service that cannot be called over HTTP at all
// (a seed, a script) would have no use for one.

/**
 * The call was understood, the actor is known, and the answer is no.
 *
 * Thrown by services — never by resolvers or pages, which have no
 * authorization rules of their own (CLAUDE.md rule 1).
 */
export class Forbidden extends Error {
  constructor(message = 'Forbidden') {
    super(message);
    // Set explicitly: `name` is inherited from `Error.prototype` and would
    // otherwise read "Error" in a log line and a stack trace, which is the
    // one place a bare instanceof check cannot help a human.
    this.name = 'Forbidden';
  }
}

/**
 * There is no such row — or none this reader is permitted to know about,
 * which is the same answer from the outside and a deliberate one.
 */
export class NotFound extends Error {
  constructor(message = 'Not found') {
    super(message);
    this.name = 'NotFound';
  }
}
