import { describe, expect, it } from 'vitest';
import {
  WORKSPACE_STATEMENTS,
  type WorkspacePermission,
  type WorkspaceRole,
  rolePermits,
} from '@/services/access-control';

// The policy, restated here in the test's own words rather than read out of
// the module under test: a matrix compared against itself would pass whatever
// it said. Every role/action pair in the statements below is asserted.
const PERMITTED: Record<WorkspaceRole, Partial<Record<string, readonly string[]>>> = {
  // Reads, and nothing else — CLAUDE.md: "Viewers write nothing".
  viewer: {
    ingredient: ['read'],
    inventory: ['read'],
    spell: ['read'],
    workspace: ['read'],
  },
  // The coven's own work. Not the membership roll: `/coven/[slug]/members` is
  // an owner page (DESIGN.md §9), so a member holds nothing on that resource.
  member: {
    ingredient: ['read', 'create', 'update', 'delete'],
    inventory: ['read', 'update'],
    spell: ['read', 'create', 'update', 'delete'],
    workspace: ['read'],
  },
  owner: {
    ingredient: ['read', 'create', 'update', 'delete'],
    inventory: ['read', 'update'],
    spell: ['read', 'create', 'update', 'delete'],
    member: ['read', 'invite', 'update', 'remove'],
    workspace: ['read', 'update', 'delete'],
  },
};

const ROLES = Object.keys(PERMITTED) as WorkspaceRole[];

describe('the workspace permission matrix', () => {
  for (const role of ROLES) {
    for (const [resource, actions] of Object.entries(WORKSPACE_STATEMENTS)) {
      for (const action of actions) {
        const allowed = PERMITTED[role][resource]?.includes(action) ?? false;

        it(`${allowed ? 'lets' : 'refuses'} a ${role} ${action} a ${resource}`, () => {
          const permission = { [resource]: [action] } as WorkspacePermission;

          expect(rolePermits(role, permission)).toBe(allowed);
        });
      }
    }
  }
});

describe('a request naming more than one resource', () => {
  it('needs every one of them, not any of them', () => {
    // Why this could have passed either way: a member holds the spell half
    // outright, so an OR would read as success.
    expect(rolePermits('member', { spell: ['create'] })).toBe(true);
    expect(rolePermits('member', { member: ['invite'] })).toBe(false);

    expect(rolePermits('member', { spell: ['create'], member: ['invite'] })).toBe(false);
    expect(rolePermits('owner', { spell: ['create'], member: ['invite'] })).toBe(true);
  });

  it('needs every action named on one resource', () => {
    expect(rolePermits('viewer', { spell: ['read'] })).toBe(true);
    expect(rolePermits('viewer', { spell: ['read', 'update'] })).toBe(false);
  });

  it('takes any one of them where a call says so explicitly', () => {
    const either = (actions: ('read' | 'update' | 'delete')[]) =>
      rolePermits('viewer', { spell: { actions, connector: 'OR' } });

    expect(either(['read', 'update'])).toBe(true);
    expect(either(['update', 'delete'])).toBe(false);
  });
});

// Neither body runs: each `@ts-expect-error` fails `npm run typecheck` the
// moment the statement map stops constraining what a caller may ask for.
describe('the vocabulary', () => {
  it('refuses an unknown resource and an unknown action at compile time', () => {
    const unknownResource = () =>
      // @ts-expect-error — `grimoire` is not a resource; the noun is `spell`.
      rolePermits('owner', { grimoire: ['read'] });

    const unknownAction = () =>
      // @ts-expect-error — `publish` is not an action on `spell`, so a typo
      // cannot read as a permission nobody holds.
      rolePermits('owner', { spell: ['publish'] });

    expect(unknownResource).toBeInstanceOf(Function);
    expect(unknownAction).toBeInstanceOf(Function);
  });
});
