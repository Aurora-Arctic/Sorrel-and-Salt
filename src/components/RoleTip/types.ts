export interface RoleTipProps {
  /** The role's label as the column shows it: "Admin", "Owner". */
  label: string;
  /** What the role may do, the sentence Change Role shows beside the same role. */
  description: string;
  /** Bold, for the roles a list sets apart: an admin, a curator, an owner. */
  emphasis?: boolean;
}
