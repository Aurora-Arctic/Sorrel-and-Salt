# InviteDialog

`src/components/InviteDialog/` — a steward's Invite button and the dialog it opens: a [`ModalButton`](modal.md) around the form, taking a `workspaceId`. It is mounted for stewards only, as the `@action` of the coven's People page (`src/app/(shell)/coven/[slug]/(people)/@action`), so it sits beside the heading on both the Members and Invitations tabs. The page hides it from others; the service is the guard.

## Contracts

- **One mutation, `createInvitation(workspaceId, email, role)`**, through `/api/graphql` (CLAUDE.md rule 1). It answers an invitation's `id` and nothing else.
- **No link, token or URL is ever in the DOM**, before, while or after sending, and there is no copy control; the link is mailed. A test asserts it at each point, and after a refusal.
- **The address is checked before sending** with `validateEmailAddress` (`src/lib/email-address.ts`), the rule the services apply. This saves a round trip and is not a guard. A service refusal such as an existing member is said beside the field; any other refusal goes in an alert above it.
- **Viewer or member, never owner.** The role group is built from two values typed by the schema's `InvitableRole`, which has no owner. A line under the group (its `aria-describedby`) says a steward can make them a steward from the members page after they join. It starts on Viewer, the role that writes nothing, so a steward who does not look sends the smaller grant.
- **The role words are the members page's** (`WORKSPACE_ROLE_ACCESS`, `workspaceRoleLabel`), so the picker and the page never describe a role two ways.
- **A send replaces the form with its confirmation**, which names the address and says the link lasts seven days and only an account that has confirmed the address can accept it. The form is gone, so the same invitation cannot be sent twice from the open dialog. It calls `router.refresh()` as it sends, so the pending list behind the dialog reads again.
- **Closing asks first while an address is typed**, through `useDiscardGuard` ([`modal.md`](modal.md), "Unsaved changes"). A sent invitation closes at once.
- **Focus** is `ModalButton`'s ([`modal.md`](modal.md), "ModalButton"): it opens on the address field and, however it closes, returns to Invite, since the modal is unmounted rather than closed in place.
- **Actions** are `FormActions` ([`field.md`](field.md)): Send Invitation is off until an address is typed; Cancel is held while the send is out (`holdCancel`).
- **It opens blank every time**, on Viewer.

## Styling

No `index.scss`. A radio group directly inside a `.form` takes no margin of its own (`_primitives.scss`, `.form > .fieldset.radio-group`), so the group stands in the form's gap like any field.

## Stories and tests

`src/components/InviteDialog/index.stories.tsx` ("Coven / Invite Dialog"; in the workshop sending reaches no server, so it shows the failure) and `tests/components/InviteDialog/index.test.tsx`. `tests/e2e/coven.spec.ts` opens the dialog from the Invitations tab and scans it open with axe; the sent state is not scanned.
