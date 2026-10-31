# InviteDialog

`src/components/InviteDialog/` — an owner's Invite button and the dialog it opens (M7.4, story 4). A
client component taking the `workspaceId` of the coven invited into. It is a [`ModalButton`](modal.md)
around the form, so the button takes the focus back when the dialog closes. M7.6 mounts it for owners only, as the
`@action` of the coven's People page, so it sits beside the heading on both the Members and
Invitations tabs (`src/app/(shell)/coven/[slug]/(people)/@action`).

## Props

`InviteDialogProps` (`types.ts`): `workspaceId`, the coven invited into. The page shows the
dialog to an owner only; the service is the guard. The form inside the modal takes the same plus
`close`, the modal's own close (`InviteFieldsProps`).

## Contracts

- **One GraphQL mutation, `createInvitation(workspaceId, email, role)`**, through the same path as
  every write from the browser (CLAUDE.md rule 1). It answers an invitation's `id` and nothing else:
  the link is mailed to the address by M7.3 and appears in no response.
- **No link, token or URL is ever in the DOM**, before, while or after sending, and there is no copy
  control. The browser never holds one, so there is nothing to render. A test asserts it at each of
  those points, and after a refusal.
- **The address is checked before anything is sent.** The dialog applies `validateEmailAddress`
  (`src/lib/email-address.ts`), the rule the services apply, so a misspelt address is said beside the
  field without a request. The service still checks again: this saves a round trip and is not a
  guard. A refusal the service makes, such as an address that is a member already, is said beside the
  field the same way, and any other refusal in an alert above it.
- **Viewer or member, never owner.** The role group is built from a list of two, typed by the
  schema's `InvitableRole` enum, which has no owner value. A line under the group, its
  `aria-describedby`, says an owner can make them an owner from the members page once they have
  joined. It starts on Viewer, the role that writes nothing, so an owner who does not look sends the
  smaller grant.
- **The role words are the members page's** (`WORKSPACE_ROLE_ACCESS`, `workspaceRoleLabel`), so the
  picker and the page never describe a role two ways.
- **A send replaces the form with its confirmation.** The status names the address and says the link
  lasts seven days and only an account that has confirmed the address can accept it. Done closes. The
  form is gone, so the same invitation cannot be sent twice from the open dialog. It calls
  `router.refresh()` as it sends, so the pending list M7.6 draws behind the dialog reads again.
- **Closing asks first while an address is typed**, through `useDiscardGuard`, as the admin
  invitation form does ([`modal.md`](modal.md), "Unsaved changes"). A sent invitation closes at once.
- **Focus is `ModalButton`'s.** Opening puts the focus on the address field (the modal's rule).
  Whichever way it closes — Done, Cancel, Close, Escape, a click outside — the focus returns to
  Invite, since the modal is unmounted rather than closed in place. The dialog used to carry this
  itself; MB.119 lifted it into `ModalButton` ([`modal.md`](modal.md), "ModalButton").
- **The actions row is `FormActions`** ([`field.md`](field.md)): Send Invitation, off until an
  address is typed and busy as it sends ("Sending"), and Cancel, held while the send is out
  (`holdCancel`) and asking first through the discard guard.
- **It opens blank every time.** Closing unmounts the form, so a second opening starts empty, on
  Viewer.

## Styling

None of its own: the directory has no `index.scss`. It uses the form primitives only (`.form`,
`.field`, `.fieldset.radio-group`, `.notice`), `FormActions`' `.form__actions`, and the modal's
`.modal__actions` for the sent state's Done. The role group stands in the form's gap like any
field, because a radio group directly inside a `.form` takes no margin of its own
(`_primitives.scss`, `.form > .fieldset.radio-group`); the rule this component once carried to say so
went when the primitive learned it (MB.119).

## Stories

[`index.stories.tsx`](../../src/components/InviteDialog/index.stories.tsx), `Coven / Invite Dialog`:
`States`, with a control that chooses Closed (the button), Open (the dialog pressed open), Member Role Chosen, Address Refused Before Sending and Send Failed. In the workshop
sending reaches no server, so it shows the failure.

## Tests

`tests/components/InviteDialog/index.test.tsx`: the validation (four malformed addresses, each
refused with no request made), the payload (trimmed address, chosen role, this coven), the role group
holding exactly viewer and member, its description, the confirmation naming the address and
refreshing the page, no link at any point, Done, Escape, Cancel and Close with focus returned, the
guard over a typed address, a blank reopening, and a field refusal against an alert one.

**Not yet asserted in a real browser:** axe and a real dialog's focus trap and focus restore. Accessibility is asserted in
Playwright (CLAUDE.md, Testing): M7.6's e2e spec (`tests/e2e/coven.spec.ts`) opens it from the
Invitations tab and scans it open; the sent state is not yet scanned.
The focus trap itself is the platform's `showModal()` ([`modal.md`](modal.md), "Contracts").
