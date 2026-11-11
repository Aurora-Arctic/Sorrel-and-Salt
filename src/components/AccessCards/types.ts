export type AccessMark = 'yes' | 'part' | 'no';

interface AccessCell {
  /** The mark drawn for the cell, set with the text so a reworded cell cannot change its mark. */
  mark: AccessMark;
  text: string;
}

export interface AccessRole {
  name: string;
  short: string;
}

export interface AccessRow {
  data: string;
  cells: readonly AccessCell[];
}

export interface AccessCardsProps {
  roles: readonly AccessRole[];
  rows: readonly AccessRow[];
}
