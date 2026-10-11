// The roles a stacking table writes out on its parts, spread onto each:
// `<table {...TABLE_ROLES.table}>`. WebKit drops a table's meaning once
// `display` changes on its parts, as `.data-table--stack` changes it at phone
// width, so a screen reader in Safari would read the cards as loose text; the
// explicit roles put the meaning back (claude-docs/styling.md, "Tables at
// phone width"). Spread rather than written as `role="table"`, which oxlint's
// `jsx-a11y/no-redundant-roles` reads as redundant: it is, everywhere but
// there.

export const TABLE_ROLES = Object.freeze({
  table: { role: 'table' },
  rowgroup: { role: 'rowgroup' },
  row: { role: 'row' },
  columnheader: { role: 'columnheader' },
  cell: { role: 'cell' },
} as const);
