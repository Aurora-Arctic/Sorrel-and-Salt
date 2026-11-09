# RenameWorkspaceForm

`src/components/RenameWorkspaceForm/` is the form in the "Rename Coven" section of a coven's
index page, `/coven/<slug>`. It takes the coven's id and its saved name, and sends the new
name to `renameWorkspace`, the mutation that renames a coven and moves its address
(`src/modules/coven/services/workspace-rename.ts`). It is a client component.

The page decides whether to draw it: a role that holds `workspace.update` (a Steward) sees it,
and the demo coven never does, since the service refuses a rename there. Hiding it is
presentation only; the service still refuses anyone else.

## Renaming

- **Save stays disabled until the name changes.** A name that differs from the saved one only
  by outer whitespace counts as unchanged, and a blank name counts as no name. Cancel puts the
  saved name back.
- **Busy from the press until the new address has loaded.** The row is `FormActions`
  ([`field.md`](field.md)) with `noun="Coven"`, so a second press cannot rename twice.
- **The typed name goes to the server as typed.** Trimming, the 80-character limit and the new
  address are the service's.
- **The address comes from the answer.** The mutation answers the coven's `slug`, and the form
  goes to `/coven/<slug>` and refreshes the router, so the shell's coven switcher lists the new
  name. A rename that changes only the case or spacing keeps the address, and the form stays.
- **Refusals.** A `VALIDATION` answer marks the Name field invalid with the server's message; a
  `FORBIDDEN` answer shows its message in an alert above the form.

## Leaving with an unsaved name

The form guards the page with `useDiscardGuard` ([`modal.md`](modal.md)): a link or other
in-app navigation asks "You have unsaved changes. Discard them?" while the name differs from
the saved one, and not while a save is in flight.
