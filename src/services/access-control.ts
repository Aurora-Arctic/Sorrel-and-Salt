import { createAccessControl } from 'better-auth/plugins/access';
import type { RoleAuthorizeRequest } from 'better-auth/plugins/access';
import type { workspaceMembers } from '../db/schema/workspaces';

// What each **workspace** role may do. The site role on the session
// (`user` | `admin`) is a different axis and is not read here: an admin
// curates the compendium and reaches no workspace at all (CLAUDE.md).
//
// Permission statements rather than a rank comparison, because
// viewer < member < owner happens to be a line today and a role that is not on
// it — a curator, a billing contact — would leave every "at least member"
// call site meaning something nobody checked. The argument is
// claude-docs/design-decisions/m6.3-permission-statements.md.

/** `'viewer' | 'member' | 'owner'`, read off the column rather than restated. */
export type WorkspaceRole = (typeof workspaceMembers.$inferSelect)['role'];

/**
 * The resources a workspace role acts on, one per surface DESIGN.md §9 routes
 * to. Later milestones extend this map in their own PR, the way each adopts
 * the `Membership` proof in its own PR.
 */
const statements = {
  /**
   * A workspace's own ingredient entries and folk names — what you *have*.
   * Never the compendium, which is global, carries no `workspace_id`, and is
   * curated by site role rather than workspace role (M5.2, M5.7).
   */
  ingredient: ['read', 'create', 'update', 'delete'],
  /** Stock levels on those entries. No `create`: a jar exists because the entry does. */
  inventory: ['read', 'update'],
  spell: ['read', 'create', 'update', 'delete'],
  /** Members and invitations, which `/coven/[slug]/members` shows owners alone (§9). */
  member: ['read', 'invite', 'update', 'remove'],
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

/** The viewer's reads, plus what a coven is for: its ingredients, its stock, its grimoire. */
const member = ac.newRole({
  ingredient: ['read', 'create', 'update', 'delete'],
  inventory: ['read', 'update'],
  spell: ['read', 'create', 'update', 'delete'],
  workspace: ['read'],
});

/** The member's, plus the membership roll and the workspace row itself. */
const owner = ac.newRole({
  ingredient: ['read', 'create', 'update', 'delete'],
  inventory: ['read', 'update'],
  spell: ['read', 'create', 'update', 'delete'],
  member: ['read', 'invite', 'update', 'remove'],
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
