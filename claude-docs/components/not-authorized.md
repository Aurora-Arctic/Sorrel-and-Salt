# NotAuthorized

`src/components/NotAuthorized/` — what a signed-in non-admin sees at `/admin`:
a level-one "Not Authorized", two sentences saying what the area is for and
that the account does not have admin rights, and a link back to `/`. It
takes no props. `src/app/(shell)/forbidden.tsx` wraps it in `<main className="page-frame">` and Next renders that,
with a 403, wherever `forbidden()` is thrown — today only by the `/admin`
guard ([`auth/admin-guard.md`](../auth/admin-guard.md), "The admin guard").

## Copy

Two things are left out on purpose, and the test holds both:

- **No admin is named.** Not a person, not an address. Who curates the site is
  not something a refused visitor needs, and naming them invites the mail the
  next point rules out.
- **No way to request access.** No button, no form, no contact link. An admin
  is granted by another admin from `/admin/users` or invited by one (MB.59,
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

## Styling

The page draws the frame: `forbidden.tsx`'s `main` is `.page-frame`, which
centres the column without an AppShell and stops it at the reading measure,
`$measure` ([`styling.md`](../styling.md), "The page frame"). The
component's own column follows `Welcome`'s: a flex column with a `space(5)`
gap, its heading and reason a `.header` with the reason as the `.lede`.
Function used: `space()`.

## Stories

[`index.stories.tsx`](../../src/components/NotAuthorized/index.stories.tsx),
`Pages / Not Authorized`: one story, `Default`, inside `forbidden.tsx`'s real
`main.page-frame` ([`workshop.md`](../workshop.md)), in the shell of an account
with no coven to write in, so no Add Ingredient, and with the layout's corner
Backdrop.
Render-only, no test ids, no snapshots.

## Testing

`tests/components/NotAuthorized/index.test.tsx` covers the single link back
to `/` and the absence of any button, form, text field, address or request
wording. The root `forbidden.tsx` that renders it is exercised by the admin
403 tests of `tests/e2e/admin.spec.ts` alone, which reach it through the
guard against the built server — the 403, the page at the same URL, no admin
nav — and check nothing pushes it sideways at 375px before the axe scan
([`testing/e2e.md`](../testing/e2e.md)).
