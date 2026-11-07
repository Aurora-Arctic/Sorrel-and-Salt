# PrivilegeLedger

`src/components/PrivilegeLedger/` is `/keepers/privilege-changes`' filter, table and pager. It is render-only and a server component: the page reads one page of the privilege ledger through the identity service and hands it over, with the filter as asked and the hrefs of the pages either side ([`auth/admin-users.md`](../auth/admin-users.md), "The privilege ledger"). The props, `PrivilegeLedgerEntry` and `LedgerPerson` are in `types.ts`. A `LedgerPerson` is a name and the `href` of the person's `/keepers/users` row, or null when no live account holds the id.

## Contracts

- **One ledger, filtered, not a page per privilege.** The filter is a GET form to `/keepers/privilege-changes` (`PRIVILEGE_CHANGES_PATH`, `href.ts`), named "Filter Privilege Changes" inside a `<search>` landmark, as the user list's is ([`user-list.md`](user-list.md)). It has a search box labelled "Name or Email" (`query`), matching part of the subject's name or email, and a Privilege dropdown (`privilege`: All Privileges, then `PRIVILEGE_LABELS`, Admin or Coven Creation; a `FilterSelectField`, [`field.md`](field.md)). It has no Filter button.
- **The filter is `filter.tsx`, the one client file here:** the search text, held in state, inside the shared `FilterForm` ([`filter-form.md`](filter-form.md#contracts)). The server draws the dropdown as a native `<select>`, so before hydration the form still submits, All Privileges as `privilege=`, which the page reads as no privilege. Once hydrated it is the select-only box, so the row has one dropdown look. The dropdown applies the moment a choice is picked, softly and from the first page, and the search from its magnifier or Enter, each carrying the other.
- **Clear is offered only while the page shows a query or a privilege** and opens `/keepers/privilege-changes` with neither.
- **Addresses.** `href.ts`'s `privilegeLedgerHref`, a thin typed wrapper over the shared `listHref` (`src/lib/list-href.ts`), builds every address here, the submit's, the pager's and each `UserList` row's history link included: `?query=` and `?privilege=admin|create_workspace`. A user row's privilege changes icon opens the ledger with their address in the search, which fills the box, rather than a separate `?user=<id>` filter. The match is the user list's, a case-insensitive substring, so an address inside another (`ada@…` in `bada@…`) matches both.
- **Seven columns**: When, User, Privilege, Change, How, Changed By and Note, each heading in title case (DESIGN.md §9), drawn by [`StackTable`](data-table.md), so each heading is also its cells' `data-label` and the table's roles are written out to stack into cards at phone width.
  - When is the minute as `2026-10-30 2:05 pm` in the viewer's own zone (UTC until the page hydrates), through [LocalTime](local-time.md), muted at caption size above the stacking width.
  - Privilege reads Admin or Coven Creation, from `PRIVILEGE_LABELS` (`privileges.ts`), the one option list the filter, this column and the page's reading of `?privilege` share.
  - Change reads Granted or Revoked. How reads Seeded, By a keeper, Invitation accepted or Manual fix. Seeded covers every user the seed inserts holding a privilege, the fixture users as well as the bootstrap admin, so it names the seed rather than the primary keeper.
- **User and Changed By link to the person's `/keepers/users` row**, the list filtered to their address. A person the user list leaves out, the seed's bootstrap user, is named without a link, and an id no live account holds reads "Deleted account".
- **The note shows only where one was given**: an empty cell otherwise.
- **Nothing to show is a sentence, not an empty table:** "No privilege changes yet." With a filter in force it names each one and what to do, in the one wording every admin list uses (`noMatchText`, `src/lib/text.ts`): "No privilege changes match “ada” and the privilege Admin. Change or clear the filter to see more."
- **The pager is `Pager`** ([`pager.md`](pager.md)), with plain anchors and the page's position, as every admin list's.
- **"Privilege changes" is the ledger's one name everywhere**: its tab, its empty state and the user list's icon.

## Styling

Built from the shared list primitives ([`styling.md`](../styling.md), "Designing a section"): the root is a `.list-frame`, the filter `FilterForm`'s `.filter-row` on the `.field`, `.input`, `.select` and `.btn` primitives, the table [`StackTable`](data-table.md), a `.data-table` with `--stack` in its `.data-table-frame`, and the pager the `.pager`. Under `$table-stack-width` of its frame each change is a card, every fact led by its column's name. Its own stylesheet keeps the time on one line and holds the note to `$measure`.

## Not here

Stories: `src/components/PrivilegeLedger/index.stories.tsx` (`Admin / Privilege Ledger`, `States`, on invented people, each state's rows what its filter would show; each sits inside the admin layout's frame and the People page with its Privilege Changes tab open). Tests: `tests/components/PrivilegeLedger/` (paging is Pager's, and the shared filter rows are `tests/support/filter-form.tsx`, [`filter-form.md`](filter-form.md)), `tests/app/(shell)/keepers/(people)/privilege-changes/page.test.tsx` (what the page hands it) and `tests/e2e/admin/privilege-changes.spec.ts` (the built server, with axe).
