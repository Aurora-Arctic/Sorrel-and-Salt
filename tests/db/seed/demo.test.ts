import { describe, expect, it } from 'vitest';
import {
  DEMO_SPELLS,
  DEMO_STOCK,
  WORKSPACE_W_CUPBOARD,
  WORKSPACE_W_INGREDIENTS,
} from '@/db/seed/demo';
import { DEMO_WORKINGS } from '@/db/seed/demo-workings';
import type { SeedWorking } from '@/db/seed/types';
import { FIXTURE_USERS } from '@/db/seed/standard';

// The demo scenario's spells against W's cupboard. A spell step names only what the coven holds, and the seed writes raw, past the recipe service's check, so this proves the data keeps the rule:
// every compendium entry a demo layer lays is in W's cupboard, and every workspace entry is W's own.

describe('the demo scenario', () => {
  it('lays only ingredients W holds: compendium entries in its cupboard, own entries of its own', () => {
    const held = new Set(WORKSPACE_W_CUPBOARD.map(({ entry }) => entry.name));
    const own = new Set(WORKSPACE_W_INGREDIENTS.map(({ name }) => name));
    const laid = DEMO_SPELLS.flatMap((spell) =>
      spell.steps.flatMap((step) =>
        step.ingredient && step.ingredient.tier !== 'custom'
          ? [{ spell: spell.title, tier: step.ingredient.tier, name: step.ingredient.entry.name }]
          : [],
      ),
    );
    expect(laid.length).toBeGreaterThan(0);
    const unheld = laid.filter(({ tier, name }) => !(tier === 'compendium' ? held : own).has(name));
    expect(unheld).toEqual([]);
  });
});

// The demo scenario's workings against its spells and members. The seed writes raw, past the working service, so these prove the data keeps the service's rules before any row is written.
const MEMBERSHIPS_OF_W: Record<string, string> = {
  [FIXTURE_USERS.A.id]: 'owner',
  [FIXTURE_USERS.B.id]: 'member',
  [FIXTURE_USERS.C.id]: 'viewer',
};

describe('the demo scenario’s workings', () => {
  const spellOf = (id: string) => DEMO_SPELLS.find((spell) => spell.id === id);
  const today = new Date().toISOString().slice(0, 10);

  it('seeds eight to twelve workings, spread over four or five spells, with several on Cold Hearth Cleansing', () => {
    const spellIds = new Set(DEMO_WORKINGS.map((working) => working.spellId));
    expect(DEMO_WORKINGS.length).toBeGreaterThanOrEqual(8);
    expect(DEMO_WORKINGS.length).toBeLessThanOrEqual(12);
    expect(spellIds.size).toBeGreaterThanOrEqual(4);
    expect(spellIds.size).toBeLessThanOrEqual(5);
    const coldHearth = DEMO_WORKINGS.filter(
      (working) => working.spellId === '00000000-0000-0000-0002-000000000004',
    );
    expect(coldHearth.length).toBeGreaterThanOrEqual(3);
  });

  it('mixes complete and draft, workspace and private, and notes with none', () => {
    const has = (test: (working: SeedWorking) => boolean) => DEMO_WORKINGS.some(test);
    expect(has((w) => w.status === 'complete')).toBe(true);
    expect(has((w) => w.status === 'draft')).toBe(true);
    expect(has((w) => w.visibility === 'workspace')).toBe(true);
    expect(has((w) => w.visibility === 'private')).toBe(true);
    expect(has((w) => w.note !== null)).toBe(true);
    expect(has((w) => w.note === null)).toBe(true);
    expect(new Set(DEMO_WORKINGS.map((w) => w.recorder)).size).toBeGreaterThan(1);
    expect(has((w) => w.participants.length > 1)).toBe(true);
  });

  it('is never of a draft spell, never wider than its spell, and never in the future', () => {
    for (const working of DEMO_WORKINGS) {
      const spell = spellOf(working.spellId);
      expect(spell, working.id).toBeDefined();
      expect(spell?.status, working.id).toBe('complete');
      if (spell?.visibility === 'private') expect(working.visibility, working.id).toBe('private');
      expect(working.workedOn <= today, working.id).toBe(true);
    }
  });

  it('is recorded by coven members who can write, with members or typed names as participants', () => {
    for (const working of DEMO_WORKINGS) {
      expect(['owner', 'member']).toContain(MEMBERSHIPS_OF_W[working.recorder]);
      for (const participant of working.participants) {
        if ('userId' in participant) expect(MEMBERSHIPS_OF_W[participant.userId]).toBeDefined();
      }
    }
  });

  it('gives only complete workings deductions', () => {
    for (const working of DEMO_WORKINGS) {
      if (working.status === 'draft') expect(working.deductions, working.id).toEqual([]);
    }
  });

  it('takes what the spell step names, in the unit of the jar, from jars that hold it, in date order', () => {
    const held = new Map(DEMO_STOCK.map((jar) => [jar.id, Number(jar.quantity ?? 0)]));
    const complete = DEMO_WORKINGS.filter((w) => w.status === 'complete').sort((a, b) =>
      a.workedOn.localeCompare(b.workedOn),
    );
    for (const working of complete) {
      const steps = spellOf(working.spellId)?.steps ?? [];
      for (const deduction of working.deductions) {
        const step = steps[deduction.stepPosition - 1];
        if (!step?.ingredient) throw new Error(`${working.id} takes from a step with no layer`);
        const need = Number(step.quantity);
        expect(step.unit, working.id).toBe(deduction.unit);
        const jar = DEMO_STOCK.find((candidate) => candidate.id === deduction.jarId);
        expect(jar?.unit, working.id).toBe(deduction.unit);
        const before = held.get(deduction.jarId) ?? 0;
        const taken = Math.min(need, before);
        expect(Number(deduction.quantity), working.id).toBe(taken);
        expect(Number(deduction.shortfall), working.id).toBe(need - taken);
        held.set(deduction.jarId, before - taken);
      }
    }
  });

  it('leaves a draft working of an unstocked layer, for the skip warning', () => {
    const warding = DEMO_WORKINGS.find(
      (w) => w.status === 'draft' && w.spellId === '00000000-0000-0000-0002-000000000001',
    );
    expect(warding).toBeDefined();
    const stepNames = spellOf('00000000-0000-0000-0002-000000000001')?.steps.map((step) =>
      step.ingredient && step.ingredient.tier !== 'custom' ? step.ingredient.entry.name : null,
    );
    expect(stepNames).toContain('Black Salt');
    expect(DEMO_STOCK.some((jar) => jar.ingredient.entry.name === 'Black Salt')).toBe(false);
  });
});
