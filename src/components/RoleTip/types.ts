export interface RoleTipProps {
  /** The role's label as the column shows it: "Keeper", "Steward". */
  label: string;
  /** What the role may do, the sentence Change Role shows beside the same role. */
  description: string;
  /** Bold, for the roles a list sets apart: a keeper, a curator, a steward. */
  emphasis?: boolean;
}
