# CreateWorkspaceForm

`src/components/CreateWorkspaceForm/` is the form on the create-workspace
page, `/coven/new` (M9.16, Story 3), on screen the Create Coven page. It takes one value, the coven's name,
and sends it to `createWorkspace`, the mutation M6.7 built. On success the
browser goes to the new coven's index page, `/coven/<slug>` (M9.15), and the
router refreshes, so the shell's coven switcher, listed from a layout a push
does not re-run, includes the new coven (MB.7). It is a
client component, and it takes no props.

The page around it, `src/app/(shell)/coven/new/page.tsx`, decides whether to draw it
at all. The page reads the signed-in user's row with `getMe` and shows the
form only when `canCreateWorkspace` is true. Anyone else gets a quiet notice
saying how to get the right instead. Hiding the form is presentation only:
the creation service still refuses a user without the right
([`auth/coven-guard.md`](../auth/coven-guard.md), "The create page").

## Creating

- **Create Coven stays disabled until there is a name.** A name of
  spaces only counts as empty, because the service would refuse it.
- **Busy from the press until the next page.** The row is `FormActions`
  ([`field.md`](field.md)) with `label="Create Coven"` and
  `busyLabel="Creating Coven"`: a `BusyButton` ([`busy-button.md`](busy-button.md))
  that carries `aria-busy` and the spinner. It stays busy after the answer too,
  while the browser goes to the new coven, so a second press cannot make a
  second coven.
- **The typed name goes to the server as typed.** Trimming, the 80-character
  limit and the slug are the service's
  (`src/modules/coven/services/workspace-creation.ts`).
- **The address comes from the answer.** The mutation answers the new
  workspace's `slug`, and the form goes to `/coven/<slug>`. The service picks
  the slug, so a second coven with the same name lands at `-2`, and one named
  "New" lands at `new-2`, since `/coven/new` is this page.

## Leaving with a name typed

With a name typed, the form asks before it is left (M13.14, story 32):
closing the tab or reloading raises the browser's own question, and a link
or any other in-app navigation asks "You have unsaved changes. Discard
them?" with Discard Changes and Keep Editing, in a dialog titled "Discard
Changes?" over the page, not in the form's card (the owner's call). It is `useDiscardGuard`, as the modal forms use
([`modal.md`](modal.md), "Unsaved changes"), given `!empty && !busy`, so
nothing asks while the coven is being made or on the way to it.

## Two error surfaces

As in NameForm ([`name-form.md`](name-form.md), "Two error surfaces"), a
`VALIDATION` issue for `name` shows beneath the field, which points to it
through `aria-describedby` and sets `aria-invalid`. Anything else, such as the
`FORBIDDEN` a user without the right meets, goes to the `role="alert"` notice
in the server's words, or to the general failure sentence when there are
none. The reading is the shared `readGraphqlFailure(error, ['name'])`.

## The field

Labelled "Name", marked required, with the placeholder "Add a name". It
has no info tip: the one it had restated its label, so it went (the owner's
call, 2026-10-20; [`info-tip.md`](info-tip.md), "When a field gets a tip").
Its one extra fact, that the coven's address is made from the name, is not
put back as a visible `.field__hint` line unless the owner asks for it. The
input is described by its error alone, through `fieldDescription`. `autoComplete="off"`, since a browser has nothing useful to
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

`index.stories.tsx`, titled "Coven / Create Coven Form": `States`, with a control that chooses Empty, Name Typed, Needs an Invitation or Refused After Submitting, inside the app shell and the
page's real frame, panel and heading. The toolbar viewport menu shows it at 375px.

## Testing

`tests/components/CreateWorkspaceForm/index.test.tsx` uses role and label
queries against MSW, which answers in the route's own error shape. It covers
the name field drawing no tip, nothing to create until a name is typed, the create and the address it goes
to, the button held busy until the next page, and both error surfaces. The
page is `tests/app/(shell)/coven/new/page.test.tsx`: the form for a rights holder and
a status notice for anyone else. `tests/e2e/coven-create.spec.ts` walks Story
3 in a real browser: a coven made from the keyboard, a second one, the "New"
slug, the page without the right, and an axe scan in both themes.
