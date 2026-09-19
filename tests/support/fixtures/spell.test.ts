import { describe, expect, it } from 'vitest';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { makeSpell, spellColumns } from './spell';

const MUGWORT = '44444444-4444-4444-4444-444444444444';

// M1.25 — a jar, its assigned categories, and the stack inside it.
//
// The layers carry this factory's real work, for the same reason the
// nomenclature pair carries the ingredient's: `spell_ingredients` is governed
// by `num_nonnulls(ingredient_id, name) = 1` and by
// `spell_ingredients_form_only_on_custom`, so a layer that merged an
// `ingredientId` into a default naming a custom ingredient would break both at
// once — and the test that used it would fail for a reason having nothing to
// do with what it was testing.

describe('makeSpell', () => {
  it('builds a whole spell with no arguments', () => {
    const spell = makeSpell();

    expect(spell.title).toBe('Hearth Warding Jar');
    expect(spell.workspaceId).toBe(WORKSPACE_W_ID);
  });

  // M10.20: a spell is a draft until something says otherwise, and the fixture
  // is not something saying otherwise.
  it('opens as a draft', () => {
    expect(makeSpell().status).toBe('draft');
  });

  it('keeps every field the override does not name', () => {
    const spell = makeSpell({ intent: 'Keep the lane quiet' });

    expect(spell.intent).toBe('Keep the lane quiet');
    expect(spell.title).toBe('Hearth Warding Jar');
  });

  it('intends exactly the categories the override names', () => {
    expect(makeSpell({ categories: ['Warding'] }).categories).toEqual(['Warding']);
  });

  describe('its layers', () => {
    // A layer that pointed at an ingredient would need that ingredient to
    // exist first; one that names itself needs nothing, so `makeSpell()` is
    // insertable on its own.
    it('stacks one custom layer by default', () => {
      const [layer, ...rest] = makeSpell().layers;

      expect(rest).toEqual([]);
      expect(layer.ingredientId).toBeNull();
      expect(layer.name).toBe('Hearth Ash');
      expect(layer.form).toBe('ash');
    });

    // Story 51: the sequence is stored rather than inferred, and it is the
    // position in the array so the two cannot disagree — the seed's own rule
    // (src/db/seed/demo.ts), and 1-based as the seed writes it.
    it('numbers each layer by its position in the stack', () => {
      const spell = makeSpell({ layers: [{}, {}, {}] });

      expect(spell.layers.map((layer) => layer.layerOrder)).toEqual([1, 2, 3]);
    });

    // `spell_ingredients_spell_id_custom_name_unique` folds Salt onto salt
    // within one jar, so repeating the default name would make a three-layer
    // fixture uninsertable.
    it('gives each defaulted layer a name of its own', () => {
      const names = makeSpell({ layers: [{}, {}, {}] }).layers.map((layer) => layer.name);

      expect(new Set(names).size).toBe(3);
    });

    it('fills in what a layer override leaves unsaid', () => {
      const [layer] = makeSpell({ layers: [{ note: 'crushed, not ground' }] }).layers;

      expect(layer.note).toBe('crushed, not ground');
      expect(layer.quantity).toBe('1.000');
      expect(layer.unit).toBe('pinch');
    });

    // The acceptance criterion's counterpart on this table: naming an
    // ingredient makes the layer a linked one, and a linked layer carries
    // neither a name of its own nor a form — `num_nonnulls(ingredient_id,
    // name) = 1` and `spell_ingredients_form_only_on_custom`.
    it('turns a layer that names an ingredient into a linked one', () => {
      const [layer] = makeSpell({ layers: [{ ingredientId: MUGWORT }] }).layers;

      expect(layer.ingredientId).toBe(MUGWORT);
      expect(layer.name).toBeNull();
      expect(layer.form).toBeNull();
    });

    it('leaves a name the layer override states, so a test can write a row the check rejects', () => {
      const [layer] = makeSpell({
        layers: [{ ingredientId: MUGWORT, name: 'Hearth Ash' }],
      }).layers;

      expect(layer.ingredientId).toBe(MUGWORT);
      expect(layer.name).toBe('Hearth Ash');
    });

    it('gives each fixture its own stack', () => {
      const first = makeSpell();
      const second = makeSpell();

      first.layers[0].note = 'edited';

      expect(second.layers[0].note).toBeNull();
    });
  });
});

describe('spellColumns', () => {
  it('names each field the way the database spells it', () => {
    const columns = spellColumns(makeSpell({ jarSize: '4 oz jar' }));

    expect(columns.jar_size).toBe('4 oz jar');
    expect(columns.workspace_id).toBe(WORKSPACE_W_ID);
    expect(columns.seal_wax_color).toBeNull();
  });

  // Both live in other tables: the assigned categories in `spell_categories`,
  // the stack in `spell_ingredients`.
  it('leaves out the categories and the layers', () => {
    const columns = spellColumns(makeSpell());

    expect(columns).not.toHaveProperty('categories');
    expect(columns).not.toHaveProperty('layers');
  });

  it('carries no audit columns', () => {
    for (const column of ['created_by', 'created_at', 'updated_by', 'updated_at']) {
      expect(spellColumns(makeSpell())).not.toHaveProperty(column);
    }
  });
});
