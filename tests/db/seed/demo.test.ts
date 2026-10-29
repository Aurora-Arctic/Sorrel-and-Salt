import { describe, expect, it } from 'vitest';
import { DEMO_SPELLS, WORKSPACE_W_CUPBOARD, WORKSPACE_W_INGREDIENTS } from '@/db/seed/demo';

// The demo scenario's spells against W's cupboard. A spell step names only what the coven holds: the
// recipe service checks a laid variant against the coven's readable ones. The seed writes raw, past that
// check, so this proves the data keeps the rule: every compendium entry a demo layer lays is in W's
// cupboard, and every workspace entry is W's own.

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
