/** How a cell reads at a glance: a full yes, a yes with a limit, or a no. */
export type AccessMark = 'yes' | 'part' | 'no';

export interface AccessCell {
  /** The mark drawn for the cell, set with the text so a reworded cell cannot change its mark. */
  mark: AccessMark;
  /** The cell's full wording, shown when the card is open. */
  text: string;
}

export interface AccessRole {
  /** The role's full name, read in the open card and behind each column's label. */
  name: string;
  /** The short label over the role's column, a few letters. */
  short: string;
}

export interface AccessRow {
  /** The kind of data the card is about, its summary line. */
  data: string;
  /** One cell per role, in the roles' order. */
  cells: readonly AccessCell[];
}

export interface AccessCardsProps {
  /** The roles, in column order. */
  roles: readonly AccessRole[];
  /** One card per kind of data. */
  rows: readonly AccessRow[];
}
