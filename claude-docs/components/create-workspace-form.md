# CreateWorkspaceForm

`src/components/CreateWorkspaceForm/` is the form on the create-workspace
page, `/coven/new` (M9.16, Story 3). It takes one value, the coven's name,
and sends it to `createWorkspace`, the mutation M6.7 built. On success the
browser goes to the new coven's index page, `/coven/<slug>` (M9.15). It is a
client component, and it takes no props.

The page around it, `src/app/coven/new/page.tsx`, decides whether to draw it
at all. The page reads the signed-in user's row with `getMe` and shows the
form only when `canCreateWorkspace` is true. Anyone else gets a quiet notice
saying how to get the right instead. Hiding the form is presentation only:
the creation service still refuses a user without the right
([`auth/coven-guard.md`](../auth/coven-guard.md), "The create page").

## Creating

- **Create Workspace stays disabled until there is a name.** A name of
  spaces only counts as empty, because the service would refuse it.
- **Busy from the press until the next page.** The button is a `BusyButton`
  ([`busy-button.md`](busy-button.md)) that reads "Creating Workspace" and
  carries `aria-busy` and the spinner. It stays busy after the answer too,
  while the browser goes to the new coven, so a second press cannot make a
  second coven.
- **The typed name goes to the server as typed.** Trimming, the 80-character
  limit and the slug are the service's
  (`src/modules/coven/services/workspace-creation.ts`).
- **The address comes from the answer.** The mutation answers the new
  workspace's `slug`, and the form goes to `/coven/<slug>`. The service picks
  the slug, so a second coven with the same name lands at `-2`, and one named
  "New" lands at `new-2`, since `/coven/new` is this page.

## Two error surfaces

As in NameForm ([`name-form.md`](name-form.md), "Two error surfaces"), a
`VALIDATION` issue for `name` shows beneath the field, which points to it
through `aria-describedby` and sets `aria-invalid`. Anything else, such as the
`FORBIDDEN` a user without the right meets, goes to the `role="alert"` notice
in the server's words, or to the general failure sentence when there are
none. The reading is the shared `readGraphqlFailure(error, ['name'])`.

## The field

Labelled "Name", marked required, with the placeholder "Add a name". The
hint behind the ⓘ says the address is made from the name and that everyone
invited sees it. `autoComplete="off"`, since a browser has nothing useful to
offer for a new coven's name.

## Styling

No stylesheet and no wrapper: the component renders its notice and its
`<form>` straight into the page's `.page-frame__section`, whose column
already spaces them `space(3)` apart, as it spaces the heading above. The page centres it
the way the email page centres its form, at the owner's request
(2026-10-12): `main.page-frame.page-frame--narrow` gives the width, and a
`.page-frame__section.panel` gives the ground and stacks the page's heading
over the form ([`styling.md`](../styling.md), "The page frame"). Its look past
the tokens is MB.119's, the coven section's design review.

## Stories

`index.stories.tsx`: `Empty`, `PhoneDark` and `PhoneLight`, each inside the
page's real frame, panel and heading.

## Testing

`tests/components/CreateWorkspaceForm/index.test.tsx` uses role and label
queries against MSW, which answers in the route's own error shape. It covers
nothing to create until a name is typed, the create and the address it goes
to, the button held busy until the next page, and both error surfaces. The
page is `tests/app/coven/new/page.test.tsx`: the form for a rights holder and
a status notice for anyone else. `tests/e2e/coven-create.spec.ts` walks Story
3 in a real browser: a coven made from the keyboard, a second one, the "New"
slug, the page without the right, and an axe scan in both themes.
