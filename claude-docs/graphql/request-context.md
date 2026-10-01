## The request context

`src/graphql/context.ts`'s `createContext` runs once per request, as Yoga's
`context` option. It gives every resolver three things, typed as `Context` in
`src/graphql/types.ts`:

- **`session`**, the service-level `Session` from `sessionFromHeaders` over the
  request's own headers, or `null` when signed out. It does not use
  `getSession()`, which reads `headers()` for server components. A signed-out
  request is not refused here: the endpoint answers, and whichever scope or
  service the query reaches refuses it.
- **`loaders`**, a fresh set of DataLoader instances for this request.
- **`emailVerification`**, `src/lib/email-verification.ts`'s sender bound to
  this request's host and cookie, which the `setEmail` resolver passes to its
  service: a service may not import `auth`, so the Better Auth side of the email
  page reaches it this way
  ([`auth/admin-bootstrap.md`](../auth/admin-bootstrap.md), "The email page").
