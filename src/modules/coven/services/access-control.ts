import 'server-only';
import { createAccessControl } from 'better-auth/plugins/access';
import type { RoleAuthorizeRequest } from 'better-auth/plugins/access';
import type { WorkspaceRole } from '../types';

// What each **workspace** role may do. The site role on the session is a different axis and is not read here: an admin curates
// the compendium and reaches no workspace at all. Permission statements rather than a rank comparison, so a role that is not on
// the viewer < member < owner line cannot make an "at least member" check mean something nobody checked
// (claude-docs/design-decisions/m6.3-permission-statements.md).

/** The resources a workspace role acts on, one per surface DESIGN.md §9 routes to. */
const statements = {
  /** A workspace's own ingredient entries and folk names: what you *have*. Never the compendium, which is curated by site role. */
  ingredient: ['read', 'create', 'update', 'delete'],
  /** Stock: the jars a coven holds. No `create` or `delete`: adding and throwing out a jar are writes like any change, so all three check `update`. */
  inventory: ['read', 'update'],
  spell: ['read', 'create', 'update', 'delete'],
  /**
   * Members and invitations. Owners and members read the roll (`read`); a member's address (`readEmail`), inviting, changing a
   * role and removing stay with owners. The address is its own action since a member reads the roll but only an owner needs it to tell two people apart.
   */
  member: ['read', 'readEmail', 'invite', 'update', 'remove'],
  /** The coven itself: renaming it, and deleting it. */
  workspace: ['read', 'update', 'delete'],
} as const;

const ac = createAccessControl(statements);

/** Everything, and nothing else — reads alone (CLAUDE.md: "Viewers write nothing"). */
const viewer = ac.newRole({
  ingredient: ['read'],
  inventory: ['read'],
  spell: ['read'],
  workspace: ['read'],
});

/** The viewer's reads, plus what a coven is for: its ingredients, stock, grimoire, and who else is in the coven (`member: read`). */
const member = ac.newRole({
  ingredient: ['read', 'create', 'update', 'delete'],
  inventory: ['read', 'update'],
  member: ['read'],
  spell: ['read', 'create', 'update', 'delete'],
  workspace: ['read'],
});

/** The member's, plus the membership roll with its addresses, and the workspace row itself. */
const owner = ac.newRole({
  ingredient: ['read', 'create', 'update', 'delete'],
  inventory: ['read', 'update'],
  spell: ['read', 'create', 'update', 'delete'],
  member: ['read', 'readEmail', 'invite', 'update', 'remove'],
  workspace: ['read', 'update', 'delete'],
});

// `Record<WorkspaceRole, …>` rather than a plain object: a fourth value added
// to the `workspace_role` enum fails to compile here until someone says what
// it may do, which is the decision that must not be made by omission.
const ROLE_ABILITIES: Record<WorkspaceRole, ReturnType<typeof ac.newRole>> = {
  viewer,
  member,
  owner,
};

/**
 * What a call is asking to do — `{ spell: ['create'] }`. Naming a resource or
 * an action the statements above do not declare is a compile error, so a typo
 * cannot read as a permission nobody holds.
 */
export type WorkspacePermission = RoleAuthorizeRequest<typeof statements>;

/** The resource/action vocabulary itself, for the tests that pin the policy. */
export const WORKSPACE_STATEMENTS = statements;

/**
 * Whether `role` may do everything `permission` asks. Several resources in one
 * request are ANDed, which is better-auth's default and the safe reading of
 * "this call needs both".
 */
export function rolePermits(role: WorkspaceRole, permission: WorkspacePermission): boolean {
  return ROLE_ABILITIES[role].authorize(permission).success;
}
