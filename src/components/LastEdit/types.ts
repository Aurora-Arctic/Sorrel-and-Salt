export interface LastEditProps {
  /** The editor's display name; null when the viewer cannot name them (`displayNamesOf`). */
  by: string | null;
  /** The moment of the edit, as an ISO 8601 string. */
  at: string;
}
