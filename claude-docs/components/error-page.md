# ErrorPage

`src/components/ErrorPage/` — the body the 404 and 500 screens share: a
level-one title, a reason, an optional reference, and the way onward as
children. It draws its own `<main className="page-frame">`, so it works with
or without the shell around it.

## Where it is used

| File                                         | Catches                                        | Way onward                                                 |
| -------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------- |
| `src/app/not-found.tsx`                      | `notFound()` and an address with no page (404) | link to `/`                                                |
| `src/app/error.tsx`                          | an error thrown while a page renders (500)     | Try Again, link to `/`                                     |
| `src/app/global-error.tsx`                   | an error in the root layout itself             | plain links to `/` and to `/support?support=bug&error=500` |
| `src/app/(shell)/not-found.tsx`, `error.tsx` | the same two, re-exported inside the shell     | as above                                                   |

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

`index.stories.tsx` — `States`, with a control that chooses Default (not found, inside the app shell as a signed-in visitor sees it), Not Found Signed Out or Something Went Wrong; the 403 page has its own story, under [NotAuthorized](error-page.md#not-authorized). Default and Not Found Signed Out also draw the layout's corner Backdrop; the toolbar viewport and theme menus show each state at 375px
in each theme. `tests/components/ErrorPage` covers the children and the
reference; `tests/app/error.test.tsx` the three screens;
`tests/e2e/error-pages.spec.ts` the 404 against the built server, with axe.
Design styling past the tokens waits for the section's design review.

## Report this

`src/components/ReportThis/` — the link on the 404, 500 and global-error screens. It builds a bug
request with the status (`error`) and the page filled in. It opens the Support dialog
over the same page, which the root layout draws everywhere. Only `global-error.tsx`, which replaces that layout, links to `/support` itself.

It is an icon-only button, `btn btn--quiet btn--icon`: `SupportIcon` (a solid speech bubble with a question mark cut out of it)
in a square the height of a field, wrapped in `IconTip` with the tip "Report This". The link is still named "Report This", by a
`visually-hidden` span. The bubble takes the button's ink and the cut-out takes `--icon-ground`, which `.btn--quiet` sets to its
own background, resting and pointed at. The same icon and button are the footer's Support link.

### The path it names

It reads the page from `useActualPathname` (`src/lib/use-actual-pathname.ts`), not `usePathname`. An address
no route matches renders on the framework's own `/_not-found` route, which `usePathname` reports, so the link
would send `/_not-found` as the page. In the browser the hook reads the address bar. In the server's render it gives
the router's path unless that is `/_not-found`, when it gives nothing: the link is then a bare query
(`?support=bug&error=404`, which keeps the address it is at).

### The error reference

An error page that has a digest (the 500 pages) passes it as `reference`, and the link carries it as `ref`. The
Support dialog and the `/support` page read `ref` through `errorReferenceOf` (blank or over 100 characters is
dropped) and hand it to the form. `src/app/global-error.tsx` builds the same `ref` into its plain link.

## Not authorized

`src/components/NotAuthorized/` — what a signed-in non-keeper sees at `/curator` or `/keepers`:
a level-one "Not Authorized", two sentences saying what the area is for and
that the account does not have keeper rights, and a link back to `/`. It
takes no props. `src/app/(shell)/forbidden.tsx` wraps it in `<main className="page-frame">` and Next renders that,
with a 403, wherever `forbidden()` is thrown — today only by the `/admin`
guard ([`auth/admin-guard.md`](../auth/admin-guard.md), "The admin guard").

### Copy

Two things are left out on purpose, and the test holds both:

- **No admin is named.** Not a person, not an address. Who curates the site is
  not something a refused visitor needs, and naming them invites the mail the
  next point rules out.
- **No way to request access.** No button, no form, no contact link. A keeper
  is granted by another keeper from `/keepers/users` or invited by one (MB.59,
  MB.69), never requested, so a request control would promise a path that does
  not exist.

The reason says what the area is for — curating the shared compendium — so
the refusal reads as a fact about the account rather than an error. It never
says _workspace_ (CLAUDE.md, "Vocabulary").

**The way back is a `next/link` to `/`**, the one page every signed-in visitor
can reach; `/` offers a signed-in visitor the landing. It is a quiet
`.btn--quiet`, a target the size of every other page's action, and neither
solid nor the accent outline: it is the page's only action, but a way back
changes nothing and nothing about it is primary. The owner chose the button
over a plain text link at MB.116's sign-off, and quiet over green after.

### Styling

The page draws the frame: `forbidden.tsx`'s `main` is `.page-frame`, which
centres the column without an AppShell and stops it at the reading measure,
`$measure` ([`styling.md`](../styling.md), "The page frame"). The
component's own column follows `Welcome`'s: a flex column with a `space(5)`
gap, its heading and reason a `PageHeader` ([`page-header.md`](page-header.md)) with the reason as its `lede`.
Function used: `space()`.

### Stories

[`index.stories.tsx`](../../src/components/NotAuthorized/index.stories.tsx),
`Pages / Not Authorized`: one story, `Default`, inside `forbidden.tsx`'s real
`main.page-frame` ([`workshop.md`](../workshop.md)), in the shell of an account
with no coven to write in, so no Add Ingredient, and with the layout's corner
Backdrop.
Render-only, no test ids, no snapshots.

### Testing

`tests/components/NotAuthorized/index.test.tsx` covers the single link back
to `/` and the absence of any button, form, text field, address or request
wording. The root `forbidden.tsx` that renders it is exercised by the admin
403 tests of `tests/e2e/admin.spec.ts` alone, which reach it through the
guard against the built server — the 403, the page at the same URL, no keeper
nav — and check nothing pushes it sideways at 375px before the axe scan
([`testing/e2e.md`](../testing/e2e.md)).
