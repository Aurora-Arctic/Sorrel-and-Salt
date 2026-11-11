// Client-safe.

/** The coven roles an invitation can grant: never `owner`, which a steward grants afterwards. The GraphQL enum, the database CHECK and the services all read this list. */
export const INVITABLE_ROLES = ['viewer', 'member'] as const;

export type InvitableRole = (typeof INVITABLE_ROLES)[number];

export const isInvitableRole = (role: string): role is InvitableRole =>
  (INVITABLE_ROLES as readonly string[]).includes(role);
