# NotAuthorized

`src/components/NotAuthorized/` — what a signed-in non-admin sees at `/admin`:
a level-one "Not authorized", one sentence saying the account does not have
admin rights, and a link back to `/`. It takes no props. `src/app/forbidden.tsx`
wraps it in `<main className="not-authorized-page">` and Next renders that,
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

The sentence says what the area is for — curating the shared compendium — so
the refusal reads as a fact about the account rather than an error. It never
says _workspace_ (CLAUDE.md, "Vocabulary").

**The way back is a `next/link` to `/`**, the one page every signed-in visitor
can reach; `/` offers a signed-in visitor the landing. It is a plain text link
rather than a `.btn`: it is the page's only action, and nothing about it is
primary.

## Styling

Layout only, following `Welcome`: a `.not-authorized-page` frame that centers
the page without an AppShell, and the reading measure, `$measure`. The heading and
paragraphs take `_typography.scss`'s global rules. Tokens used: `$measure`.

## Stories

[`index.stories.tsx`](../../src/components/NotAuthorized/index.stories.tsx) —
`Default`, inside the page frame. Render-only, no test ids, no snapshots.

## Testing

`tests/components/NotAuthorized/index.test.tsx` covers the heading, the reason,
the single link back to `/`, and the absence of any button, form, text field,
address or request wording. `tests/app/forbidden.test.tsx` checks the root
`forbidden.tsx` renders it inside `<main>`. `tests/e2e/admin.spec.ts` reaches
it through the guard against the built server — the 403, the page at the same
URL, no admin nav — and runs the axe scan.
