# InviteDialog

`src/components/InviteDialog/` — an owner's Invite button and the dialog it opens (M7.4, story 4). A
client component taking the `workspaceId` of the coven invited into. It draws the button and the
dialog together, so the button can take the focus back when the dialog closes. M7.6 mounts it on the
members page, for owners only; until then nothing renders it but its story and its test.

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
- **Focus is the component's.** Opening puts the focus on the address field (the modal's rule).
  Whichever way it closes — Done, Cancel, Close, Escape, a click outside — the focus returns to
  Invite, set by the component, since the modal is unmounted rather than closed in place.
- **It opens blank every time.** Closing unmounts the form, so a second opening starts empty, on
  Viewer.

## Styling

Tokens and the form primitives only: `.form`, `.field`, `.fieldset.radio-group`, `.notice`, and the
modal's `.modal__actions`. Its one rule of its own sets the role group's margin to 0 (the owner's call). Wave 10's design review (MB.119) settles
anything past that.

## Tests

`tests/components/InviteDialog/index.test.tsx`: the validation (four malformed addresses, each
refused with no request made), the payload (trimmed address, chosen role, this coven), the role group
holding exactly viewer and member, its description, the confirmation naming the address and
refreshing the page, no link at any point, Done, Escape, Cancel and Close with focus returned, the
guard over a typed address, a blank reopening, and a field refusal against an alert one.

**Not yet asserted in a real browser:** axe and a real dialog's focus trap and focus restore. The
dialog is reachable from no page until M7.6 mounts it, and accessibility is asserted in Playwright
(CLAUDE.md, Testing), so M7.6's e2e spec opens it from the members page and scans it open and sent.
The focus trap itself is the platform's `showModal()` ([`modal.md`](modal.md), "Contracts").
