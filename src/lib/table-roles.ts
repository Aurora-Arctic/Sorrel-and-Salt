// A stacking table's explicit roles (claude-docs/styling.md, "Tables at phone
// width"): WebKit drops a table's meaning once `display` changes on its parts,
// as `.data-table--stack` changes it at phone width, so each part names the
// role it already has. Spread from here rather than written as attributes,
// which oxlint's `jsx-a11y/no-redundant-roles` refuses as repeating the
// element's own role: here the repetition is the point.

/** `{ role }` to spread onto a `table`, `thead`/`tbody`, `tr`, `th` or `td`. */
export const tableRole = (
  role: 'table' | 'rowgroup' | 'row' | 'columnheader' | 'cell',
): { role: string } => ({ role });

/** A stacked card's cell: its role, and the column it names; `''` for an action spanning the card. */
export const stackCell = (label: string): { role: string; 'data-label': string } => ({
  role: 'cell',
  'data-label': label,
});
