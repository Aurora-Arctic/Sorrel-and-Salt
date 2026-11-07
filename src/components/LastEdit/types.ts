export interface LastEditProps {
  /** The editor's display name; null when the viewer cannot name them (`displayNamesOf`). */
  by: string | null;
  at: string;
}
