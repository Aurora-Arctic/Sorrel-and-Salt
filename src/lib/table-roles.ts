// A stacking table's explicit roles (claude-docs/styling.md, "Tables at phone width"): WebKit drops a table's meaning once `display` changes on its parts,
// so each names the role it has. Spread from here, as oxlint's `jsx-a11y/no-redundant-roles` refuses the repetition written as attributes.

/** `{ role }` to spread onto a `table`, `thead`/`tbody`, `tr`, `th` or `td`. */
export const tableRole = (
  role: 'table' | 'rowgroup' | 'row' | 'columnheader' | 'cell',
): { role: string } => ({ role });

/** A stacked card's cell: its role, and the column it names; `''` for an action spanning the card. */
export const stackCell = (label: string): { role: string; 'data-label': string } => ({
  role: 'cell',
  'data-label': label,
});
