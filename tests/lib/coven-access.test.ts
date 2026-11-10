import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceRole } from '@/modules/coven';
import type { CovenAccess } from '@/lib/types';

// What each coven role may do on a page, read once from the policy. Two proofs: the flags each real role gets, restated
// in the test's own words, and, with the policy replaced, which resource and action each flag asks, since two flags
// on statements every role answers alike would pass the first proof while asking the wrong thing.

const state = vi.hoisted(() => ({
  granted: null as ReadonlySet<string> | null,
}));

vi.mock('@/modules/ingredients', () => ({
  MAKE_IT_OURS_PERMISSION: { ingredient: ['create', 'delete'], inventory: ['update'] },
}));
vi.mock('@/modules/coven', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/modules/coven')>();
  return {
    ...real,
    rolePermits: (role: WorkspaceRole, permission: Record<string, readonly string[]>) =>
      state.granted === null
        ? real.rolePermits(role, permission as Parameters<typeof real.rolePermits>[1])
        : Object.entries(permission).every(([resource, actions]) =>
            actions.every((action) => state.granted!.has(`${resource}:${action}`)),
          ),
  };
});

const { covenAccessOf } = await import('@/lib/coven-access');

// Each flag and every resource:action it needs.
const ASKS: Record<keyof CovenAccess, readonly string[]> = {
  canUpdateCoven: ['workspace:update'],
  canDeleteCoven: ['workspace:delete'],
  canReadMembers: ['member:read'],
  canReadMemberEmails: ['member:readEmail'],
  canInvite: ['member:invite'],
  canChangeRoles: ['member:update'],
  canRemoveMembers: ['member:remove'],
  canPauseMembers: ['member:pause'],
  canCreateIngredient: ['ingredient:create'],
  canUpdateIngredient: ['ingredient:update'],
  canDeleteIngredient: ['ingredient:delete'],
  canMakeOurs: ['ingredient:create', 'ingredient:delete', 'inventory:update'],
  canUpdateStock: ['inventory:update'],
  canAddToCupboard: ['ingredient:create', 'inventory:update'],
  canCreateSpell: ['spell:create'],
  canUpdateSpell: ['spell:update'],
  canDeleteSpell: ['spell:delete'],
  canCreateWorking: ['working:create'],
  canUpdateWorking: ['working:update'],
  canDeleteWorking: ['working:delete'],
};
const FLAGS = Object.keys(ASKS) as (keyof CovenAccess)[];
const every = (on: boolean) =>
  Object.fromEntries(FLAGS.map((flag) => [flag, on])) as Record<keyof CovenAccess, boolean>;

beforeEach(() => {
  state.granted = null;
});

describe('covenAccessOf, against the real policy', () => {
  it('lets a steward do everything a coven page offers', () => {
    expect(covenAccessOf('owner')).toEqual(every(true));
  });

  it('lets an observer do nothing a coven page offers', () => {
    expect(covenAccessOf('viewer')).toEqual(every(false));
  });

  it('lets a practitioner work the ingredients and grimoire and read the roll, but not run the coven', () => {
    expect(covenAccessOf('member')).toEqual({
      ...every(true),
      canUpdateCoven: false,
      canDeleteCoven: false,
      canReadMemberEmails: false,
      canInvite: false,
      canChangeRoles: false,
      canRemoveMembers: false,
      canPauseMembers: false,
    });
  });
});

describe('covenAccessOf, with the policy granting chosen actions', () => {
  it.each(FLAGS)(
    'turns %s on from its own actions, and only the flags those actions cover',
    (flag) => {
      state.granted = new Set(ASKS[flag]);
      const granted = state.granted;
      expect(covenAccessOf('member')).toEqual(
        Object.fromEntries(
          FLAGS.map((other) => [other, ASKS[other].every((pair) => granted.has(pair))]),
        ),
      );
    },
  );

  it('turns every flag off when the policy grants nothing, so no flag is on by default', () => {
    state.granted = new Set();
    expect(covenAccessOf('owner')).toEqual(every(false));
  });
});
