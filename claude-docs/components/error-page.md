# ErrorPage

`src/components/ErrorPage/` — the body the 404 and 500 screens share: a
level-one title, a reason, an optional reference, and the way onward as
children. It draws its own `<main className="page-frame">`, so it works with
or without the shell around it.

## Where it is used

| File                                         | Catches                                        | Way onward             |
| -------------------------------------------- | ---------------------------------------------- | ---------------------- |
| `src/app/not-found.tsx`                      | `notFound()` and an address with no page (404) | link to `/`            |
| `src/app/error.tsx`                          | an error thrown while a page renders (500)     | Try Again, link to `/` |
| `src/app/global-error.tsx`                   | an error in the root layout itself             | plain link to `/`      |
| `src/app/(shell)/not-found.tsx`, `error.tsx` | the same two, re-exported inside the shell     | as above               |

The `(shell)` copies exist because a boundary replaces everything beneath its
own layout. The root one would drop the shell's bar for a signed-in page.
`global-error.tsx` replaces the root layout, so it draws its own `<html>` and
imports the global styles; it uses an `<a>` rather than `next/link` because a
full load starts clean if the router is what failed.

## What never reaches the page

The component takes a reason written for the reader and Next's `digest`, never
an `Error`, so a message or stack cannot be printed through it. In production
Next already strips a server error's message down to the digest; the digest is
shown as a reference to quote when reporting the problem. `tests/app/error.test.tsx`
passes an error whose message and stack hold marker strings and checks neither
appears.

## Authorization redirects

Next's `redirect()`, `notFound()`, `forbidden()` and `unauthorized()` are
signals the framework handles itself; they never reach an `error.tsx`. So a
guard's redirect to `/sign-in` or `/account/email` still happens
(`tests/e2e/route-protection.spec.ts`), and a `forbidden()` still renders
`(shell)/forbidden.tsx` (`tests/e2e/admin.spec.ts`). A service's `Forbidden`
error is an ordinary error and does land on the boundary.

## Not-found and privacy

A workspace slug that is not yours and one that does not exist render the same
page, per CLAUDE.md ("`/coven/[slug]` returns 404 to a non-member").

## Stories and tests

`index.stories.tsx` — `States`, with a control that chooses Default (not found, inside the app shell as a signed-in visitor sees it), Not Found Signed Out or Something Went Wrong; the 403 page has its own story, under [NotAuthorized](not-authorized.md). Default and Not Found Signed Out also draw the layout's corner Backdrop; the toolbar viewport and theme menus show each state at 375px
in each theme. `tests/components/ErrorPage` covers the children and the
reference; `tests/app/error.test.tsx` the three screens;
`tests/e2e/error-pages.spec.ts` the 404 against the built server, with axe.
Design styling past the tokens waits for the section's design review.
