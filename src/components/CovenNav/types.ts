export interface CovenNavProps {
  slug: string;
  /** Whether the caller's role holds `member: read`, which decides if the Members page is offered. */
  canReadMembers?: boolean;
}
