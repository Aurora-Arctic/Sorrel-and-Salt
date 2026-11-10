# PrivilegeLedger

`src/components/PrivilegeLedger/` is `/keepers/privilege-changes`' filter, table and pager. It is a render-only server component: the page reads one page of the privilege ledger through the identity service and hands it over with the filter as asked and the hrefs of the pages either side ([`auth/admin-users.md`](../auth/admin-users.md), "The privilege ledger"). Types (`PrivilegeLedgerEntry`, `LedgerPerson`: a name plus the `href` of the person's `/keepers/users` row, null when no live account holds the id) are in `types.ts`.

## Contracts

- **One ledger, filtered, not a page per privilege.** A GET form to `/keepers/privilege-changes` (`PRIVILEGE_CHANGES_PATH`, `href.ts`), named "Filter Privilege Changes" in a `<search>` landmark as the user list's is ([`user-list.md`](user-list.md)): a "Name or Email" search (`query`, a case-insensitive substring of the subject's name or email) and a Privilege dropdown (`privilege`: All Privileges, then `PRIVILEGE_LABELS`; a `FilterSelectField`, [`field.md`](field.md)). No Filter button.
- **`filter.tsx` is the one client file**: the search text in state, inside the shared `FilterForm` ([`filter-form.md`](filter-form.md#contracts)). The server draws the dropdown as a native `<select>`, so before hydration the form still submits, All Privileges as `privilege=`, which the page reads as no privilege. The dropdown applies on pick, softly and from the first page; the search on its magnifier or Enter; each carries the other.
- **Clear appears only while a query or privilege is in force.**
- **Addresses.** Every address here (submit, pager, and each `UserList` row's history link) comes from `privilegeLedgerHref` (`href.ts`), a typed wrapper over `listHref` (`src/lib/list-href.ts`): `?query=` and `?privilege=admin|create_workspace`. A user row's history icon opens the ledger with their address in the search rather than a `?user=<id>` filter, so an address inside another (`ada@…` in `bada@…`) matches both.
- **Seven columns** (When, User, Privilege, Change, How, Changed By, Note), drawn by [`StackTable`](data-table.md), so each heading is its cells' `data-label`.
  - When is the minute through [LocalTime](local-time.md) (UTC until hydration).
  - `PRIVILEGE_LABELS` (`privileges.ts`) is the one option list the filter, the column and the page's reading of `?privilege` share.
  - How: Seeded, By a keeper, Invitation accepted or Manual fix. Seeded covers every user the seed inserts holding a privilege, fixtures included, so it names the seed rather than the primary keeper.
- **User and Changed By link to the person's `/keepers/users` row.** A person the user list leaves out (the seed's bootstrap user) is named without a link; an id no live account holds reads "Deleted account".
- **Nothing to show is a sentence, not an empty table**: "No privilege changes yet.", or with a filter in force `noMatchText` (`src/lib/text.ts`), the wording every admin list uses.
- **The pager is `Pager`** ([`pager.md`](pager.md)), with plain anchors.
- **"Privilege changes" is the ledger's one name everywhere**: its tab, its empty state and the user list's icon.

## Styling

The shared list primitives ([`styling.md`](../styling.md), "Designing a section"): `.list-frame`, `FilterForm`'s `.filter-row`, [`StackTable`](data-table.md) in a `.data-table-frame`, `.pager`. Under `$table-stack-width` of its frame each change is a card. Its stylesheet keeps the time on one line and holds the note to `$measure`.

## Stories and tests

`src/components/PrivilegeLedger/index.stories.tsx` (`Admin / Privilege Ledger`, `States`, inside the admin layout's frame with the Privilege Changes tab open). Tests: `tests/components/PrivilegeLedger/` (paging is Pager's; the shared filter rows are `tests/support/filter-form.tsx`), `tests/app/(shell)/keepers/(people)/privilege-changes/page.test.tsx` and `tests/e2e/admin/privilege-changes.spec.ts` (built server, with axe).
